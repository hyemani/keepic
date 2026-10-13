// 사진 칸과 "그 칸에만 어울리는 장식"을 이어 주는 도우미예요(2026-10 33차).
//
// 왜 필요한가: 폴라로이드·필름 틀, 마스킹테이프, 사진 뒤 그림자/색 띠는 사진이 있을 때만 의미가 있어요. 사진을 아직 안 채운 칸은
// 편집 화면에서 "PHOTO" 자리표시로 보이지만, 인쇄 PDF에는 사진이 없으니 속 빈 틀·허공의 테이프·색 상자만 찍혀 버렸어요.
// 혜민님 결정(A): 사진이 없는 칸의 장식은 칸과 함께 인쇄에서 빼요. 편집 화면은 그대로(자리표시 + 장식)라 칸을 채울 수 있어요.
//
// 연결 방식(명시적 표시 + 디자인 정의에서 한 번에 계산):
//  1) 디자인을 입힐 때 사진 칸마다 designSlot("left~0" = 면~칸 순번)을 붙이고, 그 칸에 딸린 장식(스티커·띠 상자)에는 forSlots(그 칸들의 키)를 붙여요.
//     어떤 장식이 어떤 칸에 딸렸는지는 디자인 정의의 좌표로 정해요(linkLayoutDecoration) — 스타일 파일마다 손으로 표시하지 않아도 모든 스타일이 같은 규칙을 써요.
//  2) 인쇄·미리보기에서는 forSlots의 칸에 사진이 하나도 없을 때만 그 장식을 빼요(orphanDecorationIds). 값이 없으면 절대 안 빼요.
//  3) 예전에 저장한 작업(표시 없음)은 dt- 글자 id로 디자인 정의를 찾아 같은 연결을 계산하고, 사진 칸은 위치로 찾아요(opts.legacy).
//     칸을 확실히 찾지 못하면 장식을 그대로 둬요(= 안전한 쪽).
// 이 파일은 designTemplates.ts를 불러오지 않아요(순환 방지) — 예전 저장본 연결은 lib/orphanDecoration.ts가 이어 줘요.
import { isStickerImageBox, type ImageBoxDef, type TextBoxDef } from "./albumTemplates";
import { DESIGN_BACK_Z, PHOTO_FRAMES, type DesignPageLayout } from "./designKit";

export type SlotSide = "left" | "right" | "front" | "back";
export const slotKey = (side: string, index: number): string => `${side}~${index}`;

type Rect = { x: number; y: number; w: number; h: number };
const rectOf = (o: { xPct: number; yPct: number; widthPct: number; heightPct?: number }): Rect => ({ x: o.xPct, y: o.yPct, w: o.widthPct, h: o.heightPct ?? 0 });
const centerOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const inside = (r: Rect, p: { x: number; y: number }, inflate = 0) => p.x >= r.x - inflate && p.x <= r.x + r.w + inflate && p.y >= r.y - inflate && p.y <= r.y + r.h + inflate;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
// 점에서 네모까지의 거리(안에 있으면 0) — 핀처럼 칸의 모서리에 붙은 장식이 가장 가까운 칸을 고를 때 써요
const distToRect = (r: Rect, p: { x: number; y: number }) => Math.hypot(Math.max(r.x - p.x, 0, p.x - (r.x + r.w)), Math.max(r.y - p.y, 0, p.y - (r.y + r.h)));

const FRAME_URLS: ReadonlySet<string> = new Set(Object.values(PHOTO_FRAMES).map((f) => f.url));
const TAPE_MAX_WIDTH_PCT = 18; // 이보다 큰 "테이프" 그림(줄 쳐진 메모지 등)은 사진에 붙은 테이프가 아니라 페이지 장식이에요
const TAPE_NEAR_PCT = 5; // 테이프 가운데가 사진 칸 가장자리에서 이만큼(페이지 %) 안쪽·바깥쪽이면 그 칸에 붙은 테이프로 봐요
const PIN_NEAR_PCT = 6;
const BACK_RULE_MAX_AREA_RATIO = 1.7; // 사진 뒤 색 상자가 연결된 칸들 넓이의 이 배수보다 크면 "페이지 바탕 면"이라 연결하지 않아요
const isBlankText = (t: string) => t.replace(/[​\s]/g, "") === "";

