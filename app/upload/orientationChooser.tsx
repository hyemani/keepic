"use client";

import { useEffect, useRef } from "react";

// 66차: 폰에서 "편집하기"를 눌렀을 때 처음 한 번 보여주는 선택창과, "가로로 편집"을 골랐는데 아직 폰이 세로일 때 보여주는 짧은 안내예요.
// (예전의 "휴대폰을 가로로 돌려주세요" 전체 화면 안내와 왼쪽 아래 작은 알림은 없앴어요 — 세로 편집이 잘 되니까 강요하지 않고, 고르게 해 드려요.)
// 웹 페이지는 폰을 억지로 돌릴 수 없어서, "가로로 편집"은 폰을 직접 돌리면 자동으로 시작돼요.

function PhoneGlyph({ landscape }: { landscape?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {landscape ? (
        <>
          <rect x="5" y="14" width="38" height="20" rx="4" />
          <path d="M37 22v4" />
        </>
      ) : (
        <>
          <rect x="14" y="5" width="20" height="38" rx="4" />
          <path d="M22 37h4" />
        </>
      )}
    </svg>
  );
}

const SHEET_BASE =
  "fixed inset-0 z-[80] flex items-end justify-center bg-black/40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 [@media(orientation:landscape)]:items-center";

export function EditOrientationChooser({ onPick, onClose }: { onPick: (v: "portrait" | "landscape") => void; onClose: () => void }) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const btn =
    "flex min-h-[104px] flex-1 flex-col items-center justify-center gap-2 border border-[var(--color-hairline)] bg-white px-3 py-4 text-[15px] font-medium text-[var(--color-charcoal)] transition active:bg-[var(--color-ivory)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none";
  return (
    <div className={SHEET_BASE} data-testid="edit-orient-chooser" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-orient-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[26rem] bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        <h2 id="edit-orient-title" className="text-center text-base font-medium text-[var(--color-charcoal)] break-keep">
          어떻게 편집할까요?
        </h2>
        <p className="mt-1 text-center text-xs text-[var(--color-charcoal)]/60 break-keep">나중에 ··· 메뉴의 &quot;편집 방향&quot;에서 바꿀 수 있어요</p>
        <div className="mt-3 flex gap-2">
          <button ref={firstRef} type="button" data-testid="edit-orient-portrait" onClick={() => onPick("portrait")} className={btn}>
            <PhoneGlyph />
            세로로 편집하기
          </button>
          <button type="button" data-testid="edit-orient-landscape" onClick={() => onPick("landscape")} className={btn}>
            <PhoneGlyph landscape />
            가로로 편집하기
          </button>
        </div>
      </div>
    </div>
  );
}

export function RotateToLandscapeHint({ onUsePortrait, onClose }: { onUsePortrait: () => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={SHEET_BASE} data-testid="edit-orient-wait" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-orient-wait-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[26rem] flex-col items-center gap-1 bg-white px-4 pb-2 pt-5 text-center shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        <div className="text-[var(--color-sky)] motion-safe:animate-[rotate-hint_2.4s_ease-in-out_infinite]">
          <PhoneGlyph />
        </div>
        <h2 id="edit-orient-wait-title" className="text-base font-medium text-[var(--color-charcoal)] break-keep">
          폰을 가로로 돌려주세요
        </h2>
        <p className="text-xs text-[var(--color-charcoal)]/60 break-keep">돌리면 바로 편집이 시작돼요</p>
        <button
          type="button"
          data-testid="edit-orient-use-portrait"
          onClick={onUsePortrait}
          className="mt-1 flex h-11 items-center justify-center px-4 text-sm text-[var(--color-charcoal)]/70 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-sky)]"
        >
          그냥 세로로 편집
        </button>
      </div>
    </div>
  );
}

// "편집 방향"을 편집 중에 ··· 메뉴에서 "가로"로 바꿨는데 폰이 아직 세로일 때 잠깐 뜨는 가벼운 안내예요(화면을 막지 않고, 돌리거나 몇 초 지나면 저절로 사라져요).
export function RotateToast() {
  return (
    <div data-testid="edit-orient-toast" role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(16px,calc(env(safe-area-inset-bottom)+8px))] z-[60] flex justify-center px-4">
      <div className="rounded-full bg-[var(--color-charcoal)]/90 px-4 py-2 text-[13px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.2)] break-keep">폰을 가로로 돌려주세요</div>
    </div>
  );
}

// ··· 메뉴 안 "편집 방향" 줄
export function EditOrientationMenuRow({ value, onChange, className }: { value: "portrait" | "landscape" | null; onChange: (v: "portrait" | "landscape") => void; className: string }) {
  const item = (v: "portrait" | "landscape", label: string) => (
    <button
      key={v}
      type="button"
      data-testid={`edit-orient-menu-${v}`}
      aria-pressed={value === v}
      onClick={() => onChange(v)}
      className={`${className} flex-1 ${value === v ? "!border-[var(--color-charcoal)] !bg-[var(--color-charcoal)] !text-white" : ""}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="편집 방향" data-testid="edit-orient-menu" className="flex items-center gap-1.5">
      <span className="shrink-0 pr-1 text-xs text-[var(--color-charcoal)]/60">편집 방향</span>
      {item("portrait", "세로")}
      {item("landscape", "가로")}
    </div>
  );
}
