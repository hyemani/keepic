import { useEffect, useSyncExternalStore } from "react";
import { isTextEntryElement } from "./softKeyboard";

// 67차: "가로 고정(시험판)" — iPhone에서 가로로 편집하다가 폰이 살짝 기울면 iOS가 화면을 세로로 뒤집어 버려요.
// 웹페이지는 iOS에서 방향을 잠글 수 없어서, 대신 "소프트웨어로" 가로 화면을 유지해요: iOS가 세로라고 알려줘도
// (폰은 실제로는 아직 가로로 들고 계시니까) 편집 화면 전체를 CSS로 90도 돌려서 가로 편집기를 그대로 보여줘요.
//
// 구조(가상 화면 방식):
//  1) 이 파일이 <html data-rot-lock="90|-90">을 켜고 끄는 유일한 곳이에요(켜진 동안만).
//  2) globals.css가 그 표시를 보고 <body>를 "폭=실제 높이, 높이=실제 폭"으로 만들어 90도 돌려요(body 안의 모든 것 — 팝업·손잡이 포함 — 이 같이 돌아요).
//  3) 화면 크기 미디어쿼리(@media width/height/orientation)·vh/vw는 postcss/rotLockMedia.cjs 가 "가상 화면용 복사본"을 만들어 둬서
//     <html data-rot-lock>일 때만 가상(눕힌) 크기로 판단해요.
//  4) 자바스크립트가 화면 크기를 읽는 곳은 이 파일의 virtualInner()/mediaMatches() 같은 "작은 도우미"를 거쳐요(전역 API를 바꿔치기하지 않아요).
// 시험판이 꺼져 있으면(주소에 ?rotlock=1 없음) 이 파일은 아무 리스너도 달지 않고, 도우미는 실제 값을 그대로 돌려줘요.
//
// 1단계는 "보이는 것(배치·그리기)"만 해요. 손가락/마우스 좌표(드래그·크기·회전·핀치)는 아직 돌아간 좌표 그대로라 어긋나요 → 2단계.
// 그래서 돌아가 있는 동안은 화면에 "시험판" 표시가 떠요.

const FLAG_KEY = "keepic.rotLockProto";
const ON_KEY = "keepic.rotLockOn";
const FLIP_KEY = "keepic.rotLockFlip";
const DIR_KEY = "keepic.rotLockDir";
const STABLE_MS = 250;

export type RotDir = 90 | -90;

// ---------- 켜짐 표시(?rotlock=1) ----------
let flagCache: { search: string; on: boolean } | null = null;
/** 주소에 ?rotlock=1 이면 켜짐(이번 접속 동안 기억), ?rotlock=0 이면 끔. 꺼져 있으면 이 기능은 아무것도 안 해요. */
export function rotLockFlagOn(): boolean {
  if (typeof window === "undefined") return false;
  const search = window.location.search;
  if (flagCache && flagCache.search === search) return flagCache.on;
  let on = false;
  const q = new URLSearchParams(search).get("rotlock");
  try {
    if (q === "1") window.sessionStorage.setItem(FLAG_KEY, "1");
    else if (q === "0") window.sessionStorage.removeItem(FLAG_KEY);
    on = window.sessionStorage.getItem(FLAG_KEY) === "1";
  } catch {
    on = q === "1";
  }
  flagCache = { search, on };
  return on;
}

