// "빈 칸 모두 지우기"(2026-10 34차) — 사진이 없는 칸을 그 칸에만 딸린 장식(틀·테이프·그림자 띠)과 함께 지워요.
// 사진이 든 칸·사진이 든 칸의 장식·글·스티커(칸에 안 딸린 것)는 한 점도 안 건드려요.
// 순서가 중요해요: 장식을 먼저 판단하고(칸이 아직 있어야 예전 저장본도 "비었다"고 알 수 있어요) 그다음 빈 칸을 지워요.
import type { ImageBoxDef, SpreadDef, TextBoxDef } from "./albumTemplates";
import { emptyPhotoBoxesOnSpread, isEmptyPhotoBox } from "./emptyPhotoSlots";
import { stripOrphanDecorationCoverSide, stripOrphanDecorationSpread } from "./orphanDecoration";

export type InnerDims = { pageWorkMm: number; bleedMm: number };
export type CoverDims = { panelMm: number; bleedMm: number };

// 펼침면 한 장: 인쇄되는 면의 빈 사진 칸과 그 장식을 지운 펼침면 + 지운 칸 수. 지울 게 없으면 같은 객체예요.
export function cleanEmptySlotsOnSpread(spread: SpreadDef, spreadIndex: number, dims?: InnerDims): { spread: SpreadDef; removed: number } {
  const empty = emptyPhotoBoxesOnSpread(spread, spreadIndex);
  if (empty.length === 0) return { spread, removed: 0 };
  const stripped = stripOrphanDecorationSpread(spread, dims);
  const gone = new Set(empty.map((b) => b.id));
  const imageBoxes = (stripped.imageBoxes ?? []).filter((b) => !gone.has(b.id));
  const keptIds = new Set(imageBoxes.map((b) => b.id));
  const next: SpreadDef = { ...stripped, imageBoxes };
  if (stripped.imageBoxOrder) next.imageBoxOrder = stripped.imageBoxOrder.filter((id) => keptIds.has(id));
  return { spread: next, removed: empty.length };
}

// 표지 한 면(앞 또는 뒤).
export function cleanEmptySlotsOnCover(
  boxes: ImageBoxDef[],
  texts: TextBoxDef[],
  dims?: CoverDims
): { boxes: ImageBoxDef[]; texts: TextBoxDef[]; removed: number } {
  const empty = boxes.filter(isEmptyPhotoBox);
  if (empty.length === 0) return { boxes, texts, removed: 0 };
  const s = stripOrphanDecorationCoverSide(boxes, texts, dims);
  const gone = new Set(empty.map((b) => b.id));
  return { boxes: (s.boxes ?? []).filter((b) => !gone.has(b.id)), texts: s.texts ?? [], removed: empty.length };
}
