import Link from "next/link";

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
    description: "시안을 확인하고 승인해주시면 제작이 시작돼요.",
  },
  {
    title: "인쇄 및 배송",
    description: "인쇄 후 포장해서 보내드려요. 진행 상태는 주문 조회 화면에서 확인하실 수 있어요.",
  },
];

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <Link href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden gap-8 text-sm sm:flex">
          <Link href="/photobook" className="hover:text-[var(--color-sky)]">포토북</Link>
          <Link href="/guide" className="text-[var(--color-sky)]">제작 안내</Link>
          <Link href="/cases" className="hover:text-[var(--color-sky)]">제작 사례</Link>
          <Link href="/faq" className="hover:text-[var(--color-sky)]">자주 묻는 질문</Link>
          <Link href="/order-lookup" className="hover:text-[var(--color-sky)]">나의 주문</Link>
          </nav>
          <Link
            href="/order"
            className="rounded-full bg-[var(--color-sky)] px-5 py-2.5 text-xs font-medium text-white transition hover:opacity-90 sm:text-sm"
          >
            제작 신청
          </Link>
        </div>
      </header>

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

        <div className="mt-4 flex items-center gap-6">
          <Link
            href="/order"
            className="rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            주문 시작하기
          </Link>
          <Link
            href="/order-lookup"
            className="text-sm underline decoration-[var(--color-hairline)] underline-offset-4 hover:text-[var(--color-sky)]"
          >
            내 주문 진행 상태 보기
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-hairline)] px-6 py-8 text-center text-xs text-[var(--color-charcoal)]/50 sm:px-10">
        <p>Operated by HM38° CREATIVE STUDIO</p>
        <Link href="/login" className="mt-2 inline-block hover:text-[var(--color-sky)]">
          관리자
        </Link>
      </footer>
    </main>
  );
}
