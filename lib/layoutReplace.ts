// 63차: "테마 안에서 레이아웃을 바꾸면 겹쳐 쌓지 않고 교체"하는 계산 모음이에요(순수 계산 — 저장·화면 상태는 안 건드려요).
//
// 왜 겹쳤나: 레이아웃 패널은 사진 칸(사진 이미지박스)만 새 자리로 옮기고, 디자인(테마)이 만든 스티커(폴라로이드 틀·테이프)와
// 그림자 띠 글상자는 "스티커/장식은 손 안 댄다"는 규칙 때문에 옛 자리에 그대로 남았어요. 그래서 1장 → 3장으로 바꾸면 옛 폴라로이드 틀 1개 + 새 사진 칸 3개가 겹쳤어요.
//
// 고친 방식(이 파일이 하는 일):
//  1) 지우는 것 = "사진 칸에 딸린 디자인 장식"만. 새 앨범은 forSlots 표시로, 표시 없는 예전 저장본은 dt- id로 디자인 정의를 찾아(LegacyDecoLinker) 같은 판단을 해요.
//     dt- 이름의 "페이지 장식"(꽃·손글씨 제목·바탕 띠: 칸에 안 딸린 것)과 사용자가 직접 넣은 글·스티커·표는 한 개도 안 지워요.
//  2) 다시 만드는 것 = 새 칸마다, 이 면의 디자인이 쓰던 "칸 종류"(틀 모양·테이프·그림자 띠·모서리·테두리·기울기)를 같은 방식으로 한 벌씩.
//     디자인의 칸 순서대로 돌려 써요(칸 j는 디자인 칸 j % 개수의 모양) — 같은 레이아웃을 몇 번 눌러도 id·좌표가 똑같아요(결정적).
//  3) 틀이 있는 칸: 틀을 새 칸 안에 비율을 지켜 "쏙" 맞게 넣고(기울기가 있으면 안 삐져나오게 줄여서), 사진 칸은 틀 구멍 안(3% 크게)에 놓아요.
//     틀 없는 칸: 사진 칸 = 새 레이아웃의 칸 그대로(개수·위치·비율·간격은 새 레이아웃을 따라요).
// 좌표는 모두 mm로 바꿔서 계산하고 마지막에 박스 좌표계(%)로 돌려놔요.
import type { ImageBoxDef, TextBoxDef } from "./albumTemplates";
import { isStickerImageBox } from "./albumTemplates";
import { DESIGN_PHOTO_Z0, PHOTO_FRAMES, type DesignGeo, type DesignPageLayout, type DesignSticker, type DesignText } from "./designKit";
import { slotKey, type LegacyDecoLinker } from "./designSlotLink";
import { designIdOfItem, designItemId, makeDesignStickerBox, sideOfDesignItem } from "./designTemplates";

export type ReplaceSide = "left" | "right" | "front" | "back";
type Cell = { xPct: number; yPct: number; widthPct: number; heightPct: number };
type Rect = { cx: number; cy: number; w: number; h: number }; // mm, 가운데 기준

const FRAME_BY_URL = new Map<string, (typeof PHOTO_FRAMES)[keyof typeof PHOTO_FRAMES]>(Object.values(PHOTO_FRAMES).map((f) => [f.url, f]));
const rad = (d: number) => (d * Math.PI) / 180;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
// 새로 만드는 장식 id 번호는 100부터 — 디자인 정의의 원래 번호(0~)와 안 겹쳐요.
export const REPLACE_ITEM_N0 = 100;

type Recipe = {
  slot: Rect;
  rot: number;
  patch: Partial<ImageBoxDef>; // rotation 은 뺀 값(모양·테두리 등)
  frame?: { st: DesignSticker; rect: Rect; kind: (typeof PHOTO_FRAMES)[keyof typeof PHOTO_FRAMES] };
  tapes: { st: DesignSticker; rect: Rect }[];
  backs: { t: DesignText; rect: Rect }[];
};

const rectMm = (o: Omit<Cell, "heightPct"> & { heightPct?: number }, g: DesignGeo): Rect => ({
  cx: ((o.xPct + o.widthPct / 2) / 100) * g.W,
  cy: ((o.yPct + (o.heightPct ?? 0) / 2) / 100) * g.H,
  w: (o.widthPct / 100) * g.W,
  h: ((o.heightPct ?? 0) / 100) * g.H,
});

