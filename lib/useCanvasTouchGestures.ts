import { useEffect, useRef, type RefObject } from "react";
import { isDragTarget, touchDistance } from "@/lib/touchEditor";
import { toLocalDelta, toLocalPoint } from "@/lib/rotatedShell";

// 57차: 폰·태블릿 캔버스 손가락 조작. 데스크톱(마우스)은 이 훅이 아무것도 안 해요(enabled=false).
//
//  - 손가락 두 개 벌리기/오므리기 = 확대·축소(두 손가락 가운데가 기준점), 두 손가락 같이 움직이기 = 화면 이동
//  - 손가락 하나: "끌 수 있는 요소"(커서가 move/grab/resize인 요소 = 글상자·사진·스티커·크기/회전 손잡이) 위에서
//    끌면 요소를 옮겨요. 이 앱의 끌기는 전부 마우스 이벤트라서, 손가락 끌기를 같은 마우스 이벤트로 바꿔 전달해요
//    (그래서 데스크톱 끌기 코드는 한 줄도 안 바꿨어요). 톡 누르는 탭은 건드리지 않아요(브라우저가 클릭으로 처리).
//  - 손가락 하나로 "빈 곳"을 끌면: 확대돼 있을 때만 화면 이동, 맞춤 상태에선 아무 일도 없어요.
//  - 캔버스 영역은 CSS touch-action:none이라 브라우저 기본 스크롤/확대가 끼어들지 않아요.
const SLOP_PX = 8;
const SNAP_TO_FIT_RATIO = 1.06;

type Mode = "none" | "pending" | "drag" | "pan" | "pinch" | "innerpinch" | "ignore";

// 62차: 두 번 탭(더블탭) 판정 — 아이폰 사파리는 touch-action:none 인 영역에서 더블클릭을 안 보내서 직접 만들어 보내요.
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_PX = 32;

export type CanvasGestureOptions = {
  enabled: boolean;
  /** 지금 배율(실제 크기 대비 %) */
  getZoomPct: () => number;
  /** 맞춤 배율(%) — 알 수 없으면 null(그땐 두 손가락 확대를 안 해요) */
  getFitPct: (stage: HTMLElement) => number | null;
  /** pct=null이면 "화면에 맞춤"으로 되돌림. anchor는 화면(client) 좌표. */
  setZoom: (pct: number | null, anchor: { x: number; y: number }) => void;
  minPct: number;
  maxPct: number;
};

export function useCanvasTouchGestures(ref: RefObject<HTMLElement | null>, opts: CanvasGestureOptions) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });
  const enabled = opts.enabled;

  const attachedRef = useRef<{ root: HTMLElement; cleanup: () => void } | null>(null);
  // 캔버스 래퍼는 사진을 올린 뒤에야 생길 수 있어서, 렌더마다 "붙어 있는 래퍼가 그대로인지" 확인하고 바뀌었으면 다시 붙여요.
  useEffect(() => {
    const root = enabled ? ref.current : null;
    if (attachedRef.current?.root === root) return;
    attachedRef.current?.cleanup();
    attachedRef.current = null;
    if (root) attachedRef.current = { root, cleanup: attachGestures(root, optsRef) };
  });
  useEffect(
    () => () => {
      attachedRef.current?.cleanup();
      attachedRef.current = null;
    },
    []
  );
}

