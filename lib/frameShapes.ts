// 사진 프레임의 "톱니(우표) 모양" 외곽선과 "점/별/하트 무늬 테두리"에 쓰는 좌표
// 계산을 한 곳에 모아둔 파일이에요. app/upload/page.tsx(화면, CSS clip-path/SVG)와
// lib/printCompose.ts(인쇄, canvas path)가 이 파일의 함수를 똑같이 import해서 쓰기
// 때문에, 좌표 공식을 양쪽에 따로 베껴 적다가 어긋나는 일이 구조적으로 불가능해요
// — 지난 라운드 육각형(HEXAGON_CLIP_PATH)은 같은 숫자를 두 파일에 각자 손으로
// 적어둔 방식이었는데, 이번엔 숫자 자체를 한 군데에서 공유해서 한 단계 더 안전해요.
// 2026-11(18번째 라운드 18차), 혜민님 요청("Tier 3 패턴형 장식 테두리 진행해주세요").

// 박스 가로/세로를 기준으로 한 0~100% 좌표예요(박스 자체 크기에 맞춰 늘어남 —
// 정사각형이 아니면 가로/세로 비율이 다르게 적용돼요, roundedRectPath의 타원
// 반지름 계산과 같은 방식).
export type PerimeterPoint = { xPct: number; yPct: number };

// 무늬 하나의 "모양"을 정의하는 로컬 좌표예요(-1~1, 중심이 0,0, 반지름이 1).
export type UnitPoint = { x: number; y: number };

// ---- 0. 공통 도우미: 박스 비율(aspect) → 짧은 변 u=1 단위 좌표, 외곽선 다듬기 ----
// 모든 "프레임 모양" 크기 규칙은 박스의 "짧은 변"(u)을 1로 본 단위로 정해요 — 그래서 박스가
// 가로로 길든 세로로 길든, 화면(작은 박스)이든 인쇄(큰 박스)든 톱니·귀·둥근 모서리의
// "실제 크기 비율"이 같아요. 이 파일의 함수는 박스의 실제 px 대신 aspect(가로÷세로)만 받으면
// 되고, 결과는 0~100%(박스 기준) 좌표라 화면 clip-path와 인쇄 canvas 경로가 그대로 써요.

type UPt = { x: number; y: number };

function aspectDims(aspect?: number): { W: number; H: number } {
  const a = aspect !== undefined && isFinite(aspect) && aspect > 0 ? aspect : 1;
  return { W: Math.max(a, 1), H: Math.max(1 / a, 1) };
}

function pctToU(pts: PerimeterPoint[], W: number, H: number): UPt[] {
  return pts.map((p) => ({ x: (p.xPct / 100) * W, y: (p.yPct / 100) * H }));
}

function uToPct(pts: UPt[], W: number, H: number): PerimeterPoint[] {
  return pts.map((p) => ({ xPct: (p.x / W) * 100, yPct: (p.y / H) * 100 }));
}

// 닫힌 곡선을 "같은 간격(spacing)"으로 다시 찍어요(호 길이 기준) — 점 사이 간격이 들쭉날쭉하면
// 아래 다듬기가 한쪽으로 치우쳐요.
function resampleClosed(P: UPt[], spacing: number): UPt[] {
  const n = P.length;
  const cum: number[] = [0];
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[n];
  const count = Math.max(24, Math.ceil(total / spacing));
  const out: UPt[] = [];
  let seg = 0;
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total;
    while (seg < n - 1 && cum[seg + 1] < d) seg++;
    const a = P[seg];
    const b = P[(seg + 1) % n];
    const segLen = cum[seg + 1] - cum[seg] || 1;
    const t = (d - cum[seg]) / segLen;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

// 닫힌 곡선 이동평균(반폭 m개 점) 두 번 — 뾰족한 모서리의 각을 둥글게 풀어줘요(모서리 둥글기 반지름은
// 대략 m×간격). 이미 매끈한 큰 곡선은 거의 안 변해요(줄어드는 양 ≈ 창 폭² ÷ (6×곡률반지름)).
function smoothClosed(P: UPt[], m: number): UPt[] {
  if (m < 1) return P;
  const n = P.length;
  let cur = P;
  for (let pass = 0; pass < 2; pass++) {
    const next: UPt[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      for (let k = -m; k <= m; k++) {
        const q = cur[(i + k + n * 4) % n];
        sx += q.x;
        sy += q.y;
      }
      next[i] = { x: sx / (2 * m + 1), y: sy / (2 * m + 1) };
    }
    cur = next;
  }
  return cur;
}

// Ramer–Douglas–Peucker(허용 오차 tol) — 같은 간격으로 촘촘히 찍은 점 중 곡선 모양에 영향 없는
// 점을 덜어내서 clip-path 문자열이 너무 길어지지 않게 해요(오차는 u의 0.02% 이하).
function rdp(pts: UPt[], tol: number): UPt[] {
  if (pts.length < 3) return pts;
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let maxD = -1;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / len;
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= tol) return [a, b];
  const left = rdp(pts.slice(0, idx + 1), tol);
  const right = rdp(pts.slice(idx), tol);
  return [...left.slice(0, -1), ...right];
}

function simplifyClosed(P: UPt[], tol: number): UPt[] {
  // 닫힌 곡선이라 시작점에서 가장 먼 점으로 둘로 나눠서 각각 단순화해요.
  let far = 0;
  let best = -1;
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i].x - P[0].x, P[i].y - P[0].y);
    if (d > best) {
      best = d;
      far = i;
    }
  }
  const first = rdp(P.slice(0, far + 1), tol);
  const second = rdp([...P.slice(far), P[0]], tol);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

const OUTLINE_SPACING_U = 0.002; // 다시 찍는 점 간격(짧은 변의 0.2%)
const OUTLINE_SIMPLIFY_TOL_U = 0.0002; // 점 덜어내기 허용 오차(짧은 변의 0.02% — 200% 확대에서도 0.5px 이하)

// 모양 하나의 거친 외곽선을 "매끈한 최종 외곽선"으로 다듬어요: 같은 간격으로 다시 찍기 → 이동평균으로
// 모서리 둥글리기(smoothU: 둥글리는 정도, 짧은 변 대비) → (refit이면) 원래 모양이 차지하던
// 가로·세로 범위로 다시 맞추기 → 점 덜어내기. 화면과 인쇄가 같은 함수를 부르니 결과가 같아요.
function finishOutline(pts: PerimeterPoint[], aspect: number | undefined, smoothU: number, refit: boolean): PerimeterPoint[] {
  const { W, H } = aspectDims(aspect);
  const src = pctToU(pts, W, H);
  const resampled = resampleClosed(src, OUTLINE_SPACING_U);
  const smoothed = smoothClosed(resampled, Math.round(smoothU / OUTLINE_SPACING_U / 2));
  let out = smoothed;
  if (refit) {
    const bb = (arr: UPt[]) => ({
      minX: Math.min(...arr.map((p) => p.x)),
      maxX: Math.max(...arr.map((p) => p.x)),
      minY: Math.min(...arr.map((p) => p.y)),
      maxY: Math.max(...arr.map((p) => p.y)),
    });
    const o = bb(src);
    const n = bb(smoothed);
    out = smoothed.map((p) => ({
      x: o.minX + ((p.x - n.minX) / (n.maxX - n.minX || 1)) * (o.maxX - o.minX),
      y: o.minY + ((p.y - n.minY) / (n.maxY - n.minY || 1)) * (o.maxY - o.minY),
    }));
  }
  return uToPct(simplifyClosed(out, OUTLINE_SIMPLIFY_TOL_U), W, H);
}

