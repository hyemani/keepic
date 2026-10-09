// "장식 프레임" — 사진 둘레에 그림(귀, 얼굴, 꽃, 리본 줄무늬, 물방울·별 무늬, 꽃잎 테두리)을
// 둘러주는 프레임들을 한 곳에서 만드는 파일이에요. 전부 키픽이 직접 그린 단순한 파스텔
// 플랫(2D) 벡터 그림이고, 외부 이미지 파일은 하나도 안 써요.
//
// ■ 화면과 인쇄가 똑같이 나오는 구조
//   buildFrameDecorLayout(종류, 색상, 가로px, 세로px)이 "그림 설계도(DecorLayout)"를 한 번
//   만들어요 — 설계도는 SVG path 문자열(d)과 색 목록일 뿐이에요.
//     · 화면(app/upload/page.tsx): frameDecorSvgInner()가 설계도를 <svg> 안쪽 문자열로 바꿔서
//       박스 위에 그려요.
//     · 인쇄(lib/printCompose.ts): drawFrameDecorLayout()이 같은 설계도를 canvas의
//       Path2D(d)로 그려요 (SVG path 문자열을 Path2D가 그대로 읽어요).
//   그림 좌표를 두 군데에서 따로 계산하는 일이 없어서 위치·색·두께가 어긋날 수 없어요.
//
// ■ 찌그러지지 않는 규칙(비율 규칙)
//   모든 크기는 박스 "짧은 변"(u = min(가로, 세로))에 대한 비율로 정해요. 그래서
//     · 박스를 가로로 늘려도 귀·눈·꽃·별·물방울은 둥근 채로 그대로이고(가로/세로를 따로
//       늘리는 preserveAspectRatio="none" 방식을 쓰지 않아요), 위치만 박스 크기를 따라가요.
//     · 화면(박스 px)과 인쇄(인쇄 px)가 크기만 다르고 모양은 같은 닮은꼴이에요.
//   패턴이 반복되는 프레임은 "개수"를 박스 크기로 정수로 계산해서 끝부분이 어정쩡하게
//   잘리지 않게 했어요(꽃잎 테두리: 변마다 꽃잎 개수를 정수로, 꽃 화환: 둘레를 정수 칸으로).
//   프레임별 규칙은 아래 각 build 함수 위 주석에 적어뒀어요.

import { starShapePoints } from "./frameShapes";

// ---- 타입 ----

export type FrameDecorKey =
  | "petalBorder"
  | "airmail"
  | "dots"
  | "stars"
  | "bear"
  | "frog"
  | "bunny"
  | "cat"
  | "wreath";

// path 하나 — d는 SVG path 문자열, 나머지는 색/선 정보예요(fill 없으면 칠하지 않아요).
export type DecorPrim = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fillRule?: "evenodd" | "nonzero";
  opacity?: number;
};

// 같은 클립(잘라내기 영역)을 공유하는 path 묶음 — clipD가 있으면 그 안쪽만 보여요.
export type DecorGroup = {
  clipD?: string;
  clipRule?: "evenodd" | "nonzero";
  prims: DecorPrim[];
};

// 사진이 보이는 창(박스 안쪽 위치와 크기, 모서리 둥글기 px) — 박스 좌표(px)예요.
export type DecorWindow = { x: number; y: number; w: number; h: number; r: number };

export type DecorLayout = {
  w: number;
  h: number;
  window: DecorWindow;
  groups: DecorGroup[];
  // 사진을 창보다 "사방으로 이만큼(px) 더 크게" 깔아요(프레임 그림이 창 가장자리를 덮고
  // 있을 때만 > 0). 창 가장자리가 소수점 px 위치일 때 "프레임의 안티앨리어싱 가장자리"와
  // "사진의 안티앨리어싱 가장자리"가 서로 반씩만 덮어서 뒤 배경(회색/흰색)이 가는 선처럼
  // 비치는 현상(이음새)을 막는 장치예요 — 늘어난 부분은 프레임 그림 아래에 숨어요. 프레임이
  // 창 둘레를 덮지 않는 꽃 화환은 0이에요.
  photoBleed: number;
};

export type FrameDecorPreset = {
  id: string;
  decor: FrameDecorKey;
  variant: string;
  label: string;
  group: "border" | "character" | "wreath";
};

// ---- 프리셋(썸네일 목록) ----

