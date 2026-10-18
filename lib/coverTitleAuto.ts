// 표지 제목 "자동 서식"(글자색·그림자·배경 판·자동 위치) 기록과 판단(53차, 혜민님 요청).
//
// 원칙
//  · 시스템이 자동으로 정한 값과 사용자가 직접 정한 값을 "따로" 기록해요(CoverTitleAuto). 레이아웃을 바꾸면 자동으로 정한 값만 다시 판단하고,
//    사용자가 한 번이라도 직접 만진 값(글자색·배경색·투명도·위치·그림자 …)은 절대 안 바꿔요.
//  · "자동인지"는 (1) 기록에 그 항목이 있고 (2) 지금 값이 기록한 값 그대로일 때만이에요 — 사용자가 같은 값을 직접 골라도, 패널을 거치면 기록이 지워져요(page.tsx).
//  · 이 기록은 새 앨범(새 방식 줄바꿈 v2)에서만 생겨요. 옛 앨범에는 필드 자체가 없어서(undefined) 어떤 경우에도 다시 꾸미지 않아요.
//  · 판은 "필요할 때만": 글자색+그림자로 대비 4.5:1이 안 나오거나 사진이 복잡할 때만 깔아요. 판은 글자 덩어리에 딱 맞게(좌우·상하 같은 여백) 깔고,
//    사진·안전선 밖으로 안 나가고, 다른 글상자와 겹치면 판을 접어요.
import { parseCssColor, luminance, contrastRatio, READABILITY_PLATE_ALPHA } from "./coverTitlePlacement";

type Rgb = [number, number, number];
export type RectPct = { xPct: number; yPct: number; widthPct: number; heightPct: number };

export type CoverTitleShadowValue = { color: string; blur: number; x: number; y: number; opacity: number };

/** 시스템이 자동으로 정해 준 값 기록. 항목이 없으면(undefined) "자동으로 정한 적 없음 = 사용자 값"이에요. */
export type CoverTitleAuto = {
  v: 1;
  /** 자동 세로 위치(여러 줄 위로 올려 앉히기)의 기준 원래 자리와, 우리가 지금까지 놓아 준 자리들. */
  anchorY?: number;
  ys?: number[];
  /** 자동으로 정한 글자색. */
  color?: string;
  /** 자동으로 정한 배경 판(없음 = bg: null). padX/padY는 글자 크기(em) 대비 %. */
  plate?: { bg: string | null; mode: "fillBox" | null; padX: number; padY: number };
  /** 자동으로 정한 그림자(없음 = null). */
  shadow?: CoverTitleShadowValue | null;
};

export type CoverTitleStyleNow = {
  color: string;
  bg?: string;
  mode?: string;
  padX: number;
  padY: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
};

const sameColor = (a: string | undefined, b: string | undefined) => (a ?? "").replace(/\s+/g, "").toLowerCase() === (b ?? "").replace(/\s+/g, "").toLowerCase();
const near = (a: number | undefined, b: number | undefined) => Math.abs((a ?? 0) - (b ?? 0)) < 1e-6;

export function shadowIsUnset(n: CoverTitleStyleNow): boolean {
  return n.shadowColor === undefined && n.shadowBlur === undefined && n.shadowOffsetX === undefined && n.shadowOffsetY === undefined && n.shadowOpacity === undefined;
}
function shadowMatches(n: CoverTitleStyleNow, s: CoverTitleShadowValue | null): boolean {
  if (s === null) return shadowIsUnset(n);
  return sameColor(n.shadowColor, s.color) && near(n.shadowBlur, s.blur) && near(n.shadowOffsetX, s.x) && near(n.shadowOffsetY, s.y) && near(n.shadowOpacity, s.opacity);
}

export type OwnedFields = { color: boolean; plate: boolean; shadow: boolean };

/** 지금 값 중 "아직 시스템이 정한 그대로"인 항목들. auto가 없으면 전부 false(=사용자 값이라 안 건드려요). */
export function ownedFields(auto: CoverTitleAuto | undefined, now: CoverTitleStyleNow): OwnedFields {
  if (!auto) return { color: false, plate: false, shadow: false };
  const color = auto.color !== undefined && sameColor(now.color, auto.color);
  let plate = false;
  if (auto.plate) {
    const p = auto.plate;
    const bgSame = p.bg === null ? now.bg === undefined : sameColor(now.bg, p.bg);
    const modeSame = (p.mode ?? undefined) === (now.mode ?? undefined);
    // 판이 없을 땐 여백 값은 눈에 안 보여서 사용자가 만져도 상관없어요(판이 생길 때 자동 값으로 다시 정해요).
    plate = bgSame && modeSame && (p.bg === null || (near(now.padX, p.padX) && near(now.padY, p.padY)));
  }
  const shadow = auto.shadow !== undefined && shadowMatches(now, auto.shadow);
  return { color, plate, shadow };
}

