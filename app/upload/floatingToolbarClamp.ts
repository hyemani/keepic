import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { localRect, virtualInner } from "@/lib/rotatedShell";

// 사진·글상자·스티커를 선택하면 박스 아래(또는 위)에 뜨는 플로팅 툴바가 화면 밖으로 잘리지 않게 하는 위치 보정이에요(43차).
// - 가로: 보이는 캔버스 영역(안쪽 4px 여백) 안으로 밀어 넣어요. 영역보다 넓으면 폭을 영역에 맞추고 줄바꿈(두 줄)해요 — 버튼은 하나도 안 빼요.
// - 세로: 기본은 박스 아래(혜민님 요청 그대로). 아래에 자리가 모자라고 위에 자리가 있으면 박스 위로 넘겨요. 둘 다 모자라면 영역 안으로 밀어요.
// React state를 쓰지 않고 margin만 직접 바꿔요(기본 배치 CSS는 그대로라 데스크톱에서 자리가 안 바뀌면 margin은 0이에요).
const PAD = 4;

export function useFloatingToolbarClamp(ref: RefObject<HTMLElement | null>, opts: { fillsFrame?: boolean; flip: boolean; extraClearPx: number }) {
  const { fillsFrame, flip, extraClearPx } = opts;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      const stage = el.closest("[data-canvas-stage]") as HTMLElement | null;
      // 67차: 가로 고정(시험판)으로 돌려 보여주는 중이면 화면 좌표를 가상(돌리기 전) 좌표로 바꿔서 계산해요(아니면 예전과 똑같은 값).
      const vi = virtualInner();
      const sr = stage ? localRect(stage) : undefined;
      const L = Math.max(sr?.left ?? 0, 0) + PAD;
      const R = Math.min(sr?.right ?? vi.w, vi.w) - PAD;
      const T = Math.max(sr?.top ?? 0, 0) + PAD;
      const B = Math.min(sr?.bottom ?? vi.h, vi.h) - PAD;
      const availW = Math.max(120, R - L);
      el.style.width = "max-content";
      el.style.maxWidth = `${Math.floor(availW)}px`;
      el.style.marginLeft = "0px";
      el.style.marginTop = "0px";
      el.style.marginBottom = "0px";
      const r = localRect(el);
      if (r.width === 0 && r.height === 0) return;
      let dx = 0;
      if (r.left < L) dx = L - r.left;
      else if (r.right > R) dx = R - r.right;
      if (r.width > R - L) dx = L - r.left;
      let dy = 0;
      const fits = r.top >= T && r.bottom <= B;
      if (!fits) {
        // 지금 자리(React 기본 배치)가 영역 밖이에요 — 반대쪽(위↔아래)에 들어가면 넘기고, 아니면 영역 안으로 밀어요.
        const parent = el.offsetParent as HTMLElement | null;
        if (!fillsFrame && parent) {
          const br = localRect(parent);
          const gap = 6 + extraClearPx;
          const otherTop = flip ? br.bottom + gap : br.top - gap - r.height;
          if (otherTop >= T && otherTop + r.height <= B) dy = otherTop - r.top;
        }
        if (dy === 0) {
          if (r.bottom > B) dy = B - r.bottom;
          if (r.top + dy < T) dy = T - r.top;
        }
      }
      el.style.marginLeft = `${Math.round(dx * 10) / 10}px`;
      // 62차: 박스 위쪽에 뜨는 툴바(flip)·박스 안 아래(fillsFrame)는 bottom 기준으로 놓여 있어서 marginTop 은 위치를 못 옮겨요 — marginBottom 을 반대로 줘서 옮겨요(큰 사진이 위에 있을 때 툴바가 화면 밖으로 나가던 문제).
      const bottomAnchored = el.style.bottom !== "" && el.style.top === "";
      if (bottomAnchored) el.style.marginBottom = `${Math.round(-dy * 10) / 10}px`;
      else el.style.marginTop = `${Math.round(dy * 10) / 10}px`;
    };
    run();
    const stage = el.closest("[data-canvas-stage]");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    if (stage && ro) ro.observe(stage);
    window.addEventListener("resize", run);
    const vp = el.closest("[data-canvas-viewport]");
    vp?.addEventListener("scroll", run, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", run);
      vp?.removeEventListener("scroll", run);
    };
  });
}
