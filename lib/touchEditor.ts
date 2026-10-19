import { useSyncExternalStore } from "react";

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

export function useTouchLayout(): TouchLayout {
  const coarse = useCoarsePointer();
  const portrait = usePortrait();
  const shortSide = useShortSide600();
  // 폰 = 손가락 + (폭 600 미만이거나 높이 600 미만). 태블릿(820x1180 / 1180x820)은 둘 다 600 이상이라 제외돼요.
  const phone = coarse && shortSide;
  return { coarse, phone, phonePortrait: phone && portrait, phoneLandscape: phone && !portrait };
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
