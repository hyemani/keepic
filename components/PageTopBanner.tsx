"use client";

import { useEffect, useRef, useState } from "react";

export type PageTopBannerImage = { src: string; alt: string };

// 포토북/액자/나만의 굿즈 페이지가 공통으로 쓰는 상단 영역이에요.
// 문구는 이미지 위에 겹쳐 쓰지 않고 먼저 보여준 다음, 그 아래에 이미지 여러 장을
// 카드 형태로 나란히 보여줘요. (문구를 이미지 위에 얹으려고 이미지를 억지로 얇게
// 잘라내던 이전 방식 대신, 카드 하나하나가 원본 비율에 가깝게 보이도록 했어요)
const AUTO_PLAY_MS = 4000;

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

export default function PageTopBanner({
  images,
  eyebrow,
  titleLines,
  descLines,
}: {
  images: PageTopBannerImage[];
  eyebrow?: string;
  titleLines: string[];
  descLines: string[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) {
      el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }
    setIndex(i);
  };

  const goPrev = () => scrollToIndex((index - 1 + images.length) % images.length);
  const goNext = () => scrollToIndex((index + 1) % images.length);

  useEffect(() => {
    if (images.length <= 1 || isHovering) return;
    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % images.length;
        const el = scrollerRef.current;
        const card = el?.children[next] as HTMLElement | undefined;
        if (el && card) el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
        return next;
      });
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [images.length, isHovering]);

  return (
    <section className="mx-auto max-w-6xl px-6 pb-8 pt-8 sm:px-10">
      {eyebrow && (
        <p className="text-sm font-medium text-[var(--color-sky)]">{eyebrow}</p>
      )}
      <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
        {titleLines.map((line, li) => (
          <span key={li}>
            {line}
            {li < titleLines.length - 1 && <br />}
          </span>
        ))}
      </h1>
      <p className="mt-3 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/75">
        {descLines.map((line, li) => (
          <span key={li}>
            {line}
            {li < descLines.length - 1 && <br />}
          </span>
        ))}
      </p>

      <div
        className="relative mt-8"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img) => (
            <div
              key={img.src}
              className="w-[85%] shrink-0 snap-start overflow-hidden rounded-xl bg-[var(--color-hairline)]/15 sm:w-[calc((100%-2rem)/3)]"
            >
              <img src={img.src} alt={img.alt} className="aspect-[3/2] w-full object-cover" />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="이전 이미지"
              className="absolute left-0 top-[calc(50%-1.25rem)] z-10 hidden h-10 w-10 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:opacity-90 sm:flex"
            >
              <ChevronIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="다음 이미지"
              className="absolute right-0 top-[calc(50%-1.25rem)] z-10 hidden h-10 w-10 -translate-y-1/2 translate-x-4 items-center justify-center rounded-full bg-white text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:opacity-90 sm:flex"
            >
              <ChevronIcon direction="right" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`${i + 1}번째 이미지 보기`}
              aria-current={i === index}
              onClick={() => scrollToIndex(i)}
              className="p-2.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-[var(--color-sky)]" : "w-1.5 bg-[var(--color-charcoal)]/25"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
