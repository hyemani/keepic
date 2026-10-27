import type { CSSProperties } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { FONT_CANDIDATES } from "./fonts";

const TITLE = "우리의 이야기가 앨범이 되는 순간";
const LINE2 = "사진을 고르면 한 권의 포토북으로 만들어 드려요";
const BUTTON = "사진 고르기";

// 같은 문구를 글꼴만 바꿔서 나란히 보여주는 비교 화면이에요. 밝은 배경/어두운 배경 둘 다 보여요.
export default function FontsDraftPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-8">
        <h1 className="text-2xl font-extrabold break-keep">제목 글꼴 후보 6가지</h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed break-keep text-[var(--color-charcoal)]/80">
          같은 문구를 글꼴만 바꿔서 보여드려요. 왼쪽은 밝은 배경, 오른쪽은 어두운 배경이에요. 큰 제목 크기와 본문 크기를 모두 볼 수 있어요.
          아래 글꼴은 모두 구글 폰트이고 <b>SIL Open Font License 1.1</b>이라서 상업 서비스에 무료로 쓸 수 있어요(글꼴 파일 자체를 단독으로 파는 것만 금지).
          정식으로 쓰기 전에 각 글꼴 소개 페이지에서 라이선스를 한 번 더 확인해 주세요.
        </p>
        <p className="mt-2 text-sm">
          <Link className="font-bold text-[var(--color-sky)] underline underline-offset-4" href="/story-draft">
            스토리 시안 보러 가기 →
          </Link>
        </p>

        <div className="mt-10 flex flex-col gap-12">
          {FONT_CANDIDATES.map((f) => {
            const family = f.font.style.fontFamily;
            const style = { fontFamily: family, "--fs": f.scale } as CSSProperties;
            return (
              <section key={f.id} aria-labelledby={`f-${f.id}`} data-font={f.name} data-family={family}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 id={`f-${f.id}`} className="text-xl font-extrabold">
                    {f.name} <span className="text-base font-semibold text-[var(--color-charcoal)]/60">· {f.ko}</span>
                  </h2>
                  <span className="rounded-full border border-[var(--color-hairline)] px-2.5 py-0.5 text-xs font-bold">{f.weightLabel}</span>
                  <span className="rounded-full bg-[#E8F7EE] px-2.5 py-0.5 text-xs font-bold text-[#1B6B3F]">OFL 1.1 · 상업 사용 가능</span>
                </div>
                <p className="mt-1 text-sm break-keep text-[var(--color-charcoal)]/70">{f.feel}</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {(["light", "dark"] as const).map((mode) => (
                    <div
                      key={mode}
                      data-mode={mode}
                      className={`rounded-3xl p-6 sm:p-8 ${mode === "light" ? "bg-[#F6F3EC] text-[#2B2B5E]" : "bg-[#1F1F2B] text-[#F4F1FF]"}`}
                      style={style}
                    >
                      <p data-sample="title" className="break-keep leading-[1.12]" style={{ fontSize: `calc(clamp(2rem, 7.5vw, 3.6rem) * var(--fs))` }}>
                        {TITLE}
                      </p>
                      <p data-sample="line2" className="mt-3 break-keep leading-snug" style={{ fontSize: `calc(1.25rem * var(--fs))` }}>
                        {LINE2}
                      </p>
                      <p data-sample="body" className="mt-4 break-keep leading-relaxed opacity-90" style={{ fontSize: `calc(1rem * var(--fs))` }}>
                        본문 크기 · {LINE2}. 사진 한 장 한 장이 자리를 찾아 앨범이 완성돼요.
                      </p>
                      <span
                        data-sample="button"
                        className={`mt-5 inline-flex min-h-12 items-center rounded-full px-7 ${mode === "light" ? "bg-[#2B2B5E] text-white" : "bg-[#FFE45E] text-[#2B2B5E]"}`}
                        style={{ fontSize: `calc(1.25rem * var(--fs))` }}
                      >
                        {BUTTON}
                      </span>
                      <p className="mt-4 text-[11px] font-sans opacity-60">{mode === "light" ? "밝은 배경" : "어두운 배경"}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--color-charcoal)]/60">
                  <a className="underline underline-offset-2" href={`https://fonts.google.com/specimen/${f.page}`} target="_blank" rel="noopener noreferrer">
                    구글 폰트에서 보기 · 라이선스 확인
                  </a>
                </p>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
