"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

interface CompressionResult {
  type: "success";
  file: File;
  originalSize: number;
  compressedSize: number;
}

interface CompressionError {
  type: "error";
  message: string;
}

const ACCEPTED_TYPES = { "image/jpeg": [], "image/png": [], "image/webp": [] };

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

const PortraitIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);
  }, []);
  return isMobile;
}

function createCompressionWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  try {
    const workerCode = `
      const MAX_SIZE = 1 * 1024 * 1024;
      const MAX_DIM = 768;
      const INITIAL_QUALITY = 0.85;
      const MIN_QUALITY = 0.3;
      const QUALITY_STEP = 0.1;

      async function compressToUnderMaxSize(file) {
        if (file.size <= MAX_SIZE) return file;
        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise((resolve, reject) => {
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
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        return new Promise((resolve) => {
          const tryCompress = (quality) => {
            canvas.toBlob((blob) => {
              if (!blob) { resolve(file); return; }
              if (blob.size <= MAX_SIZE || quality <= MIN_QUALITY) {
                resolve(new File([blob], file.name.replace(/\\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
              } else {
                tryCompress(Math.round((quality - QUALITY_STEP) * 100) / 100);
              }
            }, 'image/jpeg', quality);
          };
          tryCompress(INITIAL_QUALITY);
        });
      }

      self.onmessage = async (event) => {
        const { type, file } = event.data;
        if (type === 'compress') {
          try {
            const originalSize = file.size;
            const compressed = await compressToUnderMaxSize(file);
            self.postMessage({ type: 'success', file: compressed, originalSize, compressedSize: compressed.size });
          } catch (error) {
            self.postMessage({ type: 'error', message: error.message || 'Compression failed' });
          }
        }
      };
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(blob));
  } catch {
    return null;
  }
}

export default function ImageUpload({ onImageSelect, previewUrl, isLoading, onAnalyze }: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const disabled = isLoading || compressing;

  const handleCompressionResult = useCallback(
    (file: File, url: string) => { onImageSelect(file, url); setCompressing(false); },
    [onImageSelect],
  );
  const handleCompressionError = useCallback(
    (message: string) => { setError(message); setCompressing(false); },
    [],
  );

  useEffect(() => {
    workerRef.current = createCompressionWorker();
    return () => { workerRef.current?.terminate(); };
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const file = files[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("JPG, PNG, WEBP 형식만 지원합니다.");
        return;
      }
      const maxSize = 1 * 1024 * 1024;
      if (file.size <= maxSize) { onImageSelect(file, URL.createObjectURL(file)); return; }

      setCompressing(true);
      if (workerRef.current) {
        workerRef.current.onmessage = (event: MessageEvent<CompressionResult | CompressionError>) => {
          const { type } = event.data;
          if (type === "success") {
            const r = event.data as CompressionResult;
            handleCompressionResult(r.file, URL.createObjectURL(r.file));
          } else {
            handleCompressionError((event.data as CompressionError).message);
          }
        };
        workerRef.current.onerror = () => handleCompressionError("압축 중 오류가 발생했습니다.");
        workerRef.current.postMessage({ type: "compress", file });
      } else {
        const MAX_DIM = 768;
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const canvas = document.createElement("canvas");
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          canvas.width = width; canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          const tryCompress = (quality: number) => {
            canvas.toBlob((blob) => {
              if (!blob) { handleCompressionError("압축 실패"); return; }
              if (blob.size <= maxSize || quality <= 0.3) {
                const f = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
                handleCompressionResult(f, URL.createObjectURL(f));
              } else { tryCompress(Math.round((quality - 0.1) * 10) / 10); }
            }, "image/jpeg", quality);
          };
          tryCompress(0.85);
        };
        img.onerror = () => { URL.revokeObjectURL(url); handleCompressionError("이미지 로드 실패"); };
        img.src = url;
      }
    },
    [onImageSelect, handleCompressionResult, handleCompressionError],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) { setError("JPG, PNG, WEBP 형식만 지원합니다."); return; }
      if (acceptedFiles[0]) handleFiles(acceptedFiles);
    },
    [handleFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    disabled,
  });

  const analyzeLabel = isLoading ? "분석 중..." : "닮은 연예인 찾기";

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />

        {/* Preview / placeholder card */}
        <div className="w-full card-glass rounded-3xl overflow-hidden">
          {previewUrl ? (
            <div className="relative">
              <img
                src={previewUrl}
                alt="업로드된 사진"
                className="w-full h-52 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[#FBE9DB] flex items-center justify-center text-[#D97445]">
                <PortraitIcon />
              </div>
              <p className="text-sm text-[#7D5840] text-center leading-relaxed">
                사진을 선택해 주세요
                <br />
                <span className="text-xs text-[#B09278]">JPG · PNG · WEBP</span>
              </p>
            </div>
          )}

          {/* Select button inside card */}
          <div className="px-4 pb-4 pt-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => mobileInputRef.current?.click()}
              className="w-full py-2.5 text-sm border border-[#E8924E]/35 rounded-2xl text-[#7D5840] hover:bg-[#FBE9DB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
            >
              {compressing ? "압축 중..." : previewUrl ? "다시 선택" : "사진 선택"}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-[#B09278]">{error}</p>}

        {previewUrl && (
          <button
            onClick={onAnalyze}
            disabled={disabled}
            className="w-full py-4 bg-[#1C0D07] disabled:opacity-50 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-[#2D1810] active:scale-[0.98] shadow-lg shadow-black/15 cursor-pointer"
          >
            {isLoading && <SpinnerIcon />}
            {analyzeLabel}
          </button>
        )}
      </div>
    );
  }

  /* ── Desktop ── */
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      <div
        {...getRootProps()}
        className={`w-full rounded-3xl transition-all cursor-pointer overflow-hidden ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : isDragActive
              ? "ring-2 ring-[#D97445] ring-offset-2 ring-offset-transparent"
              : ""
        }`}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <div className="card-glass rounded-3xl overflow-hidden">
            <div className="relative">
              <img
                src={previewUrl}
                alt="업로드된 사진"
                className="w-full h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="px-4 py-3">
              <p className={`text-xs text-[#B09278] text-center ${disabled ? "invisible" : ""}`}>
                클릭하거나 드래그해서 변경
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`card-glass rounded-3xl p-10 text-center transition-colors ${
              isDragActive ? "bg-[#FBE9DB]/80" : "hover:bg-white/70"
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragActive ? "bg-[#E8924E]/15 text-[#D97445]" : "bg-[#FBE9DB] text-[#D97445]"
                }`}
              >
                <PortraitIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1C0D07]">
                  {isDragActive ? "여기에 놓으세요" : "드래그하거나 클릭해서 업로드"}
                </p>
                <p className="text-xs text-[#B09278] mt-1">JPG · PNG · WEBP</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {compressing && <p className="text-xs text-[#B09278]">이미지 압축 중...</p>}
      {error && <p className="text-xs text-[#B09278]">{error}</p>}

      {previewUrl && (
        <button
          onClick={onAnalyze}
          disabled={disabled}
          className="w-full py-4 bg-[#1C0D07] disabled:opacity-50 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 hover:bg-[#2D1810] active:scale-[0.98] shadow-lg shadow-black/15 cursor-pointer"
        >
          {isLoading && <SpinnerIcon />}
          {analyzeLabel}
        </button>
      )}
    </div>
  );
}
