"use client";

import { useCallback, useEffect, useRef, lazy, Suspense } from "react";
import confetti from "canvas-confetti";
import { useAppStore } from "@/store/useAppStore";
import { trackAnalyzeClick, trackAnalyzeComplete } from "@/lib/analytics";
import { streamFindCeleb, FindCelebError } from "@/lib/findCeleb";

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
      particleCount: 90,
      spread: 75,
      origin: { x, y: 0.55 },
      colors: ["#F5C9A8", "#E8924E", "#D97445", "#F0A572", "#FBEADC"],
      scalar: 0.95,
      gravity: 1.1,
    });
  burst(0.35);
  setTimeout(() => burst(0.65), 150);
}

/* ── Stats badge ─────────────────────────────────────────────── */
function StatsDisplay() {
  const stats = useAppStore((state) => state.stats);
  if (!stats || (stats.analyze_count === 0 && stats.share_count === 0))
    return null;

  return (
    <div className="flex items-center justify-center mt-4 anim-fade">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full card-glass text-xs text-[#7D5840]">
        <span className="text-[#D97445]">✦</span>
        {stats.analyze_count > 0 && (
          <span>
            <strong className="font-semibold text-[#1C0D07]">
              {stats.analyze_count.toLocaleString("ko-KR")}
            </strong>
            명 분석
          </span>
        )}
        {stats.analyze_count > 0 && stats.share_count > 0 && (
          <span className="text-[#D97445] opacity-40">|</span>
        )}
        {stats.share_count > 0 && (
          <span>
            <strong className="font-semibold text-[#1C0D07]">
              {stats.share_count.toLocaleString("ko-KR")}
            </strong>
            번 공유
          </span>
        )}
        <span className="text-[#D97445]">✦</span>
      </div>
    </div>
  );
}

/* ── Error display ───────────────────────────────────────────── */
function ErrorDisplay() {
  const error = useAppStore((state) => state.error);
  const isLoading = useAppStore((state) => state.isLoading);
  const selectedFile = useAppStore((state) => state.selectedFile);
  const setError = useAppStore((state) => state.setError);
  const setResults = useAppStore((state) => state.setResults);
  const setIsLoading = useAppStore((state) => state.setIsLoading);

  const handleRetry = useCallback(async () => {
    if (!selectedFile) return;
    trackAnalyzeClick();
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const { count } = await streamFindCeleb(selectedFile, useAppStore.getState().addResult);
      if (count > 0) trackAnalyzeComplete(count);
    } catch (e) {
      if (e instanceof FindCelebError) setError(e.message);
      else setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, setError, setIsLoading, setResults]);

  if (!error || isLoading) return null;

  return (
    <div className="mt-4 px-5 py-4 card-glass rounded-2xl text-[#7D5840] text-sm max-w-sm w-full text-center anim-fade-up">
      <p>{error}</p>
      {selectedFile && (
        <button
          onClick={handleRetry}
          className="mt-3 px-5 py-1.5 text-xs bg-[#FBE9DB] border border-[#E8924E]/40 rounded-full text-[#D97445] font-medium hover:bg-[#F5D8C0] transition-colors cursor-pointer"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

/* ── Upload section ──────────────────────────────────────────── */
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

  const handleImageSelect = useCallback(
    (file: File, url: string) => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = url;
      setSelectedFile(file);
      setPreviewUrl(url);
      setPreviewDataUrl(null);
      setResults([]);
      setError(null);
      blobUrlToDataUrl(url).then(setPreviewDataUrl).catch(() => {});
    },
    [setSelectedFile, setPreviewUrl, setPreviewDataUrl, setResults, setError],
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    trackAnalyzeClick();
    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const { count } = await streamFindCeleb(selectedFile, useAppStore.getState().addResult);
      if (count > 0) trackAnalyzeComplete(count);
    } catch (e) {
      if (e instanceof FindCelebError) setError(e.message);
      else setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, setError, setIsLoading, setResults]);

  return (
    <div className="mt-8 w-full flex justify-center">
      <Suspense fallback={null}>
        <ImageUpload
          onImageSelect={handleImageSelect}
          previewUrl={previewUrl}
          isLoading={isLoading}
          onAnalyze={handleAnalyze}
        />
      </Suspense>
    </div>
  );
}

/* ── Reset button ────────────────────────────────────────────── */
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
        className="cursor-pointer px-6 py-2.5 card-glass rounded-full text-sm text-[#7D5840] hover:text-[#D97445] transition-colors border border-[#E8924E]/25 hover:border-[#E8924E]/50"
      >
        ← 다시하기
      </button>
    </div>
  );
}

/* ── Decorative background blobs ─────────────────────────────── */
function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden>
      <div
        className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, #F0A572 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-60 -left-40 w-[700px] h-[700px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #D97445 0%, transparent 70%)" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #E8924E 0%, transparent 70%)" }}
      />
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Home() {
  const results = useAppStore((state) => state.results);
  const isLoading = useAppStore((state) => state.isLoading);
  const previewDataUrl = useAppStore((state) => state.previewDataUrl);
  const setStats = useAppStore((state) => state.setStats);
  const prevHasResults = useRef(false);

  const showResults = results.length > 0;
  const hasResults = results.length > 0 && !isLoading;

  useEffect(() => {
    if (hasResults && !prevHasResults.current) fireConfetti();
    prevHasResults.current = hasResults;
  }, [hasResults]);

  useEffect(() => {
    fetch("/api/track", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [setStats]);

  return (
    <>
      <BackgroundBlobs />
      <main className="min-h-screen flex flex-col items-center px-5 pt-16 pb-20">
        {/* ── Hero header ── */}
        <header className="text-center anim-fade-up" style={{ animationDelay: "0ms" }}>
          <p className="text-[11px] tracking-[0.28em] text-[#B09278] uppercase mb-4 font-medium">
            AI&nbsp;&nbsp;Celebrity&nbsp;&nbsp;Match
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            <span className="gradient-text">나의 쌍둥이</span>
            <br />
            <span className="text-[#1C0D07]">연예인</span>
          </h1>

          {!showResults ? (
            <>
              <p className="mt-4 text-sm text-[#7D5840] max-w-[260px] mx-auto leading-relaxed">
                사진을 올리면 AI가 닮은 연예인을 찾아드려요
              </p>
              <StatsDisplay />
              <UploadSection />
            </>
          ) : (
            hasResults && <ResetButton />
          )}
        </header>

        <ErrorDisplay />

        {/* ── Results ── */}
        {showResults && (
          <div className="w-full max-w-sm mt-6 anim-fade-up" style={{ animationDelay: "80ms" }}>
            <Suspense fallback={null}>
              <CelebResult
                celebrities={results}
                previewDataUrl={previewDataUrl}
                isLoading={isLoading}
              />
            </Suspense>
          </div>
        )}
      </main>
    </>
  );
}