export const FRAME_DECOR_PRESETS: FrameDecorPreset[] = [
  { id: "petal-pink", decor: "petalBorder", variant: "pink", label: "꽃잎 핑크", group: "border" },
  { id: "petal-gray", decor: "petalBorder", variant: "gray", label: "꽃잎 회색", group: "border" },
  { id: "airmail-redblue", decor: "airmail", variant: "redBlue", label: "에어메일", group: "border" },
  { id: "airmail-mint", decor: "airmail", variant: "mintGray", label: "민트 줄무늬", group: "border" },
  { id: "airmail-yellow", decor: "airmail", variant: "yellowGray", label: "노랑 줄무늬", group: "border" },
  { id: "dots-yellow", decor: "dots", variant: "yellow", label: "노랑 물방울", group: "border" },
  { id: "dots-sky", decor: "dots", variant: "sky", label: "하늘 물방울", group: "border" },
  { id: "dots-pink", decor: "dots", variant: "pink", label: "핑크 물방울", group: "border" },
  { id: "stars-navy", decor: "stars", variant: "navy", label: "남색 별", group: "border" },
  { id: "stars-pink", decor: "stars", variant: "pink", label: "핑크 별", group: "border" },
  { id: "stars-orange", decor: "stars", variant: "orange", label: "주황 별", group: "border" },
  { id: "bear-brown", decor: "bear", variant: "brown", label: "곰돌이", group: "character" },
  { id: "bear-pink", decor: "bear", variant: "pink", label: "핑크곰", group: "character" },
  { id: "frog-green", decor: "frog", variant: "green", label: "개구리", group: "character" },
  { id: "frog-mint", decor: "frog", variant: "mint", label: "민트개구리", group: "character" },
  { id: "bunny-pink", decor: "bunny", variant: "pink", label: "토끼", group: "character" },
  { id: "bunny-lavender", decor: "bunny", variant: "lavender", label: "보라토끼", group: "character" },
  { id: "cat-orange", decor: "cat", variant: "orange", label: "고양이", group: "character" },
  { id: "cat-gray", decor: "cat", variant: "gray", label: "회색냥이", group: "character" },
  { id: "wreath-blossom", decor: "wreath", variant: "blossom", label: "벚꽃 화환", group: "wreath" },
];

// ---- path 만들기 도우미 ----

function f(n: number): number {
  return Math.round(n * 100) / 100;
}

function rectD(x: number, y: number, w: number, h: number): string {
  return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
}

function rrectD(x: number, y: number, w: number, h: number, rIn: number): string {
  const r = Math.max(0, Math.min(rIn, w / 2, h / 2));
  if (r <= 0.01) return rectD(x, y, w, h);
  return (
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}` +
    `V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}` +
    `H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}` +
    `V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`
  );
}

function ellipseD(cx: number, cy: number, rx: number, ry: number, rotDeg: number = 0): string {
  const a = (rotDeg * Math.PI) / 180;
  const ex = rx * Math.cos(a);
  const ey = rx * Math.sin(a);
  return (
    `M${f(cx - ex)} ${f(cy - ey)}A${f(rx)} ${f(ry)} ${f(rotDeg)} 1 0 ${f(cx + ex)} ${f(cy + ey)}` +
    `A${f(rx)} ${f(ry)} ${f(rotDeg)} 1 0 ${f(cx - ex)} ${f(cy - ey)}Z`
  );
}

function circleD(cx: number, cy: number, r: number): string {
  return ellipseD(cx, cy, r, r, 0);
}

function polyD(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${f(p.x)} ${f(p.y)}`).join("") + "Z";
}

// 창(사진이 보이는 곳)의 path
export function decorWindowPathD(win: DecorWindow): string {
  return rrectD(win.x, win.y, win.w, win.h, win.r);
}

// 사진이 실제로 그려지는(잘리는) 영역 = 창 + photoBleed. 화면(ImageBoxOverlay)과 인쇄
// (drawDecoratedImageBox)가 똑같이 이 함수를 써요. 사진 위치/확대 계산(cover)은 여전히 "원래
// 창" 기준이라 사진이 움직이거나 확대되는 느낌은 그대로예요.
export function decorPhotoClipWindow(layout: DecorLayout): DecorWindow {
  const e = layout.photoBleed;
  const win = layout.window;
  if (!(e > 0)) return win;
  return { x: win.x - e, y: win.y - e, w: win.w + 2 * e, h: win.h + 2 * e, r: win.r > 0 ? win.r + e : 0 };
}

// 사진 가장자리 이음새 방지용 여유(px): 짧은 변의 0.6%(최소 1px). 프레임 띠 두께(≥6%)보다
// 훨씬 작아서 늘어난 사진은 항상 띠 아래에 숨어요.
function photoBleedFor(u: number): number {
  return Math.max(1, 0.006 * u);
}