// ---- 1. 톱니(우표) 모양 ----
// 우표 가장자리의 "구멍 뚫린 테두리"(perforation)처럼 작고 촘촘하고 균일한 반원 홈이 네 변을 따라
// 줄지어 있어요. 크기 규칙(짧은 변 u=1 기준):
//   · 홈 반지름 r = 0.024u 고정 → 박스가 커지든 길어지든 톱니 하나의 "크기와 모양"은 그대로예요
//     (예전엔 변을 8등분해서 박스가 커지면 톱니도 같이 커지고 뾰족해졌어요).
//   · 홈 개수는 변마다 정수로: 개수 = round((변 길이 − 2×모서리 반지름) ÷ (3.4r)) (최소 3) —
//     홈 사이 간격이 변을 정확히 등분하니 끝에서 어정쩡하게 잘리지 않아요.
//   · 홈은 박스 "안쪽"으로 파인 반원(깊이 = r, 얕음)이고, 홈 가장자리와 모서리는 작은 호로 둥글게
//     이어서 뾰족한 끝이 없어요(홈과 평평한 이빨이 만나는 곳 반지름 0.3r, 박스 모서리 반지름 1.2r).
// aspect(가로÷세로)로 u 단위의 가로·세로 길이를 구하고, 결과는 0~100%(박스 기준) 좌표예요.
export const STAMP_NOTCH_RADIUS_U = 0.024;

export function scallopedRectPoints(aspect: number = 1): PerimeterPoint[] {
  const { W, H } = aspectDims(aspect);
  const r = STAMP_NOTCH_RADIUS_U;
  const f = 0.55 * r; // 홈 가장자리 둥글림 반지름(클수록 홈과 이빨이 부드럽게 이어져요)
  const rc = 1.7 * r; // 박스 모서리 둥글림 반지름
  const pitchTarget = 4.0 * r;
  const xo = Math.sqrt(r * r + 2 * r * f); // 홈 중심 ↔ 둥글림 호 중심의 가로 거리
  const fAng = Math.atan2(f, xo);
  const NOTCH_STEPS = 14;
  const FILLET_STEPS = 4;
  const CORNER_STEPS = 8;
  const edges = [
    { sx: 0, sy: 0, dx: 1, dy: 0, nx: 0, ny: 1, len: W },
    { sx: W, sy: 0, dx: 0, dy: 1, nx: -1, ny: 0, len: H },
    { sx: W, sy: H, dx: -1, dy: 0, nx: 0, ny: -1, len: W },
    { sx: 0, sy: H, dx: 0, dy: -1, nx: 1, ny: 0, len: H },
  ];
  const out: UPt[] = [];
  edges.forEach((e, ei) => {
    // 변 로컬 좌표: x = 변을 따라 진행, y = 안쪽 방향
    const put = (x: number, y: number) => out.push({ x: e.sx + e.dx * x + e.nx * y, y: e.sy + e.dy * x + e.ny * y });
    const usable = e.len - 2 * rc;
    const count = Math.max(3, Math.round(usable / pitchTarget));
    const pitch = usable / count;
    put(rc, 0);
    for (let k = 0; k < count; k++) {
      const cx = rc + (k + 0.5) * pitch;
      // 왼쪽 둥글림 호: 중심 (cx − xo, f), 각도 −90° → −fAng
      const left: [number, number][] = [];
      for (let t = 0; t <= FILLET_STEPS; t++) {
        const a = -Math.PI / 2 + ((-fAng + Math.PI / 2) * t) / FILLET_STEPS;
        left.push([cx - xo + f * Math.cos(a), f + f * Math.sin(a)]);
      }
      left.forEach(([x, y]) => put(x, y));
      // 홈 반원: 각도 (π − fAng) → fAng (안쪽(y>0)을 지나요)
      const a0 = Math.PI - fAng;
      const a1 = fAng;
      for (let t = 0; t <= NOTCH_STEPS; t++) {
        const a = a0 + ((a1 - a0) * t) / NOTCH_STEPS;
        put(cx + r * Math.cos(a), r * Math.sin(a));
      }
      // 오른쪽 둥글림 호 = 왼쪽의 거울상(순서 뒤집기)
      for (let t = left.length - 1; t >= 0; t--) put(2 * cx - left[t][0], left[t][1]);
    }
    put(e.len - rc, 0);
    // 이 변 끝 모서리의 둥근 호 → 다음 변 시작점
    const next = edges[(ei + 1) % 4];
    const cxw = e.sx + e.dx * (e.len - rc) + e.nx * rc;
    const cyw = e.sy + e.dy * (e.len - rc) + e.ny * rc;
    for (let t = 1; t < CORNER_STEPS; t++) {
      const a = (Math.PI / 2) * (t / CORNER_STEPS);
      out.push({
        x: cxw + rc * (-next.dx * Math.cos(a) + e.dx * Math.sin(a)),
        y: cyw + rc * (-next.dy * Math.cos(a) + e.dy * Math.sin(a)),
      });
    }
  });
  return uToPct(out, W, H);
}

// ---- 2. 점/별/하트 무늬 테두리 ----
// 무늬는 "테두리 띠(두께 bandPx) 안쪽"에 통째로 들어가게 배치해요(예전엔 무늬 중심을 박스 맨 가장자리 선
// 위에 놓아서 박스 경계에서 절반이 잘려 반쪽만 보이고, 무늬 색이 띠 색과 같아서 띠 위에서는 보이지도
// 않았어요). 크기·간격·위치 규칙은 전부 "테두리 두께" 기준이에요(화면 px/인쇄 px 어느 쪽이든 같은 비율):
//   · 무늬 지름 d = bandPx × 0.64 → 띠(0 ~ bandPx) 안에서 위아래로 각각 0.18×bandPx 여유가 남아요.
//   · 무늬 중심선 = 박스 가장자리에서 bandPx/2 안쪽(띠의 정중앙) → 무늬는 박스 밖으로 나가지도, 띠 밖으로
//     나가지도 않아요(박스 클리핑에 잘릴 일이 없어요).
//   · 간격(피치) ≈ d × 2.3 — 변마다 정수 개로 딱 맞게 나눠서(변 길이 ÷ 피치를 반올림) 끝에서 어정쩡하게
//     끊기지 않아요. 모서리가 직각이면 네 모서리에 무늬가 정확히 하나씩(두 변이 같이 쓰는 점이라 중복 없음)
//     놓이고, 모서리가 둥글면(원/둥근 사각형) 중심선 전체 길이를 정수 등분해서 놓아요.
//   · 띠 자체는 무늬와 같은 색의 연한(35%) 톤으로 깔려서, 무늬(진한 색)가 항상 띠 위에서 또렷이 보여요.
// 화면(SVG, 박스 px 크기 viewBox)과 인쇄(canvas)가 같은 함수를 px 단위로 불러서 결과가 같아요.
export const BORDER_PATTERN_MARK_RATIO = 0.64;
export const BORDER_PATTERN_PITCH_RATIO = 2.3;
export const BORDER_PATTERN_BAND_ALPHA = 0.35;

// 테두리 무늬 종류 — 점/별/하트(기존) + 대시·물결·지그재그·사선·마름모·작은 꽃(신규). 색깔별로 따로 만들지 않고 "무늬 종류"만 있어요
// (색은 항상 테두리 색상 하나를 따라가요). 전부 아래 borderPatternShapes() 한 함수가 좌표를 만들어서, 화면(SVG)·인쇄(canvas)·
// 패널 썸네일이 똑같이 그려요.
export type BorderPatternKey = "none" | "dot" | "star" | "heart" | "dash" | "wave" | "zigzag" | "diagonal" | "diamond" | "flower";

export const BORDER_PATTERN_OPTIONS: { key: BorderPatternKey; label: string }[] = [
  { key: "none", label: "없음" },
  { key: "dot", label: "점" },
  { key: "star", label: "별" },
  { key: "heart", label: "하트" },
  { key: "dash", label: "대시" },
  { key: "wave", label: "물결" },
  { key: "zigzag", label: "지그재그" },
  { key: "diagonal", label: "사선" },
  { key: "diamond", label: "마름모" },
  { key: "flower", label: "작은 꽃" },
];

