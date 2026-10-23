"use client";

import { rotLockFlagOn, setRotLockEnabled, toggleRotLockFlip, useRotLockState } from "@/lib/rotatedShell";

// 67차(가로 고정 시험판): 돌려 보여주는 동안 화면에 뜨는 "시험판" 표시와, ··· 메뉴의 시험용 스위치 두 개예요.
// 주소에 ?rotlock=1 이 없으면 둘 다 아무것도 그리지 않아요.

/** 돌려 보여주는 동안 왼쪽 아래에 작게 뜨는 표시(손가락을 막지 않아요). */
export function RotLockBadge() {
  return (
    <div
      data-testid="rotlock-badge"
      role="status"
      className="pointer-events-none absolute bottom-1 left-[max(6px,var(--ed-l))] z-[100003] rounded-full bg-[var(--color-charcoal)]/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-white"
    >
      시험판
    </div>
  );
}

/** ··· 메뉴 "편집 방향" 아래에 붙는 시험용 줄: 가로 고정 켜기/끄기, 화면 위아래 바꾸기. */
export function RotLockMenuRows({ className }: { className: string }) {
  const st = useRotLockState();
  if (!rotLockFlagOn()) return null;
  return (
    <div data-testid="rotlock-rows" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 pr-1 text-xs text-[var(--color-charcoal)]/60">가로 고정</span>
        <button
          type="button"
          data-testid="rotlock-toggle"
          aria-pressed={st.enabled}
          onClick={() => setRotLockEnabled(!st.enabled)}
          className={`${className} flex-1 ${st.enabled ? "!border-[var(--color-charcoal)] !bg-[var(--color-charcoal)] !text-white" : ""}`}
        >
          가로 고정(시험) {st.enabled ? "켜짐" : "꺼짐"}
        </button>
      </div>
      <button type="button" data-testid="rotlock-flip" aria-pressed={st.flip} onClick={() => toggleRotLockFlip()} className={className}>
        화면 위아래 바꾸기
      </button>
    </div>
  );
}