function ssGet(k: string): string | null {
  try {
    return window.sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function ssSet(k: string, v: string | null) {
  try {
    if (v === null) window.sessionStorage.removeItem(k);
    else window.sessionStorage.setItem(k, v);
  } catch {
    /* 무시 */
  }
}

// ---------- 상태 저장소(React가 구독) ----------
type Snapshot = { engaged: boolean; dir: RotDir; enabled: boolean; flip: boolean };
let snap: Snapshot = { engaged: false, dir: 90, enabled: true, flip: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function setSnap(patch: Partial<Snapshot>) {
  const next = { ...snap, ...patch };
  if (next.engaged === snap.engaged && next.dir === snap.dir && next.enabled === snap.enabled && next.flip === snap.flip) return;
  snap = next;
  emit();
}
const SERVER_SNAP: Snapshot = { engaged: false, dir: 90, enabled: true, flip: false };
export function useRotLockState(): Snapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => snap,
    () => SERVER_SNAP
  );
}

/** ··· 메뉴 "가로 고정(시험)" 켜기/끄기(기억해요). */
export function setRotLockEnabled(on: boolean) {
  ssSet(ON_KEY, on ? null : "0");
  setSnap({ enabled: on });
}
/** ··· 메뉴 "화면 위아래 바꾸기"(180도). 방향을 반대로 돌려요(기억해요). */
export function toggleRotLockFlip() {
  const f = !snap.flip;
  ssSet(FLIP_KEY, f ? "1" : null);
  setSnap({ flip: f });
}

// ---------- 가상 화면 도우미(켜져 있을 때만 값이 달라져요) ----------
/** 지금 실제로 "돌려 보여주는 중"인지. (표시가 있고 실제 창이 세로일 때만 — 실제로 가로가 되면 곧바로 아니에요.) */
export function isRotated(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-rot-lock") && window.innerHeight >= window.innerWidth;
}
/** 돌려 보여주는 방향(돌리는 중이 아니면 0). */
export function rotDir(): 0 | RotDir {
  if (!isRotated()) return 0;
  return document.documentElement.getAttribute("data-rot-lock") === "-90" ? -90 : 90;
}
/** window.innerWidth/innerHeight 대신 쓰는 값. 돌려 보여주는 중이면 가로·세로를 맞바꿔 줘요. */
export function virtualInner(): { w: number; h: number } {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return isRotated() ? { w: h, h: w } : { w, h };
}
/** visualViewport(없으면 inner) 크기 — 돌려 보여주는 중이면 맞바꿔요. scale은 그대로예요. */
export function virtualVisual(): { w: number; h: number; scale: number } {
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  const scale = vv?.scale && vv.scale > 0 ? vv.scale : 1;
  return isRotated() ? { w: h, h: w, scale } : { w, h, scale };
}
/** 쿼리의 width↔height, portrait↔landscape를 맞바꿔요(postcss/rotLockMedia.cjs 와 같은 규칙). */
export function swapMediaQuery(q: string): string {
  return q.replace(/(?<!device-)\b(width|height|portrait|landscape)\b/g, (m) => ({ width: "height", height: "width", portrait: "landscape", landscape: "portrait" })[m] as string);
}
/** window.matchMedia(q).matches 대신 쓰는 값(돌려 보여주는 중이면 가상 화면 기준). */
export function mediaMatches(q: string): boolean {
  return window.matchMedia(isRotated() ? swapMediaQuery(q) : q).matches;
}
/** 돌림 상태가 바뀔 때 알려주는 구독(꺼져 있으면 아무것도 안 달아요). 돌려주는 함수는 해제용. */
export function subscribeRotChange(cb: () => void): () => void {
  if (!rotLockFlagOn()) return () => {};
  window.addEventListener("keepic-rotlock", cb);
  return () => window.removeEventListener("keepic-rotlock", cb);
}
/** matchMedia change 구독 — 실제 쿼리와 맞바꾼 쿼리 둘 다 + 돌림 변화에 반응해요. */
export function subscribeMedia(q: string, cb: () => void): () => void {
  const mqs = [window.matchMedia(q)];
  if (rotLockFlagOn()) mqs.push(window.matchMedia(swapMediaQuery(q)));
  mqs.forEach((m) => m.addEventListener("change", cb));
  const un = subscribeRotChange(cb);
  return () => {
    mqs.forEach((m) => m.removeEventListener("change", cb));
    un();
  };
}

// ---------- 화면 좌표 → 가상(돌리기 전) 좌표 변환(2단계에서 손가락·마우스 좌표에 쓸 도구) ----------
// 돌린 <body> 안의 좌표계: +90 은 화면 (sx,sy) = (W - y, x), -90 은 (y, H - x) (W·H = 실제 창 폭·높이).
/** 화면(client) 좌표의 "움직인 양"을 가상 좌표의 움직인 양으로. 돌리는 중이 아니면 그대로예요. */
export function toLocalDelta(dx: number, dy: number): { dx: number; dy: number } {
  const d = rotDir();
  if (d === 90) return { dx: dy, dy: -dx };
  if (d === -90) return { dx: -dy, dy: dx };
  return { dx, dy };
}
/** 화면(client) 좌표의 한 점을 가상 좌표의 점으로. */
export function toLocalPoint(cx: number, cy: number): { x: number; y: number } {
  const d = rotDir();
  if (d === 90) return { x: cy, y: window.innerWidth - cx };
  if (d === -90) return { x: window.innerHeight - cy, y: cx };
  return { x: cx, y: cy };
}
/** getBoundingClientRect() 같은 화면 사각형을 가상 좌표 사각형으로(돌려도 사각형이라 네 모서리의 바깥 사각형이에요). */
export function rectToLocal(r: { left: number; top: number; right: number; bottom: number }): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  if (!rotDir()) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.right - r.left, height: r.bottom - r.top };
  const a = toLocalPoint(r.left, r.top);
  const b = toLocalPoint(r.right, r.bottom);
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