// 윤곽선 방향(접선)을 따라 눕는 무늬 — 나머지는 항상 똑바로 서 있어요.
function patternFollowsOutline(p: BorderPatternKey | undefined): boolean {
  return p === "dash" || p === "wave" || p === "zigzag" || p === "diagonal";
}
// 물결·지그재그는 "한 주기짜리 조각"을 빈틈없이 이어 붙여서 끊김 없는 선처럼 보여요(조각 길이 = 간격).
function patternIsTiled(p: BorderPatternKey | undefined): boolean {
  return p === "wave" || p === "zigzag";
}
/** 무늬 간격(피치) ÷ 무늬 지름. 점·별·하트 = 2.3(기존 그대로). 길쭉한 무늬는 그 길이에 맞춰 더 길어요. */
export function borderPatternPitchRatio(p: BorderPatternKey | undefined): number {
  switch (p) {
    case "dash":
      return 1.75;
    case "wave":
      return 2;
    case "zigzag":
      return 1.5;
    case "diagonal":
      return 1.35;
    case "diamond":
      return 1.9;
    case "flower":
      return 2.1;
    default:
      return BORDER_PATTERN_PITCH_RATIO;
  }
}

export type BorderPatternMark = {
  x: number;
  y: number;
  angle?: number; // 윤곽선 진행 방향(라디안, x축 기준) — 눕는 무늬만 써요
  sx?: number; // 조각 길이 보정(실제 간격 ÷ 기본 간격) — 물결·지그재그만 써요
};

export type BorderPatternLayout = {
  size: number; // 무늬 지름(px)
  marks: BorderPatternMark[]; // 무늬 중심(박스 왼쪽 위 기준 px)
};

export function borderPatternLayout(
  w: number,
  h: number,
  bandPx: number,
  radiusPct: number = 0,
  pattern: BorderPatternKey = "dot"
): BorderPatternLayout {
  const size = Math.max(0, bandPx) * BORDER_PATTERN_MARK_RATIO;
  const marks: BorderPatternMark[] = [];
  if (!(w > 0) || !(h > 0) || !(bandPx > 0)) return { size, marks };
  const c = bandPx / 2;
  const pitch = size * borderPatternPitchRatio(pattern);
  const tiled = patternIsTiled(pattern);
  const left = c;
  const top = c;
  const right = w - c;
  const bottom = h - c;
  const pct = Math.min(50, Math.max(0, radiusPct));
  const crx = Math.max(0, (pct / 100) * w - c);
  const cry = Math.max(0, (pct / 100) * h - c);
  if (crx < 0.5 || cry < 0.5) {
    // 직각 모서리: 변마다 정수 칸. 일반 무늬는 시작 모서리 포함·끝 모서리 제외(다음 변의 시작점이라 중복 없음),
    // 물결·지그재그는 조각이 각 변의 중심선 구간을 빈틈없이 채워요(조각 끝이 모서리 점에서 만나 박스 밖으로 안 나가요).
    const nx = Math.max(1, Math.round((right - left) / pitch));
    const ny = Math.max(1, Math.round((bottom - top) / pitch));
    const off = tiled ? 0.5 : 0;
    const sxOf = (len: number, n: number) => len / n / pitch;
    for (let i = 0; i < nx; i++) marks.push({ x: left + ((right - left) * (i + off)) / nx, y: top, angle: 0, sx: sxOf(right - left, nx) });
    for (let i = 0; i < ny; i++) marks.push({ x: right, y: top + ((bottom - top) * (i + off)) / ny, angle: Math.PI / 2, sx: sxOf(bottom - top, ny) });
    for (let i = 0; i < nx; i++) marks.push({ x: right - ((right - left) * (i + off)) / nx, y: bottom, angle: Math.PI, sx: sxOf(right - left, nx) });
    for (let i = 0; i < ny; i++) marks.push({ x: left, y: bottom - ((bottom - top) * (i + off)) / ny, angle: -Math.PI / 2, sx: sxOf(bottom - top, ny) });
    return { size, marks };
  }
  // 둥근 모서리: 중심선(타원 호 + 직선)을 촘촘한 점으로 만들고 전체 길이를 정수 등분
  const poly: { x: number; y: number }[] = [];
  const steps = 64;
  const arc = (cx: number, cy: number, a0: number) => {
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((Math.PI / 2) * k) / steps;
      poly.push({ x: cx + crx * Math.cos(a), y: cy + cry * Math.sin(a) });
    }
  };
  arc(right - crx, top + cry, -Math.PI / 2);
  arc(right - crx, bottom - cry, 0);
  arc(left + crx, bottom - cry, Math.PI / 2);
  arc(left + crx, top + cry, Math.PI);
  return { size, marks: marksAlongClosedPath(poly, pitch, tiled) };
}

// 닫힌 중심선(점 배열)을 따라 전체 길이를 정수 등분해서 무늬 위치와 진행 방향을 정해요.
// tiled 이면 등분한 각 구간의 "한가운데"에 놓고(조각이 구간을 채움), 아니면 구간의 "시작점"에 놓아요.
function marksAlongClosedPath(poly: { x: number; y: number }[], pitch: number, tiled: boolean): BorderPatternMark[] {
  const marks: BorderPatternMark[] = [];
  const cum: number[] = [0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    cum.push(cum[i] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[poly.length];
  const n = Math.max(4, Math.round(total / pitch));
  const sx = total / n / pitch;
  let seg = 0;
  for (let k = 0; k < n; k++) {
    const d = ((k + (tiled ? 0.5 : 0)) / n) * total;
    while (seg < poly.length - 1 && cum[seg + 1] < d) seg++;
    const a = poly[seg];
    const b = poly[(seg + 1) % poly.length];
    const t = (d - cum[seg]) / (cum[seg + 1] - cum[seg] || 1);
    marks.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x), sx });
  }
  return marks;
}

// 별(5각) 모양 — 바깥 꼭짓점 5개 + 안쪽 꼭짓점 5개, 표준 별 모양 공식. -1~1 로컬
// 좌표라 어디서든 원하는 중심/크기로 옮기고 늘릴 수 있어요.
export function starShapePoints(spikes: number = 5, outerR: number = 1, innerR: number = 0.45): UnitPoint[] {
  const pts: UnitPoint[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2; // 맨 위 꼭짓점부터 시작
    pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return pts;
}

// 하트 모양 — 표준 하트 파라메트릭 곡선(x=16sin³t, y=-(13cos t-5cos2t-2cos3t-cos4t))을
// -1~1 범위로 정규화했어요. sampleCount개의 점으로 근사한 폴리곤이라, 화면(SVG
// polygon)·인쇄(canvas lineTo)가 똑같은 점들을 이어서 완전히 같은 모양이 나와요.
export function heartShapePoints(sampleCount: number = 20): UnitPoint[] {
  const raw: UnitPoint[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = (i / sampleCount) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push({ x, y });
  }
  const maxX = Math.max(...raw.map((p) => Math.abs(p.x)));
  const maxY = Math.max(...raw.map((p) => Math.abs(p.y)));
  return raw.map((p) => ({ x: p.x / maxX, y: p.y / maxY }));
}

// 테두리 무늬 하나의 "그림"(반지름 r=1 기준 로컬 좌표, x = 윤곽선을 따라가는 방향, y = 띠를 가로지르는 방향)이에요.
// 점은 원이라 따로(null), 나머지는 전부 채워진 다각형 목록이에요 — 화면 SVG <polygon>·인쇄 canvas fill·썸네일이 같은 점을 써요.
function circlePoly(cx: number, cy: number, r: number, n: number = 20): UnitPoint[] {
  const out: UnitPoint[] = [];
  for (let i = 0; i < n; i++) out.push({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) });
  return out;
}

function waveBand(period: number, amp: number, thick: number, tri: boolean): UnitPoint[] {
  // 한 주기(−period/2 ~ +period/2): 중심선 y(x)를 위/아래로 thick/2 만큼 벌려 만든 띠. 양 끝에서 y=0 이라 이어 붙이면 끊김 없어요.
  const N = tri ? 4 : 24;
  const center = (x: number) => {
    const u = (x + period / 2) / period; // 0~1
    return tri ? amp * (u < 0.25 ? u * 4 : u < 0.75 ? 2 - u * 4 : u * 4 - 4) : amp * Math.sin(u * Math.PI * 2);
  };
  const xs: number[] = [];
  for (let i = 0; i <= N; i++) xs.push(-period / 2 + (period * i) / N);
  const upper = xs.map((x) => ({ x, y: center(x) - thick / 2 }));
  const lower = xs.map((x) => ({ x, y: center(x) + thick / 2 })).reverse();
  return [...upper, ...lower];
}

