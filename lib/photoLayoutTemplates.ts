// 사진 레이아웃 템플릿(2026-09, 혜민님 요청) — 스프레드에 이미 올라와 있는 이미지박스들의
// "위치·크기"만 미리 정해둔 배치로 한 번에 재배치해주는 기능이에요. 사진(콘텐츠) 자체는
// 전혀 안 건드리고, 기존 "사진 1장 = 독립 이미지박스 1개" 구조 위에서 박스의 틀만 옮겨요.
//
// 좌표계 2종류:
// - "half"(단일 페이지용): 왼쪽 또는 오른쪽 페이지 하나를 0~100으로 보는 좌표. 적용할 때
//   해당 페이지가 왼쪽이면 그대로 폭을 절반(x0.5)으로 줄이고, 오른쪽이면 50을 더해서
//   스프레드 전체 좌표(ImageBoxDef가 실제로 쓰는 좌표계)로 변환해요.
// - "spread"(펼침면 전체용): 스프레드 전체를 0~100으로 보는 좌표. 변환 없이 그대로 써요.
//   파노라마(사진 1장으로 펼침면 전체) 템플릿만 의도적으로 중앙 경계를 가로지르고, 나머지
//   펼침면 템플릿은 기본적으로 중앙(50%) 근처에 작은 여백(SPREAD_GUTTER_PCT)을 둬서 사진이
//   제본 경계를 가로지르지 않게 설계했어요.

export type LayoutSlot = {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
};

export type LayoutScope = "half" | "spread";

export type PhotoLayoutTemplate = {
  id: string;
  name: string;
  photoCount: number;
  scope: LayoutScope;
  slots: LayoutSlot[];
  isPanorama?: boolean;
  hasCaptionSpace?: boolean;
};

type Rect = { x: number; y: number; w: number; h: number };
const FULL_RECT: Rect = { x: 0, y: 0, w: 100, h: 100 };

function grid(rows: number, cols: number, rect: Rect = FULL_RECT): LayoutSlot[] {
  const cw = rect.w / cols;
  const ch = rect.h / rows;
  const slots: LayoutSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ xPct: rect.x + c * cw, yPct: rect.y + r * ch, widthPct: cw, heightPct: ch });
    }
  }
  return slots;
}

// grid()와 같은 배치인데, 칸 사이(gutterPct)와 바깥 테두리(outerMarginPct)에 여백을 둬요
// — 2026-09-24, 혜민님이 "여백이 너무 없다"고 하셔서 신설(기존 grid() 템플릿은 그대로
// 두고, 여백 있는 버전을 "추가"만 함). outerMarginPct/gutterPct는 rect 기준 % 단위예요.
function gridWithGutter(
  rows: number,
  cols: number,
  rect: Rect = FULL_RECT,
  outerMarginPct = 6,
  gutterPct = 4
): LayoutSlot[] {
  const innerRect: Rect = {
    x: rect.x + outerMarginPct,
    y: rect.y + outerMarginPct,
    w: Math.max(1, rect.w - outerMarginPct * 2),
    h: Math.max(1, rect.h - outerMarginPct * 2),
  };
  const cells = grid(rows, cols, innerRect);
  const halfGutter = gutterPct / 2;
  return cells.map((slot) => ({
    xPct: slot.xPct + halfGutter,
    yPct: slot.yPct + halfGutter,
    widthPct: Math.max(1, slot.widthPct - gutterPct),
    heightPct: Math.max(1, slot.heightPct - gutterPct),
  }));
}

// 2026-09-27, 혜민님 요청: "레이아웃 접힘부 여백 주지마세요. 여백이 많이 들어가는
// 레이아웃이 아니라면요. 어차피 레이플렛 제본이라 펼쳤을때 딱 벌어져서 괜찮아요." --
// 접힘부(왼쪽/오른쪽 페이지 경계)에 일부러 두던 작은 틈(1.6%)을 0으로 없애서, 사진이
// 접힘선까지 딱 맞닿게 해요. gridWithGutter() 기반 템플릿(사진 사이/바깥 여백이
// 원래 넉넉한 버전)은 이 값과 무관하게 자기 자신의 outerMarginPct/gutterPct를 그대로
// 써서 여백이 그대로 남아요 -- "여백 많은 레이아웃은 그대로" 요청 그대로예요.
const SPREAD_GUTTER_PCT = 0;
const SPREAD_LEFT_END = 50 - SPREAD_GUTTER_PCT / 2;
const SPREAD_RIGHT_START = 50 + SPREAD_GUTTER_PCT / 2;
const SPREAD_LEFT: Rect = { x: 0, y: 0, w: SPREAD_LEFT_END, h: 100 };
const SPREAD_RIGHT: Rect = { x: SPREAD_RIGHT_START, y: 0, w: 100 - SPREAD_RIGHT_START, h: 100 };

