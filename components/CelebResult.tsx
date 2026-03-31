'use client';

import { useState } from 'react';
import { Celebrity } from '@/types';

interface CelebResultProps {
  celebrities: Celebrity[];
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], string> = {
  Korean: '한국',
  Hollywood: '할리우드',
};

function buildShareText(celebrities: Celebrity[]): string {
  const lines = celebrities.map(
    (c) => `${c.name} (${c.similarity}%)`
  );
  return `나의 쌍둥이 연예인은?\n${lines.join(', ')}\n\nhttps://twin-celeb.vercel.app`;
}

export default function CelebResult({ celebrities }: CelebResultProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = buildShareText(celebrities);

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // 사용자가 취소한 경우 무시
      }
      return;
    }

    // Web Share API 미지원 → 클립보드 복사
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-sm mt-10">
      <p className="text-xs tracking-[0.15em] text-gray-400 uppercase text-center mb-6">Result</p>

      <div className="flex flex-col gap-3">
        {celebrities.map((celeb, idx) => (
          <div
            key={idx}
            className="border border-gray-100 rounded-xl p-5 flex flex-col gap-3 bg-white"
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

      {/* 공유 버튼 */}
      <button
        onClick={handleShare}
        className="mt-5 w-full py-3.5 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {copied ? '복사됨!' : '친구에게 공유하기'}
      </button>
    </div>
  );
}
