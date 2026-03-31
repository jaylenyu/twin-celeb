'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Celebrity } from '@/types';

interface CelebResultProps {
  celebrities: Celebrity[];
  previewUrl: string | null;
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], string> = {
  Korean: '한국',
  Hollywood: '할리우드',
};

const SITE_URL = 'https://twin-celeb.vercel.app';

export default function CelebResult({ celebrities, previewUrl }: CelebResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);

  // 결과가 표시되자마자 이미지 미리 생성 (iOS Safari 유저 제스처 타임아웃 대응)
  useEffect(() => {
    if (!cardRef.current) return;

    const generate = async () => {
      try {
        const dataUrl = await toPng(cardRef.current!, { cacheBust: true, pixelRatio: 2 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        setShareFile(new File([blob], 'twin-celeb-result.png', { type: 'image/png' }));
      } catch {
        // 생성 실패 시 shareFile은 null 유지 → 공유 버튼 클릭 시 재시도
      }
    };

    // 렌더링 완료 후 생성
    const timer = setTimeout(generate, 300);
    return () => clearTimeout(timer);
  }, [celebrities, previewUrl]);

  const handleShare = async () => {
    setSharing(true);

    try {
      // 미리 생성된 파일 사용, 없으면 즉석 생성
      let file = shareFile;
      if (!file && cardRef.current) {
        const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        file = new File([blob], 'twin-celeb-result.png', { type: 'image/png' });
      }

      if (!file) return;

      if (navigator.canShare?.({ files: [file] })) {
        // 이미지 + URL 함께 공유 시도, 실패하면 이미지만
        try {
          await navigator.share({ files: [file], url: SITE_URL });
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') return;
          await navigator.share({ files: [file] });
        }
      } else if (navigator.share) {
        await navigator.share({ url: SITE_URL, title: '나의 쌍둥이 연예인' });
      } else {
        // 최종 fallback: 이미지 다운로드
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'twin-celeb-result.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        // 공유 실패 시 다운로드로 fallback
        if (shareFile) {
          const url = URL.createObjectURL(shareFile);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'twin-celeb-result.png';
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full max-w-sm mt-10">
      {/* 캡처 영역 */}
      <div ref={cardRef} className="bg-white p-5 rounded-xl">
        <p className="text-xs tracking-[0.15em] text-gray-400 uppercase text-center mb-5">Result</p>

        {/* 업로드한 사진 */}
        {previewUrl && (
          <div className="flex justify-center mb-5">
            <img
              src={previewUrl}
              alt="내 사진"
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
              {/* 헤더 */}
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

              {/* 유사도 바 */}
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

              {/* 닮은 이유 */}
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

        {/* 워터마크 */}
        <p className="text-center text-xs text-gray-300 mt-5">{SITE_URL}</p>
      </div>

      {/* 공유 버튼 (캡처 영역 밖) */}
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
    </div>
  );
}
