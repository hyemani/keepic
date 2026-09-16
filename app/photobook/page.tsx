import SiteHeader from "@/components/SiteHeader";
import PageTopBanner, { type PageTopBannerImage } from "@/components/PageTopBanner";
import StickyOrderBar from "@/components/StickyOrderBar";
import DesignListing from "@/components/DesignListing";
import SpreadExamplesPager from "@/components/SpreadExamplesPager";
import ContactWidget from "@/components/ContactWidget";
import SiteFooter from "@/components/SiteFooter";

const topBannerImages: PageTopBannerImage[] = [
  { src: "/hero/top-banner/photobook-1.png", alt: "포토북 대표 이미지 1" },
  { src: "/hero/top-banner/photobook-2.png", alt: "포토북 대표 이미지 2" },
  { src: "/hero/top-banner/photobook-3.png", alt: "포토북 대표 이미지 3" },
  { src: "/hero/top-banner/photobook-4.png", alt: "포토북 대표 이미지 4" },
];

const spreadExamples = [
  { src: "/photobook/spreads/spread-2.png", alt: "내지 펼침 예시 1" },
  { src: "/photobook/spreads/spread-3.png", alt: "내지 펼침 예시 2" },
  { src: "/photobook/spreads/spread-6.png", alt: "내지 펼침 예시 3" },
  { src: "/photobook/spreads/spread-7.png", alt: "내지 펼침 예시 4" },
];

const sizes = [
  { label: "S", detail: "20 x 20cm", px: 90, softPrice: 69000, hardPrice: 79000, image: "/photobook/covers/size-s-seaside-log.jpg" },
  { label: "M", detail: "25 x 25cm", px: 120, softPrice: 79000, hardPrice: 89000, image: "/photobook/covers/size-m-little-hello.jpg" },
  { label: "L", detail: "30 x 30cm", px: 150, softPrice: 89000, hardPrice: 99000, image: "/photobook/covers/size-l-together-days.jpg" },
];

export default function PhotobookPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader overlayHero />

      <PageTopBanner
        images={topBannerImages}
        extendBehindHeader
        eyebrow="포토북"
        titleLines={["좋아하는 순간을 모아,", "나만의 포토북으로"]}
        descLines={[
          "사진을 고르고 원하는 디자인으로 꾸며보세요.",
          "직접 편집한 추억을 한 권의 포토북으로 제작해드려요.",
        ]}
      />

      {/* 디자인 분류 + 목록 */}
      <section id="design-listing" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-16 pt-2 sm:px-10">
        <h2 className="text-2xl">
          <span className="font-bold">표지</span>
          <span className="font-normal text-[var(--color-charcoal)]/70"> 디자인 예시</span>
        </h2>
        <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/60">
          사진과 제목이 들어갔을 때의 모습을 확인해보세요.
          <br />
          아래 이미지는 디자인 참고용 예시입니다.
        </p>
        <div className="mt-8">
          <DesignListing />
        </div>
      </section>

      {/* 내지 예시 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl">
          <span className="font-bold">내지</span>
          <span className="font-normal text-[var(--color-charcoal)]/70"> 디자인 예시</span>
        </h2>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60 break-keep">
          사진과 문구를 이렇게 펼침면으로 배치해드려요. 디자인 예시예요.
        </p>
        <div className="mt-6">
          <SpreadExamplesPager images={spreadExamples} />
        </div>
      </section>

      {/* 사이즈 & 기본 구성 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl font-semibold">사이즈 & 기본 구성</h2>
        <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/60">
          정사각형 3가지 사이즈(S/M/L) 중에서 고르실 수 있어요.
          <br />
          (완성 규격 기준 임시 수치예요, 제작 파일 규격은 제작처 확인 후 별도 안내드려요)
        </p>

        <div className="mt-8 flex flex-col gap-8">
          {sizes.map((size, i) => (
            <div
              key={size.label}
              className={`flex items-start gap-6 pb-8 ${
                i !== sizes.length - 1 ? "border-b border-[var(--color-hairline)]" : ""
              }`}
            >
              <div
                style={{ width: size.px, height: size.px }}
                className="shrink-0 overflow-hidden bg-white"
              >
                <img
                  src={size.image}
                  alt={`${size.label} 사이즈 표지 예시`}
                  className="h-full w-full scale-125 object-cover"
                />
              </div>
              <div className="flex-1 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-lg font-semibold">{size.label}</p>
                  <p className="text-xs text-[var(--color-charcoal)]/60">{size.detail}</p>
                </div>
                <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-8">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-charcoal)]/60">소프트커버</span>
                    <span className="font-medium">{size.softPrice.toLocaleString()}원부터</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-charcoal)]/60">하드커버</span>
                    <span className="font-medium">{size.hardPrice.toLocaleString()}원부터</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-[var(--color-hairline)] bg-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-[var(--color-charcoal)]/60">제본 · </span>
              <span className="font-medium">레이플랫 제본 기본 포함</span>
            </p>
            <p>
              <span className="text-[var(--color-charcoal)]/60">페이지 수 · </span>
              <span className="font-medium">기본 10장·20페이지 (2페이지 단위로 추가 가능)</span>
            </p>
            <p>
              <span className="text-[var(--color-charcoal)]/60">제작 기간 · </span>
              <span className="text-[var(--color-charcoal)]/40">준비 중</span>
            </p>
          </div>
        </div>
        <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/40">
          모두 임시 판매가이고 배송비 별도예요. 특히 S 하드커버는 아직 실제 견적 확인 전이라
          이후 조정될 수 있어요.
        </p>
      </section>

      <SiteFooter />
      <StickyOrderBar label="추억을 한 권에 담기" href="/options?product=포토북" desktopFloating />
      <ContactWidget />
    </main>
  );
}