// 결과가 항상 같은(결정적인) 0~1 의사난수 — 화면/인쇄/다시 열기에서 꽃 위치·각도가 매번
// 똑같아야 해서 Math.random()은 쓰지 않아요.
function hash01(i: number, salt: number = 0): number {
  const s = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function safeWindow(x: number, y: number, w: number, h: number, r: number, boxW: number, boxH: number): DecorWindow {
  // 박스가 너무 작아서 창이 음수가 되는 일을 막아요.
  const ww = Math.max(1, Math.min(w, boxW));
  const hh = Math.max(1, Math.min(h, boxH));
  return { x: Math.max(0, x), y: Math.max(0, y), w: ww, h: hh, r };
}

// ---- 1. 꽃잎 테두리 (petalBorder) ----
// 비율 규칙: 꽃잎 반지름 pr = 짧은 변 u의 5% (가로/세로가 달라도 똑같은 크기의 "원").
// 변마다 꽃잎 "개수"를 정수로 계산해요: 개수 = round(변길이 ÷ (1.7×pr)) (최소 3개) — 꽃잎
// 사이 간격은 그 변을 정확히 등분해서 정해지니(1.5~1.9pr 사이) 모서리에서 꽃잎이 잘리거나
// 늘어나지 않고, 박스 비율이 바뀌어도 꽃잎은 항상 동그래요. 꽃잎은 바깥 테두리에만 붙고
// 가운데 사진 창은 항상 평범한 직사각형이에요(창 안쪽 여백 = 꽃잎 둘레 2.25pr).
const PETAL_PALETTES: Record<string, { petal: string; dot: string; line: string }> = {
  pink: { petal: "#F7B9CB", dot: "#FDE3EB", line: "#FFFFFF" },
  gray: { petal: "#C4C9D0", dot: "#E6E9ED", line: "#FFFFFF" },
};

function buildPetalBorder(variant: string, w: number, h: number): DecorLayout {
  const pal = PETAL_PALETTES[variant] ?? PETAL_PALETTES.pink;
  const u = Math.min(w, h);
  const pr = 0.05 * u;
  const inset = 2.25 * pr;
  const win = safeWindow(inset, inset, w - 2 * inset, h - 2 * inset, 0, w, h);
  const bodyX = pr;
  const bodyY = pr;
  const bodyW = Math.max(1, w - 2 * pr);
  const bodyH = Math.max(1, h - 2 * pr);
  const nx = Math.max(3, Math.round(bodyW / (1.7 * pr)));
  const ny = Math.max(3, Math.round(bodyH / (1.7 * pr)));
  const centers: { x: number; y: number }[] = [];
  for (let i = 0; i <= nx; i++) {
    centers.push({ x: bodyX + (i * bodyW) / nx, y: bodyY });
    centers.push({ x: bodyX + (i * bodyW) / nx, y: bodyY + bodyH });
  }
  for (let j = 1; j < ny; j++) {
    centers.push({ x: bodyX, y: bodyY + (j * bodyH) / ny });
    centers.push({ x: bodyX + bodyW, y: bodyY + (j * bodyH) / ny });
  }
  const petalsD = centers.map((c) => circleD(c.x, c.y, pr)).join("");
  const dotsD = centers.map((c) => circleD(c.x, c.y, pr * 0.34)).join("");
  const bodyD = rectD(bodyX, bodyY, bodyW, bodyH) + decorWindowPathD(win);
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: petalsD, fill: pal.petal },
          { d: bodyD, fill: pal.petal, fillRule: "evenodd" },
          { d: dotsD, fill: pal.dot },
          { d: decorWindowPathD(win), stroke: pal.line, strokeWidth: 0.012 * u },
        ],
      },
    ],
  };
}

// ---- 2. 에어메일 줄무늬 (airmail) ----
// 비율 규칙: 테두리 두께 b = u의 6%. 줄무늬 한 주기 = 2.6b(빨강 0.8b, 틈 0.5b, 파랑 0.8b,
// 틈 0.5b), 45도 대각선 — 두께·간격이 모두 u 기준이라 박스가 가로로 길어져도 줄무늬 굵기와
// 기울기는 그대로, 줄 "개수"만 늘어나요(찌그러지지 않음).
const AIRMAIL_PALETTES: Record<string, { a: string; b: string; bg: string }> = {
  redBlue: { a: "#E8575C", b: "#4A78D6", bg: "#FFFFFF" },
  mintGray: { a: "#8ED8C2", b: "#B8BDC6", bg: "#FFFFFF" },
  yellowGray: { a: "#F7D154", b: "#B8BDC6", bg: "#FFFFFF" },
};

function buildAirmail(variant: string, w: number, h: number): DecorLayout {
  const pal = AIRMAIL_PALETTES[variant] ?? AIRMAIL_PALETTES.redBlue;
  const u = Math.min(w, h);
  const b = 0.06 * u;
  const win = safeWindow(b, b, w - 2 * b, h - 2 * b, 0, w, h);
  const ringD = rectD(0, 0, w, h) + decorWindowPathD(win);
  const sw = 0.8 * b;
  const gap = 0.5 * b;
  const period = 2 * (sw + gap);
  const stripesA: string[] = [];
  const stripesB: string[] = [];
  for (let x0 = -h - period; x0 < w + period; x0 += period) {
    stripesA.push(polyD([{ x: x0, y: 0 }, { x: x0 + sw, y: 0 }, { x: x0 + sw + h, y: h }, { x: x0 + h, y: h }]));
    const xb = x0 + sw + gap;
    stripesB.push(polyD([{ x: xb, y: 0 }, { x: xb + sw, y: 0 }, { x: xb + sw + h, y: h }, { x: xb + h, y: h }]));
  }
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      { prims: [{ d: ringD, fill: pal.bg, fillRule: "evenodd" }] },
      {
        clipD: ringD,
        clipRule: "evenodd",
        prims: [
          { d: stripesA.join(""), fill: pal.a },
          { d: stripesB.join(""), fill: pal.b },
        ],
      },
    ],
  };
}

