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

    let body: TokenRequestBody = {};
    try {
      body = (await req.json()) as TokenRequestBody;
    } catch {
      // Body is optional; fallback to defaults
    }

    // Merge provided product configuration with defaults and sanitize
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

    // Initial default live model per prompt recommendation
    const model = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";

    // Initialize the official Google Gen AI SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    });

    // Create an ephemeral token with single-use and tight session expiration
    // Ephemeral tokens allow the browser to connect to the Gemini Live WebSocket directly
    // without ever exposing the permanent GEMINI_API_KEY.
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
                  voiceName: "Aoede", // Warm, clear conversational tone
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
      throw new Error("SDK did not return a valid ephemeral token identifier.");
    }

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
