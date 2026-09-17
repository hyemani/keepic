import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import HeroSlideshow, { type HeroSlide } from "@/components/HeroSlideshow";
import StickyOrderBar from "@/components/StickyOrderBar";
import ContactWidget from "@/components/ContactWidget";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";
import { diasecFrameSizes } from "@/lib/diasecFrameModels";
import GroupPhotoSlider from "@/components/GroupPhotoSlider";

const topBannerTitleLines = ["좋아하는 순간을,", "가장 가까운 곳에"];
const topBannerDescLines = [
  "소중한 사진을 공간에 어울리는 액자로 만들어보세요.",
  "원하는 스타일과 크기를 선택할 수 있어요.",
];

const topBannerSlides: HeroSlide[] = [
  { image: "/hero/top-banner/frame-1.png", alt: "액자 대표 이미지 1", titleLines: topBannerTitleLines, descLines: topBannerDescLines },
  { image: "/hero/top-banner/frame-2.png", alt: "액자 대표 이미지 2", titleLines: topBannerTitleLines, descLines: topBannerDescLines },
  { image: "/hero/top-banner/frame-3.png", alt: "액자 대표 이미지 3", titleLines: topBannerTitleLines, descLines: topBannerDescLines },
  { image: "/hero/top-banner/frame-4.png", alt: "액자 대표 이미지 4", titleLines: topBannerTitleLines, descLines: topBannerDescLines },
];

const frameTypes = [
  {
    name: "원목 액자",
    desc: "따뜻한 나무 질감의 기본 액자",
    image: "/frames/frame-wood.jpg",
    alt: "원목 액자에 담긴 여행 사진",
  },
  {
    name: "화이트 액자",
    desc: "깔끔하고 심플한 화이트 톤",
    image: "/frames/frame-white.jpg",
    alt: "화이트 액자에 담긴 가족 사진",
  },
  {
    name: "아크릴 액자",
    desc: "선명하고 고급스러운 광택감",
    image: "/frames/frame-acrylic.jpg",
    alt: "아크릴 액자에 담긴 반려견 사진",
  },
  {
    name: "메탈 액자",
    desc: "모던하고 세련된 메탈 프레임",
    image: "/frames/frame-metal.jpg",
    alt: "메탈 액자에 담긴 커플 사진",
  },
  {
    name: "미니 탁상형 액자",
    desc: "책상 위에 두고 보는 작은 액자",
    image: "/frames/frame-mini.jpg",
    alt: "미니 탁상형 액자에 담긴 아기 사진",
  },
];

// 마감별 대표 이미지 5장(가족·아기·커플·여행·반려견 컨셉)의 파일명 접두사예요.
// public/frames/diasec/ 아래 "{key}-1.jpg" ~ "{key}-5.jpg" 로 저장돼 있어요.
const diasecFinishImageKeys: Record<string, string> = {
  "탁상용 유광": "desk-glossy",
  "탁상용 무반사": "desk-antiglare",
  "탁상용 자작나무 유광": "desk-birch-glossy",
  "탁상용 자작나무 무광": "desk-birch-matte",
  "벽걸이 자작나무 유광": "wall-birch-glossy",
  "벽걸이 자작나무 무광": "wall-birch-matte",
};

const diasecFinishGroups = Array.from(
  new Map(diasecFrameSizes.map((s) => [s.finishLabel, s])).values()
).map((first) => {
  const sizes = diasecFrameSizes.filter((s) => s.finishLabel === first.finishLabel);
  const prices = sizes.map((s) => s.price);
  const imageKey = diasecFinishImageKeys[first.finishLabel];
  return {
    finishLabel: first.finishLabel,
    mount: first.mount,
    sizeCount: sizes.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    images: Array.from({ length: 5 }, (_, i) => ({
      src: `/frames/diasec/${imageKey}-${i + 1}.jpg`,
      alt: `${first.finishLabel} 디아섹 아크릴액자 예시 ${i + 1}`,
    })),
  };
});

export default function FramesPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader overlayHero />

      <HeroSlideshow
        slides={topBannerSlides}
        fixedCaption={{
          eyebrow: "액자",
          titleLines: topBannerTitleLines,
          descLines: topBannerDescLines,
          primaryCta: { label: "좋아하는 순간을 걸어두기", href: "/options?product=액자" },
        }}
      />

      <section id="frame-list" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-16 pt-2 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameTypes.map((type, i) => (
            <Reveal
              key={type.name}
              delay={(i % 3) * 80}
              className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white"
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                <img
                  src={type.image}
                  alt={type.alt}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="font-medium">{type.name}</p>
                <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/70">
                  {type.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 hidden sm:block">
          <Link
            href="/options?product=액자"
            className="inline-block rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
          >
            액자 둘러보기
          </Link>
        </div>
      </section>

      <section id="diasec-frame" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-16 pt-2 sm:px-10">
        <p className="text-sm text-[var(--color-charcoal)]/60">NEW</p>
        <h2 className="mt-1 text-2xl font-semibold">디아섹 아크릴액자</h2>
        <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/70">
          탁상용 유광·무반사·자작나무, 벽걸이 자작나무까지, 사진에 맞는 마감과 크기를 골라보세요.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {diasecFinishGroups.map((group, i) => (
            <Reveal
              key={group.finishLabel}
              delay={(i % 3) * 80}
              className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white transition hover:-translate-y-0.5 hover:border-[var(--color-sky)] hover:shadow-[0_10px_24px_-12px_rgba(45,55,72,0.25)]"
            >
              <Link
                href={`/options?product=${encodeURIComponent(
                  "디아섹 아크릴액자"
                )}&finish=${encodeURIComponent(group.finishLabel)}`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
              >
                <GroupPhotoSlider images={group.images} />
                <div className="p-6">
                  <p className="font-medium">
                    {group.finishLabel}
                    {group.mount === "wall" && (
                      <span className="ml-2 text-xs text-[var(--color-charcoal)]/50">벽걸이</span>
                    )}
                  </p>
                  <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/70">
                    {group.sizeCount > 1
                      ? `${group.minPrice.toLocaleString()}원 ~ ${group.maxPrice.toLocaleString()}원`
                      : `${group.minPrice.toLocaleString()}원`}
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 액자 디자인 예시 — 우선 디아섹 아크릴액자 사진으로, 마감마다
          겹치지 않게 한 장씩만 보여줘요. */}
      <section id="frame-design-examples" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-16 pt-2 sm:px-10">
        <h2 className="text-2xl">
          <span className="font-bold">액자</span>
          <span className="font-normal text-[var(--color-charcoal)]/70"> 디자인 예시</span>
        </h2>
        <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/60">
          사진이 액자에 담겼을 때의 모습을 확인해보세요.
          <br />
          아래 이미지는 디자인 참고용 예시입니다.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {diasecFinishGroups.map((group, i) => {
            const example = group.images[i % group.images.length];
            return (
              <Reveal
                key={group.finishLabel}
                delay={(i % 3) * 80}
                className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white"
              >
                <div className="aspect-square w-full overflow-hidden">
                  <img src={example.src} alt={example.alt} className="h-full w-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium">{group.finishLabel}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <SiteFooter />
      <StickyOrderBar label="좋아하는 순간을 걸어두기" href="/options?product=액자" desktopFloating />
      <ContactWidget />
    </main>
  );
}