// 디자인 한 면(layout)의 스티커·띠 상자에 "어느 사진 칸에 딸렸는지"(forSlots)를 붙여서 돌려줘요. 칸이 없으면 그대로 돌려줘요.
export function linkLayoutDecoration(layout: DesignPageLayout, side: SlotSide): DesignPageLayout {
  if (layout.slots.length === 0) return layout;
  const slots = layout.slots.map((s) => rectOf(s));
  const centers = slots.map(centerOf);

  // 1) 틀(폴라로이드·필름): 칸 가운데를 품은 틀 중 가장 가까운 것
  const frames = layout.stickers.map((st, i) => ({ st, i })).filter(({ st }) => FRAME_URLS.has(st.url));
  const frameSlots = new Map<number, number[]>(); // 스티커 순번 → 칸 순번들
  slots.forEach((_, si) => {
    let best: { i: number; d: number } | null = null;
    for (const f of frames) {
      const r = rectOf(f.st);
      if (!inside(r, centers[si], 3)) continue;
      const d = dist(centerOf(r), centers[si]);
      if (!best || d < best.d) best = { i: f.i, d };
    }
    if (best) frameSlots.set(best.i, [...(frameSlots.get(best.i) ?? []), si]);
  });

  const stickerLinks: (number[] | undefined)[] = layout.stickers.map((st, i) => {
    const r = rectOf(st);
    const c = centerOf(r);
    if (FRAME_URLS.has(st.url)) return frameSlots.get(i);
    if (st.url.includes("/stickers/tape/") && st.widthPct <= TAPE_MAX_WIDTH_PCT) {
      const set = new Set<number>();
      slots.forEach((s, si) => {
        if (inside(s, c, TAPE_NEAR_PCT)) set.add(si);
      });
      frames.forEach((f) => {
        if (inside(rectOf(f.st), c, 0)) (frameSlots.get(f.i) ?? []).forEach((si) => set.add(si));
      });
      return set.size ? [...set] : undefined;
    }
    if (st.url.includes("icon-location") && st.widthPct <= TAPE_MAX_WIDTH_PCT) {
      let best: { si: number; d: number } | null = null;
      slots.forEach((s, si) => {
        if (!inside(s, c, PIN_NEAR_PCT)) return;
        const d = distToRect(s, c);
        if (!best || d < best.d) best = { si, d };
      });
      return best ? [(best as { si: number }).si] : undefined;
    }
    return undefined;
  });

  // 2) 사진 뒤에 깔린 빈 글상자 색 상자(그림자·포토부스 띠): 칸 가운데를 품고, 넓이가 칸들과 비슷할 때만
  const textLinks: (number[] | undefined)[] = layout.texts.map((t) => {
    if (t.zOrder !== DESIGN_BACK_Z || !t.backgroundColor || !isBlankText(t.text)) return undefined;
    const r = rectOf(t);
    const hit = centers.map((c, si) => (inside(r, c, 0) ? si : -1)).filter((si) => si >= 0);
    if (!hit.length) return undefined;
    const area = hit.reduce((a, si) => a + slots[si].w * slots[si].h, 0);
    if (r.w * r.h > area * BACK_RULE_MAX_AREA_RATIO) return undefined;
    return hit;
  });

  const keys = (ix?: number[]) => (ix && ix.length ? ix.map((i) => slotKey(side, i)) : undefined);
  return {
    ...layout,
    stickers: layout.stickers.map((st, i) => {
      const k = keys(stickerLinks[i]);
      return k ? { ...st, forSlots: k } : st;
    }),
    texts: layout.texts.map((t, i) => {
      const k = keys(textLinks[i]);
      return k ? { ...t, forSlots: k } : t;
    }),
  };
}

