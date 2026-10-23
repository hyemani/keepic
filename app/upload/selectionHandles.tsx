"use client";

// 선택 박스(사진·스티커·손글씨·장식 프레임·글상자·표·표지 글상자)의 "선택 표시" 공용 부품이에요.
// 편집 화면에서만 그려지는 DOM이라 인쇄/PDF(lib/printCompose.ts, 캔버스로 따로 그려요)에는 전혀 안 들어가요.
//
// 구성
//  · SelectionHandles  — 둥근 크기조절 손잡이 8개(또는 모서리 4개) + (선택) 회전 손잡이 + (선택) mm 크기 알약
//  · useRotateDrag     — 회전 손잡이를 끌어 박스 중심 기준으로 돌리는 훅(Shift = 15° 단위)
//  · 스타일은 app/globals.css 의 .sel-handle / .sel-rotate-* / .sel-pill 클래스예요.
//
// 손잡이 규격: 눈에 보이는 동그라미 16px(브랜드 파랑 + 2px 흰 링 + 부드러운 그림자),
// 누르는 영역(hit area)은 24px(작은 박스에선 16px로 줄여서 박스 안쪽을 잡을 수 있게 해요).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { localRect, virtualInner } from "@/lib/rotatedShell";

export type TextBoxResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: { dir: TextBoxResizeDir; left: string; top: string; baseDeg: number; title: string }[] = [
  { dir: "n", left: "50%", top: "0%", baseDeg: 270, title: "위로 끌어서 크기 조절" },
  { dir: "s", left: "50%", top: "100%", baseDeg: 90, title: "아래로 끌어서 크기 조절" },
  { dir: "w", left: "0%", top: "50%", baseDeg: 180, title: "왼쪽으로 끌어서 크기 조절" },
  { dir: "e", left: "100%", top: "50%", baseDeg: 0, title: "오른쪽으로 끌어서 크기 조절" },
  { dir: "nw", left: "0%", top: "0%", baseDeg: 225, title: "끌어서 크기 조절" },
  { dir: "ne", left: "100%", top: "0%", baseDeg: 315, title: "끌어서 크기 조절" },
  { dir: "sw", left: "0%", top: "100%", baseDeg: 135, title: "끌어서 크기 조절" },
  { dir: "se", left: "100%", top: "100%", baseDeg: 45, title: "끌어서 크기 조절" },
];

/** 박스가 돌아가 있으면 손잡이의 "끌 수 있는 방향"도 같이 돌아가야 해서, 45° 단위로 가장 가까운 resize 커서를 골라요. */
export function resizeCursorFor(baseDeg: number, rotationDeg: number): string {
  const a = (((baseDeg + rotationDeg) % 180) + 180) % 180;
  const step = Math.round(a / 45) % 4; // 0:가로 1:\ 2:세로 3:/
  return ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"][step];
}

/** 이 값(px)보다 작은 박스에서는 그 방향 변(중간) 손잡이를 숨겨요 — 모서리 손잡이와 겹쳐서 잡기 어려워져요. */
export const SELECTION_EDGE_HANDLE_MIN_PX = 40;
/** 회전 손잡이: 박스 윗변에서 동그라미 중심까지의 거리(px). */
export const ROTATE_HANDLE_OFFSET_PX = 28;
/** 박스 위쪽으로 튀어나오는 총 높이(툴바가 위로 뜰 때 피해야 하는 만큼, px). */
export const ROTATE_HANDLE_CLEARANCE_PX = 44;
const PILL_GAP_PX = 16;
const PILL_ABOVE_EXTRA_PX = 40;

export type SelectionPillKind = "size" | "rotate" | null;

