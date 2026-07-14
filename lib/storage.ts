import fs from "fs/promises";
import path from "path";

// Single write-point for images so this can be swapped for blob storage later.
// Returns a public URL path.
export async function saveImage(
  base64Data: string,
  mediaType: string
): Promise<string> {
  const ext = mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), Buffer.from(base64Data, "base64"));
  return `/uploads/${filename}`;
}
