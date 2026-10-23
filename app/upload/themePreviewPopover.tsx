"use client";

// 앨범 테마 목록의 눈 아이콘 미리보기(내지 펼침면 3~4장)를 여닫는 동작과 창이에요. 화면 그리기(썸네일)는 designTemplatePanel.tsx가 해서 여기엔 안 넣었어요.
//  - 마우스: 눈 아이콘에 올리면 열리고, 눈 → 미리보기 창으로 마우스를 옮기는 동안(0.2초) 닫히지 않아요. 창 안에 있으면 계속 열려 있어요.
//  - 누르기/탭: 눈을 한 번 누르면 "고정"되어 열려 있고, 다시 누르거나 바깥을 누르거나 Esc를 누르면 닫혀요(마우스가 없는 화면도 이렇게 써요).
//  - 키보드: 눈은 진짜 버튼이라 Tab으로 가면(포커스) 열리고, Enter/Space로 고정, Esc로 닫혀요.
//  - 자리: 패널 바로 오른쪽, 화면 안(상단바 아래)에 항상 들어오게(lib/themePreviewLayout.ts).
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { computePreviewBox, type Rect } from "@/lib/themePreviewLayout";
import { virtualInner } from "@/lib/rotatedShell";

export const THEME_PREVIEW_ID = "album-theme-preview";
const CLOSE_DELAY_MS = 200;

type OpenState = { id: string; pinned: boolean; panel: Rect; anchor: Rect };
const toRect = (r: DOMRect): Rect => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });

export function useThemePreview() {
  const [open, setOpen] = useState<OpenState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const close = useCallback(() => {
    cancel();
    setOpen(null);
  }, [cancel]);
  const scheduleClose = useCallback(() => {
    cancel();
    timer.current = setTimeout(() => setOpen((o) => (o && !o.pinned ? null : o)), CLOSE_DELAY_MS);
  }, [cancel]);
  const openFor = useCallback(
    (id: string, btn: HTMLElement, pinned: boolean) => {
      cancel();
      const panelEl = btn.closest("[data-side-panel]");
      const anchor = toRect(btn.getBoundingClientRect());
      const panel = panelEl ? toRect(panelEl.getBoundingClientRect()) : anchor;
      setOpen((o) => ({ id, pinned: pinned || (o?.id === id && o.pinned), panel, anchor }));
    },
    [cancel]
  );
  useEffect(() => () => cancel(), [cancel]);
  // 열려 있는 동안: Esc · 바깥 누르기 · 스크롤/창 크기 바뀜 → 닫기
  const isOpen = open !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.(`#${THEME_PREVIEW_ID}, [data-album-theme-preview-btn]`)) return;
      close();
    };
    const onMove = () => close();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [isOpen, close]);
  const eyeHandlers = (id: string) => ({
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") openFor(id, e.currentTarget, false);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") scheduleClose();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.matches(":focus-visible")) openFor(id, e.currentTarget, false);
    },
    onBlur: () => scheduleClose(),
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      cancel();
      const btn = e.currentTarget;
      const anchor = toRect(btn.getBoundingClientRect());
      const panelEl = btn.closest("[data-side-panel]");
      const panel = panelEl ? toRect(panelEl.getBoundingClientRect()) : anchor;
      setOpen((o) => (o && o.id === id && o.pinned ? null : { id, pinned: true, panel, anchor }));
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") close();
    },
  });
  const popoverHandlers = { onPointerEnter: cancel, onPointerLeave: scheduleClose };
  return { open, close, eyeHandlers, popoverHandlers };
}

// 미리보기 창. children = 펼침면 썸네일들(2열). ratio = 펼침면 가로:세로.
export function ThemePreviewPopover({
  state,
  count,
  ratio,
  handlers,
  label,
  children,
}: {
  state: OpenState;
  count: number;
  ratio: number;
  handlers: { onPointerEnter: () => void; onPointerLeave: () => void };
  label: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (typeof document === "undefined") return null;
  const box = computePreviewBox({ panel: state.panel, anchor: state.anchor, vw: virtualInner().w, vh: virtualInner().h, count, ratio });
  return createPortal(
    <div
      id={THEME_PREVIEW_ID}
      role="region"
      aria-label={label}
      data-album-theme-popover={state.id}
      data-pinned={state.pinned ? "true" : "false"}
      {...handlers}
      className={`fixed z-[70] hidden border border-[var(--color-hairline)] bg-white p-2 shadow-xl lg:block motion-safe:transition-opacity motion-safe:duration-150 ${shown ? "opacity-100" : "opacity-0"}`}
      style={{ left: box.left, top: box.top, width: box.width }}
    >
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>,
    document.body
  );
}
