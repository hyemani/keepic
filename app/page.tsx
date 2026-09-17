import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { Fragment } from "react";
import SampleSpreadCarousel from "@/components/SampleSpreadCarousel";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";
import ProductGrid, { type ProductGridItem } from "@/components/ProductGrid";
import { photobookBasePrice, photobookCovers } from "@/lib/photobookPricing";
import { diasecFrameSizes, DIASEC_PRODUCT_NAME } from "@/lib/diasecFrameModels";
import { mugTypes } from "@/lib/mugModels";
import { tumblerTypes } from "@/lib/tumblerModels";
import { ECOBAG_BASE_PRICE } from "@/lib/ecobagModels";
import { calendarShapes } from "@/lib/calendarModels";
import { caseTypes } from "@/lib/phoneCaseModels";
import { fabricPosterSizes, fabricPosterFabrics } from "@/lib/fabricPosterModels";

// 홈 화면 맨 위, 예전의 큰 히어로 슬라이드 대신 쓰는 작은 프로모션 배너예요.
const promoBanner = {
  image: "/hero/keepic-hero-2.png",
  alt: "테이블 위에 펼쳐진 Keepic 포토북",
  titleLines: ["사진 속 순간을,", "한 권의 추억으로"],
};

// 시작가는 각 상품의 실제 가격 데이터(lib/*)에서 가장 저렴한 조합을 그대로 계산해요.
// 숫자를 직접 적어두면 나중에 가격이 바뀔 때 여기가 따로 안 맞을 수 있어서,
// 항상 원본 가격표를 기준으로 최솟값을 구해요.
const photobookMinPriceByCover = {
  soft: Math.min(...Object.values(photobookBasePrice.soft)),
  hard: Math.min(...Object.values(photobookBasePrice.hard)),
};
const diasecMinPrice = Math.min(...diasecFrameSizes.map((s) => s.price));
const mugMinPrice = Math.min(...mugTypes.map((t) => t.price));
const tumblerMinPrice = Math.min(...tumblerTypes.map((t) => t.price));
const calendarMinPrice = Math.min(
  ...calendarShapes.flatMap((s) => Object.values(s.prices))
);
const phoneCaseMinPrice = Math.min(
  ...caseTypes.flatMap((t) => t.materials.map((m) => m.price))
);
const fabricPosterMinPrice =
  Math.min(...fabricPosterSizes.map((s) => s.price)) +
  Math.min(...fabricPosterFabrics.map((f) => f.priceDelta));

const photobookCoverBadgeEn: Record<string, string> = {
  soft: "Soft cover",
  hard: "Hard cover",
};

