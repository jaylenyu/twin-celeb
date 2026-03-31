'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import CelebResult from '@/components/CelebResult';
import { Celebrity } from '@/types';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = (file: File, url: string) => {
    setSelectedFile(file);
    setPreviewUrl(url);
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
        <p className="mt-3 text-sm text-gray-400 max-w-xs mx-auto leading-relaxed">
          사진을 올리면 AI가 닮은 연예인을 찾아드려요
        </p>
      </div>

      {/* 업로드 */}
      <ImageUpload
        onImageSelect={handleImageSelect}
        previewUrl={previewUrl}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
      />

      {/* 에러 */}
      {error && !isLoading && (
        <div className="mt-6 px-5 py-4 border border-gray-200 rounded-lg text-gray-500 text-sm max-w-md w-full text-center">
          {error}
        </div>
      )}

      {/* 결과 */}
      {results.length > 0 && !isLoading && (
        <CelebResult celebrities={results} previewUrl={previewUrl} />
      )}
    </main>
  );
}
