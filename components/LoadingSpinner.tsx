'use client';

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-purple-200" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 animate-spin" />
      </div>
      <p className="text-gray-500 text-sm font-medium animate-pulse">AI가 분석 중입니다...</p>
    </div>
  );
}
