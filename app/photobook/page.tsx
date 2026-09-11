import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";

const coverExamples = [
  { src: "/photobook/covers/baby-1.png", alt: "베이비 표지 예시 1" },
  { src: "/photobook/covers/baby-3.png", alt: "베이비 표지 예시 2" },
  { src: "/photobook/covers/baby-5.png", alt: "베이비 표지 예시 3" },
  { src: "/photobook/covers/travel-1.png", alt: "여행·커플 표지 예시 1" },
  { src: "/photobook/covers/travel-6.png", alt: "여행·커플 표지 예시 2" },
  { src: "/photobook/covers/travel-9.png", alt: "여행·커플 표지 예시 3" },
];

const spreadExamples = [
  { src: "/photobook/spreads/spread-2.png", alt: "내지 펼침 예시 1" },
  { src: "/photobook/spreads/spread-3.png", alt: "내지 펼침 예시 2" },
  { src: "/photobook/spreads/spread-6.png", alt: "내지 펼침 예시 3" },
  { src: "/photobook/spreads/spread-7.png", alt: "내지 펼침 예시 4" },
];

const sizes = [
  { label: "S", detail: "20 x 20cm", px: 90 },
  { label: "M", detail: "25 x 25cm", px: 120 },
  { label: "L", detail: "30 x 30cm", px: 150 },
];

export default function PhotobookPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      {/* 첫 화면 */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-8 sm:px-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-medium text-[var(--color-sky)]">포토북</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
            사진을 보내주시면,
            <br />
            포토북으로
            <br className="sm:hidden" />
            {" "}만들어드려요
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--color-charcoal)]/80">
            사진을 직접 편집하실 필요 없어요.
            <br />
            사진만 골라 보내주시면
            <br />
            Keepic이 배치부터 디자인까지 맡아서
            <br />
            완성된 포토북으로 만들어드려요.
          </p>
          <div className="mt-10">
            <Link
              href="/guide"
              className="text-sm underline decoration-[var(--color-hairline)] underline-offset-4 hover:text-[var(--color-sky)]"
            >
              제작 과정 보기
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--color-hairline)]">
          <img
            src="/photobook/covers/collage-1.png"
            alt="Keepic 포토북 표지와 내지 예시"
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* 표지 예시 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl font-semibold">표지 예시</h2>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
          디자인 예시예요. 실제 표지 종류는 주문 시 안내드려요.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {coverExamples.map((img) => (
            <div
              key={img.src}
              className="overflow-hidden rounded-xl border border-[var(--color-hairline)]"
            >
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* 내지 예시 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl font-semibold">내지 예시</h2>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
          사진과 문구를 이렇게 펼침면으로 배치해드려요. 디자인 예시예요.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {spreadExamples.map((img) => (
            <div
              key={img.src}
              className="overflow-hidden rounded-xl border border-[var(--color-hairline)]"
            >
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* 사이즈 비교 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl font-semibold">사이즈</h2>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
          정사각형 3가지 사이즈(S/M/L) 중에서 고르실 수 있어요.
          <br />
          (완성 규격 기준 임시 수치예요, 제작 파일 규격은 제작처 확인 후 별도 안내드려요)
        </p>
        <div className="mt-8 flex flex-wrap items-end gap-8">
          {sizes.map((size) => (
            <div key={size.label} className="flex flex-col items-center gap-3">
              <div
                style={{ width: size.px, height: size.px }}
                className="rounded-md border-2 border-[var(--color-sky)] bg-[var(--color-sky)]/10"
              />
              <div className="text-center">
                <p className="font-medium">{size.label}</p>
                <p className="text-xs text-[var(--color-charcoal)]/60">
                  {size.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 기본 구성 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <h2 className="text-2xl font-semibold">기본 구성</h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-hairline)] bg-white">
          {[
            { label: "사이즈", value: "S 20x20cm / M 25x25cm / L 30x30cm (완성 규격, 임시)" },
            { label: "커버", value: "소프트커버 / 하드커버" },
            { label: "제본", value: "레이플랫 제본 기본 포함" },
            { label: "페이지 수", value: "기본 10장·20페이지 (2페이지 단위로 추가 가능)" },
            {
              label: "가격",
              value: "소프트커버 69,000원부터 / 하드커버 79,000원부터 (임시 판매가, 배송비 별도)",
            },
            { label: "제작 기간", value: "준비 중" },
          ].map((row, i) => (
            <div
              key={row.label}
              className={`flex flex-col gap-1 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                i !== 0 ? "border-t border-[var(--color-hairline)]" : ""
              }`}
            >
              <p className="shrink-0 whitespace-nowrap text-[var(--color-charcoal)]/60">{row.label}</p>
              <p
                className={
                  row.value === "준비 중"
                    ? "text-[var(--color-charcoal)]/40"
                    : "break-keep font-medium sm:text-right"
                }
              >
                {row.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/40">
          모두 임시 판매가예요. 특히 S 하드커버는 아직 실제 견적 확인 전이라 이후 조정될 수
          있어요.
        </p>
      </section>

      {/* 마지막 신청 영역 */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 text-center sm:px-10">
        <h2 className="break-keep text-2xl font-semibold">
          사진만 보내주세요,
          <br />
          나머지는 저희가 할게요
        </h2>
        <Link
          href="/options?product=포토북"
          className="mt-8 inline-block rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
        >
          포토북 주문하기
        </Link>
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
