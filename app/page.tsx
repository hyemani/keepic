import Link from "next/link";
import { Fragment } from "react";

const steps = [
  {
    n: "01",
    title: "사진 업로드",
    desc: "담고 싶은 사진과 요청사항을 보내주세요.",
    img: "/photobook/process/phone-upload.png",
  },
  {
    n: "02",
    title: "디자이너 편집",
    desc: "입금과 사진·요청사항을 확인한 뒤,\n디자이너가 사진 배치부터 전체 디자인까지 진행해요.",
    img: "/photobook/process/designer-spread.png",
  },
  {
    n: "03",
    title: "시안 확인 후 제작",
    desc: "최종 시안을 확정하면 인쇄·배송을 진행해요.",
    img: "/photobook/process/final-cover.png",
  },
];

const processSteps = [
  { title: "사진 제출", desc: "사진과 요청사항을 올려주세요" },
  { title: "편집 진행", desc: "디자이너가 배치·디자인을 진행해요" },
  { title: "시안 확인", desc: "완성 예상 이미지를 확인하고 수정 요청해요" },
  { title: "인쇄 및 배송", desc: "인쇄 후 포장해서 보내드려요" },
];

const miniFaqs = [
  {
    q: "휴대폰 사진으로도 제작할 수 있나요?",
    a: "네, 휴대폰 사진으로도 충분히 제작할 수 있어요. 다만 너무 흐릿하거나 작게 잘린 사진은 인쇄 화질이 떨어질 수 있어요.",
  },
  {
    q: "사진은 몇 장 준비해야 하나요?",
    a: "상품마다 달라요. 포토북은 최소 10장~최대 100장, 나만의 앨범은 최소 5장~최대 50장이에요.",
  },
  {
    q: "완성되기 전에 미리 확인할 수 있나요?",
    a: "네, 입금 확인 후 편집이 완료되면 시안을 보내드려요. 마음에 안 드는 부분은 수정 요청도 하실 수 있어요.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto max-w-7xl px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden gap-8 text-sm sm:flex">
              <Link href="/photobook" className="hover:text-[var(--color-sky)]">포토북</Link>
              <Link href="/guide" className="hover:text-[var(--color-sky)]">제작 안내</Link>
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
        </div>

        {/* 모바일 전용: 항상 보이는 가로 메뉴 */}
        <nav className="-mx-6 mt-5 flex gap-6 overflow-x-auto whitespace-nowrap px-6 text-sm sm:hidden [&::-webkit-scrollbar]:hidden">
          <Link href="/photobook" className="shrink-0 text-[var(--color-charcoal)]/80 hover:text-[var(--color-sky)]">포토북</Link>
          <Link href="/guide" className="shrink-0 text-[var(--color-charcoal)]/80 hover:text-[var(--color-sky)]">제작 안내</Link>
          <Link href="/cases" className="shrink-0 text-[var(--color-charcoal)]/80 hover:text-[var(--color-sky)]">제작 사례</Link>
          <Link href="/faq" className="shrink-0 text-[var(--color-charcoal)]/80 hover:text-[var(--color-sky)]">자주 묻는 질문</Link>
          <Link href="/order-lookup" className="shrink-0 text-[var(--color-charcoal)]/80 hover:text-[var(--color-sky)]">나의 주문</Link>
        </nav>
      </header>

      {/* 히어로 */}
      <section className="relative">
        {/* 모바일 전용: 이미지를 화면 끝까지 꽉 채우고, 하단에 어두운 그라데이션 스크림을 깔아 그 위에 문구를 얹는 스타일 */}
        <div className="relative h-[500px] w-full overflow-hidden sm:hidden">
          <img
            src="/hero/keepic-hero-2.png"
            alt="테이블 위에 펼쳐진 Keepic 포토북"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 from-0% via-black/25 via-45% to-transparent to-75%" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-20">
            <h1 className="break-keep text-3xl font-semibold leading-tight text-white">
              사진 속 순간을,
              <br />
              한 권의 추억으로.
            </h1>
            <p className="mt-3 break-keep text-sm leading-relaxed text-white/85">
              사진을 올려주시면 디자이너가 직접 편집해
              <br />
              나만의 포토북으로 완성해드려요.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <Link
                href="/order"
                className="rounded-full bg-[var(--color-sky)] px-5 py-2.5 text-xs font-medium text-white transition hover:opacity-90"
              >
                포토북 제작 신청
              </Link>
              <a
                href="#samples"
                className="text-xs text-white underline decoration-white/50 underline-offset-4 hover:text-white/80"
              >
                디자인 샘플 보기
              </a>
            </div>
          </div>
        </div>

        {/* sm 이상(태블릿·PC): 이미지 위에 왼쪽 정렬 문구를 얹는 기존 방식 */}
        <div className="relative hidden overflow-hidden sm:block sm:h-[380px] md:h-[430px] lg:h-[500px] xl:h-[560px]">
          <img
            src="/hero/keepic-hero-2.png"
            alt="테이블 위에 펼쳐진 Keepic 포토북"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ivory)] from-10% via-[var(--color-ivory)]/70 via-30% to-transparent to-55%" />
        </div>

        <div className="absolute inset-0 hidden items-center sm:flex">
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10">
            <div className="max-w-md">
              <h1 className="break-keep text-4xl font-semibold leading-tight lg:text-5xl xl:text-6xl">
                사진 속 순간을,
                <br />
                한 권의 추억으로.
              </h1>
              <p className="mt-6 max-w-sm break-keep text-lg leading-relaxed text-[var(--color-charcoal)]/80">
                사진을 올려주시면 디자이너가 직접 편집해
                <br />
                나만의 포토북으로 완성해드려요.
              </p>
              <div className="mt-10 flex items-center gap-6">
                <Link
                  href="/order"
                  className="rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                  포토북 제작 신청
                </Link>
                <a
                  href="#samples"
                  className="text-sm underline decoration-[var(--color-hairline)] underline-offset-4 hover:text-[var(--color-sky)]"
                >
                  디자인 샘플 보기
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 이용 과정 3단계 */}
      <section className="mx-auto max-w-[1100px] px-6 pb-20 pt-20 sm:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          {steps.map((step) => (
            <div key={step.n} className="flex items-center gap-5 sm:block">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-sky)]/10 to-[var(--color-ivory)] shadow-[0_10px_30px_-10px_rgba(45,55,72,0.2)] sm:aspect-square sm:h-auto sm:w-full sm:rounded-3xl">
                {step.img ? (
                  <img
                    src={step.img}
                    alt={step.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-charcoal)]/40">
                    준비 중
                  </div>
                )}
              </div>
              <div className="sm:mt-4">
                <span className="text-xs font-medium text-[var(--color-sky)]">
                  {step.n}
                </span>
                <p className="mt-1 text-base font-medium sm:text-lg">{step.title}</p>
                <p className="mt-1 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/60">
                  {step.desc.split("\n").map((line, i) => (
                    <Fragment key={i}>
                      {i > 0 && <br />}
                      {line}
                    </Fragment>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 디자인 샘플 */}
      <section id="samples" className="mx-auto max-w-7xl scroll-mt-8 px-6 pb-20 sm:px-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">디자인 샘플</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              표지부터 내지까지, 취향을 담은 포토북
            </h2>
          </div>
          <Link
            href="/cases"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            제작 사례 더 보기 →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { src: "/photobook/spreads-full/travel-collected-days.png", alt: "여행 포토북 전체 예시" },
            { src: "/photobook/spreads-full/baby-our-little-one.png", alt: "베이비 포토북 전체 예시" },
            { src: "/photobook/spreads-full/couple-our-kind-of-love.png", alt: "커플 포토북 전체 예시" },
            { src: "/photobook/spreads-full/family-autumn-story.png", alt: "가족 포토북 전체 예시 2" },
            { src: "/photobook/spreads-full/seaside-diary.png", alt: "여행 포토북 전체 예시 2" },
            { src: "/photobook/spreads-full/pet-golden-days.png", alt: "반려견 포토북 전체 예시" },
          ].map((img) => (
            <div
              key={img.src}
              className="overflow-hidden rounded-2xl border border-[var(--color-hairline)]"
            >
              <img src={img.src} alt={img.alt} className="w-full object-cover" />
            </div>
          ))}
        </div>

        <Link
          href="/cases"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          제작 사례 더 보기 →
        </Link>
      </section>

      {/* 제작 과정 */}
      <section className="mx-auto max-w-7xl px-6 pb-20 sm:px-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">제작 과정</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              이렇게 만들어드려요
            </h2>
          </div>
          <Link
            href="/guide"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            전체 과정 보기 →
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {processSteps.map((step, i) => (
            <div key={step.title}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-sky)]/15 text-sm font-medium text-[var(--color-sky)]">
                {i + 1}
              </div>
              <p className="mt-3 text-sm font-medium">{step.title}</p>
              <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        <Link
          href="/guide"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          전체 과정 보기 →
        </Link>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-6 pb-24 sm:px-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">자주 묻는 질문</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
              궁금하신 점이 있으신가요?
            </h2>
          </div>
          <Link
            href="/faq"
            className="hidden text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:block"
          >
            전체 질문 보기 →
          </Link>
        </div>

        <div className="mt-8 flex flex-col divide-y divide-[var(--color-hairline)] rounded-2xl border border-[var(--color-hairline)] bg-white">
          {miniFaqs.map((item) => (
            <details key={item.q} className="group p-5 open:pb-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium sm:text-base">
                {item.q}
                <span className="shrink-0 text-[var(--color-charcoal)]/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <Link
          href="/faq"
          className="mt-6 inline-block text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)] sm:hidden"
        >
          전체 질문 보기 →
        </Link>
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