// ---- 3/4. 물방울(dots) / 별(stars) 무늬 테두리 ----
// 비율 규칙: 테두리 두께 b = u의 9%. 무늬 간격·크기는 전부 b 기준(물방울 반지름 0.2b/간격
// 0.62b, 별 바깥반지름 0.3b/간격 0.8b), 한 줄씩 엇갈려 배치 — 박스가 늘어나면 무늬는 그대로
// 크기를 유지한 채 개수만 늘어나서 동그란 점·정삼각 별이 찌그러지지 않아요.
const DOT_PALETTES: Record<string, { dot: string }> = {
  yellow: { dot: "#F9DB70" },
  sky: { dot: "#8FCDEB" },
  pink: { dot: "#F6AFC6" },
};
const STAR_PALETTES: Record<string, { star: string; bg: string }> = {
  navy: { star: "#33498E", bg: "#FFF9EE" },
  pink: { star: "#F27CA6", bg: "#FFF9EE" },
  orange: { star: "#F59B3F", bg: "#FFF9EE" },
};

function patternRingLayout(
  w: number,
  h: number,
  bg: string,
  makeMark: (cx: number, cy: number, b: number) => string,
  spacingB: number,
  outline: string
): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.09 * u;
  const win = safeWindow(b, b, w - 2 * b, h - 2 * b, 0, w, h);
  const ringD = rectD(0, 0, w, h) + decorWindowPathD(win);
  const sp = spacingB * b;
  const marks: string[] = [];
  let row = 0;
  for (let y = sp / 2; y < h + sp; y += sp * 0.9) {
    const offset = row % 2 === 0 ? 0 : sp / 2;
    for (let x = sp / 2 + offset; x < w + sp; x += sp) {
      // 창 안쪽(사진 자리)에 완전히 들어가는 무늬는 건너뛰어요(어차피 안 보여서).
      const insideWindow =
        x - 0.35 * b > win.x && x + 0.35 * b < win.x + win.w && y - 0.35 * b > win.y && y + 0.35 * b < win.y + win.h;
      if (insideWindow) continue;
      marks.push(makeMark(x, y, b));
    }
    row++;
  }
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      { prims: [{ d: ringD, fill: bg, fillRule: "evenodd" }] },
      { clipD: ringD, clipRule: "evenodd", prims: [{ d: marks.join(""), fill: outline }] },
      {
        prims: [
          { d: rectD(0.003 * u, 0.003 * u, w - 0.006 * u, h - 0.006 * u), stroke: outline, strokeWidth: 0.006 * u, opacity: 0.45 },
        ],
      },
    ],
  };
}

function buildDots(variant: string, w: number, h: number): DecorLayout {
  const pal = DOT_PALETTES[variant] ?? DOT_PALETTES.yellow;
  return patternRingLayout(w, h, "#FFFFFF", (cx, cy, b) => circleD(cx, cy, 0.2 * b), 0.62, pal.dot);
}

function buildStars(variant: string, w: number, h: number): DecorLayout {
  const pal = STAR_PALETTES[variant] ?? STAR_PALETTES.navy;
  const star = starShapePoints(5, 1, 0.45);
  return patternRingLayout(
    w,
    h,
    pal.bg,
    (cx, cy, b) => polyD(star.map((p) => ({ x: cx + p.x * 0.3 * b, y: cy + p.y * 0.3 * b }))),
    0.8,
    pal.star
  );
}

// ---- 5. 캐릭터 프레임 (bear / frog / bunny / cat) ----
// 공통 비율 규칙: u = 짧은 변. 귀·눈·코·볼터치는 전부 u의 비율 "원/타원"이라 박스가 가로로
// 길어져도 둥근 채로 있고, 귀/눈의 가로 위치만 박스 폭의 비율(귀 20%, 눈은 중앙에서 ±0.2u)로
// 따라가요. 몸통(색 테두리)은 둥근 사각형이고 사진 창은 그 안쪽 둥근 사각형이에요.
// 위쪽 띠(눈 자리)·아래쪽 띠(코/입 자리)·좌우 띠 두께는 u 기준 고정 비율이에요.

type CharPalette = { body: string; inner: string; snout: string; dark: string; blush: string; line: string };