// 디자인 한 면(forSlots 가 붙은 layout)에서 칸마다의 "칸 종류"를 뽑아요.
// (여러 칸이 같이 쓰는 띠 — forSlots 가 2칸 이상 — 는 칸 개수가 바뀌면 뜻이 없어져서 다시 만들지 않아요. 지우기만 해요.)
export function recipesFromLayout(layout: DesignPageLayout, side: ReplaceSide, g: DesignGeo): Recipe[] {
  return layout.slots.map((s, si) => {
    const key = slotKey(side, si);
    const { rotation, ...patch } = (s.patch ?? {}) as Partial<ImageBoxDef>;
    const mine = (forSlots?: string[]) => !!forSlots && forSlots.length === 1 && forSlots[0] === key;
    const fSt = layout.stickers.find((st) => mine(st.forSlots) && FRAME_BY_URL.has(st.url));
    return {
      slot: rectMm(s, g),
      rot: rotation ?? 0,
      patch,
      frame: fSt ? { st: fSt, rect: rectMm(fSt, g), kind: FRAME_BY_URL.get(fSt.url)! } : undefined,
      tapes: layout.stickers.filter((st) => st !== fSt && mine(st.forSlots)).map((st) => ({ st, rect: rectMm(st, g) })),
      backs: layout.texts.filter((t) => mine(t.forSlots)).map((t) => ({ t, rect: rectMm(t, g) })),
    };
  });
}

const rot2 = (x: number, y: number, deg: number) => {
  const a = rad(deg);
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
};
const bboxOf = (w: number, h: number, deg: number) => {
  const a = rad(deg);
  return { w: w * Math.abs(Math.cos(a)) + h * Math.abs(Math.sin(a)), h: w * Math.abs(Math.sin(a)) + h * Math.abs(Math.cos(a)) };
};

type Unit = {
  photo: Rect;
  stickers: { st: DesignSticker; rect: Rect; rotation: number }[];
  backs: { t: DesignText; rect: Rect }[];
};

// 새 칸(cell, mm) 하나에 칸 종류(recipe)를 입혀요.
function placeUnit(rc: Recipe, cell: Rect): Unit {
  const stickers: Unit["stickers"] = [];
  const backs: Unit["backs"] = [];
  if (rc.frame) {
    const fr = rc.frame.kind;
    let fw = Math.min(cell.w, cell.h * fr.aspect);
    let fh = fw / fr.aspect;
    const bb = bboxOf(fw, fh, rc.rot);
    const sc = Math.min(1, cell.w / bb.w, cell.h / bb.h);
    fw *= sc;
    fh *= sc;
    const [hx0, hy0, hx1, hy1] = fr.hole;
    const hw = (hx1 - hx0) * fw * 1.03;
    const hh = (hy1 - hy0) * fh * 1.03;
    const d = rot2(((hx0 + hx1) / 2 - 0.5) * fw, ((hy0 + hy1) / 2 - 0.5) * fh, rc.rot);
    const k = fw / rc.frame.rect.w;
    stickers.push({ st: rc.frame.st, rect: { cx: cell.cx, cy: cell.cy, w: fw, h: fh }, rotation: rc.rot });
    const place = (rect: Rect): Rect => {
      const rel = rot2(rect.cx - rc.frame!.rect.cx, rect.cy - rc.frame!.rect.cy, -rc.rot);
      const n = rot2(rel.x * k, rel.y * k, rc.rot);
      return { cx: cell.cx + n.x, cy: cell.cy + n.y, w: rect.w * k, h: rect.h * k };
    };
    for (const t of rc.tapes) stickers.push({ st: t.st, rect: place(t.rect), rotation: t.st.rotation ?? 0 });
    for (const b of rc.backs) backs.push({ t: b.t, rect: place(b.rect) });
    return { photo: { cx: cell.cx + d.x, cy: cell.cy + d.y, w: hw, h: hh }, stickers, backs };
  }
  // 틀 없는 칸: 사진 칸 = 새 칸(기울기가 있으면 안 삐져나오게 줄여요)
  const bb = bboxOf(cell.w, cell.h, rc.rot);
  const sc = Math.min(1, cell.w / bb.w, cell.h / bb.h);
  const photo: Rect = { cx: cell.cx, cy: cell.cy, w: cell.w * sc, h: cell.h * sc };
  const k = Math.min(1.5, Math.max(0.5, Math.min(photo.w / rc.slot.w, photo.h / rc.slot.h)));
  const place = (rect: Rect, scaleBySlot: boolean): Rect => {
    const rel = rot2(rect.cx - rc.slot.cx, rect.cy - rc.slot.cy, -rc.rot);
    const n = rot2((rel.x / rc.slot.w) * photo.w, (rel.y / rc.slot.h) * photo.h, rc.rot);
    return scaleBySlot
      ? { cx: photo.cx + n.x, cy: photo.cy + n.y, w: (rect.w / rc.slot.w) * photo.w, h: (rect.h / rc.slot.h) * photo.h }
      : { cx: photo.cx + n.x, cy: photo.cy + n.y, w: rect.w * k, h: rect.h * k };
  };
  for (const t of rc.tapes) stickers.push({ st: t.st, rect: place(t.rect, false), rotation: t.st.rotation ?? 0 });
  for (const b of rc.backs) backs.push({ t: b.t, rect: place(b.rect, true) });
  return { photo, stickers, backs };
}

