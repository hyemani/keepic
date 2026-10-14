// "비어 있는 사진 칸"을 세는 단 하나의 기준이에요(2026-10 34차, 혜민님 결정: 빈 칸이 있으면 '다음'으로 못 넘어가요).
//
// 빈 사진 칸 = 사진(스티커가 아닌) 이미지박스인데 사진 주소(url)가 없는 것. 인쇄 PDF에는 이런 칸이 그려지지 않아 허전한 자리가 돼요.
// 세는 범위는 "인쇄되는 곳"만이에요:
//  - 내지: lib/printedSides.ts 기준으로 인쇄되는 면 위에 놓인 칸만(소개 페이지는 왼쪽 낱장만, 첫 펼침면은 오른쪽 1페이지만).
//    인쇄 안 되는 면의 빈 칸은 세지 않아요(디자인 적용 때 이미 정리돼요).
//  - 소개 페이지: 디자인이 입혀진 것만(옛 자동 소개 페이지는 칸이 없어요).
//  - 표지: 앞면·뒷면의 사진 칸(표지 디자인이 만든 칸 포함). 책등은 사진 칸이 없어요.
// 글상자는 상관없어요. 칸이 하나도 없는 책(칸 없는 표지·옛 소개 페이지 등)은 0이라 그냥 통과해요.
import { isStickerImageBox, type ImageBoxDef, type SpreadDef } from "./albumTemplates";
import { printedSidesOf, type PageSide } from "./printedSides";

type BoxLike = Pick<ImageBoxDef, "url" | "xPct" | "widthPct"> & { kind?: "photo" | "sticker" };

export const isEmptyPhotoBox = (b: BoxLike): boolean => !isStickerImageBox(b) && !b.url;
export const boxSideOf = (b: Pick<ImageBoxDef, "xPct" | "widthPct">): PageSide => (b.xPct + b.widthPct / 2 < 50 ? "left" : "right");

// 한 펼침면에서 "인쇄되는 면 위의 빈 사진 칸"을 박스 순서(디자인의 칸 순서 = 왼쪽 → 오른쪽) 그대로 돌려줘요.
export function emptyPhotoBoxesOnSpread(spread: Pick<SpreadDef, "imageBoxes" | "intro" | "introDesign"> | undefined, spreadIndex: number): ImageBoxDef[] {
  if (!spread) return [];
  if (spread.intro && !spread.introDesign) return [];
  const printed = printedSidesOf(spreadIndex, spread);
  return (spread.imageBoxes ?? []).filter((b) => isEmptyPhotoBox(b) && printed.includes(boxSideOf(b)));
}

export type EmptySlotTarget = { kind: "spread"; index: number } | { kind: "cover"; side: "front" | "back" };
export type EmptySlotGroup = {
  target: EmptySlotTarget;
  label: string; // "2–3쪽" · "소개 페이지" · "표지 앞면"
  count: number;
  firstBoxId: string;
  boxIds: string[];
};

// 화면 왼쪽 목록과 같은 쪽 번호 표기: 첫 펼침면은 "1", 그다음은 "2–3", "4–5"…(en dash).
export function spreadPageLabel(i: number): string {
  return i === 0 ? "1쪽" : `${2 * i}–${2 * i + 1}쪽`;
}

export function findEmptyPhotoSlots(input: {
  spreads: readonly SpreadDef[]; // 소개 페이지까지 포함한 전체 펼침면(customSpreads)
  coverFront?: readonly ImageBoxDef[];
  coverBack?: readonly ImageBoxDef[];
}): EmptySlotGroup[] {
  const out: EmptySlotGroup[] = [];
  const cover = (side: "front" | "back", boxes: readonly ImageBoxDef[] | undefined) => {
    const empty = (boxes ?? []).filter(isEmptyPhotoBox);
    if (empty.length > 0) out.push({ target: { kind: "cover", side }, label: side === "front" ? "표지 앞면" : "표지 뒷면", count: empty.length, firstBoxId: empty[0].id, boxIds: empty.map((b) => b.id) });
  };
  cover("front", input.coverFront);
  input.spreads.forEach((s, i) => {
    const empty = emptyPhotoBoxesOnSpread(s, i);
    if (empty.length > 0) {
      out.push({ target: { kind: "spread", index: i }, label: s.intro ? "소개 페이지" : spreadPageLabel(i), count: empty.length, firstBoxId: empty[0].id, boxIds: empty.map((b) => b.id) });
    }
  });
  cover("back", input.coverBack);
  return out;
}

export const countEmptyPhotoSlots = (groups: readonly EmptySlotGroup[]): number => groups.reduce((a, g) => a + g.count, 0);

// (40차) 사진 목록에 있지만 책(내지·소개 페이지·표지)의 어느 칸에도 안 쓰인 사진 수 — '다음' 안내창에서
// "남은 사진을 빈 칸에 직접 넣을 수 있어요" 한 줄을 보여줄지 정하는 데만 써요.
export function countUnusedLibraryPhotos(
  libraryUrls: readonly string[],
  spreads: readonly Pick<SpreadDef, "imageBoxes">[],
  coverFront: readonly Pick<ImageBoxDef, "url">[] | undefined,
  coverBack: readonly Pick<ImageBoxDef, "url">[] | undefined
): number {
  const used = new Set<string>();
  for (const sp of spreads) for (const b of sp.imageBoxes ?? []) if (b.url) used.add(b.url);
  for (const b of coverFront ?? []) if (b.url) used.add(b.url);
  for (const b of coverBack ?? []) if (b.url) used.add(b.url);
  return new Set(libraryUrls.filter((u) => !!u && !used.has(u))).size;
}