const CHAR_PALETTES: Record<string, Record<string, CharPalette>> = {
  bear: {
    brown: { body: "#DDAE7E", inner: "#F4D3B6", snout: "#FBE8D5", dark: "#5B4033", blush: "#F4A6A6", line: "#C48F5F" },
    pink: { body: "#F6BFCE", inner: "#FCE0E8", snout: "#FFF0F4", dark: "#6B4452", blush: "#F28FAE", line: "#E598AE" },
  },
  frog: {
    green: { body: "#A3DA7C", inner: "#C6EBA9", snout: "#E4F6D2", dark: "#2F4B2B", blush: "#F6A9B4", line: "#7DBF55" },
    mint: { body: "#8DDBC3", inner: "#BDEEDE", snout: "#E1F7EF", dark: "#264A40", blush: "#F6A9B4", line: "#62BFA3" },
  },
  bunny: {
    pink: { body: "#F7C1D1", inner: "#FCE3EB", snout: "#FFF2F6", dark: "#6B4452", blush: "#F28FAE", line: "#E898AF" },
    lavender: { body: "#D7C8F2", inner: "#EEE6FB", snout: "#F8F4FF", dark: "#4B4268", blush: "#F3A4C2", line: "#B9A5E0" },
  },
  cat: {
    orange: { body: "#F6B67A", inner: "#FAD7B8", snout: "#FFEEDB", dark: "#5A3B2A", blush: "#F49A9A", line: "#DE9553" },
    gray: { body: "#BEC4CD", inner: "#E3E7EC", snout: "#F3F5F7", dark: "#3F4652", blush: "#F2A3B3", line: "#9AA2AE" },
  },
};

