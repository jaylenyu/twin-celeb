'use client';

import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import ImageUpload from '@/components/ImageUpload';
import CelebResult from '@/components/CelebResult';
import { Celebrity } from '@/types';

function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    fetch(blobUrl)
      .then((r) => r.blob())
      .then((blob) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

function fireConfetti() {
  const burst = (x: number) =>
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x, y: 0.55 },
      colors: ['#a3a3a3', '#d4d4d4', '#404040', '#737373', '#f5f5f5'],
      scalar: 0.9,
      gravity: 1.2,
    });

  burst(0.35);
  setTimeout(() => burst(0.65), 150);
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [results, setResults] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevHasResults = useRef(false);

  const hasResults = results.length > 0 && !isLoading;

  // 결과가 처음 나타날 때 confetti 실행
  useEffect(() => {
    if (hasResults && !prevHasResults.current) {
      fireConfetti();
    }
    prevHasResults.current = hasResults;
  }, [hasResults]);

  const handleImageSelect = (file: File, url: string) => {
    setSelectedFile(file);
    setPreviewUrl(url);
    setPreviewDataUrl(null);
    setResults([]);
    setError(null);
    blobUrlToDataUrl(url).then(setPreviewDataUrl).catch(() => {});
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewDataUrl(null);
    setResults([]);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await fetch('/api/find-celeb', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.celebrities);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 bg-white">
      {/* 헤더 */}
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.2em] text-gray-400 uppercase mb-3">AI Celebrity Match</p>
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
          나의 쌍둥이 연예인
        </h1>

        {!hasResults ? (
          <>
            <p className="mt-3 text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
              사진을 올리면 AI가 닮은 연예인을 찾아드려요
            </p>
            <div className="mt-8">
              <ImageUpload
                onImageSelect={handleImageSelect}
                previewUrl={previewUrl}
                isLoading={isLoading}
                onAnalyze={handleAnalyze}
              />
            </div>
          </>
        ) : (
          <div className="mt-6">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 border border-gray-200 rounded-full text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              다시하기
            </button>
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && !isLoading && (
        <div className="mt-2 px-5 py-4 border border-gray-200 rounded-lg text-gray-500 text-sm max-w-md w-full text-center">
          <p>{error}</p>
          {selectedFile && (
            <button
              onClick={handleAnalyze}
              className="mt-3 px-4 py-1.5 text-xs border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* 결과 */}
      {hasResults && (
        <CelebResult celebrities={results} previewDataUrl={previewDataUrl} />
      )}
    </main>
  );
}
