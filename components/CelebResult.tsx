'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Celebrity } from '@/types';
import { trackShare } from '@/lib/analytics';

interface CelebResultProps {
  celebrities: Celebrity[];
  previewDataUrl: string | null;
  isLoading?: boolean;
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], string> = {
  Korean: '🇰🇷 한국',
  Hollywood: '🎬 할리우드',
};

const RANK_COLORS = ['#D97445', '#B09278', '#C4956A'];

const SITE_URL = 'https://twin-celeb.com';
const PIXEL_RATIO = 2;

async function buildShareImage(cardEl: HTMLDivElement, photoDataUrl: string | null): Promise<File> {
  const photoEl = cardEl.querySelector<HTMLImageElement>('[data-photo]');

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

  if (!photoRect || !photoDataUrl) {
    const blob = await (await fetch(baseDataUrl)).blob();
    return new File([blob], 'twin-celeb-result.png', { type: 'image/png' });
  }

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
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(userImg, x, y, w, h);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#E8924E';
        ctx.lineWidth = 1.5 * PIXEL_RATIO;
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

/* ── Celebrity card item ─────────────────────────────────────── */
function CelebCard({ celeb, idx }: { celeb: Celebrity; idx: number }) {
  const rankColor = RANK_COLORS[idx] ?? '#B09278';

  return (
    <div className="bg-white/70 rounded-2xl p-4 border border-[rgba(200,130,80,0.12)]">
      <div className="flex items-start gap-3">
        {/* Rank number */}
        <span
          className="text-4xl font-black leading-none mt-0.5 tabular-nums shrink-0"
          style={{ color: rankColor, opacity: 0.9 }}
        >
          {idx + 1}
        </span>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-[#1C0D07] truncate">{celeb.name}</p>
              <p className="text-xs text-[#B09278] mt-0.5 truncate">{celeb.nameEn} · {celeb.occupation}</p>
            </div>
            <span className="text-[10px] text-[#7D5840] bg-[#FBE9DB] px-2.5 py-0.5 rounded-full shrink-0 border border-[#E8924E]/20 whitespace-nowrap">
              {NATIONALITY_LABELS[celeb.nationality]}
            </span>
          </div>

          {/* Similarity bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#B09278]">유사도</span>
              <span className="font-bold text-[#1C0D07]">{celeb.similarity}%</span>
            </div>
            <div className="w-full bg-[#F5E8DC] rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${celeb.similarity}%`,
                  background: `linear-gradient(to right, ${rankColor}80, ${rankColor})`,
                }}
              />
            </div>
          </div>

          {/* Reason tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {celeb.reasons.map((reason, i) => (
              <span
                key={i}
                className="text-[11px] text-[#7D5840] bg-[#FBE9DB]/70 px-2.5 py-0.5 rounded-full border border-[#E8924E]/15"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main result component ───────────────────────────────────── */
export default function CelebResult({ celebrities, previewDataUrl, isLoading = false }: CelebResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [shareCount, setShareCount] = useState<number | null>(null);

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
        } catch { /* URL 공유로 fallback */ }
      });
    });
    return () => { cancelled = true; };
  }, [celebrities, previewDataUrl, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    fetch('/api/track', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { share_count: number }) => setShareCount(data.share_count))
      .catch(() => {});
  }, [isLoading]);

  const handleShare = async () => {
    setSharing(true);
    setShareError(false);
    try {
      if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
        trackShare('native_file');
        await navigator.share({ files: [shareFile], text: SITE_URL });
      } else if (navigator.share) {
        trackShare('native_url');
        await navigator.share({ url: SITE_URL, title: '나의 쌍둥이 연예인' });
      } else if (shareFile) {
        trackShare('download');
        const url = URL.createObjectURL(shareFile);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'twin-celeb-result.png';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share' }),
      })
        .then((r) => r.json())
        .then((data: { share_count: number }) => setShareCount(data.share_count))
        .catch(() => {});
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setShareError(true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="w-full">
      {/* ── Capture zone ── */}
      <div ref={cardRef} className="card-glass rounded-3xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] tracking-[0.22em] text-[#B09278] uppercase font-medium">
            My Celebrity Match
          </p>
          {previewDataUrl && (
            <img
              data-photo
              src={previewDataUrl}
              alt="내 사진"
              className="w-10 h-10 object-cover rounded-full border-2 border-[#E8924E]/40"
            />
          )}
        </div>

        {/* Celebrity list */}
        <div className="flex flex-col gap-3">
          {celebrities.map((celeb, idx) => (
            <CelebCard key={idx} celeb={celeb} idx={idx} />
          ))}
        </div>

        {/* Streaming loading dots */}
        {isLoading && (
          <div className="flex justify-center gap-2 mt-5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  background: i % 2 === 0 ? '#E8924E' : '#D97445',
                }}
              />
            ))}
          </div>
        )}

        {/* Watermark */}
        <p className="text-center text-[10px] text-[#C4A090] mt-4 tracking-wider">
          {SITE_URL}
        </p>
      </div>

      {/* ── Share section ── */}
      {!isLoading && (
        <div className="mt-4 flex flex-col items-center gap-3">
          {shareCount !== null && shareCount > 0 && (
            <p className="text-xs text-[#B09278]">
              지금까지{' '}
              <strong className="text-[#7D5840]">
                {shareCount.toLocaleString('ko-KR')}명
              </strong>
              이 결과를 공유했어요
            </p>
          )}

          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full py-4 bg-[#1C0D07] hover:bg-[#2D1810] disabled:opacity-50 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/15 active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            {sharing ? '준비 중...' : '친구에게 공유하기'}
          </button>

          {shareError && (
            <p className="text-xs text-[#B09278] text-center">
              공유에 실패했습니다. 스크린샷으로 저장해서 보내보세요.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
