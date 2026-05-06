import {
  INITIAL_QUALITY,
  MAX_DIMENSION,
  MAX_IMAGE_BYTES,
  MIN_QUALITY,
  QUALITY_STEP,
} from "./uploadConfig";

type EncodableMime = "image/webp" | "image/jpeg";

export interface CompressOptions {
  maxBytes?: number;
  maxDimension?: number;
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
  outputMime?: EncodableMime;
}

let cachedOutputMime: EncodableMime | null = null;
function detectOutputMime(): EncodableMime {
  if (cachedOutputMime) return cachedOutputMime;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    cachedOutputMime = c.toDataURL("image/webp").startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg";
  } catch {
    cachedOutputMime = "image/jpeg";
  }
  return cachedOutputMime;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/webp": ".webp",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  const maxDim = opts.maxDimension ?? MAX_DIMENSION;
  const initialQ = opts.initialQuality ?? INITIAL_QUALITY;
  const minQ = opts.minQuality ?? MIN_QUALITY;
  const step = opts.qualityStep ?? QUALITY_STEP;
  const outputMime = opts.outputMime ?? detectOutputMime();

  if (file.size <= maxBytes) return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("캔버스 초기화 실패"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const tryCompress = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("압축 실패"));
              return;
            }
            if (blob.size <= maxBytes || quality <= minQ) {
              const actualType = blob.type || outputMime;
              const ext = EXT_BY_MIME[actualType] ?? ".bin";
              const renamed = file.name.replace(/\.[^.]+$/, ext);
              resolve(new File([blob], renamed, { type: actualType }));
              return;
            }
            const next = Math.round((quality - step) * 100) / 100;
            tryCompress(next);
          },
          outputMime,
          quality,
        );
      };
      tryCompress(initialQ);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지 로드 실패"));
    };

    img.src = url;
  });
}
