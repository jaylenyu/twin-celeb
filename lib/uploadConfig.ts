export const MAX_IMAGE_BYTES = 500 * 1024;
export const MAX_DIMENSION = 512;
export const INITIAL_QUALITY = 0.8;
export const MIN_QUALITY = 0.4;
export const QUALITY_STEP = 0.1;
export const COMPRESSED_MIME = "image/webp" as const;
export const COMPRESSED_EXT = ".webp";

export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME)[number];

export function isAcceptedMime(value: string): value is AcceptedMime {
  return (ACCEPTED_MIME as readonly string[]).includes(value);
}
