// 사진이 없는 칸의 장식(속 빈 폴라로이드·필름 틀, 허공의 테이프, 사진 뒤 그림자/색 띠)을 인쇄·인쇄 미리보기에서 빼는 단 하나의 입구예요(2026-10 33차).
// 표시(designSlot / forSlots)가 있는 작업은 lib/designSlotLink.ts가 바로 판단하고, 표시가 없는 예전 저장본은 여기서 dt- id로 디자인 정의를 찾아 같은 연결을 계산해요.
// 사진이 든 칸의 장식은 한 점도 안 바뀌어요(빼야 할 게 없으면 받은 객체를 그대로 돌려줘요 → 사진을 다 채운 앨범은 PDF가 예전과 똑같아요).
import type { ImageBoxDef, SpreadDef, TextBoxDef } from "./albumTemplates";
import { coverDesignGeo, innerDesignGeo } from "./designKit";
import { isIntroDesignId } from "./designIntro";
import { findCoverDesign, findInnerDesign } from "./designTemplates";
import { linkLayoutDecoration, orphanDecorationIds, type LegacyDecoLinker, type SlotSide } from "./designSlotLink";

type InnerDims = { pageWorkMm: number; bleedMm: number };
type CoverDims = { panelMm: number; bleedMm: number };

const DEFAULT_INNER: InnerDims = { pageWorkMm: 260, bleedMm: 5 };
const DEFAULT_COVER: CoverDims = { panelMm: 250, bleedMm: 5 };

function parseItemId(id: string): { designId: string; side: string; kind: "sticker" | "text"; n: number } | null {
  if (!id.startsWith("dt-")) return null;
  const parts = id.slice(3).split("~");
  if (parts.length < 3) return null;
  const m = parts[2].match(/^([st])(\d+)$/);
  if (!m) return null;
  return { designId: parts[0], side: parts[1], kind: m[1] === "s" ? "sticker" : "text", n: Number(m[2]) };
}

// 예전 저장본용 연결 계산기 — 디자인 정의에서 "이 id의 장식이 어느 칸에 딸렸는지"와 "그 칸의 위치"를 돌려줘요.
export function makeLegacyLinker(kind: "inner" | "cover", inner: InnerDims = DEFAULT_INNER, cover: CoverDims = DEFAULT_COVER): LegacyDecoLinker {
  const cache = new Map<string, ReturnType<typeof linkLayoutDecoration> | null>();
  const layoutFor = (designId: string, side: string) => {
    const ck = `${designId}|${side}`;
    if (cache.has(ck)) return cache.get(ck) ?? null;
    let out: ReturnType<typeof linkLayoutDecoration> | null = null;
    try {
      if (kind === "inner" && (side === "left" || side === "right")) {
        const d = findInnerDesign(designId);
        if (d) out = linkLayoutDecoration(d[side](innerDesignGeo(inner.pageWorkMm, inner.bleedMm)), side);
      } else if (kind === "cover" && (side === "front" || side === "back")) {
        const d = findCoverDesign(designId);
        if (d) out = linkLayoutDecoration(d[side](coverDesignGeo(side, cover.panelMm, cover.bleedMm)), side);
      }
    } catch {
      out = null;
    }
    cache.set(ck, out);
    return out;
  };
  return (id, k) => {
    const p = parseItemId(id);
    if (!p || p.kind !== k) return undefined;
    // 소개 페이지 디자인의 글상자는 문구에 따라 달라져서(designIntro.ts) 순번으로 옛 정의를 믿을 수 없어요 → 건드리지 않아요.
    if (k === "text" && isIntroDesignId(p.designId)) return undefined;
    const layout = layoutFor(p.designId, p.side);
    if (!layout) return undefined;
    const item = k === "sticker" ? layout.stickers[p.n] : layout.texts[p.n];
    const keys = item?.forSlots;
    if (!keys || keys.length === 0) return undefined;
    return {
      keys,
      slotRect: (key) => {
        const idx = Number(key.split("~")[1]);
        const s = layout.slots[idx];
        if (!s) return undefined;
        if (kind === "inner") {
          const x = p.side === "left" ? s.xPct * 0.5 : 50 + s.xPct * 0.5; // 내지 박스 좌표는 펼침면 전체 폭 기준
          return { x, y: s.yPct, w: s.widthPct * 0.5, h: s.heightPct };
        }
        return { x: s.xPct, y: s.yPct, w: s.widthPct, h: s.heightPct };
      },
    };
  };
}

// 내지 펼침면: 사진이 없는 칸의 장식을 뺀 펼침면을 돌려줘요(뺄 게 없으면 같은 객체).
export function stripOrphanDecorationSpread<T extends Pick<SpreadDef, "imageBoxes" | "textBoxesLeft" | "textBoxesRight">>(spread: T, inner?: InnerDims): T {
  const texts: TextBoxDef[] = [...(spread.textBoxesLeft ?? []), ...(spread.textBoxesRight ?? [])];
  const { boxIds, textIds } = orphanDecorationIds(spread.imageBoxes, texts, makeLegacyLinker("inner", inner));
  if (boxIds.size === 0 && textIds.size === 0) return spread;
  return {
    ...spread,
    ...(spread.imageBoxes ? { imageBoxes: spread.imageBoxes.filter((b) => !boxIds.has(b.id)) } : {}),
    ...(spread.textBoxesLeft ? { textBoxesLeft: spread.textBoxesLeft.filter((b) => !textIds.has(b.id)) } : {}),
    ...(spread.textBoxesRight ? { textBoxesRight: spread.textBoxesRight.filter((b) => !textIds.has(b.id)) } : {}),
  };
}

// 표지 한 면(앞 또는 뒤): 이미지박스와 글상자 목록에서 빠질 id를 알려줘요.
export function orphanDecorationIdsCover(boxes: readonly ImageBoxDef[] | undefined, texts: readonly TextBoxDef[] | undefined, cover?: CoverDims): { boxIds: Set<string>; textIds: Set<string> } {
  return orphanDecorationIds(boxes, texts ?? [], makeLegacyLinker("cover", undefined, cover));
}

export function stripOrphanDecorationCoverSide(
  boxes: ImageBoxDef[] | undefined,
  texts: TextBoxDef[] | undefined,
  cover?: CoverDims
): { boxes: ImageBoxDef[] | undefined; texts: TextBoxDef[] | undefined } {
  const { boxIds, textIds } = orphanDecorationIdsCover(boxes, texts, cover);
  if (boxIds.size === 0 && textIds.size === 0) return { boxes, texts };
  return { boxes: boxes?.filter((b) => !boxIds.has(b.id)), texts: texts?.filter((b) => !textIds.has(b.id)) };
}

export type { SlotSide };
