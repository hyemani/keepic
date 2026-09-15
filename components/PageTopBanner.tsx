"use client";

import { useEffect, useRef, useState } from "react";

export type PageTopBannerImage = { src: string; alt: string };

// 포토북/액자/나만의 굿즈 페이지가 공통으로 쓰는 상단 배너예요.
// 화면 가로폭 전체를 쓰는 슬라이더로, 가운데 배너 한 장이 온전히 보이고
// 양옆으로 이전·다음 배너가 화면 가장자리에서 일부만 보여요(이미지 자체를
// 잘라내는 게 아니라, 화면 밖으로 자연스럽게 가려지는 것뿐이에요).
// 문구는 각 배너 이미지 안, 왼쪽 여백 위에 함께 얹혀서 같이 움직여요.
const AUTO_PLAY_MS = 4500;
// 실제 배너 이미지 원본 비율(1983 x 793)에 맞춰서, 세로가 억지로 눌리거나
// 위아래가 잘리지 않도록 해요.
const IMAGE_ASPECT = "1983 / 793";
// SiteHeader가 이미지 위에 투명하게 겹쳐질 때(overlayHero) 배너 콘텐츠가 가려지지
// 않도록, 아래 JSX에서 pt-16/sm:pt-28로 헤더 높이만큼 띄워줘요.

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
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
      <path d="M7 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

