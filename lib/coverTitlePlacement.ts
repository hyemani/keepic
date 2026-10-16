// 표지 "제목 칸"이 사진과 불필요하게 겹치지 않도록 레이아웃을 적용할 때 정하는 순수 계산이에요(51차, 혜민님 요청).
//
//  · 사진 칸(placeCoverSlots 결과)은 절대 건드리지 않아요 — 이 파일은 "비어 있는 기본 제목 칸의 세로 자리"와 "새로 만드는 문구 칸의 시작 위치"만 정해요.
//  · 사진 아래 문구 공간(캡션형): 문구 영역 맨 위에 제목 자리를 따로 떼고, 새로 만드는 문구 칸은 그 아래로 내려요.
//  · 여백형(사방 여백 등): 사진 아래(없으면 위) 여백 띠 안에 제목을 넣어요(한 줄이 들어갈 때만).
//  · 사진이 안전 상자를 꽉 채우는 구성(꽉 채우기·2단·격자 등): 자리가 없으니 그대로 둬요(사진을 줄이지 않아요) — 제목은 사진 위에 올라가고, 글자를 쓸 때 읽기 쉽게 해 줘요(coverTitleReadability).
//  · 제목 글자가 이미 있거나 사용자가 칸을 옮기거나 크기를 바꾼 표지는 호출하는 쪽(page.tsx)이 아예 이 계산을 쓰지 않아요(isCoverTitleBoxPristine).
import type { LayoutSlot, PhotoLayoutTemplate } from "./photoLayoutTemplates";
import { captionSlotFor } from "./photoLayoutTemplates";
import { coverSafeBoxPct, placeCoverSlots, fitSlotToCoverSafeBox, clampCaptionSlotToCover } from "./coverLayoutVariants";

type Dims = { panelMm: number; bleedMm: number };

/** 새 앨범 기본 제목 칸 세로 위치(앞표지 판 기준 %) — page.tsx의 coverTitleYPct 초기값과 같아요. */
export const DEFAULT_COVER_TITLE_Y_PCT = 84;
const PAD_MM = 2; // 캡션형에서 제목 자리 위아래 여유
const MIN_CAPTION_PCT = 6; // 제목 자리를 떼고도 문구 칸이 이만큼은 남아야 해요(판 높이 %)
const PT_TO_MM = 25.4 / 72;

const r2 = (v: number) => Math.round(v * 100) / 100;
const ceil2 = (v: number) => Math.ceil(v * 100 - 1e-9) / 100; // 올림이라 사진 칸 쪽으로 내려가지 않아요

/** 제목 한 줄 높이(판 높이 %). */
export function coverTitleLinePct(dims: Dims, fontPt: number, lineHeightEm: number): number {
  const H = dims.panelMm + dims.bleedMm * 2;
  return H > 0 ? ((fontPt * PT_TO_MM * lineHeightEm) / H) * 100 : 0;
}

export type CoverTitlePlan = {
  kind: "caption" | "margin" | "keep";
  /** 비어 있는 기본 제목 칸의 세로 위치(판 높이 %). keep이면 기본값(84)이에요. */
  titleYPct: number;
  /** caption일 때 제목 자리 아래로 내린 새 문구 칸(없으면 undefined). */
  captionSlot?: LayoutSlot;
};

