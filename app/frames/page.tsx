import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";

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

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">액자</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          좋아하는 순간을,
          <br />
          가장 가까운 곳에.
        </h1>
        <p className="mt-6 max-w-md break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80">
          사진 한 장을 원목, 화이트, 아크릴, 메탈, 미니 탁상형까지
          <br />
          다양한 소재의 액자로 만들어드려요.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameTypes.map((type) => (
            <div
              key={type.name}
              className="overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white"
            >
              <div className="aspect-square w-full overflow-hidden">
                <img
                  src={type.image}
                  alt={type.alt}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-6">
                <p className="font-medium">{type.name}</p>
                <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/60">
                  {type.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href="/options?product=액자"
            className="inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            액자 제작 신청
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-hairline)] px-6 py-8 text-center text-xs text-[var(--color-charcoal)]/50 sm:px-10">
        <p>Operated by HM38° CREATIVE STUDIO</p>
        <Link href="/login" className="mt-2 inline-block hover:text-[var(--color-sky)]">
          관리자
        </Link>
      </footer>
      <StickyOrderBar />
    </main>
  );
}
