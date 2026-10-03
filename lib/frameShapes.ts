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
  return polarLoopPoints(0, 0, (t) => BASE + AMP * Math.cos(BUMPS * t), BUMPS * 8);
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
  return polarLoopPoints(0, 0, (t) => BASE + AMP * Math.cos(PETALS * t), PETALS * 10);
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
    160
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
    150
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
  const arcSegments = 48;
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
  | "badge";

// frameShape 값 하나를 받아서, 그 모양의 외곽선 점 배열을 돌려줘요. "rect"(기본값)나
// 모르는 값이면 null — null이면 화면/인쇄 양쪽 다 "클리핑 없음, borderRadiusPct로
// 모서리만 둥글게"라는 뜻으로 써요. 화면(app/upload/page.tsx)과 인쇄
// (lib/printCompose.ts)가 이 함수 하나만 호출하면 되니, 새 모양을 추가해도 분기
// 코드를 두 파일에 각각 안 적어도 돼요(이 switch 하나만 고치면 양쪽에 다 반영).
export function framePerimeterPoints(shape: FrameShapeKey | undefined): PerimeterPoint[] | null {
  switch (shape) {
    case "hexagon":
      return hexagonPoints();
    case "scalloped":
      return scallopedRectPoints();
    case "scallopedCircle":
      return scallopedCirclePoints();
    case "flowerPetal":
      return scallopedOvalPetalPoints();
    case "organicScallop":
      return organicScallopedBlobPoints();
    case "cloud":
      return cloudBlobPoints();
    case "badge":
      return badgeRibbonPoints();
    default:
      return null;
  }
}
