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
  | "wreath"
  | "instant"
  | "film"
  | "ticket"
  | "ribbon"
  | "gingham"
  | "pastelDots"
  | "softWave"
  | "doubleLine"
  | WreathKind
  | AnimalKind;

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
  // 새 꽃 화환 8종
  { id: "wreath-daisy", decor: "daisy", variant: "default", label: "데이지", group: "wreath" },
  { id: "wreath-tulip", decor: "tulip", variant: "default", label: "튤립", group: "wreath" },
  { id: "wreath-rose", decor: "rose", variant: "default", label: "장미", group: "wreath" },
  { id: "wreath-sunflower", decor: "sunflower", variant: "default", label: "해바라기", group: "wreath" },
  { id: "wreath-lavender", decor: "lavender", variant: "default", label: "라벤더", group: "wreath" },
  { id: "wreath-hydrangea", decor: "hydrangea", variant: "default", label: "수국", group: "wreath" },
  { id: "wreath-babysbreath", decor: "babysBreath", variant: "default", label: "안개꽃", group: "wreath" },
  { id: "wreath-eucalyptus", decor: "eucalyptus", variant: "default", label: "유칼립투스 잎", group: "wreath" },
  // 새 장식 테두리 8종
  { id: "instant", decor: "instant", variant: "default", label: "즉석사진", group: "border" },
  { id: "film", decor: "film", variant: "default", label: "필름", group: "border" },
  { id: "ticket", decor: "ticket", variant: "default", label: "티켓", group: "border" },
  { id: "ribbon", decor: "ribbon", variant: "default", label: "리본", group: "border" },
  { id: "gingham", decor: "gingham", variant: "default", label: "깅엄체크", group: "border" },
  { id: "pastel-dots", decor: "pastelDots", variant: "default", label: "파스텔 도트", group: "border" },
  { id: "soft-wave", decor: "softWave", variant: "default", label: "부드러운 물결", group: "border" },
  { id: "double-line", decor: "doubleLine", variant: "default", label: "심플 이중선", group: "border" },
  // 새 캐릭터 10종 (variant는 한 가지뿐이라 "default")
  { id: "dog", decor: "dog", variant: "default", label: "강아지", group: "character" },
  { id: "chick", decor: "chick", variant: "default", label: "병아리", group: "character" },
  { id: "tiger", decor: "tiger", variant: "default", label: "호랑이", group: "character" },
  { id: "penguin", decor: "penguin", variant: "default", label: "펭귄", group: "character" },
  { id: "panda", decor: "panda", variant: "default", label: "판다", group: "character" },
  { id: "fox", decor: "fox", variant: "default", label: "여우", group: "character" },
  { id: "koala", decor: "koala", variant: "default", label: "코알라", group: "character" },
  { id: "sheep", decor: "sheep", variant: "default", label: "양", group: "character" },
  { id: "elephant", decor: "elephant", variant: "default", label: "코끼리", group: "character" },
  { id: "raccoon", decor: "raccoon", variant: "default", label: "너구리", group: "character" },
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

// ---- 7. 새 캐릭터 프레임 10종 (강아지·병아리·호랑이·펭귄·판다·여우·코알라·양·코끼리·너구리) ----
// 기존 곰돌이/개구리/토끼/고양이(buildCharacter)와 같은 뼈대·같은 비율 규칙이에요:
//   u = 짧은 변. 몸통(색 테두리)은 둥근 사각형(모서리 0.14u), 사진 창은 그 안쪽 둥근 사각형
//   (모서리 0.1u). 위쪽 띠(눈 자리) 0.15u · 아래쪽 띠(코/입 자리) 0.17u · 좌우 띠 0.09u(강아지는
//   늘어진 귀 때문에 0.115u). 귀·눈·코·볼터치·발은 전부 u의 비율 "원/타원/호"라서 박스를 가로로
//   늘려도 둥근 채 그대로이고, 위치만 박스 폭을 따라가요(귀 가로 위치: 0.2u와 0.2×폭 중 큰 값).
//   장식은 전부 몸통 띠 위(귀는 몸통 뒤쪽 위로 튀어나옴)에만 있어서 사진 창 안으로 들어오지 않아요.
// 모든 그림은 키픽이 직접 그린 벡터 도형이고 외부 이미지는 없어요.

export type AnimalKind =
  | "dog"
  | "chick"
  | "tiger"
  | "penguin"
  | "panda"
  | "fox"
  | "koala"
  | "sheep"
  | "elephant"
  | "raccoon";

type AnimalPalette = {
  body: string; // 몸통(테두리)
  inner: string; // 귀 안쪽 등
  light: string; // 주둥이·볼 등 밝은 부분
  dark: string; // 눈·코·무늬
  accent: string; // 부리·혀·귀 끝 등 포인트
  blush: string; // 볼터치
  line: string; // 사진 창 둘레선
};

const ANIMAL_PALETTES: Record<AnimalKind, AnimalPalette> = {
  dog: { body: "#EBCB9C", inner: "#F6E3C4", light: "#FFF3DF", dark: "#4A3427", accent: "#F28DA0", blush: "#F5A3A0", line: "#CFA672" },
  chick: { body: "#FFE27A", inner: "#FFF0B0", light: "#FFF8D6", dark: "#4A3A24", accent: "#F7A23B", blush: "#F9A58B", line: "#E8C34A" },
  tiger: { body: "#F8B454", inner: "#FFE2B8", light: "#FFF4E2", dark: "#5A3A28", accent: "#F28DA0", blush: "#F49A8E", line: "#E19A36" },
  penguin: { body: "#4D5878", inner: "#6A7699", light: "#FFFFFF", dark: "#2E3550", accent: "#F7A23B", blush: "#F5A3B5", line: "#38425F" },
  panda: { body: "#FAFAFA", inner: "#F2B8C6", light: "#FFFFFF", dark: "#3A3D46", accent: "#F2B8C6", blush: "#F7AFC0", line: "#C9CED8" },
  fox: { body: "#F58B45", inner: "#FFE1C8", light: "#FFFFFF", dark: "#4A2C20", accent: "#6B3B2A", blush: "#F9A99A", line: "#DD7230" },
  koala: { body: "#BFC4CE", inner: "#F0E4E6", light: "#E6E9EE", dark: "#444A57", accent: "#F2B0BC", blush: "#F4A9B8", line: "#9DA4B1" },
  sheep: { body: "#F6F0E4", inner: "#FFFFFF", light: "#FFF9EE", dark: "#5A4A48", accent: "#F4B6B6", blush: "#F6AFAF", line: "#DACFBC" },
  elephant: { body: "#AEC3E2", inner: "#F5C8D4", light: "#D5E1F2", dark: "#46506B", accent: "#FFFFFF", blush: "#F6AFC0", line: "#8AA5CD" },
  raccoon: { body: "#A5AAB5", inner: "#E7E9EE", light: "#FFFFFF", dark: "#454A57", accent: "#F2B0BC", blush: "#F4A9B8", line: "#848A97" },
};

// 둥근 끝을 가진 삼각형(귀) — 같은 색 선(둥근 이음)으로 꼭짓점을 둥글게 해요
function softTriangle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  fill: string,
  strokeW: number
): DecorPrim {
  return { d: polyD([a, b, c]), fill, stroke: fill, strokeWidth: strokeW };
}

// 잔털이 둥글게 올라온 원(솜털 귀·양털) — 중심 원 + 가장자리 작은 원들(같은 색이라 하나로 이어져 보여요)
function fluffyCircleD(cx: number, cy: number, r: number, bumps: number, bumpR: number, rot: number = 0): string {
  let d = circleD(cx, cy, r);
  for (let k = 0; k < bumps; k++) {
    const a = rot + (k * Math.PI * 2) / bumps;
    d += circleD(cx + Math.cos(a) * r, cy + Math.sin(a) * r, bumpR);
  }
  return d;
}

function dotEye(front: DecorPrim[], x: number, y: number, r: number, dark: string): void {
  front.push({ d: circleD(x, y, r), fill: dark });
  front.push({ d: circleD(x + r * 0.32, y - r * 0.34, r * 0.34), fill: "#FFFFFF" });
}

