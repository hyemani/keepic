import { useEffect, useSyncExternalStore } from "react";
import { isTextEntryElement } from "./softKeyboard";

// 터치 기기(폰·태블릿) 편집 지원용 작은 도구 모음(57차). 데스크톱(마우스)에서는 전부 "해당 없음"으로 나와서
// 예전 화면·동작이 그대로예요.

function makeMediaHook(query: string) {
  const subscribe = (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
  return () =>
    useSyncExternalStore(
      subscribe,
      () => window.matchMedia(query).matches,
      () => false
    );
}

/** 손가락이 주 입력 장치인 기기(폰·태블릿)인지. 마우스 PC는 false. */
export const useCoarsePointer = makeMediaHook("(pointer: coarse)");
/** 화면이 세로인지(높이 > 폭). */
export const usePortrait = makeMediaHook("(orientation: portrait)");
/** 짧은 쪽이 600px 미만(폰 크기)인지 — 폭·높이 중 작은 쪽 기준이라 가로로 눕혀도 폰으로 봐요. */
export const useShortSide600 = makeMediaHook("(max-width: 599.98px), (max-height: 599.98px)");

export type TouchLayout = {
  coarse: boolean;
  /** 손가락 + 폰 크기 화면 */
  phone: boolean;
  /** 폰이 세로로 서 있음 → 편집 모드에서는 가로 안내를 보여줘요 */
  phonePortrait: boolean;
  /** 폰이 가로로 누워 있음 → 위아래 공간이 적어서 도구를 컴팩트하게 */
  phoneLandscape: boolean;
};

// 57차(2): 실제 iPhone Safari에서는 "미디어쿼리 하나"만 믿으면 어긋날 수 있어서(회전 직후 크기가 옛날 값으로 남음,
// screen.orientation 없음, 주소창 때문에 높이가 계속 바뀜) 여러 신호를 함께 보고, 회전·크기 변화 뒤에도 몇 번 더 다시 재요.
// 비트: 1=손가락 기기, 2=폰 크기, 4=세로.
const MOBILE_UA = /iPhone|iPod|Android.*Mobile|Mobile.*Android/i;

let lastPortraitRead = { w: 0, portrait: false, known: false };

function readPhoneBits(): number {
  if (typeof window === "undefined") return 0;
  const mm = (q: string) => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };
  // 손가락 기기: pointer: coarse 이거나(대부분), 폰 UA(iPhone 등)이면서 마우스 기기가 아닐 때.
  const coarse = mm("(pointer: coarse)") || (MOBILE_UA.test(navigator.userAgent) && !mm("(hover: hover) and (pointer: fine)"));
  // 폰 크기: 화면(screen) 짧은 쪽 또는 지금 창 짧은 쪽이 600px 미만. iOS는 screen.width/height가 회전해도 안 바뀌어서 min()으로 봐요.
  const vv = window.visualViewport;
  const iw = Math.round(vv?.width ?? window.innerWidth) || window.innerWidth;
  const ih = Math.round(vv?.height ?? window.innerHeight) || window.innerHeight;
  const screenShort = Math.min(window.screen?.width || 9999, window.screen?.height || 9999);
  const winShort = Math.min(iw || 9999, ih || 9999, window.innerWidth || 9999, window.innerHeight || 9999);
  // 폭이 넉넉한 태블릿(820x1180 등)은 화면 짧은 쪽도 창 짧은 쪽도 600 이상이라 폰이 아니에요.
  const phone = coarse && (screenShort < 600 || winShort < 600);
  // 세로 = 창 높이가 폭 이상. (orientation 미디어쿼리와 같은 뜻인데, iOS는 회전 직후 쿼리가 늦게 갱신될 수 있어서 실제 크기로 봐요.)
  let portrait = window.innerWidth > 0 && window.innerHeight > 0 ? window.innerHeight >= window.innerWidth : mm("(orientation: portrait)");
  // 64차: 글 칸에 포커스가 있는 동안(키보드가 높이를 줄여 알려줄 수 있어요) 폭이 그대로면 방향이 바뀐 게 아니라서 직전 판단을 그대로 써요.
  const focusedEntry = isTextEntryElement(document.activeElement);
  if (focusedEntry && lastPortraitRead.w === window.innerWidth && lastPortraitRead.known) portrait = lastPortraitRead.portrait;
  else lastPortraitRead = { w: window.innerWidth, portrait, known: true };
  return (coarse ? 1 : 0) | (phone ? 2 : 0) | (portrait ? 4 : 0);
}

function subscribePhoneBits(cb: () => void) {
  const timers: ReturnType<typeof setTimeout>[] = [];
  // iOS는 회전/주소창 변화 직후 크기를 옛날 값으로 알려주는 일이 있어서, 이벤트 뒤에 짧게 몇 번 더 다시 재요.
  const kick = () => {
    cb();
    [120, 350, 800].forEach((ms) => timers.push(setTimeout(cb, ms)));
  };
  const mqs = ["(pointer: coarse)", "(orientation: portrait)", "(max-width: 599.98px)", "(max-height: 599.98px)"].map((q) => window.matchMedia(q));
  mqs.forEach((m) => m.addEventListener("change", kick));
  window.addEventListener("resize", kick);
  window.addEventListener("orientationchange", kick);
  window.visualViewport?.addEventListener("resize", kick);
  return () => {
    mqs.forEach((m) => m.removeEventListener("change", kick));
    window.removeEventListener("resize", kick);
    window.removeEventListener("orientationchange", kick);
    window.visualViewport?.removeEventListener("resize", kick);
    timers.forEach(clearTimeout);
  };
}

