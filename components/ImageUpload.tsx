"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = { "image/jpeg": [], "image/png": [], "image/webp": [] };

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setIsMobile(mq.matches);
  }, []);
  return isMobile;
}

export default function ImageUpload({
  onImageSelect,
  previewUrl,
  isLoading,
  onAnalyze,
}: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const file = files[0];
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("JPG, PNG, WEBP 형식만 지원합니다.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("파일 크기는 5MB 이하여야 합니다.");
        return;
      }
      onImageSelect(file, URL.createObjectURL(file));
    },
    [onImageSelect],
  );

  // ── 모바일용 파일 input 핸들러 ──────────────────────────
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  // ── 데스크톱용 dropzone ─────────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        const err = rejectedFiles[0].errors[0];
        setError(
          err.message.includes("size")
            ? "파일 크기는 5MB 이하여야 합니다."
            : "JPG, PNG, WEBP 형식만 지원합니다.",
        );
        return;
      }
      if (acceptedFiles[0]) handleFiles(acceptedFiles);
    },
    [handleFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  // ── 모바일 UI ───────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col items-center gap-6 w-full">
        <input
          ref={mobileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleMobileChange}
        />

        <div className={`
          w-full max-w-md border-2 border-dashed rounded-2xl p-8 text-center transition-colors
          ${previewUrl ? "border-purple-400 bg-purple-50" : "border-gray-300"}
        `}>
          {previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={previewUrl}
                alt="업로드된 사진"
                className="w-48 h-48 object-cover rounded-xl shadow-md"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-gray-400">JPG, PNG, WEBP · 최대 5MB</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => mobileInputRef.current?.click()}
            className="mt-4 px-6 py-2.5 bg-purple-600 active:bg-purple-700 text-white font-semibold rounded-full transition-colors shadow-md"
          >
            사진 업로드하기
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {previewUrl && (
          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="w-full max-w-md py-4 bg-purple-600 active:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-2xl transition-colors shadow-md text-lg"
          >
            {isLoading ? "분석 중..." : "닮은 연예인 찾기"}
          </button>
        )}
      </div>
    );
  }

  // ── 데스크톱 UI ─────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div
        {...getRootProps()}
        className={`
          w-full max-w-md border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"}
          ${previewUrl ? "border-purple-400 bg-purple-50" : ""}
        `}
      >
        <input {...getInputProps()} />

        {previewUrl ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={previewUrl}
              alt="업로드된 사진"
              className="w-48 h-48 object-cover rounded-xl shadow-md"
            />
            <p className="text-sm text-gray-500">다른 사진을 드래그하거나 클릭하세요</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-700">
                {isDragActive ? "여기에 놓으세요!" : "사진을 드래그하거나 클릭해서 업로드"}
              </p>
              <p className="text-sm text-gray-400 mt-1">JPG, PNG, WEBP · 최대 5MB</p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {previewUrl && (
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-full transition-colors shadow-md"
        >
          {isLoading ? "분석 중..." : "닮은 연예인 찾기"}
        </button>
      )}
    </div>
  );
}
