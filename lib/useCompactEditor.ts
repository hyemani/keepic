import { useEffect, useSyncExternalStore } from "react";
import { mediaMatches, subscribeMedia } from "./rotatedShell";

// 편집기 "좁은 화면(태블릿 세로 등, 폭 1024px 미만)" 판별 + 상세 패널을 캔버스 위에 띄우는(오버레이) 서랍 처리(43차).
// Tailwind의 lg(1024px)와 같은 기준이라, 그 이상(데스크톱·태블릿 가로 1024px~)은 예전 그대로예요.
const QUERY = "(max-width: 1023.98px)";

// 67차: 가로 고정(시험판)으로 돌려 보여주는 중에는 가상(눕힌) 화면 폭으로 판단해요(꺼져 있으면 예전과 똑같아요).
function subscribe(cb: () => void) {
  return subscribeMedia(QUERY, cb);
}
export function useCompactEditor(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => mediaMatches(QUERY),
    () => false
  );
}

// 서랍이 열려 있을 때: Esc 또는 왼쪽 메뉴·서랍 바깥을 누르면 닫아요(캔버스 터치는 막지 않고 그대로 동작해요).
// 59차: outsidePointer=false면 바깥을 눌러도 닫지 않아요(폰 가로는 패널이 캔버스 옆에 붙어 있어서, 캔버스에서 사진·글상자를 골라도 패널이 그대로 떠 있어야 해요 — 닫기 ✕·메뉴 다시 누르기·Esc로만 닫혀요).
export function useDrawerDismiss(active: boolean, onClose: () => void, outsidePointer = true) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      onClose();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-edit-sidebar]")) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    if (outsidePointer) window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [active, onClose, outsidePointer]);
}
