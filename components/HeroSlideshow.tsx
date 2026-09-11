"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  image: string;
  alt: string;
  titleLines: string[];
  descLines: string[];
};

const AUTO_PLAY_MS = 4500;

export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goTo = (i: number) => setIndex(i);

  const Dots = () => (
    <div className="flex justify-center gap-1 bg-white pt-3">
      {slides.map((slide, i) => (
        <button
          key={slide.image}
          type="button"
          aria-label={`${i + 1}번째 이미지 보기`}
          onClick={() => goTo(i)}
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
  );

  return (
    <section>
      {/* 모바일 전용: 이미지를 화면 끝까지 꽉 채우고, 하단에 어두운 그라데이션 스크림을 깔아 그 위에 문구를 얹는 스타일 */}
      <div className="sm:hidden">
        <div className="relative h-[500px] w-full overflow-hidden">
          {slides.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.alt}
              aria-hidden={i !== index}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 from-0% via-black/25 via-45% to-transparent to-75%" />

          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-20">
            {/* 텍스트를 같은 자리에 겹쳐 쌓아서, 문구 길이가 달라도 높이가 흔들리지 않게 함 */}
            <div className="grid">
              {slides.map((slide, i) => (
                <div
                  key={slide.image}
                  aria-hidden={i !== index}
                  className={`col-start-1 row-start-1 transition-opacity duration-[1200ms] ease-in-out ${
                    i === index ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <h1 className="break-keep text-3xl font-semibold leading-tight text-white">
                    {slide.titleLines.map((line, li) => (
                      <span key={li}>
                        {line}
                        {li < slide.titleLines.length - 1 && <br />}
                      </span>
                    ))}
                  </h1>
                  <p className="mt-3 break-keep text-sm leading-relaxed text-white/85">
                    {slide.descLines.map((line, li) => (
                      <span key={li}>
                        {line}
                        {li < slide.descLines.length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 이미지 아래(문구와 분리된 자리)에 놓이는 점 인디케이터 */}
        <Dots />
      </div>

      {/* sm 이상(태블릿·PC): 이미지 위에 왼쪽 정렬 문구를 얹는 방식 */}
      <div className="hidden sm:block">
        <div className="relative w-full overflow-hidden sm:aspect-[1672/941] sm:max-h-[720px]">
          {slides.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.alt}
              aria-hidden={i !== index}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ivory)] from-10% via-[var(--color-ivory)]/70 via-30% to-transparent to-55%" />

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
              <div className="max-w-md">
                {/* 텍스트를 같은 자리에 겹쳐 쌓아서, 문구 길이가 달라도 높이가 흔들리지 않게 함 */}
                <div className="grid">
                  {slides.map((slide, i) => (
                    <div
                      key={slide.image}
                      aria-hidden={i !== index}
                      className={`col-start-1 row-start-1 transition-opacity duration-[1200ms] ease-in-out ${
                        i === index ? "opacity-100" : "pointer-events-none opacity-0"
                      }`}
                    >
                      <h1 className="break-keep text-3xl font-semibold leading-tight lg:text-4xl xl:text-5xl">
                        {slide.titleLines.map((line, li) => (
                          <span key={li}>
                            {line}
                            {li < slide.titleLines.length - 1 && <br />}
                          </span>
                        ))}
                      </h1>
                      <p className="mt-4 max-w-sm break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80 lg:text-lg">
                        {slide.descLines.map((line, li) => (
                          <span key={li}>
                            {line}
                            {li < slide.descLines.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-6">
                  <Link
                    href="/order"
                    className="rounded-full bg-[var(--color-sky)] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    포토북 제작 신청
                  </Link>
                  <a
                    href="#samples"
                    className="text-sm underline decoration-[var(--color-hairline)] underline-offset-4 hover:text-[var(--color-sky)]"
                  >
                    디자인 샘플 보기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 이미지 아래(모바일과 동일한 자리)에 놓이는 점 인디케이터 */}
        <Dots />
      </div>
    </section>
  );
}