function blushPair(front: DecorPrim[], cx: number, y: number, dx: number, u: number, color: string): void {
  for (const sx of [-1, 1]) front.push({ d: ellipseD(cx + sx * dx, y, 0.036 * u, 0.023 * u), fill: color, opacity: 0.8 });
}

// 작은 앞발(아래 띠 양끝) — 둥근 타원 + 발가락 선 3개
function pawD(cx: number, cy: number, u: number): { fill: string; toes: string } {
  const toes =
    `M${f(cx - 0.022 * u)} ${f(cy - 0.002 * u)}V${f(cy + 0.016 * u)}` +
    `M${f(cx)} ${f(cy - 0.006 * u)}V${f(cy + 0.016 * u)}` +
    `M${f(cx + 0.022 * u)} ${f(cy - 0.002 * u)}V${f(cy + 0.016 * u)}`;
  return { fill: ellipseD(cx, cy, 0.062 * u, 0.045 * u), toes };
}

function buildAnimal(kind: AnimalKind, w: number, h: number): DecorLayout {
  const pal = ANIMAL_PALETTES[kind];
  const u = Math.min(w, h);
  const m =
    (({ dog: 0.15, chick: 0.11, tiger: 0.12, penguin: 0.04, panda: 0.12, fox: 0.17, koala: 0.16, sheep: 0.17, elephant: 0.17, raccoon: 0.12 }) as Record<AnimalKind, number>)[kind] * u;
  const topBand = 0.15 * u;
  const bottomBand = 0.17 * u;
  const side = (kind === "dog" ? 0.115 : kind === "sheep" ? 0.1 : 0.09) * u;
  const bodyY = m;
  const bodyH = h - m;
  const win = safeWindow(side, bodyY + topBand, w - 2 * side, bodyH - topBand - bottomBand, 0.1 * u, w, h);
  const winD = decorWindowPathD(win);
  // 양은 몸통을 양털 반지름만큼 안쪽으로 줄이고, 그 가장자리 위에 털 뭉치(원)를 올려서 구름 모양 윤곽이 나와요
  const woolR = 0.052 * u;
  const bodyOuterD = kind === "sheep" ? rrectD(woolR, bodyY + woolR, w - 2 * woolR, bodyH - 2 * woolR, 0.05 * u) : rrectD(0, bodyY, w, bodyH, 0.14 * u);
  const cx = w / 2;
  const eyeY = bodyY + topBand / 2;
  const eyeDX = 0.2 * u;
  const bottomY = h - bottomBand / 2;
  const earX = Math.max(0.2 * u, 0.2 * w);
  const back: DecorPrim[] = [];
  const mid: DecorPrim[] = []; // 몸통 위, 얼굴 아래(무늬·털)
  const front: DecorPrim[] = [];
  let bodyFill = pal.body;
  let outline: string | null = null;
  let extraBodyD = ""; // 몸통과 같은 색으로 이어 붙이는 도형(양털 등)

  switch (kind) {
    case "dog": {
      // 늘어진 귀(몸통 앞, 좌우 띠를 따라 내려옴) + 한쪽 눈 얼룩 + 큰 코·혀
      for (const sx of [-1, 1]) {
        const ex = sx < 0 ? 0.058 * u : w - 0.058 * u;
        front.push({ d: ellipseD(ex, 0.03 * u + 0.17 * u, 0.052 * u, 0.17 * u, sx * 5), fill: "#B07A4F" });
        front.push({ d: ellipseD(ex, 0.03 * u + 0.17 * u, 0.052 * u, 0.17 * u, sx * 5), stroke: "#96623C", strokeWidth: 0.008 * u });
      }
      mid.push({ d: ellipseD(cx - eyeDX, eyeY + 0.005 * u, 0.062 * u, 0.05 * u, -10), fill: "#C98A58" });
      dotEye(front, cx - eyeDX, eyeY, 0.028 * u, pal.dark);
      dotEye(front, cx + eyeDX, eyeY, 0.028 * u, pal.dark);
      front.push({ d: ellipseD(cx, bottomY, 0.13 * u, 0.066 * u), fill: pal.light });
      front.push({ d: ellipseD(cx, bottomY - 0.022 * u, 0.045 * u, 0.03 * u), fill: pal.dark });
      front.push({
        d: `M${f(cx)} ${f(bottomY + 0.006 * u)}V${f(bottomY + 0.024 * u)}Q${f(cx - 0.012 * u)} ${f(bottomY + 0.046 * u)} ${f(cx - 0.04 * u)} ${f(bottomY + 0.034 * u)}M${f(cx)} ${f(bottomY + 0.024 * u)}Q${f(cx + 0.012 * u)} ${f(bottomY + 0.046 * u)} ${f(cx + 0.04 * u)} ${f(bottomY + 0.034 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.011 * u,
      });
      front.push({ d: ellipseD(cx, bottomY + 0.055 * u, 0.022 * u, 0.026 * u), fill: pal.accent });
      break;
    }
    case "chick": {
      // 머리 깃털 3가닥(몸통 뒤) + 부리 + 양쪽 작은 날개
      for (const [dx, rot, hh] of [[-0.035, -28, 0.075], [0, 0, 0.09], [0.035, 28, 0.075]] as [number, number, number][]) {
        back.push({ d: ellipseD(cx + dx * u, m - 0.005 * u, 0.026 * u, hh * u, rot), fill: pal.body, stroke: pal.body, strokeWidth: 0.004 * u });
      }
      for (const sx of [-1, 1]) dotEye(front, cx + sx * eyeDX, eyeY, 0.028 * u, pal.dark);
      // 부리: 위(큰 마름모) + 아래(작은 마름모)
      front.push({ d: polyD([{ x: cx - 0.06 * u, y: bottomY - 0.025 * u }, { x: cx + 0.06 * u, y: bottomY - 0.025 * u }, { x: cx, y: bottomY + 0.018 * u }]), fill: pal.accent, stroke: pal.accent, strokeWidth: 0.014 * u });
      front.push({ d: polyD([{ x: cx - 0.03 * u, y: bottomY + 0.022 * u }, { x: cx + 0.03 * u, y: bottomY + 0.022 * u }, { x: cx, y: bottomY + 0.05 * u }]), fill: "#EE8E2B", stroke: "#EE8E2B", strokeWidth: 0.01 * u });
      blushPair(front, cx, bottomY - 0.002 * u, 0.3 * u, u, pal.blush);
      // 날개: 아래 띠 양끝의 둥근 타원(살짝 기울임)
      for (const sx of [-1, 1]) {
        const wx = sx < 0 ? 0.045 * u : w - 0.045 * u;
        front.push({ d: ellipseD(wx, h - 0.1 * u, 0.034 * u, 0.075 * u, sx * -16), fill: "#FFD24F", stroke: "#F2BE3A", strokeWidth: 0.006 * u });
      }
      break;
    }
    case "tiger": {
      // 둥근 귀 + 이마 줄무늬(王) + 양옆 줄무늬 + 하얀 주둥이
      for (const sx of [earX, w - earX]) {
        back.push({ d: circleD(sx, 0.13 * u, 0.13 * u), fill: pal.body });
        back.push({ d: circleD(sx, 0.13 * u, 0.075 * u), fill: pal.inner });
      }
      const sw = 0.014 * u;
      mid.push({ d: `M${f(cx)} ${f(bodyY + 0.02 * u)}V${f(bodyY + 0.06 * u)}M${f(cx - 0.05 * u)} ${f(bodyY + 0.026 * u)}V${f(bodyY + 0.056 * u)}M${f(cx + 0.05 * u)} ${f(bodyY + 0.026 * u)}V${f(bodyY + 0.056 * u)}`, stroke: pal.dark, strokeWidth: sw });
      let sideStripes = "";
      for (const fy of [0.3, 0.5, 0.7]) {
        const yy = bodyY + (h - bodyY) * fy;
        sideStripes += `M${f(0.012 * u)} ${f(yy)}H${f(0.062 * u)}M${f(w - 0.012 * u)} ${f(yy)}H${f(w - 0.062 * u)}`;
      }
      mid.push({ d: sideStripes, stroke: pal.dark, strokeWidth: sw });
      for (const sx of [-1, 1]) dotEye(front, cx + sx * eyeDX, eyeY + 0.012 * u, 0.028 * u, pal.dark);
      front.push({ d: ellipseD(cx, bottomY, 0.13 * u, 0.066 * u), fill: pal.light });
      front.push({ d: polyD([{ x: cx - 0.034 * u, y: bottomY - 0.034 * u }, { x: cx + 0.034 * u, y: bottomY - 0.034 * u }, { x: cx, y: bottomY - 0.004 * u }]), fill: pal.accent, stroke: pal.accent, strokeWidth: 0.01 * u });
      front.push({
        d: `M${f(cx)} ${f(bottomY - 0.004 * u)}Q${f(cx - 0.014 * u)} ${f(bottomY + 0.036 * u)} ${f(cx - 0.05 * u)} ${f(bottomY + 0.022 * u)}M${f(cx)} ${f(bottomY - 0.004 * u)}Q${f(cx + 0.014 * u)} ${f(bottomY + 0.036 * u)} ${f(cx + 0.05 * u)} ${f(bottomY + 0.022 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.011 * u,
      });
      break;
    }
    case "penguin": {
      // 검정(남색) 몸 + 하얀 배·눈 + 주황 부리·발 + 양쪽 지느러미
      mid.push({ d: ellipseD(cx, h - 0.09 * u, Math.min(0.3 * u, 0.3 * w), 0.062 * u), fill: pal.light });
      for (const sx of [-1, 1]) {
        front.push({ d: circleD(cx + sx * eyeDX, eyeY, 0.05 * u), fill: "#FFFFFF" });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.004 * u, eyeY + 0.004 * u, 0.026 * u), fill: pal.dark });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.012 * u, eyeY - 0.006 * u, 0.009 * u), fill: "#FFFFFF" });
      }
      front.push({ d: polyD([{ x: cx - 0.055 * u, y: bottomY - 0.03 * u }, { x: cx + 0.055 * u, y: bottomY - 0.03 * u }, { x: cx, y: bottomY + 0.016 * u }]), fill: pal.accent, stroke: pal.accent, strokeWidth: 0.014 * u });
      blushPair(front, cx, bottomY - 0.012 * u, 0.25 * u, u, pal.blush);
      for (const sx of [-1, 1]) {
        const fx = sx < 0 ? 0.045 * u : w - 0.045 * u;
        front.push({ d: ellipseD(fx, h - 0.1 * u, 0.034 * u, 0.075 * u, sx * -14), fill: pal.inner, stroke: pal.dark, strokeWidth: 0.006 * u });
        front.push({ d: ellipseD(cx + sx * 0.13 * u, h - 0.028 * u, 0.04 * u, 0.018 * u), fill: pal.accent });
      }
      break;
    }
    case "panda": {
      // 검정 귀 + 검정 눈 얼룩 + 검정 코 + 검정 앞발(흰 몸통은 옅은 회색 윤곽선으로 구분)
      outline = "#D3D7DF";
      for (const sx of [earX, w - earX]) {
        back.push({ d: circleD(sx, 0.13 * u, 0.115 * u), fill: pal.dark });
        back.push({ d: circleD(sx, 0.13 * u, 0.115 * u), stroke: "#2B2D34", strokeWidth: 0.004 * u });
      }
      for (const sx of [-1, 1]) {
        front.push({ d: ellipseD(cx + sx * eyeDX, eyeY + 0.004 * u, 0.056 * u, 0.044 * u, sx * 22), fill: pal.dark });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.004 * u, eyeY, 0.017 * u), fill: "#FFFFFF" });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.006 * u, eyeY - 0.004 * u, 0.007 * u), fill: pal.dark });
      }
      front.push({ d: ellipseD(cx, bottomY - 0.016 * u, 0.04 * u, 0.028 * u), fill: pal.dark });
      front.push({
        d: `M${f(cx)} ${f(bottomY + 0.004 * u)}V${f(bottomY + 0.022 * u)}Q${f(cx - 0.012 * u)} ${f(bottomY + 0.044 * u)} ${f(cx - 0.04 * u)} ${f(bottomY + 0.032 * u)}M${f(cx)} ${f(bottomY + 0.022 * u)}Q${f(cx + 0.012 * u)} ${f(bottomY + 0.044 * u)} ${f(cx + 0.04 * u)} ${f(bottomY + 0.032 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.011 * u,
      });
      blushPair(front, cx, bottomY, 0.28 * u, u, pal.blush);
      for (const sx of [-1, 1]) front.push({ d: ellipseD(sx < 0 ? 0.075 * u : w - 0.075 * u, h - 0.07 * u, 0.06 * u, 0.045 * u), fill: pal.dark });
      break;
    }
    case "fox": {
      // 뾰족 귀(끝은 어두운 갈색, 안쪽 크림) + 하얀 볼 털 + 하얀 주둥이
      for (const d of [-1, 1]) {
        const tipC = d < 0 ? earX : w - earX;
        const tip = { x: tipC + d * 0.025 * u, y: 0.015 * u };
        const bL = { x: tipC + d * 0.15 * u, y: m + 0.08 * u };
        const bR = { x: tipC - d * 0.12 * u, y: m + 0.08 * u };
        back.push(softTriangle(tip, bL, bR, pal.body, 0.03 * u));
        back.push(softTriangle({ x: tip.x, y: tip.y + 0.015 * u }, { x: tipC + d * 0.085 * u, y: m + 0.06 * u }, { x: tipC - d * 0.065 * u, y: m + 0.06 * u }, pal.inner, 0.014 * u));
        // 귀 끝(어두운 갈색)
        back.push(softTriangle({ x: tip.x, y: tip.y + 0.004 * u }, { x: tip.x + d * 0.045 * u, y: tip.y + 0.07 * u }, { x: tip.x - d * 0.035 * u, y: tip.y + 0.07 * u }, pal.accent, 0.016 * u));
      }
      // 볼 털(하얀 삼각 두 개씩, 아래 띠 양끝)
      for (const sx of [-1, 1]) {
        const x0 = sx < 0 ? 0 : w;
        const dir = sx < 0 ? 1 : -1;
        mid.push({
          d: polyD([
            { x: x0, y: h - 0.2 * u },
            { x: x0 + dir * 0.115 * u, y: h - 0.105 * u },
            { x: x0 + dir * 0.03 * u, y: h - 0.105 * u },
            { x: x0 + dir * 0.12 * u, y: h - 0.03 * u },
            { x: x0, y: h - 0.03 * u },
          ]),
          fill: "#FFFFFF",
          stroke: "#FFFFFF",
          strokeWidth: 0.012 * u,
        });
      }
      for (const sx of [-1, 1]) {
        front.push({ d: ellipseD(cx + sx * eyeDX, eyeY, 0.032 * u, 0.024 * u, sx * -14), fill: pal.dark });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.008 * u, eyeY - 0.006 * u, 0.008 * u), fill: "#FFFFFF" });
      }
      front.push({ d: ellipseD(cx, bottomY + 0.004 * u, 0.11 * u, 0.056 * u), fill: "#FFFFFF" });
      front.push({ d: ellipseD(cx, bottomY - 0.022 * u, 0.034 * u, 0.024 * u), fill: pal.dark });
      front.push({
        d: `M${f(cx)} ${f(bottomY - 0.002 * u)}V${f(bottomY + 0.016 * u)}Q${f(cx - 0.012 * u)} ${f(bottomY + 0.038 * u)} ${f(cx - 0.036 * u)} ${f(bottomY + 0.028 * u)}M${f(cx)} ${f(bottomY + 0.016 * u)}Q${f(cx + 0.012 * u)} ${f(bottomY + 0.038 * u)} ${f(cx + 0.036 * u)} ${f(bottomY + 0.028 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.01 * u,
      });
      break;
    }
    case "koala": {
      // 크고 푹신한 둥근 귀(가장자리에 잔털) + 크고 검은 타원 코
      for (const sx of [earX, w - earX]) {
        back.push({ d: fluffyCircleD(sx, 0.15 * u, 0.115 * u, 12, 0.03 * u), fill: pal.body });
        back.push({ d: fluffyCircleD(sx, 0.15 * u, 0.062 * u, 10, 0.02 * u, 0.3), fill: pal.inner });
      }
      for (const sx of [-1, 1]) dotEye(front, cx + sx * eyeDX, eyeY, 0.024 * u, pal.dark);
      front.push({ d: ellipseD(cx, bottomY, 0.12 * u, 0.062 * u), fill: pal.light });
      front.push({ d: ellipseD(cx, bottomY - 0.014 * u, 0.044 * u, 0.056 * u), fill: pal.dark });
      front.push({ d: ellipseD(cx - 0.012 * u, bottomY - 0.03 * u, 0.012 * u, 0.016 * u), fill: "#FFFFFF", opacity: 0.55 });
      blushPair(front, cx, bottomY, 0.3 * u, u, pal.blush);
      break;
    }
    case "sheep": {
      // 구름 같은 양털 테두리(둘레를 정수 칸으로) + 위쪽 어두운 얼굴·귀
      const rr = woolR;
      const cxr = rr;
      const ringW = Math.max(1, w - 2 * cxr);
      const ringH = Math.max(1, h - bodyY - 2 * cxr);
      const nx = Math.max(4, Math.round(ringW / (1.55 * rr)));
      const ny = Math.max(4, Math.round(ringH / (1.55 * rr)));
      for (let i = 0; i <= nx; i++) {
        extraBodyD += circleD(cxr + (i * ringW) / nx, bodyY + cxr, rr) + circleD(cxr + (i * ringW) / nx, h - cxr, rr);
      }
      for (let j = 1; j < ny; j++) {
        extraBodyD += circleD(cxr, bodyY + cxr + (j * ringH) / ny, rr) + circleD(w - cxr, bodyY + cxr + (j * ringH) / ny, rr);
      }
      outline = pal.line;
      // 얼굴은 위쪽 중앙에 얹고(몸통 위), 귀는 가로로 누운 타원
      for (const sx of [-1, 1]) {
        front.push({ d: ellipseD(cx + sx * 0.135 * u, 0.12 * u, 0.062 * u, 0.03 * u, sx * 22), fill: pal.dark });
      }
      front.push({ d: ellipseD(cx, 0.115 * u, 0.1 * u, 0.115 * u), fill: pal.dark });
      front.push({ d: fluffyCircleD(cx, 0.03 * u, 0.045 * u, 7, 0.022 * u), fill: pal.body });
      for (const sx of [-1, 1]) {
        front.push({ d: circleD(cx + sx * 0.042 * u, 0.115 * u, 0.019 * u), fill: "#FFFFFF" });
        front.push({ d: circleD(cx + sx * 0.042 * u, 0.117 * u, 0.009 * u), fill: pal.dark });
      }
      front.push({ d: ellipseD(cx, 0.158 * u, 0.026 * u, 0.017 * u), fill: pal.accent });
      // 아래 띠에는 귀여운 볼터치와 작은 미소
      front.push({
        d: `M${f(cx - 0.05 * u)} ${f(bottomY - 0.002 * u)}Q${f(cx)} ${f(bottomY + 0.05 * u)} ${f(cx + 0.05 * u)} ${f(bottomY - 0.002 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.012 * u,
      });
      blushPair(front, cx, bottomY - 0.004 * u, 0.2 * u, u, pal.blush);
      break;
    }
    case "elephant": {
      // 큰 둥근 귀(안쪽 분홍) + 아래로 늘어진 코(감긴 끝) + 하얀 상아
      for (const sx of [-1, 1]) {
        const ex = sx < 0 ? 0.15 * u : w - 0.15 * u;
        back.push({ d: ellipseD(ex, 0.17 * u, 0.145 * u, 0.16 * u), fill: pal.body });
        back.push({ d: ellipseD(ex, 0.18 * u, 0.09 * u, 0.1 * u), fill: pal.inner });
      }
      for (const sx of [-1, 1]) dotEye(front, cx + sx * eyeDX, eyeY, 0.026 * u, pal.dark);
      blushPair(front, cx, eyeY + 0.03 * u, 0.28 * u, u, pal.blush);
      // 코: 위 띠 아래(창 아래)에서 아래 띠 가운데로 — 굵은 둥근 선으로 감긴 끝까지
      const ty = h - bottomBand;
      front.push({
        d: `M${f(cx)} ${f(ty + 0.04 * u)}V${f(ty + 0.09 * u)}Q${f(cx)} ${f(ty + 0.142 * u)} ${f(cx + 0.04 * u)} ${f(ty + 0.136 * u)}Q${f(cx + 0.066 * u)} ${f(ty + 0.13 * u)} ${f(cx + 0.058 * u)} ${f(ty + 0.106 * u)}`,
        stroke: "#9CB4D8",
        strokeWidth: 0.06 * u,
      });
      front.push({ d: `M${f(cx - 0.008 * u)} ${f(ty + 0.05 * u)}V${f(ty + 0.09 * u)}`, stroke: pal.light, strokeWidth: 0.01 * u, opacity: 0.8 });
      for (const sx of [-1, 1]) {
        front.push({ d: polyD([{ x: cx + sx * 0.075 * u, y: ty + 0.045 * u }, { x: cx + sx * 0.12 * u, y: ty + 0.125 * u }, { x: cx + sx * 0.09 * u, y: ty + 0.125 * u }]), fill: "#FFFFFF", stroke: "#FFFFFF", strokeWidth: 0.01 * u });
      }
      break;
    }
    case "raccoon": {
      // 둥근 귀(끝 하얀색) + 눈을 가로지르는 어두운 마스크 + 하얀 주둥이
      for (const sx of [earX, w - earX]) {
        back.push({ d: circleD(sx, 0.13 * u, 0.105 * u), fill: pal.dark });
        back.push({ d: circleD(sx, 0.135 * u, 0.058 * u), fill: pal.inner });
      }
      mid.push({
        d: `M${f(cx - 0.34 * u)} ${f(eyeY)}Q${f(cx - 0.3 * u)} ${f(eyeY - 0.058 * u)} ${f(cx - 0.1 * u)} ${f(eyeY - 0.04 * u)}Q${f(cx)} ${f(eyeY - 0.015 * u)} ${f(cx + 0.1 * u)} ${f(eyeY - 0.04 * u)}Q${f(cx + 0.3 * u)} ${f(eyeY - 0.058 * u)} ${f(cx + 0.34 * u)} ${f(eyeY)}Q${f(cx + 0.3 * u)} ${f(eyeY + 0.06 * u)} ${f(cx + 0.1 * u)} ${f(eyeY + 0.042 * u)}Q${f(cx)} ${f(eyeY + 0.02 * u)} ${f(cx - 0.1 * u)} ${f(eyeY + 0.042 * u)}Q${f(cx - 0.3 * u)} ${f(eyeY + 0.06 * u)} ${f(cx - 0.34 * u)} ${f(eyeY)}Z`,
        fill: pal.dark,
      });
      for (const sx of [-1, 1]) {
        front.push({ d: circleD(cx + sx * eyeDX, eyeY, 0.026 * u), fill: "#FFFFFF" });
        front.push({ d: circleD(cx + sx * eyeDX + sx * 0.003 * u, eyeY + 0.002 * u, 0.014 * u), fill: pal.dark });
      }
      front.push({ d: ellipseD(cx, bottomY, 0.12 * u, 0.062 * u), fill: "#FFFFFF" });
      front.push({ d: ellipseD(cx, bottomY - 0.018 * u, 0.036 * u, 0.026 * u), fill: pal.dark });
      front.push({
        d: `M${f(cx)} ${f(bottomY + 0.002 * u)}V${f(bottomY + 0.018 * u)}Q${f(cx - 0.012 * u)} ${f(bottomY + 0.04 * u)} ${f(cx - 0.038 * u)} ${f(bottomY + 0.03 * u)}M${f(cx)} ${f(bottomY + 0.018 * u)}Q${f(cx + 0.012 * u)} ${f(bottomY + 0.04 * u)} ${f(cx + 0.038 * u)} ${f(bottomY + 0.03 * u)}`,
        stroke: pal.dark,
        strokeWidth: 0.01 * u,
      });
      for (const sx of [-1, 1]) {
        // 볼 털
        mid.push({ d: ellipseD(sx < 0 ? 0.075 * u : w - 0.075 * u, h - 0.075 * u, 0.062 * u, 0.045 * u), fill: "#FFFFFF" });
      }
      break;
    }
  }

  const bodyPrims: DecorPrim[] = [
    { d: bodyOuterD + winD, fill: bodyFill, fillRule: "evenodd" },
  ];
  if (extraBodyD) bodyPrims.push({ d: extraBodyD, fill: bodyFill });
  if (outline) {
    bodyPrims.push({ d: bodyOuterD, stroke: outline, strokeWidth: 0.01 * u });
    if (extraBodyD) bodyPrims.push({ d: extraBodyD, stroke: outline, strokeWidth: 0.007 * u });
    // 윤곽선이 안쪽 구름 둥글림을 가리지 않게, 몸통을 한 번 더 덮어 안쪽 선을 지워요
    bodyPrims.push({ d: bodyOuterD + winD, fill: bodyFill, fillRule: "evenodd" });
    if (extraBodyD) bodyPrims.push({ d: extraBodyD, fill: bodyFill });
  }
  bodyPrims.push({ d: winD, stroke: pal.line, strokeWidth: 0.012 * u });
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [{ prims: back }, { prims: bodyPrims }, { clipD: bodyOuterD, prims: mid }, { prims: front }],
  };
}

// ---- 8. 새 장식 테두리 8종 (즉석사진·필름·티켓·리본·깅엄체크·파스텔 도트·부드러운 물결·심플 이중선) ----
// 공통 비율 규칙: u = 짧은 변. 테두리 두께는 u의 4~11%(즉석사진 아래·티켓 오른쪽·필름 위아래처럼
// 일부러 두꺼운 쪽만 예외), 무늬(구멍·점·체크·물결)의 크기는 전부 u 기준 고정이고 개수만
// 박스 크기로 정수로 계산해서, 박스를 가로로 늘려도 구멍·점·체크가 찌그러지지 않아요.
// 사진 창은 항상 평범한 사각형(모서리 0~0.01u)이고 띠가 창 가장자리를 덮어요(photoBleed 적용).

type RingGeom = { win: DecorWindow; ringD: string };

function ringOf(w: number, h: number, l: number, t: number, r: number, b: number, rad: number = 0): RingGeom {
  const win = safeWindow(l, t, w - l - r, h - t - b, rad, w, h);
  return { win, ringD: rectD(0, 0, w, h) + decorWindowPathD(win) };
}

// 6. 즉석사진: 흰 카드, 아래가 두꺼움(0.2u), 나머지 0.06u. 은은한 회색 윤곽선 + 아래 손글씨 느낌 선과 하트
function buildInstant(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const side = 0.06 * u;
  const bottom = 0.2 * u;
  const { win, ringD } = ringOf(w, h, side, side, side, bottom);
  const hx = w / 2;
  const hy = h - bottom / 2 + 0.005 * u;
  const heart = (cx: number, cy: number, s: number) =>
    `M${f(cx)} ${f(cy + s * 0.9)}C${f(cx - s * 1.6)} ${f(cy - s * 0.1)} ${f(cx - s * 0.7)} ${f(cy - s * 1.1)} ${f(cx)} ${f(cy - s * 0.3)}C${f(cx + s * 0.7)} ${f(cy - s * 1.1)} ${f(cx + s * 1.6)} ${f(cy - s * 0.1)} ${f(cx)} ${f(cy + s * 0.9)}Z`;
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: ringD, fill: "#FFFFFF", fillRule: "evenodd" },
          { d: rectD(0.003 * u, 0.003 * u, w - 0.006 * u, h - 0.006 * u), stroke: "#E2E4E9", strokeWidth: 0.006 * u },
          { d: decorWindowPathD(win), stroke: "#ECEDF1", strokeWidth: 0.006 * u },
          { d: `M${f(hx - 0.2 * u)} ${f(hy)}Q${f(hx - 0.1 * u)} ${f(hy - 0.02 * u)} ${f(hx - 0.05 * u)} ${f(hy)}M${f(hx + 0.05 * u)} ${f(hy)}Q${f(hx + 0.1 * u)} ${f(hy + 0.02 * u)} ${f(hx + 0.2 * u)} ${f(hy)}`, stroke: "#C9CDD6", strokeWidth: 0.008 * u },
          { d: heart(hx, hy, 0.022 * u), fill: "#F5A3B8" },
        ],
      },
    ],
  };
}

// 7. 필름: 짙은 필름 띠. 위·아래 띠 0.1u에 둥근 구멍(0.05u×0.034u)을 정수 개수로, 좌우 띠 0.04u
function buildFilm(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const band = 0.1 * u;
  const sideB = 0.04 * u;
  const { win, ringD } = ringOf(w, h, sideB, band, sideB, band);
  const holeW = 0.05 * u;
  const holeH = 0.034 * u;
  const n = Math.max(4, Math.round((w - 2 * sideB) / (0.085 * u)));
  const pitch = (w - 2 * sideB) / n;
  let holes = "";
  for (let i = 0; i < n; i++) {
    const x = sideB + (i + 0.5) * pitch - holeW / 2;
    holes += rrectD(x, band / 2 - holeH / 2, holeW, holeH, 0.009 * u) + rrectD(x, h - band / 2 - holeH / 2, holeW, holeH, 0.009 * u);
  }
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: ringD, fill: "#2D2D33", fillRule: "evenodd" },
          { d: holes, fill: "#F4F1EA" },
          { d: decorWindowPathD(win), stroke: "#1B1B20", strokeWidth: 0.008 * u },
        ],
      },
    ],
  };
}

// 8. 티켓: 크림색 표. 오른쪽에 점선이 있는 두꺼운 "조각"(0.14u), 나머지 0.06u. 위·아래 모서리 둥글림 0.03u,
//    좌우 가운데에 반원 홈(반지름 0.04u). 홈은 윤곽선 자체에 호로 파서 뒤가 투명하게 보여요.
function buildTicket(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const side = 0.06 * u;
  const stub = 0.14 * u;
  const { win } = ringOf(w, h, side, side, stub, side);
  const r = 0.03 * u;
  const n = 0.04 * u;
  const cy = h / 2;
  const outer =
    `M${f(r)} 0H${f(w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(w)} ${f(r)}V${f(cy - n)}A${f(n)} ${f(n)} 0 0 0 ${f(w)} ${f(cy + n)}V${f(h - r)}` +
    `A${f(r)} ${f(r)} 0 0 1 ${f(w - r)} ${f(h)}H${f(r)}A${f(r)} ${f(r)} 0 0 1 0 ${f(h - r)}V${f(cy + n)}A${f(n)} ${f(n)} 0 0 0 0 ${f(cy - n)}V${f(r)}A${f(r)} ${f(r)} 0 0 1 ${f(r)} 0Z`;
  const winD = decorWindowPathD(win);
  const px = w - stub / 2 - side * 0.0;
  const perfX = w - stub + 0.0 * u;
  const dashes: string[] = [];
  const nd = Math.max(6, Math.round((h - 2 * r - 2 * n) / (0.045 * u)));
  const dy = (h - 4 * r) / nd;
  for (let i = 0; i < nd; i++) {
    const y0 = 2 * r + i * dy;
    if (Math.abs(y0 + dy / 2 - cy) < n * 1.3) continue;
    dashes.push(`M${f(perfX + 0.012 * u)} ${f(y0)}V${f(y0 + dy * 0.55)}`);
  }
  // 조각 안 별 무늬
  const star = starShapePoints(5, 1, 0.45);
  const sc = 0.04 * u;
  const starD = polyD(star.map((p) => ({ x: px + 0.012 * u + p.x * sc, y: h * 0.27 + p.y * sc })));
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: outer + winD, fill: "#FFF1CC", fillRule: "evenodd" },
          { d: outer, stroke: "#EBCB86", strokeWidth: 0.006 * u },
          { d: winD, stroke: "#EBCB86", strokeWidth: 0.008 * u },
          { d: dashes.join(""), stroke: "#D9A94A", strokeWidth: 0.007 * u },
          { d: starD, fill: "#F2B544" },
        ],
      },
    ],
  };
}

// 9. 리본: 분홍 리본 띠(0.055u, 위쪽만 0.11u) + 흰 바느질 점선 + 위 가운데 리본 매듭(고리 2개·매듭·꼬리)
function buildRibbon(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.055 * u;
  const top = 0.11 * u;
  const { win, ringD } = ringOf(w, h, b, top, b, b);
  const cx = w / 2;
  const by = top / 2;
  const loop = (sx: number) => {
    // 고리: 매듭에서 바깥으로 벌어지는 물방울 모양
    const x0 = cx + sx * 0.012 * u;
    const x1 = cx + sx * 0.115 * u;
    return `M${f(x0)} ${f(by)}C${f(x0 + sx * 0.03 * u)} ${f(by - 0.08 * u)} ${f(x1)} ${f(by - 0.07 * u)} ${f(x1)} ${f(by)}C${f(x1)} ${f(by + 0.07 * u)} ${f(x0 + sx * 0.03 * u)} ${f(by + 0.08 * u)} ${f(x0)} ${f(by)}Z`;
  };
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: ringD, fill: "#F8B3C8", fillRule: "evenodd" },
          { d: rectD(0.012 * u, 0.012 * u, w - 0.024 * u, h - 0.024 * u), stroke: "#FFFFFF", strokeWidth: 0.005 * u, opacity: 0.85 },
          { d: decorWindowPathD(win), stroke: "#E98FAB", strokeWidth: 0.008 * u },
        ],
      },
      {
        prims: [
          { d: loop(-1) + loop(1), fill: "#F59DB8", stroke: "#E4799C", strokeWidth: 0.007 * u },
          { d: circleD(cx, by, 0.026 * u), fill: "#F27FA3", stroke: "#E4799C", strokeWidth: 0.006 * u },
          { d: `M${f(cx - 0.018 * u)} ${f(by)}h${f(0.036 * u)}`, stroke: "#FFFFFF", strokeWidth: 0.006 * u, opacity: 0.0 },
        ],
      },
    ],
  };
}

// 10. 깅엄체크: 띠 0.07u를 체크 칸 한 변 0.035u로 정확히 2칸 두께 — 흰 바탕 위에 분홍 가로줄·세로줄(반투명)이 겹쳐 진한 칸이 생겨요
function buildGingham(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.07 * u;
  const { win, ringD } = ringOf(w, h, b, b, b, b);
  const p = b / 2;
  let hs = "";
  let vs = "";
  for (let y = 0; y < h; y += 2 * p) hs += rectD(0, y, w, p);
  for (let x = 0; x < w; x += 2 * p) vs += rectD(x, 0, p, h);
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      { prims: [{ d: ringD, fill: "#FFFFFF", fillRule: "evenodd" }] },
      {
        clipD: ringD,
        clipRule: "evenodd",
        prims: [
          { d: hs, fill: "#F28DAB", opacity: 0.5 },
          { d: vs, fill: "#F28DAB", opacity: 0.5 },
        ],
      },
      { prims: [{ d: decorWindowPathD(win), stroke: "#FFFFFF", strokeWidth: 0.008 * u }] },
    ],
  };
}

// 11. 파스텔 도트: 띠 0.08u, 크림 바탕에 5가지 파스텔 점(반지름 0.012~0.02u)을 엇갈린 격자(간격 0.056u)에 고정 의사난수로
function buildPastelDots(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.08 * u;
  const { win, ringD } = ringOf(w, h, b, b, b, b);
  const colors = ["#F9B9C9", "#B9DDF4", "#FBE08A", "#BDE8CF", "#D5C5F2"];
  const bucket: string[] = colors.map(() => "");
  const sp = 0.056 * u;
  let row = 0;
  let idx = 0;
  for (let y = sp / 2; y < h + sp; y += sp * 0.9) {
    const off = row % 2 === 0 ? 0 : sp / 2;
    for (let x = sp / 2 + off; x < w + sp; x += sp) {
      idx++;
      const inside = x - 0.03 * u > win.x && x + 0.03 * u < win.x + win.w && y - 0.03 * u > win.y && y + 0.03 * u < win.y + win.h;
      if (inside) continue;
      const k = Math.floor(hash01(idx, 5) * colors.length);
      bucket[k] += circleD(x + (hash01(idx, 6) - 0.5) * 0.008 * u, y + (hash01(idx, 7) - 0.5) * 0.008 * u, (0.012 + hash01(idx, 8) * 0.008) * u);
    }
    row++;
  }
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      { prims: [{ d: ringD, fill: "#FFF8EE", fillRule: "evenodd" }] },
      { clipD: ringD, clipRule: "evenodd", prims: colors.map((c, i) => ({ d: bucket[i], fill: c })) },
      { prims: [{ d: decorWindowPathD(win), stroke: "#FFFFFF", strokeWidth: 0.008 * u }] },
    ],
  };
}

// 12. 부드러운 물결: 바깥 가장자리가 물결(진폭 0.012u, 변마다 정수 개의 물결, 물결 길이 ≈0.09u)인 하늘색 띠 + 안쪽 연한 물결 띠
function wavyRectD(x: number, y: number, w: number, h: number, amp: number, wl: number): string {
  const nx = Math.max(3, Math.round(w / wl));
  const ny = Math.max(3, Math.round(h / wl));
  const steps = 16;
  const pts: { x: number; y: number }[] = [];
  const edge = (n: number, len: number, f2: (t: number, off: number) => { x: number; y: number }) => {
    for (let i = 0; i < n * steps; i++) {
      const t = i / (n * steps);
      const off = amp * (1 - Math.cos(t * n * 2 * Math.PI)) / 2;
      pts.push(f2(t * len, off));
    }
  };
  edge(nx, w, (t, o) => ({ x: x + t, y: y + o }));
  edge(ny, h, (t, o) => ({ x: x + w - o, y: y + t }));
  edge(nx, w, (t, o) => ({ x: x + w - t, y: y + h - o }));
  edge(ny, h, (t, o) => ({ x: x + o, y: y + h - t }));
  return polyD(pts);
}

function buildSoftWave(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.075 * u;
  const win = safeWindow(b, b, w - 2 * b, h - 2 * b, 0, w, h);
  const winD = decorWindowPathD(win);
  const amp = 0.012 * u;
  const wl = 0.09 * u;
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: wavyRectD(0, 0, w, h, amp, wl) + winD, fill: "#BFE3F3", fillRule: "evenodd" },
          { d: wavyRectD(0.026 * u, 0.026 * u, w - 0.052 * u, h - 0.052 * u, amp * 0.8, wl) + winD, fill: "#E6F5FC", fillRule: "evenodd" },
          { d: decorWindowPathD(win), stroke: "#FFFFFF", strokeWidth: 0.008 * u },
        ],
      },
    ],
  };
}

// 13. 심플 이중선: 흰 띠(0.055u)에 얇은 선 2줄(바깥 0.012u, 안쪽 0.036u 위치, 두께 0.005u)
function buildDoubleLine(w: number, h: number): DecorLayout {
  const u = Math.min(w, h);
  const b = 0.055 * u;
  const { win, ringD } = ringOf(w, h, b, b, b, b);
  return {
    w,
    h,
    window: win,
    photoBleed: photoBleedFor(u),
    groups: [
      {
        prims: [
          { d: ringD, fill: "#FFFFFF", fillRule: "evenodd" },
          { d: rectD(0.012 * u, 0.012 * u, w - 0.024 * u, h - 0.024 * u), stroke: "#3E4C6D", strokeWidth: 0.005 * u },
          { d: rectD(0.034 * u, 0.034 * u, w - 0.068 * u, h - 0.068 * u), stroke: "#3E4C6D", strokeWidth: 0.0035 * u },
        ],
      },
    ],
  };
}

// ---- 9. 새 꽃·잎 화환 8종 (데이지·튤립·장미·해바라기·라벤더·수국·안개꽃·유칼립투스 잎) ----
// 기존 벚꽃 화환(buildWreath)과 같은 규칙: 사진 창은 평범한 사각형(모서리 0.03u)이고 화환은 창 바깥 띠에만
// 있어요(창 안쪽으로 들어오지 않음). 둥근 사각형 모양의 화환 "둘레"를 정수 칸으로 나눠서(칸 길이 ≈ 종류별
// 간격×u) 칸마다 꽃/잎을 하나씩 놓고, 크기는 전부 u(짧은 변) 기준이라 박스가 길어지면 같은 크기가 더
// 많이 놓일 뿐 늘어나거나 찌그러지지 않아요. 위치(수직 흔들림)·각도·크기(0.85~1.15배)의 흐트러짐은
// 칸 번호로 정해지는 고정 의사난수(hash01)라서 화면/인쇄/다시 열기가 항상 똑같아요.

export type WreathKind = "daisy" | "tulip" | "rose" | "sunflower" | "lavender" | "hydrangea" | "babysBreath" | "eucalyptus";

type WreathSpec = { spacing: number; center: number; inset: number };
const WREATH_SPECS: Record<WreathKind, WreathSpec> = {
  daisy: { spacing: 0.07, center: 0.062, inset: 0.125 },
  tulip: { spacing: 0.085, center: 0.065, inset: 0.13 },
  rose: { spacing: 0.075, center: 0.065, inset: 0.13 },
  sunflower: { spacing: 0.1, center: 0.075, inset: 0.15 },
  lavender: { spacing: 0.07, center: 0.062, inset: 0.125 },
  hydrangea: { spacing: 0.085, center: 0.07, inset: 0.14 },
  babysBreath: { spacing: 0.055, center: 0.058, inset: 0.115 },
  eucalyptus: { spacing: 0.055, center: 0.06, inset: 0.12 },
};

// 그리는 순서가 있는 색별 path 모음(뒤에서 앞으로) — 같은 색 도형은 하나의 path로 묶어요
class Layers {
  private order: string[] = [];
  private map = new Map<string, DecorPrim>();
  fill(key: string, color: string, d: string, opacity?: number): void {
    const k = `f|${key}|${color}`;
    let p = this.map.get(k);
    if (!p) {
      p = { d: "", fill: color, opacity };
      this.map.set(k, p);
      this.order.push(k);
    }
    p.d += d;
  }
  stroke(key: string, color: string, width: number, d: string): void {
    const k = `s|${key}|${color}|${width}`;
    let p = this.map.get(k);
    if (!p) {
      p = { d: "", stroke: color, strokeWidth: width };
      this.map.set(k, p);
      this.order.push(k);
    }
    p.d += d;
  }
  prims(): DecorPrim[] {
    return this.order.map((k) => this.map.get(k)!);
  }
}

// 로컬 좌표(0,0 중심, 각도 rot, 배율 sc)의 점을 박스 좌표로 바꾸는 도우미
function xf(cx: number, cy: number, rot: number, sc: number) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return (lx: number, ly: number) => `${f(cx + (lx * c - ly * s) * sc)} ${f(cy + (lx * s + ly * c) * sc)}`;
}

// 뾰족한 꽃잎(물방울) — 중심에서 각도 a 방향으로 길이 len, 폭 wid
function petalD(cx: number, cy: number, a: number, len: number, wid: number, start: number = 0): string {
  const P = xf(cx, cy, a, 1);
  return `M${P(start, 0)}Q${P(start + len * 0.45, -wid)} ${P(start + len, 0)}Q${P(start + len * 0.45, wid)} ${P(start, 0)}Z`;
}

function buildWreathKind(kind: WreathKind, w: number, h: number): DecorLayout {
  const spec = WREATH_SPECS[kind];
  const u = Math.min(w, h);
  const inset = spec.inset * u;
  const win = safeWindow(inset, inset, w - 2 * inset, h - 2 * inset, 0.03 * u, w, h);
  const c0 = spec.center * u;
  const rw = Math.max(1, w - 2 * c0);
  const rh = Math.max(1, h - 2 * c0);
  const rc = Math.min(0.1 * u, rw / 2, rh / 2);
  const perim = 2 * (rw - 2 * rc) + 2 * (rh - 2 * rc) + 2 * Math.PI * rc;
  const n = Math.max(12, Math.round(perim / (spec.spacing * u)));
  const L = new Layers();
  const green = ["#8DCB78", "#A8DB8B", "#7DBF6C"];
  // 잎 색 세 가지를 먼저 등록해서, 어느 칸의 잎이든 항상 모든 꽃보다 "뒤"에 그려지게 해요(그리는 순서 = 등록 순서)
  for (const g of green) L.fill("leaf", g, "");

  // 유칼립투스·라벤더·안개꽃은 둘레를 따라 이어지는 가는 줄기를 먼저 깔아요
  if (kind === "eucalyptus" || kind === "lavender" || kind === "babysBreath") {
    const stemColor = kind === "eucalyptus" ? "#7FA591" : "#86B77A";
    let d = "";
    const steps = n * 3;
    for (let i = 0; i <= steps; i++) {
      const pt = pointOnRoundedRect(c0, c0, rw, rh, rc, (i * perim) / steps);
      d += `${i === 0 ? "M" : "L"}${f(pt.px)} ${f(pt.py)}`;
    }
    L.stroke("stem", stemColor, (kind === "eucalyptus" ? 0.008 : 0.005) * u, d + "Z");
  }

  for (let i = 0; i < n; i++) {
    const pt = pointOnRoundedRect(c0, c0, rw, rh, rc, (i * perim) / n);
    const jit = (hash01(i, 11) - 0.5) * 0.024 * u;
    const px = pt.px + pt.nx * jit;
    const py = pt.py + pt.ny * jit;
    const tang = Math.atan2(pt.ty, pt.tx);
    const sc = 0.85 + hash01(i, 12) * 0.3;
    const rot = hash01(i, 13) * Math.PI * 2;
    const side = i % 2 === 0 ? 1 : -1;
    const leafA = tang + side * (0.5 + hash01(i, 14) * 0.5);

    switch (kind) {
      case "daisy": {
        // 잎 → 흰 꽃잎 12장 → 노란 가운데
        L.fill("leaf", green[i % 3], leafD(px + pt.nx * side * 0.01 * u, py + pt.ny * side * 0.01 * u, leafA, 0.07 * u * sc, 0.02 * u));
        if (i % 2 === 0) {
          const R = 0.044 * u * sc;
          let pd = "";
          for (let k = 0; k < 12; k++) pd += petalD(px, py, rot + (k * Math.PI * 2) / 12, R, 0.012 * u * sc, R * 0.15);
          L.fill("daisy", "#FFFFFF", pd);
          L.stroke("daisyo", "#E3E7EE", 0.003 * u, pd);
          L.fill("dcenter", "#FFD54A", circleD(px, py, 0.015 * u * sc));
        }
        break;
      }
      case "tulip": {
        L.fill("leaf", green[i % 3], leafD(px + Math.cos(tang) * 0.01 * u, py + Math.sin(tang) * 0.01 * u, tang + side * 0.35, 0.1 * u * sc, 0.016 * u));
        if (i % 2 === 0) {
          const P = xf(px, py, rot * 0.25 - Math.PI / 2 + Math.atan2(pt.ny, pt.nx) * 0 + (hash01(i, 15) - 0.5) * 0.9, 0.05 * u * sc);
          const d = `M${P(-0.5, 0.3)}C${P(-0.58, -0.25)} ${P(-0.42, -0.7)} ${P(-0.3, -0.92)}L${P(-0.12, -0.48)}L${P(0, -1)}L${P(0.12, -0.48)}L${P(0.3, -0.92)}C${P(0.42, -0.7)} ${P(0.58, -0.25)} ${P(0.5, 0.3)}C${P(0.4, 0.78)} ${P(-0.4, 0.78)} ${P(-0.5, 0.3)}Z`;
          const cols = ["#F48FB1", "#EF6F7E", "#FFC857", "#F8A6C4"];
          L.fill("tulip" + (i % 4), cols[(i / 2) % 4 | 0], d);
        }
        break;
      }
      case "rose": {
        L.fill("leaf", green[i % 3], leafD(px + pt.nx * side * 0.012 * u, py + pt.ny * side * 0.012 * u, leafA, 0.065 * u * sc, 0.022 * u));
        if (i % 2 === 0) {
          const R = 0.04 * u * sc;
          const tone = i % 4 === 0 ? ["#F26B8A", "#E8506F", "#F7A1B5"] : ["#F7A1B5", "#EE7F9C", "#FBC9D6"];
          L.fill("rose0", tone[0], circleD(px, py, R));
          L.fill("rose1", tone[1], circleD(px + R * 0.08, py - R * 0.05, R * 0.72));
          L.fill("rose2", tone[2], circleD(px - R * 0.06, py + R * 0.04, R * 0.46));
          L.stroke("rose3", tone[0], 0.004 * u, `M${f(px - R * 0.3)} ${f(py)}A${f(R * 0.3)} ${f(R * 0.3)} 0 1 1 ${f(px + R * 0.1)} ${f(py + R * 0.28)}`);
        }
        break;
      }
      case "sunflower": {
        L.fill("leaf", green[i % 3], leafD(px + pt.nx * side * 0.012 * u, py + pt.ny * side * 0.012 * u, leafA, 0.08 * u * sc, 0.028 * u));
        if (i % 2 === 0) {
          const R = 0.062 * u * sc;
          let pd = "";
          let pd2 = "";
          for (let k = 0; k < 14; k++) pd += petalD(px, py, rot + (k * Math.PI * 2) / 14, R, 0.016 * u * sc, R * 0.3);
          for (let k = 0; k < 14; k++) pd2 += petalD(px, py, rot + ((k + 0.5) * Math.PI * 2) / 14, R * 0.86, 0.014 * u * sc, R * 0.3);
          L.fill("sf2", "#F7B733", pd2);
          L.fill("sf1", "#FFD23F", pd);
          L.fill("sfc", "#7A4B2A", circleD(px, py, R * 0.36));
          L.fill("sfd", "#5A331B", circleD(px - R * 0.1, py - R * 0.05, R * 0.04) + circleD(px + R * 0.1, py + R * 0.08, R * 0.04) + circleD(px + R * 0.04, py - R * 0.14, R * 0.035));
        }
        break;
      }
      case "lavender": {
        // 둘레 방향으로 비스듬히(좌우 번갈아 ±0.55rad) 누운 작은 이삭: 줄기 + 보라 낟알 7쌍
        const dir = tang + side * 0.55;
        const len = 0.085 * u * sc;
        const P = xf(px, py, dir, 1);
        L.stroke("lstem", "#86B77A", 0.005 * u, `M${P(0, 0)}L${P(len, 0)}`);
        let buds = "";
        let buds2 = "";
        for (let k = 0; k < 7; k++) {
          const t = 0.35 + (k / 6) * 0.65;
          const bx = len * t;
          const bw = 0.009 * u * (1 - k * 0.07);
          buds += ellipseD(px + Math.cos(dir) * bx - Math.sin(dir) * 0.008 * u, py + Math.sin(dir) * bx + Math.cos(dir) * 0.008 * u, 0.014 * u, bw, (dir * 180) / Math.PI + 25);
          buds2 += ellipseD(px + Math.cos(dir) * bx + Math.sin(dir) * 0.008 * u, py + Math.sin(dir) * bx - Math.cos(dir) * 0.008 * u, 0.014 * u, bw, (dir * 180) / Math.PI - 25);
        }
        L.fill("lb1", "#A98BD6", buds);
        L.fill("lb2", "#C3A9EA", buds2);
        L.fill("leaf", green[i % 3], leafD(px, py, tang + side * 0.5, 0.06 * u, 0.013 * u));
        break;
      }
      case "hydrangea": {
        L.fill("leaf", green[i % 3], leafD(px + pt.nx * side * 0.012 * u, py + pt.ny * side * 0.012 * u, leafA, 0.075 * u * sc, 0.026 * u));
        if (i % 2 === 0) {
          const palettes = [["#9DB8F2", "#B9CCF7"], ["#C5A5EE", "#D9C4F5"], ["#F2A9C8", "#F7C6DA"]];
          const pal = palettes[(i / 2) % 3 | 0];
          // 꽃송이: 작은 4장짜리 꽃 7개(가운데 1 + 둘레 6)
          const R = 0.05 * u * sc;
          const centers = [[0, 0]];
          for (let k = 0; k < 6; k++) centers.push([Math.cos(rot + (k * Math.PI) / 3) * R * 0.62, Math.sin(rot + (k * Math.PI) / 3) * R * 0.62]);
          centers.forEach(([dx, dy], k) => {
            const fr = R * 0.34;
            for (let q = 0; q < 4; q++) {
              const a = rot + (q * Math.PI) / 2 + k * 0.3;
              L.fill("hy" + (k % 2), pal[k % 2], circleD(px + dx + Math.cos(a) * fr * 0.62, py + dy + Math.sin(a) * fr * 0.62, fr * 0.6));
            }
            L.fill("hyc", "#F8F4D8", circleD(px + dx, py + dy, fr * 0.22));
          });
        }
        break;
      }
      case "babysBreath": {
        // 짧은 곁가지 + 작은 흰 꽃 3송이(연한 윤곽선으로 흰 바탕에서도 보임)
        const dir = tang + side * 0.7;
        const len = 0.05 * u * sc;
        const P = xf(px, py, dir, 1);
        L.stroke("bstem", "#86B77A", 0.004 * u, `M${P(0, 0)}L${P(len, 0)}M${P(len * 0.5, 0)}L${P(len * 0.85, -0.018 * u)}`);
        const spots: [number, number][] = [[len, 0], [len * 0.85, -0.018 * u], [len * 0.45, 0.012 * u]];
        let petals = "";
        let cs = "";
        spots.forEach(([lx, ly], k) => {
          const cxp = px + Math.cos(dir) * lx - Math.sin(dir) * ly;
          const cyp = py + Math.sin(dir) * lx + Math.cos(dir) * ly;
          const r = (0.013 - k * 0.001) * u * sc;
          for (let q = 0; q < 5; q++) {
            const a = rot + (q * Math.PI * 2) / 5;
            petals += circleD(cxp + Math.cos(a) * r * 0.8, cyp + Math.sin(a) * r * 0.8, r * 0.62);
          }
          cs += circleD(cxp, cyp, r * 0.38);
        });
        L.stroke("bpo", "#DDE3EC", 0.003 * u, petals);
        L.fill("bp", "#FFFFFF", petals);
        L.fill("bc", "#F8D77A", cs);
        break;
      }
      case "eucalyptus": {
        // 줄기 양옆으로 둥근 은녹색 잎 한 쌍씩(번갈아 크기·색 다르게)
        const cols = ["#9DBFA8", "#B7D3BE", "#7FA591"];
        for (const sd of [-1, 1]) {
          const a = tang + sd * (0.9 + hash01(i, 16 + sd) * 0.4);
          const ex = px + Math.cos(a) * 0.026 * u * sc;
          const ey = py + Math.sin(a) * 0.026 * u * sc;
          L.fill("eu" + ((i + (sd > 0 ? 1 : 0)) % 3), cols[(i + (sd > 0 ? 1 : 0)) % 3], ellipseD(ex, ey, 0.03 * u * sc, 0.021 * u * sc, (a * 180) / Math.PI));
          L.stroke("euv", "#6E9580", 0.003 * u, `M${f(px)} ${f(py)}L${f(px + Math.cos(a) * 0.05 * u * sc)} ${f(py + Math.sin(a) * 0.05 * u * sc)}`);
        }
        break;
      }
    }
  }
  return { w, h, window: win, photoBleed: 0, groups: [{ prims: L.prims() }] };
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
    case "daisy":
    case "tulip":
    case "rose":
    case "sunflower":
    case "lavender":
    case "hydrangea":
    case "babysBreath":
    case "eucalyptus":
      return buildWreathKind(decor, w, h);
    case "instant":
      return buildInstant(w, h);
    case "film":
      return buildFilm(w, h);
    case "ticket":
      return buildTicket(w, h);
    case "ribbon":
      return buildRibbon(w, h);
    case "gingham":
      return buildGingham(w, h);
    case "pastelDots":
      return buildPastelDots(w, h);
    case "softWave":
      return buildSoftWave(w, h);
    case "doubleLine":
      return buildDoubleLine(w, h);
    case "dog":
    case "chick":
    case "tiger":
    case "penguin":
    case "panda":
    case "fox":
    case "koala":
    case "sheep":
    case "elephant":
    case "raccoon":
      return buildAnimal(decor, w, h);
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
