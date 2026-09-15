import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PageTopBanner, { type PageTopBannerImage } from "@/components/PageTopBanner";
import SiteFooter from "@/components/SiteFooter";
import Reveal from "@/components/Reveal";

const topBannerImages: PageTopBannerImage[] = [
  { src: "/hero/top-banner/goods-1.png", alt: "나만의 굿즈 대표 이미지 1" },
  { src: "/hero/top-banner/goods-2.png", alt: "나만의 굿즈 대표 이미지 2" },
  { src: "/hero/top-banner/goods-3.png", alt: "나만의 굿즈 대표 이미지 3" },
  { src: "/hero/top-banner/goods-4.png", alt: "나만의 굿즈 대표 이미지 4" },
];

const goodsTypes = [
  {
    name: "머그컵·유리컵",
    desc: "좋아하는 사진으로 꾸미는 나만의 컵",
    image: "/goods/mug/main-1.jpg",
    alt: "여행 사진이 담긴 머그컵",
    href: "/goods/mug",
  },
  {
    name: "폰케이스",
    desc: "늘 손에 드는 휴대폰에 나만의 사진을",
    image: "/goods/phone-case/main-1.jpg",
    alt: "커플 사진이 담긴 폰케이스",
    href: "/goods/phone-case",
  },
  {
    name: "텀블러",
    desc: "매일 함께하는 텀블러에 좋아하는 사진과 문구를",
    image: "/goods/tumbler/main-1.jpg",
    alt: "각인과 사진이 담긴 텀블러",
    href: "/goods/tumbler",
  },
  {
    name: "에코백",
    desc: "좋아하는 사진을 담아 만드는 나만의 가방",
    image: "/goods/ecobag/main-1.jpg",
    alt: "여행 사진이 담긴 에코백",
    href: "/goods/ecobag",
  },
  {
    name: "캘린더",
    desc: "소중한 순간을 매달 꺼내보는 탁상 캘린더",
    image: "/goods/calendar/main-1.jpg",
    alt: "사진이 담긴 탁상용 캘린더",
    href: "/goods/calendar",
  },
  {
    name: "패브릭 포스터",
    desc: "한 장의 사진으로 완성하는 나만의 공간",
    image: "/goods/fabric-poster/main-1.jpg",
    alt: "사진이 담긴 패브릭 포스터",
    href: "/goods/fabric-poster",
  },
];

export default function GoodsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <PageTopBanner
        images={topBannerImages}
        eyebrow="나만의 굿즈"
        titleLines={["좋아하는 사진을,", "매일 쓰는 물건에"]}
        descLines={[
          "머그컵부터 폰케이스, 텀블러, 에코백까지.",
          "사진과 문구로 나만의 굿즈를 만들어보세요.",
        ]}
        primaryCta={{ label: "상품 둘러보기", href: "#goods-list" }}
      />

      <section id="goods-list" className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-24 pt-2 sm:px-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {goodsTypes.map((type, i) => {
            const card = (
              <div className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white transition hover:border-[var(--color-sky)]">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-hairline)]/20">
                  {type.image ? (
                    <img
                      src={type.image}
                      alt={type.alt}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-charcoal)]/40">
                      이미지 준비중
                    </div>
                  )}
                  {type.href && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-[var(--color-sky)]">
                      주문 가능
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="font-medium">{type.name}</p>
                  <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/70">
                    {type.desc}
                  </p>
                  {type.href ? (
                    <p className="mt-2 text-xs font-medium text-[var(--color-sky)]">
                      상품 자세히 보기 →
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-[var(--color-charcoal)]/55">
                      준비 중
                    </p>
                  )}
                </div>
              </div>
            );

            return (
              <Reveal key={type.name} delay={(i % 3) * 80}>
                {type.href ? (
                  <Link
                    href={type.href}
                    className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
                  >
                    {card}
                  </Link>
                ) : (
                  <div>{card}</div>
                )}
              </Reveal>
            );
          })}
        </div>

        <div className="mt-12 border border-dashed border-[var(--color-hairline)] bg-white px-8 py-10 text-center">
          <p className="font-medium">지금 바로 만들 수 있는 Keepic 굿즈</p>
          <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/70">
            폰케이스, 텀블러, 에코백, 머그컵·유리컵, 캘린더, 패브릭 포스터는
            <br />
            지금 바로 주문하실 수 있어요.
          </p>
          <p className="mt-4 break-keep text-sm text-[var(--color-charcoal)]/70">
            새로운 굿즈도 사이즈와 재질, 가격이 확정되는 대로
            <br />
            하나씩 추가될 예정이에요.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
