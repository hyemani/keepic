import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

const steps = [
  {
    title: "상품 선택",
    description: "사이즈, 표지, 수량을 골라주세요.",
  },
  {
    title: "사진 제출",
    description:
      "홈페이지에서 바로 사진을 올려주세요. 되도록 원본 화질의 사진으로 준비해주시면 좋아요.",
  },
  {
    title: "요청사항 작성",
    description:
      "표지 제목, 넣고 싶은 날짜나 문구, 꼭 크게 넣고 싶은 사진이 있다면 함께 알려주세요.",
  },
  {
    title: "입금 확인",
    description:
      "입금 확인 및 사진·요청사항 접수가 완료되면 시안 작업이 시작됩니다.",
  },
  {
    title: "편집 진행",
    description: "입금이 확인되면, 보내주신 사진과 요청사항을 바탕으로 Keepic이 배치·디자인을 진행해요.",
  },
  {
    title: "시안 확인",
    description:
      "완성 예상 이미지(시안)를 보내드려요. 주문 조회 화면에서 확인하시고, 수정이 필요하면 요청하실 수 있어요.",
  },
  {
    title: "최종 확정",
    description: "최종 시안을 확정해주시면 인쇄·제작을 진행합니다.",
  },
  {
    title: "인쇄 및 배송",
    description: "인쇄 후 포장해서 보내드려요. 진행 상태는 주문 조회 화면에서 확인하실 수 있어요.",
  },
];

const showcaseItems = [
  { label: "액자", src: "/frames/frame-acrylic.jpg", alt: "아크릴 액자에 담긴 반려견 사진" },
  { label: "표지", src: "/photobook/covers/travel-1.png", alt: "여행 포토북 표지 예시" },
  { label: "굿즈", src: "/goods/fabric-poster/main-1.jpg", alt: "패브릭 포스터로 완성한 굿즈 예시" },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">제작 안내</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          이렇게 만들어드려요
        </h1>
        <p className="mt-6 max-w-lg break-keep text-base leading-relaxed text-[var(--color-charcoal)]/80">
          Keepic은 디자이너가 직접 편집해드리는
          <br />
          포토북 서비스예요.
          <br />
          사진과 원하시는 내용을 보내주시면,
          <br />
          사진 배치부터 전체 디자인까지
          <br />
          맡아서 완성해드려요.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-3">
          {showcaseItems.map((item) => (
            <div key={item.label}>
              <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[var(--color-hairline)]/20">
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-[var(--color-charcoal)]/60">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-sky)] text-sm font-medium text-white">
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="my-1 w-px flex-1 bg-[var(--color-hairline)]" />
                )}
              </div>
              <div className="pb-10">
                <h2 className="text-lg font-semibold">{step.title}</h2>
                <p className="mt-1.5 max-w-md break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/order-lookup"
            className="rounded-full border border-[var(--color-charcoal)]/30 px-8 py-4 text-sm font-medium transition hover:bg-[var(--color-hairline)]/20"
          >
            내 주문 진행상태 보기
          </Link>
          <Link
            href="/order"
            className="rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            추억 제작하러 가기
          </Link>
        </div>
      </section>

      <SiteFooter />
      <StickyOrderBar label="추억을 담을 방법 고르기" />
    </main>
  );
}
