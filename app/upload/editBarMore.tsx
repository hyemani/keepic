"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

// 44차: 편집 명령 바의 "더보기" 메뉴(바 폭 520px 미만에서 복사·잘라내기·붙여넣기·중앙맞춤을 묶어요).
// 43차 버전에서 손본 점: ① Esc는 메뉴만 닫고 캔버스 선택은 풀지 않아요(캡처 단계에서 가로채요)
// ② 닫히면(Esc·항목 실행) 포커스가 "더보기" 버튼으로 돌아와요 ③ 키보드: Enter로 열면 첫 활성 항목에 포커스,
// ↑↓·Home·End로 이동, Tab으로 메뉴 밖으로 나가면 닫혀요 ④ 항목은 바깥 버튼과 같은 높이·간격(btnClass 그대로).
export type EditBarMoreItem = { id: string; label: string; title: string; disabled: boolean; icon: string; onClick: () => void };

export function EditBarMoreMenu({
  items,
  btnClass,
  renderIcon,
}: {
  items: EditBarMoreItem[];
  btnClass: string;
  renderIcon: (name: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const focusFirstRef = useRef(false);
  const menuId = useId();
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => btnRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.("[data-edit-bar-more]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      close(true);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, close]);
  useEffect(() => {
    if (!open || !focusFirstRef.current) return;
    focusFirstRef.current = false;
    wrapRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [open]);
  const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    if (els.length === 0) return;
    e.preventDefault();
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? els.length - 1 : e.key === "ArrowDown" ? (i + 1) % els.length : (i <= 0 ? els.length : i) - 1;
    els[next]?.focus();
  };
  return (
    <div
      ref={wrapRef}
      data-edit-bar-more
      className="relative shrink-0"
      onBlur={(e) => {
        // 포커스가 이 묶음 밖으로 나가면(Tab 등) 닫아요. 마우스·터치로 바깥을 누른 경우는 위의 pointerdown이 처리해요.
        if (open && e.relatedTarget && !wrapRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        data-testid="edit-bar-more-button"
        title="더보기"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          // detail === 0: 키보드(Enter·Space)로 누른 경우 → 열릴 때 첫 항목으로 포커스
          if (!open && e.detail === 0) focusFirstRef.current = true;
          setOpen((v) => !v);
        }}
        className={btnClass}
      >
        <span aria-hidden="true">⋯</span>
        <span>더보기</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="더보기"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-0.5 flex min-w-[152px] flex-col gap-0.5 border border-[var(--color-hairline)] bg-white py-1 shadow-lg"
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              title={it.title}
              disabled={it.disabled}
              onClick={() => {
                it.onClick();
                close(true);
              }}
              className={`${btnClass} w-full justify-start`}
            >
              {renderIcon(it.icon)}
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
