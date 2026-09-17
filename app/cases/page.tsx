"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";

const babyCovers = [
  { src: "/photobook/covers/baby-1.png", alt: "베이비 표지 예시 1" },
  { src: "/photobook/covers/baby-2.png", alt: "베이비 표지 예시 2" },
  { src: "/photobook/covers/baby-3.png", alt: "베이비 표지 예시 3" },
  { src: "/photobook/covers/baby-4.png", alt: "베이비 표지 예시 4" },
  { src: "/photobook/covers/baby-5.png", alt: "베이비 표지 예시 5" },
  { src: "/photobook/covers/baby-6.png", alt: "베이비 표지 예시 6" },
];

const travelCovers = [
  { src: "/photobook/covers/travel-1.png", alt: "여행·커플 표지 예시 1" },
  { src: "/photobook/covers/travel-2.png", alt: "여행·커플 표지 예시 2" },
  { src: "/photobook/covers/travel-3.png", alt: "여행·커플 표지 예시 3" },
  { src: "/photobook/covers/travel-4.png", alt: "여행·커플 표지 예시 4" },
  { src: "/photobook/covers/travel-5.png", alt: "여행·커플 표지 예시 5" },
  { src: "/photobook/covers/travel-6.png", alt: "여행·커플 표지 예시 6" },
  { src: "/photobook/covers/travel-7.png", alt: "여행·커플 표지 예시 7" },
  { src: "/photobook/covers/travel-8.png", alt: "여행·커플 표지 예시 8" },
  { src: "/photobook/covers/travel-9.png", alt: "여행·커플 표지 예시 9" },
  { src: "/photobook/covers/travel-10.png", alt: "여행·커플 표지 예시 10" },
  { src: "/photobook/covers/travel-11.png", alt: "여행·커플 표지 예시 11" },
  { src: "/photobook/covers/travel-12.png", alt: "여행·커플 표지 예시 12" },
];

const bigSpreadExamples = [
  { src: "/photobook/spreads-full/travel-collected-days.png", alt: "여행 포토북 전체 예시" },
  { src: "/photobook/spreads-full/baby-our-little-one.png", alt: "베이비 포토북 전체 예시" },
  { src: "/photobook/spreads-full/seaside-diary.png", alt: "여행 포토북 전체 예시 3" },
  { src: "/photobook/spreads-full/couple-our-kind-of-love.png", alt: "커플 포토북 전체 예시" },
  { src: "/photobook/spreads-full/pet-golden-days.png", alt: "반려견 포토북 전체 예시" },
  { src: "/photobook/spreads-full/family-autumn-story.png", alt: "가족 포토북 전체 예시 2" },
];

const spreadExamples = [
  { src: "/photobook/spreads/spread-1.png", alt: "내지 펼침 예시 1" },
  { src: "/photobook/spreads/spread-2.png", alt: "내지 펼침 예시 2" },
  { src: "/photobook/spreads/spread-3.png", alt: "내지 펼침 예시 3" },
  { src: "/photobook/spreads/spread-4.png", alt: "내지 펼침 예시 4" },
  { src: "/photobook/spreads/spread-5.png", alt: "내지 펼침 예시 5" },
  { src: "/photobook/spreads/spread-6.png", alt: "내지 펼침 예시 6" },
  { src: "/photobook/spreads/spread-7.png", alt: "내지 펼침 예시 7" },
  { src: "/photobook/spreads/spread-8.png", alt: "내지 펼침 예시 8" },
  { src: "/photobook/spreads/spread-9.png", alt: "내지 펼침 예시 9" },
  { src: "/photobook/spreads/spread-10.png", alt: "내지 펼침 예시 10" },
];

