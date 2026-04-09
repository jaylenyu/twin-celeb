const MAX_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_DIM = 768;
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.1;

interface CompressionMessage {
  type: 'compress';
  file: File;
}

interface CompressionResult {
  type: 'success';
  file: File;
  originalSize: number;
  compressedSize: number;
}

interface CompressionError {
  type: 'error';
  message: string;
}

type WorkerMessage = CompressionResult | CompressionError;

async function compressToUnderMaxSize(file: File): Promise<File> {
  if (file.size <= MAX_SIZE) {
    return file;
  }

  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  let { width, height } = img;

  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    const tryCompress = (quality: number): void => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          if (blob.size <= MAX_SIZE || quality <= MIN_QUALITY) {
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              })
            );
          } else {
            tryCompress(Math.round((quality - QUALITY_STEP) * 100) / 100);
          }
        },
        'image/jpeg',
        quality
      );
    };

    tryCompress(INITIAL_QUALITY);
  });
}

self.onmessage = async (event: MessageEvent<CompressionMessage>) => {
  const { type, file } = event.data;

  if (type === 'compress') {
    try {
      const originalSize = file.size;
      const compressed = await compressToUnderMaxSize(file);
      const result: CompressionResult = {
        type: 'success',
        file: compressed,
        originalSize,
        compressedSize: compressed.size,
      };
      self.postMessage(result);
    } catch (error) {
      const err: CompressionError = {
        type: 'error',
        message: error instanceof Error ? error.message : 'Compression failed',
      };
      self.postMessage(err);
    }
  }
};