function buildCharacter(kind: "bear" | "frog" | "bunny" | "cat", variant: string, w: number, h: number): DecorLayout {
  const pals = CHAR_PALETTES[kind];
  const pal = pals[variant] ?? Object.values(pals)[0];
  const u = Math.min(w, h);
  // 위쪽으로 튀어나오는 부분(귀/눈) 높이 m, 위/아래/좌우 띠 두께
  const m = kind === "bunny" ? 0.26 * u : kind === "frog" ? 0.1 * u : 0.12 * u;
  const topBand = kind === "bunny" ? 0.1 * u : kind === "frog" ? 0.12 * u : 0.15 * u;
  const bottomBand = 0.17 * u;
  const side = 0.09 * u;
  const bodyY = m;
  const bodyH = h - m;
  const win = safeWindow(side, bodyY + topBand, w - 2 * side, bodyH - topBand - bottomBand, 0.1 * u, w, h);
  const winD = decorWindowPathD(win);
  const bodyD = rrectD(0, bodyY, w, bodyH, 0.14 * u) + winD;
  const cx = w / 2;
  const eyeY = bodyY + topBand / 2;
  const eyeDX = 0.2 * u;
  const bottomY = h - bottomBand / 2;
  const back: DecorPrim[] = [];
  const front: DecorPrim[] = [];
  const earX = Math.max(0.2 * u, 0.2 * w);

  if (kind === "bear") {
    for (const sx of [earX, w - earX]) {
      back.push({ d: circleD(sx, 0.15 * u, 0.15 * u), fill: pal.body });
      back.push({ d: circleD(sx, 0.15 * u, 0.085 * u), fill: pal.inner });
    }
    for (const sx of [-1, 1]) front.push({ d: circleD(cx + sx * eyeDX, eyeY, 0.028 * u), fill: pal.dark });
    front.push({ d: ellipseD(cx, bottomY, 0.12 * u, 0.062 * u), fill: pal.snout });
    front.push({ d: ellipseD(cx, bottomY - 0.02 * u, 0.04 * u, 0.028 * u), fill: pal.dark });
    front.push({
      d: `M${f(cx)} ${f(bottomY + 0.008 * u)}V${f(bottomY + 0.026 * u)}Q${f(cx - 0.012 * u)} ${f(bottomY + 0.048 * u)} ${f(cx - 0.04 * u)} ${f(bottomY + 0.036 * u)}M${f(cx)} ${f(bottomY + 0.026 * u)}Q${f(cx + 0.012 * u)} ${f(bottomY + 0.048 * u)} ${f(cx + 0.04 * u)} ${f(bottomY + 0.036 * u)}`,
      stroke: pal.dark,
      strokeWidth: 0.012 * u,
    });
  } else if (kind === "frog") {
    for (const sx of [-1, 1]) {
      back.push({ d: circleD(cx + sx * Math.min(0.27 * u, 0.3 * w), 0.14 * u, 0.13 * u), fill: pal.body });
    }
    for (const sx of [-1, 1]) {
      const ex = cx + sx * Math.min(0.27 * u, 0.3 * w);
      front.push({ d: circleD(ex, 0.14 * u, 0.085 * u), fill: "#FFFFFF" });
      front.push({ d: circleD(ex, 0.15 * u, 0.04 * u), fill: pal.dark });
      front.push({ d: circleD(ex + 0.012 * u, 0.135 * u, 0.012 * u), fill: "#FFFFFF" });
    }
    front.push({
      d: `M${f(cx - 0.15 * u)} ${f(bottomY - 0.012 * u)}Q${f(cx)} ${f(bottomY + 0.07 * u)} ${f(cx + 0.15 * u)} ${f(bottomY - 0.012 * u)}`,
      stroke: pal.dark,
      strokeWidth: 0.014 * u,
    });
    for (const sx of [-1, 1]) {
      front.push({ d: ellipseD(cx + sx * 0.3 * u, bottomY, 0.034 * u, 0.022 * u), fill: pal.blush, opacity: 0.8 });
      front.push({ d: circleD(cx + sx * 0.022 * u, eyeY, 0.01 * u), fill: pal.dark });
    }
  } else if (kind === "bunny") {
    for (const sx of [-1, 1]) {
      const ex = cx + sx * Math.max(0.17 * u, 0.18 * w);
      const rot = sx * 8;
      back.push({ d: ellipseD(ex, 0.16 * u, 0.068 * u, 0.16 * u, rot), fill: pal.body });
      back.push({ d: ellipseD(ex, 0.16 * u, 0.034 * u, 0.12 * u, rot), fill: pal.inner });
    }
    for (const sx of [-1, 1]) front.push({ d: circleD(cx + sx * eyeDX, eyeY, 0.026 * u), fill: pal.dark });
    front.push({ d: polyD([{ x: cx - 0.03 * u, y: bottomY - 0.03 * u }, { x: cx + 0.03 * u, y: bottomY - 0.03 * u }, { x: cx, y: bottomY + 0.002 * u }]), fill: pal.blush });
    front.push({
      d: `M${f(cx)} ${f(bottomY + 0.002 * u)}Q${f(cx - 0.015 * u)} ${f(bottomY + 0.045 * u)} ${f(cx - 0.05 * u)} ${f(bottomY + 0.03 * u)}M${f(cx)} ${f(bottomY + 0.002 * u)}Q${f(cx + 0.015 * u)} ${f(bottomY + 0.045 * u)} ${f(cx + 0.05 * u)} ${f(bottomY + 0.03 * u)}`,
      stroke: pal.dark,
      strokeWidth: 0.011 * u,
    });
    for (const sx of [-1, 1]) front.push({ d: ellipseD(cx + sx * 0.28 * u, bottomY, 0.034 * u, 0.022 * u), fill: pal.blush, opacity: 0.8 });
  } else {
    // cat — 삼각 귀(끝을 둥글게 하려고 같은 색 선을 둥근 끝으로 둘러요)
    for (const d of [-1, 1]) {
      // d=-1 왼쪽 귀, d=+1 오른쪽 귀. 귀 끝은 바깥쪽으로 살짝 기울어요.
      const tipC = d < 0 ? earX : w - earX;
      const pts = [
        { x: tipC + d * 0.14 * u, y: m + 0.08 * u },
        { x: tipC + d * 0.02 * u, y: 0.02 * u },
        { x: tipC - d * 0.14 * u, y: m + 0.08 * u },
      ];
      back.push({ d: polyD(pts), fill: pal.body, stroke: pal.body, strokeWidth: 0.03 * u });
      const inner = [
        { x: tipC + d * 0.08 * u, y: m + 0.06 * u },
        { x: tipC + d * 0.01 * u, y: 0.075 * u },
        { x: tipC - d * 0.08 * u, y: m + 0.06 * u },
      ];
      back.push({ d: polyD(inner), fill: pal.inner });
    }
    for (const sx of [-1, 1]) {
      front.push({ d: circleD(cx + sx * eyeDX, eyeY, 0.03 * u), fill: pal.dark });
      front.push({ d: circleD(cx + sx * eyeDX + 0.008 * u, eyeY - 0.008 * u, 0.01 * u), fill: "#FFFFFF" });
    }
    front.push({ d: polyD([{ x: cx - 0.03 * u, y: bottomY - 0.035 * u }, { x: cx + 0.03 * u, y: bottomY - 0.035 * u }, { x: cx, y: bottomY - 0.005 * u }]), fill: pal.blush });
    front.push({
      d: `M${f(cx)} ${f(bottomY - 0.005 * u)}Q${f(cx - 0.015 * u)} ${f(bottomY + 0.035 * u)} ${f(cx - 0.05 * u)} ${f(bottomY + 0.02 * u)}M${f(cx)} ${f(bottomY - 0.005 * u)}Q${f(cx + 0.015 * u)} ${f(bottomY + 0.035 * u)} ${f(cx + 0.05 * u)} ${f(bottomY + 0.02 * u)}`,
      stroke: pal.dark,
      strokeWidth: 0.011 * u,
    });
    for (const sx of [-1, 1]) {
      // 수염 2줄씩
      for (const dy of [-0.015, 0.02]) {
        front.push({
          d: `M${f(cx + sx * 0.12 * u)} ${f(bottomY + dy * u)}L${f(cx + sx * 0.26 * u)} ${f(bottomY + (dy * 1.8 - 0.005) * u)}`,
          stroke: pal.line,
          strokeWidth: 0.008 * u,
        });
      }
    }
  }

  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      { prims: back },
      {
        prims: [
          { d: bodyD, fill: pal.body, fillRule: "evenodd" },
          { d: winD, stroke: pal.line, strokeWidth: 0.012 * u },
          // 귀/눈 뿌리 위쪽 몸통 위에 얹는 장식은 front에서 그려요
        ],
      },
      { prims: front },
    ],
  };
}

