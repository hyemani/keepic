// 디자인 템플릿 공용 부품 — 판 크기(S/M/L, 하드/소프트) → 안전영역 좌표 변환, 글상자·스티커·사진칸 만들기 도우미, 타입이에요.
// lib/designTemplates.ts(스타일 5종을 하나의 목록으로 모으고, 적용·썸네일 도우미를 담은 파일)와
// lib/designFamilies/*.ts(스타일별 디자인 정의)가 같이 써요. 스타일 파일이 designTemplates.ts를 거꾸로 불러오면 순환이 생겨서
// 공용 부분만 이 파일로 분리했어요(designTemplates.ts는 이 파일의 내용을 그대로 다시 내보내서, 기존 import는 그대로 동작해요).
//
// 좌표 규칙: 모든 자리는 mm 기준 "안전영역"(재단선에서 15mm 안쪽 = 작업 파일 가장자리에서 20mm 안쪽) 안의 비율(0~1)로 적고,
// toolkit이 실제 판 크기에 맞춰 % 좌표와 pt로 바꿔줘요 → 어떤 크기에서도 같은 비율로 보여요.
// 글자 크기는 220mm 안전영역(= M 사이즈 내지) 기준 pt이고, 판이 작거나 크면 같은 비율로 줄이고 늘려요.
import type { ImageBoxDef, TextBoxDef } from "./albumTemplates";
import type { BackgroundSpec } from "./backgroundSpec";
import { textBoxPtToFontScale } from "./textBoxFontSize";
import { COVER_SPINE_CLEARANCE_MM } from "./coverSpine";

export const DESIGN_ID_PREFIX = "dt-"; // 디자인 템플릿이 만든 글상자·스티커 id 머리글(다시 적용할 때 이것만 바꿔 끼워요)

// ---------- 타입 ----------
// 판(앞표지·뒤표지·내지 낱장 한 장)의 실제 크기와 안전영역이에요(mm). 좌표 변환에 써요.
export type DesignGeo = {
  W: number; // 이 판(텍스트박스·사진박스가 기준으로 삼는 칸)의 가로 mm
  H: number; // 세로 mm
  x0: number; // 안전영역 왼쪽 끝(mm)
  y0: number;
  sw: number; // 안전영역 폭(mm)
  sh: number;
  k: number; // 글자·스티커 크기 배율(안전영역 220mm가 1)
  // 스티커(장식)가 넘어가면 안 되는 바깥 한계(mm) — 재단선. 스티커는 안전영역을 살짝 넘어도 되지만 재단선 밖(도련)으로는 안 나가게 눌러요.
  stk: { l: number; r: number; t: number; b: number };
};

export type DesignSlot = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  patch?: Partial<ImageBoxDef>; // 모양(아치·둥근 모서리)·테두리·기울기(rotation) 등 이 칸에만 붙는 값
};
export type DesignText = Omit<TextBoxDef, "id">;
export type DesignSticker = {
  url: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation?: number;
  aspect?: number; // 원본 가로÷세로(생략 = 정사각형). 필름·폴라로이드 틀처럼 가로세로가 다른 SVG에 써요.
  forSlots?: string[]; // 이 장식이 딸린 사진 칸 키들("left~0" 등) — lib/designSlotLink.ts의 linkLayoutDecoration이 붙여요. 그 칸에 사진이 없으면 인쇄에서 빠져요.
};
// 판 하나(낱장 한 장 / 앞표지 / 뒤표지)의 디자인이에요. 좌표는 전부 "그 판 자신"을 0~100%로 본 값이에요.
export type DesignPageLayout = {
  bg?: BackgroundSpec;
  slots: DesignSlot[];
  texts: DesignText[];
  stickers: DesignSticker[];
};

// 디자인이 어울리는 "테마"(행사·상황별 분류) — 패널 맨 위 5칸 탭(전체·가족·여행·커플·생일)이에요. 한 디자인이 여러 테마에 속할 수 있어요.
export type DesignThemeId = "family" | "travel" | "couple" | "birthday";
export const DESIGN_THEMES: { id: DesignThemeId; name: string }[] = [
  { id: "family", name: "가족" },
  { id: "travel", name: "여행" },
  { id: "couple", name: "커플" },
  { id: "birthday", name: "생일" },
];

