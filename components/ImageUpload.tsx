"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { compressImage } from "@/lib/imageCompression";
import { ACCEPTED_MIME, isAcceptedMime } from "@/lib/uploadConfig";

interface ImageUploadProps {
  onImageSelect: (file: File, previewUrl: string) => void;
  previewUrl: string | null;
  isLoading: boolean;
  onAnalyze: () => void;
}

const DROPZONE_ACCEPT = Object.fromEntries(ACCEPTED_MIME.map((m) => [m, []]));
const ACCEPT_ATTR = ACCEPTED_MIME.join(",");
const MIME_ERROR = "JPG, PNG, WEBP 형식만 지원합니다.";

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
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

interface PreviewCardProps {
  previewUrl: string | null;
  isMobile: boolean;
  isDragActive: boolean;
}

function PreviewCard({ previewUrl, isMobile, isDragActive }: PreviewCardProps) {
  if (previewUrl) {
    return (
      <div className="relative">
        <img
          src={previewUrl}
          alt="업로드된 사진"
          className={`w-full ${isMobile ? "h-52" : "h-56"} object-cover`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
    );
  }

  if (isMobile) {
    return (
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
    );
  }

  return (
    <div
      className={`p-10 text-center transition-colors ${
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
  );
}

export default function ImageUpload({ onImageSelect, previewUrl, isLoading, onAnalyze }: ImageUploadProps) {
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
      if (!isAcceptedMime(file.type)) {
        setError(MIME_ERROR);
        return;
      }
      setCompressing(true);
      try {
        const result = await compressImage(file);
        onImageSelect(result, URL.createObjectURL(result));
      } catch (e) {
        setError(e instanceof Error ? e.message : "이미지 처리 실패");
      } finally {
        setCompressing(false);
      }
    },
    [onImageSelect],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);
      if (rejectedFiles.length > 0) {
        setError(MIME_ERROR);
        return;
      }
      if (acceptedFiles[0]) handleFiles(acceptedFiles);
    },
    [handleFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: DROPZONE_ACCEPT,
    multiple: false,
    disabled,
  });

  const analyzeLabel = isLoading ? "분석 중..." : "닮은 연예인 찾기";

  const cardContent = (
    <div className="card-glass rounded-3xl overflow-hidden">
      <PreviewCard previewUrl={previewUrl} isMobile={isMobile} isDragActive={isDragActive} />
      {!isMobile && previewUrl && (
        <div className="px-4 py-3">
          <p className={`text-xs text-[#B09278] text-center ${disabled ? "invisible" : ""}`}>
            클릭하거나 드래그해서 변경
          </p>
        </div>
      )}
      {isMobile && (
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
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
      {isMobile ? (
        <>
          <input
            ref={mobileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            disabled={disabled}
          />
          <div className="w-full">{cardContent}</div>
        </>
      ) : (
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
          {cardContent}
        </div>
      )}

      {!isMobile && compressing && <p className="text-xs text-[#B09278]">이미지 압축 중...</p>}
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
