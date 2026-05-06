export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_DIMENSION = 768;
export const INITIAL_QUALITY = 0.85;
export const MIN_QUALITY = 0.3;
export const QUALITY_STEP = 0.1;

export const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME)[number];

export function isAcceptedMime(value: string): value is AcceptedMime {
  return (ACCEPTED_MIME as readonly string[]).includes(value);
}
