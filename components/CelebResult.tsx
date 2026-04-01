'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Celebrity } from '@/types';

interface CelebResultProps {
  celebrities: Celebrity[];
  previewDataUrl: string | null;
  isLoading?: boolean;
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], string> = {
  Korean: '한국',
  Hollywood: '할리우드',
};

const SITE_URL = 'https://twin-celeb.vercel.app';
const PIXEL_RATIO = 2;

async function buildShareImage(
  cardEl: HTMLDivElement,
  photoDataUrl: string | null,
): Promise<File> {
  const photoEl = cardEl.querySelector<HTMLImageElement>('[data-photo]');

  // 사진 요소 위치 기록 후 숨기기 (html-to-image가 data URL img를 못 캡처하는 iOS 문제 우회)
  let photoRect: { x: number; y: number; w: number; h: number } | null = null;
  if (photoEl && photoDataUrl) {
    const cardBounds = cardEl.getBoundingClientRect();
    const elBounds = photoEl.getBoundingClientRect();
    photoRect = {
      x: (elBounds.left - cardBounds.left) * PIXEL_RATIO,
      y: (elBounds.top - cardBounds.top) * PIXEL_RATIO,
      w: elBounds.width * PIXEL_RATIO,
      h: elBounds.height * PIXEL_RATIO,
    };
    photoEl.style.visibility = 'hidden';
  }

  const baseDataUrl = await toPng(cardEl, { cacheBust: true, pixelRatio: PIXEL_RATIO });
  if (photoEl) photoEl.style.visibility = '';

  // 사진 없으면 기본 캡처 그대로 사용
  if (!photoRect || !photoDataUrl) {
    const blob = await (await fetch(baseDataUrl)).blob();
    return new File([blob], 'twin-celeb-result.png', { type: 'image/png' });
  }

  // Canvas로 사진 합성
  return new Promise((resolve, reject) => {
    const baseImg = new Image();
    baseImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = baseImg.width;
      canvas.height = baseImg.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(baseImg, 0, 0);

      const userImg = new Image();
      userImg.onload = () => {
        const { x, y, w, h } = photoRect!;
        const r = Math.min(w, h) / 2;

        // 원형 클리핑 후 사진 그리기
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(userImg, x, y, w, h);
        ctx.restore();

        // 원형 테두리
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#F2B999';
        ctx.lineWidth = 1 * PIXEL_RATIO;
        ctx.stroke();

        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error('toBlob failed'));
            else resolve(new File([blob], 'twin-celeb-result.png', { type: 'image/png' }));
          },
          'image/png',
        );
      };
      userImg.onerror = reject;
      userImg.src = photoDataUrl;
    };
    baseImg.onerror = reject;
    baseImg.src = baseDataUrl;
  });
}

export default function CelebResult({ celebrities, previewDataUrl, isLoading = false }: CelebResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    setShareFile(null);
    setShareError(false);
    if (!cardRef.current || isLoading) return;

    const el = cardRef.current;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        if (cancelled) return;
        try {
          const file = await buildShareImage(el, previewDataUrl);
          if (!cancelled) setShareFile(file);
        } catch {
          // 생성 실패 시 공유 버튼 클릭 때 URL 공유로 fallback
        }
      });
    });

    return () => { cancelled = true; };
  }, [celebrities, previewDataUrl, isLoading]);

  const handleShare = async () => {
    setSharing(true);
    setShareError(false);

    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
        await navigator.share({
          files: [shareFile],
          text: SITE_URL,
        });
      } else if (navigator.share) {
        await navigator.share({ url: SITE_URL, title: '나의 쌍둥이 연예인' });
      } else if (shareFile) {
        const url = URL.createObjectURL(shareFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'twin-celeb-result.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
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
      <div ref={cardRef} className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-xs tracking-[0.2em] text-[#F2B279] uppercase text-center mb-5 font-medium">
          Result
        </p>

        {previewDataUrl && (
          <div className="flex justify-center mb-5">
            <img
              data-photo
              src={previewDataUrl}
              alt="내 사진"
              className="w-24 h-24 object-cover rounded-full border-2 border-[#F2B999]"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {celebrities.map((celeb, idx) => (
            <div key={idx} className="bg-[#F2DDD5]/40 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#F2B279] w-4">{idx + 1}</span>
                  <div>
                    <p className="font-semibold text-[#0D0D0D]">{celeb.name}</p>
                    <p className="text-xs text-[#737373] mt-0.5">{celeb.nameEn} · {celeb.occupation}</p>
                  </div>
                </div>
                <span className="text-xs text-[#737373] bg-white px-2.5 py-0.5 rounded-full border border-[#F2B999]">
                  {NATIONALITY_LABELS[celeb.nationality]}
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[#737373]">유사도</span>
                  <span className="text-[#0D0D0D] font-semibold">{celeb.similarity}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${celeb.similarity}%`,
                      background: 'linear-gradient(to right, #F2B999, #F2B279)',
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {celeb.reasons.map((reason, i) => (
                  <span key={i} className="text-xs text-[#0D0D0D] bg-white px-2.5 py-1 rounded-full border border-[#F2B999]/60">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 스트리밍 진행 중 로딩 dot */}
        {isLoading && (
          <div className="flex justify-center gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  background: i % 2 === 0 ? '#F2B999' : '#F2B279',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[#F2B999] mt-3">{SITE_URL}</p>

      {/* 공유 버튼 — 스트리밍 완료 후에만 표시 */}
      {!isLoading && (
        <>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="mt-4 w-full py-3.5 bg-[#0D0D0D] hover:bg-[#F2B279] hover:text-[#0D0D0D] disabled:opacity-50 text-white text-sm font-semibold rounded-full transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            {sharing ? '준비 중...' : '친구에게 공유하기'}
          </button>

          {shareError && (
            <p className="mt-2 text-xs text-[#737373] text-center">
              공유에 실패했습니다. 스크린샷으로 저장해서 보내보세요.
            </p>
          )}
        </>
      )}
    </div>
  );
}