export type ReplaceInput = {
  sides: ReplaceSide[]; // 바꾸는 범위(내지: left/right 한쪽 또는 둘, 표지: front 또는 back)
  boxes: readonly ImageBoxDef[]; // 이 면(펼침면/표지 판)의 이미지박스 전부
  texts: Partial<Record<ReplaceSide, readonly TextBoxDef[]>>; // 면별 글상자(그 면 기준 %)
  g: DesignGeo; // 한 면(낱장/표지 판)의 디자인 좌표
  docMm: { w: number; h: number }; // 이미지박스 %가 가리키는 영역의 mm(내지: 펼침면 = 2배 폭, 표지: 판 하나)
  sideOffsetMm: (side: ReplaceSide) => number; // 그 면이 영역 안에서 시작하는 x(mm): 내지 오른쪽 = 낱장 폭, 그 외 0
  cells: Cell[]; // 새 칸(영역 기준 %)
  sideOfCell: (i: number) => ReplaceSide;
  layoutOf: (designId: string, side: ReplaceSide) => DesignPageLayout | null; // forSlots 가 붙은 디자인 한 면
  legacy?: LegacyDecoLinker; // 표시 없는 예전 저장본 판단용
};

export type ReplacePlan = {
  slotPatches: Partial<ImageBoxDef>[];
  removeBoxIds: Set<string>;
  removeTextIds: Set<string>;
  addStickers: ImageBoxDef[];
  addTexts: { side: ReplaceSide; box: TextBoxDef }[];
  designIds: Partial<Record<ReplaceSide, string>>;
};

const keySide = (k: string) => k.split("~")[0] as ReplaceSide;

// 칸에 딸린 장식인가(표시 우선, 없으면 예전 저장본 규칙) — 사용자가 직접 넣은 스티커·글은 여기에 안 걸려요.
function boundSide(id: string, forSlots: string[] | undefined, kind: "sticker" | "text", legacy?: LegacyDecoLinker): ReplaceSide | null {
  if (forSlots && forSlots.length > 0) return keySide(forSlots[0]);
  if (!id.startsWith("dt-") || !legacy) return null;
  const lk = legacy(id, kind);
  return lk && lk.keys.length > 0 ? keySide(lk.keys[0]) : null;
}

// 이 면에 입혀진 디자인 id를 찾아요: 디자인이 만든 장식 id(dt-) → 사진 칸에 남은 표시(layoutTemplateId "design:" / fromDesign).
function detectDesign(inp: ReplaceInput, side: ReplaceSide): string | undefined {
  for (const b of inp.boxes) {
    if (sideOfDesignItem(b.id) === side) return designIdOfItem(b.id) ?? undefined;
  }
  for (const t of inp.texts[side] ?? []) {
    if (sideOfDesignItem(t.id) === side) return designIdOfItem(t.id) ?? undefined;
  }
  const photoSide = (b: ImageBoxDef): ReplaceSide => {
    if (inp.sides.length === 1 && (inp.sides[0] === "front" || inp.sides[0] === "back")) return inp.sides[0];
    return b.xPct + b.widthPct / 2 < 50 ? "left" : "right";
  };
  for (const b of inp.boxes) {
    if (isStickerImageBox(b) || photoSide(b) !== side) continue;
    if (b.fromDesign) return b.fromDesign;
    if (b.layoutTemplateId?.startsWith("design:")) return b.layoutTemplateId.slice("design:".length);
  }
  return undefined;
}

