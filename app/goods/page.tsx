import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

const goodsTypes = [
  {
    name: "키링",
    desc: "가방에 매달아두는 작은 사진 소품",
    image: "/goods/goods-keyring.jpg",
    alt: "반려견 사진이 담긴 아크릴 키링",
  },
  {
    name: "머그",
    desc: "매일 쓰는 컵에 담는 사진",
    image: "/goods/goods-mug.jpg",
    alt: "여행 사진이 담긴 머그컵",
  },
  {
    name: "폰케이스",
    desc: "늘 곁에 두는 휴대폰에 담는 사진",
    image: "/goods/phone-case/premium-1.jpg",
    alt: "커플 사진이 담긴 폰케이스",
    href: "/goods/phone-case",
  },
  {
    name: "텀블러",
    desc: "매일 손에 드는 텀블러에 담는 사진",
    image: "/goods/tumbler/clip-black-1.jpg",
    alt: "각인과 사진이 담긴 텀블러",
    href: "/goods/tumbler",
  },
  {
    name: "토트백",
    desc: "들고 다니는 가방에 담는 사진",
    image: "/goods/goods-totebag.jpg",
    alt: "여행 사진이 담긴 토트백",
  },
  {
    name: "포토 마그넷",
    desc: "냉장고에 붙여두는 작은 사진",
    image: "/goods/goods-magnet.jpg",
    alt: "아이·반려견·여행 사진이 담긴 포토 마그넷",
  },
];

export default function GoodsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          사진으로 만드는,
          <br />
          나만의 소품.
        </h1>
        <p className="mt-6 max-w-md break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80">
          키링, 머그, 폰케이스, 텀블러, 토트백, 포토 마그넷까지
          <br />
          다양한 굿즈로 만나보실 수 있어요.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {goodsTypes.map((type) => {
            const card = (
              <div className="overflow-hidden border border-[var(--color-hairline)] bg-white">
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={type.image}
                    alt={type.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="font-medium">{type.name}</p>
                  <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
                    {type.desc}
                  </p>
                  {type.href && (
                    <p className="mt-2 text-xs font-medium text-[var(--color-sky)]">
                      지금 주문 가능 →
                    </p>
                  )}
                </div>
              </div>
            );

            return type.href ? (
              <Link key={type.name} href={type.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={type.name}>{card}</div>
            );
          })}
        </div>

        <div className="mt-12 border border-dashed border-[var(--color-hairline)] bg-white px-8 py-10 text-center">
          <p className="font-medium">폰케이스, 텀블러는 지금 바로 주문하실 수 있어요</p>
          <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/60">
            나머지 굿즈도 사이즈, 재질, 가격을 확정하는 대로
            <br />
            바로 주문하실 수 있게 열어드릴게요.
          </p>
        </div>
      </section>

      <SiteFooter />
      <StickyOrderBar label="나만의 굿즈 제작 신청" />
    </main>
  );
}
