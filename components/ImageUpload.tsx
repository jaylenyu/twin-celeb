"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

const MAX_SIZE = 1 * 1024 * 1024;
const ACCEPTED_TYPES = { "image/jpeg": [], "image/png": [], "image/webp": [] };

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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

async function compressToUnder5MB(file: File): Promise<File> {
  if (file.size <= MAX_SIZE) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      let { width, height } = img;

      const MAX_DIM = 768;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      const tryCompress = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= MAX_SIZE || quality <= 0.1) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
            } else {
              tryCompress(Math.round((quality - 0.1) * 10) / 10);
            }
          },
          "image/jpeg",
          quality,
        );
      };

      tryCompress(0.9);
    };

    img.src = url;
  });
}

export default function ImageUpload({
  onImageSelect,
  previewUrl,
  isLoading,
  onAnalyze,
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const disabled = isLoading || compressing;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const file = files[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("JPG, PNG, WEBP 형식만 지원합니다.");
        return;
      }

      setCompressing(file.size > MAX_SIZE);
      const compressed = await compressToUnder5MB(file);
      setCompressing(false);

      onImageSelect(compressed, URL.createObjectURL(compressed));
    },
    [onImageSelect],
  );

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError("JPG, PNG, WEBP 형식만 지원합니다.");
        return;
      }
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

  const uploadLabel = compressing ? "압축 중..." : previewUrl ? "다시 선택" : "사진 선택";

  // ── 모바일 UI ───────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-sm">
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleMobileChange}
          disabled={disabled}
        />

        <div
          className={`w-full border rounded-2xl p-6 text-center transition-colors ${
            previewUrl
              ? "border-[#F2B999] bg-white"
              : "border-[#F2B999] bg-white"
          }`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="업로드된 사진"
              className="w-40 h-40 object-cover rounded-xl mx-auto"
            />
          ) : (
            <p className="text-sm text-[#737373] py-4">JPG, PNG, WEBP</p>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => mobileInputRef.current?.click()}
            className="mt-4 px-5 py-2 text-sm border border-[#F2B999] rounded-full text-[#0D0D0D] hover:bg-[#F2DDD5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {uploadLabel}
          </button>
        </div>

        {error && <p className="text-sm text-[#737373]">{error}</p>}

        {previewUrl && (
          <button
            onClick={onAnalyze}
            disabled={disabled}
            className="w-full py-3.5 bg-[#0D0D0D] disabled:bg-[#F2B999]/50 text-white disabled:text-[#737373] text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-2 hover:bg-[#1a1a1a]"
          >
            {isLoading && <SpinnerIcon />}
            {isLoading ? "분석 중..." : "닮은 연예인 찾기"}
          </button>
        )}
      </div>
    );
  }

  // ── 데스크톱 UI ─────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      <div
        {...getRootProps()}
        className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
          disabled
            ? "border-[#F2B999]/40 bg-white/60 cursor-not-allowed opacity-60"
            : isDragActive
            ? "border-[#F2B279] bg-[#F2DDD5] cursor-pointer"
            : "border-[#F2B999] bg-white hover:border-[#F2B279] hover:bg-[#F2DDD5]/40 cursor-pointer"
        }`}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="업로드된 사진"
              className="w-40 h-40 object-cover rounded-xl"
            />
            <p className={`text-xs text-[#737373] ${disabled ? "invisible" : ""}`}>
              클릭하거나 드래그해서 변경
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full bg-[#F2DDD5] flex items-center justify-center">
              <svg className="w-6 h-6 text-[#F2B279]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-[#0D0D0D] font-medium">
                {isDragActive ? "여기에 놓으세요" : "드래그하거나 클릭해서 업로드"}
              </p>
              <p className="text-xs text-[#737373] mt-1">JPG, PNG, WEBP</p>
            </div>
          </div>
        )}
      </div>

      {compressing && (
        <p className="text-xs text-[#737373]">이미지 압축 중...</p>
      )}

      {error && <p className="text-sm text-[#737373]">{error}</p>}

      {previewUrl && (
        <button
          onClick={onAnalyze}
          disabled={disabled}
          className="w-full py-3.5 bg-[#0D0D0D] disabled:bg-[#F2B999]/50 text-white disabled:text-[#737373] text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-2 hover:bg-[#1a1a1a]"
        >
          {isLoading && <SpinnerIcon />}
          {isLoading ? "분석 중..." : "닮은 연예인 찾기"}
        </button>
      )}
    </div>
  );
}