export function planCoverTitle(args: {
  placed: LayoutSlot[];
  captionSlot?: LayoutSlot | null;
  dims: Dims;
  fontPt: number;
  lineHeightEm: number;
}): CoverTitlePlan {
  const { placed, captionSlot, dims, fontPt, lineHeightEm } = args;
  const H = dims.panelMm + dims.bleedMm * 2;
  const line = coverTitleLinePct(dims, fontPt, lineHeightEm);
  const keep: CoverTitlePlan = { kind: "keep", titleYPct: DEFAULT_COVER_TITLE_Y_PCT };
  if (!(line > 0) || placed.length === 0) return keep;

  if (captionSlot) {
    const pad = H > 0 ? (PAD_MM / H) * 100 : 0;
    // 제목이 두 줄이어도 문구 칸과 안 겹치게 두 줄 높이를 떼고, 그러면 문구 칸이 너무 작아질 때만 한 줄 높이를 떼요.
    const zone2 = line * 2 + pad * 2;
    const zone1 = line + pad * 2;
    const zone = captionSlot.heightPct - zone2 >= MIN_CAPTION_PCT ? zone2 : zone1;
    if (captionSlot.heightPct - zone < MIN_CAPTION_PCT) return keep;
    return {
      kind: "caption",
      titleYPct: ceil2(captionSlot.yPct + pad),
      captionSlot: { ...captionSlot, yPct: r2(captionSlot.yPct + zone), heightPct: r2(captionSlot.heightPct - zone) },
    };
  }

  // 여백형: 안전 상자 안에서 사진이 쓰지 않는 아래(없으면 위) 띠를 찾아요. 제목 "한 줄 칸"이 통째로 들어갈 때만 옮겨요 —
  // 띠가 한 줄보다 좁으면(예: S 소프트 사방 여백의 13.6mm 띠 < 한 줄 15.2mm) 사진과 겹치게 억지로 넣느니 기본 자리를 그대로 둬요(숫자가 나빠지지 않게).
  const top = Math.min(...placed.map((s) => s.yPct));
  const bottom = Math.max(...placed.map((s) => s.yPct + s.heightPct));
  const safe = coverSafeBoxPct("front", dims);
  const bottomBand = safe.y1 - bottom;
  const topBand = top - safe.y0;
  if (bottomBand >= line) return { kind: "margin", titleYPct: ceil2(bottom + (bottomBand - line) / 2) };
  if (topBand >= line) return { kind: "margin", titleYPct: ceil2(safe.y0 + (topBand - line) / 2) };
  // 52차: 띠가 "줄 높이(글자 크기×행간)"보다 좁아도 실제 글자(윗부분~아랫부분 ≈ 글자 크기 1배)가 들어가면 그 띠 가운데에 글자를 앉혀요 — 줄 상자가 위아래로 반 행간만큼 띠 밖(사진 쪽 0.7mm)으로 나가도 글자 모양은 안 걸쳐요.
  // (예: S 소프트 사방 여백의 13.6mm 띠 < 한 줄 15.24mm지만 36pt 글자 모양 높이는 약 12.7mm) 사진·글자 크기는 줄이지 않아요.
  const ink = H > 0 ? ((fontPt * PT_TO_MM) / H) * 100 : 0;
  if (bottomBand >= ink) return { kind: "margin", titleYPct: ceil2(bottom + (bottomBand - line) / 2) };
  if (topBand >= ink) return { kind: "margin", titleYPct: ceil2(safe.y0 + (topBand - line) / 2) };
  return keep;
}

/** 레이아웃 하나를 앞표지에 적용할 때의 제목 계획(사진 칸·문구 칸 계산은 page.tsx applyCoverLayoutTemplate과 같은 lib 함수를 써요). */
export function planCoverTitleForTemplate(t: PhotoLayoutTemplate, dims: Dims, fontPt: number, lineHeightEm: number): CoverTitlePlan {
  const placed = placeCoverSlots(t, "front", dims);
  const raw = captionSlotFor(t);
  const cap = raw ? clampCaptionSlotToCover(fitSlotToCoverSafeBox(raw, "front", dims), "front", dims) : null;
  return planCoverTitle({ placed, captionSlot: cap, dims, fontPt, lineHeightEm });
}

/** 지금 크기·글자 설정 기준으로 레이아웃들이 "자동으로 정해 줄 수 있는" 제목 세로 위치 모음(저장했다 다시 연 표지에서도 자동 위치인지 알아보려고). */
export function coverTitleAutoYSet(templates: PhotoLayoutTemplate[], dims: Dims, fontPt: number, lineHeightEm: number): number[] {
  const ys = new Set<number>([DEFAULT_COVER_TITLE_Y_PCT]);
  for (const t of templates) ys.add(planCoverTitleForTemplate(t, dims, fontPt, lineHeightEm).titleYPct);
  return Array.from(ys);
}