// "나만의 굿즈" 탭: 이미 제작해둔 굿즈 페이지의 제품 사진들을 상품별로 묶어서 보여줘요.
// id는 앵커 이동용 (예: #goods-mug), name은 화면에 보이는 상품명이에요.
const goodsCategories = [
  {
    id: "goods-mug",
    name: "머그컵·유리컵",
    images: [
      { src: "/goods/mug/main-1.jpg", alt: "머그컵·유리컵 예시 1" },
      { src: "/goods/mug/glossy-1.jpg", alt: "머그컵·유리컵 예시 2" },
      { src: "/goods/mug/ice-color-1.jpg", alt: "머그컵·유리컵 예시 3" },
      { src: "/goods/mug/beer-can-1.jpg", alt: "머그컵·유리컵 예시 4" },
    ],
  },
  {
    id: "goods-phone-case",
    name: "폰케이스",
    images: [
      { src: "/goods/phone-case/premium-1.jpg", alt: "폰케이스 예시 1" },
      { src: "/goods/phone-case/premium-2.jpg", alt: "폰케이스 예시 2" },
      { src: "/goods/phone-case/standard-blue.jpg", alt: "폰케이스 예시 3" },
      { src: "/goods/phone-case/standard-pink.jpg", alt: "폰케이스 예시 4" },
    ],
  },
  {
    id: "goods-tumbler",
    name: "텀블러",
    images: [
      { src: "/goods/tumbler/clip-black-1.jpg", alt: "클립진공 텀블러 예시 (블랙)" },
      { src: "/goods/tumbler/clip-ivory-1.jpg", alt: "클립진공 텀블러 예시 (아이보리)" },
      { src: "/goods/tumbler/etched-black-1.jpg", alt: "에치드 텀블러 예시 (블랙)" },
      { src: "/goods/tumbler/etched-purple-1.jpg", alt: "에치드 텀블러 예시 (퍼플)" },
    ],
  },
  {
    id: "goods-ecobag",
    name: "에코백",
    images: [
      { src: "/goods/ecobag/gallery-1.jpg", alt: "에코백 예시 1" },
      { src: "/goods/ecobag/gallery-2.jpg", alt: "에코백 예시 2" },
      { src: "/goods/ecobag/gallery-v-1.jpg", alt: "에코백 예시 3" },
      { src: "/goods/ecobag/gallery-v-2.jpg", alt: "에코백 예시 4" },
    ],
  },
  {
    id: "goods-calendar",
    name: "캘린더",
    images: [
      { src: "/goods/calendar/large-1.jpg", alt: "캘린더 예시 1" },
      { src: "/goods/calendar/small-1.jpg", alt: "캘린더 예시 2" },
      { src: "/goods/calendar/narrow-1.jpg", alt: "캘린더 예시 3" },
      { src: "/goods/calendar/wide-1.jpg", alt: "캘린더 예시 4" },
    ],
  },
  {
    id: "goods-fabric-poster",
    name: "패브릭 포스터",
    images: [
      { src: "/goods/fabric-poster/gallery-1.jpg", alt: "패브릭 포스터 예시 1" },
      { src: "/goods/fabric-poster/gallery-2.jpg", alt: "패브릭 포스터 예시 2" },
      { src: "/goods/fabric-poster/gallery-3.jpg", alt: "패브릭 포스터 예시 3" },
      { src: "/goods/fabric-poster/gallery-4.jpg", alt: "패브릭 포스터 예시 4" },
    ],
  },
];

type Tab = "photobook" | "frame" | "goods";
type LightboxImage = { src: string; alt: string };

// 그리드에 쓰는 썸네일 버튼 하나. 렌더 중에 새로 정의되는 컴포넌트가 아니라
// 모듈 최상단에 선언된 컴포넌트라서 각 그리드에서 그대로 재사용할 수 있어요.
function GridThumb({
  src,
  alt,
  onOpen,
  aspectSquare = true,
}: {
  src: string;
  alt: string;
  onOpen: (img: LightboxImage) => void;
  aspectSquare?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen({ src, alt })}
      aria-label={`${alt}, 크게 보기`}
      className={`group relative overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)] ${
        aspectSquare ? "aspect-square" : ""
      }`}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
        크게 보기
      </span>
    </button>
  );
}