/** el.getBoundingClientRect()의 가상 좌표 버전(돌려 보여주는 중이 아니면 똑같은 값이에요). */
export function localRect(el: Element) {
  return rectToLocal(el.getBoundingClientRect());
}

// ---------- 켜고 끄는 판단(히스테리시스) ----------
// 방향: 폰이 가로였을 때(window.orientation / screen.orientation) 마지막 값을 기억해 둬요.
//  window.orientation 90 = 폰을 시계 반대 방향으로 눕힘(노치 왼쪽), -90 = 시계 방향(노치 오른쪽).
//  폰을 시계 반대로 눕혀 들었다면(90) 세로 화면은 폰 몸체 기준으로 "왼쪽으로 누운" 모양이라, 내용을 시계 방향으로 +90도 돌려야 똑바로 보여요 → rotate(+90deg).
//  반대(-90)면 rotate(-90deg). ※ 실제 iPhone에서는 아직 확인 못 했어요(UNVERIFIED) — 반대로 보이면 ··· 메뉴 "화면 위아래 바꾸기"로 뒤집어요.
function readOrientationDir(): RotDir | null {
  const wo = (window as unknown as { orientation?: number }).orientation;
  if (wo === 90) return 90;
  if (wo === -90 || wo === 270) return -90;
  const a = window.screen?.orientation?.angle;
  if (a === 90) return 90;
  if (a === 270) return -90;
  return null;
}

type Ctx = { editing: boolean; landscapeChosen: boolean };

function setVars(on: boolean, dir: RotDir) {
  const root = document.documentElement;
  if (!on) {
    root.removeAttribute("data-rot-lock");
    root.removeAttribute("data-notch");
    root.style.removeProperty("--rot-rw");
    root.style.removeProperty("--rot-rh");
    return;
  }
  // 노치(화면 맨 위 = 세로 기준 위)는 돌린 화면에서 +90이면 왼쪽, -90이면 오른쪽이에요(globals.css가 안전 여백을 그에 맞춰 옮겨요).
  root.setAttribute("data-notch", dir === 90 ? "left" : "right");
  root.setAttribute("data-rot-lock", String(dir));
  measure();
}
function measure() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const s = vv?.scale && vv.scale > 0 ? vv.scale : 1;
  const w = Math.round((vv?.width ?? window.innerWidth) * s);
  const h = Math.round((vv?.height ?? window.innerHeight) * s);
  if (w > 0) root.style.setProperty("--rot-rw", `${w}px`);
  if (h > 0) root.style.setProperty("--rot-rh", `${h}px`);
}

