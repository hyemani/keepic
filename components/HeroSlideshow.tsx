"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type HeroSlide = {
  image: string;
  alt: string;
  titleLines: string[];
  descLines: string[];
};

export type HeroCta = {
  label: string;
  href: string;
};

// 여러 페이지에서 재사용할 때, 이미지가 바뀌어도 문구는 그대로 고정해두고 싶을 때 사용해요.
// (홈 화면처럼 이미지마다 다른 문구를 보여주고 싶다면 이 값을 안 넘기면 돼요.)
export type HeroFixedCaption = {
  eyebrow?: string;
  titleLines: string[];
  descLines: string[];
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;
};

const AUTO_PLAY_MS = 5000;
const SWIPE_THRESHOLD_PX = 40;

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

function PlayPauseIcon({ playing }: { playing: boolean }) {
  if (playing) {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export default function HeroSlideshow({
  slides,
  fixedCaption,
}: {
  slides: HeroSlide[];
  fixedCaption?: HeroFixedCaption;
}) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  const isPaused = !isPlaying || isHovering;

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length, isPaused]);

  const goTo = (i: number) => setIndex((i + slides.length) % slides.length);
  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  // 컨테이너 안(화살표, 재생/정지 버튼 등)에 키보드 포커스가 머무는 동안에도 자동 전환을 멈춰요.
  const handleFocus = () => setIsHovering(true);
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsHovering(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      if (delta < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const renderDots = () => (
    <div className="flex justify-center gap-0.5 bg-white pt-3 sm:gap-1">
      {slides.map((slide, i) => (
        <button
          key={slide.image}
          type="button"
          aria-label={`${i + 1}번째 이미지 보기`}
          aria-current={i === index}
          onClick={() => goTo(i)}
          className="p-1 sm:p-2.5"
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

  const renderArrows = () => (
    <>
      <button
        type="button"
        onClick={goPrev}
        aria-label="이전 이미지"
        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white sm:left-5 sm:h-11 sm:w-11"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        onClick={goNext}
        aria-label="다음 이미지"
        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white sm:right-5 sm:h-11 sm:w-11"
      >
        <ChevronIcon direction="right" />
      </button>
    </>
  );

  const renderPlayPauseButton = () => (
    <button
      type="button"
      onClick={() => setIsPlaying((p) => !p)}
      aria-label={isPlaying ? "슬라이드 자동 전환 멈추기" : "슬라이드 자동 전환 다시 시작"}
      aria-pressed={!isPlaying}
      className="absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white sm:bottom-4 sm:right-4"
    >
      <PlayPauseIcon playing={isPlaying} />
    </button>
  );

  return (
    <section
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={fixedCaption?.titleLines.join(" ") ?? "대표 이미지 슬라이드"}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* 모바일 전용: 이미지를 화면 끝까지 꽉 채우고, 하단에 어두운 그라데이션 스크림을 깔아 그 위에 문구를 얹는 스타일 */}
      <div className="sm:hidden">
        <div
          className="relative h-[500px] w-full overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={fixedCaption ? "" : slide.alt}
              aria-hidden={i !== index}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 from-0% via-black/25 via-45% to-transparent to-75%" />

          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-20">
            {fixedCaption ? (
              <div>
                {fixedCaption.eyebrow && (
                  <p className="text-xs font-medium text-white/80">{fixedCaption.eyebrow}</p>
                )}
                <h1 className="break-keep text-3xl font-semibold leading-tight text-white">
                  {fixedCaption.titleLines.map((line, li) => (
                    <span key={li}>
                      {line}
                      {li < fixedCaption.titleLines.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
                <p className="mt-3 break-keep text-sm leading-relaxed text-white/85">
                  {fixedCaption.descLines.map((line, li) => (
                    <span key={li}>
                      {line}
                      {li < fixedCaption.descLines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    href={fixedCaption.primaryCta.href}
                    className="rounded-full bg-[var(--color-sky)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    {fixedCaption.primaryCta.label}
                  </Link>
                  {fixedCaption.secondaryCta && (
                    <Link
                      href={fixedCaption.secondaryCta.href}
                      className="text-sm font-medium text-white underline underline-offset-4"
                    >
                      {fixedCaption.secondaryCta.label}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              // 텍스트를 같은 자리에 겹쳐 쌓아서, 문구 길이가 달라도 높이가 흔들리지 않게 함
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
            )}
          </div>

          {slides.length > 1 && renderArrows()}
          {slides.length > 1 && renderPlayPauseButton()}
        </div>

        {/* 이미지 아래(문구와 분리된 자리)에 놓이는 점 인디케이터 */}
        {slides.length > 1 && renderDots()}
      </div>

      {/* sm 이상(태블릿·PC): 이미지 위에 왼쪽 정렬 문구를 얹는 방식 */}
      <div className="hidden sm:block">
        <div className="relative w-full overflow-hidden sm:aspect-[1672/941] sm:max-h-[720px]">
          {slides.map((slide, i) => (
            <img
              key={slide.image}
              src={slide.image}
              alt={fixedCaption ? "" : slide.alt}
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
                {fixedCaption ? (
                  <div>
                    {fixedCaption.eyebrow && (
                      <p className="text-sm font-medium text-[var(--color-sky)]">
                        {fixedCaption.eyebrow}
                      </p>
                    )}
                    <h1 className="mt-2 break-keep text-3xl font-semibold leading-tight lg:text-4xl xl:text-5xl">
                      {fixedCaption.titleLines.map((line, li) => (
                        <span key={li}>
                          {line}
                          {li < fixedCaption.titleLines.length - 1 && <br />}
                        </span>
                      ))}
                    </h1>
                    <p className="mt-4 max-w-sm break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80 lg:text-lg">
                      {fixedCaption.descLines.map((line, li) => (
                        <span key={li}>
                          {line}
                          {li < fixedCaption.descLines.length - 1 && <br />}
                        </span>
                      ))}
                    </p>
                    <div className="mt-8 flex items-center gap-6">
                      <Link
                        href={fixedCaption.primaryCta.href}
                        className="bg-[var(--color-sky)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        {fixedCaption.primaryCta.label}
                      </Link>
                      {fixedCaption.secondaryCta && (
                        <Link
                          href={fixedCaption.secondaryCta.href}
                          className="text-sm underline decoration-[var(--color-hairline)] underline-offset-4 hover:text-[var(--color-sky)]"
                        >
                          {fixedCaption.secondaryCta.label}
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  // 텍스트를 같은 자리에 겹쳐 쌓아서, 문구 길이가 달라도 높이가 흔들리지 않게 함
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
                )}

                {!fixedCaption && (
                  <div className="mt-8 flex items-center gap-6">
                    <Link
                      href="/order"
                      className="bg-[var(--color-sky)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
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
                )}
              </div>
            </div>
          </div>

          {slides.length > 1 && renderArrows()}
          {slides.length > 1 && renderPlayPauseButton()}
        </div>

        {/* 이미지 아래(모바일과 동일한 자리)에 놓이는 점 인디케이터 */}
        {slides.length > 1 && renderDots()}
      </div>
    </section>
  );
}
