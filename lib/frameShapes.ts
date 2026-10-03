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

// ---- 1. 톱니(우표) 모양 ----

const SCALLOP_COUNT_PER_EDGE = 8; // 변(위/아래/좌/우) 하나마다 톱니가 몇 개씩 들어가는지
const SCALLOP_SEGMENTS_PER_BUMP = 6; // 톱니 하나(반원)를 몇 개의 직선 조각으로 근사하는지 — 많을수록 둥글어 보여요
// 톱니 하나의 깊이 — 그 변을 SCALLOP_COUNT_PER_EDGE칸으로 나눈 한 칸 길이의 절반
// (반원에 가깝게 — 정사각형 박스 기준. 직사각형이면 가로/세로 중 짧은 쪽에서 더
// 둥글고 긴 쪽에서는 타원처럼 눌린 모양이 돼요 — 화면·인쇄 둘 다 같은 식이라
// 어긋나지 않아요).
const SCALLOP_DEPTH_PCT = 100 / SCALLOP_COUNT_PER_EDGE / 2;

function scallopedEdgePoints(
  start: PerimeterPoint,
  end: PerimeterPoint,
  inward: PerimeterPoint,
  count: number,
  depthPct: number,
  segmentsPerBump: number
): PerimeterPoint[] {
  const pts: PerimeterPoint[] = [];
  for (let s = 0; s < count; s++) {
    const segStart: PerimeterPoint = {
      xPct: lerp(start.xPct, end.xPct, s / count),
      yPct: lerp(start.yPct, end.yPct, s / count),
    };
    const segEnd: PerimeterPoint = {
      xPct: lerp(start.xPct, end.xPct, (s + 1) / count),
      yPct: lerp(start.yPct, end.yPct, (s + 1) / count),
    };
    // t=0일 때 segStart, t=1일 때 segEnd에 정확히 닿고 중간(t=0.5)에서 inward 방향으로
    // depthPct만큼 부풀어요(반원 모양) — angle을 π→0으로 줄이면 cos가 -1→1로 늘어나서
    // alongFrac(0→1)이 단조증가하고, sin은 0→1→0이라 깊이가 중간에서 최대가 돼요.
    for (let i = 0; i < segmentsPerBump; i++) {
      const t = i / segmentsPerBump;
      const angle = Math.PI * (1 - t);
      const alongFrac = (Math.cos(angle) + 1) / 2;
      const bulge = depthPct * Math.sin(angle);
      pts.push({
        xPct: lerp(segStart.xPct, segEnd.xPct, alongFrac) + inward.xPct * bulge,
        yPct: lerp(segStart.yPct, segEnd.yPct, alongFrac) + inward.yPct * bulge,
      });
    }
  }
  return pts;
}

// 사진박스를 감싸는 "톱니(우표) 모양" 외곽선을 0~100%(박스 가로/세로 기준) 좌표
// 배열로 반환해요 — 왼쪽위 모서리부터 시계방향(위→오른쪽→아래→왼쪽)으로 한 바퀴.
// 톱니는 박스 "안쪽"으로 파여 들어가는 모양이에요(실제 우표를 뜯었을 때처럼) —
// 바깥으로 튀어나오면 박스 영역 밖(옆 사진/여백)과 겹칠 수 있어서 안쪽으로 팠어요.
// 화면은 이 배열을 CSS clip-path: polygon(...)으로, 인쇄는 canvas lineTo로 그려서
// 정확히 같은 모양이 나와요 — 화면/인쇄 모두 이 함수를 직접 호출해서 같은 숫자를
// 쓰기 때문에, 두 쪽에서 계산식이 어긋날 수가 없어요(코드 자체가 하나).
export function scallopedRectPoints(): PerimeterPoint[] {
  const n = SCALLOP_COUNT_PER_EDGE;
  const d = SCALLOP_DEPTH_PCT;
  const k = SCALLOP_SEGMENTS_PER_BUMP;
  return [
    ...scallopedEdgePoints({ xPct: 0, yPct: 0 }, { xPct: 100, yPct: 0 }, { xPct: 0, yPct: 1 }, n, d, k),
    ...scallopedEdgePoints({ xPct: 100, yPct: 0 }, { xPct: 100, yPct: 100 }, { xPct: -1, yPct: 0 }, n, d, k),
    ...scallopedEdgePoints({ xPct: 100, yPct: 100 }, { xPct: 0, yPct: 100 }, { xPct: 0, yPct: -1 }, n, d, k),
    ...scallopedEdgePoints({ xPct: 0, yPct: 100 }, { xPct: 0, yPct: 0 }, { xPct: 1, yPct: 0 }, n, d, k),
  ];
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