const productGridItems: ProductGridItem[] = [
  ...photobookCovers.map((cover) => ({
    id: `photobook-${cover.id}`,
    category: "포토북" as const,
    name: "포토북",
    desc: "소중한 사진을 한 권의 책으로",
    image: "/hero/top-banner/photobook-1.png",
    priceFrom: photobookMinPriceByCover[cover.id],
    href: `/options?product=${encodeURIComponent("포토북")}&cover=${cover.id}`,
    badge: photobookCoverBadgeEn[cover.id],
  })),
  {
    id: "frame",
    category: "액자",
    name: "액자",
    desc: "원목·화이트·아크릴 등 다양한 스타일",
    image: "/frames/frame-wood.jpg",
    priceNote: "다양한 사이즈로 제작",
    href: "/frames",
  },
  {
    id: "diasec-frame",
    category: "액자",
    name: DIASEC_PRODUCT_NAME,
    desc: "탁상용·벽걸이, 유광·무반사·자작나무",
    image: "/frames/diasec/desk-glossy-1.jpg",
    priceFrom: diasecMinPrice,
    href: `/options?product=${encodeURIComponent(DIASEC_PRODUCT_NAME)}`,
    badge: "NEW",
  },
  {
    id: "mug",
    category: "나만의 굿즈",
    name: "머그컵·유리컵",
    desc: "매일 쓰는 컵에 담는 사진",
    image: "/goods/mug/main-1.jpg",
    priceFrom: mugMinPrice,
    href: "/goods/mug",
  },
  {
    id: "phone-case",
    category: "나만의 굿즈",
    name: "폰케이스",
    desc: "늘 손에 드는 휴대폰에",
    image: "/goods/phone-case/main-1.jpg",
    priceFrom: phoneCaseMinPrice,
    href: "/goods/phone-case",
  },
  {
    id: "tumbler",
    category: "나만의 굿즈",
    name: "텀블러",
    desc: "각인과 사진을 함께 담아",
    image: "/goods/tumbler/main-1.jpg",
    priceFrom: tumblerMinPrice,
    href: "/goods/tumbler",
  },
  {
    id: "ecobag",
    category: "나만의 굿즈",
    name: "에코백",
    desc: "좋아하는 사진을 담아 만드는 가방",
    image: "/goods/ecobag/main-1.jpg",
    priceFrom: ECOBAG_BASE_PRICE,
    href: "/goods/ecobag",
  },
  {
    id: "calendar",
    category: "나만의 굿즈",
    name: "캘린더",
    desc: "매달 꺼내보는 탁상 캘린더",
    image: "/goods/calendar/main-1.jpg",
    priceFrom: calendarMinPrice,
    href: "/goods/calendar",
  },
  {
    id: "fabric-poster",
    category: "나만의 굿즈",
    name: "패브릭 포스터",
    desc: "한 장의 사진으로 완성하는 공간",
    image: "/goods/fabric-poster/main-1.jpg",
    priceFrom: fabricPosterMinPrice,
    href: "/goods/fabric-poster",
  },
];

const steps = [
  {
    n: "01",
    title: "사진 업로드",
    desc: "담고 싶은 사진과 요청사항을 보내주세요.",
    img: "/photobook/process/phone-upload.png",
  },
  {
    n: "02",
    title: "디자이너 편집",
    desc: "입금과 사진·요청사항을 확인한 뒤,\n디자이너가 사진 배치부터 전체 디자인까지 진행해요.",
    img: "/photobook/process/designer-spread.png",
  },
  {
    n: "03",
    title: "시안 확인 후 제작",
    desc: "최종 시안을 확정하면 인쇄·배송을 진행해요.",
    img: "/photobook/process/final-cover.png",
  },
];

const processSteps = [
  { title: "사진 제출", desc: "사진과 요청사항을 올려주세요" },
  { title: "편집 진행", desc: "디자이너가 배치·디자인을 진행해요" },
  { title: "시안 확인", desc: "완성 예상 이미지를 확인하고 수정 요청해요" },
  { title: "인쇄 및 배송", desc: "인쇄 후 포장해서 보내드려요" },
];

