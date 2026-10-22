import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import type { CustomerInfo, ProductConfig } from "@/types";
import { DEFAULT_PRODUCT_CONFIG } from "@/types";

interface TokenRequestBody {
  customer?: Partial<CustomerInfo>;
  product?: Partial<ProductConfig>;
}

// Maximum character length for untrusted text inputs
const MAX_FIELD_LENGTH = 3000;

// Low-complexity in-memory rate limiter for public assessment demo abuse prevention
// Limits each client IP to 10 token requests per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
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

function sanitize(input: unknown, fallback = ""): string {
  if (typeof input !== "string") return fallback;
  return input.trim().slice(0, MAX_FIELD_LENGTH);
}

/**
 * Builds the AI salesperson system instruction based on validated product knowledge and customer context.
 */
function buildSystemInstruction(
  product: ProductConfig,
  customer?: Partial<CustomerInfo>
): string {
  const customerName = sanitize(customer?.name, "there");
  const customerCompany = sanitize(customer?.company, "");

  return `You are Alex, an expert AI Sales Assistant for ${product.name}.
You are conducting a live, voice-only discovery and sales qualification call with ${customerName}${
    customerCompany ? ` from ${customerCompany}` : ""
  }.

PRODUCT KNOWLEDGE (Use ONLY these confirmed facts; never invent features, discounts, integrations, or guarantees):
- Product Name: ${product.name}
- Overview: ${product.description}
- Key Features & Benefits: ${product.features}
- Pricing Structure: ${product.pricing}
- Ideal Target Audience: ${product.targetAudience}
- Objections & Proven Responses: ${product.objections}
- Primary Call to Action / Goal: ${product.callToAction}

SALES CONVERSATION RULES:
1. Speak naturally as a human salesperson would on a phone call.
2. Keep every turn concise (1 to 3 sentences maximum). Avoid long speeches or monologues.
3. Introduce yourself warmly and state that you are an AI sales assistant calling on behalf of ${product.name}.
4. Ask open-ended discovery questions to uncover the prospect's workflow challenges, team size, and current tools.
5. When addressing objections, rely strictly on the product facts above.
6. If asked about features or integrations not listed, honestly state that it is not currently supported or that you will have the technical team verify.
7. Steer the prospect toward the primary goal: "${product.callToAction}".
8. Never pressure the prospect. Be helpful, professional, and respectful.`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Abuse protection: IP rate limiting
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded: Too many token requests. Please wait a minute before starting another call.",
        },
        { status: 429 }
      );
    }

    // 2. Secret check: GEMINI_API_KEY must exist on server
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is not configured on the server. Please add your Gemini API key to .env.local to enable real voice calling.",
        },
        { status: 400 }
      );
    }

    // 3. Model validation
    const model = process.env.GEMINI_LIVE_MODEL?.trim() || "gemini-3.8-live";

    // Ensure the configured model is genuinely a Live bidirectional model
    if (!model.includes("live") && !model.includes("native-audio")) {
      return NextResponse.json(
        {
          error: `Model "${model}" does not support Gemini Live bidirectional audio (bidiGenerateContent). Please set GEMINI_LIVE_MODEL=gemini-3.8-live in your .env.local file.`,
        },
        { status: 400 }
      );
    }

    // 4. Request parsing and sanitization
    let body: TokenRequestBody = {};
    try {
      body = (await req.json()) as TokenRequestBody;
    } catch {
      // Body is optional; fallback to defaults
    }

    const rawProduct = body.product || {};
    const productConfig: ProductConfig = {
      name: sanitize(rawProduct.name, DEFAULT_PRODUCT_CONFIG.name),
      description: sanitize(rawProduct.description, DEFAULT_PRODUCT_CONFIG.description),
      features: sanitize(rawProduct.features, DEFAULT_PRODUCT_CONFIG.features),
      pricing: sanitize(rawProduct.pricing, DEFAULT_PRODUCT_CONFIG.pricing),
      targetAudience: sanitize(rawProduct.targetAudience, DEFAULT_PRODUCT_CONFIG.targetAudience),
      objections: sanitize(rawProduct.objections, DEFAULT_PRODUCT_CONFIG.objections),
      callToAction: sanitize(rawProduct.callToAction, DEFAULT_PRODUCT_CONFIG.callToAction),
    };

    const systemInstruction = buildSystemInstruction(productConfig, body.customer);

    // 5. Initialize the official Google Gen AI SDK for token provisioning
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    // 6. Create ephemeral authentication token
    // Single-use token (uses: 1) locked to the selected Live model and audio modality
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // Single-use session token
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins
        newSessionExpireTime: new Date(Date.now() + 120 * 1000).toISOString(), // Must connect within 2 mins
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Aoede", // Warm, articulate conversational persona
                },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
          },
        },
      },
    });

    if (!token || !token.name) {
      throw new Error("Google Gen AI SDK did not return a valid ephemeral token name.");
    }

    // Return only the temporary token and model name — NEVER the permanent key
    return NextResponse.json({
      token: token.name,
      model,
    });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    console.error("Failed to provision ephemeral Live token:", error);

    const errorMessage =
      error?.message && !error.message.includes("API key")
        ? error.message
        : "Failed to provision secure session token with Gemini Live API.";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
