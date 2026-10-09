"use client";

// 테두리 무늬 선택 버튼 — 글자 대신 "실제 무늬가 들어간 테두리" 그림이 보여요. 그림은 실제 사진 테두리와 똑같은 함수
// (lib/frameShapes.ts frameBorderMarks → borderPatternShapes)로 그린 작은 SVG라서, 눌러보기 전에도 어떻게 나올지 알 수 있고
// 지금 고른 테두리 색이 그대로 반영돼요. 무늬 이름은 마우스를 올리면 뜨는 설명(title)으로 보여줘요.

import { useMemo } from "react";
import {
  BORDER_PATTERN_BAND_ALPHA,
  borderPatternShapes,
  frameBorderMarks,
  frameOutlinePathD,
  type BorderPatternKey,
} from "@/lib/frameShapes";

// 가상의 사각형 사진(100×100, 테두리 두께 16)의 왼쪽 위 모서리를 확대해서 보여줘요(모서리 + 양쪽 변 무늬가 한눈에 보여요).
const THUMB_BOX = 100;
const THUMB_BAND = 18;
const THUMB_VIEW = 52;

export function BorderPatternSwatch({
  pattern,
  label,
  color,
  active,
  onClick,
}: {
  pattern: BorderPatternKey;
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const content = useMemo(() => {
    const d = frameOutlinePathD("rect", THUMB_BOX, THUMB_BOX, 0);
    const layout = pattern === "none" ? null : frameBorderMarks("rect", THUMB_BOX, THUMB_BOX, THUMB_BAND, 0, undefined, pattern);
    return { d, shapes: layout ? borderPatternShapes(pattern, layout) : [] };
  }, [pattern]);
  const clipId = `bps-${pattern}`;
  return (
    <button
      type="button"
      title={label}
      aria-label={`테두리 무늬: ${label}`}
      aria-pressed={active}
      data-border-pattern={pattern}
      onClick={onClick}
      className={`flex h-12 items-center justify-center border p-0.5 transition ${
        active ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)] hover:bg-[var(--color-ivory)]"
      }`}
    >
      <svg viewBox={`0 0 ${THUMB_VIEW} ${THUMB_VIEW}`} className="h-full w-full" aria-hidden>
        <defs>
          <clipPath id={clipId}>
            <path d={content.d} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={THUMB_BOX} height={THUMB_BOX} fill="#8d939c" />
        <path
          d={content.d}
          fill="none"
          stroke={color}
          strokeOpacity={pattern === "none" ? 1 : BORDER_PATTERN_BAND_ALPHA}
          strokeWidth={THUMB_BAND * 2}
          clipPath={`url(#${clipId})`}
        />
        {content.shapes.map((sh, i) =>
          "circle" in sh ? (
            <circle key={i} cx={sh.circle.cx} cy={sh.circle.cy} r={sh.circle.r} fill={color} />
          ) : (
            <polygon key={i} points={sh.poly.map((q) => `${+q.x.toFixed(2)},${+q.y.toFixed(2)}`).join(" ")} fill={color} />
          )
        )}
      </svg>
    </button>
  );
}