/** 제목 칸이 "처음 그대로"인지: 글자 없음 + 크기·가로 위치 그대로 + 세로는 기본(84)이거나 자동 위치 중 하나. 하나라도 다르면 사용자가 만졌다고 보고 건드리지 않아요. */
export function isCoverTitleBoxPristine(b: {
  title: string;
  xPct: number;
  widthPct: number;
  heightPct?: number;
  yPct: number;
  defaultBox: { xPct: number; widthPct: number };
  autoYs: number[];
}): boolean {
  if (b.title.trim() !== "") return false;
  if (b.heightPct !== undefined) return false;
  if (Math.abs(b.xPct - b.defaultBox.xPct) > 0.01 || Math.abs(b.widthPct - b.defaultBox.widthPct) > 0.01) return false;
  return b.autoYs.some((y) => Math.abs(b.yPct - y) <= 0.02);
}

// ---- 읽기 쉬움(readability) ----
type Rgb = [number, number, number];
export function parseCssColor(c: string | undefined): Rgb | null {
  if (!c) return null;
  const s = c.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16)) as Rgb;
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)];
  m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return [+m[1], +m[2], +m[3]];
  return null;
}
function lin(v: number) {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}
export function luminance(c: Rgb): number {
  return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
}
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 글자 아래 어두운 판의 불투명도: 흰 글자가 "순백 사진" 위에서도 대비 4.5 이상이 되는 값(0.6 → 최악 약 5.7:1). */
export const READABILITY_PLATE_ALPHA = 0.6;
export const READABILITY_PLATE_COLOR = `rgba(0,0,0,${READABILITY_PLATE_ALPHA})`;

/**
 * 제목을 처음 쓸 때(서식을 한 번도 안 건드린 흰색 제목) 읽기 쉽게 하는 서식 변경이에요. 이미 쓴 제목·서식을 만진 제목에는 호출하지 않아요.
 *  · 사진 위에 올라가면: 흰 글자 + 반투명 검정 판(fillBox: 제목 칸 너비만큼 가로로 깔리는 띠 — 화면·미리보기·PDF 모두 같은 모양) — 사진이 아무리 밝아도 대비 4.5 이상(화면·미리보기·PDF 모두 같은 서식 필드라 똑같이 나와요).
 *  · 사진과 안 겹치면(여백 띠 등): 바탕색과 흰 글자의 대비가 4.5 미만일 때만 글자색을 진한 색으로.
 */
export function coverTitleReadability(args: {
  overlapsPhoto: boolean;
  bgColor?: string;
}): { color?: string; backgroundColor?: string; backgroundMode?: "hugText" | "fillBox" } | null {
  if (args.overlapsPhoto) return { backgroundColor: READABILITY_PLATE_COLOR, backgroundMode: "fillBox" };
  const bg = parseCssColor(args.bgColor ?? "#ffffff");
  if (!bg) return null;
  const white: Rgb = [255, 255, 255];
  const dark: Rgb = [26, 26, 26];
  if (contrastRatio(white, bg) >= 4.5) return null;
  return contrastRatio(dark, bg) > contrastRatio(white, bg) ? { color: "#1a1a1a" } : null;
}

/** 제목 칸(한 줄)이 사진 칸들과 겹치는 면적(판 % 제곱 단위, 0이면 안 겹침). */
export function titleOverlapPct2(box: { xPct: number; yPct: number; widthPct: number; heightPct: number }, slots: { xPct: number; yPct: number; widthPct: number; heightPct: number }[]): number {
  let a = 0;
  for (const s of slots) {
    const w = Math.min(box.xPct + box.widthPct, s.xPct + s.widthPct) - Math.max(box.xPct, s.xPct);
    const h = Math.min(box.yPct + box.heightPct, s.yPct + s.heightPct) - Math.max(box.yPct, s.yPct);
    if (w > 0 && h > 0) a += w * h;
  }
  return a;
}