/**
 * 편집 화면에서 호출. 시험판이 꺼져 있으면(주소에 ?rotlock=1 없음) 아무것도 안 해요.
 * 켜는 조건: 시험판 켜짐 + 가로 편집을 골랐음 + 편집 모드 + 실제 창이 세로로 ≥250ms 안정 + 글 칸에 포커스 없음 + 폰 크기 + "가로 고정" 켜짐.
 * 끄는 조건: 위 중 하나라도 어긋나면 곧바로(실제 가로가 돌아오거나, 세로를 고르거나, 글 칸을 누르면 바로 풀려요).
 */
export function useRotatedShell(ctx: Ctx): Snapshot {
  const state = useRotLockState();
  const { editing, landscapeChosen } = ctx;
  useEffect(() => {
    if (!rotLockFlagOn()) return;
    // 저장된 설정 불러오기
    const savedDir = ssGet(DIR_KEY);
    let lastDir: RotDir = savedDir === "-90" ? -90 : 90;
    setSnap({ enabled: ssGet(ON_KEY) !== "0", flip: ssGet(FLIP_KEY) === "1" });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let engaged = false;
    const clearTimer = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const want = () => {
      if (!editing || !landscapeChosen || !snap.enabled) return false;
      const iw = window.innerWidth;
      const ih = window.innerHeight;
      if (!(iw > 0 && ih > 0) || ih < iw) return false;
      if (Math.min(iw, ih) >= 600) return false; // 폰 크기만
      if (!window.matchMedia("(pointer: coarse)").matches) return false;
      if (isTextEntryElement(document.activeElement)) return false;
      return true;
    };
    const effDir = (): RotDir => (snap.flip ? (lastDir === 90 ? -90 : 90) : lastDir);
    const apply = (on: boolean) => {
      const dir = effDir();
      if (on === engaged && (!on || document.documentElement.getAttribute("data-rot-lock") === String(dir))) return;
      engaged = on;
      setVars(on, dir);
      setSnap({ engaged: on, dir });
      window.dispatchEvent(new Event("keepic-rotlock"));
      window.dispatchEvent(new Event("resize"));
    };
    const trackDir = () => {
      if (window.innerWidth > window.innerHeight) {
        const d = readOrientationDir();
        if (d) {
          lastDir = d;
          ssSet(DIR_KEY, String(d));
        }
      }
    };
    const evaluate = () => {
      trackDir();
      const w = want();
      if (!w) {
        clearTimer();
        apply(false);
        return;
      }
      if (engaged) {
        // 방향 바꾸기(180도)·측정값만 갱신
        apply(true);
        measure();
        return;
      }
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (want()) apply(true);
      }, STABLE_MS);
    };
    // 실제 가로로 돌아오면 다른 리스너보다 먼저(캡처) 풀어서 한 박자도 어긋난 화면이 안 보이게 해요.
    const onResize = () => {
      if (engaged && window.innerHeight < window.innerWidth) {
        clearTimer();
        apply(false);
      }
      evaluate();
    };
    const onFocus = () => evaluate();
    window.addEventListener("resize", onResize, true);
    window.addEventListener("orientationchange", onResize, true);
    window.visualViewport?.addEventListener("resize", onResize);
    document.addEventListener("focusin", onFocus, true);
    document.addEventListener("focusout", onFocus, true);
    evaluate();
    // ctx·설정이 바뀌면 다시 판단(snap 구독)
    const unsub = (() => {
      listeners.add(evaluate);
      return () => listeners.delete(evaluate);
    })();
    return () => {
      window.removeEventListener("resize", onResize, true);
      window.removeEventListener("orientationchange", onResize, true);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.removeEventListener("focusin", onFocus, true);
      document.removeEventListener("focusout", onFocus, true);
      unsub();
      clearTimer();
      if (engaged) {
        setVars(false, 90);
        setSnap({ engaged: false });
        window.dispatchEvent(new Event("keepic-rotlock"));
        window.dispatchEvent(new Event("resize"));
      }
    };
  }, [editing, landscapeChosen]);
  return state;
}
