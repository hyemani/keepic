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
  // 위쪽 보라~블루 그라데이션 배경이 잘리지 않고 다 보이도록 원본 비율 그대로 쓰는 이미지예요.
  image: "/hero/keepic-hero-full.jpg",
  alt: "포토북, 액자, 머그컵, 키링 등 Keepic 상품 구성",
  titleLines: ["기억하고 싶은 순간,", "키픽하세요."],
  eyebrow: "PHOTOBOOK · FRAME · CUSTOM GOODS",
  caption: "사진을 보내주시면 배치부터 디자인까지 함께합니다.",
};

// 배너 사진 속 반짝이는 빛 느낌을 배경 전체에 은은하게 깔아주는 반짝임들이에요.
// 문구·제품 사진과 겹치지 않도록 양옆·문구 주변·사진 주변에 고루 배치했어요.
const bannerSparkles = [
  { top: "14%", left: "9%", size: 20, delay: "0s", duration: "3.2s" },
  { top: "27%", left: "18%", size: 12, delay: "0.7s", duration: "2.6s" },
  { top: "10%", left: "85%", size: 24, delay: "1.1s", duration: "3.6s" },
  { top: "24%", left: "91%", size: 14, delay: "0.4s", duration: "2.9s" },
  { top: "6%", left: "50%", size: 11, delay: "1.6s", duration: "3.1s" },
  // 문구 바로 옆
  { top: "37%", left: "32%", size: 9, delay: "1.3s", duration: "2.7s" },
  { top: "35%", left: "68%", size: 9, delay: "0.5s", duration: "2.9s" },
  // 제품 사진 주변
  { top: "56%", left: "5%", size: 18, delay: "0.9s", duration: "3.4s" },
  { top: "50%", left: "94%", size: 22, delay: "0.2s", duration: "3.0s" },
];

function BannerSparkle({
  top,
  left,
  size,
  delay,
  duration,
}: {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="animate-sparkle-twinkle absolute text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.75)]"
      style={{ top, left, width: size, height: size, animationDelay: delay, animationDuration: duration }}
    >
      <path fill="currentColor" d="M12 0 14.2 9.8 24 12 14.2 14.2 12 24 9.8 14.2 0 12 9.8 9.8Z" />
    </svg>
  );
}

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

// 보내주신 표지 샘플 중 잘 나온 사진으로 카드 이미지를 골랐어요.
const photobookCoverImage: Record<string, string> = {
  soft: "/photobook/covers/size-m-little-hello.jpg",
  hard: "/photobook/covers/size-l-together-days.jpg",
};

const productGridItems: ProductGridItem[] = [
  ...photobookCovers.map((cover) => ({
    id: `photobook-${cover.id}`,
    category: "포토북" as const,
    name: "포토북",
    desc: "소중한 사진을 한 권의 책으로",
    image: photobookCoverImage[cover.id],
    priceFrom: photobookMinPriceByCover[cover.id],
    href: `/options?product=${encodeURIComponent("포토북")}&cover=${cover.id}`,
    badge: photobookCoverBadgeEn[cover.id],
    badgeClassName: "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))]",
  })),
  {
    id: "photobook-ai-auto",
    category: "포토북" as const,
    name: "포토북 (AI 맞춤 레이아웃)",
    desc: "사진만 올리면 배치를 AI가 도와드려요",
    image: "/photobook/ai-auto-layout.jpg",
    priceFrom: photobookMinPriceByCover.soft,
    href: `/options?product=${encodeURIComponent("포토북")}&layout=ai-auto`,
    badge: "AI",
    badgeClassName: "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))]",
  },
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
      <SiteHeader overlayHero heroTintRgb="84,60,184" />

      {/* 프로모션 배너 — 화면 양옆 끝까지 꽉 차게 보여요. 원본 사진 비율(약
          4:3)을 그대로 유지해서 위아래를 자르는 일도, 옆에 배경색이 남는
          일도 없이 항상 사진 전체가 화면 너비만큼 꽉 차 보여요. 문구·사진
          배치 비율이 화면 크기와 상관없이 항상 그대로 유지돼요. */}
      <Link
        href="/options?product=포토북"
        className="relative block w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
      >
        {/* min-h는 아주 좁은 모바일 화면에서 배너가 너무 짧아져서 위에 떠
            있는 헤더·문구가 사진과 겹치는 걸 막기 위한 최소 높이예요. 데스크톱
            폭에서는 원본 비율(약 4:3) 쪽 높이가 이미 이보다 커서 이 값은
            영향을 주지 않아요. */}
        <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden min-h-[440px]">
          <img
            src={promoBanner.image}
            alt={promoBanner.alt}
            className="h-full w-full object-cover object-top"
          />
          {/* 글자가 놓이는 위쪽 그라데이션 부분만 살짝 어둡게 해서, 사진 속 제품은 그대로 밝게 보여요 */}
          <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-black/25 to-transparent" />
          {/* 사진 속 반짝임과 같은 느낌으로, 문구 주변과 제품 사진 주변까지 은은하게 반짝이는 빛을 깔아요 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            {bannerSparkles.map((sparkle, i) => (
              <BannerSparkle key={i} {...sparkle} />
            ))}
          </div>
          {/* 글자 위치·크기를 px 고정값이 아니라 배너 높이/너비의 %와 clamp()로
              잡아요. 배너 자체가 항상 원본 사진과 같은 비율로 늘어나고
              줄어들기 때문에, 이렇게 잡아두면 모바일이든 PC 창을 최대로
              넓히든 같은 비율로 보여요. 다만 아주 좁은 모바일 화면에서는
              배너 자체 높이가 얼마 안 되기 때문에, 글자가 사진과 겹치지
              않도록 시작 위치와 최소 글자 크기를 여유 있게 낮춰뒀어요. */}
          <div className="absolute inset-x-0 top-[calc(24%+8px)] flex flex-col items-center px-6 text-center">
            <h1 className="font-banner break-keep text-[clamp(1.1rem,4.4vw,3.3rem)] leading-tight text-white">
              {promoBanner.titleLines[0]}
              <br />
              {promoBanner.titleLines[1]}
            </h1>
            <p className="mt-[0.8%] text-[clamp(0.52rem,1vw,0.95rem)] font-semibold tracking-[0.16em] text-white/85">
              {promoBanner.eyebrow}
            </p>
            <p className="mt-[0.5%] max-w-xs break-keep text-[clamp(0.56rem,0.95vw,0.9rem)] text-white/75">
              {promoBanner.caption}
            </p>
          </div>
        </div>
      </Link>

      {/* 카테고리 탭 + 상품 그리드 */}
      <section id="products" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-4 pt-8 sm:px-10">
        <ProductGrid items={productGridItems} />
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