// ---- 판 여백: 좌우·상하가 눈으로 같게 ----
export const PLATE_VISUAL_PAD_EM = 0.3;
/** 글자 덩어리(줄 상자) 기준 안쪽 여백(em 대비 %). 위아래는 행간 절반이 이미 글자와 판 사이에 있으니 그만큼 빼서 눈에 보이는 여백이 좌우와 같게 해요. */
export function autoPlatePads(lineHeightEm: number): { padX: number; padY: number } {
  const halfLeading = Math.max(0, (lineHeightEm - 1) / 2);
  const padY = Math.max(0.08, PLATE_VISUAL_PAD_EM - halfLeading);
  return { padX: Math.round(PLATE_VISUAL_PAD_EM * 100), padY: Math.round(padY * 100) };
}

// ---- 읽기 쉬움 판단: 글자색 → 그림자 → 판 순으로 덜 거슬리는 것부터 ----
/** 그림자가 글자 가장자리 배경을 얼마나 어둡게(밝게) 만든다고 볼지(보수적으로 40%). 화면에서 실제 값을 재서 확인했어요(.agent_scratch/round53). */
export const SHADOW_MODEL_K = 0.27;
export const AUTO_SHADOW_DARK: CoverTitleShadowValue = { color: "#000000", blur: 0.2, x: 0, y: 0.02, opacity: 100 };
export const AUTO_SHADOW_LIGHT: CoverTitleShadowValue = { color: "#ffffff", blur: 0.2, x: 0, y: 0.02, opacity: 100 };

export type TitleStyleChoice = {
  color: string;
  plateBg: string | null; // rgba(...) 또는 null
  shadow: CoverTitleShadowValue | null;
  worstContrast: number;
  kind: "plain-light" | "plain-dark" | "shadow" | "plate" | "fixed";
};

type ShadowOpt = { kind: "dark" | "light" } | { kind: "fixed"; rgb: Rgb; k: number } | null;
type PlateOpt = { rgb: Rgb; alpha: number; css: string } | { fixed: true; rgb: Rgb; alpha: number; css: string } | null;

