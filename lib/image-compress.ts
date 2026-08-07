"use client";

export const DEFAULT_PHOTO_COMPRESSION_QUALITY = 0.7;
export const DEFAULT_PHOTO_MAX_DIMENSION = 1600;

/**
 * Downscales and re-encodes a photo as JPEG via canvas before it ever hits
 * Storage — phone camera photos routinely run 3-8MB, and nobody needs full
 * resolution for a "proof I did the chore" thumbnail. Falls back to the
 * original file untouched if canvas/image decoding fails for any reason
 * (corrupt file, unsupported format, browser quirk) — a slightly larger
 * upload beats a task the member can no longer complete at all.
 */
export async function compressImage(
  file: File,
  options: { quality?: number; maxDimension?: number } = {}
): Promise<Blob> {
  const quality = options.quality ?? DEFAULT_PHOTO_COMPRESSION_QUALITY;
  const maxDimension = options.maxDimension ?? DEFAULT_PHOTO_MAX_DIMENSION;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  } catch {
    return file;
  }
}
