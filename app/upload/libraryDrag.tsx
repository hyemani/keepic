"use client";
// 사진 목록의 사진을 캔버스로 끌어다 놓기(2026-10 41차). HTML5 드래그 이벤트를 써요(캔버스가 DOM이라 그대로 맞아요).
//  - 빈 사진 칸 위에서 놓으면 그 칸에 넣고(insert), 사진이 있는 칸 위에서 놓으면 그 사진을 바꿔요(replace),
//    빈 캔버스에서 놓으면 놓은 자리에 새 사진 칸을 만들어요(add). 그 밖의 곳·Esc·드래그 취소는 아무 일도 안 일어나요(드롭 이벤트 자체가 안 와요).
//  - 대상 위에 있는 동안 칸에 data-lib-drop 표시를 붙여 테두리/색으로 알려줘요(넣기=하늘색 실선, 바꾸기=주황 점선). 움직임(애니메이션) 없이 색만 바뀌어요.
//  - 터치 화면은 끌기 대신 "칸 선택 → 사진 누르기"(기존 클릭 동작)로 같은 일을 해요.
import { useEffect, useRef } from "react";
import { dropKindOfBox, parseCanvasId, type SlotScope } from "@/lib/librarySlotTarget";
import type { ImageBoxDef } from "@/lib/albumTemplates";
import type { LibraryPhotoInfo } from "@/lib/photoSlotInsert";

export const LIBRARY_DRAG_MIME = "application/x-keepic-library-photo";

let dragging: LibraryPhotoInfo | null = null;

