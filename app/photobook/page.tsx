import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import DesignListing from "@/components/DesignListing";
import ContactWidget from "@/components/ContactWidget";
import SiteFooter from "@/components/SiteFooter";

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
      <SiteHeader />

      {/* 낮은 상단 배너: 화면을 다 차지하지 않고, 바로 아래 디자인 목록 첫 줄이 보이도록 */}
      <section className="relative h-44 w-full overflow-hidden sm:h-56">
        <img
          src="/hero/keepic-hero-2.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ivory)] from-20% via-[var(--color-ivory)]/70 via-45% to-transparent to-80%" />
        <div className="relative flex h-full items-center">
          <div className="mx-auto w-full max-w-6xl px-6 sm:px-10">
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
              좋아하는 순간을 모아,
              <br />
              나만의 포토북으로
            </h1>
            <p className="mt-2 max-w-xs break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/75 sm:max-w-sm sm:text-base">
              사진을 고르고 원하는 디자인으로 꾸며보세요.
              <br />
              직접 편집한 추억을 한 권의 포토북으로 제작해드려요.
            </p>
          </div>
        </div>
      </section>

      {/* 디자인 분류 + 목록 */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:px-10">
        <h2 className="text-2xl font-semibold">표지 디자인 예시</h2>
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
        <h2 className="text-2xl font-semibold">내지 예시</h2>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60 break-keep">
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
          추억을 한 권에 담기
        </Link>
      </section>

      <SiteFooter />
      <StickyOrderBar label="추억을 한 권에 담기" href="/options?product=포토북" desktopFloating />
      <ContactWidget />
    </main>
  );
}