export function borderPatternUnitPolygons(pattern: BorderPatternKey | undefined): UnitPoint[][] | null {
  switch (pattern) {
    case "star":
      return [starShapePoints()];
    case "heart":
      return [heartShapePoints()];
    case "dash": {
      // 둥근 알약(길이 2.4, 두께 0.7)
      const L = 1.2;
      const t = 0.35;
      const pts: UnitPoint[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 8;
        pts.push({ x: L - t + t * Math.cos(a), y: t * Math.sin(a) });
      }
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI / 2 + (Math.PI * i) / 8;
        pts.push({ x: -L + t + t * Math.cos(a), y: t * Math.sin(a) });
      }
      return [pts];
    }
    case "wave":
      return [waveBand(4, 0.5, 0.5, false)];
    case "zigzag":
      return [waveBand(3, 0.55, 0.45, true)];
    case "diagonal":
      return [
        [
          { x: -1.08, y: 0.8 },
          { x: -0.52, y: 0.8 },
          { x: 1.08, y: -0.8 },
          { x: 0.52, y: -0.8 },
        ],
      ];
    case "diamond":
      return [
        [
          { x: 0, y: -1 },
          { x: 0.8, y: 0 },
          { x: 0, y: 1 },
          { x: -0.8, y: 0 },
        ],
      ];
    case "flower": {
      const petals: UnitPoint[][] = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        petals.push(circlePoly(0.62 * Math.cos(a), 0.62 * Math.sin(a), 0.38, 16));
      }
      petals.push(circlePoly(0, 0, 0.17, 12));
      return petals;
    }
    default:
      return null; // none / dot — 원으로 그려요
  }
}

export type BorderPatternShape = { circle: { cx: number; cy: number; r: number } } | { poly: { x: number; y: number }[] };

/** 무늬 배치(layout)를 그릴 도형 목록(px, 박스 왼쪽 위 기준)으로 바꿔요 — 화면·인쇄·썸네일이 공용. */
export function borderPatternShapes(pattern: BorderPatternKey | undefined, layout: BorderPatternLayout): BorderPatternShape[] {
  if (!pattern || pattern === "none") return [];
  const r = layout.size / 2;
  const unit = borderPatternUnitPolygons(pattern);
  const out: BorderPatternShape[] = [];
  const follows = patternFollowsOutline(pattern);
  const tiled = patternIsTiled(pattern);
  for (const m of layout.marks) {
    if (!unit) {
      out.push({ circle: { cx: m.x, cy: m.y, r } });
      continue;
    }
    const ang = follows ? (m.angle ?? 0) : 0;
    const co = Math.cos(ang);
    const si = Math.sin(ang);
    const sx = tiled ? (m.sx ?? 1) : 1;
    for (const poly of unit) {
      out.push({
        poly: poly.map((p) => {
          const lx = p.x * sx * r;
          const ly = p.y * r;
          return { x: m.x + lx * co - ly * si, y: m.y + lx * si + ly * co };
        }),
      });
    }
  }
  return out;
}

// ---- 3. 프레임 모양(frameShape) 확장 — "아기자기한 프레임" 모음 ----
// 2026-11(18번째 라운드 20차), 혜민님이 다른 앱의 "프레임 모양" 갤러리 스크린샷
// 3장을 보내고 "이미지 보내주신 거 최대한 비슷하게 전부" 만들어달라고 요청했어요.
// 지난 19차에서 지웠던 "사진 자르는 모양" 클리핑 메뉴를 다시 만드는 거지만, 이번엔
// 그때 버그였던 frameTargetBox 오타겟 문제가 이미 고쳐졌으니(2351688) 다시 넣어도
// 안전해요. 아래 모양들은 전부 "중심이 (0,0), 반지름 1인 원" 기준 극좌표
// (r(θ)=기본반지름 + 물결들)로 만들었어요 — r이 항상 θ 하나당 값 하나뿐인 "극좌표
// 그래프"라서, 물결을 아무리 더해도(진폭 합이 기본반지름보다 작으면) 선이 스스로
// 겹치거나 꼬이는 일이 수학적으로 불가능해요(원점에서 본 거리가 매 각도마다 하나로
// 정해져 있어서, 같은 θ에서 두 개의 r이 나올 수 없고 r>0이면 곡선이 항상 "하나의
// 고리"로 안 끊기고 이어짐 — 각진 사각형 변에 반원을 파넣던 scallopedRectPoints()
// 와는 다른, 원형 전용 방식이에요). unitToPct()로 0~100%(박스 기준) 좌표로 바꿔서
// 반환하니, scallopedRectPoints()·hexagonPoints()와 완전히 같은 방식으로 화면
// clip-path·인쇄 canvas 경로 양쪽에서 그대로 써요.

function unitToPct(u: UnitPoint): PerimeterPoint {
  return { xPct: 50 + u.x * 50, yPct: 50 + u.y * 50 };
}

// 중심(cx,cy), 각도별 반지름 함수 radiusAt(θ)로 한 바퀴(0~2π)를 segments개 점으로
// 근사한 폐곡선을 0~100% 좌표로 반환해요. θ=0이 오른쪽(3시 방향), θ 증가가 시계
// 방향이에요(화면/인쇄 좌표계는 y가 아래로 증가하므로 sinθ가 양수면 "아래쪽").
function polarLoopPoints(
  cx: number,
  cy: number,
  radiusAt: (theta: number) => number,
  segments: number
): PerimeterPoint[] {
  const pts: PerimeterPoint[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const r = radiusAt(theta);
    pts.push(unitToPct({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) }));
  }
  return pts;
}

// 육각형 — 예전(1062899) HEXAGON_CLIP_PATH와 완전히 같은 6개 꼭짓점(좌우는 평평한
// 수직면, 위아래는 뾰족한 모양)을 이 공용 파일로 옮겨왔어요. 삭제됐던 걸 복원하는
// 거라 화면·인쇄 양쪽의 기존 "육각형" 모양이 그대로예요(값 하나도 안 바뀜).
export function hexagonPoints(): PerimeterPoint[] {
  return [
    { xPct: 25, yPct: 0 },
    { xPct: 75, yPct: 0 },
    { xPct: 100, yPct: 50 },
    { xPct: 75, yPct: 100 },
    { xPct: 25, yPct: 100 },
    { xPct: 0, yPct: 50 },
  ];
}

// "쿠키/동전 테두리" 느낌의 스캘럽 원 — 작고 균일한 톱니 18개가 원 둘레를 따라 촘촘히
// 나 있어요. 레퍼런스 이미지의 동그란 쿠키 모양 프레임과, 아래 badgeRibbonPoints()의
// 뱃지 몸통에도 같은 느낌을 써요.
export function scallopedCirclePoints(): PerimeterPoint[] {
  const BUMPS = 18;
  const AMP = 0.07;
  const BASE = 0.9;
  return polarLoopPoints(0, 0, (t) => BASE + AMP * Math.cos(BUMPS * t), BUMPS * 24);
}

// "꽃잎" 느낌의 스캘럽 타원 — 톱니 개수를 11개로 줄이고 진폭을 훨씬 크게 키워서,
// 작은 톱니가 아니라 둥글넓적한 꽃잎 10~12장처럼 보이게 했어요(레퍼런스의 핑크
// 꽃모양 프레임). 화면/인쇄에서 실제로는 이 외곽선 → 살짝 작은 두 번째 원(테두리
// 색상 링, 기존 borderWidthPx/borderColor로 이미 되는 기능) → 사진(더 작은 원,
// borderRadiusPct=50) 3겹을 합쳐서 써야 레퍼런스와 같은 "꽃+링+사진" 느낌이 나요 —
// 이 함수는 그중 가장 바깥 꽃잎 윤곽선만 담당해요.
export function scallopedOvalPetalPoints(): PerimeterPoint[] {
  const PETALS = 11;
  const AMP = 0.17;
  const BASE = 0.8;
  return polarLoopPoints(0, 0, (t) => BASE + AMP * Math.cos(PETALS * t), PETALS * 28);
}