const miniFaqs = [
  {
    q: "휴대폰 사진으로도 제작할 수 있나요?",
    a: "네, 휴대폰 사진으로도 충분히 제작할 수 있어요. 다만 너무 흐릿하거나 작게 잘린 사진은 인쇄 화질이 떨어질 수 있어요.",
  },
  {
    q: "사진은 몇 장 준비해야 하나요?",
    a: "상품마다 달라요. 포토북은 최소 10장~최대 100장, 액자는 1장이면 충분해요.",
  },
  {
    q: "완성되기 전에 미리 확인할 수 있나요?",
    a: "네, 입금 확인 후 편집이 완료되면 시안을 보내드려요. 마음에 안 드는 부분은 수정 요청도 하실 수 있어요.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] pb-20 text-[var(--color-charcoal)] sm:pb-0">
      <SiteHeader />

      {/* 카테고리 탭 + 프로모션 배너 + 상품 그리드 */}
      <section id="products" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-4 pt-6 sm:px-10">
        <ProductGrid
          items={productGridItems}
          banner={
            <Link
              href="/options?product=포토북"
              className="relative block overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
            >
              <div className="aspect-[4/3] w-full sm:aspect-[21/6]">
                <img
                  src={promoBanner.image}
                  alt={promoBanner.alt}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10">
                <p className="text-xs font-medium text-white/80">Keepic</p>
                <h1 className="mt-1 break-keep text-2xl font-semibold leading-tight text-white sm:text-3xl">
                  {promoBanner.titleLines[0]}
                  <br />
                  {promoBanner.titleLines[1]}
                </h1>
              </div>
            </Link>
          }
        />
      </section>

      {/* 이용 과정 3단계 */}
      <section className="mx-auto max-w-[1100px] px-6 pb-20 pt-20 sm:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => (
            <Reveal key={step.n} delay={i * 80} className="flex items-center gap-5 sm:block">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-gradient-to-br from-[var(--color-sky)]/10 to-[var(--color-ivory)] shadow-[0_10px_30px_-10px_rgba(45,55,72,0.2)] sm:aspect-square sm:h-auto sm:w-full">
                {step.img ? (
                  <img
                    src={step.img}
                    alt={step.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-charcoal)]/40">
                    준비 중
                  </div>
                )}
              </div>
              <div className="sm:mt-4">
                <span className="text-xs font-medium text-[var(--color-sky)]">
                  {step.n}
                </span>
                <p className="mt-1 text-base font-medium sm:text-lg">{step.title}</p>
                <p className="mt-1 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/60">
                  {step.desc.split("\n").map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 디자인 샘플 */}
      <section id="samples" className="mx-auto max-w-7xl scroll-mt-8 px-6 pb-20 sm:px-10">
        <Reveal className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">디자인 샘플</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              표지부터 내지까지,
              <br className="sm:hidden" />
              {" "}취향을 담은 포토북
            </h2>
          </div>
          <Link
            href="/cases"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            제작 사례 더 보기 →
          </Link>
        </Reveal>

        <div className="mt-8">
          <SampleSpreadCarousel
            images={[
              { src: "/photobook/spreads-full/travel-collected-days.png", alt: "여행 포토북 전체 예시" },
              { src: "/photobook/spreads-full/baby-our-little-one.png", alt: "베이비 포토북 전체 예시" },
              { src: "/photobook/spreads-full/couple-our-kind-of-love.png", alt: "커플 포토북 전체 예시" },
              { src: "/photobook/spreads-full/family-autumn-story.png", alt: "가족 포토북 전체 예시 2" },
              { src: "/photobook/spreads-full/seaside-diary.png", alt: "여행 포토북 전체 예시 2" },
              { src: "/photobook/spreads-full/pet-golden-days.png", alt: "반려견 포토북 전체 예시" },
            ]}
          />
        </div>

        <Link
          href="/cases"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          제작 사례 더 보기 →
        </Link>
      </section>

      {/* 제작 과정 */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
        <Reveal className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">제작 과정</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              이렇게 만들어드려요
            </h2>
          </div>
          <Link
            href="/guide"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            전체 과정 보기 →
          </Link>
        </Reveal>

        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {processSteps.map((step, i) => (
            <Reveal key={step.title} delay={i * 80}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-sky)]/15 text-sm font-medium text-[var(--color-sky)]">
                {i + 1}
              </div>
              <p className="mt-3 text-sm font-medium">{step.title}</p>
              <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
                {step.desc}
              </p>
            </Reveal>
          ))}
        </div>

        <Link
          href="/guide"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          전체 과정 보기 →
        </Link>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <Reveal className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">자주 묻는 질문</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              궁금하신 점이 있으신가요?
            </h2>
          </div>
          <Link
            href="/faq"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            전체 질문 보기 →
          </Link>
        </Reveal>

        <Reveal className="mt-8 flex flex-col divide-y divide-[var(--color-hairline)] rounded-2xl border border-[var(--color-hairline)] bg-white">
          {miniFaqs.map((item) => (
            <details key={item.q} className="group p-5 open:pb-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium sm:text-base">
                {item.q}
                <span className="shrink-0 text-[var(--color-charcoal)]/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {item.a}
              </p>
            </details>
          ))}
        </Reveal>

        <Link
          href="/faq"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          전체 질문 보기 →
        </Link>
      </section>

      <SiteFooter />

      {/* 모바일 전용: 스크롤해도 따라다니는 하단 고정 CTA */}
      <StickyOrderBar label="추억을 담을 방법 고르기" />
    </main>
  );
}
