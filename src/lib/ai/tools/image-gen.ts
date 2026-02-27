import { uploadFile } from "@/lib/storage";

export async function generateImage(
  prompt: string,
  size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024"
): Promise<{ buffer: Buffer; storagePath: string; url: string } | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[image-gen] OPENAI_API_KEY not set, skipping image generation");
    return null;
  }

  try {
    const { getOpenAIClient } = await import("@/lib/ai/clients/openai");
    const client = getOpenAIClient();

    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) return null;

    const buffer = Buffer.from(b64, "base64");
    const uuid = crypto.randomUUID();
    const filename = `image_${uuid.slice(0, 8)}.png`;
    const storagePath = `outputs/images/${uuid}/${filename}`;

    uploadFile(storagePath, buffer);

    const url = `/api/files/output?path=${encodeURIComponent(storagePath)}`;
    return { buffer, storagePath, url };
  } catch (err) {
    console.error("[image-gen] Failed to generate image:", err);
    return null;
  }
}