// ---------- 인쇄·미리보기에서 빼야 할 장식 찾기 ----------
// 예전 저장본용: dt- id → 그 장식이 딸린 칸 키들 + 칸 키 → 그 칸의 (박스와 같은 좌표계) 위치
export type LegacyDecoLinks = { keys: string[]; slotRect: (key: string) => { x: number; y: number; w: number; h: number } | undefined };
export type LegacyDecoLinker = (itemId: string, kind: "sticker" | "text") => LegacyDecoLinks | undefined;

const LEGACY_MATCH_NEAR_PCT = 4;

type PhotoBox = Pick<ImageBoxDef, "id" | "url" | "xPct" | "yPct" | "widthPct" | "heightPct" | "designSlot" | "kind">;

// 사진 칸 상태: "filled"(사진 있음) / "empty"(사진 없음) / undefined(이 칸을 확실히 못 찾음)
function slotStatus(key: string, photos: PhotoBox[], legacy?: LegacyDecoLinks): "filled" | "empty" | undefined {
  const tagged = photos.filter((b) => b.designSlot === key);
  if (tagged.length > 0) return tagged.some((b) => b.url) ? "filled" : "empty";
  if (!legacy) return undefined;
  const r = legacy.slotRect(key);
  if (!r) return undefined;
  const c = centerOf(r);
  let best: { b: PhotoBox; d: number } | null = null;
  for (const b of photos) {
    if (b.designSlot) continue; // 표시가 있는 박스는 다른 칸이에요
    const bc = centerOf(rectOf(b));
    if (!inside(r, bc, LEGACY_MATCH_NEAR_PCT)) continue;
    const ratio = (b.widthPct * b.heightPct) / Math.max(0.0001, r.w * r.h);
    if (ratio < 0.5 || ratio > 2) continue;
    const d = dist(bc, c);
    if (!best || d < best.d) best = { b, d };
  }
  if (!best) return undefined;
  return best.b.url ? "filled" : "empty";
}

// 사진 칸에 사진이 하나도 없어서 인쇄에서 빼야 하는 장식의 id들(스티커 박스 / 글상자).
// 표시(forSlots)가 있으면 그것으로, 없고 legacy가 주어지면 예전 저장본 규칙으로 판단해요. 빼야 할 게 없으면 빈 집합이에요.
export function orphanDecorationIds(
  boxes: readonly ImageBoxDef[] | undefined,
  texts: readonly TextBoxDef[],
  legacy?: LegacyDecoLinker
): { boxIds: Set<string>; textIds: Set<string> } {
  const boxIds = new Set<string>();
  const textIds = new Set<string>();
  const all = boxes ?? [];
  const photos: PhotoBox[] = all.filter((b) => !isStickerImageBox(b));
  const decide = (id: string, kind: "sticker" | "text", forSlots?: string[]): boolean => {
    if (forSlots && forSlots.length > 0) {
      // 새 방식: 연결된 칸 중 사진이 든 칸이 하나도 없으면 빼요(칸 박스가 지워졌어도 사진 없음으로 봐요)
      return forSlots.every((k) => slotStatus(k, photos) !== "filled");
    }
    if (!legacy || !id.startsWith("dt-")) return false;
    const lk = legacy(id, kind);
    if (!lk || lk.keys.length === 0) return false;
    // 예전 저장본: 모든 칸을 확실히 찾았고 전부 비었을 때만 빼요
    return lk.keys.every((k) => slotStatus(k, photos, lk) === "empty");
  };
  for (const b of all) if (isStickerImageBox(b) && decide(b.id, "sticker", b.forSlots)) boxIds.add(b.id);
  for (const t of texts) if (decide(t.id, "text", t.forSlots)) textIds.add(t.id);
  return { boxIds, textIds };
}
