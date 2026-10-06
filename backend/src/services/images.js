import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { ImageAsset } from "../models/index.js";
import { fail } from "./errors.js";
export async function cropPuzzle(image, rows, cols, session) {
  const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(
    image,
  );
  if (!match) fail(400, "Upload a PNG, JPEG or WebP image.");
  const bytes = Buffer.from(match[1], "base64");
  if (bytes.length > 1000000) fail(400, "Choose an image smaller than 1 MB.");
  const processor = sharp(bytes, { limitInputPixels: 16000000 }).rotate();
  const normalized = await processor
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer()
    .catch(() =>
      fail(
        400,
        "The image could not be decoded. Choose a valid PNG, JPEG or WebP.",
      ),
    );
  const { width, height } = await sharp(normalized).metadata();
  if (width < cols * 16 || height < rows * 16)
    fail(400, "The image is too small for this grid.");
  const save = async (buffer) => {
    const [asset] = await ImageAsset.create(
      [{ data: buffer, mime: "image/jpeg" }],
      { session },
    );
    return "/api/assets/" + asset._id;
  };
  const imageUrl = await save(normalized),
    pieces = [];
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const left = Math.floor((col * width) / cols),
        top = Math.floor((row * height) / rows),
        right = Math.floor(((col + 1) * width) / cols),
        bottom = Math.floor(((row + 1) * height) / rows);
      const buffer = await sharp(normalized)
        .extract({ left, top, width: right - left, height: bottom - top })
        .jpeg({ quality: 85 })
        .toBuffer();
      pieces.push({
        pieceId: randomBytes(16).toString("hex"),
        imageUrl: await save(buffer),
      });
    }
  return { imageUrl, pieces, correctOrder: pieces.map((p) => p.pieceId) };
}
