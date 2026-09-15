import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

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

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-12 pt-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div>
          <p className="text-sm font-medium text-[var(--color-sky)]">액자</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
            좋아하는 순간을,
            <br />
            가장 가까운 곳에
          </h1>
          <p className="mt-6 max-w-md break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80">
            소중한 사진을 공간에 어울리는 액자로 만들어보세요.
            <br />
            원하는 스타일과 크기를 선택할 수 있어요.
          </p>
          {/* PC에서는 이 버튼이 바로 눈에 띄도록 처음부터 보여줘요. 모바일은 화면 하단에
              항상 따라다니는 버튼(StickyOrderBar)이 있어서 여기서는 따로 안 보여줘요. */}
          <div className="mt-8 hidden sm:block">
            <Link
              href="/options?product=액자"
              className="inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
            >
              액자 둘러보기
            </Link>
          </div>
        </div>
        {/* 오른쪽 빈 공간을 채우는 대표 이미지 (PC에서만 보여요) */}
        <div className="hidden overflow-hidden rounded-2xl lg:block">
          <img
            src="/frames/frame-wood.jpg"
            alt="원목 액자에 담긴 여행 사진"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameTypes.map((type) => (
            <div
              key={type.name}
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
            </div>
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
