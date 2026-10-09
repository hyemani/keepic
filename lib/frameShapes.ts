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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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
  const f = 0.3 * r; // 홈 가장자리 둥글림 반지름
  const rc = 1.2 * r; // 박스 모서리 둥글림 반지름
  const pitchTarget = 3.4 * r;
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

// 변(위/아래/좌/우) 하나마다 몇 개의 무늬를 배치하는지 — 점/별/하트 모두 공통.
export const BORDER_PATTERN_COUNT_PER_EDGE = 6;

// 무늬 하나의 크기 — 박스 가로/세로 기준 %(지름). 테두리 두께(borderWidthPx)와는
// 별개로 고정된 비율을 써요 — 화면(SVG viewBox 0~100)과 인쇄(canvas, 박스 실제
// px폭/높이에 이 %를 곱함) 둘 다 "박스 크기 대비 %"라는 같은 기준으로 계산하기
// 때문에 결과 크기가 항상 같아요.
export const BORDER_PATTERN_SHAPE_SIZE_PCT = 3.2;

// 테두리 선의 "중심선"을 따라 무늬 중심점들을 0~100% 좌표로 반환해요(네 변, 각 변의
// 칸 가운데 — 모서리와 겹치지 않도록). frameShape가 기본(사각형)일 때만 쓰는
// 전제예요 — 육각형/톱니처럼 테두리선 자체가 사각형이 아니면 이 좌표가 실제 선
// 위에 있지 않아서 어긋나 보일 수 있어, 이번 라운드에선 사각형 전용으로 한정했어요.
export function borderPatternCenterPoints(perEdge: number = BORDER_PATTERN_COUNT_PER_EDGE): PerimeterPoint[] {
  const pts: PerimeterPoint[] = [];
  const edges: [PerimeterPoint, PerimeterPoint][] = [
    [{ xPct: 0, yPct: 0 }, { xPct: 100, yPct: 0 }],
    [{ xPct: 100, yPct: 0 }, { xPct: 100, yPct: 100 }],
    [{ xPct: 100, yPct: 100 }, { xPct: 0, yPct: 100 }],
    [{ xPct: 0, yPct: 100 }, { xPct: 0, yPct: 0 }],
  ];
  for (const [start, end] of edges) {
    for (let s = 0; s < perEdge; s++) {
      const t = (s + 0.5) / perEdge;
      pts.push({ xPct: lerp(start.xPct, end.xPct, t), yPct: lerp(start.yPct, end.yPct, t) });
    }
  }
  return pts;
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

// "구름" 느낌의 둥근 블롭 — 크고 둥근 굴곡 5개(구름의 뭉친 부분들) + 살짝의 잔물결로
// 너무 기계적으로 똑같지 않게 했어요. 아래쪽을 평평하게 깎지는 않았어요(작업 지시서
// 메모대로 "4~6개 돌기의 둥근 블롭으로 근사" 쪽을 택함 — 평평한 바닥까지 요구하면
// 바닥 쪽 사진이 네모나게 잘려서 오히려 부자연스러워요).
export function cloudBlobPoints(): PerimeterPoint[] {
  const BASE = 0.78;
  return polarLoopPoints(
    0,
    0,
    (t) => BASE + 0.16 * Math.cos(5 * t) + 0.05 * Math.cos(11 * t + 1.3),
    360
  );
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

// 아치 — 아래는 직사각형, 위는 반원(창문/문 모양). 반원이 박스가 가로로 길든 세로로
// 길든 "진짜 반원"으로 보이도록 aspect(박스 가로px ÷ 세로px)를 받아서 반원의 세로
// 반지름을 정해요: 반지름(px)=가로의 절반 → 세로 % = 50 × aspect (박스가 아주 납작해서
// 50%를 넘으면 50%로 제한 — 그땐 반타원). aspect를 안 주면 정사각형(1)으로 계산해요.
export function archPoints(aspect: number = 1): PerimeterPoint[] {
  const ryPct = Math.min(50, Math.max(5, 50 * (aspect > 0 ? aspect : 1)));
  const pts: PerimeterPoint[] = [];
  const segs = 120;
  // 왼쪽 아래 → 왼쪽 위(반원 시작) → 반원 → 오른쪽 위 → 오른쪽 아래 (시계방향)
  pts.push({ xPct: 0, yPct: 100 });
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI + (Math.PI * i) / segs; // π → 2π
    pts.push({ xPct: 50 + 50 * Math.cos(a), yPct: ryPct + ryPct * Math.sin(a) });
  }
  pts.push({ xPct: 100, yPct: 100 });
  return pts;
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
// 크기를 박스 짧은 변 기준으로 맞추는 데 써요(안 주면 정사각형으로 계산).
export function framePerimeterPoints(shape: FrameShapeKey | undefined, aspect?: number): PerimeterPoint[] | null {
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
      return finishOutline(cloudBlobPoints(), aspect, 0.012, false);
    case "badge":
      return finishOutline(badgeRibbonPoints(), aspect, 0.045, true);
    case "heart":
      return finishOutline(heartClipPoints(), aspect, 0.085, true);
    case "arch":
      return finishOutline(archPoints(aspect), aspect, 0.04, true);
    case "bear":
      return finishOutline(bearHeadPoints(), aspect, 0.03, true);
    case "cat":
      return finishOutline(catHeadPoints(), aspect, 0.05, true);
    default:
      return null;
  }
}
