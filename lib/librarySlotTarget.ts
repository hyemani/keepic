// 사진 목록(왼쪽 "올린 사진")에서 사진을 눌렀을 때 · 끌어다 놓았을 때 "어느 칸에 넣을지"를 고르는 순수 계산이에요(2026-10 41차).
// 규칙(위에서부터 먼저 맞는 것):
//  1) 선택한 사진 칸이 비어 있으면 → 그 칸에 넣어요(insert). 인쇄 안 되는 면의 칸이어도 직접 고른 건 따라요.
//  2) 선택한 사진 칸에 사진이 있으면 → 그 사진을 바꿔요(replace).
//  3) 아무것도 안 골랐거나(글상자·스티커·표 등 사진 칸이 아닌 걸 골랐을 때 포함) → "지금 보는 펼침면/표지"의 첫 빈 사진 칸에 넣어요(insert, auto).
//     순서는 빈 칸 채우기(lib/photoRefill.ts)가 쓰는 emptyPhotoBoxesOnSpread와 같아요(칸 순서 = 디자인의 칸 순서, 인쇄되는 면만).
//     표지는 앞면 → 뒷면 순서예요. 다른 펼침면의 빈 칸은 절대 건드리지 않아요.
//  4) 지금 보는 곳에 빈 칸이 없으면 → 예전처럼 새 사진 칸을 만들어요(add).
import { isStickerImageBox, type ImageBoxDef, type SpreadDef } from "./albumTemplates";
import { emptyPhotoBoxesOnSpread, isEmptyPhotoBox } from "./emptyPhotoSlots";

export type SlotScope = "front" | "back" | number; // 앞표지 · 뒤표지 · 내지/소개 펼침면 번호

export type LibraryContext =
  | { type: "spread"; index: number; spread: Pick<SpreadDef, "imageBoxes" | "intro" | "introDesign"> | undefined }
  | { type: "cover"; front: readonly ImageBoxDef[]; back: readonly ImageBoxDef[] };

export type LibraryClickTarget =
  | { kind: "insert"; scope: SlotScope; boxId: string; via: "selected" | "auto" }
  | { kind: "replace"; scope: SlotScope; boxId: string; via: "selected" }
  | { kind: "add" };

export type SelectedBoxRef = { scope: SlotScope; boxId: string } | null | undefined;

// 박스 하나를 끌어다 놓을 대상으로 볼 때: 빈 사진 칸 → insert, 사진 있는 사진 칸 → replace, 스티커·그 외 → null(대상 아님).
export function dropKindOfBox(box: Pick<ImageBoxDef, "url" | "kind"> | undefined | null): "insert" | "replace" | null {
  if (!box) return null;
  if (isStickerImageBox({ kind: box.kind, url: box.url ?? "" })) return null;
  return box.url ? "replace" : "insert";
}

function boxesOfScope(ctx: LibraryContext, scope: SlotScope): readonly ImageBoxDef[] | undefined {
  if (ctx.type === "spread") return scope === ctx.index ? (ctx.spread?.imageBoxes ?? []) : undefined;
  if (scope === "front") return ctx.front;
  if (scope === "back") return ctx.back;
  return undefined;
}

export function chooseLibraryTarget(ctx: LibraryContext, selected: SelectedBoxRef, opts?: { multiSelected?: boolean }): LibraryClickTarget {
  if (selected && !opts?.multiSelected) {
    const box = boxesOfScope(ctx, selected.scope)?.find((b) => b.id === selected.boxId);
    const kind = dropKindOfBox(box);
    if (box && kind) return { kind, scope: selected.scope, boxId: box.id, via: "selected" } as LibraryClickTarget;
  }
  if (ctx.type === "spread") {
    const first = emptyPhotoBoxesOnSpread(ctx.spread, ctx.index)[0];
    if (first) return { kind: "insert", scope: ctx.index, boxId: first.id, via: "auto" };
    return { kind: "add" };
  }
  const front = ctx.front.find(isEmptyPhotoBox);
  if (front) return { kind: "insert", scope: "front", boxId: front.id, via: "auto" };
  const back = ctx.back.find(isEmptyPhotoBox);
  if (back) return { kind: "insert", scope: "back", boxId: back.id, via: "auto" };
  return { kind: "add" };
}

// 왼쪽 목록에 보여줄 안내 종류: 선택한 칸에 들어감 / 선택한 사진을 바꿈 / 빈 칸에 차례로 들어감 / 새 칸으로 추가
export type LibraryHint = "insert" | "replace" | "fill" | "add";
export function libraryHintOf(t: LibraryClickTarget): LibraryHint {
  if (t.kind === "add") return "add";
  if (t.kind === "replace") return "replace";
  return t.via === "selected" ? "insert" : "fill";
}

// 끌어다 놓을 수 있는 영역 표식(data-lib-canvas)을 읽어요: "spread:3" · "cover:front" · "cover:back"
export type CanvasId = { type: "spread"; index: number } | { type: "cover"; side: "front" | "back" };
export function parseCanvasId(raw: string | null | undefined): CanvasId | null {
  if (!raw) return null;
  const m = /^(spread|cover):(.+)$/.exec(raw);
  if (!m) return null;
  if (m[1] === "spread") {
    const n = Number(m[2]);
    return Number.isInteger(n) && n >= 0 ? { type: "spread", index: n } : null;
  }
  return m[2] === "front" || m[2] === "back" ? { type: "cover", side: m[2] } : null;
}
