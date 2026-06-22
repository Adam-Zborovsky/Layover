import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import sharp from "sharp";
import { config } from "../config.js";

const UPLOAD_DIR = isAbsolute(config.uploadDir)
  ? config.uploadDir
  : join(process.cwd(), config.uploadDir);
const THUMB_WIDTH = 400;
const THUMB_HEIGHT = 300;
const JPEG_QUALITY = 85;

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export async function saveImage(base64: string, mimeType: string) {
  await ensureUploadDir();

  const ext = mimeType.split("/")[1] || "jpg";
  const id = randomUUID();
  const filename = `${id}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(base64, "base64");
  await writeFile(filepath, buffer);

  const thumbFilename = `${id}_thumb.jpg`;
  const thumbPath = join(UPLOAD_DIR, thumbFilename);
  await sharp(buffer)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "inside" })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(thumbPath);

  return {
    imagePath: filename,
    thumbnailPath: thumbFilename,
  };
}

export async function getImagePath(filename: string) {
  return join(UPLOAD_DIR, filename);
}

export async function readImageBuffer(filename: string) {
  return readFile(join(UPLOAD_DIR, filename));
}

export async function deleteImage(filename: string) {
  try {
    await unlink(join(UPLOAD_DIR, filename));
  } catch {
    // file may not exist
  }
}

export function imageToBase64(buffer: Buffer, mimeType: string) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