// ---- 6. 벚꽃 화환 (wreath) ----
// 비율 규칙: 꽃/잎 크기는 전부 u 기준 고정(꽃 반지름 ≈0.06u, 잎 길이 0.09u)이고, 둥근 사각형
// 모양의 화환 "둘레"를 정수 칸(칸 길이 ≈0.075u)으로 나눠서 꽃/잎을 놓아요 — 박스가 가로로
// 길어지면 같은 크기의 꽃/잎이 더 많이 놓일 뿐 늘어나거나 찌그러지지 않아요. 위치·각도의
// 약간의 흐트러짐은 칸 번호로 정해지는 고정 의사난수라서 화면/인쇄/다시 열기가 똑같아요.
// 사진 창은 평범한 사각형(모서리 0.03u)이고 화환은 그 바깥 띠(0.13u)에만 있어요.
const WREATH_COLORS = {
  petal: "#F9BCCF",
  petalLight: "#FDDDE7",
  center: "#FFE59A",
  leafA: "#8DCB78",
  leafB: "#A8DB8B",
  vein: "#6DB35E",
};

function pointOnRoundedRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  s: number
): { px: number; py: number; nx: number; ny: number; tx: number; ty: number } {
  // 둘레를 위쪽 변 가운데 오른쪽부터 시계방향으로 따라가요(길이 s).
  const straightTop = w - 2 * r;
  const straightSide = h - 2 * r;
  const arc = (Math.PI / 2) * r;
  const segs = [straightTop, arc, straightSide, arc, straightTop, arc, straightSide, arc];
  const total = segs.reduce((a, b) => a + b, 0);
  let t = ((s % total) + total) % total;
  let idx = 0;
  while (idx < 7 && t > segs[idx]) {
    t -= segs[idx];
    idx++;
  }
  const arcPoint = (cxA: number, cyA: number, startAng: number) => {
    const ang = startAng + t / r;
    return {
      px: cxA + r * Math.cos(ang),
      py: cyA + r * Math.sin(ang),
      nx: Math.cos(ang),
      ny: Math.sin(ang),
      tx: -Math.sin(ang),
      ty: Math.cos(ang),
    };
  };
  switch (idx) {
    case 0:
      return { px: x + r + t, py: y, nx: 0, ny: -1, tx: 1, ty: 0 };
    case 1:
      return arcPoint(x + w - r, y + r, -Math.PI / 2);
    case 2:
      return { px: x + w, py: y + r + t, nx: 1, ny: 0, tx: 0, ty: 1 };
    case 3:
      return arcPoint(x + w - r, y + h - r, 0);
    case 4:
      return { px: x + w - r - t, py: y + h, nx: 0, ny: 1, tx: -1, ty: 0 };
    case 5:
      return arcPoint(x + r, y + h - r, Math.PI / 2);
    case 6:
      return { px: x, py: y + h - r - t, nx: -1, ny: 0, tx: 0, ty: -1 };
    default:
      return arcPoint(x + r, y + r, Math.PI);
  }
}

function leafD(cx: number, cy: number, angleRad: number, len: number, wid: number): string {
  const ca = Math.cos(angleRad);
  const sa = Math.sin(angleRad);
  const P = (lx: number, ly: number) => `${f(cx + lx * ca - ly * sa)} ${f(cy + lx * sa + ly * ca)}`;
  return `M${P(-len / 2, 0)}Q${P(0, -wid)} ${P(len / 2, 0)}Q${P(0, wid)} ${P(-len / 2, 0)}Z`;
}

