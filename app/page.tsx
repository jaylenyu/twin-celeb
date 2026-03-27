'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import CelebResult from '@/components/CelebResult';
import LoadingSpinner from '@/components/LoadingSpinner';
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
    <main className="min-h-screen flex flex-col items-center px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          쌍둥이 연예인 찾기
        </h1>
        <p className="mt-3 text-gray-500 text-base max-w-sm mx-auto">
          사진을 업로드하면 AI가 닮은 한국/할리우드 연예인을 찾아드려요
        </p>
      </div>

      {/* 업로드 */}
      <ImageUpload
        onImageSelect={handleImageSelect}
        previewUrl={previewUrl}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
      />

      {/* 로딩 */}
      {isLoading && <LoadingSpinner />}

      {/* 에러 */}
      {error && !isLoading && (
        <div className="mt-6 px-5 py-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm max-w-md w-full text-center">
          {error}
        </div>
      )}

      {/* 결과 */}
      {results.length > 0 && !isLoading && (
        <CelebResult celebrities={results} />
      )}
    </main>
  );
}