export type InnerDesign = {
  id: string;
  style: string; // DESIGN_STYLES의 id
  themes: DesignThemeId[]; // 어울리는 테마(1개 이상)
  name: string;
  note: string;
  left: (g: DesignGeo) => DesignPageLayout;
  right: (g: DesignGeo) => DesignPageLayout;
};
export type CoverDesign = {
  id: string;
  style: string;
  themes: DesignThemeId[];
  name: string;
  note: string;
  front: (g: DesignGeo) => DesignPageLayout;
  back: (g: DesignGeo) => DesignPageLayout;
  spine: { bg: BackgroundSpec; titleFontFamily: string; titleColor: string };
  // 뒤표지 아래쪽의 키픽 로고 자리(로고 가운데 위치 %, 크기 %) — 디자인이 정한 자리로 옮겨서 글·사진과 안 겹치게 해요.
  backLogo: (g: DesignGeo) => { xPct: number; yPct: number; scalePct: number };
  // 표지 제목(coverTitle) — 표지 제목은 일반 글상자가 아니라 따로 저장돼서 템플릿은 서식만 정해줘요.
  title: (g: DesignGeo) => {
    text: string;
    xPct: number;
    yPct: number;
    widthPct: number;
    fontFamily: string;
    pt: number;
    color: string;
    lineHeight: number;
    letterSpacing: number;
  };
};
// 스타일 파일이 만드는 디자인 정의(style은 designTemplates.ts가 붙여줘요)
// (스타일·테마는 designTemplates.ts가 붙여줘요. 테마·스타일을 정의 안에 직접 적은 새 디자인은 그 값이 우선이에요)
export type InnerDesignDef = Omit<InnerDesign, "style" | "themes"> & { style?: string; themes?: DesignThemeId[] };
export type CoverDesignDef = Omit<CoverDesign, "style" | "themes"> & { style?: string; themes?: DesignThemeId[] };

// ---------- 판 크기 → 안전영역 ----------
export const DESIGN_SAFE_EDGE_MM = 15; // GUIDE_SAFETY_MARGIN_MM(재단선 안쪽 안전여백)과 같아요
// 접히는 곳(내지 펼침면 가운데 · 표지 책등 쪽)의 안전 여백이에요(mm). 편집기의 회색 "접힘·제본 경계" 띠(app/upload/page.tsx의
// GUIDE_BINDING_MARGIN_MM = 도련 5 + 안전 15 = 20mm)와 같은 값 — 접히는 선에서 "한쪽 면 기준" 20mm(띠 전체 폭은 가운데 기준 양쪽 20mm씩 40mm)예요.
// 글·글상자·사진 칸·스티커는 이 안쪽(접힘선에서 20mm 이내)으로 들어가지 않아요. 편집기 쪽 값이 설정으로 바뀌는 게 아니라 고정값이라 여기도 상수예요.
export const FOLD_SAFE_MM = 20;
const REF_SAFE_MM = 220;

export function innerDesignGeo(pageWorkMm: number, bleedMm = 5): DesignGeo {
  const inset = bleedMm + DESIGN_SAFE_EDGE_MM;
  const s = Math.max(10, pageWorkMm - inset * 2);
  return { W: pageWorkMm, H: pageWorkMm, x0: inset, y0: inset, sw: s, sh: s, k: s / REF_SAFE_MM, stk: { l: bleedMm, r: bleedMm, t: bleedMm, b: bleedMm } };
}

// 낱장 한 장(left/right)의 접힘 쪽 스티커 한계를 FOLD_SAFE_MM으로 눌러요: 왼쪽 낱장은 오른쪽(가운데), 오른쪽 낱장은 왼쪽이 접히는 쪽이에요.
export function innerSideGeo(g: DesignGeo, side: "left" | "right"): DesignGeo {
  return { ...g, stk: side === "left" ? { ...g.stk, r: FOLD_SAFE_MM } : { ...g.stk, l: FOLD_SAFE_MM } };
}

// 앞표지/뒤표지 칸: 가로 = 판 + 바깥쪽 도련(책등 쪽은 도련 없음), 세로 = 판 + 위아래 도련.
// 책등 쪽 안쪽 여백은 COVER_SPINE_CLEARANCE_MM(28mm = 접힘 안전 20mm + 숨 쉴 자리 8mm, 45차) 비워요 — 글·사진 칸·스티커 모두 책등에서 28mm 안쪽으로는 안 들어가요.
export function coverDesignGeo(side: "front" | "back", panelMm: number, bleedMm: number): DesignGeo {
  const W = panelMm + bleedMm;
  const H = panelMm + bleedMm * 2;
  const outer = bleedMm + DESIGN_SAFE_EDGE_MM;
  const spineSide = COVER_SPINE_CLEARANCE_MM; // 책등 쪽은 접힘 안전(20mm) + 숨 쉴 자리(8mm) — lib/coverSpine.ts
  const x0 = side === "front" ? spineSide : outer;
  const x1 = side === "front" ? W - outer : W - spineSide;
  const sw = Math.max(10, x1 - x0);
  const sh = Math.max(10, H - outer * 2);
  return {
    W,
    H,
    x0,
    y0: outer,
    sw,
    sh,
    k: Math.min(sw, sh) / REF_SAFE_MM,
    stk: side === "front" ? { l: spineSide, r: bleedMm, t: bleedMm, b: bleedMm } : { l: bleedMm, r: spineSide, t: bleedMm, b: bleedMm },
  };
}

