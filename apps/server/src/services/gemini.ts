import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { geminiExtractionSchema, type GeminiExtractionResult } from "@recipts/shared";

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const EXTRACTION_PROMPT = `You are a receipt OCR engine. Extract the following fields from this receipt image.
Return ONLY a JSON object matching this exact schema — no other text:

{
  "merchant": "string (business name)",
  "locationCity": "string (city name)",
  "locationAddress": "string (full street address or empty string)",
  "purchaseDate": "string (YYYY-MM-DD format)",
  "currency": "string (3-letter ISO code, default USD)",
  "subtotal": number,
  "tax": number,
  "tip": number,
  "total": number (the final amount paid — must always be extracted),
  "paymentMethod": "string (Visa, Mastercard, Cash, etc. or empty string)",
  "suggestedCategory": "Food" | "CarService" | "Lodging" | "Airfare" | "Parking" | "Tolls" | "Supplies" | "Other",
  "lineItems": [{ "description": "string", "amount": number }],
  "confidence": number (0 to 1 — how confident you are in the overall extraction accuracy)
}

Rules:
- If a field is not visible, use "" for strings, 0 for numbers.
- total is the final amount paid. If a tip line exists, it is separate from subtotal/tax.
- If the receipt is handwritten, crumpled, or faded, lower your confidence score.
- For the suggestedCategory, pick the best match based on merchant type and items.`;

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
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  let jsonStr = text.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  const parsed = JSON.parse(jsonStr);
  return geminiExtractionSchema.parse(parsed);
}
