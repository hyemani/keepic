import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

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
  { label: "S", detail: "20 x 20cm", px: 90, softPrice: 69000, hardPrice: 79000, image: "/photobook/covers/size-s-seaside-log.jpg" },
  { label: "M", detail: "25 x 25cm", px: 120, softPrice: 79000, hardPrice: 89000, image: "/photobook/covers/size-m-little-hello.jpg" },
  { label: "L", detail: "30 x 30cm", px: 150, softPrice: 99000, hardPrice: 109000, image: "/photobook/covers/size-l-together-days.jpg" },
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
        <div className="overflow-hidden">
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
              className="overflow-hidden"
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
              className="overflow-hidden"
            >
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
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

      <SiteFooter />
      <StickyOrderBar />
    </main>
  );
}
