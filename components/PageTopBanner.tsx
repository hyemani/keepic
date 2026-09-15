"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type PageTopBannerImage = { src: string; alt: string };

// 포토북/액자/나만의 굿즈 페이지가 공통으로 쓰는 상단 배너예요.
// 화면 가로폭 전체를 쓰는 슬라이더로, 가운데 배너 한 장이 온전히 보이고
// 양옆으로 이전·다음 배너가 화면 가장자리에서 일부만 보여요(이미지 자체를
// 잘라내는 게 아니라, 화면 밖으로 자연스럽게 가려지는 것뿐이에요).
// 낮고 가로로 긴 배너예요(첫 화면을 다 차지하지 않도록). 카드 안은 왼쪽
// 문구·오른쪽 제품 이미지로 나뉘고, 이미지는 억지로 늘리거나 위아래를
// 잘라내지 않고 원본 비율 그대로 축소해서 담아요(object-contain). 남는
// 자리는 카드 배경색으로 자연스럽게 채워져요.
const AUTO_PLAY_MS = 4500;
// PC/모바일에서 배너 카드의 고정 높이예요. 로고·메뉴(헤더) 영역은 이 카드
// 바깥(위쪽 여백)에 있어서, 헤더 때문에 카드 높이 자체가 커지지 않아요.
// 모바일 카드 높이는 Tailwind의 h-[13.5rem]로 직접 쓰고, PC 높이는 아래에서
// CSS 변수(--card-h-desktop)로 내려줘서 h-[var(--card-h-desktop)]가 참조해요.
const CARD_HEIGHT_DESKTOP = "20rem"; // 320px
// SiteHeader가 페이지 맨 위에서 투명하게 떠 있을 때(overlayHero), 배너가 그
// 헤더에 가리지 않도록 아래 JSX에서 헤더 높이만큼 위쪽 여백(margin-top)을 줘요.
// 이미지 자체를 위로 당기거나 확대하지 않고, 헤더 뒤로는 페이지 배경색(아이보리)이
// 그대로 비쳐 보여요.

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
  // true면 투명한 SiteHeader(overlayHero) 아래로 배너가 겹치지 않을 만큼
  // 위쪽 여백을 확보해요. 헤더 뒤로는 이미지가 아니라 페이지 배경색이 보여요.
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
          ? "relative mt-16 w-full overflow-hidden py-3 sm:mt-28 sm:py-4"
          : "relative w-full overflow-hidden py-3 sm:py-4"
      }
    >
      {/* 카드 너비(--banner-card-w)와 좌우 여백을 같은 계산식에서 끌어와요.
          그래서 화면이 아무리 넓어져서 카드가 최대 너비(1100px)에서 멈추더라도,
          "카드 폭 + 여백"이 항상 화면 전체 폭과 정확히 맞아떨어져서 가운데 배너가
          어느 화면 크기에서도, 첫 번째·마지막 슬라이드에서도 정중앙에 와요. */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        style={
          {
            paddingLeft: "calc((100% - var(--banner-card-w)) / 2)",
            paddingRight: "calc((100% - var(--banner-card-w)) / 2)",
            ["--card-h-desktop" as string]: CARD_HEIGHT_DESKTOP,
          } as CSSProperties
        }
        className="flex [--banner-card-w:min(900px,84vw)] snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] sm:[--banner-card-w:min(1100px,76vw)] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div
            key={img.src}
            style={{ width: "var(--banner-card-w)" }}
            className="relative flex h-[13.5rem] shrink-0 snap-center items-stretch overflow-hidden rounded-2xl bg-[var(--color-hairline)]/12 sm:h-[var(--card-h-desktop)]"
          >
            {/* 문구는 현재 가운데(선택된) 배너에만, 왼쪽에 보여요. 양옆에 살짝
                보이는 배너는 이미지만 보여줘서 화면이 복잡해 보이지 않게 해요. */}
            {i === index && (
              <div className="flex w-[42%] shrink-0 flex-col justify-center px-4 sm:w-[36%] sm:px-8">
                {eyebrow && (
                  <p className="text-xs font-medium text-[var(--color-charcoal)]/70 sm:text-sm">
                    {eyebrow}
                  </p>
                )}
                <h1 className="mt-1 break-keep text-base font-semibold leading-tight text-[var(--color-charcoal)] sm:text-2xl lg:text-3xl">
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
            )}
            {/* 제품 이미지: 억지로 늘리거나 위아래를 잘라내지 않고(object-contain),
                원본 비율 그대로 축소해서 전체가 보이도록 해요. 남는 자리는
                카드 배경색이 자연스럽게 채워줘요. */}
            <div className="relative h-full flex-1">
              <img
                src={img.src}
                alt={img.alt}
                className="h-full w-full object-contain"
              />
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
