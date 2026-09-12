"use client";

import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

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
const goodsCategories = [
  {
    name: "머그",
    images: [
      { src: "/goods/mug/main-1.jpg", alt: "머그 예시 1" },
      { src: "/goods/mug/glossy-1.jpg", alt: "머그 예시 2" },
      { src: "/goods/mug/ice-color-1.jpg", alt: "머그 예시 3" },
      { src: "/goods/mug/beer-can-1.jpg", alt: "머그 예시 4" },
    ],
  },
  {
    name: "폰케이스",
    images: [
      { src: "/goods/phone-case/premium-1.jpg", alt: "폰케이스 예시 1" },
      { src: "/goods/phone-case/premium-2.jpg", alt: "폰케이스 예시 2" },
      { src: "/goods/phone-case/standard-blue.jpg", alt: "폰케이스 예시 3" },
      { src: "/goods/phone-case/standard-pink.jpg", alt: "폰케이스 예시 4" },
    ],
  },
  {
    name: "텀블러",
    images: [
      { src: "/goods/tumbler/clip-black-1.jpg", alt: "클립진공 텀블러 예시 (블랙)" },
      { src: "/goods/tumbler/clip-ivory-1.jpg", alt: "클립진공 텀블러 예시 (아이보리)" },
      { src: "/goods/tumbler/etched-black-1.jpg", alt: "에치드 텀블러 예시 (블랙)" },
      { src: "/goods/tumbler/etched-purple-1.jpg", alt: "에치드 텀블러 예시 (퍼플)" },
    ],
  },
  {
    name: "에코백",
    images: [
      { src: "/goods/ecobag/gallery-1.jpg", alt: "에코백 예시 1" },
      { src: "/goods/ecobag/gallery-2.jpg", alt: "에코백 예시 2" },
      { src: "/goods/ecobag/gallery-v-1.jpg", alt: "에코백 예시 3" },
      { src: "/goods/ecobag/gallery-v-2.jpg", alt: "에코백 예시 4" },
    ],
  },
  {
    name: "캘린더",
    images: [
      { src: "/goods/calendar/large-1.jpg", alt: "캘린더 예시 1" },
      { src: "/goods/calendar/small-1.jpg", alt: "캘린더 예시 2" },
      { src: "/goods/calendar/narrow-1.jpg", alt: "캘린더 예시 3" },
      { src: "/goods/calendar/wide-1.jpg", alt: "캘린더 예시 4" },
    ],
  },
  {
    name: "패브릭 포스터",
    images: [
      { src: "/goods/fabric-poster/gallery-1.jpg", alt: "패브릭 포스터 예시 1" },
      { src: "/goods/fabric-poster/gallery-2.jpg", alt: "패브릭 포스터 예시 2" },
      { src: "/goods/fabric-poster/gallery-3.jpg", alt: "패브릭 포스터 예시 3" },
      { src: "/goods/fabric-poster/gallery-4.jpg", alt: "패브릭 포스터 예시 4" },
    ],
  },
];

type Tab = "photobook" | "goods";

export default function CasesPage() {
  const [tab, setTab] = useState<Tab>("photobook");

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 pt-2 sm:px-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-hairline)] p-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setTab("photobook")}
            className={`rounded-full px-4 py-2 font-medium transition ${
              tab === "photobook"
                ? "bg-[var(--color-sky)] text-white"
                : "text-[var(--color-charcoal)]/60"
            }`}
          >
            포토북
          </button>
          <span className="cursor-not-allowed rounded-full px-4 py-2 text-[var(--color-charcoal)]/35">
            액자 (준비중)
          </span>
          <button
            type="button"
            onClick={() => setTab("goods")}
            className={`rounded-full px-4 py-2 font-medium transition ${
              tab === "goods"
                ? "bg-[var(--color-sky)] text-white"
                : "text-[var(--color-charcoal)]/60"
            }`}
          >
            나만의 굿즈
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">디자인 샘플</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          {tab === "photobook" ? (
            <>
              이런 느낌으로
              <br />
              만들어드려요
            </>
          ) : (
            <>
              사진 한 장으로 만드는
              <br />
              나만의 굿즈
            </>
          )}
        </h1>
        {tab === "photobook" ? (
          <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
            아래 이미지는 실제 고객님의 사진이 아닌,
            <br />
            Keepic이 준비한 디자인 예시예요.
            <br />
            아이의 하루를 담은 앨범부터 여행·커플 사진까지,
            <br />
            다양한 주제로 제작할 수 있어요.
          </p>
        ) : (
          <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
            머그, 폰케이스, 텀블러, 에코백, 캘린더, 패브릭 포스터까지
            <br />
            좋아하는 사진으로 만들 수 있는 다양한 굿즈예요.
            <br />
            아래 이미지는 실제 제작된 제품 사진이며,
            <br />
            고객님의 사진으로도 이렇게 만들어드려요.
          </p>
        )}
      </section>

      {tab === "photobook" ? (
        <>
          <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
            <h2 className="text-xl font-semibold">한 권에 담아낸 소중한 순간들</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bigSpreadExamples.map((img) => (
                <div key={img.src} className="overflow-hidden rounded-xl">
                  <img src={img.src} alt={img.alt} className="w-full object-cover" />
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
            <h2 className="text-xl font-semibold">아이의 하루, 성장 기록</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {babyCovers.map((img) => (
                <div key={img.src} className="aspect-square overflow-hidden rounded-xl">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
            <h2 className="text-xl font-semibold">여행, 커플, 가족의 순간</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {travelCovers.map((img) => (
                <div key={img.src} className="aspect-square overflow-hidden rounded-xl">
                  <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
            <h2 className="text-xl font-semibold">내지 펼침 예시</h2>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {spreadExamples.map((img) => (
                <div key={img.src} className="overflow-hidden rounded-xl">
                  <img src={img.src} alt={img.alt} className="w-full object-cover" />
                </div>
              ))}
            </div>

          </section>
        </>
      ) : (
        <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
          <h2 className="break-keep text-xl font-semibold">나만의 굿즈, 이렇게 만들어드려요</h2>
          <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">제품 예시</p>

          <div className="mt-8 flex flex-col gap-10">
            {goodsCategories.map((category) => (
              <div key={category.name}>
                <p className="text-sm font-medium">{category.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {category.images.map((img) => (
                    <div
                      key={img.src}
                      className="aspect-square overflow-hidden rounded-xl"
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </section>
      )}

      <section className="mx-auto hidden max-w-6xl px-6 pb-16 sm:block sm:px-10">
        <Link
          href={tab === "photobook" ? "/options?product=포토북" : "/goods"}
          className="inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          {tab === "photobook" ? "추억을 한 권에 담기" : "추억을 일상에 담기"}
        </Link>
      </section>

      <SiteFooter />
      <StickyOrderBar
        label={tab === "photobook" ? "추억을 한 권에 담기" : "추억을 일상에 담기"}
        href={tab === "photobook" ? "/options?product=포토북" : "/goods"}
      />
    </main>
  );
}
