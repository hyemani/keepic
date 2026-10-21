import { useEffect, useRef, useState } from "react";

// 61차: 폰 가상 키보드가 올라왔는지 알아내고, 그동안 편집 화면을 "키보드 위로 실제 보이는 영역"에 딱 붙여 주는 도구예요.
//
// 왜 필요해요? iPhone Safari는 키보드가 올라와도 페이지(레이아웃 뷰포트)의 크기를 안 줄여요. 대신 "실제로 보이는 영역"(visualViewport)만
// 작아지고, 글 입력칸이 보이게 페이지를 위로 밀어 올려요. 그래서 편집 화면이 보이는 영역 높이로 줄어든 채 위쪽 대부분이 화면 밖으로 밀려서
// 겨우 한 뼘만 남아 보였어요. 이 훅이 그 "보이는 영역"의 위치·크기(위/왼쪽/폭/높이)를 알려주면, 편집 화면(<main>)을 그 자리에 고정(position: fixed)해서
// 키보드 바로 위 남는 자리 전체를 편집기가 써요. 키보드가 내려가면 원래 배치로 돌아가요.
//
// 판단 기준(오탐을 줄이려고 둘 다 필요해요):
//  · 보이는 높이가 "기준 높이"보다 100px 넘게 줄었고(차이가 60px 밑으로 돌아오면 닫힘 — 히스테리시스),
//  · 편집기 안의 입력칸(input·textarea·글 직접 입력)에 포커스가 있을 때.
//  기준 높이 = 창 높이와, 이 방향에서 본 visualViewport 높이의 최댓값. Safari 주소창이 나왔다 들어가는 정도(약 50~80px)는 키보드로 안 봐요.
// 안드로이드(Chrome)는 키보드가 열리면 창 높이 자체가 줄어드는데, 기준 높이를 따로 기억해 두니 같은 방식으로 잡혀요.
// 마우스 PC·태블릿(폰 크기가 아닌 화면)에서는 enabled=false라 아무것도 하지 않아요.

export type SoftKeyboardState = {
  open: boolean;
  /** 키보드 위로 실제 보이는 영역(레이아웃 뷰포트 기준 px). open일 때만 의미가 있어요. */
  top: number;
  left: number;
  width: number;
  height: number;
  /** 키보드가 가린 높이(px) */
  covered: number;
};

const CLOSED: SoftKeyboardState = { open: false, top: 0, left: 0, width: 0, height: 0, covered: 0 };
const OPEN_AT = 100;
const CLOSE_AT = 60;

/** 글자를 칠 수 있는 칸(키보드를 부르는 요소)인지 */
export function isTextEntryElement(el: Element | null): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  if (h.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return !(el as HTMLTextAreaElement).readOnly;
  if (tag === "INPUT") {
    const t = ((el as HTMLInputElement).type || "text").toLowerCase();
    return !["checkbox", "radio", "range", "color", "file", "button", "submit", "reset", "image", "hidden"].includes(t) && !(el as HTMLInputElement).readOnly;
  }
  return false;
}

/**
 * enabled가 true일 때만(폰 + 편집 화면) 동작해요.
 * 키보드가 열려 있는 동안: <html data-kb="open">, CSS 변수 --app-top/--app-left/--app-kb, 문서 스크롤 잠금.
 * 닫히면 전부 원래대로 돌려놔요.
 */