export function planThemeReplace(inp: ReplaceInput): ReplacePlan | null {
  const inScope = (s: ReplaceSide | null) => !!s && inp.sides.includes(s);
  const removeBoxIds = new Set<string>();
  const removeTextIds = new Set<string>();
  for (const b of inp.boxes) {
    if (!isStickerImageBox(b)) continue;
    if (inScope(boundSide(b.id, b.forSlots, "sticker", inp.legacy))) removeBoxIds.add(b.id);
  }
  for (const s of inp.sides) {
    for (const t of inp.texts[s] ?? []) {
      if (!t.id.startsWith("dt-")) continue; // 사용자가 쓴 글상자는 절대 안 지워요
      if (inScope(boundSide(t.id, t.forSlots, "text", inp.legacy))) removeTextIds.add(t.id);
    }
  }
  const designIds: Partial<Record<ReplaceSide, string>> = {};
  for (const s of inp.sides) {
    const d = detectDesign(inp, s);
    if (d) designIds[s] = d;
  }
  if (removeBoxIds.size === 0 && removeTextIds.size === 0 && Object.keys(designIds).length === 0) return null;

  const recipeCache = new Map<string, Recipe[]>();
  const recipesOf = (side: ReplaceSide): { designId: string; list: Recipe[] } | null => {
    const order = [side, ...inp.sides.filter((s) => s !== side)];
    for (const s of order) {
      const did = designIds[s];
      if (!did) continue;
      const ck = `${did}|${s}`;
      let list = recipeCache.get(ck);
      if (!list) {
        const lay = inp.layoutOf(did, s);
        list = lay ? recipesFromLayout(lay, s, inp.g) : [];
        recipeCache.set(ck, list);
      }
      if (list.length > 0) return { designId: did, list };
    }
    return null;
  };

  const slotPatches: Partial<ImageBoxDef>[] = [];
  const addStickers: ImageBoxDef[] = [];
  const addTexts: ReplacePlan["addTexts"] = [];
  const idxInSide: Partial<Record<ReplaceSide, number>> = {};
  const counter: Partial<Record<ReplaceSide, number>> = {};
  const reset: Partial<ImageBoxDef> = { designSlot: undefined, frameShape: undefined, borderRadiusPct: undefined, borderWidthPx: undefined, borderColor: undefined };
  const toPct = (r: Rect) => ({
    xPct: r3(((r.cx - r.w / 2) / inp.docMm.w) * 100),
    yPct: r3(((r.cy - r.h / 2) / inp.docMm.h) * 100),
    widthPct: r3((r.w / inp.docMm.w) * 100),
    heightPct: r3((r.h / inp.docMm.h) * 100),
  });

  inp.cells.forEach((cell, j) => {
    const side = inp.sideOfCell(j);
    const si = idxInSide[side] ?? 0;
    idxInSide[side] = si + 1;
    const rs = recipesOf(side);
    const key = slotKey(side, si);
    if (!rs) {
      slotPatches.push({ ...reset, zOrder: DESIGN_PHOTO_Z0 + j, ...(designIds[side] ? { fromDesign: designIds[side] } : {}) });
      return;
    }
    const rc = rs.list[si % rs.list.length];
    const cellMm: Rect = {
      cx: ((cell.xPct + cell.widthPct / 2) / 100) * inp.docMm.w,
      cy: ((cell.yPct + cell.heightPct / 2) / 100) * inp.docMm.h,
      w: (cell.widthPct / 100) * inp.docMm.w,
      h: (cell.heightPct / 100) * inp.docMm.h,
    };
    const u = placeUnit(rc, cellMm);
    slotPatches.push({
      ...reset,
      ...rc.patch,
      ...toPct(u.photo),
      zOrder: DESIGN_PHOTO_Z0 + j,
      designSlot: key,
      fromDesign: rs.designId,
      ...(rc.rot ? { rotation: rc.rot } : {}),
    });
    for (const s of u.stickers) {
      const n = counter[side] ?? 0;
      counter[side] = n + 1;
      const geo = toPct(s.rect);
      const st: DesignSticker = { ...s.st, ...geo, forSlots: [key] };
      if (s.rotation) st.rotation = s.rotation;
      else delete st.rotation;
      addStickers.push(makeDesignStickerBox(st, designItemId(rs.designId, side, "s", REPLACE_ITEM_N0 + n), 100 + n, (x, w) => ({ xPct: x, widthPct: w })));
    }
    for (const b of u.backs) {
      const n = counter[side] ?? 0;
      counter[side] = n + 1;
      const off = inp.sideOffsetMm(side);
      const tb: TextBoxDef = {
        ...b.t,
        id: designItemId(rs.designId, side, "t", REPLACE_ITEM_N0 + n),
        xPct: r3(((b.rect.cx - b.rect.w / 2 - off) / inp.g.W) * 100),
        yPct: r3(((b.rect.cy - b.rect.h / 2) / inp.g.H) * 100),
        widthPct: r3((b.rect.w / inp.g.W) * 100),
        ...(b.t.heightPct === undefined ? { heightPct: undefined } : { heightPct: r3((b.rect.h / inp.g.H) * 100) }),
        forSlots: [key],
      };
      addTexts.push({ side, box: tb });
    }
  });
  return { slotPatches, removeBoxIds, removeTextIds, addStickers, addTexts, designIds };
}
