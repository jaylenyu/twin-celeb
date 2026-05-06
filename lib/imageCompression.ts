import {
  COMPRESSED_EXT,
  COMPRESSED_MIME,
  INITIAL_QUALITY,
  MAX_DIMENSION,
  MAX_IMAGE_BYTES,
  MIN_QUALITY,
  QUALITY_STEP,
} from "./uploadConfig";

export interface CompressOptions {
  maxBytes?: number;
  maxDimension?: number;
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
}

export function compressImage(file: File, opts: CompressOptions = {}): Promise<File> {
  const maxBytes = opts.maxBytes ?? MAX_IMAGE_BYTES;
  const maxDim = opts.maxDimension ?? MAX_DIMENSION;
  const initialQ = opts.initialQuality ?? INITIAL_QUALITY;
  const minQ = opts.minQuality ?? MIN_QUALITY;
  const step = opts.qualityStep ?? QUALITY_STEP;

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
              const renamed = file.name.replace(/\.[^.]+$/, COMPRESSED_EXT);
              resolve(new File([blob], renamed, { type: COMPRESSED_MIME }));
              return;
            }
            const next = Math.round((quality - step) * 100) / 100;
            tryCompress(next);
          },
          COMPRESSED_MIME,
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
