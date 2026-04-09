"use client";

import { useCallback, useEffect, useRef, lazy, Suspense } from "react";
import confetti from "canvas-confetti";
import { useAppStore } from "@/store/useAppStore";
import { trackAnalyzeClick, trackAnalyzeComplete } from "@/lib/analytics";

const ImageUpload = lazy(() => import("@/components/ImageUpload"));
const CelebResult = lazy(() => import("@/components/CelebResult"));

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
      colors: ["#F2DDD5", "#F2B999", "#F2B279", "#0D0D0D", "#737373"],
      scalar: 0.9,
      gravity: 1.2,
    });

  burst(0.35);
  setTimeout(() => burst(0.65), 150);
}

function StatsDisplay() {
  const stats = useAppStore((state) => state.stats);
  if (!stats || (stats.analyze_count === 0 && stats.share_count === 0)) return null;
  
  return (
    <p className="mt-2 text-xs text-[#737373]">
      {stats.analyze_count > 0 && (
        <span>{stats.analyze_count.toLocaleString('ko-KR')}명 분석</span>
      )}
      {stats.analyze_count > 0 && stats.share_count > 0 && (
        <span className="mx-1.5">·</span>
      )}
      {stats.share_count > 0 && (
        <span>{stats.share_count.toLocaleString('ko-KR')}번 공유</span>
      )}
    </p>
  );
}

function ErrorDisplay() {
  const error = useAppStore((state) => state.error);
  const isLoading = useAppStore((state) => state.isLoading);
  const selectedFile = useAppStore((state) => state.selectedFile);
  const handleAnalyze = useAppStore((state) => state.setIsLoading);
  const setError = useAppStore((state) => state.setError);
  const setResults = useAppStore((state) => state.setResults);
  const setIsLoading = useAppStore((state) => state.setIsLoading);

  const handleRetry = useCallback(async () => {
    if (!selectedFile) return;
    trackAnalyzeClick();
    setIsLoading(true);
    setError(null);
    setResults([]);

    let completedCount = 0;

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/find-celeb", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.error) {
            setError(data.error);
            return;
          }
          completedCount++;
          useAppStore.getState().addResult(data);
        }
      }

      if (completedCount > 0) trackAnalyzeComplete(completedCount);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, setError, setIsLoading, setResults]);

  if (!error || isLoading) return null;

  return (
    <div className="mt-2 px-5 py-4 bg-white border border-[#F2B999] rounded-xl text-[#737373] text-sm max-w-md w-full text-center">
      <p>{error}</p>
      {selectedFile && (
        <button
          onClick={handleRetry}
          className="mt-3 px-4 py-1.5 text-xs bg-[#F2DDD5] border border-[#F2B999] rounded-full text-[#0D0D0D] hover:bg-[#F2B999] transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function UploadSection() {
  const previewUrl = useAppStore((state) => state.previewUrl);
  const isLoading = useAppStore((state) => state.isLoading);
  const selectedFile = useAppStore((state) => state.selectedFile);
  const setSelectedFile = useAppStore((state) => state.setSelectedFile);
  const setPreviewUrl = useAppStore((state) => state.setPreviewUrl);
  const setPreviewDataUrl = useAppStore((state) => state.setPreviewDataUrl);
  const setResults = useAppStore((state) => state.setResults);
  const setError = useAppStore((state) => state.setError);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const previewUrlRef = useRef<string | null>(null);

  const handleImageSelect = useCallback((file: File, url: string) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setSelectedFile(file);
    setPreviewUrl(url);
    setPreviewDataUrl(null);
    setResults([]);
    setError(null);
    blobUrlToDataUrl(url)
      .then(setPreviewDataUrl)
      .catch(() => {});
  }, [setSelectedFile, setPreviewUrl, setPreviewDataUrl, setResults, setError]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    trackAnalyzeClick();
    setIsLoading(true);
    setError(null);
    setResults([]);

    let completedCount = 0;

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch("/api/find-celeb", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        setError(data.error ?? "오류가 발생했습니다.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.error) {
            setError(data.error);
            return;
          }
          completedCount++;
          useAppStore.getState().addResult(data);
        }
      }

      if (completedCount > 0) trackAnalyzeComplete(completedCount);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, setError, setIsLoading, setResults]);

  return (
    <div className="mt-8">
      <ImageUpload
        onImageSelect={handleImageSelect}
        previewUrl={previewUrl}
        isLoading={isLoading}
        onAnalyze={handleAnalyze}
      />
    </div>
  );
}

function ResetButton() {
  const previewUrlRef = useRef<string | null>(null);
  const setSelectedFile = useAppStore((state) => state.setSelectedFile);
  const setPreviewUrl = useAppStore((state) => state.setPreviewUrl);
  const setPreviewDataUrl = useAppStore((state) => state.setPreviewDataUrl);
  const setResults = useAppStore((state) => state.setResults);
  const setError = useAppStore((state) => state.setError);

  const handleReset = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewDataUrl(null);
    setResults([]);
    setError(null);
  }, [setSelectedFile, setPreviewUrl, setPreviewDataUrl, setResults, setError]);

  return (
    <div className="mt-6">
      <button
        onClick={handleReset}
        className="cursor-pointer px-6 py-2.5 bg-white border border-[#F2B999] rounded-full text-sm text-[#0D0D0D] hover:bg-[#F2DDD5] transition-colors"
      >
        다시하기
      </button>
    </div>
  );
}

function ResultSection() {
  const results = useAppStore((state) => state.results);
  const previewDataUrl = useAppStore((state) => state.previewDataUrl);
  const isLoading = useAppStore((state) => state.isLoading);

  return (
    <Suspense fallback={<div className="mt-6 text-center text-[#737373]">결과 로딩 중...</div>}>
      <CelebResult
        celebrities={results}
        previewDataUrl={previewDataUrl}
        isLoading={isLoading}
      />
    </Suspense>
  );
}

export default function Home() {
  const results = useAppStore((state) => state.results);
  const isLoading = useAppStore((state) => state.isLoading);
  const setStats = useAppStore((state) => state.setStats);
  const prevHasResults = useRef(false);
  const previewUrlRef = useRef<string | null>(null);

  const showResults = results.length > 0;
  const hasResults = results.length > 0 && !isLoading;

  useEffect(() => {
    fetch('/api/track', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [setStats]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (hasResults && !prevHasResults.current) {
      fireConfetti();
    }
    prevHasResults.current = hasResults;
  }, [hasResults]);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-16 bg-[#F2DDD5]">
      <div className="text-center mb-12">
        <p className="text-xs tracking-[0.2em] text-[#F2B279] uppercase mb-3 font-medium">
          AI Celebrity Match
        </p>
        <h1 className="text-3xl font-bold text-[#0D0D0D] tracking-tight">
          나의 쌍둥이 연예인
        </h1>

        {!showResults ? (
          <>
            <p className="mt-3 text-sm text-[#737373] max-w-xs mx-auto leading-relaxed">
              사진을 올리면 AI가 닮은 연예인을 찾아드려요
            </p>
            <StatsDisplay />
            <Suspense fallback={<div className="mt-8 h-64 bg-white/60 rounded-2xl animate-pulse" />}>
              <UploadSection />
            </Suspense>
          </>
        ) : (
          hasResults && <ResetButton />
        )}
      </div>

      <ErrorDisplay />

      {showResults && <ResultSection />}
    </main>
  );
}
