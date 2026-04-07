"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-[#F2DDD5]">
      <div className="text-center max-w-sm">
        <p className="text-sm text-[#737373] mb-4">
          오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={reset}
          className="cursor-pointer px-6 py-2.5 bg-white border border-[#F2B999] rounded-full text-sm text-[#0D0D0D] hover:bg-[#F2DDD5] transition-colors"
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
