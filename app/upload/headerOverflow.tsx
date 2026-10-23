"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { mediaMatches, subscribeMedia } from "@/lib/rotatedShell";

// 44차: 편집기 상단바 "더보기" — 폭이 아주 좁을 때(768px 미만) 덜 급한 항목(화면 배율·인쇄 미리보기·저장 상태 글자)을
// 한 메뉴로 묶어요. 저장·다음은 절대 여기로 들어가지 않고 항상 바깥에 보여요. 768px 이상에서는 이 버튼 자체가 안 보여서
// (md:hidden) 예전 상단바와 똑같아요. 항목들은 메뉴를 열었을 때만 그려서 화면 안에 같은 입력칸이 두 개 생기지 않아요.
// 닫기: 버튼 다시 누르기·Esc·바깥 누르기 — 닫히면 포커스는 "더보기" 버튼으로 돌아와요.
// 58차: alwaysShow = 폰 가로 화면에서는 폭이 768px 이상이어도 "···"를 보여줘요(상단바를 없앤 자리에 배율 등을 묶어요). 기본(false)은 예전 그대로예요.
// 60차: panelClassName = 폰 가로 편집처럼 메뉴가 길 때 폭·최대 높이를 바꾸는 용도예요(없으면 예전 그대로).
export function HeaderMoreMenu({ children, alwaysShow = false, panelClassName }: { children: ReactNode; alwaysShow?: boolean; panelClassName?: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popId = useId();
  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) requestAnimationFrame(() => btnRef.current?.focus());
  }, []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.("[data-header-more]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    // 창이 넓어져 이 버튼이 사라지면(768px 이상) 열린 메뉴도 같이 닫아요.
    // 67차: 가로 고정(시험판)으로 돌려 보여주는 중에는 가상(눕힌) 화면 폭 기준(mediaMatches/subscribeMedia)이에요.
    const onMq = () => {
      if (mediaMatches("(min-width: 768px)") && !alwaysShow) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    const unMq = subscribeMedia("(min-width: 768px)", onMq);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      unMq();
    };
  }, [open, close, alwaysShow]);
  return (
    <div data-header-more className={`relative shrink-0 ${alwaysShow ? "" : "md:hidden"}`}>
      <button
        ref={btnRef}
        type="button"
        data-testid="header-more-button"
        title="더보기"
        aria-label="더보기"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 min-w-11 items-center justify-center gap-1 border border-[var(--color-hairline)] bg-white px-2 text-xs font-medium text-[var(--color-charcoal)]/80 transition hover:bg-[var(--color-ivory)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] ph:relative ph:h-9 ph:w-9 phl:h-8! phl:w-8! ph:min-w-0 ph:border-0 ph:bg-transparent ph:px-0 ph:text-lg ph:leading-none ph:text-[var(--color-charcoal)] ph:after:absolute ph:after:-inset-y-1 ph:after:inset-x-0 phl:after:-inset-1.5 ph:after:content-[''] motion-reduce:transition-none"
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div
          id={popId}
          role="group"
          aria-label="더보기"
          data-testid="header-more-panel"
          className={`absolute right-0 top-full z-50 mt-1 flex w-[240px] max-w-[calc(100vw-16px)] flex-col gap-2 border border-[var(--color-hairline)] bg-white p-2 shadow-lg ${panelClassName ?? ""}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// 상단바 화면 배율 묶음(− 입력칸 +). 상단바 본문과 "더보기" 메뉴에서 똑같이 쓰려고 하나로 뺐어요(데스크톱 모양 그대로).
// 테두리를 레이아웃에서 빼고(border-0) 같은 자리에 안쪽 외곽선으로 그려서, 안의 −/+ 버튼이 실제로 44px 높이를 써요.
const COARSE_H =
  "max-lg:h-11 max-lg:border-0 max-lg:outline max-lg:outline-1 max-lg:-outline-offset-1 max-lg:outline-[var(--color-hairline)] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:border-0 [@media(pointer:coarse)]:outline [@media(pointer:coarse)]:outline-1 [@media(pointer:coarse)]:-outline-offset-1 [@media(pointer:coarse)]:outline-[var(--color-hairline)]";
const ZOOM_BTN =
  "flex h-full items-center px-2 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] max-lg:min-w-11 max-lg:justify-center [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center motion-reduce:transition-none";
export function HeaderZoomGroup({
  onZoomOut,
  onZoomIn,
  field,
  className = "",
}: {
  onZoomOut: () => void;
  onZoomIn: () => void;
  field: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-8 items-center gap-1 border border-[var(--color-hairline)] bg-white px-1.5 text-xs ${COARSE_H} ${className}`}>
      <button type="button" onClick={onZoomOut} title="축소 (Ctrl+-)" aria-label="축소" className={ZOOM_BTN}>
        −
      </button>
      {field}
      <button type="button" onClick={onZoomIn} title="확대 (Ctrl+=)" aria-label="확대" className={ZOOM_BTN}>
        +
      </button>
    </div>
  );
}
