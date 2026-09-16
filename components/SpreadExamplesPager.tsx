"use client";

import { useState } from "react";

export type SpreadExampleImage = { src: string; alt: string };

// 내지 예시 이미지가 많아지면 아래로 계속 스크롤해야 해서, 1장씩만 보여주고
// 화살표로 다음 장을 넘겨보는 방식으로 만들었어요.
const PAGE_SIZE = 1;

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export default function SpreadExamplesPager({ images }: { images: SpreadExampleImage[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const pageItems = images.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div className="relative">
        <div className="grid grid-cols-1 gap-4">
          {pageItems.map((img) => (
            <div key={img.src} className="overflow-hidden">
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>

        {/* 화살표를 이미지 세로 중앙, 양옆에 겹쳐서 놓았어요. */}
        {totalPages > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="이전 페이지"
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              aria-label="다음 페이지"
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>

      {/* 번호 대신, 몇 페이지 중 몇 번째인지 짧은 가로 막대로 보여줘요. */}
      {totalPages > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}페이지 보기`}
              aria-current={i === page}
              onClick={() => setPage(i)}
              className="p-1.5"
            >
              <span
                className={`block h-1 w-6 rounded-full transition-colors ${
                  i === page ? "bg-[var(--color-sky)]" : "bg-[var(--color-charcoal)]/25"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