export default function PageTopBanner({
  images,
  eyebrow,
  titleLines,
  descLines,
  extendBehindHeader = false,
}: {
  images: PageTopBannerImage[];
  eyebrow?: string;
  titleLines: string[];
  descLines: string[];
  // true면 배경 이미지가 페이지 맨 위, 즉 투명한 SiteHeader(overlayHero) 뒤까지
  // 이어져 보여요. 실제 배너(캐러셀) 자체의 위치는 그대로 헤더 아래에 있어요.
  extendBehindHeader?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 화살표 클릭이나 자동재생처럼 우리가 직접 스크롤을 옮길 때는 true로 켜둬요.
  // 이 값이 true인 동안은 스크롤 중에 발생하는 scroll 이벤트(애니메이션 도중의
  // 중간 위치)를 보고 index를 잘못 되돌리는 걸 막아줘요.
  const programmaticRef = useRef(false);
  const programmaticTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // index state는 비동기라서, 클릭을 연달아 눌렀을 때 최신 값을 바로 읽으려고
  // ref에도 같은 값을 항상 같이 저장해둬요.
  const indexRef = useRef(0);

  // 카드의 실시간 화면상 위치(getBoundingClientRect)를 기준으로 얼마나
  // 스크롤해야 그 카드가 컨테이너 정중앙에 오는지 계산해요. offsetLeft는
  // 부모 요소의 position 값에 따라 기준점이 달라질 수 있어 오차가 생기기
  // 쉬운데, 이 방식은 실제 화면 좌표라서 항상 정확해요.
  const centerOn = (el: HTMLDivElement, card: HTMLElement, behavior: ScrollBehavior) => {
    programmaticRef.current = true;
    if (programmaticTimeout.current) clearTimeout(programmaticTimeout.current);
    // smooth 스크롤 애니메이션이 끝날 시간(넉넉하게)만큼 지난 뒤에만 다시
    // 손으로 스와이프한 스크롤을 인식하도록 풀어줘요.
    programmaticTimeout.current = setTimeout(() => {
      programmaticRef.current = false;
    }, 600);
    const cardRect = card.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = cardRect.left + cardRect.width / 2 - (elRect.left + elRect.width / 2);
    el.scrollBy({ left: delta, behavior });
  };

  const goToIndex = (i: number) => {
    const el = scrollerRef.current;
    indexRef.current = i;
    setIndex(i);
    if (!el) return;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) centerOn(el, card, "smooth");
  };

  const goPrev = () => goToIndex((indexRef.current - 1 + images.length) % images.length);
  const goNext = () => goToIndex((indexRef.current + 1) % images.length);

  // 자동 재생: 일정 시간마다 다음 배너로 넘어가요. 드래그 중이거나 정지 버튼을
  // 눌렀을 때는 멈춰요.
  useEffect(() => {
    if (images.length <= 1 || !isPlaying || isInteracting) return;
    const timer = setInterval(() => {
      goToIndex((indexRef.current + 1) % images.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, isPlaying, isInteracting]);

  // 손으로 직접 드래그·스와이프해서 넘겼을 때도 점 인디케이터가 맞게 바뀌도록,
  // 스크롤이 멈추면 가장 가까운 슬라이드를 찾아 index를 맞춰줘요. 단, 화살표
  // 클릭·자동재생으로 우리가 직접 스크롤을 옮기는 중(programmaticRef)에는
  // 애니메이션 도중의 중간 위치를 잘못 읽지 않도록 건너뛰어요.
  const handleScroll = () => {
    if (programmaticRef.current) return;
    setIsInteracting(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsInteracting(false);
      if (programmaticRef.current) return;
      const el = scrollerRef.current;
      if (!el) return;
      const elRect = el.getBoundingClientRect();
      const containerCenter = elRect.left + elRect.width / 2;
      let closest = 0;
      let closestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const r = (child as HTMLElement).getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      indexRef.current = closest;
      setIndex(closest);
    }, 150);
  };

  return (
    <section
      className={
        extendBehindHeader
          ? "relative -mt-16 w-full overflow-hidden pt-16 sm:-mt-28 sm:pt-28"
          : "relative w-full overflow-hidden py-3 sm:py-4"
      }
    >
      {/* 배경 이미지를 페이지 맨 위까지 흐리게 확장해서, 투명한 헤더(로고·메뉴) 뒤로
          대표 이미지가 자연스럽게 이어져 보이게 해요. 실제 캐러셀 내용은 그 아래,
          헤더에 가리지 않는 위치에 그대로 있어요. */}
      {extendBehindHeader && (
        <>
          <div className="absolute inset-0 -z-10" aria-hidden="true">
            <img
              src={images[index]?.src}
              alt=""
              className="h-full w-full scale-110 object-cover object-top opacity-80 blur-md"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-white/85 via-white/40 to-transparent sm:h-36"
            aria-hidden="true"
          />
        </>
      )}

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[8vw] [-ms-overflow-style:none] [scrollbar-width:none] sm:px-[12vw] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img) => (
          <div
            key={img.src}
            className="relative w-[84vw] max-w-[1100px] shrink-0 snap-center overflow-hidden rounded-2xl bg-[var(--color-hairline)]/15 sm:w-[76vw]"
          >
            <img
              src={img.src}
              alt={img.alt}
              style={{ aspectRatio: IMAGE_ASPECT }}
              className="w-full object-cover"
            />
            {/* 문구는 이 배너 이미지 자신의 왼쪽 여백 위에 함께 얹혀서, 창 너비·확대,
                슬라이드 이동과 상관없이 항상 이 이미지와 같은 위치를 유지해요. */}
            <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center px-5 py-4 sm:max-w-[55%] sm:px-9">
              {eyebrow && (
                <p className="text-xs font-medium text-[var(--color-charcoal)]/70 sm:text-sm">
                  {eyebrow}
                </p>
              )}
              <h1 className="mt-1 break-keep text-lg font-semibold leading-tight text-[var(--color-charcoal)] sm:text-2xl lg:text-3xl">
                {titleLines.map((line, li) => (
                  <span key={li}>
                    {line}
                    {li < titleLines.length - 1 && <br />}
                  </span>
                ))}
              </h1>
              <p className="mt-2 hidden break-keep text-xs leading-relaxed text-[var(--color-charcoal)]/60 sm:block sm:text-sm">
                {descLines.map((line, li) => (
                  <span key={li}>
                    {line}
                    {li < descLines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 배너"
            className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white sm:flex sm:left-4"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 배너"
            className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)] transition hover:bg-white sm:flex sm:right-4"
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-3 text-xs text-[var(--color-charcoal)]/60">
          <button type="button" onClick={goPrev} aria-label="이전 배너" className="p-2 sm:hidden">
            <ChevronIcon direction="left" />
          </button>
          <span className="tabular-nums">
            {index + 1} / {images.length}
          </span>
          <button type="button" onClick={goNext} aria-label="다음 배너" className="p-2 sm:hidden">
            <ChevronIcon direction="right" />
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "슬라이드 자동 전환 멈추기" : "슬라이드 자동 전환 다시 시작"}
            aria-pressed={!isPlaying}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-hairline)] transition hover:border-[var(--color-sky)] hover:text-[var(--color-sky)]"
          >
            <PlayPauseIcon playing={isPlaying} />
          </button>
        </div>
      )}
    </section>
  );
}
