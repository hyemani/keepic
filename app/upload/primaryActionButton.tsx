"use client";

// 왼쪽 패널의 "진짜 실행 버튼"(사진 불러오기 / 사진 변경) 공통 부품이에요.
// 두 버튼이 크기·둥글기·그라데이션·그림자·글자 크기·안쪽 여백을 한 곳에서 같이 쓰게 해서,
// 한쪽만 슬쩍 달라지는 일이 없도록 해요(2026-11, 혜민님 요청: "사진 변경 버튼을 사진
// 불러오기 버튼과 똑같이"). 높이는 고정(h-9)이고 안쪽을 가운데 정렬(items-center)해서,
// 아이콘이 있든 없든 세로 중앙·높이가 똑같아요.
import type { ChangeEvent, ReactNode } from "react";

export const PRIMARY_ACTION_BUTTON_CLASS =
  "flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md " +
  "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-3 text-center text-xs font-semibold " +
  "leading-none text-white shadow-sm shadow-[var(--color-brand-purple)]/20 transition hover:opacity-90";

// 눌러서 바로 실행하는 버튼(예: 사진 변경 — 선택창 열기)이에요.
export function PrimaryActionButton({
  children,
  onClick,
  title,
  ariaLabel,
}: {
  children: ReactNode;
  onClick: () => void;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel}
      data-primary-action
      onClick={onClick}
      className={PRIMARY_ACTION_BUTTON_CLASS}
    >
      {children}
    </button>
  );
}

// 파일 선택창을 여는 버튼(예: 사진 불러오기)이에요 — 모양은 위 버튼과 똑같고, 안에 숨은 파일 입력만 있어요.
export function PrimaryFileButton({
  children,
  onFiles,
}: {
  children: ReactNode;
  onFiles: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label data-primary-action className={PRIMARY_ACTION_BUTTON_CLASS}>
      {children}
      <input type="file" accept="image/*" onChange={onFiles} className="hidden" />
    </label>
  );
}
