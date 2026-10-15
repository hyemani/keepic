"use client";

import type { CSSProperties } from "react";

// 사진이 아직 없는 칸의 "PHOTO" 자리표시예요(편집 화면 전용 — 미리보기·인쇄 PDF에는 안 그려져요).
// 42차: 이 칸을 누르는 것은 "선택"만 해요. 파일 선택창은 선택한 칸의 도구 막대 "사진 올리기"에서만 열려요.
// 키보드: Tab으로 들어와 Enter/Space로 선택(button 기본 동작)해요.
export function EmptyPhotoFrame({
  onSelect,
  style,
}: {
  onSelect: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      data-empty-photo-frame
      aria-label="빈 사진 칸 — 선택"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={style}
      className="absolute inset-0 flex cursor-default flex-col items-center justify-center gap-1 overflow-hidden [container-type:size] border border-dashed border-[var(--color-sky)]/40 bg-[var(--color-sky)]/10 text-[var(--color-sky)] transition hover:border-[var(--color-sky)] hover:bg-[var(--color-sky)]/15 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none"
    >
      {/* 46차: 작은 칸에서 글자가 칸 밖으로 잘려 보이지 않게 칸 크기에 맞춰 글자를 줄이고(cqmin), 아주 좁은 칸(28px 미만)에서는 숨겨요. */}
      <span
        className="max-w-full overflow-hidden whitespace-nowrap font-semibold tracking-[0.12em] @max-[28px]:hidden"
        style={{ fontSize: "clamp(6px, 22cqmin, 13px)" }}
      >
        PHOTO
      </span>
    </button>
  );
}
