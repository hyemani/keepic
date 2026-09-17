"use client";

import { useRef, useState } from "react";

export type SampleSpreadImage = { src: string; alt: string };

// 홈 화면의 "디자인 샘플"(표지부터 내지까지) 섹션에서 써요.
// 예전엔 이미지를 전부 그리드로 늘어놓고 스크롤해서 봐야 했는데,
// 화면 폭 전체를 쓰는 한 장짜리 슬라이드를 좌우로 스와이프해서
// 한 장씩 넘겨보는 방식으로 바꿨어요. 화살표 버튼은 일부러 빼고,
// 스와이프(또는 아래 점을 눌러서) 넘기는 방식만 남겨뒀어요.
// 이미지가 세로로 긴 사진들이라, 데스크탑에서 가운데로 폭을 제한해서
// 너무 옆으로 늘어나 보이지 않게 했어요.
export default function SampleSpreadCarousel({ images }: { images: SampleSpreadImage[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
    setIndex(i);
  };

  const handleScroll = () => {
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const el = scrollerRef.current;
      if (!el || el.clientWidth === 0) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(Math.max(0, Math.min(images.length - 1, i)));
    }, 120);
  };

  return (
    <div className="mx-auto max-w-sm sm:max-w-md">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img) => (
          <div
            key={img.src}
            className="aspect-[2/3] w-full shrink-0 snap-start overflow-hidden bg-white"
          >
            <img src={img.src} alt={img.alt} className="h-full w-full object-contain" />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`${i + 1}번째 이미지 보기`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className="p-1.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))]" : "w-1.5 bg-[var(--color-charcoal)]/25"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
