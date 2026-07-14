import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

// Single write-point for images. Uses Vercel Blob when a token is configured
// (production), otherwise the local filesystem (dev without blob).
// Returns a public URL.
export async function saveImage(
  base64Data: string,
  mediaType: string
): Promise<string> {
  const ext = mediaType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(base64Data, "base64");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: mediaType,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}