export const HALF_LAYOUT_TEMPLATES: PhotoLayoutTemplate[] = [
  { id: "half-1-fill", name: "꽉 채우기", photoCount: 1, scope: "half", slots: grid(1, 1) },
  {
    id: "half-1-margin",
    name: "사방 여백",
    photoCount: 1,
    scope: "half",
    slots: [{ xPct: 8, yPct: 8, widthPct: 84, heightPct: 84 }],
  },
  {
    id: "half-1-captionBottom",
    name: "사진 아래 문구 공간",
    photoCount: 1,
    scope: "half",
    slots: [{ xPct: 0, yPct: 0, widthPct: 100, heightPct: 76 }],
    hasCaptionSpace: true,
  },
  { id: "half-2-sideBySide", name: "좌우", photoCount: 2, scope: "half", slots: grid(1, 2) },
  { id: "half-2-stacked", name: "위아래", photoCount: 2, scope: "half", slots: grid(2, 1) },
  {
    id: "half-2-bigSmall",
    name: "큰 사진+작은 사진",
    photoCount: 2,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 66, heightPct: 100 },
      { xPct: 66, yPct: 0, widthPct: 34, heightPct: 100 },
    ],
  },
  {
    id: "half-3-bigPlusTwo",
    name: "큰 사진+작은 사진 2장",
    photoCount: 3,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 62, heightPct: 100 },
      { xPct: 62, yPct: 0, widthPct: 38, heightPct: 50 },
      { xPct: 62, yPct: 50, widthPct: 38, heightPct: 50 },
    ],
  },
  { id: "half-3-cols", name: "세로 3컷", photoCount: 3, scope: "half", slots: grid(1, 3) },
  {
    id: "half-3-topBigBottomTwo",
    name: "상단 큰 사진+하단 2컷",
    photoCount: 3,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 100, heightPct: 60 },
      { xPct: 0, yPct: 60, widthPct: 50, heightPct: 40 },
      { xPct: 50, yPct: 60, widthPct: 50, heightPct: 40 },
    ],
  },
  { id: "half-4-grid", name: "2x2", photoCount: 4, scope: "half", slots: grid(2, 2) },
  {
    id: "half-4-bigPlusThree",
    name: "큰 사진+작은 사진 3장",
    photoCount: 4,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 60, heightPct: 100 },
      { xPct: 60, yPct: 0, widthPct: 40, heightPct: 33.34 },
      { xPct: 60, yPct: 33.33, widthPct: 40, heightPct: 33.34 },
      { xPct: 60, yPct: 66.67, widthPct: 40, heightPct: 33.33 },
    ],
  },
  {
    id: "half-4-captionBottom",
    name: "하단 문구 여백형",
    photoCount: 4,
    scope: "half",
    slots: grid(2, 2, { x: 0, y: 0, w: 100, h: 76 }),
    hasCaptionSpace: true,
  },
  {
    id: "half-5-bigPlusFour",
    name: "큰 사진+작은 사진 4장",
    photoCount: 5,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 100, heightPct: 56 },
      ...grid(1, 4, { x: 0, y: 56, w: 100, h: 44 }),
    ],
  },
  {
    id: "half-5-threeTwo",
    name: "위 3장+아래 2장",
    photoCount: 5,
    scope: "half",
    slots: [...grid(1, 3, { x: 0, y: 0, w: 100, h: 50 }), ...grid(1, 2, { x: 0, y: 50, w: 100, h: 50 })],
  },
  { id: "half-6-grid", name: "6장 격자", photoCount: 6, scope: "half", slots: grid(3, 2) },
  { id: "half-9-grid", name: "9장 격자", photoCount: 9, scope: "half", slots: grid(3, 3) },

  // 2026-09-24, 혜민님 요청("레이아웃이 너무 단조롭다 — 예시 이미지 참고해서 다양하게
  // 만들었으면 좋겠습니다") — 슬롯 배치(사진 칸 모양·개수) 위주로 더 다양하게 추가한
  // 템플릿들이에요. 배경색·스티커·문구가 미리 세팅된 "테마형"은 아니고(혜민님 확인),
  // 사진 칸 크기·비율·순서만 다른 배치라는 점은 기존 템플릿들과 같아요.
  {
    id: "half-2-topBottomUneven",
    name: "위 크게+아래 작게",
    photoCount: 2,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 100, heightPct: 64 },
      { xPct: 0, yPct: 64, widthPct: 100, heightPct: 36 },
    ],
  },
  {
    id: "half-2-smallBig",
    name: "작은 사진+큰 사진",
    photoCount: 2,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 34, heightPct: 100 },
      { xPct: 34, yPct: 0, widthPct: 66, heightPct: 100 },
    ],
  },
  {
    id: "half-3-topTwoBottomBig",
    name: "상단 2컷+하단 큰 사진",
    photoCount: 3,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 50, heightPct: 40 },
      { xPct: 50, yPct: 0, widthPct: 50, heightPct: 40 },
      { xPct: 0, yPct: 40, widthPct: 100, heightPct: 60 },
    ],
  },
  {
    id: "half-3-leftColRightBig",
    name: "좌측 세로 2칸+우측 큰 사진",
    photoCount: 3,
    scope: "half",
    slots: [
      { xPct: 0, yPct: 0, widthPct: 38, heightPct: 50 },
      { xPct: 0, yPct: 50, widthPct: 38, heightPct: 50 },
      { xPct: 38, yPct: 0, widthPct: 62, heightPct: 100 },
    ],
  },
  {
    id: "half-4-oneTopThreeBottom",
    name: "상단 와이드+하단 3컷",
    photoCount: 4,
    scope: "half",
    slots: [{ xPct: 0, yPct: 0, widthPct: 100, heightPct: 45 }, ...grid(1, 3, { x: 0, y: 45, w: 100, h: 55 })],
  },
  { id: "half-4-cols", name: "세로 4컷", photoCount: 4, scope: "half", slots: grid(1, 4) },
  {
    id: "half-5-twoTopThreeBottom",
    name: "상단 2컷+하단 3컷",
    photoCount: 5,
    scope: "half",
    slots: [...grid(1, 2, { x: 0, y: 0, w: 100, h: 45 }), ...grid(1, 3, { x: 0, y: 45, w: 100, h: 55 })],
  },
  {
    id: "half-5-centerBigFourCorner",
    name: "중앙 큰 사진+모서리 4컷",
    photoCount: 5,
    scope: "half",
    slots: [
      { xPct: 25, yPct: 25, widthPct: 50, heightPct: 50 },
      { xPct: 0, yPct: 0, widthPct: 25, heightPct: 50 },
      { xPct: 75, yPct: 0, widthPct: 25, heightPct: 50 },
      { xPct: 0, yPct: 50, widthPct: 25, heightPct: 50 },
      { xPct: 75, yPct: 50, widthPct: 25, heightPct: 50 },
    ],
  },
  { id: "half-6-gridWide", name: "가로 격자", photoCount: 6, scope: "half", slots: grid(2, 3) },
  {
    id: "half-7-fourThree",
    name: "상단 4컷+하단 3컷",
    photoCount: 7,
    scope: "half",
    slots: [...grid(1, 4, { x: 0, y: 0, w: 100, h: 50 }), ...grid(1, 3, { x: 12.5, y: 50, w: 75, h: 50 })],
  },
  { id: "half-8-grid", name: "8장 격자(가로형)", photoCount: 8, scope: "half", slots: grid(2, 4) },
  {
    id: "half-2-marginSideBySide",
    name: "좌우, 여백형",
    photoCount: 2,
    scope: "half",
    slots: gridWithGutter(1, 2),
  },
  {
    id: "half-3-marginCols",
    name: "세로 3컷, 여백형",
    photoCount: 3,
    scope: "half",
    slots: gridWithGutter(1, 3),
  },
  {
    id: "half-4-marginGrid",
    name: "2x2, 여백형",
    photoCount: 4,
    scope: "half",
    slots: gridWithGutter(2, 2),
  },
  {
    id: "half-5-marginGrid",
    name: "5장 격자, 여백형",
    photoCount: 5,
    scope: "half",
    slots: [...gridWithGutter(1, 2, { x: 0, y: 0, w: 100, h: 50 }), ...gridWithGutter(1, 3, { x: 0, y: 50, w: 100, h: 50 })],
  },
  {
    id: "half-6-marginGrid",
    name: "가로 격자, 여백형",
    photoCount: 6,
    scope: "half",
    slots: gridWithGutter(2, 3),
  },
];

