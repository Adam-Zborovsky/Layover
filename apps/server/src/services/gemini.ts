import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../config.js";
import {
  geminiExtractionSchema,
  RECEIPT_CATEGORIES,
  type GeminiExtractionResult,
} from "@recipts/shared";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const EXTRACTION_PROMPT = `You are a receipt OCR engine. Extract the receipt fields defined by the response schema.

Rules:
- If a field is not visible, use "" for strings, 0 for numbers.
- total is the final amount paid. If a tip line exists, it is separate from subtotal/tax.
- If the receipt is handwritten, crumpled, or faded, lower your confidence score.
- For suggestedCategory, pick the best match based on merchant type and items.`;

// Constrains Gemini to structurally valid JSON via constrained decoding — no more
// markdown fences or trailing commas to strip from free-form text output.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING },
    locationCity: { type: Type.STRING },
    locationAddress: { type: Type.STRING },
    purchaseDate: { type: Type.STRING, description: "YYYY-MM-DD" },
    currency: { type: Type.STRING, description: "3-letter ISO code" },
    subtotal: { type: Type.NUMBER },
    tax: { type: Type.NUMBER },
    tip: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    paymentMethod: { type: Type.STRING },
    suggestedCategory: { type: Type.STRING, enum: [...RECEIPT_CATEGORIES] },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
        },
        required: ["description", "amount"],
      },
    },
    confidence: { type: Type.NUMBER, description: "0 to 1" },
  },
  required: [
    "merchant",
    "locationCity",
    "locationAddress",
    "purchaseDate",
    "currency",
    "subtotal",
    "tax",
    "tip",
    "total",
    "paymentMethod",
    "suggestedCategory",
    "lineItems",
    "confidence",
  ],
};

export async function extractReceipt(
  imageBase64: string,
  mimeType: string,
  modelName: "gemini-2.5-flash" | "gemini-2.5-pro" = "gemini-2.5-flash"
): Promise<GeminiExtractionResult> {
  const response = await ai.models.generateContent({
    model: modelName,
    contents: [
      {
        parts: [
          { text: EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini returned unparseable JSON: ${(err as Error).message}. Raw response: ${text.slice(0, 300)}`
    );
  }

  return geminiExtractionSchema.parse(parsed);
}
