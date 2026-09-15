import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageTopBanner, { type PageTopBannerImage } from "@/components/PageTopBanner";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";

const topBannerImages: PageTopBannerImage[] = [
  { src: "/hero/top-banner/frame-1.png", alt: "액자 대표 이미지 1" },
  { src: "/hero/top-banner/frame-2.png", alt: "액자 대표 이미지 2" },
  { src: "/hero/top-banner/frame-3.png", alt: "액자 대표 이미지 3" },
  { src: "/hero/top-banner/frame-4.png", alt: "액자 대표 이미지 4" },
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

export default function FramesPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <PageTopBanner
        images={topBannerImages}
        eyebrow="액자"
        titleLines={["좋아하는 순간을,", "가장 가까운 곳에"]}
        descLines={[
          "소중한 사진을 공간에 어울리는 액자로 만들어보세요.",
          "원하는 스타일과 크기를 선택할 수 있어요.",
        ]}
        primaryCta={{ label: "액자 둘러보기", href: "#frame-list" }}
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
            className="inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
          >
            액자 둘러보기
          </Link>
        </div>
      </section>

      <SiteFooter />
      <StickyOrderBar label="액자 둘러보기" href="/options?product=액자" desktopFloating />
    </main>
  );
}