export function useSoftKeyboard(enabled: boolean): SoftKeyboardState {
  const [state, setState] = useState<SoftKeyboardState>(CLOSED);
  const stateRef = useRef<SoftKeyboardState>(CLOSED);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const body = document.body;
    let baseH = 0;
    let baseW = 0;
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimers: ReturnType<typeof setTimeout>[] = [];
    let prevHtmlOverflow = "";
    let prevBodyOverflow = "";
    let locked = false;

    const set = (next: SoftKeyboardState) => {
      const cur = stateRef.current;
      if (cur.open === next.open && cur.top === next.top && cur.left === next.left && cur.width === next.width && cur.height === next.height) return;
      stateRef.current = next;
      setState(next);
    };

    const lock = (s: SoftKeyboardState) => {
      if (!locked) {
        locked = true;
        prevHtmlOverflow = root.style.overflow;
        prevBodyOverflow = body.style.overflow;
        root.style.overflow = "hidden";
        body.style.overflow = "hidden";
        root.setAttribute("data-kb", "open");
      }
      root.style.setProperty("--app-top", `${s.top}px`);
      root.style.setProperty("--app-left", `${s.left}px`);
      root.style.setProperty("--app-kb", `${s.covered}px`);
      // iOS가 입력칸을 보여준다고 문서를 밀어 올리면 되돌려요(편집 화면은 보이는 영역에 고정돼 있어서 문서 스크롤이 필요 없어요).
      if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const unlock = () => {
      if (!locked) return;
      locked = false;
      root.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      root.removeAttribute("data-kb");
      root.style.removeProperty("--app-top");
      root.style.removeProperty("--app-left");
      root.style.removeProperty("--app-kb");
    };

    const measure = () => {
      try {
        const vv = window.visualViewport;
        const scale = vv && vv.scale > 0 ? vv.scale : 1;
        const vh = (vv?.height ?? window.innerHeight) * scale;
        const vw = (vv?.width ?? window.innerWidth) * scale;
        const iw = window.innerWidth;
        // 회전(폭 변화)이면 기준 높이를 새로 시작해요 → 키보드 상태도 일단 풀고 다시 판단해요(멈춘 확대·고정이 남지 않게).
        if (Math.abs(iw - baseW) > 1) {
          baseW = iw;
          baseH = Math.max(window.innerHeight, vh);
          if (stateRef.current.open) {
            unlock();
            set(CLOSED);
          }
        }
        const focused = isTextEntryElement(document.activeElement);
        const wasOpen = stateRef.current.open;
        // 키보드가 없을 때만 기준 높이를 키워요(주소창이 접히면 커지고, 키보드가 가렸을 땐 그대로).
        if (!wasOpen) baseH = Math.max(baseH, window.innerHeight, vh);
        const shrunk = baseH - vh;
        let nowOpen = wasOpen;
        if (!wasOpen) nowOpen = focused && shrunk > OPEN_AT;
        else if (shrunk < CLOSE_AT) nowOpen = false;
        if (nowOpen && !focused) {
          // 포커스가 잠깐 다른 칸으로 옮겨가는 중일 수 있어서 조금 기다렸다가 닫아요(키보드가 내려가는 애니메이션 동안 화면이 튀지 않게 유지).
          if (!blurTimer) {
            blurTimer = setTimeout(() => {
              blurTimer = null;
              if (!isTextEntryElement(document.activeElement)) {
                unlock();
                set(CLOSED);
              }
            }, 700);
          }
        } else if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
        if (nowOpen) {
          const next: SoftKeyboardState = {
            open: true,
            top: Math.max(0, Math.round(vv?.offsetTop ?? 0)),
            left: Math.max(0, Math.round(vv?.offsetLeft ?? 0)),
            width: Math.round(vw),
            height: Math.round(vh),
            covered: Math.max(0, Math.round(baseH - vh)),
          };
          lock(next);
          set(next);
        } else if (wasOpen) {
          unlock();
          set(CLOSED);
        }
      } catch {
        unlock();
        set(CLOSED);
      }
    };

    const kick = () => {
      measure();
      // iOS는 키보드 애니메이션이 끝날 때까지 크기를 여러 번 알려줘서, 끝난 뒤 값으로 한 번 더 맞춰요.
      settleTimers.forEach(clearTimeout);
      settleTimers = [120, 350].map((ms) => setTimeout(measure, ms));
    };

    measure();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", kick);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", kick);
    window.addEventListener("orientationchange", kick);
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("focusin", kick);
    document.addEventListener("focusout", kick);
    return () => {
      vv?.removeEventListener("resize", kick);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", kick);
      window.removeEventListener("orientationchange", kick);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("focusin", kick);
      document.removeEventListener("focusout", kick);
      if (blurTimer) clearTimeout(blurTimer);
      settleTimers.forEach(clearTimeout);
      unlock();
      stateRef.current = CLOSED;
      setState(CLOSED);
    };
  }, [enabled]);

  return enabled ? state : CLOSED;
}