// ---- 52차: 여러 줄 제목 위치 · 사진 밝기에 맞춘 글자색/판 · 판이 사진 밖으로 안 나가게 ----
type RectPct = { xPct: number; yPct: number; widthPct: number; heightPct: number };

/**
 * 제목이 여러 줄이 되면 첫 줄이 놓이던 자리(anchorYPct)에서 시작하면 아래 줄이 사진·안전선 밖으로 나가요.
 * 그래서 "글자 덩어리 아래쪽이 한계(제목이 올라앉은 사진의 아래쪽, 사진이 없으면 안전선, 아래에 문구 칸이 있으면 그 위)를 안 넘도록" 위로 올려 앉혀요(한 줄이면 원래 자리).
 * 사진 칸 크기·위치는 건드리지 않아요. 반환값은 제목 칸의 세로 위치(판 높이 %).
 */
export function coverTitleFitY(args: {
  anchorYPct: number;
  lineCount: number;
  linePct: number;
  insetYPct: number;
  xPct: number;
  widthPct: number;
  photos: RectPct[];
  obstaclesBelow: RectPct[];
  safe: { y0: number; y1: number };
}): number {
  const { anchorYPct, lineCount, linePct, insetYPct, xPct, widthPct, photos, obstaclesBelow, safe } = args;
  const block = Math.max(1, lineCount) * linePct + insetYPct * 2;
  const overlapX = (r: RectPct) => Math.min(xPct + widthPct, r.xPct + r.widthPct) - Math.max(xPct, r.xPct) > 0.01;
  const probe = anchorYPct + (linePct + insetYPct * 2) / 2; // 첫 줄 가운데
  let limit = safe.y1;
  const under = photos.filter((p) => overlapX(p) && p.yPct <= probe && probe < p.yPct + p.heightPct);
  if (under.length) limit = Math.max(...under.map((p) => p.yPct + p.heightPct));
  for (const o of obstaclesBelow) if (overlapX(o) && o.yPct >= anchorYPct + 0.05) limit = Math.min(limit, o.yPct);
  let y = Math.min(anchorYPct, limit - block);
  y = Math.max(Math.min(safe.y0, anchorYPct), y);
  return Math.round(y * 100) / 100;
}

/** fillBox 판이 사진 밖(여백·재단 쪽)으로 삐져나가지 않게, 글자 덩어리 높이 구간에서 사진들이 덮는 가로 범위(판 가로 %)로 제한한 판의 x0~x1을 돌려줘요. 겹치는 사진이 없으면 null(제한 없음). */
export function coverTitlePlateClip(args: { xPct: number; widthPct: number; topPct: number; bottomPct: number; photos: RectPct[] }): { x0: number; x1: number } | null {
  const { xPct, widthPct, topPct, bottomPct, photos } = args;
  const hit = photos.filter((p) => Math.min(bottomPct, p.yPct + p.heightPct) - Math.max(topPct, p.yPct) > 0.01);
  if (!hit.length) return null;
  const x0 = Math.max(xPct, Math.min(...hit.map((p) => p.xPct)));
  const x1 = Math.min(xPct + widthPct, Math.max(...hit.map((p) => p.xPct + p.widthPct)));
  if (x1 - x0 < 0.5) return null;
  // 이미 박스가 사진 안에 다 들어가면 제한할 게 없어요.
  if (Math.abs(x0 - xPct) < 0.01 && Math.abs(x1 - (xPct + widthPct)) < 0.01) return null;
  return { x0: Math.round(x0 * 100) / 100, x1: Math.round(x1 * 100) / 100 };
}