// "낙서/루프 스크리블" 느낌의 불규칙 스캘럽 — 서로 배수가 아닌 두 물결(5개의 큰
// 굴곡 + 13개의 작은 톱니, 위상도 서로 다르게)을 더해서 손으로 그린 듯 울퉁불퉁한
// 고리를 만들어요. 진짜 랜덤은 아니지만(같은 입력엔 항상 같은 모양 — 화면/인쇄가
// 늘 똑같이 나와야 하니 의도적으로 결정론적이에요), 균일한 scallopedCirclePoints()
// 보다 훨씬 "손그림" 느낌이 나요.
export function organicScallopedBlobPoints(): PerimeterPoint[] {
  const BASE = 0.85;
  return polarLoopPoints(
    0,
    0,
    (t) => BASE + 0.09 * Math.cos(5 * t + 0.6) + 0.045 * Math.cos(13 * t),
    360
  );
}

// 구름 — "가운데에 가장 큰 둥근 봉우리 하나, 좌우로 갈수록 작아지는 봉우리들, 아래는 부드럽게 이어지는 곡선"인
// 구름 실루엣이에요. 예전 구름은 "윗면에만 봉우리가 달린 사각형"이라 곧은 옆면과 각진 아래 모서리가 남았어요.
// 지금은 박스 안에 꽉 차는 "둥근 몸통"(약간 각진 타원) 둘레를 따라 동그란 봉우리를 줄지어 놓고, 몸통과
// 봉우리들의 합집합 바깥 윤곽을 그대로 써요 — 곧은 변·직각 모서리가 구조적으로 생길 수 없어요.
// 가로세로 비율(aspect)에 맞춰 봉우리 "배치"를 새로 계산해요(그림을 늘리는 게 아니라 봉우리 개수·위치를 다시 정해요):
//   · 크기 기준은 짧은 변 u=1 — 봉우리 반지름은 u의 0.2배가 기본이라 박스가 길어지면 같은 크기의 봉우리가 "더 많이" 놓여요.
//     가로로 긴 박스는 윗면에 봉우리가 여러 개, 세로로 긴 박스는 좌우 옆면을 따라 봉우리가 위아래로 쌓여요.
//   · 봉우리 반지름은 맨 위 가운데에서 가장 크고(×1.3) 좌우·아래로 갈수록 작아져요(×0.72).
//   · 봉우리는 몸통 둘레의 위쪽·옆쪽 약 280°에만 놓고, 아래쪽 약 80°는 몸통의 매끈한 곡선 그대로라 바닥이
//     완만하게 이어져요(예전처럼 평평하지도, 물결치지도 않아요).
//   · 바깥 윤곽은 중심에서 쏜 광선이 합집합을 빠져나가는 지점을 각도마다 하나씩 구해 이어요(꼬이지 않아요).
// 화면(clip-path)·인쇄(canvas)·목록 썸네일이 모두 이 함수(framePerimeterPoints → finishOutline)를 써요.
const cloudCache = new Map<string, PerimeterPoint[]>();

export function cloudPoints(aspect: number = 1): PerimeterPoint[] {
  const key = (Math.round((aspect || 1) * 1000) / 1000).toString();
  const hit = cloudCache.get(key);
  if (hit) return hit.map((p) => ({ ...p }));
  const { W, H } = aspectDims(aspect);
  const rho0 = 0.19 * Math.pow(Math.max(W, H), 0.3);
  const rhoTop = rho0 * 1.45;
  const rhoSide = rho0 * 0.62;
  // 몸통: 가운데 (cx, cy), 반축 (ax, ay), 약간 각진 타원(지수 P)
  const P = 2.8;
  const cx = W / 2;
  const ax = W / 2 - rhoSide * 0.95;
  const yTop = rhoTop;
  const ay = (H - yTop) / 2;
  const cy = yTop + ay;
  const pe = (t: number): UPt => {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return { x: cx + ax * Math.sign(c) * Math.pow(Math.abs(c), 2 / P), y: cy + ay * Math.sign(s) * Math.pow(Math.abs(s), 2 / P) };
  };
  // 봉우리를 놓을 몸통 둘레 구간: 맨 위(-90°)를 가운데로 좌우 140°씩(= 바닥 80° 제외)
  const A = ((122 + 22 * Math.min(1, Math.max(0, (H - 1) / 1.5))) * Math.PI) / 180; // 세로로 길수록 아래쪽 옆면까지 봉우리를 놓아요
  const t0 = -Math.PI / 2 - A;
  const SEG = 400;
  const path: UPt[] = [];
  const cum: number[] = [0];
  for (let i = 0; i <= SEG; i++) {
    path.push(pe(t0 + (2 * A * i) / SEG));
    if (i) cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  const Ltot = cum[SEG];
  const prof = (d: number, lower: boolean) => (0.62 + 0.85 * Math.exp(-((d / 0.8) ** 2))) * (lower ? 0.95 : 1); // 맨 위 가운데에서 d(u)만큼 떨어진 봉우리 크기 계수
  let n = Math.max(5, Math.round(Ltot / (rho0 * 1.5)));
  if (n % 2 === 0) n += 1; // 홀수 — 맨 위 가운데에 봉우리가 정확히 하나
  const lobes: { x: number; y: number; r: number }[] = [];
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const q = (i + 0.5) / n;
    const d = q * Ltot;
    while (seg < SEG - 1 && cum[seg + 1] < d) seg++;
    const tt = (d - cum[seg]) / (cum[seg + 1] - cum[seg] || 1);
    const x = path[seg].x + (path[seg + 1].x - path[seg].x) * tt;
    const y = path[seg].y + (path[seg + 1].y - path[seg].y) * tt;
    lobes.push({ x, y, r: rho0 * prof(Math.abs(d - Ltot / 2), y > cy + ay * 0.2) * (1 + 0.12 * Math.sin(2.3 * i + 0.8)) });
  }
  // 장(field) 값 < 0 이면 구름 안쪽: 봉우리 원들의 (거리 − 반지름)과 몸통(각진 타원)의 최솟값(= 합집합)
  const field = (x: number, y: number): number => {
    let v = Infinity;
    for (const l of lobes) v = Math.min(v, Math.hypot(x - l.x, y - l.y) - l.r);
    const g = Math.pow(Math.pow(Math.abs(x - cx) / ax, P) + Math.pow(Math.abs(y - cy) / ay, P), 1 / P);
    return Math.min(v, (g - 1) * Math.min(ax, ay));
  };
  const loop = contourLoop(field, W, H, 0.006);
  // 박스에 꽉 맞게(가로·세로 각각) 늘려서 박스 크기·사진 자르기 범위를 그대로 지켜요
  const xs = loop.map((p) => p.x);
  const ys = loop.map((p) => p.y);
  const mnx = Math.min(...xs);
  const mxx = Math.max(...xs);
  const mny = Math.min(...ys);
  const mxy = Math.max(...ys);
  const mm = 0.006;
  const fitted = loop.map((p) => ({ x: mm + ((p.x - mnx) / (mxx - mnx || 1)) * (W - 2 * mm), y: mm + ((p.y - mny) / (mxy - mny || 1)) * (H - 2 * mm) }));
  const res = uToPct(fitted, W, H);
  cloudCache.set(key, res.map((p) => ({ ...p })));
  return res;
}

