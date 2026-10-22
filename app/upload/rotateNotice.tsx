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

// 64차: 편집하다가 폰이 세로가 됐을 때(전체 화면 안내는 접속 한 번뿐이라) 대신 보여주는 작은 알림이에요.
// 화면을 가리지 않고(pointer-events는 이 알림 자체에만), 몇 초 뒤 저절로 사라지며, 눌러서 바로 닫을 수도 있어요.
// 위치는 왼쪽 아래: 위쪽엔 헤더(로고·저장·다음), 오른쪽 아래엔 확대·축소 상자가 있고, 패널(시트)이 열리면 시트가 위에 덮어요.
export function RotateChip({ onClose }: { onClose: () => void }) {
  return (
    <div
      data-testid="rotate-chip"
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[max(12px,calc(env(safe-area-inset-bottom)+8px))] left-[max(12px,env(safe-area-inset-left))] z-30 flex"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-[var(--color-charcoal)]/90 py-1 pl-3.5 pr-1 text-[13px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
        <span className="break-keep">가로로 돌리면 더 편해요</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="알림 닫기"
          className="relative flex h-7 w-7 items-center justify-center rounded-full text-white/80 active:bg-white/15 after:absolute after:-inset-2 after:content-['']"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
