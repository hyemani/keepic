import Link from "next/link";
import type { ReactNode } from "react";

/** 진짜 시작 화면(상품 옵션 선택)으로 가는 길. 메인 페이지 배너가 쓰는 것과 같은 곳이에요. */
export const START_HREF = "/options?product=포토북";

/**
 * 제목: 항상 완성된 한 문장이에요. 글자별 효과 없이 통째로 보여요(들어올 때 제목 전체가 한 번 살짝 떠오르는 효과는 CSS가 맡아요).
 * 줄바꿈은 낱말 사이에서만(keep-all) 균형 있게 일어나요. 강조할 낱말(accent)만 분홍색이에요.
 */
export function StoryTitle({ text, as: Tag = "h2", id, accent }: { text: string; as?: "h1" | "h2"; id?: string; accent?: string }) {
  const a0 = accent ? text.indexOf(accent) : -1;
  return (
    <Tag className="st-title" id={id}>
      {a0 < 0 ? text : (
        <>
          {text.slice(0, a0)}
          <span className="st-acc">{accent}</span>
          {text.slice(a0 + accent!.length)}
        </>
      )}
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
  /** 설명 글: 뜻이 끊기는 곳마다 한 줄씩 배열로 주면 그 자리에서 줄을 바꿔요 */
  sub: string | string[];
  children?: ReactNode;
}) {
  return (
    <div className="st-text">
      <p className="st-eyebrow">{eyebrow}</p>
      <StoryTitle text={title} as={h1 ? "h1" : "h2"} id={titleId} accent={accent} />
      <p className="st-sub">
        {(Array.isArray(sub) ? sub : [sub]).map((line, i) => (
          <span key={i} className="st-subline">
            {i > 0 ? <br className="st-br" /> : null}
            {line}
          </span>
        ))}
      </p>
      {children}
    </div>
  );
}

export function StartButton({ label }: { label: string }) {
  return (
    <Link href={START_HREF} className="st-cta">
      <span>{label}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
