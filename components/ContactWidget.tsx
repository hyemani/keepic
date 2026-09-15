"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// 상단 메뉴(SiteHeader)에서 쓰는 것과 같은 카카오 채널 주소예요.
const KAKAO_URL = "https://pf.kakao.com/_FpGfX";

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export default function ContactWidget() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-24 sm:right-6"
    >
      {open && (
        <div
          role="dialog"
          aria-label="문의하기 메뉴"
          className="w-64 rounded-2xl border border-[var(--color-hairline)] bg-white p-5 shadow-[0_20px_45px_-15px_rgba(45,55,72,0.35)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">무엇을 도와드릴까요?</p>
              <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/60">
                상품 선택부터 제작 방법까지 궁금한 내용을 남겨주세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="문의하기 메뉴 닫기"
              className="shrink-0 text-lg leading-none text-[var(--color-charcoal)]/50 hover:text-[var(--color-charcoal)]"
            >
              ×
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 text-sm">
            <a
              href={KAKAO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--color-hairline)] px-4 py-3 transition hover:bg-[var(--color-ivory)] hover:text-[var(--color-sky)]"
            >
              카카오톡으로 문의하기
            </a>
            <Link
              href="/faq"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--color-hairline)] px-4 py-3 transition hover:bg-[var(--color-ivory)] hover:text-[var(--color-sky)]"
            >
              자주 묻는 질문
            </Link>
            <Link
              href="/order-lookup"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-[var(--color-hairline)] px-4 py-3 transition hover:bg-[var(--color-ivory)] hover:text-[var(--color-sky)]"
            >
              주문 조회
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="문의하기"
        className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-sky)] px-4 text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(45,55,72,0.45)] transition hover:opacity-90 sm:px-5"
      >
        <ChatIcon />
        <span className="hidden sm:inline">문의하기</span>
      </button>
    </div>
  );
}