// 스칼라 장 f(x,y)(<0 이 안쪽)의 0 등고선 중 가장 긴 닫힌 곡선을 격자(step) 마칭 스퀘어로 찾아서 점 배열로 돌려줘요.
// 구름처럼 "원 여러 개의 합집합"은 중심에서 쏜 광선으로는 오목한 곳에서 꼬일 수 있어서, 격자에서 윤곽을 직접 따라가요.
function contourLoop(f: (x: number, y: number) => number, W: number, H: number, step: number): UPt[] {
  const pad = 0.6;
  const x0 = -pad;
  const y0 = -pad;
  const nx = Math.ceil((W + 2 * pad) / step);
  const ny = Math.ceil((H + 2 * pad) / step);
  const val = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * (nx + 1) + i] = f(x0 + i * step, y0 + j * step);
  const V = (i: number, j: number) => val[j * (nx + 1) + i];
  // 각 격자 변 위의 교점(선형 보간)을 키로 모아 선분을 이어요.
  const edgeKey = (i: number, j: number, horiz: boolean) => (j * (nx + 1) + i) * 2 + (horiz ? 0 : 1);
  const edgePt = (i: number, j: number, horiz: boolean): UPt => {
    const a = V(i, j);
    const b = horiz ? V(i + 1, j) : V(i, j + 1);
    const t = a / (a - b || 1e-9);
    return horiz ? { x: x0 + (i + t) * step, y: y0 + j * step } : { x: x0 + i * step, y: y0 + (j + t) * step };
  };
  const adj = new Map<number, number[]>();
  const pts = new Map<number, UPt>();
  const add = (k1: number, p1: UPt, k2: number, p2: UPt) => {
    pts.set(k1, p1);
    pts.set(k2, p2);
    (adj.get(k1) ?? adj.set(k1, []).get(k1)!).push(k2);
    (adj.get(k2) ?? adj.set(k2, []).get(k2)!).push(k1);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = [V(i, j) < 0, V(i + 1, j) < 0, V(i + 1, j + 1) < 0, V(i, j + 1) < 0];
      const code = (c[0] ? 1 : 0) | (c[1] ? 2 : 0) | (c[2] ? 4 : 0) | (c[3] ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const T = { k: edgeKey(i, j, true), p: () => edgePt(i, j, true) };
      const R = { k: edgeKey(i + 1, j, false), p: () => edgePt(i + 1, j, false) };
      const B = { k: edgeKey(i, j + 1, true), p: () => edgePt(i, j + 1, true) };
      const L = { k: edgeKey(i, j, false), p: () => edgePt(i, j, false) };
      // 선분은 방향 없이 이웃 관계로만 저장하고, 아래에서 이웃을 따라 걸으며 닫힌 곡선을 만들어요
      const seg = (a: typeof T, b: typeof T) => add(a.k, a.p(), b.k, b.p());
      switch (code) {
        case 1: seg(L, T); break;
        case 2: seg(T, R); break;
        case 3: seg(L, R); break;
        case 4: seg(R, B); break;
        case 5: seg(L, B); seg(R, T); break; // 안장점(드묾) — 이어붙이기만 맞으면 돼요
        case 6: seg(T, B); break;
        case 7: seg(L, B); break;
        case 8: seg(B, L); break;
        case 9: seg(B, T); break;
        case 10: seg(T, L); seg(B, R); break;
        case 11: seg(B, R); break;
        case 12: seg(R, L); break;
        case 13: seg(R, T); break;
        case 14: seg(T, L); break;
      }
    }
  }
  let best: UPt[] = [];
  const seen = new Set<number>();
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: UPt[] = [];
    let prev = -1;
    let k = start;
    while (!seen.has(k)) {
      seen.add(k);
      loop.push(pts.get(k)!);
      const nb = adj.get(k)!;
      const nxt = nb.find((q) => q !== prev && !seen.has(q));
      if (nxt === undefined) break;
      prev = k;
      k = nxt;
    }
    if (loop.length > best.length) best = loop;
  }
  return best;
}

// "뱃지(메달)+리본" 모양 — 원(스캘럽 없는 평범한 원, 중심을 위쪽 (0,-0.3)으로 옮겨서
// 아래쪽에 리본 꼬리가 들어갈 자리를 비워뒀어요) 둘레의 아래쪽 60도(각도 60°~120°)
// 구간만 빼고 나머지 300도를 원 그대로 그린 다음, 그 틈 양쪽 끝(원 위의 두 점)에서
// 바로 리본 꼬리 폴리곤 4개 꼭짓점(오른쪽 끝 → 가운데 노치 → 가운데 노치 → 왼쪽
// 끝)으로 이어서 폐곡선 하나를 완성해요 — CSS clip-path: polygon(...)은 "한 개의
// 다각형"만 받을 수 있어서 원+꼬리를 따로 그릴 수 없는데, 이렇게 하나의 연속된
// 외곽선으로 합치면 clip-path 폴리곤 하나로도, canvas Path2D 하나로도 똑같이
// 그릴 수 있어요(복합 경로가 아니라 "오목한 부분이 있는 단순 다각형" 하나). 리본
// 꼬리 가운데가 양쪽 끝보다 위로 올라온 모양(노치)이라 전형적인 "제비꼬리" 리본
// 끝단처럼 보여요.
export function badgeRibbonPoints(): PerimeterPoint[] {
  const cx = 0;
  const cy = -0.3;
  const r = 0.48;
  const thetaStart = (120 * Math.PI) / 180; // 원 위 왼쪽 부착점
  const thetaEnd = thetaStart + (300 * Math.PI) / 180; // 원 위 오른쪽 부착점(420°=60°)
  const arcSegments = 96;
  const arc: UnitPoint[] = [];
  for (let i = 0; i <= arcSegments; i++) {
    const t = thetaStart + ((thetaEnd - thetaStart) * i) / arcSegments;
    arc.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  const tail: UnitPoint[] = [
    { x: 0.4, y: 0.95 }, // 오른쪽 리본 꼬리 바깥쪽 끝
    { x: 0.1, y: 0.72 }, // 가운데 노치(오른쪽)
    { x: -0.1, y: 0.72 }, // 가운데 노치(왼쪽)
    { x: -0.4, y: 0.95 }, // 왼쪽 리본 꼬리 바깥쪽 끝
  ];
  return [...arc, ...tail].map(unitToPct);
}

// ---- 4. 사진 자르는 모양 추가 4종 — 하트 / 아치 / 곰돌이 머리 / 고양이 머리 ----
// 2026-11, 혜민님이 스위트북 "사진틀 모양 변경" 화면을 참고로 보내서, 사진 자체를
// 실루엣으로 자르는 모양을 더 늘렸어요. 그림 파일을 가져온 게 아니라 아래 좌표 공식으로
// 직접 만든 키픽 고유 모양이에요. 기존 모양들과 똑같이 0~100%(박스 기준) 좌표 배열을
// 돌려줘서 화면(CSS clip-path)과 인쇄(canvas 경로)가 같은 함수를 공유해요.
// 비율 규칙(공통): 박스 가로/세로에 맞춰 늘어나요(기존 모양들과 같은 방식) — 단 "아치"는
// 아래 설명대로 윗부분 반원이 찌그러지지 않게 박스 가로세로 비율(aspect)을 받아요.

// -1~1이 아닌 임의 좌표 점들을 박스 안(여백 marginPct%)에 꽉 차게 맞춰서 0~100%로 바꿔요.
function fitPointsToBox(points: UnitPoint[], marginPct: number = 1.5): PerimeterPoint[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = 100 - marginPct * 2;
  return points.map((p) => ({
    xPct: marginPct + ((p.x - minX) / (maxX - minX || 1)) * span,
    yPct: marginPct + ((p.y - minY) / (maxY - minY || 1)) * span,
  }));
}

// 하트 — 위쪽 두 봉우리 + 아래쪽 뾰족한 끝. 점/별/하트 테두리 무늬에 쓰는
// heartShapePoints()와 같은 곡선 공식이고, 사진을 자르는 용도라 점 개수를 72개로
// 늘려 곡선이 매끈하게 보이게 했어요.
export function heartClipPoints(): PerimeterPoint[] {
  return fitPointsToBox(heartShapePoints(200), 1.5);
}

// 아치 — 윗부분은 둥근 아치, 옆면은 수직, 바닥은 평평한(창문/문 모양) 모양이에요. 두 가지를 따로 조절해요:
//   · 상단 아치 라운드 archTopPct(10~100, 기본 100): 아치 "높이"를 반원 높이의 몇 %로 할지예요.
//     100 = 예전 아치와 똑같은 깊은 반원(박스가 아주 납작하면 반타원), 10 = 아주 낮고 완만한 아치.
//     반원 높이 = min(가로, 세로)/2 (u 단위, 박스 가로세로 비율 aspect로 계산 — 박스가 가로로 길든
//     세로로 길든 반원이 찌그러지지 않아요). 아치는 항상 박스 맨 위(y=0)에서 시작해서 박스 크기는 안 변해요.
//   · 아래 모서리 둥글기 archBottomRadiusPct(0~50, 기본 0): 바닥 두 모서리의 둥글기를 박스 짧은 변의
//     %로 정해요(원형 호라 가로세로가 달라도 둥글어요). 위 아치와는 완전히 별개의 값이에요.
// 두 값 모두 안 주면(기존 저장본 전부) 예전 아치와 점 하나까지 똑같이 나와요.
export type FrameShapeParams = {
  archTopPct?: number;
  archBottomRadiusPct?: number;
};

export const ARCH_TOP_PCT_RANGE = { min: 10, max: 100, default: 100 } as const;
export const ARCH_BOTTOM_RADIUS_PCT_RANGE = { min: 0, max: 50, default: 0 } as const;

export function archPoints(aspect: number = 1, params?: FrameShapeParams): PerimeterPoint[] {
  const { W, H } = aspectDims(aspect);
  const topPct = Math.min(
    ARCH_TOP_PCT_RANGE.max,
    Math.max(ARCH_TOP_PCT_RANGE.min, params?.archTopPct ?? ARCH_TOP_PCT_RANGE.default)
  );
  const bottomPct = Math.min(
    ARCH_BOTTOM_RADIUS_PCT_RANGE.max,
    Math.max(ARCH_BOTTOM_RADIUS_PCT_RANGE.min, params?.archBottomRadiusPct ?? ARCH_BOTTOM_RADIUS_PCT_RANGE.default)
  );
  const fullH = Math.min(H / 2, W / 2);
  const ry = Math.max(0.05 * H, (fullH * topPct) / 100); // 아치 높이(u)
  const rx = W / 2;
  const rb = Math.min((bottomPct / 100) * Math.min(W, H), W / 2, Math.max(0, H - ry));
  const pts: UPt[] = [];
  const segs = 120;
  // 왼쪽 아래 → (왼쪽 아래 모서리 호) → 왼쪽 위(아치 시작) → 아치 → 오른쪽 위 → (오른쪽 아래 모서리 호) (시계방향)
  if (rb > 1e-6) {
    const cs = 16;
    for (let i = 0; i <= cs; i++) {
      const a = Math.PI / 2 + (Math.PI / 2) * (i / cs); // 90° → 180°: 바닥 → 왼쪽 옆면
      pts.push({ x: rb + rb * Math.cos(a), y: H - rb + rb * Math.sin(a) });
    }
  } else {
    pts.push({ x: 0, y: H });
  }
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI + (Math.PI * i) / segs; // π → 2π
    pts.push({ x: rx + rx * Math.cos(a), y: ry + ry * Math.sin(a) });
  }
  if (rb > 1e-6) {
    const cs = 16;
    for (let i = 0; i <= cs; i++) {
      const a = (Math.PI / 2) * (i / cs); // 0° → 90°: 오른쪽 옆면 → 바닥
      pts.push({ x: W - rb + rb * Math.cos(a), y: H - rb + rb * Math.sin(a) });
    }
  } else {
    pts.push({ x: W, y: H });
  }
  return uToPct(pts, W, H);
}

