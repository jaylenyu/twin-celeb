'use client';

import { Celebrity } from '@/types';

interface CelebResultProps {
  celebrities: Celebrity[];
}

const NATIONALITY_LABELS: Record<Celebrity['nationality'], { label: string; className: string }> = {
  Korean: { label: '한국', className: 'bg-blue-100 text-blue-700' },
  Hollywood: { label: '할리우드', className: 'bg-amber-100 text-amber-700' },
};

export default function CelebResult({ celebrities }: CelebResultProps) {
  return (
    <div className="w-full max-w-2xl mt-8">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">분석 결과</h2>
      <div className="flex flex-col gap-4">
        {celebrities.map((celeb, idx) => {
          const badge = NATIONALITY_LABELS[celeb.nationality];
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3"
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-lg">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{celeb.name}</p>
                    <p className="text-sm text-gray-400">{celeb.nameEn} · {celeb.occupation}</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              {/* 유사도 바 */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">닮음 정도</span>
                  <span className="font-bold text-purple-700">{celeb.similarity}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${celeb.similarity}%` }}
                  />
                </div>
              </div>

              {/* 닮은 이유 태그 */}
              <div className="flex flex-wrap gap-2">
                {celeb.reasons.map((reason, i) => (
                  <span
                    key={i}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