// 44차: 폭 1024px 미만에서는 사진 목록이 캔버스 위에 뜨는 서랍 안에 있어서, 서랍 아래 칸에는 놓을 수 없었어요.
// 끌기가 시작되면(다음 프레임에) <html data-lib-dragging>을 달아 서랍을 반투명+터치 통과로 바꾸고(아래 STYLE),
// 놓기·취소·끌기 끝에 바로 떼요. dragstart 안에서 바로 바꾸면 일부 브라우저가 끌기를 취소해서 한 프레임 미뤄요.
// 서랍이 반투명으로 바뀐 동안 포인터가 서랍 영역 위에 있으면, "빈 캔버스에 새 칸 만들기(add)"는 막아요 — 서랍 목록 위에서 손을 떼
// 취소하려던 건데 아래 빈 자리에 사진 칸이 새로 생기는 사고를 막으려는 거예요. 서랍 아래 "기존 칸"에 넣기·바꾸기는 그대로 돼요
// (대상 칸에 색 테두리가 떠서 보여요, 놓은 뒤 실행취소 한 번으로 되돌려요).
function overDrawer(x: number, y: number): boolean {
  if (typeof document === "undefined" || !document.documentElement.hasAttribute("data-lib-dragging")) return false;
  const r = document.querySelector("[data-side-panel]")?.getBoundingClientRect();
  return !!r && r.width > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
function resolveForDrag(...args: Parameters<typeof resolveDropTarget>): ReturnType<typeof resolveDropTarget> {
  const hit = resolveDropTarget(...args);
  return hit && hit.result.kind === "add" && overDrawer(args[1], args[2]) ? null : hit;
}

function setDragMode(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.setAttribute("data-lib-dragging", "true");
  else document.documentElement.removeAttribute("data-lib-dragging");
}

export function libraryPhotoDragProps(photo: LibraryPhotoInfo) {
  return {
    draggable: true as const,
    onDragStart: (e: React.DragEvent<HTMLElement>) => {
      dragging = photo;
      requestAnimationFrame(() => {
        if (dragging === photo) setDragMode(true);
      });
      try {
        e.dataTransfer.setData(LIBRARY_DRAG_MIME, photo.url);
        e.dataTransfer.effectAllowed = "copy";
      } catch {
        /* 일부 브라우저는 setData를 막아요 — 모듈 변수로 이어가요 */
      }
    },
    onDragEnd: () => {
      dragging = null;
      setDragMode(false);
      clearHighlight();
    },
  };
}

export type LibraryDropResult =
  | { kind: "insert" | "replace"; scope: SlotScope; boxId: string }
  | { kind: "add"; canvas: string; xPct: number; yPct: number };

let highlighted: HTMLElement | null = null;
function clearHighlight() {
  if (highlighted) highlighted.removeAttribute("data-lib-drop");
  highlighted = null;
}
function setHighlight(el: HTMLElement, kind: "insert" | "replace" | "add") {
  if (highlighted === el && el.getAttribute("data-lib-drop") === kind) return;
  clearHighlight();
  el.setAttribute("data-lib-drop", kind);
  highlighted = el;
}

type Resolved = { el: HTMLElement; result: LibraryDropResult };

export function resolveDropTarget(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  resolveBox: (boxId: string) => { scope: SlotScope; box: ImageBoxDef } | null
): Resolved | null {
  if (!(target instanceof Element)) return null;
  const boxEl = target.closest<HTMLElement>("[data-image-box-id]");
  if (boxEl) {
    const found = resolveBox(boxEl.getAttribute("data-image-box-id") ?? "");
    const kind = found ? dropKindOfBox(found.box) : null;
    if (found && kind) return { el: boxEl, result: { kind, scope: found.scope, boxId: found.box.id } };
  }
  const canvasEl = target.closest<HTMLElement>("[data-lib-canvas]");
  if (!canvasEl) return null;
  const id = canvasEl.getAttribute("data-lib-canvas");
  if (!parseCanvasId(id)) return null;
  const r = canvasEl.getBoundingClientRect();
  if (!(r.width > 0) || !(r.height > 0)) return null;
  const xPct = ((clientX - r.left) / r.width) * 100;
  const yPct = ((clientY - r.top) / r.height) * 100;
  if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return null;
  return { el: canvasEl, result: { kind: "add", canvas: id as string, xPct, yPct } };
}

const STYLE = `
@media (max-width:1023.98px){html[data-lib-dragging] [data-side-panel]{pointer-events:none!important;opacity:.2;transition:opacity 120ms ease-out}}
@media (prefers-reduced-motion:reduce){html[data-lib-dragging] [data-side-panel]{transition:none}}
[data-lib-drop]{transition:none!important}
[data-lib-drop="insert"],[data-lib-drop="replace"]{z-index:99000!important}
[data-lib-drop="insert"]::before,[data-lib-drop="replace"]::before,[data-lib-drop="insert"]::after,[data-lib-drop="replace"]::after{content:"";position:absolute;inset:0;pointer-events:none;box-sizing:border-box;z-index:99999}
[data-lib-drop="insert"]::before{border:3px solid var(--color-sky,#3b82f6)}
[data-lib-drop="replace"]::before{border:3px dashed #d97706}
[data-lib-drop="insert"]::after{background:rgba(59,130,246,.16)}
[data-lib-drop="replace"]::after{background:rgba(217,119,6,.2)}
[data-lib-drop="add"]::before{content:"";position:absolute;inset:0;pointer-events:none;box-sizing:border-box;border:2px dashed var(--color-sky,#3b82f6);z-index:100001}
`;

export function LibraryDragController({
  enabled,
  resolveBox,
  onDropPhoto,
}: {
  enabled: boolean;
  resolveBox: (boxId: string) => { scope: SlotScope; box: ImageBoxDef } | null;
  onDropPhoto: (photo: LibraryPhotoInfo, result: LibraryDropResult) => void;
}) {
  const latest = useRef({ enabled, resolveBox, onDropPhoto });
  useEffect(() => {
    latest.current = { enabled, resolveBox, onDropPhoto };
  });
  useEffect(() => {
    const ours = (e: DragEvent) => !!dragging && !!e.dataTransfer && Array.from(e.dataTransfer.types ?? []).includes(LIBRARY_DRAG_MIME);
    const onOver = (e: DragEvent) => {
      if (!ours(e)) return;
      const cur = latest.current;
      const hit = cur.enabled ? resolveForDrag(e.target, e.clientX, e.clientY, cur.resolveBox) : null;
      if (!hit) {
        clearHighlight();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setHighlight(hit.el, hit.result.kind);
    };
    const onDrop = (e: DragEvent) => {
      if (!ours(e)) return;
      const cur = latest.current;
      const photo = dragging;
      const hit = cur.enabled && photo ? resolveForDrag(e.target, e.clientX, e.clientY, cur.resolveBox) : null;
      clearHighlight();
      dragging = null;
      setDragMode(false);
      if (!hit || !photo) return;
      e.preventDefault();
      cur.onDropPhoto(photo, hit.result);
    };
    const onEnd = () => {
      dragging = null;
      setDragMode(false);
      clearHighlight();
    };
    const onLeaveWindow = (e: DragEvent) => {
      if (e.relatedTarget === null && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) clearHighlight();
    };
    document.addEventListener("dragover", onOver, true);
    document.addEventListener("drop", onDrop, true);
    document.addEventListener("dragend", onEnd, true);
    document.addEventListener("dragleave", onLeaveWindow, true);
    return () => {
      document.removeEventListener("dragover", onOver, true);
      document.removeEventListener("drop", onDrop, true);
      document.removeEventListener("dragend", onEnd, true);
      document.removeEventListener("dragleave", onLeaveWindow, true);
      onEnd();
    };
  }, []);
  return <style data-library-drag-style>{STYLE}</style>;
}
