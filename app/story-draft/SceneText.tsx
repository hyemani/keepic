import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** 진짜 시작 화면(상품 옵션 선택)으로 가는 길. 메인 페이지 배너가 쓰는 것과 같은 곳이에요. */
export const START_HREF = "/options?product=포토북";

/**
 * 글자가 하나씩 톡톡 튀어나오는 제목. 화면 낭독기에는 통째로 한 번만 읽히게 aria-label을 달고
 * 글자 조각은 aria-hidden으로 숨겨요. 단어 단위로 묶어서 줄바꿈이 단어 사이에서만 일어나요(keep-all).
 */
export function PopTitle({ text, as: Tag = "h2", id, accent }: { text: string; as?: "h1" | "h2"; id?: string; accent?: string }) {
  const words = text.split(" ");
  // 강조할 낱말(accent)이 있으면 그 글자들만 분홍색으로 칠해요.
  const a0 = accent ? text.indexOf(accent) : -1;
  const a1 = a0 >= 0 ? a0 + accent!.length : -1;
  let n = 0;
  return (
    <Tag className="st-title" id={id} aria-label={text}>
      {words.map((w, wi) => {
        const start = words.slice(0, wi).reduce((sum, x) => sum + x.length + 1, 0); // 이 낱말이 문장에서 시작하는 위치
        return (
        <span key={wi}>
          {wi > 0 ? " " : null}
          <span className="st-word" aria-hidden="true">
            {Array.from(w).map((ch, ci) => {
              const i = n++;
              const pos = start + ci;
              const hot = pos >= a0 && pos < a1;
              return (
                <span key={ci} className={hot ? "st-char st-acc" : "st-char"} style={{ "--i": i } as CSSProperties}>
                  {ch}
                </span>
              );
            })}
          </span>
        </span>
        );
      })}
    </Tag>
  );
}

export function SceneText({
  eyebrow,
  title,
  titleId,
  h1,
  accent,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  h1?: boolean;
  accent?: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <div className="st-text">
      <p className="st-eyebrow">{eyebrow}</p>
      <PopTitle text={title} as={h1 ? "h1" : "h2"} id={titleId} accent={accent} />
      <p className="st-sub">{sub}</p>
      {children}
    </div>
  );
}

export function StartButton({ label }: { label: string }) {
  return (
    <Link href={START_HREF} className="st-cta">
      <span>{label}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
