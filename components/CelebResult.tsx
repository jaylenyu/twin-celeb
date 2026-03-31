'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Celebrity } from '@/types';

interface CelebResultProps {
  celebrities: Celebrity[];
  previewDataUrl: string | null;
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], string> = {
  Korean: '한국',
  Hollywood: '할리우드',
};

const SITE_URL = 'https://twin-celeb.vercel.app';

export default function CelebResult({ celebrities, previewDataUrl }: CelebResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);
  // 사진이 없을 때도 캡처 트리거하기 위한 플래그
  const [imageReady, setImageReady] = useState(!previewDataUrl);

  // previewDataUrl이 바뀌면 imageReady 초기화
  useEffect(() => {
    setImageReady(!previewDataUrl);
    setShareFile(null);
  }, [previewDataUrl]);

  // 이미지가 준비된 후 캡처 (onLoad 또는 사진 없는 경우 즉시)
  useEffect(() => {
    if (!imageReady || !cardRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const dataUrl = await toPng(cardRef.current!, { cacheBust: true, pixelRatio: 2 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setShareFile(new File([blob], 'twin-celeb-result.png', { type: 'image/png' }));
      } catch {
        // 캡처 실패 — 공유 버튼 클릭 시 URL 공유로 fallback
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [imageReady, celebrities]);

  const handleShare = async () => {
    setSharing(true);
    setShareError(false);

    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile] });
      } else if (navigator.share) {
        await navigator.share({ url: SITE_URL, title: '나의 쌍둥이 연예인' });
      } else if (shareFile) {
        const url = URL.createObjectURL(shareFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'twin-celeb-result.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setShareError(true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full max-w-sm mt-4">
      {/* 캡처 영역 */}
      <div ref={cardRef} className="bg-white p-5 rounded-xl">
        <p className="text-xs tracking-[0.15em] text-gray-400 uppercase text-center mb-5">Result</p>

        {/* 업로드한 사진 — 로드 완료 후 캡처 트리거 */}
        {previewDataUrl && (
          <div className="flex justify-center mb-5">
            <img
              src={previewDataUrl}
              alt="내 사진"
              onLoad={() => setImageReady(true)}
              className="w-24 h-24 object-cover rounded-full border border-gray-100"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {celebrities.map((celeb, idx) => (
            <div
              key={idx}
              className="border border-gray-100 rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{celeb.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{celeb.nameEn} · {celeb.occupation}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">
                  {NATIONALITY_LABELS[celeb.nationality]}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">유사도</span>
                  <span className="text-gray-700 font-medium">{celeb.similarity}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1">
                  <div
                    className="bg-gray-900 h-1 rounded-full transition-all duration-700"
                    style={{ width: `${celeb.similarity}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {celeb.reasons.map((reason, i) => (
                  <span key={i} className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-300 mt-5">{SITE_URL}</p>
      </div>

      {/* 공유 버튼 */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="mt-4 w-full py-3.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {sharing ? '준비 중...' : '친구에게 공유하기'}
      </button>

      {shareError && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          공유에 실패했습니다. 스크린샷으로 저장해서 보내보세요.
        </p>
      )}
    </div>
  );
}
