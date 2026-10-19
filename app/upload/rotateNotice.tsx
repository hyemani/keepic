"use client";

import { useEffect, useRef } from "react";

// 57차: 폰을 세로로 든 채 "편집하기"에 들어오면 보여주는 안내예요. 미리보기(보기만)는 세로에서도 그대로 되고,
// 편집만 가로 화면을 권해요. 막다른 길이 되지 않게 "세로로 계속하기"도 작게 남겨뒀어요(가로 고정 기기 등).
export function RotateNotice({ onBackToPreview, onContinue }: { onBackToPreview: () => void; onContinue: () => void }) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    primaryRef.current?.focus();
  }, []);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-notice-title"
      data-testid="rotate-notice"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-white px-8 text-center"
    >
      <svg
        viewBox="0 0 64 64"
        width="72"
        height="72"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="text-[var(--color-sky)] motion-safe:animate-[rotate-hint_2.4s_ease-in-out_infinite]"
      >
        <rect x="21" y="8" width="22" height="40" rx="4" />
        <path d="M30 42h4" />
        <path d="M12 54c6 5 14 6 22 3" />
        <path d="M30 60l5-3-3-5" />
      </svg>
      <h2 id="rotate-notice-title" className="text-lg font-medium text-[var(--color-charcoal)] break-keep">
        휴대폰을 가로로 돌려주세요
      </h2>
      <p className="max-w-[18rem] text-sm leading-relaxed text-[var(--color-charcoal)]/70 break-keep">
        가로로 돌리면 앨범 한 장이 한눈에 보여서 사진과 글자를 훨씬 편하게 꾸밀 수 있어요.
      </p>
      <div className="mt-2 flex w-full max-w-[18rem] flex-col gap-2">
        <button
          ref={primaryRef}
          type="button"
          onClick={onBackToPreview}
          className="flex h-11 items-center justify-center bg-[var(--color-charcoal)] px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
        >
          미리보기로 돌아가기
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex h-11 items-center justify-center px-4 text-xs text-[var(--color-charcoal)]/60 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-sky)]"
        >
          세로 화면으로 계속하기
        </button>
      </div>
    </div>
  );
}