export default function CasesPage() {
  const [tab, setTab] = useState<Tab>("photobook");
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 pt-2 sm:px-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-hairline)] p-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setTab("photobook")}
            className={`rounded-full px-4 py-2 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)] ${
              tab === "photobook"
                ? "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] text-white"
                : "text-[var(--color-charcoal)]/60"
            }`}
          >
            포토북
          </button>
          <button
            type="button"
            onClick={() => setTab("frame")}
            className={`rounded-full px-4 py-2 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)] ${
              tab === "frame"
                ? "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] text-white"
                : "text-[var(--color-charcoal)]/60"
            }`}
          >
            액자
          </button>
          <button
            type="button"
            onClick={() => setTab("goods")}
            className={`rounded-full px-4 py-2 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)] ${
              tab === "goods"
                ? "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] text-white"
                : "text-[var(--color-charcoal)]/60"
            }`}
          >
            나만의 굿즈
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">디자인 예시</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          {tab === "photobook" && (
            <>
              내 사진으로 완성할
              <br />
              포토북을 만나보세요
            </>
          )}
          {tab === "frame" && (
            <>
              좋아하는 순간을,
              <br />
              가장 가까운 곳에
            </>
          )}
          {tab === "goods" && (
            <>
              내 사진이 담기면,
              <br />
              이런 모습이에요
            </>
          )}
        </h1>
        {tab === "photobook" && (
          <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
            가족, 여행, 커플, 반려동물까지.
            <br />
            담고 싶은 이야기에 어울리는 디자인을 살펴보세요.
            <br />
            아래 이미지는 디자인 참고용 예시입니다.
          </p>
        )}
        {tab === "frame" && (
          <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
            액자 디자인 예시를 준비하고 있어요.
          </p>
        )}
        {tab === "goods" && (
          <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
            사진과 문구가 더해진 굿즈 디자인을 살펴보세요.
            <br />
            마음에 드는 상품을 골라 나만의 모습으로 꾸며보세요.
            <br />
            아래 이미지는 디자인 참고용 예시입니다.
            <br />
            실제 제품의 형태와 인쇄 가능 영역은 상품 상세에서 확인해주세요.
          </p>
        )}
      </section>

      {tab === "photobook" && (
        <>
          <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
            <h2 className="text-xl font-semibold">전체 미리보기</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bigSpreadExamples.map((img, i) => (
                <Reveal key={img.src} delay={(i % 3) * 80}>
                  <GridThumb src={img.src} alt={img.alt} onOpen={setLightbox} aspectSquare={false} />
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
            <h2 className="text-xl font-semibold">이야기별 포토북 디자인</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>

            <div className="mt-6">
              <p className="text-sm font-medium text-[var(--color-charcoal)]/70">아이의 하루, 성장 기록</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {babyCovers.map((img, i) => (
                  <Reveal key={img.src} delay={(i % 6) * 60}>
                    <GridThumb src={img.src} alt={img.alt} onOpen={setLightbox} />
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <p className="text-sm font-medium text-[var(--color-charcoal)]/70">여행, 커플, 가족의 순간</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {travelCovers.map((img, i) => (
                  <Reveal key={img.src} delay={(i % 6) * 60}>
                    <GridThumb src={img.src} alt={img.alt} onOpen={setLightbox} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
            <h2 className="text-xl font-semibold">내지 펼침 예시</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {spreadExamples.map((img, i) => (
                <Reveal key={img.src} delay={(i % 2) * 80}>
                  <GridThumb src={img.src} alt={img.alt} onOpen={setLightbox} aspectSquare={false} />
                </Reveal>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === "frame" && (
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <div className="rounded-xl border border-[var(--color-hairline)] bg-white px-6 py-16 text-center">
            <p className="break-keep text-sm text-[var(--color-charcoal)]/60">
              액자 디자인 예시를 준비하고 있어요.
            </p>
          </div>
        </section>
      )}

      {tab === "goods" && (
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <h2 className="break-keep text-xl font-semibold">상품별 디자인 예시</h2>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {goodsCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="rounded-full border border-[var(--color-hairline)] px-3 py-1.5 text-xs font-medium text-[var(--color-charcoal)]/70 transition hover:border-[var(--color-sky)] hover:text-[var(--color-sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
              >
                {category.name}
              </a>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-10">
            {goodsCategories.map((category) => (
              <div key={category.id} id={category.id} className="scroll-mt-24">
                <p className="text-sm font-medium">{category.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {category.images.map((img, i) => (
                    <Reveal key={img.src} delay={(i % 4) * 80}>
                      <GridThumb src={img.src} alt={img.alt} onOpen={setLightbox} />
                    </Reveal>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab !== "frame" && (
        <section className="mx-auto hidden max-w-6xl px-6 pb-16 sm:block sm:px-10">
          <Link
            href={tab === "photobook" ? "/options?product=포토북" : "/goods"}
            className="inline-block rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
          >
            {tab === "photobook" ? "포토북 만들기" : "굿즈 둘러보기"}
          </Link>
        </section>
      )}

      <SiteFooter />
      {tab === "frame" ? (
        <StickyOrderBar label="액자 둘러보기" href="/frames" desktopFloating />
      ) : (
        <StickyOrderBar
          label={tab === "photobook" ? "포토북 만들기" : "굿즈 둘러보기"}
          href={tab === "photobook" ? "/options?product=포토북" : "/goods"}
          desktopFloating
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="닫기"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
          <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}