function buildWreath(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const bandInset = 0.13 * u;
  const win = safeWindow(bandInset, bandInset, w - 2 * bandInset, h - 2 * bandInset, 0.03 * u, w, h);
  const center = 0.065 * u;
  const rw = Math.max(1, w - 2 * center);
  const rh = Math.max(1, h - 2 * center);
  const rc = Math.min(0.1 * u, rw / 2, rh / 2);
  const perim = 2 * (rw - 2 * rc) + 2 * (rh - 2 * rc) + 2 * Math.PI * rc;
  const n = Math.max(12, Math.round(perim / (0.075 * u)));
  const leavesA: string[] = [];
  const leavesB: string[] = [];
  const veins: string[] = [];
  const petals: string[] = [];
  const petalsLight: string[] = [];
  const centers: string[] = [];
  for (let i = 0; i < n; i++) {
    const s = (i * perim) / n;
    const pt = pointOnRoundedRect(center, center, rw, rh, rc, s);
    const jitter = (hash01(i, 1) - 0.5) * 0.02 * u;
    const lx = pt.px + pt.nx * jitter;
    const ly = pt.py + pt.ny * jitter;
    const tang = Math.atan2(pt.ty, pt.tx);
    // 잎: 길을 따라 놓되 번갈아 바깥/안쪽으로 살짝 기울여요
    const side = i % 2 === 0 ? 1 : -1;
    const leafAng = tang + side * (0.55 + hash01(i, 2) * 0.35);
    const lcx = lx + pt.nx * side * 0.012 * u;
    const lcy = ly + pt.ny * side * 0.012 * u;
    (i % 4 < 2 ? leavesA : leavesB).push(leafD(lcx, lcy, leafAng, 0.09 * u, 0.026 * u));
    veins.push(
      `M${f(lcx - Math.cos(leafAng) * 0.038 * u)} ${f(lcy - Math.sin(leafAng) * 0.038 * u)}L${f(lcx + Math.cos(leafAng) * 0.038 * u)} ${f(lcy + Math.sin(leafAng) * 0.038 * u)}`
    );
    // 꽃: 세 칸에 하나, 크기는 두 종류를 번갈아
    if (i % 3 === 0) {
      const big = (i / 3) % 2 === 0;
      const rr = (big ? 0.034 : 0.026) * u;
      const dist = rr * 0.95;
      const base = hash01(i, 3) * Math.PI * 2;
      for (let k = 0; k < 5; k++) {
        const a = base + (k * Math.PI * 2) / 5;
        const pxx = lx + Math.cos(a) * dist;
        const pyy = ly + Math.sin(a) * dist;
        (k % 2 === 0 ? petals : petalsLight).push(ellipseD(pxx, pyy, rr, rr * 0.78, (a * 180) / Math.PI));
      }
      centers.push(circleD(lx, ly, rr * 0.45));
    }
  }
  return {
    w,
    h,
    window: win,
    photoBleed: 0,
    groups: [
      {
        prims: [
          { d: leavesA.join(""), fill: WREATH_COLORS.leafA },
          { d: leavesB.join(""), fill: WREATH_COLORS.leafB },
          { d: veins.join(""), stroke: WREATH_COLORS.vein, strokeWidth: 0.004 * u },
          { d: petalsLight.join(""), fill: WREATH_COLORS.petalLight },
          { d: petals.join(""), fill: WREATH_COLORS.petal },
          { d: centers.join(""), fill: WREATH_COLORS.center },
        ],
      },
    ],
  };
}

// ---- 공개 함수 ----

// 종류/색상/박스 크기(px) → 그림 설계도. 인식 못 하는 종류면 null이에요(옛 문서 안전).
export function buildFrameDecorLayout(
  decor: FrameDecorKey | undefined,
  variant: string | undefined,
  w: number,
  h: number
): DecorLayout | null {
  if (!decor || !(w > 0) || !(h > 0)) return null;
  const v = variant ?? "";
  switch (decor) {
    case "petalBorder":
      return buildPetalBorder(v, w, h);
    case "airmail":
      return buildAirmail(v, w, h);
    case "dots":
      return buildDots(v, w, h);
    case "stars":
      return buildStars(v, w, h);
    case "bear":
    case "frog":
    case "bunny":
    case "cat":
      return buildCharacter(decor, v, w, h);
    case "wreath":
      return buildWreath(w, h);
    default:
      return null;
  }
}

// 설계도 → <svg> 안쪽에 넣을 문자열(화면용). idPrefix는 같은 페이지의 다른 프레임과
// clipPath id가 겹치지 않게 하는 문자열이에요(영문/숫자/하이픈만).
export function frameDecorSvgInner(layout: DecorLayout, idPrefix: string): string {
  let out = "";
  layout.groups.forEach((g, gi) => {
    const clipId = `${idPrefix}-c${gi}`;
    if (g.clipD) {
      out += `<clipPath id="${clipId}"><path d="${g.clipD}" clip-rule="${g.clipRule ?? "nonzero"}"/></clipPath><g clip-path="url(#${clipId})">`;
    } else {
      out += "<g>";
    }
    for (const p of g.prims) {
      out +=
        `<path d="${p.d}" fill="${p.fill ?? "none"}"` +
        (p.fill ? ` fill-rule="${p.fillRule ?? "nonzero"}"` : "") +
        (p.stroke ? ` stroke="${p.stroke}" stroke-width="${f(p.strokeWidth ?? 1)}" stroke-linejoin="round" stroke-linecap="round"` : "") +
        (p.opacity !== undefined ? ` opacity="${p.opacity}"` : "") +
        "/>";
    }
    out += "</g>";
  });
  return out;
}

// 설계도 → canvas에 그리기(인쇄용). (ox, oy)는 박스 왼쪽 위 모서리의 canvas 좌표예요.
// SVG path 문자열을 Path2D가 그대로 읽으므로 화면(SVG)과 같은 도형이 나와요.
export function drawFrameDecorLayout(
  ctx: CanvasRenderingContext2D,
  layout: DecorLayout,
  ox: number,
  oy: number
): void {
  const baseAlpha = ctx.globalAlpha;
  ctx.save();
  ctx.translate(ox, oy);
  for (const g of layout.groups) {
    ctx.save();
    if (g.clipD) ctx.clip(new Path2D(g.clipD), g.clipRule ?? "nonzero");
    for (const p of g.prims) {
      const path = new Path2D(p.d);
      ctx.globalAlpha = baseAlpha * (p.opacity ?? 1);
      if (p.fill) {
        ctx.fillStyle = p.fill;
        ctx.fill(path, p.fillRule ?? "nonzero");
      }
      if (p.stroke) {
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.strokeWidth ?? 1;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke(path);
      }
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = baseAlpha;
}
