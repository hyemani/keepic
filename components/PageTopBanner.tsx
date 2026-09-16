"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

export type PageTopBannerImage = { src: string; alt: string };

// 포토북/액자/나만의 굿즈 페이지가 공통으로 쓰는 상단 배너예요.
// 화면 가로폭 전체를 쓰는 슬라이더로, 가운데 배너 한 장이 크게 보이고
// 양옆으로 이전·다음 배너가 살짝만 보여요(화면 밖으로 자연스럽게 가려짐).
// 카드는 낮고 가로로 넓은 비율이고, 이미지가 카드 전체를 채우는 배경이
// 돼요(object-cover). 문구는 그 위, 이미지의 왼쪽 빈 공간에 바로 얹혀요.
const AUTO_PLAY_MS = 4500;
// PC/모바일에서 배너 카드의 고정 높이예요. 로고·메뉴(헤더) 영역은 이 카드
// 바깥(위쪽 여백)에 있어서, 헤더 때문에 카드 높이 자체가 커지지 않아요.
// 모바일 카드 높이는 Tailwind의 h-[8rem]로 직접 쓰고, PC 높이는 아래에서
// CSS 변수(--card-h-desktop)로 내려줘서 h-[var(--card-h-desktop)]가 참조해요.
const CARD_HEIGHT_DESKTOP = "14rem"; // 224px
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
  // 화면에 보여주는 실제 슬라이드 수예요(문구·점 표시·카운터는 전부 이 값 기준).
  const count = images.length;
  // 끊김 없이 빙글빙글 도는 것처럼 보이게 하려고, 배열 맨 앞엔 "마지막 이미지"를,
  // 맨 뒤엔 "첫 이미지"를 복제해서 붙여요. 그래서 실제로는 항상 진짜 이미지들
  // 사이를 오가지만, 화면상으로는 끝에서 다음으로 자연스럽게 계속 이어져요.
  const displayImages = useMemo(() => {
    if (count <= 1) return images;
    return [images[count - 1], ...images, images[0]];
  }, [images, count]);
  // displayIndex: displayImages 안에서의 위치(0 = 복제된 마지막 장, count+1 = 복제된 첫 장).
  // index: 화면에 보여줄 "진짜" 슬라이드 번호(문구·점 표시·카운터용).
  const [index, setIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(count > 1 ? 1 : 0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 복제된 끝 슬라이드에서 진짜 슬라이드로 "티 안 나게" 되돌리는 순간에만 잠깐
  // true로 켜둬요. 이 값이 true인 동안 발생하는 scroll 이벤트는 우리가 직접
  // 만든 보정 이동일 뿐이라 무시해요(그 외의 모든 스크롤은 사용자든 자동재생
  // 이든 똑같이 처리해서, 기기마다 다른 스크롤 애니메이션 속도에도 안전해요).
  const isCorrectingRef = useRef(false);
  // index state는 비동기라서, 클릭을 연달아 눌렀을 때 최신 값을 바로 읽으려고
  // ref에도 같은 값을 항상 같이 저장해둬요. displayIndexRef는 복제본을 포함한
  // 실제 스크롤 위치, indexRef는 그걸 진짜 슬라이드 번호로 환산한 값이에요.
  const displayIndexRef = useRef(count > 1 ? 1 : 0);
  const indexRef = useRef(0);

  const toRealIndex = (di: number) => {
    if (count <= 1) return 0;
    // displayImages[0]은 "복제된 마지막 장"이라 실제 인덱스로는 count-1,
    // displayImages[count+1]은 "복제된 첫 장"이라 실제 인덱스로는 0이에요.
    return ((di - 1) % count + count) % count;
  };

  // 카드의 실시간 화면상 위치(getBoundingClientRect)를 기준으로 얼마나
  // 스크롤해야 그 카드가 컨테이너 정중앙에 오는지 계산해요. offsetLeft는
  // 부모 요소의 position 값에 따라 기준점이 달라질 수 있어 오차가 생기기
  // 쉬운데, 이 방식은 실제 화면 좌표라서 항상 정확해요.
  const centerOnChild = (el: HTMLDivElement, di: number, behavior: ScrollBehavior) => {
    const card = el.children[di] as HTMLElement | undefined;
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta = cardRect.left + cardRect.width / 2 - (elRect.left + elRect.width / 2);
    el.scrollBy({ left: delta, behavior });
  };

  // 복제된 끝 슬라이드(맨 앞/맨 뒤)에 도착했을 때, 애니메이션 없이 진짜
  // 슬라이드로 조용히 되돌려요. 두 이미지가 완전히 같은 사진이라 화면상으론
  // 계속 같은 방향으로 이어지는 것처럼 보여요.
  const silentlyCorrectBoundary = (di: number) => {
    const el = scrollerRef.current;
    if (!el || count <= 1) return;
    if (di !== 0 && di !== count + 1) return;
    const target = di === 0 ? count : 1;
    isCorrectingRef.current = true;
    displayIndexRef.current = target;
    setDisplayIndex(target);
    indexRef.current = toRealIndex(target);
    setIndex(indexRef.current);
    centerOnChild(el, target, "instant");
    // scroll 이벤트가 비동기로 들어올 수 있어서, 최소 한 프레임은 더 기다렸다가
    // 플래그를 내려요(너무 빨리 내리면 이 보정 자체가 진짜 스크롤로 오인될 수 있어요).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isCorrectingRef.current = false;
      });
    });
  };

  const goToDisplayIndex = (di: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    displayIndexRef.current = di;
    setDisplayIndex(di);
    const real = toRealIndex(di);
    indexRef.current = real;
    setIndex(real);
    if (!el) return;
    centerOnChild(el, di, behavior);
  };

  const goPrev = () => goToDisplayIndex(displayIndexRef.current - 1);
  const goNext = () => goToDisplayIndex(displayIndexRef.current + 1);

  // 처음 화면에 나타날 때, 복제된 마지막 장이 아니라 진짜 첫 장이 가운데 오도록
  // 애니메이션 없이 미리 위치를 맞춰둬요(그래서 왼쪽엔 자연스럽게 마지막 장이
  // 살짝 보여요). useLayoutEffect라서 화면에 그려지기 전에 처리돼요.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || count <= 1) return;
    centerOnChild(el, 1, "instant");
  }, [count]);

  // 자동 재생: 일정 시간마다 다음 배너로 넘어가요. 드래그 중이거나 정지 버튼을
  // 눌렀을 때는 멈춰요.
  useEffect(() => {
    if (count <= 1 || !isPlaying || isInteracting) return;
    const timer = setInterval(() => {
      goToDisplayIndex(displayIndexRef.current + 1);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, isPlaying, isInteracting]);

  // 스크롤이 멈추면(사람이 스와이프했든, 화살표·자동재생으로 우리가 코드로
  // 옮겼든 똑같이) 가장 가까운 슬라이드를 찾아 index를 맞추고, 필요하면 복제된
  // 끝 슬라이드를 진짜 슬라이드로 조용히 되돌려요. "스크롤이 실제로 멈췄는지"를
  // 정해진 시간(예: 600ms)으로 미리 추측하지 않고, 매 scroll 이벤트마다 이
  // 디바운스를 다시 걸어서 실제로 멈춘 시점을 그대로 따라가요. 예전에는 애니메이션
  // 소요 시간을 고정값으로 가정했는데, 모바일처럼 애니메이션이 더 오래 걸리는
  // 기기에서는 그 가정이 어긋나서 아직 움직이는 도중에 되돌림이 겹쳐 걸리며
  // 이미지가 매우 빠르게 튀는 문제가 있었어요.
  const handleScroll = () => {
    if (isCorrectingRef.current) return;
    setIsInteracting(true);
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsInteracting(false);
      if (isCorrectingRef.current) return;
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
      displayIndexRef.current = closest;
      setDisplayIndex(closest);
      indexRef.current = toRealIndex(closest);
      setIndex(indexRef.current);
      silentlyCorrectBoundary(closest);
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
        className="flex [--banner-card-w:min(960px,92vw)] snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] sm:[--banner-card-w:min(1300px,86vw)] [&::-webkit-scrollbar]:hidden"
      >
        {displayImages.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            style={{ width: "var(--banner-card-w)" }}
            className="relative h-[8rem] shrink-0 snap-center overflow-hidden rounded-2xl bg-[var(--color-hairline)]/15 sm:h-[var(--card-h-desktop)]"
          >
            {/* 이미지가 카드 전체를 꽉 채우는 배경이 돼요(늘어나지 않게
                object-cover). 문구는 그 위, 지금 정중앙에 있는 배너에만
                왼쪽 여백 자리에 올라가요. 양옆에 살짝 보이는 배너(복제된
                것 포함)는 이미지만 보여줘서 화면이 복잡해 보이지 않게 해요. */}
            {/* 모바일에서만 사진을 살짝 확대해서(카드 크기는 그대로) 상품이 더
                크게 보이도록 해요. PC는 확대 없이 원래 그대로예요. */}
            <img
              src={img.src}
              alt={img.alt}
              className="absolute inset-0 h-full w-full scale-125 object-cover sm:scale-100"
            />
            {i === displayIndex && (
              <div className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center px-4 sm:max-w-[45%] sm:px-9">
                {eyebrow && (
                  <p className="text-sm font-medium text-[var(--color-charcoal)]/70 sm:text-base">
                    {eyebrow}
                  </p>
                )}
                <h1 className="mt-1 break-keep text-xl font-semibold leading-tight text-[var(--color-charcoal)] sm:text-3xl lg:text-4xl">
                  {titleLines.map((line, li) => (
                    <span key={li}>
                      {line}
                      {li < titleLines.length - 1 && <br />}
                    </span>
                  ))}
                </h1>
                <p className="mt-2 hidden break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/60 sm:block sm:text-base">
                  {descLines.map((line, li) => (
                    <span key={li}>
                      {line}
                      {li < descLines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
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

      {count > 1 && (
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