export function SelectionHandles({
  active,
  cornersOnly = false,
  onResizeStart,
  onRotateStart,
  rotation = 0,
  pill = null,
  docMm,
}: {
  active: boolean;
  cornersOnly?: boolean;
  onResizeStart: (dir: TextBoxResizeDir, e: React.MouseEvent) => void;
  /** 주면 윗변 위에 회전 손잡이를 그려요(회전을 지원하는 박스만 넘겨요). */
  onRotateStart?: (e: React.PointerEvent) => void;
  /** 박스의 현재 회전각(도) — 커서 방향·각도 알약에 써요. */
  rotation?: number;
  /** 지금 끄는 중이면 어떤 알약을 보여줄지 — "size"(가로 x 세로 mm) / "rotate"(각도). */
  pill?: SelectionPillKind;
  /** 이 박스가 속한 영역(스프레드/낱장/표지 패널)의 실제 종이 크기(mm) — 폭 기준으로 px→mm 환산해요. */
  docMm?: { w: number; h: number };
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  // 박스 자신의 레이아웃 크기(px, 회전과 무관). 작은 박스 판단에 써요.
  const [sizePx, setSizePx] = useState({ w: 9999, h: 9999 });
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const read = () => setSizePx((prev) => (prev.w === el.offsetWidth && prev.h === el.offsetHeight ? prev : { w: el.offsetWidth, h: el.offsetHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  if (!active) return null;
  const minDim = Math.min(sizePx.w, sizePx.h);
  const tiny = minDim < 48;
  const hit = tiny ? 16 : 24;
  const visible = minDim < 28 ? 12 : 16;
  const showN = sizePx.w >= SELECTION_EDGE_HANDLE_MIN_PX;
  const showE = sizePx.h >= SELECTION_EDGE_HANDLE_MIN_PX;

  return (
    <div ref={frameRef} data-sel-frame className="sel-frame pointer-events-none absolute inset-0">
      {HANDLES.filter((h) => !cornersOnly || h.dir.length === 2)
        .filter((h) => (h.dir === "n" || h.dir === "s" ? showN : h.dir === "e" || h.dir === "w" ? showE : true))
        .map((h) => (
          <div
            key={h.dir}
            data-sel-handle={h.dir}
            onMouseDown={(e) => onResizeStart(h.dir, e)}
            title={h.title}
            className="sel-handle"
            style={{
              left: h.left,
              top: h.top,
              width: hit,
              height: hit,
              cursor: resizeCursorFor(h.baseDeg, rotation),
              // CSS 변수로 눈에 보이는 동그라미 크기만 따로 줘요(::before가 읽어요).
              ["--sel-dot" as string]: `${visible}px`,
            }}
          />
        ))}
      {onRotateStart && (
        <>
          <div aria-hidden className="sel-rotate-stem" style={{ height: ROTATE_HANDLE_OFFSET_PX - 8 }} />
          <div
            data-sel-rotate
            role="slider"
            aria-label="회전"
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(rotation)}
            title="끌어서 회전 (Shift: 15° 단위)"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={onRotateStart}
            className="sel-handle sel-rotate"
            style={{ left: "50%", top: -ROTATE_HANDLE_OFFSET_PX, width: 24, height: 24, ["--sel-dot" as string]: "16px" }}
          />
        </>
      )}
      {pill && <SelectionPill frameRef={frameRef} kind={pill} rotation={rotation} docMm={docMm} hasRotate={!!onRotateStart} />}
    </div>
  );
}

function formatMm(v: number): string {
  return (Math.round(v * 10) / 10).toFixed(1);
}

/** 박스 아래(캔버스 바닥에 가까우면 위)에 뜨는 어두운 알약 — 크기(mm) 또는 회전각을 보여줘요. body로 포털해서 박스의 회전·잘림과 무관해요. */
function SelectionPill({
  frameRef,
  kind,
  rotation,
  docMm,
  hasRotate,
}: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  kind: "size" | "rotate";
  rotation: number;
  docMm?: { w: number; h: number };
  hasRotate: boolean;
}) {
  const docW = docMm?.w;
  const [state, setState] = useState<{ x: number; y: number; above: boolean; label: string } | null>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = frameRef.current;
      if (el) {
        const r = localRect(el); // 회전된 박스를 감싸는 축 정렬 사각형(67차: 시험판으로 돌려 보여주는 중이면 가상 좌표)
        let label = `${Math.round(rotation)}°`;
        if (kind === "size") {
          const cellEl = el.parentElement?.parentElement;
          const cell = cellEl ? localRect(cellEl) : undefined;
          label = "";
          if (docW && cell && cell.width > 0) {
            const pxPerMm = cell.width / docW;
            label = `${formatMm(el.offsetWidth / pxPerMm)} x ${formatMm(el.offsetHeight / pxPerMm)} mm`;
          }
        }
        const pillH = pillRef.current?.offsetHeight ?? 32;
        const above = r.bottom + PILL_GAP_PX + pillH > virtualInner().h - 8;
        const y = above ? r.top - PILL_GAP_PX - pillH - (hasRotate ? PILL_ABOVE_EXTRA_PX : 0) : r.bottom + PILL_GAP_PX;
        const x = r.left + r.width / 2;
        setState((prev) =>
          prev && prev.label === label && prev.above === above && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5
            ? prev
            : { x, y, above, label }
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frameRef, kind, rotation, docW, hasRotate]);

  if (typeof document === "undefined" || !state || !state.label) return null;
  return createPortal(
    <div
      ref={pillRef}
      data-sel-pill={kind}
      className="sel-pill"
      style={{ left: state.x, top: state.y }}
    >
      {state.label}
    </div>,
    document.body
  );
}

/** 0/90/180/270에 이만큼(도) 가까우면 딱 붙여요 — Shift 없이도 "똑바로"로 돌아오기 쉬워요. */
const ROTATE_MAGNET_DEG = 2;

export function snapRotation(deg: number, shift: boolean): number {
  let v = ((deg % 360) + 360) % 360;
  if (shift) v = Math.round(v / 15) * 15;
  else {
    for (const t of [0, 90, 180, 270, 360]) {
      if (Math.abs(v - t) <= ROTATE_MAGNET_DEG) {
        v = t;
        break;
      }
    }
  }
  return Math.round(v) % 360;
}

/**
 * 회전 손잡이 드래그: 박스 중심(getCenter, 화면 좌표) 기준으로 마우스가 그린 각도 변화만큼 박스를 돌려요.
 * 처음 눌렀을 때의 각도를 기준으로 삼아서(오프셋) 누르는 순간 박스가 툭 튀지 않아요.
 * 연속 드래그는 mousemove마다 onRotate가 불려도 편집기 실행취소 기록은 한 단계로 묶여요(HISTORY_DEBOUNCE).
 */
export function useRotateDrag({
  getCenter,
  rotation,
  onRotate,
}: {
  getCenter: () => { x: number; y: number } | null;
  rotation: number;
  onRotate: (deg: number) => void;
}) {
  const [rotating, setRotating] = useState(false);
  const start = useRef({ cx: 0, cy: 0, angle: 0, rot: 0 });
  const latest = useRef({ onRotate });
  useLayoutEffect(() => {
    latest.current = { onRotate };
  });

  const startRotate = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const c = getCenter();
      if (!c) return;
      e.preventDefault();
      e.stopPropagation();
      start.current = {
        cx: c.x,
        cy: c.y,
        angle: Math.atan2(e.clientY - c.y, e.clientX - c.x),
        rot: rotation,
      };
      setRotating(true);
    },
    [getCenter, rotation]
  );

  useEffect(() => {
    if (!rotating) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    function move(e: PointerEvent) {
      const s = start.current;
      const a = Math.atan2(e.clientY - s.cy, e.clientX - s.cx);
      const deltaDeg = ((a - s.angle) * 180) / Math.PI;
      latest.current.onRotate(snapRotation(s.rot + deltaDeg, e.shiftKey));
    }
    function up() {
      setRotating(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [rotating]);

  return { rotating, startRotate };
}

/** 회전된 박스에서 마우스 이동량(dx,dy)을 "박스 자신의 가로·세로 축" 기준 이동량으로 바꿔요(회전 0이면 그대로). */
export function toBoxLocalDelta(dx: number, dy: number, rotationDeg: number): { dx: number; dy: number } {
  if (!rotationDeg) return { dx, dy };
  const t = (-rotationDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { dx: dx * c - dy * s, dy: dx * s + dy * c };
}
