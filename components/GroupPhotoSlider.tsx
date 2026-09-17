"use client";

import { useRef, useState } from "react";

export type SliderImage = { src: string; alt: string };

// 디아섹 아크릴액자 마감별 카드 안에서 쓰는 작은 슬라이드예요.
// 카드 이미지 영역(aspect-[3/4]) 폭을 그대로 채우고, 좌우로 스와이프해서
// 여러 장을 넘겨볼 수 있어요. 화살표 없이 스와이프 + 하단 점으로만 넘겨요.
export default function GroupPhotoSlider({ images }: { images: SliderImage[] }) {
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
    }, 100);
  };

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-hairline)]/15">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img) => (
          <div key={img.src} className="h-full w-full shrink-0 snap-start">
            <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`${i + 1}번째 사진 보기`}
              aria-current={i === index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={`h-1.5 w-1.5 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