// ---------- 좌표 도우미 ----------
export type Frac4 = [number, number, number, number];

// 사진 틀 스티커(필름 띠·폴라로이드): SVG 안에서 사진이 보이는 "구멍"의 위치(스티커 전체 대비 0~1)와 가로÷세로.
// public/stickers/frame/frame-03.svg(400x320, 구멍 68~332 x 52~268), frame-04.svg(400x480, 구멍 44~356 x 44~344)에서 읽은 값이에요.
export const PHOTO_FRAMES = {
  film: { url: "/stickers/frame/frame-03.svg", aspect: 400 / 320, hole: [68 / 400, 52 / 320, 332 / 400, 268 / 320] as Frac4 },
  polaroid: { url: "/stickers/frame/frame-04.svg", aspect: 400 / 480, hole: [44 / 400, 44 / 480, 356 / 400, 344 / 480] as Frac4 },
} as const;
export type PhotoFrameKind = keyof typeof PHOTO_FRAMES;

export type TextOpts = {
  t: string;
  f: Frac4;
  font: string;
  pt: number; // 220mm 안전영역(M 내지) 기준 pt
  color?: string;
  align?: "left" | "center" | "right";
  lh?: number;
  ls?: number; // 자간(em)
  va?: "top" | "middle" | "bottom";
  bold?: boolean;
  bg?: string; // 글상자 전체를 이 색으로 채워요(알약·라벨·가는 줄 모양을 만들 때)
  radius?: number; // bg 모서리 둥글기(%), 50 = 알약
  hug?: boolean; // true면 bg가 글자 줄에만 붙어요(형광펜처럼)
  upper?: boolean; // 모두 대문자
  z?: number; // 쌓이는 순서(사진 칸은 200~, 스티커 500~, 글은 기본 1000~) — 사진 뒤에 깔 색 띠에만 DESIGN_BACK_Z(100)를 써요
};
// 사진 칸 뒤에 깔리는 색 띠(포토부스 띠 등)의 zOrder. 적용할 때 사진 칸은 200부터 쌓여서(page.tsx) 이 값보다 위에 와요.
export const DESIGN_BACK_Z = 100;
export const DESIGN_PHOTO_Z0 = 200;