export function useTouchLayout(): TouchLayout {
  const bits = useSyncExternalStore(subscribePhoneBits, readPhoneBits, () => 0);
  const coarse = (bits & 1) !== 0;
  const phone = (bits & 2) !== 0;
  const portrait = (bits & 4) !== 0;
  return { coarse, phone, phonePortrait: phone && portrait, phoneLandscape: phone && !portrait };
}

/** iPhone·iPad(Safari 계열)인지. iPadOS는 Mac처럼 보여서 터치 점 개수로도 봐요. */
export function isIOSLike(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/**
 * 손가락 기기에서 "지금 실제로 보이는 높이"를 CSS 변수(--app-vh, --app-vw)로 알려줘요.
 * iOS Safari는 주소창·도구막대가 나왔다 들어갔다 하면서 100vh/innerHeight가 실제와 달라지는데,
 * visualViewport(진짜로 보이는 영역)는 그걸 따라가요. 핀치로 페이지가 확대돼 있으면 배율(scale)로 보정해서 레이아웃 높이로 돌려놔요.
 * 마우스 PC에서는 아무것도 안 해서(변수를 안 만들어요) 예전 화면 그대로예요.
 */
export function useVisualViewportVars(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const apply = () => {
      const vv = window.visualViewport;
      const scale = vv?.scale && vv.scale > 0 ? vv.scale : 1;
      const h = Math.round((vv?.height ?? window.innerHeight) * scale);
      const w = Math.round((vv?.width ?? window.innerWidth) * scale);
      if (h > 0) root.style.setProperty("--app-vh", `${h}px`);
      if (w > 0) root.style.setProperty("--app-vw", `${w}px`);
    };
    const kick = () => {
      apply();
      // 회전 직후 iOS는 옛날 크기를 알려주는 일이 있어서 몇 번 더 재요.
      [120, 350, 800].forEach((ms) => timers.push(setTimeout(apply, ms)));
    };
    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", kick);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", kick);
    window.addEventListener("orientationchange", kick);
    return () => {
      vv?.removeEventListener("resize", kick);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", kick);
      window.removeEventListener("orientationchange", kick);
      timers.forEach(clearTimeout);
      root.style.removeProperty("--app-vh");
      root.style.removeProperty("--app-vw");
    };
  }, [enabled]);
}

/**
 * 64차: 가로로 눕힌 iPhone(노치·다이내믹 아일랜드)은 env(safe-area-inset-left/right)를 "양쪽 모두 노치 쪽 값"으로 알려주는 경우가 있어서,
 * 그대로 쓰면 노치 반대쪽이 쓸데없이 비어요. 양쪽 값이 (거의) 같을 때만 window.orientation으로 노치가 있는 쪽을 알아내
 * <html data-notch="left|right">로 표시하면, globals.css가 반대쪽 여백을 10px 이하로 줄여요.
 * window.orientation: 90 = 폰을 시계 반대 방향으로 눕힘(노치 왼쪽), -90 = 시계 방향(노치 오른쪽). 값이 없거나 양쪽이 다르면(이미 정확함) 아무것도 안 해요.
 * 점검: <html data-notch>, window.__keepicSafeArea로 확인해요.
 */
export function useNotchSide(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
    document.body.appendChild(probe);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const apply = () => {
      try {
        const cs = getComputedStyle(probe);
        const l = parseFloat(cs.paddingLeft) || 0;
        const r = parseFloat(cs.paddingRight) || 0;
        const ori = (window as unknown as { orientation?: number }).orientation;
        const landscape = window.innerWidth > window.innerHeight;
        if (landscape && l > 0 && r > 0 && Math.abs(l - r) <= 2 && (ori === 90 || ori === -90)) {
          root.setAttribute("data-notch", ori === 90 ? "left" : "right");
        } else {
          root.removeAttribute("data-notch");
        }
        // 점검용(화면에는 안 나와요): 마지막으로 잰 안전 영역 값과 판단
        (window as unknown as { __keepicSafeArea?: unknown }).__keepicSafeArea = { l, r, orientation: ori ?? null, landscape, notch: root.getAttribute("data-notch"), t: Date.now() };
      } catch {
        root.removeAttribute("data-notch");
      }
    };
    const kick = () => {
      apply();
      [120, 400, 900].forEach((ms) => timers.push(setTimeout(apply, ms)));
    };
    apply();
    window.addEventListener("resize", kick);
    window.addEventListener("orientationchange", kick);
    return () => {
      window.removeEventListener("resize", kick);
      window.removeEventListener("orientationchange", kick);
      timers.forEach(clearTimeout);
      probe.remove();
      root.removeAttribute("data-notch");
    };
  }, [enabled]);
}

/** 두 손가락 사이 거리 */
export function touchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** 이 요소(또는 부모)가 "끌어서 옮기는" 요소인지 — 커서가 move/grab/resize 계열이면 그렇다고 봐요(마우스용 스타일을 재활용). */
export function isDragTarget(el: Element | null): boolean {
  if (!el) return false;
  const c = getComputedStyle(el).cursor;
  return /move|grab|resize/.test(c);
}

/** screen.orientation.lock은 대부분(특히 iOS)에서 안 되니까, 되면 좋고 안 되면 조용히 넘어가요. */
export async function tryLockLandscape(): Promise<boolean> {
  try {
    const o = (screen as unknown as { orientation?: { lock?: (t: string) => Promise<void> } }).orientation;
    if (!o?.lock) return false;
    await o.lock("landscape");
    return true;
  } catch {
    return false;
  }
}
export function tryUnlockOrientation() {
  try {
    (screen as unknown as { orientation?: { unlock?: () => void } }).orientation?.unlock?.();
  } catch {
    /* 무시 */
  }
}
