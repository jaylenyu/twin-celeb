'use client';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full border-2 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gray-900 animate-spin" />
      </div>
      <p className="text-xs text-gray-400 tracking-wide">분석 중</p>
    </div>
  );
}