export function toolkit(g: DesignGeo, defaultInk = "#222222") {
  const px = (mm: number) => (mm / g.W) * 100;
  const py = (mm: number) => (mm / g.H) * 100;
  const r = (f: Frac4) => ({
    xPct: px(g.x0 + f[0] * g.sw),
    yPct: py(g.y0 + f[1] * g.sh),
    widthPct: px(f[2] * g.sw),
    heightPct: py(f[3] * g.sh),
  });
  const slot = (f: Frac4, patch?: Partial<ImageBoxDef>): DesignSlot => ({ ...r(f), ...(patch ? { patch } : {}) });
  const text = (o: TextOpts): DesignText => ({
    text: o.t,
    ...r(o.f),
    fontFamily: o.font,
    fontScale: textBoxPtToFontScale(o.pt * g.k, g.W),
    color: o.color ?? defaultInk,
    align: o.align ?? "left",
    bold: o.bold ?? false,
    verticalAlign: o.va ?? "top",
    lineHeight: o.lh ?? 1.5,
    ...(o.ls !== undefined ? { letterSpacing: o.ls } : {}),
    ...(o.bg
      ? {
          backgroundColor: o.bg,
          backgroundMode: o.hug ? ("hugText" as const) : ("fillBox" as const),
          ...(o.radius !== undefined ? { cornerRadiusPct: o.radius } : {}),
        }
      : {}),
    ...(o.upper ? { textTransformUppercase: true } : {}),
    ...(o.z !== undefined ? { zOrder: o.z } : {}),
  });
  // 가는 줄/색 띠: 글상자 하나를 색으로 채워서 만들어요(글자는 눈에 안 보이는 빈 글자 하나).
  // 높이(f[3])가 줄 두께예요 — 0.0012(= 220mm 기준 약 0.26mm)면 헤어라인이에요.
  const rule = (f: Frac4, color: string, radius?: number, z?: number): DesignText => ({
    text: "​",
    ...r(f),
    fontFamily: "Pretendard, sans-serif",
    fontScale: textBoxPtToFontScale(4 * g.k, g.W),
    color,
    align: "left",
    bold: false,
    verticalAlign: "top",
    lineHeight: 1,
    backgroundColor: color,
    backgroundMode: "fillBox",
    ...(radius !== undefined ? { cornerRadiusPct: radius } : {}),
    ...(z !== undefined ? { zOrder: z } : {}),
  });
  // 스티커: 안전영역 비율로 정한 "가운데" 위치 + mm 크기(가로, 세로는 aspect로)
  const sticker = (url: string, cx: number, cy: number, sizeMm: number, rotation?: number, aspect = 1): DesignSticker => {
    const s = sizeMm * g.k;
    const h = s / aspect;
    // 기울인 스티커는 돌아간 네모(바깥 상자)가 재단선 밖으로 안 나가도록 중심을 눌러요(기울기 0이면 예전과 똑같아요).
    const a = ((rotation ?? 0) * Math.PI) / 180;
    const bw = (s * Math.abs(Math.cos(a)) + h * Math.abs(Math.sin(a))) / 2;
    const bh = (s * Math.abs(Math.sin(a)) + h * Math.abs(Math.cos(a))) / 2;
    const ccx = Math.min(Math.max(g.x0 + cx * g.sw, g.stk.l + bw), g.W - g.stk.r - bw);
    const ccy = Math.min(Math.max(g.y0 + cy * g.sh, g.stk.t + bh), g.H - g.stk.b - bh);
    const left = ccx - s / 2;
    const top = ccy - h / 2;
    return {
      url,
      xPct: px(left),
      yPct: py(top),
      widthPct: px(s),
      heightPct: py(h),
      ...(rotation ? { rotation } : {}),
      ...(aspect !== 1 ? { aspect } : {}),
    };
  };
  // 사진 틀(필름·폴라로이드): 틀 스티커와 그 구멍에 딱 맞는 사진 칸을 한 쌍으로 만들어요.
  // cx, cy = 틀 가운데(안전영역 비율), wFrac = 틀 가로(안전영역 폭 비율), rot = 기울기(도, 시계방향).
  // 기울여도 사진 칸이 틀 구멍과 같이 돌아가도록 구멍 중심을 틀 중심 기준으로 같이 돌려요. 사진 칸은 구멍보다 3%쯤 커서 틀 밑으로 살짝 들어가요.
  const framed = (kind: PhotoFrameKind, cx: number, cy: number, wFrac: number, rot = 0, patch?: Partial<ImageBoxDef>) => {
    const fr = PHOTO_FRAMES[kind];
    const w = wFrac * g.sw;
    const h = w / fr.aspect;
    const ccx = g.x0 + cx * g.sw;
    const ccy = g.y0 + cy * g.sh;
    const [hx0, hy0, hx1, hy1] = fr.hole;
    const hw = (hx1 - hx0) * w * 1.03;
    const hh = (hy1 - hy0) * h * 1.03;
    const dx = ((hx0 + hx1) / 2 - 0.5) * w;
    const dy = ((hy0 + hy1) / 2 - 0.5) * h;
    const a = (rot * Math.PI) / 180;
    const scx = ccx + dx * Math.cos(a) - dy * Math.sin(a);
    const scy = ccy + dx * Math.sin(a) + dy * Math.cos(a);
    const stk: DesignSticker = {
      url: fr.url,
      xPct: px(ccx - w / 2),
      yPct: py(ccy - h / 2),
      widthPct: px(w),
      heightPct: py(h),
      aspect: fr.aspect,
      ...(rot ? { rotation: rot } : {}),
    };
    const sl: DesignSlot = {
      xPct: px(scx - hw / 2),
      yPct: py(scy - hh / 2),
      widthPct: px(hw),
      heightPct: py(hh),
      ...(rot || patch ? { patch: { ...(rot ? { rotation: rot } : {}), ...(patch ?? {}) } } : {}),
    };
    return { slot: sl, sticker: stk };
  };
  return { r, slot, text, rule, sticker, framed };
}

export const solid = (color: string): BackgroundSpec => ({ kind: "solid", color });
