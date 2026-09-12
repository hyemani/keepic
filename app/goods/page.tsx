import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

const goodsTypes = [
  {
    name: "머그",
    desc: "매일 쓰는 컵에 담는 사진",
    image: "/goods/mug/main-1.jpg",
    alt: "여행 사진이 담긴 머그컵",
    href: "/goods/mug",
  },
  {
    name: "폰케이스",
    desc: "늘 곁에 두는 휴대폰에 담는 사진",
    image: "/goods/phone-case/main-1.jpg",
    alt: "커플 사진이 담긴 폰케이스",
    href: "/goods/phone-case",
  },
  {
    name: "텀블러",
    desc: "매일 손에 드는 텀블러에 담는 사진",
    image: "/goods/tumbler/main-1.jpg",
    alt: "각인과 사진이 담긴 텀블러",
    href: "/goods/tumbler",
  },
  {
    name: "에코백",
    desc: "들고 다니는 가방에 담는 사진",
    image: "/goods/ecobag/main-1.jpg",
    alt: "여행 사진이 담긴 에코백",
    href: "/goods/ecobag",
  },
  {
    name: "캘린더",
    desc: "매달 바뀌는 탁상용 캘린더",
    image: "/goods/calendar/main-1.jpg",
    alt: "사진이 담긴 탁상용 캘린더",
    href: "/goods/calendar",
  },
  {
    name: "패브릭포스터",
    desc: "패브릭 원단에 담는 사진",
    image: "",
    alt: "사진이 담긴 패브릭 포스터",
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
          머그, 폰케이스, 텀블러, 에코백, 캘린더, 패브릭포스터까지
          <br />
          다양한 굿즈로 만나보실 수 있어요.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {goodsTypes.map((type) => {
            const card = (
              <div className="overflow-hidden border border-[var(--color-hairline)] bg-white">
                <div className="aspect-[3/4] w-full overflow-hidden bg-[var(--color-hairline)]/20">
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
          <p className="font-medium">폰케이스, 텀블러, 에코백, 머그, 캘린더는 지금 바로 주문하실 수 있어요</p>
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