// 표지(앞표지·뒤표지) 레이아웃 탭에서 쓰는 템플릿이에요(2026-09-24, 혜민님 요청) — 표지
// 앞면·뒷면은 정사각형 낱장 하나라서 위 "half" 스코프 템플릿을 그대로 재사용해요(따로 새
// 템플릿을 만들 필요가 없었어요). 요청하신 "사진 꽉 채우기·여백형·사진+제목 공간·2장·
// 3장 콜라주" 구성에 맞게 사진 1~3장짜리만 골라서 보여줘요(표지 전체를 가로지르는
// 파노라마는 별도 기능이라 여기 포함 안 해요).
export const COVER_LAYOUT_TEMPLATES: PhotoLayoutTemplate[] = HALF_LAYOUT_TEMPLATES.filter(
  (t) => t.photoCount <= 3
);

export const SPREAD_LAYOUT_TEMPLATES: PhotoLayoutTemplate[] = [
  {
    id: "spread-1-panorama",
    name: "파노라마(펼침면 전체)",
    photoCount: 1,
    scope: "spread",
    slots: grid(1, 1),
    isPanorama: true,
  },
  {
    id: "spread-2-sideBySide",
    name: "좌우 페이지 각 1장",
    photoCount: 2,
    scope: "spread",
    slots: [...grid(1, 1, SPREAD_LEFT), ...grid(1, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-2-bigSmall",
    name: "큰 페이지+작은 사진",
    photoCount: 2,
    scope: "spread",
    slots: [
      grid(1, 1, SPREAD_LEFT)[0],
      { xPct: SPREAD_RIGHT.x + SPREAD_RIGHT.w * 0.08, yPct: 8, widthPct: SPREAD_RIGHT.w * 0.84, heightPct: 84 },
    ],
  },
  {
    id: "spread-3-bigLeftTwoRight",
    name: "왼쪽 큰 사진+오른쪽 2컷",
    photoCount: 3,
    scope: "spread",
    slots: [...grid(1, 1, SPREAD_LEFT), ...grid(2, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-3-bigRightTwoLeft",
    name: "오른쪽 큰 사진+왼쪽 2컷",
    photoCount: 3,
    scope: "spread",
    slots: [...grid(2, 1, SPREAD_LEFT), ...grid(1, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-4-grid",
    name: "2x2(양쪽 페이지 각 2장)",
    photoCount: 4,
    scope: "spread",
    slots: [...grid(2, 1, SPREAD_LEFT), ...grid(2, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-5-bigLeftFourRight",
    name: "왼쪽 큰 사진+오른쪽 4컷",
    photoCount: 5,
    scope: "spread",
    slots: [...grid(1, 1, SPREAD_LEFT), ...grid(2, 2, SPREAD_RIGHT)],
  },
  {
    id: "spread-5-bigRightFourLeft",
    name: "오른쪽 큰 사진+왼쪽 4컷",
    photoCount: 5,
    scope: "spread",
    slots: [...grid(2, 2, SPREAD_LEFT), ...grid(1, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-6-grid",
    name: "6장(양쪽 페이지 각 3장)",
    photoCount: 6,
    scope: "spread",
    slots: [...grid(3, 1, SPREAD_LEFT), ...grid(3, 1, SPREAD_RIGHT)],
  },
  // 9장 — 양쪽을 똑같이 나누지 않고 왼쪽/오른쪽 각각 자기 페이지 안에서만 배치해서
  // (한쪽은 2x2 격자, 한쪽은 큰 사진 1장+아래 4컷), 두 페이지의 사진이 서로 겹치지
  // 않고 중앙 제본 영역도 피하도록 했어요.
  {
    id: "spread-9-leftFourRightFive",
    name: "왼쪽 4장+오른쪽 5장",
    photoCount: 9,
    scope: "spread",
    slots: [
      ...grid(2, 2, SPREAD_LEFT),
      { xPct: SPREAD_RIGHT.x, yPct: 0, widthPct: SPREAD_RIGHT.w, heightPct: 56 },
      ...grid(1, 4, { x: SPREAD_RIGHT.x, y: 56, w: SPREAD_RIGHT.w, h: 44 }),
    ],
  },
  {
    id: "spread-9-rightFourLeftFive",
    name: "오른쪽 4장+왼쪽 5장",
    photoCount: 9,
    scope: "spread",
    slots: [
      { xPct: SPREAD_LEFT.x, yPct: 0, widthPct: SPREAD_LEFT.w, heightPct: 56 },
      ...grid(1, 4, { x: SPREAD_LEFT.x, y: 56, w: SPREAD_LEFT.w, h: 44 }),
      ...grid(2, 2, SPREAD_RIGHT),
    ],
  },

  // 2026-09-24 추가 — "레이아웃이 단조롭다" 요청으로 펼침면(spread) 템플릿도 몇 가지
  // 더했어요. 파노라마를 빼고는 항상 왼쪽/오른쪽 페이지 안에서만 배치해서(SPREAD_LEFT/
  // SPREAD_RIGHT), 기존 템플릿들과 똑같이 제본 경계를 넘지 않아요.
  {
    id: "spread-3-topWideEachSideBottom",
    name: "각 페이지 상단 와이드+하단 1컷",
    photoCount: 3,
    scope: "spread",
    slots: [
      { xPct: SPREAD_LEFT.x, yPct: 0, widthPct: SPREAD_LEFT.w, heightPct: 62 },
      { xPct: SPREAD_LEFT.x, yPct: 62, widthPct: SPREAD_LEFT.w, heightPct: 38 },
      ...grid(1, 1, SPREAD_RIGHT),
    ],
  },
  {
    id: "spread-4-unevenCols",
    name: "좌우 비대칭 2단",
    photoCount: 4,
    scope: "spread",
    slots: [
      { xPct: SPREAD_LEFT.x, yPct: 0, widthPct: SPREAD_LEFT.w, heightPct: 62 },
      { xPct: SPREAD_LEFT.x, yPct: 62, widthPct: SPREAD_LEFT.w, heightPct: 38 },
      { xPct: SPREAD_RIGHT.x, yPct: 0, widthPct: SPREAD_RIGHT.w, heightPct: 38 },
      { xPct: SPREAD_RIGHT.x, yPct: 38, widthPct: SPREAD_RIGHT.w, heightPct: 62 },
    ],
  },
  {
    id: "spread-6-topBottomEachSide",
    name: "6장(양쪽 페이지 각 상단 큰 사진+하단 2컷)",
    photoCount: 6,
    scope: "spread",
    slots: [
      { xPct: SPREAD_LEFT.x, yPct: 0, widthPct: SPREAD_LEFT.w, heightPct: 50 },
      ...grid(1, 2, { x: SPREAD_LEFT.x, y: 50, w: SPREAD_LEFT.w, h: 50 }),
      { xPct: SPREAD_RIGHT.x, yPct: 0, widthPct: SPREAD_RIGHT.w, heightPct: 50 },
      ...grid(1, 2, { x: SPREAD_RIGHT.x, y: 50, w: SPREAD_RIGHT.w, h: 50 }),
    ],
  },
  {
    id: "spread-2-marginSideBySide",
    name: "양쪽 페이지 각 1장, 여백형",
    photoCount: 2,
    scope: "spread",
    slots: [...gridWithGutter(1, 1, SPREAD_LEFT), ...gridWithGutter(1, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-4-marginGrid",
    name: "양쪽 페이지 각 2컷, 여백형",
    photoCount: 4,
    scope: "spread",
    slots: [...gridWithGutter(2, 1, SPREAD_LEFT), ...gridWithGutter(2, 1, SPREAD_RIGHT)],
  },
  {
    id: "spread-6-marginGrid",
    name: "양쪽 페이지 각 3컷, 여백형",
    photoCount: 6,
    scope: "spread",
    slots: [...gridWithGutter(3, 1, SPREAD_LEFT), ...gridWithGutter(3, 1, SPREAD_RIGHT)],
  },
];

export const ALL_LAYOUT_TEMPLATES: PhotoLayoutTemplate[] = [...HALF_LAYOUT_TEMPLATES, ...SPREAD_LAYOUT_TEMPLATES];

// 2026-09-27, 혜민님 요청: "기본적으로 펼침면으로 레이아웃을 보여주세요. 냱장으로 되어있는건 전부
// 스프레드로 만들어주세요." 한 족(half) 템플릿을 그대로 두 번 복사해서 왼쪽/오른쪽
// 페이지에 각각 배치하면, 별도 새 디자인 없이도 기계적으로 "펼침면 미리보기"가
// 나와요 — SPREAD_LEFT/SPREAD_RIGHT가 이미 스프레드 좌우 반을 정확히 가리키고 있어서, half
// 템플릿의 0~100% 좌표를 그 반의 폭으로 비례 변환만 해주면 돼요.
function remapSlotsToRect(slots: LayoutSlot[], rect: Rect): LayoutSlot[] {
  return slots.map((s) => ({
    xPct: rect.x + (s.xPct / 100) * rect.w,
    yPct: s.yPct,
    widthPct: (s.widthPct / 100) * rect.w,
    heightPct: s.heightPct,
  }));
}

// half 템플릿 하나를 "양쪽 페이지에 같은 배치가 각각 반복"되는 스프레드 템플릿으로
// 변환해요 — 사진 칸 개수는 두 배가 돼요(양쪽 페이지에 각각 채워야 하니까).
function mirrorHalfToSpread(t: PhotoLayoutTemplate): PhotoLayoutTemplate {
  return {
    id: `spread-auto-${t.id}`,
    name: t.name,
    photoCount: t.photoCount * 2,
    scope: "spread",
    slots: [...remapSlotsToRect(t.slots, SPREAD_LEFT), ...remapSlotsToRect(t.slots, SPREAD_RIGHT)],
    hasCaptionSpace: t.hasCaptionSpace,
  };
}

// half→자동변환 스프레드 템플릿 목록(편집 패널 기본 목록에서 사용)과, 각 항목을
// "왼쪽만/오른쪽만" 적용할 때 다시 찾아야 하는 원본 half 템플릿을 id로 바로 찾는 맵이에요.
export const HALF_AS_SPREAD_TEMPLATES: PhotoLayoutTemplate[] = HALF_LAYOUT_TEMPLATES.map(mirrorHalfToSpread);
export const SPREAD_AUTO_TO_HALF: Record<string, PhotoLayoutTemplate> = Object.fromEntries(
  HALF_LAYOUT_TEMPLATES.map((t) => [`spread-auto-${t.id}`, t])
);

// 편집 패널 "레이아웃" 탭이 기본적으로 보여주는 목록이에요 — 원래 half 전용이던 템플릿들도
// 미러링된 스프레드 형태로 하나로 합쳐서 보여줘요(전부 펼치면 미리보기, "냱장으로 되어있는거
// 전부 스프레드로" 요청).
export function spreadBrowseTemplates(): PhotoLayoutTemplate[] {
  return [...SPREAD_LAYOUT_TEMPLATES, ...HALF_AS_SPREAD_TEMPLATES];
}


export type LayoutApplyRange = "left" | "right" | "spread";

export function templatesForRange(range: LayoutApplyRange): PhotoLayoutTemplate[] {
  return range === "spread" ? SPREAD_LAYOUT_TEMPLATES : HALF_LAYOUT_TEMPLATES;
}

// 사진 아래 문구 공간(hasCaptionSpace) 템플릿에서 "사진 슬롯들이 안 쓰는 나머지 세로
// 공간"이 정확히 어디인지 계산해요. 템플릿의 photo 슬롯들 중 가장 아래쪽 끝(yPct+
// heightPct의 최댓값)을 구해서, 그 아래부터 100%까지를 캡션(문구) 영역으로 봐요 — 폭은
// 항상 슬롯 전체 폭(0~100%, 해당 half/표지 앞뒤면 기준)을 그대로 써요. 사진 슬롯을 놓는
// 것과 똑같은 좌표계(half 스코프는 0~100이 그 페이지/표지면 자신 기준 — applyLayoutTemplate/
// applyCoverLayoutTemplate에서 사진박스에 slot.yPct·slot.heightPct를 그대로 쓰는 것과
// 동일)라서, 텍스트박스(TextBoxDef)의 xPct/yPct/widthPct/heightPct에도 변환 없이 그대로
// 쓸 수 있어요(텍스트박스도 "그 페이지/표지면 자신"을 0~100으로 보는 좌표계라서요).
export function captionSlotFor(template: PhotoLayoutTemplate): LayoutSlot | null {
  if (!template.hasCaptionSpace || template.slots.length === 0) return null;
  const bottom = Math.max(...template.slots.map((s) => s.yPct + s.heightPct));
  const heightPct = 100 - bottom;
  if (heightPct <= 0) return null;
  return { xPct: 0, yPct: bottom, widthPct: 100, heightPct };
}

export function slotToSpreadCoords(
  slot: LayoutSlot,
  range: LayoutApplyRange
): { xPct: number; widthPct: number } {
  if (range === "left") {
    return { xPct: slot.xPct * 0.5, widthPct: slot.widthPct * 0.5 };
  }
  if (range === "right") {
    return { xPct: 50 + slot.xPct * 0.5, widthPct: slot.widthPct * 0.5 };
  }
  return { xPct: slot.xPct, widthPct: slot.widthPct };
}