// 원 여러 개를 합친 실루엣의 바깥 윤곽선 — 기준점(origin)에서 각도 θ로 쏜 광선이
// 원들을 빠져나가는 가장 먼 거리를 각도마다 하나씩 구해서 이어요(별 모양/극좌표 방식이라
// 선이 꼬이지 않아요). 원들이 서로 겹쳐 있고 기준점이 그 안에 있을 때만 정확해요.
function unionOfCirclesOutline(
  circles: { cx: number; cy: number; r: number }[],
  origin: UnitPoint,
  segments: number
): UnitPoint[] {
  const out: UnitPoint[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    let best = 0;
    for (const c of circles) {
      const fx = origin.x - c.cx;
      const fy = origin.y - c.cy;
      const b = fx * dx + fy * dy;
      const disc = b * b - (fx * fx + fy * fy - c.r * c.r);
      if (disc < 0) continue;
      const far = -b + Math.sqrt(disc);
      if (far > best) best = far;
    }
    out.push({ x: origin.x + best * dx, y: origin.y + best * dy });
  }
  return out;
}

// 곰돌이 머리 — 큰 동그란 얼굴 + 위쪽 양옆의 동그란 귀 두 개를 합친 실루엣이에요.
export function bearHeadPoints(): PerimeterPoint[] {
  const pts = unionOfCirclesOutline(
    [
      { cx: 0, cy: 0.12, r: 0.78 }, // 얼굴
      { cx: -0.62, cy: -0.58, r: 0.33 }, // 왼쪽 귀
      { cx: 0.62, cy: -0.58, r: 0.33 }, // 오른쪽 귀
    ],
    { x: 0, y: 0.12 },
    360
  );
  return fitPointsToBox(pts, 1.5);
}

// 고양이 머리 — 약간 납작한 타원 얼굴 + 위쪽의 뾰족한 삼각형 귀 두 개를 한 줄의 외곽선으로
// 이었어요(왼쪽 귀 끝 → 귀 안쪽 뿌리 → 머리 윗선 → 오른쪽 귀 → 오른쪽 아래 둥근 턱 →
// 왼쪽 귀 바깥 뿌리). 귀 뿌리 위치는 타원의 각도(도)로 정해서 얼굴선과 매끈하게 이어져요.
export function catHeadPoints(): PerimeterPoint[] {
  const cx = 0;
  const cy = 0.14;
  const rx = 0.9;
  const ry = 0.76;
  const ell = (deg: number): UnitPoint => ({
    x: cx + rx * Math.cos((deg * Math.PI) / 180),
    y: cy + ry * Math.sin((deg * Math.PI) / 180),
  });
  const pts: UnitPoint[] = [];
  const arc = (fromDeg: number, toDeg: number, steps: number) => {
    for (let i = 0; i <= steps; i++) pts.push(ell(fromDeg + ((toDeg - fromDeg) * i) / steps));
  };
  pts.push({ x: -0.74, y: -0.95 }); // 왼쪽 귀 끝
  arc(-112, -68, 28); // 왼쪽 귀 안쪽 뿌리 → 머리 윗선 → 오른쪽 귀 안쪽 뿌리
  pts.push({ x: 0.74, y: -0.95 }); // 오른쪽 귀 끝
  arc(-24, 204, 120); // 오른쪽 귀 바깥 뿌리 → 턱(아래) → 왼쪽 귀 바깥 뿌리
  return fitPointsToBox(pts, 1.5);
}

// ImageBoxDef.frameShape가 가질 수 있는 값이에요 — lib/albumTemplates.ts가 이 타입을
// 그대로 가져다 써서(아래), "프레임 모양" 값의 종류를 이 파일 한 곳에서만 관리해요.
export type FrameShapeKey =
  | "rect"
  | "hexagon"
  | "scalloped"
  | "scallopedCircle"
  | "flowerPetal"
  | "organicScallop"
  | "cloud"
  | "badge"
  | "heart"
  | "arch"
  | "bear"
  | "cat";

