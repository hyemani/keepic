import { useCallback, useSyncExternalStore } from "react";

// 66차: 폰에서 "편집하기"를 누를 때 "세로로 편집 / 가로로 편집" 중 어떤 걸 고르셨는지 이번 접속(탭) 동안 기억해요.
// 한 번 고르면 다시 묻지 않고, 페이지를 옮겨 다니거나 편집을 나갔다 다시 들어와도 그대로예요(sessionStorage + 메모리).
// 값이 없으면(null) 아직 안 고른 거라서 처음 편집에 들어갈 때 한 번 물어봐요. 태블릿·PC는 이 값을 아예 쓰지 않아요.
// 저장되는 앨범 자료와는 상관없는 "보기 설정"이라 주문·저장 내용은 바뀌지 않아요.
export type EditOrientation = "portrait" | "landscape";
const SS_KEY = "keepic.editOrientation";

// 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 이 변수에서만 기억해요.
let mem: EditOrientation | null = null;
const listeners = new Set<() => void>();

// 값은 읽을 때마다 sessionStorage에서 바로 읽어요(가벼운 읽기라 부담이 없고, 다른 코드가 값을 바꿔도 항상 최신이에요).
export function getEditOrientation(): EditOrientation | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(SS_KEY);
    if (v === "portrait" || v === "landscape") return v;
    if (v === null && mem === null) return null;
  } catch {
    /* 저장소를 못 쓰면 메모리 값을 써요 */
  }
  return mem;
}

export function setEditOrientation(v: EditOrientation | null) {
  mem = v;
  try {
    if (v) window.sessionStorage.setItem(SS_KEY, v);
    else window.sessionStorage.removeItem(SS_KEY);
  } catch {
    /* 무시 */
  }
  listeners.forEach((l) => l());
}

export function useEditOrientation(): [EditOrientation | null, (v: EditOrientation | null) => void] {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  const value = useSyncExternalStore(subscribe, getEditOrientation, () => null);
  return [value, setEditOrientation];
}