function parseRgba(c: string | undefined): { rgb: Rgb; alpha: number } | null {
  if (!c) return null;
  const rgb = parseCssColor(c);
  if (!rgb) return null;
  const m = c.match(/rgba\(\s*\d+[,\s]+\d+[,\s]+\d+[,\s/]+([\d.]+)/i);
  return { rgb, alpha: m ? Math.max(0, Math.min(1, parseFloat(m[1]))) : 1 };
}

/**
 * 글자 뒤 픽셀들(rgba 바이트 배열, 사진이 없으면 바탕색 한 점)을 보고 "수정 가능한 항목만" 골라 대비 4.5:1(픽셀 95%)을 넘는 가장 덜 거슬리는 조합을 정해요.
 *  · owned가 false인 항목(사용자 값)은 지금 값 그대로 고정하고 그 값으로 대비를 재요.
 *  · overlapsPhoto=false(여백 위)면 판·그림자는 안 써요(고정된 사용자 값은 예외).
 */
export function chooseCoverTitleStyle(args: {
  pixels: Uint8ClampedArray | number[] | null;
  flatBg?: string; // pixels가 없을 때 바탕색
  overlapsPhoto: boolean;
  owned: OwnedFields;
  now: CoverTitleStyleNow;
  /** 판을 못 깔 때(다른 글상자와 겹침 등): 판 후보를 빼고 글자색·그림자로만 정해요. */
  forbidPlate?: boolean;
}): TitleStyleChoice {
  const { pixels, overlapsPhoto, owned, now } = args;
  const white: Rgb = [255, 255, 255];
  const dark: Rgb = [26, 26, 26];
  const px: Rgb[] = [];
  let sumL = 0;
  if (pixels && pixels.length >= 4) {
    const n = Math.floor(pixels.length / 4);
    const step = Math.max(1, Math.floor(n / 4000));
    for (let i = 0; i < n; i += step) {
      const c: Rgb = [pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]];
      px.push(c);
      sumL += luminance(c);
    }
  } else {
    px.push(parseCssColor(args.flatBg ?? "#ffffff") ?? [255, 255, 255]);
    sumL = luminance(px[0]);
  }
  const meanL = sumL / px.length;

  // 글자색 후보
  const userText = parseCssColor(now.color) ?? white;
  const texts: { css: string; rgb: Rgb }[] = owned.color ? (meanL < 0.4 ? [{ css: "#ffffff", rgb: white }, { css: "#1a1a1a", rgb: dark }] : [{ css: "#1a1a1a", rgb: dark }, { css: "#ffffff", rgb: white }]) : [{ css: now.color, rgb: userText }];
  // 그림자 후보
  const fixedShadowRgb = parseCssColor(now.shadowColor) ?? [0, 0, 0];
  const shadows: ShadowOpt[] = owned.shadow
    ? overlapsPhoto
      ? [null, { kind: "dark" }, { kind: "light" }]
      : [null]
    : shadowIsUnset(now)
      ? [null]
      : [{ kind: "fixed", rgb: fixedShadowRgb, k: Math.min(1, Math.max(0, ((now.shadowOpacity ?? 100) / 100) * SHADOW_MODEL_K * (now.shadowBlur !== undefined && now.shadowBlur === 0 && !(now.shadowOffsetX || now.shadowOffsetY) ? 0 : 1))) }];
  // 판 후보
  const userPlate = parseRgba(now.bg);
  const plateLadder: PlateOpt[] = [];
  if (owned.plate) {
    plateLadder.push(null);
    if (overlapsPhoto && !args.forbidPlate) {
      const darkFirst = meanL < 0.35;
      const mk = (kind: "dark" | "light", a: number): PlateOpt => (kind === "dark" ? { rgb: [0, 0, 0], alpha: a, css: `rgba(0,0,0,${a})` } : { rgb: [255, 255, 255], alpha: a, css: `rgba(255,255,255,${a})` });
      (darkFirst
        ? [mk("dark", 0.3), mk("dark", 0.45), mk("dark", READABILITY_PLATE_ALPHA), mk("light", 0.6), mk("light", 0.75)]
        : [mk("light", 0.45), mk("light", 0.6), mk("light", 0.75), mk("dark", 0.45), mk("dark", READABILITY_PLATE_ALPHA)]
      ).forEach((p) => plateLadder.push(p));
    }
  } else if (userPlate) plateLadder.push({ fixed: true, rgb: userPlate.rgb, alpha: userPlate.alpha, css: now.bg as string });
  else plateLadder.push(null);

  const bgAfter = (c: Rgb, plate: PlateOpt, sh: ShadowOpt): Rgb => {
    let v: Rgb = c;
    if (plate) v = [v[0] * (1 - plate.alpha) + plate.rgb[0] * plate.alpha, v[1] * (1 - plate.alpha) + plate.rgb[1] * plate.alpha, v[2] * (1 - plate.alpha) + plate.rgb[2] * plate.alpha];
    if (sh) {
      const k = sh.kind === "fixed" ? sh.k : SHADOW_MODEL_K;
      const t: Rgb = sh.kind === "fixed" ? sh.rgb : sh.kind === "light" ? [255, 255, 255] : [0, 0, 0];
      v = [v[0] * (1 - k) + t[0] * k, v[1] * (1 - k) + t[1] * k, v[2] * (1 - k) + t[2] * k];
    }
    return v;
  };
  const p5 = (text: Rgb, plate: PlateOpt, sh: ShadowOpt) => {
    const cs = px.map((c) => contrastRatio(text, bgAfter(c, plate, sh))).sort((a, b) => a - b);
    return cs.length ? cs[Math.floor(cs.length * 0.05)] : 21;
  };

  type Combo = { t: (typeof texts)[number]; plate: PlateOpt; sh: ShadowOpt; cost: number; p5: number };
  const combos: Combo[] = [];
  texts.forEach((t, ti) => {
    for (const plate of plateLadder) {
      for (const sh of shadows) {
        // 덜 거슬리는 순서: 아무것도 없음(0) < 글자색 바꾸기(약간) < 그림자(3) < 판(10 + 불투명도)
        const cost = ti * 0.5 + (sh ? 3 : 0) + (plate && !("fixed" in plate) ? 10 + plate.alpha * 10 : 0) + (plate && !("fixed" in plate) && sh ? 20 : 0);
        combos.push({ t, plate, sh, cost, p5: p5(t.rgb, plate, sh) });
      }
    }
  });
  combos.sort((a, b) => a.cost - b.cost);
  const pass = combos.find((c) => c.p5 >= 4.5);
  const best = pass ?? combos.reduce((m, c) => (c.p5 > m.p5 ? c : m), combos[0]);
  const shadowVal: CoverTitleShadowValue | null = !best.sh || best.sh.kind === "fixed" ? null : best.sh.kind === "dark" ? AUTO_SHADOW_DARK : AUTO_SHADOW_LIGHT;
  const plateBg = best.plate && !("fixed" in best.plate) ? best.plate.css : null;
  const kind: TitleStyleChoice["kind"] = !owned.color && !owned.plate && !owned.shadow ? "fixed" : plateBg ? "plate" : shadowVal ? "shadow" : best.t.rgb === white ? "plain-light" : "plain-dark";
  return { color: best.t.css, plateBg, shadow: shadowVal, worstContrast: best.p5, kind };
}