export type TitleTreatment = {
  color: "#ffffff" | "#1a1a1a";
  /** 판(배경)이 필요할 때만 값이 있어요. */
  backgroundColor?: string;
  worstContrast: number; // 4.5 이상이어야 하는 "95% 지점" 대비
  mode: "light-text" | "dark-text" | "light-text+dark-plate" | "dark-text+light-plate";
};

/**
 * 제목 글자 뒤 사진 픽셀들(rgba 바이트 배열)을 보고 글자색·판을 정해요. 대비 4.5:1 이상을 픽셀의 95% 이상에서 만족하는 가장 "덜 거슬리는" 조합:
 *  어두운 사진 → 흰 글자(판 없음) / 밝은 사진 → 진한 글자(판 없음) / 중간 밝기·복잡한 사진 → 평균 밝기에 따라 반투명 검정 판+흰 글자 또는 반투명 흰 판+진한 글자(투명도 낮은 쪽부터).
 * 판을 올린 뒤의 색은 브라우저가 섞는 방식(sRGB 값 그대로 섞기)과 같게 계산해요. 마지막 후보(흰 글자+검정 60% 판)는 어떤 사진에서도 최악 약 5.7:1이라 항상 통과해요.
 */
export function chooseCoverTitleTreatment(rgba: Uint8ClampedArray | number[]): TitleTreatment {
  const n = Math.floor(rgba.length / 4);
  const white: Rgb = [255, 255, 255];
  const dark: Rgb = [26, 26, 26];
  const px: Rgb[] = [];
  let sumL = 0;
  const step = Math.max(1, Math.floor(n / 4000));
  for (let i = 0; i < n; i += step) {
    const c: Rgb = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]];
    px.push(c);
    sumL += luminance(c);
  }
  const meanL = px.length ? sumL / px.length : 1;
  const passRatio = (text: Rgb, plate: Rgb | null, alpha: number) => {
    const cs = px
      .map((c) => {
        const bg: Rgb = plate ? [c[0] * (1 - alpha) + plate[0] * alpha, c[1] * (1 - alpha) + plate[1] * alpha, c[2] * (1 - alpha) + plate[2] * alpha] : c;
        return contrastRatio(text, bg);
      })
      .sort((a, b) => a - b);
    const p5 = cs.length ? cs[Math.floor(cs.length * 0.05)] : 21;
    return { ok: p5 >= 4.5, p5 };
  };
  if (px.length === 0) return { color: "#ffffff", backgroundColor: READABILITY_PLATE_COLOR, worstContrast: 5.7, mode: "light-text+dark-plate" };
  let r = passRatio(white, null, 0);
  if (r.ok) return { color: "#ffffff", worstContrast: r.p5, mode: "light-text" };
  r = passRatio(dark, null, 0);
  if (r.ok) return { color: "#1a1a1a", worstContrast: r.p5, mode: "dark-text" };
  const darkPlateFirst = meanL < 0.35;
  const ladder: Array<["dark" | "light", number]> = darkPlateFirst
    ? [["dark", 0.3], ["dark", 0.45], ["dark", 0.6], ["light", 0.6], ["light", 0.75]]
    : [["light", 0.45], ["light", 0.6], ["light", 0.75], ["dark", 0.45], ["dark", 0.6]];
  for (const [kind, a] of ladder) {
    const res = kind === "dark" ? passRatio(white, [0, 0, 0], a) : passRatio(dark, [255, 255, 255], a);
    if (res.ok) {
      return kind === "dark"
        ? { color: "#ffffff", backgroundColor: `rgba(0,0,0,${a})`, worstContrast: res.p5, mode: "light-text+dark-plate" }
        : { color: "#1a1a1a", backgroundColor: `rgba(255,255,255,${a})`, worstContrast: res.p5, mode: "dark-text+light-plate" };
    }
  }
  const last = passRatio(white, [0, 0, 0], READABILITY_PLATE_ALPHA);
  return { color: "#ffffff", backgroundColor: READABILITY_PLATE_COLOR, worstContrast: last.p5, mode: "light-text+dark-plate" };
}
