"use client";

// "다음"을 눌렀는데 인쇄되는 곳에 빈 사진 칸이 남아 있을 때 뜨는 막는 안내창이에요(2026-10 34차).
// 넘어가기(진행) 버튼은 일부러 없어요 — 빈 칸을 채우거나 지워야만 다음으로 갈 수 있어요(lib/emptyPhotoSlots.ts가 세는 기준).
// 접근성: role="alertdialog" + 포커스 가두기 + Esc로 닫기 + 닫으면 "다음" 버튼으로 포커스 되돌리기. 뒤 화면은 안 움직여요(fixed 오버레이, 스크롤바 폭 변화 없음).
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { countEmptyPhotoSlots, type EmptySlotGroup } from "@/lib/emptyPhotoSlots";

const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]";
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function EmptySlotDialog({
  groups,
  cleanedCount,
  unusedPhotoCount = 0,
  onJump,
  onClean,
  onClose,
}: {
  groups: EmptySlotGroup[];
  cleanedCount: number | null; // 빈 칸 모두 지우기를 막 했으면 지운 칸 수(결과 안내 상태), 아니면 null
  unusedPhotoCount?: number; // 사진 목록에 아직 안 쓴 사진 수(있으면 "직접 넣을 수 있어요" 한 줄)
  onJump: (g: EmptySlotGroup) => void;
  onClean: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = countEmptyPhotoSlots(groups);
  const done = cleanedCount !== null;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.stopPropagation()}
      data-testid="empty-slot-dialog"
      data-empty-slot-total={total}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="empty-slot-title"
        aria-describedby="empty-slot-desc"
        className="flex max-h-[80vh] w-full max-w-[400px] flex-col border border-[var(--color-hairline)] bg-white shadow-xl"
      >
        <div className="border-b border-[var(--color-hairline)] px-4 py-3">
          <p id="empty-slot-title" className="text-[14px] font-semibold text-[var(--color-charcoal)]">
            {done ? "빈 칸을 지웠어요" : "비어 있는 사진 칸이 있어요"}
          </p>
          <p id="empty-slot-desc" className="mt-1 text-[12px] leading-snug text-[var(--color-charcoal)]/65 break-keep" role={done ? "status" : undefined}>
            {done
              ? `빈 칸 ${cleanedCount}개를 장식과 함께 지웠어요. 되돌리려면 실행취소(Ctrl+Z)를 눌러주세요.`
              : `빈 칸은 인쇄하면 그대로 비어 나와요. 모두 채우거나 지우면 다음으로 갈 수 있어요. (총 ${total}칸)`}
            {!done && unusedPhotoCount > 0 && <span data-empty-slot-hint className="mt-1 block">사진 목록에 남은 사진 {unusedPhotoCount}장을 빈 칸에 직접 넣을 수 있어요.</span>}
          </p>
        </div>
        {!done && (
          <ul className="min-h-0 flex-1 divide-y divide-[var(--color-hairline)] overflow-y-auto px-4" data-empty-slot-list>
            {groups.map((g) => (
              <li key={g.target.kind === "cover" ? `c-${g.target.side}` : `s-${g.target.index}`} className="flex items-center justify-between gap-3 py-2" data-empty-slot-row data-label={g.label} data-count={g.count}>
                <span className="text-[12px] text-[var(--color-charcoal)]">
                  {g.label} <span className="text-[var(--color-charcoal)]/50">· {g.count}칸</span>
                </span>
                <button
                  type="button"
                  data-testid="empty-slot-jump"
                  aria-label={`${g.label} 빈 칸으로 이동`}
                  onClick={() => onJump(g)}
                  className={`flex h-8 min-w-[52px] items-center justify-center border border-[var(--color-hairline)] px-2.5 text-[12px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] ${FOCUS_RING}`}
                >
                  이동
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-[var(--color-hairline)] px-4 py-3">
          {done ? (
            <span />
          ) : (
            <button
              type="button"
              data-testid="empty-slot-clean"
              title="사진이 든 칸은 그대로 두고, 빈 칸과 그 칸에만 딸린 장식을 지워요(실행취소 가능)"
              onClick={onClean}
              className={`flex h-9 items-center justify-center border border-[var(--color-charcoal)]/40 px-3 text-[12px] font-medium text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] ${FOCUS_RING}`}
            >
              빈 칸 모두 지우기
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            data-testid="empty-slot-close"
            onClick={onClose}
            className={`flex h-9 min-w-[72px] items-center justify-center bg-[var(--color-charcoal)] px-3 text-[12px] font-medium text-white transition hover:opacity-90 ${FOCUS_RING}`}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