// frameShape 값 하나를 받아서, 그 모양의 외곽선 점 배열을 돌려줘요. "rect"(기본값)나
// 모르는 값이면 null — null이면 화면/인쇄 양쪽 다 "클리핑 없음, borderRadiusPct로
// 모서리만 둥글게"라는 뜻으로 써요. 화면(app/upload/page.tsx)과 인쇄
// (lib/printCompose.ts)가 이 함수 하나만 호출하면 되니, 새 모양을 추가해도 분기
// 코드를 두 파일에 각각 안 적어도 돼요(이 switch 하나만 고치면 양쪽에 다 반영).
// aspect(박스 가로px ÷ 세로px)는 "arch"의 반원 비율, "scalloped"(톱니)의 가로·세로 홈 개수, 그리고 모든 모양의 모서리 둥글리기
// 크기를 박스 짧은 변 기준으로 맞추는 데 써요(안 주면 정사각형으로 계산). params는 모양별 추가 설정이에요(지금은 아치의
// 상단 아치 라운드/아래 모서리 둥글기 — 안 주면 기본 모양). 화면·인쇄·썸네일이 같은 인자로 이 함수를 불러요.
export function framePerimeterPoints(
  shape: FrameShapeKey | undefined,
  aspect?: number,
  params?: FrameShapeParams
): PerimeterPoint[] | null {
  // 거친 외곽선 → finishOutline(같은 간격으로 다시 찍기 + 모서리 둥글리기 + 점 덜어내기)로 다듬어요.
  // smoothU = 둥글리는 정도(짧은 변 u 대비). 매끈한 곡선 모양(쿠키·꽃잎·낙서·구름)은 아주 작게(0.012),
  // 모서리가 있는 모양(육각형·아치·하트·뱃지·곰돌이·고양이)은 눈에 띄게 둥글게(0.03~0.05) 해요.
  // 톱니(우표)는 처음부터 둥근 호로 만들어서 다듬기를 거치지 않아요.
  switch (shape) {
    case "hexagon":
      return finishOutline(hexagonPoints(), aspect, 0.05, true);
    case "scalloped":
      return scallopedRectPoints(aspect);
    case "scallopedCircle":
      return finishOutline(scallopedCirclePoints(), aspect, 0.012, false);
    case "flowerPetal":
      return finishOutline(scallopedOvalPetalPoints(), aspect, 0.012, false);
    case "organicScallop":
      return finishOutline(organicScallopedBlobPoints(), aspect, 0.012, false);
    case "cloud":
      return finishOutline(cloudPoints(aspect), aspect, 0.025, true);
    case "badge":
      return finishOutline(badgeRibbonPoints(), aspect, 0.045, true);
    case "heart":
      return finishOutline(heartClipPoints(), aspect, 0.085, true);
    case "arch":
      return finishOutline(archPoints(aspect, params), aspect, 0.04, true);
    case "bear":
      return finishOutline(bearHeadPoints(), aspect, 0.03, true);
    case "cat":
      return finishOutline(catHeadPoints(), aspect, 0.05, true);
    default:
      return null;
  }
}

// ---- 3. 모양을 따라가는 테두리(띠 + 무늬) ----
// 테두리는 "사진을 자르는 바로 그 외곽선"에서 안쪽으로 두께만큼 들어간 띠예요. 모양(framePerimeterPoints) 하나에서
// 사진 마스크·띠·무늬가 모두 나오도록, 화면(SVG)과 인쇄(canvas) 둘 다 아래 함수들만 써요:
//   · frameOutlinePathD  — 외곽선 경로(SVG d). 띠는 이 경로를 (2×두께) 굵기로 긋고 같은 외곽선으로 잘라서
//     안쪽 두께만큼만 보이게 하므로 오목한 곳(구름·톱니 홈)에서 안쪽 선이 꼬이지 않아요.
//   · frameBorderMarks   — 무늬 중심. 사각형(둥근 모서리 포함)은 borderPatternLayout, 그 외 모양은 외곽선을
//     두께/2만큼 안쪽으로 민 선(안쪽 거리 < 두께/2 인 점은 버려 꼬임 방지) 위에 길이를 정수 등분해서 놓아요.
// 두께 단위: 저장값 borderWidthPx 는 96dpi CSS px → mm = px×25.4/96 (인쇄가 원래 쓰던 환산과 동일).
export function borderWidthMm(borderWidthPx: number): number {
  return (borderWidthPx * 25.4) / 96;
}

export function frameOutlinePathD(
  shape: FrameShapeKey | undefined,
  w: number,
  h: number,
  radiusPct: number = 0,
  params?: FrameShapeParams
): string {
  const f = (n: number) => +n.toFixed(3);
  const pts = framePerimeterPoints(shape, w / (h || 1), params);
  if (pts) {
    return pts.map((p, i) => `${i ? "L" : "M"}${f((p.xPct / 100) * w)} ${f((p.yPct / 100) * h)}`).join("") + "Z";
  }
  const pct = Math.max(0, Math.min(50, radiusPct));
  const rx = (pct / 100) * w;
  const ry = (pct / 100) * h;
  if (!rx || !ry) return `M0 0H${f(w)}V${f(h)}H0Z`;
  return (
    `M${f(rx)} 0H${f(w - rx)}A${f(rx)} ${f(ry)} 0 0 1 ${f(w)} ${f(ry)}V${f(h - ry)}` +
    `A${f(rx)} ${f(ry)} 0 0 1 ${f(w - rx)} ${f(h)}H${f(rx)}A${f(rx)} ${f(ry)} 0 0 1 0 ${f(h - ry)}` +
    `V${f(ry)}A${f(rx)} ${f(ry)} 0 0 1 ${f(rx)} 0Z`
  );
}

const MARK_POLY_MAX = 600;

export function frameBorderMarks(
  shape: FrameShapeKey | undefined,
  w: number,
  h: number,
  bandPx: number,
  radiusPct: number = 0,
  params?: FrameShapeParams,
  pattern: BorderPatternKey = "dot"
): BorderPatternLayout {
  const pts = framePerimeterPoints(shape, w / (h || 1), params);
  if (!pts) return borderPatternLayout(w, h, bandPx, radiusPct, pattern);
  const size = Math.max(0, bandPx) * BORDER_PATTERN_MARK_RATIO;
  const marks: BorderPatternMark[] = [];
  if (!(w > 0) || !(h > 0) || !(bandPx > 0) || pts.length < 3) return { size, marks };
  const step = Math.max(1, Math.ceil(pts.length / MARK_POLY_MAX));
  const P: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i += step) P.push({ x: (pts[i].xPct / 100) * w, y: (pts[i].yPct / 100) * h });
  const n = P.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = P[i];
    const b = P[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  const sgn = area >= 0 ? 1 : -1; // 화면 좌표(y 아래)에서 area>0 이면 시계방향 → 안쪽 = 진행 방향의 오른쪽
  const c = bandPx / 2;
  const unit = (dx: number, dy: number) => {
    const l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  };
  const off: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n];
    const b = P[i];
    const d = P[(i + 1) % n];
    const t0 = unit(b.x - a.x, b.y - a.y);
    const t1 = unit(d.x - b.x, d.y - b.y);
    // 진행 방향의 오른쪽 법선(시계방향 도형이면 안쪽)
    let nx = -t0.y * sgn - t1.y * sgn;
    let ny = t0.x * sgn + t1.x * sgn;
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const cosHalf = Math.max(0.5, nx * (-t0.y * sgn) + ny * (t0.x * sgn));
    const k = c / cosHalf;
    off.push({ x: b.x + nx * k, y: b.y + ny * k });
  }
  const dist2Seg = (px: number, py: number, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
    const qx = a.x + dx * t - px;
    const qy = a.y + dy * t - py;
    return qx * qx + qy * qy;
  };
  const lim = (c * 0.92) ** 2;
  const chain: { x: number; y: number }[] = [];
  for (const q of off) {
    let ok = true;
    for (let j = 0; j < n && ok; j++) if (dist2Seg(q.x, q.y, P[j], P[(j + 1) % n]) < lim) ok = false;
    if (ok) chain.push(q);
  }
  if (chain.length < 3) return { size, marks };
  return { size, marks: marksAlongClosedPath(chain, size * borderPatternPitchRatio(pattern), patternIsTiled(pattern)) };
}
