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
      <div className="grid grid-cols-1 gap-4">
        {pageItems.map((img) => (
          <div key={img.src} className="overflow-hidden">
            <img src={img.src} alt={img.alt} className="w-full object-cover" />
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-[var(--color-charcoal)]/60">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="이전 페이지"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] transition hover:border-[var(--color-sky)] hover:text-[var(--color-sky)] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronIcon direction="left" />
          </button>
          <span className="tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="다음 페이지"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] transition hover:border-[var(--color-sky)] hover:text-[var(--color-sky)] disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronIcon direction="right" />
          </button>
        </div>
      )}
    </div>
  );
}
