import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { CustomerInfo, ProductConfig, TranscriptMessage, SalesOutcome, PostCallAnalysis } from "@/types";
import { DEFAULT_PRODUCT_CONFIG } from "@/types";

// Server-side model setting for post-call text analysis (distinct from the Live audio model)
export const ANALYSIS_MODEL = process.env.GEMINI_ANALYSIS_MODEL?.trim() || "gemini-3.8-flash";

const VALID_OUTCOMES: ReadonlySet<SalesOutcome> = new Set([
  "converted",
  "interested",
  "follow_up_required",
  "not_interested",
  "demo_requested",
  "no_response",
]);

// Low-complexity in-memory rate limiter: 15 analysis requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count += 1;
  return true;
}

interface AnalyzeRequestBody {
  transcript: TranscriptMessage[];
  product?: Partial<ProductConfig>;
  customer?: Partial<CustomerInfo>;
}

const analysisJsonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Concise factual summary of the conversation (2-4 sentences). Ground strictly in what was said.",
    },
    customerNeeds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific problems, workflows, or needs expressed by the customer.",
    },
    objections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Actual objections or hesitations voiced by the customer, or empty array if none.",
    },
    nextSteps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Concrete next steps supported by the conversation.",
    },
    outcome: {
      type: Type.STRING,
      enum: [
        "converted",
        "interested",
        "follow_up_required",
        "not_interested",
        "demo_requested",
        "no_response",
      ],
      description: "The single most accurate sales outcome category.",
    },
    outcomeReason: {
      type: Type.STRING,
      description: "Short rationale explaining why this outcome was chosen, directly referencing customer speech.",
    },
  },
  required: ["summary", "customerNeeds", "objections", "nextSteps", "outcome", "outcomeReason"],
};

