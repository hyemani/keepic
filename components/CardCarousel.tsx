"use client";

import Link from "next/link";
import { useRef, useState } from "react";

export type CarouselItem = {
  src: string;
  alt: string;
  // 이 이미지가 실제 편집기(포토북 만들기)에서 그대로 고를 수 있는 디자인일 때만 넣어주세요.
  // 없으면 카드에 버튼 없이 "확대해서 보기"만 가능해요.
  cta?: { label: string; href: string };
};

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
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
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}

export default function CardCarousel({ items }: { items: CarouselItem[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const cardWidth = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  const closeLightbox = () => setLightboxIndex(null);
  const showPrevLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i - 1 + items.length) % items.length));
  const showNextLightbox = () =>
    setLightboxIndex((i) => (i === null ? null : (i + 1) % items.length));

  const activeItem = lightboxIndex !== null ? items[lightboxIndex] : null;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <button
            key={item.src}
            type="button"
            data-card
            onClick={() => setLightboxIndex(i)}
            aria-label={`${item.alt}, 확대해서 보기`}
            className="w-[78%] shrink-0 snap-start overflow-hidden rounded-xl bg-[var(--color-hairline)]/15 text-left transition hover:opacity-90 sm:w-[calc((100%-2rem)/3)]"
          >
            <img src={item.src} alt={item.alt} className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="이전 표지 예시 보기"
            className="absolute left-0 top-[calc(50%-0.75rem)] z-10 hidden h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:opacity-90 sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="다음 표지 예시 보기"
            className="absolute right-0 top-[calc(50%-0.75rem)] z-10 hidden h-10 w-10 -translate-y-1/2 translate-x-4 items-center justify-center rounded-full bg-white text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:opacity-90 sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}

      {activeItem && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.alt}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <span className="text-2xl leading-none">×</span>
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showPrevLightbox();
                }}
                aria-label="이전 표지 예시"
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  showNextLightbox();
                }}
                aria-label="다음 표지 예시"
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6"
              >
                <ChevronIcon direction="right" />
              </button>
            </>
          )}

          <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={activeItem.src}
              alt={activeItem.alt}
              className="max-h-[75vh] max-w-[90vw] rounded-lg object-contain"
            />
            {activeItem.cta && (
              <Link
                href={activeItem.cta.href}
                className="mt-5 inline-block rounded-full bg-[var(--color-sky)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                {activeItem.cta.label}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