function attachGestures(root: HTMLElement, optsRef: { current: CanvasGestureOptions }): () => void {

    let mode: Mode = "none";
    let startX = 0,
      startY = 0,
      lastX = 0,
      lastY = 0;
    let target: Element | null = null;
    let vp: HTMLElement | null = null;
    let stage: HTMLElement | null = null;
    let dragMouseDown = false;
    let pinch = { dist: 1, pct: 100, fit: null as number | null, lastMidX: 0, lastMidY: 0 };
    let innerBox: Element | null = null;
    let innerDist = 1;
    let lastTap: { t: number; x: number; y: number } | null = null;
    let raf = 0;
    let pending: { pct: number; x: number; y: number } | null = null;

    // 67차: 가로 고정(시험판)으로 화면을 돌려 보여주는 중이면 손가락 좌표(화면 기준)를 "돌리기 전" 좌표로 바꿔서 전달해요 — 끌기 코드는 한 줄도 안 바꿔도
    // 글상자·사진을 끈 방향이 맞게 움직여요. 돌리는 중이 아니면 toLocalPoint가 값을 그대로 돌려줘서 예전과 똑같아요.
    const mouse = (type: string, x: number, y: number, el: EventTarget) => {
      const lp = toLocalPoint(x, y);
      return el.dispatchEvent(
        new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: lp.x, clientY: lp.y, screenX: lp.x, screenY: lp.y, button: 0, buttons: type === "mouseup" ? 0 : 1 })
      );
    };
    const endDrag = (x: number, y: number) => {
      if (!dragMouseDown) return;
      dragMouseDown = false;
      mouse("mouseup", x, y, window);
    };
    const flushZoom = () => {
      raf = 0;
      const o = optsRef.current;
      if (!pending) return;
      const { pct, x, y } = pending;
      pending = null;
      const fit = pinch.fit;
      if (fit !== null && pct <= fit * SNAP_TO_FIT_RATIO) o.setZoom(null, { x, y });
      else o.setZoom(pct, { x, y });
    };
    const scrollable = (el: HTMLElement | null) => !!el && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    const zoneOf = (t: EventTarget | null) => {
      const el = t as Element | null;
      if (!el?.closest) return null;
      const st = el.closest("[data-canvas-stage]") as HTMLElement | null;
      if (st) return st;
      // 미리보기의 "편집하기" 덮개는 스테이지 바깥에 떠 있어서, 같은 부모 안의 스테이지를 찾아줘요.
      if (el.closest("[data-preview-edit-overlay]")) return root.querySelector<HTMLElement>("[data-canvas-stage]");
      return null;
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length >= 3) {
        endDrag(lastX, lastY);
        mode = "ignore";
        return;
      }
      if (e.touches.length === 2) {
        const st = stage ?? zoneOf(e.touches[0].target);
        if (!st) return;
        endDrag(lastX, lastY);
        stage = st;
        vp = st.querySelector<HTMLElement>("[data-canvas-viewport]");
        // 사진 위치 조정 중인 사진 위에서 두 손가락: 캔버스가 아니라 그 사진을 확대·축소해요.
        const inner = (e.touches[0].target as Element | null)?.closest?.('[data-photo-editing="true"]') ?? null;
        if (inner) {
          innerBox = inner;
          innerDist = Math.max(1, touchDistance(e.touches[0], e.touches[1]));
          inner.dispatchEvent(new CustomEvent("keepic-inner-pinch", { detail: { phase: "start", ratio: 1 } }));
          mode = "innerpinch";
          e.preventDefault();
          return;
        }
        const o = optsRef.current;
        const fit = o.getFitPct(st);
        if (fit === null) {
          mode = "ignore";
          return;
        }
        const a = e.touches[0],
          b = e.touches[1];
        pinch = {
          dist: Math.max(1, touchDistance(a, b)),
          pct: o.getZoomPct(),
          fit,
          lastMidX: (a.clientX + b.clientX) / 2,
          lastMidY: (a.clientY + b.clientY) / 2,
        };
        mode = "pinch";
        e.preventDefault();
        return;
      }
      // 손가락 하나
      const st = zoneOf(e.target);
      if (!st) {
        mode = "none";
        stage = null;
        return;
      }
      stage = st;
      vp = st.querySelector<HTMLElement>("[data-canvas-viewport]");
      const t = e.touches[0];
      startX = lastX = t.clientX;
      startY = lastY = t.clientY;
      target = e.target as Element;
      mode = "pending";
    };

    const onMove = (e: TouchEvent) => {
      if (mode === "none" || mode === "ignore") return;
      if (mode === "innerpinch") {
        if (e.touches.length < 2) return;
        e.preventDefault();
        innerBox?.dispatchEvent(
          new CustomEvent("keepic-inner-pinch", { detail: { phase: "move", ratio: touchDistance(e.touches[0], e.touches[1]) / innerDist } })
        );
        return;
      }
      if (mode === "pinch") {
        if (e.touches.length < 2) return;
        e.preventDefault();
        const a = e.touches[0],
          b = e.touches[1];
        const midX = (a.clientX + b.clientX) / 2,
          midY = (a.clientY + b.clientY) / 2;
        if (vp) {
          const d = toLocalDelta(midX - pinch.lastMidX, midY - pinch.lastMidY); // 67차: 돌려 보여주는 중이면 화면 이동량을 가상 좌표로
          vp.scrollLeft -= d.dx;
          vp.scrollTop -= d.dy;
        }
        pinch.lastMidX = midX;
        pinch.lastMidY = midY;
        const o = optsRef.current;
        const next = Math.min(o.maxPct, Math.max(o.minPct, (pinch.pct * touchDistance(a, b)) / pinch.dist));
        pending = { pct: Math.round(next * 10) / 10, x: midX, y: midY };
        if (!raf) raf = requestAnimationFrame(flushZoom);
        return;
      }
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (mode === "pending") {
        if (Math.hypot(t.clientX - startX, t.clientY - startY) < SLOP_PX) return;
        if (target && isDragTarget(target)) {
          mode = "drag";
          dragMouseDown = true;
          mouse("mousedown", startX, startY, target);
        } else if (scrollable(vp)) {
          mode = "pan";
        } else {
          mode = "none";
          return;
        }
      }
      if (mode === "drag") {
        e.preventDefault();
        mouse("mousemove", t.clientX, t.clientY, window);
      } else if (mode === "pan" && vp) {
        e.preventDefault();
        const d = toLocalDelta(t.clientX - lastX, t.clientY - lastY); // 67차: 돌려 보여주는 중이면 화면 이동량을 가상 좌표로
        vp.scrollLeft -= d.dx;
        vp.scrollTop -= d.dy;
      }
      lastX = t.clientX;
      lastY = t.clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (mode === "pending" && e.touches.length === 0) {
        // 움직이지 않은 한 번 탭이 사진 칸 위에서 연달아 두 번이면 더블클릭을 만들어 보내요(사진 위치 조정 들어가기/나가기).
        const t = e.changedTouches[0];
        const el = target;
        if (t && el?.closest?.("[data-image-box-id]")) {
          const now = Date.now();
          if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < DOUBLE_TAP_PX) {
            lastTap = null;
            const lp = toLocalPoint(t.clientX, t.clientY); // 67차: 돌려 보여주는 중이면 가상 좌표로(아니면 그대로)
            el.dispatchEvent(
              new MouseEvent("dblclick", { bubbles: true, cancelable: true, view: window, clientX: lp.x, clientY: lp.y, detail: 2 })
            );
          } else lastTap = { t: now, x: t.clientX, y: t.clientY };
        } else lastTap = null;
      }
      if (mode === "innerpinch") {
        mode = e.touches.length === 0 ? "none" : "ignore";
        innerBox = null;
        if (e.touches.length === 0) {
          stage = null;
          target = null;
        }
        return;
      }
      if (mode === "drag") {
        e.preventDefault(); // 끌기 뒤에 브라우저가 가짜 클릭을 보내지 않게
        const t = e.changedTouches[0];
        endDrag(t ? t.clientX : lastX, t ? t.clientY : lastY);
      }
      if (e.touches.length === 0) {
        if (mode === "pinch" && raf) {
          cancelAnimationFrame(raf);
          flushZoom();
        }
        mode = "none";
        stage = null;
        target = null;
      } else if (mode === "pinch") {
        // 두 손가락 중 하나만 뗐을 때: 남은 손가락으로 갑자기 화면이 튀지 않게 나머지는 무시
        if (raf) {
          cancelAnimationFrame(raf);
          flushZoom();
        }
        mode = "ignore";
      }
    };

    root.addEventListener("touchstart", onStart, { passive: false });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd, { passive: false });
    root.addEventListener("touchcancel", onEnd, { passive: false });
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
      if (raf) cancelAnimationFrame(raf);
      endDrag(lastX, lastY);
    };
}