export async function POST(req: NextRequest) {
  try {
    // 1. IP rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment before analyzing another call." },
        { status: 429 }
      );
    }

    // 2. Secret check: GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured on the server. Please ensure GEMINI_API_KEY is set in your environment.",
        },
        { status: 400 }
      );
    }

    // 3. Parse and validate request body
    let body: AnalyzeRequestBody;
    try {
      body = (await req.json()) as AnalyzeRequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { transcript, product, customer } = body;

    if (!Array.isArray(transcript)) {
      return NextResponse.json(
        { error: "Missing or invalid 'transcript' array in request body." },
        { status: 400 }
      );
    }

    // Payload constraints
    if (transcript.length > 500) {
      return NextResponse.json(
        { error: "Transcript exceeds maximum supported turn limit (500 turns)." },
        { status: 400 }
      );
    }

    const totalTextLength = transcript.reduce((acc, t) => acc + (t.text?.length || 0), 0);
    if (totalTextLength > 60000) {
      return NextResponse.json(
        { error: "Transcript payload is too large for post-call analysis." },
        { status: 400 }
      );
    }

    // 4. Deterministic no_response path:
    // If the customer never spoke or only provided empty/whitespace turns, do not waste tokens.
    const customerSpeech = transcript.filter(
      (m) => m.speaker === "customer" && typeof m.text === "string" && m.text.trim().length > 0
    );

    if (customerSpeech.length === 0) {
      const deterministicAnalysis: PostCallAnalysis = {
        summary: "The call connected, but no verbal response was captured from the prospect.",
        customerNeeds: [],
        objections: [],
        nextSteps: ["Follow up via email or phone to reschedule the introductory call."],
        outcome: "no_response",
        outcomeReason: "No meaningful customer speech was recorded during this call.",
      };

      return NextResponse.json({
        success: true,
        analysis: deterministicAnalysis,
      });
    }

    // 5. Construct transcript text representation for model prompt
    const productConfig: ProductConfig = {
      name: product?.name?.trim() || DEFAULT_PRODUCT_CONFIG.name,
      description: product?.description?.trim() || DEFAULT_PRODUCT_CONFIG.description,
      features: product?.features?.trim() || DEFAULT_PRODUCT_CONFIG.features,
      pricing: product?.pricing?.trim() || DEFAULT_PRODUCT_CONFIG.pricing,
      targetAudience: product?.targetAudience?.trim() || DEFAULT_PRODUCT_CONFIG.targetAudience,
      objections: product?.objections?.trim() || DEFAULT_PRODUCT_CONFIG.objections,
      callToAction: product?.callToAction?.trim() || DEFAULT_PRODUCT_CONFIG.callToAction,
    };

    const customerName = customer?.name?.trim() || "Customer";
    const customerCompany = customer?.company?.trim() ? ` from ${customer.company.trim()}` : "";

    const formattedTranscript = transcript
      .map((m) => {
        const speaker = m.speaker === "ai" ? "AI Salesperson (Alex)" : customerName;
        return `[${speaker}]: ${m.text}`;
      })
      .join("\n");

    const prompt = `You are a senior sales intelligence specialist. Analyze the following real-time sales conversation between an AI sales assistant for "${productConfig.name}" and prospect ${customerName}${customerCompany}.

PRODUCT CONTEXT:
- Name: ${productConfig.name}
- Description: ${productConfig.description}
- Key Features: ${productConfig.features}
- Pricing: ${productConfig.pricing}
- Goal / Call to Action: ${productConfig.callToAction}

TRANSCRIPT:
${formattedTranscript}

INSTRUCTIONS:
1. Ground your analysis STRICTLY in the transcript text. Do NOT hallucinate features, commitments, or customer sentiments not present in the dialogue.
2. Outcome classification must be ONE of:
   - "converted": The customer explicitly agreed to purchase or signed up during the call.
   - "interested": The customer expressed genuine interest, but has not yet booked a demo or finalized purchase.
   - "demo_requested": The customer explicitly agreed to or asked for a product demonstration or walkthrough.
   - "follow_up_required": A follow-up message, call, or email is the logical next step agreed upon.
   - "not_interested": The customer explicitly declined, expressed lack of need, or rejected the offer.
   - "no_response": No meaningful customer response was captured.
3. Distinguish carefully: If the AI delivered a pitch but the customer only gave brief or passive responses without committing, classify as "interested" or "follow_up_required", NEVER "converted".
4. Provide a factual summary and clear lists for customerNeeds, objections, and nextSteps.`;

    // 6. Execute Gemini structured output request
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisJsonSchema,
        temperature: 0.2, // Low temperature for factual consistency
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      throw new Error("Gemini returned an empty text response for post-call analysis.");
    }

    // 7. Parse and validate JSON runtime output
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error(`Failed to parse model response as JSON: ${responseText.slice(0, 100)}`);
    }

    // Runtime type validation
    const rawOutcome = String(parsed.outcome || "").toLowerCase();
    const outcome: SalesOutcome = VALID_OUTCOMES.has(rawOutcome as SalesOutcome)
      ? (rawOutcome as SalesOutcome)
      : "follow_up_required";

    const cleanList = (val: unknown): string[] => {
      if (!Array.isArray(val)) return [];
      return val
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((s) => s.length > 0);
    };

    const analysis: PostCallAnalysis = {
      summary: typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "Conversation completed with prospect.",
      customerNeeds: cleanList(parsed.customerNeeds),
      objections: cleanList(parsed.objections),
      nextSteps: cleanList(parsed.nextSteps).length > 0
        ? cleanList(parsed.nextSteps)
        : ["Review conversation and follow up as needed."],
      outcome,
      outcomeReason: typeof parsed.outcomeReason === "string" && parsed.outcomeReason.trim()
        ? parsed.outcomeReason.trim()
        : `Classified as ${outcome} based on conversational interaction.`,
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("Post-call analysis error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to generate AI post-call analysis.",
      },
      { status: 500 }
    );
  }
}
