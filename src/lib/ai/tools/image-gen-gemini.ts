import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (client) return client;
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Gemini image generation models (use generateContent with IMAGE modality).
 * These are distinct from Imagen models which use the generateImages() endpoint.
 */
const GEMINI_IMAGE_MODELS = [
  "gemini-2.0-flash-preview-image-generation", // Gemini 2.0 Flash Image
  "gemini-2.5-flash-preview-05-20",            // Gemini 2.5 Flash (if image supported)
];

export async function generateImageGemini(
  prompt: string,
  _aspectRatio: string = "16:9"
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const ai = getClient();
  if (!ai) {
    console.warn("[image-gen-gemini] No Gemini API key set, skipping");
    return null;
  }

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      });

      // Extract image from response parts
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
          console.log(`[Gemini image] Used model: ${model}`);
          return {
            buffer: Buffer.from(part.inlineData.data, "base64"),
            mimeType: part.inlineData.mimeType,
          };
        }
      }
    } catch (err) {
      console.warn(`[Gemini image] ${model} failed:`, err);
    }
  }
  return null;
}

/** Fallback chain: Gemini Image Gen → DALL-E 3 → null (base64 string) */
export async function generateSlideVisual(prompt: string): Promise<string | null> {
  try {
    const result = await generateImageGemini(prompt, "16:9");
    if (result) return result.buffer.toString("base64");
  } catch { /* fall through */ }
  try {
    const { generateImage } = await import("@/lib/ai/tools/image-gen");
    const result = await generateImage(prompt, "1792x1024");
    if (result) return result.buffer.toString("base64");
  } catch { /* fall through */ }
  return null;
}
