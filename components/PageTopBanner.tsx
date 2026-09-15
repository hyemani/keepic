"use client";

import { useEffect, useState } from "react";

export type PageTopBannerImage = { src: string; alt: string };

// 포토북/액자/나만의 굿즈 페이지가 공통으로 쓰는 낮은 상단 배너예요.
// 화면을 다 차지하지 않고, 배경 이미지가 몇 장씩 자동으로 바뀌면서
// 바로 아래 목록 첫 줄이 함께 보이도록 만들었어요.
const AUTO_PLAY_MS = 4000;

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
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <section className="relative h-44 w-full overflow-hidden sm:h-56">
      {images.map((img, i) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ivory)] from-20% via-[var(--color-ivory)]/70 via-45% to-transparent to-80%" />
      <div className="relative flex h-full items-center">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
          {eyebrow && (
            <p className="text-xs font-medium text-[var(--color-sky)] sm:text-sm">{eyebrow}</p>
          )}
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {titleLines.map((line, li) => (
              <span key={li}>
                {line}
                {li < titleLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="mt-2 max-w-xs break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/75 sm:max-w-sm sm:text-base">
            {descLines.map((line, li) => (
              <span key={li}>
                {line}
                {li < descLines.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}