// ---- 판 모양: 글자 덩어리에 딱 맞게, 사진·안전선 안에서, 다른 글상자는 피해서 ----
/** 판 가로 범위(앞표지 판 가로 %). 글자 줄 폭(앞표지 판 가로 % 단위, 줄 끝 띄어쓰기 뺀 값)으로 글자 덩어리 왼쪽~오른쪽을 구해 좌우 여백을 더하고 사진·안전선에 맞춰 잘라요. 판을 못 깔면(다른 글상자와 겹침 등) null. */
export function coverTitleHugPlate(a: {
  align: "left" | "center" | "right";
  xPct: number;
  widthPct: number;
  lineWidthsPct: number[];
  padXPct: number;
  topPct: number;
  bottomPct: number;
  photos: RectPct[];
  safeX: { x0: number; x1: number };
  avoid: RectPct[];
}): { x0: number; x1: number } | null {
  const { align, xPct, widthPct, lineWidthsPct, padXPct, topPct, bottomPct, photos, safeX, avoid } = a;
  if (!lineWidthsPct.length) return null;
  let inkL = Infinity;
  let inkR = -Infinity;
  for (const w of lineWidthsPct) {
    const l = align === "left" ? xPct : align === "right" ? xPct + widthPct - w : xPct + (widthPct - w) / 2;
    inkL = Math.min(inkL, l);
    inkR = Math.max(inkR, l + w);
  }
  let x0 = inkL - padXPct;
  let x1 = inkR + padXPct;
  // 사진 위라면 사진 가로 범위 안으로(판이 사진 밖 여백·재단 쪽으로 안 나가게). 사진과 안 겹치면(여백 위) 사진 제한은 없어요.
  const hit = photos.filter((p) => Math.min(bottomPct, p.yPct + p.heightPct) - Math.max(topPct, p.yPct) > 0.01 && Math.min(inkR, p.xPct + p.widthPct) - Math.max(inkL, p.xPct) > 0.01);
  if (hit.length) {
    x0 = Math.max(x0, Math.min(...hit.map((p) => p.xPct)));
    x1 = Math.min(x1, Math.max(...hit.map((p) => p.xPct + p.widthPct)));
  }
  x0 = Math.max(x0, safeX.x0);
  x1 = Math.min(x1, safeX.x1);
  // 다른 글상자: 글자 덩어리와 안 겹치면 그 상자 가장자리에서 판을 접고, 글자와 겹치면 판을 안 깔아요.
  for (const o of avoid) {
    const vOver = Math.min(bottomPct, o.yPct + o.heightPct) - Math.max(topPct, o.yPct) > 0.01;
    if (!vOver) continue;
    const oL = o.xPct;
    const oR = o.xPct + o.widthPct;
    const hOverInk = Math.min(inkR, oR) - Math.max(inkL, oL) > 0.01;
    if (hOverInk) return null;
    if (Math.min(x1, oR) - Math.max(x0, oL) > 0.01) {
      if (oL >= inkR - 0.01) x1 = Math.min(x1, oL);
      else if (oR <= inkL + 0.01) x0 = Math.max(x0, oR);
    }
  }
  if (x1 - x0 < 0.5) return null;
  return { x0: Math.round(x0 * 100) / 100, x1: Math.round(x1 * 100) / 100 };
}

/** 글상자(제목이 아닌 문구 칸 등)가 차지하는 자리를 대략 구해요(판이 그 위로 번지지 않게 피하려는 용도). 높이를 지정 안 한 상자는 줄 수 × 글자 크기로 어림해요 — 화면·인쇄가 같은 함수를 써서 같은 결과예요. */
export function estimateTextBoxRectPct(
  b: { text?: string; xPct: number; yPct: number; widthPct: number; heightPct?: number; fontScale?: number; lineHeight?: number },
  cell: { wMm: number; hMm: number },
  baseRatio: number
): RectPct | null {
  if (!b.text || !b.text.trim()) return null;
  if (b.heightPct !== undefined) return { xPct: b.xPct, yPct: b.yPct, widthPct: b.widthPct, heightPct: b.heightPct };
  const fontMm = cell.wMm * baseRatio * (b.fontScale ?? 1);
  const boxMm = (b.widthPct / 100) * cell.wMm;
  const lines = b.text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .reduce((n, l) => n + Math.max(1, Math.ceil((Array.from(l).length * fontMm * 0.6) / Math.max(1, boxMm))), 0);
  const hMm = lines * fontMm * (b.lineHeight ?? 1.4);
  return { xPct: b.xPct, yPct: b.yPct, widthPct: b.widthPct, heightPct: (hMm / cell.hMm) * 100 };
}
