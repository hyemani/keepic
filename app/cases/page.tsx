import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";

const babyCovers = [
  { src: "/photobook/covers/baby-1.png", alt: "베이비 표지 예시 1" },
  { src: "/photobook/covers/baby-2.png", alt: "베이비 표지 예시 2" },
  { src: "/photobook/covers/baby-3.png", alt: "베이비 표지 예시 3" },
  { src: "/photobook/covers/baby-4.png", alt: "베이비 표지 예시 4" },
  { src: "/photobook/covers/baby-5.png", alt: "베이비 표지 예시 5" },
  { src: "/photobook/covers/baby-6.png", alt: "베이비 표지 예시 6" },
];

const travelCovers = [
  { src: "/photobook/covers/travel-1.png", alt: "여행·커플 표지 예시 1" },
  { src: "/photobook/covers/travel-2.png", alt: "여행·커플 표지 예시 2" },
  { src: "/photobook/covers/travel-3.png", alt: "여행·커플 표지 예시 3" },
  { src: "/photobook/covers/travel-4.png", alt: "여행·커플 표지 예시 4" },
  { src: "/photobook/covers/travel-5.png", alt: "여행·커플 표지 예시 5" },
  { src: "/photobook/covers/travel-6.png", alt: "여행·커플 표지 예시 6" },
  { src: "/photobook/covers/travel-7.png", alt: "여행·커플 표지 예시 7" },
  { src: "/photobook/covers/travel-8.png", alt: "여행·커플 표지 예시 8" },
  { src: "/photobook/covers/travel-9.png", alt: "여행·커플 표지 예시 9" },
  { src: "/photobook/covers/travel-10.png", alt: "여행·커플 표지 예시 10" },
  { src: "/photobook/covers/travel-11.png", alt: "여행·커플 표지 예시 11" },
  { src: "/photobook/covers/travel-12.png", alt: "여행·커플 표지 예시 12" },
];

const bigSpreadExamples = [
  { src: "/photobook/spreads-full/travel-collected-days.png", alt: "여행 포토북 전체 예시" },
  { src: "/photobook/spreads-full/baby-our-little-one.png", alt: "베이비 포토북 전체 예시" },
  { src: "/photobook/spreads-full/seaside-diary.png", alt: "여행 포토북 전체 예시 3" },
  { src: "/photobook/spreads-full/couple-our-kind-of-love.png", alt: "커플 포토북 전체 예시" },
  { src: "/photobook/spreads-full/pet-golden-days.png", alt: "반려견 포토북 전체 예시" },
  { src: "/photobook/spreads-full/family-autumn-story.png", alt: "가족 포토북 전체 예시 2" },
];

const spreadExamples = [
  { src: "/photobook/spreads/spread-1.png", alt: "내지 펼침 예시 1" },
  { src: "/photobook/spreads/spread-2.png", alt: "내지 펼침 예시 2" },
  { src: "/photobook/spreads/spread-3.png", alt: "내지 펼침 예시 3" },
  { src: "/photobook/spreads/spread-4.png", alt: "내지 펼침 예시 4" },
  { src: "/photobook/spreads/spread-5.png", alt: "내지 펼침 예시 5" },
  { src: "/photobook/spreads/spread-6.png", alt: "내지 펼침 예시 6" },
  { src: "/photobook/spreads/spread-7.png", alt: "내지 펼침 예시 7" },
  { src: "/photobook/spreads/spread-8.png", alt: "내지 펼침 예시 8" },
  { src: "/photobook/spreads/spread-9.png", alt: "내지 펼침 예시 9" },
  { src: "/photobook/spreads/spread-10.png", alt: "내지 펼침 예시 10" },
];

export default function CasesPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <div className="mx-auto max-w-6xl px-6 pt-2 sm:px-10">
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-hairline)] p-1 text-xs sm:text-sm">
          <span className="rounded-full bg-[var(--color-sky)] px-4 py-2 font-medium text-white">
            포토북
          </span>
          <span className="cursor-not-allowed rounded-full px-4 py-2 text-[var(--color-charcoal)]/35">
            액자 (준비중)
          </span>
          <span className="cursor-not-allowed rounded-full px-4 py-2 text-[var(--color-charcoal)]/35">
            나만의 굿즈 (준비중)
          </span>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">디자인 샘플</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          이런 느낌으로
          <br />
          만들어드려요
        </h1>
        <p className="mt-4 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/70">
          아래 이미지는 실제 고객님의 사진이 아닌,
          <br />
          Keepic이 준비한 디자인 예시예요.
          <br />
          아이의 하루를 담은 앨범부터 여행·커플 사진까지,
          <br />
          다양한 주제로 제작할 수 있어요.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <h2 className="text-xl font-semibold">한 권에 담아낸 소중한 순간들</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bigSpreadExamples.map((img) => (
            <div key={img.src} className="overflow-hidden rounded-xl border border-[var(--color-hairline)]">
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <h2 className="text-xl font-semibold">아이의 하루, 성장 기록</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {babyCovers.map((img) => (
            <div key={img.src} className="aspect-square overflow-hidden rounded-xl border border-[var(--color-hairline)]">
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10">
        <h2 className="text-xl font-semibold">여행, 커플, 가족의 순간</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {travelCovers.map((img) => (
            <div key={img.src} className="aspect-square overflow-hidden rounded-xl border border-[var(--color-hairline)]">
              <img src={img.src} alt={img.alt} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <h2 className="text-xl font-semibold">내지 펼침 예시</h2>
        <p className="mt-1 text-sm text-[var(--color-charcoal)]/50">디자인 예시</p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {spreadExamples.map((img) => (
            <div key={img.src} className="overflow-hidden rounded-xl border border-[var(--color-hairline)]">
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-[var(--color-sky)]/10 p-8 text-center">
          <p className="break-keep text-lg font-medium">
            고객님의 사진으로 만든 사례는
            <br />
            후기가 쌓이는 대로 추가할게요.
          </p>
          <Link
            href="/order"
            className="mt-6 inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            제작 신청하기
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
