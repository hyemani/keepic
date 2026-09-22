export type PageTemplateId =
  | "full"
  | "duo"
  | "trio"
  | "quad"
  | "photoText"
  | "blank"
  | "fullMargin"
  | "trioText"
  // "사진 1장(꽉 참/여백)" 페이지의 사진을 자유 배치 이미지박스로 전환했을 때 쓰는
  // 자리표시예요(2026-09-22 추가). 이 페이지는 더 이상 순서대로 사진을 자동 배정받지
  // 않고(photoCount 0), 대신 그 사진이 spread.imageBoxes 안에 독립적으로 들어가서 페이지
  // 경계를 자유롭게 넘나들 수 있어요. 목록에서 직접 고를 수 있는 템플릿이 아니라, "이미지
  // 박스로 전환" 버튼을 눌렀을 때만 자동으로 지정돼요.
  | "freeform";

export const pageTemplates: Record<PageTemplateId, { photoCount: number }> = {
  full: { photoCount: 1 },
  duo: { photoCount: 2 },
  trio: { photoCount: 3 },
  quad: { photoCount: 4 },
  photoText: { photoCount: 1 },
  blank: { photoCount: 0 },
  fullMargin: { photoCount: 1 },
  trioText: { photoCount: 3 },
  freeform: { photoCount: 0 },
};

// 자유 배치 텍스트박스 하나예요(내지 페이지·표지 앞면 공통으로 써요). 위치·너비는 그
// 텍스트박스가 놓인 "페이지(또는 표지 앞면) 전체"를 100%로 보는 퍼센트 좌표라서, 화면
// 크기가 달라져도(모바일 등) 항상 같은 자리에 보여요.
export type TextBoxDef = {
  id: string;
  text: string;
  xPct: number; // 왼쪽 끝 위치 (0~100)
  yPct: number; // 위쪽 끝 위치 (0~100)
  widthPct: number; // 박스 너비(가로, 0~100) — 고정이에요. 이 너비에서 줄바꿈돼요.
  heightPct?: number; // 박스 높이(세로, 0~100). 비워두면 글자 양에 맞춰 자동으로 늘어나요
  // (예전 방식·책등처럼 세로쓰기인 경우). 값이 있으면 일러스트레이터 텍스트박스처럼
  // 높이가 고정되고, 아래쪽 손잡이로 끌어서 조절할 수 있어요.
  fontFamily: string;
  fontScale: number; // 기본 글자 크기 대비 배율(1이 기본) — 표지 제목 배율(coverTitleFontScale)과 같은 방식이에요.
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  // 박스 안에서 텍스트를 위/가운데/아래 중 어디에 둘지예요(일러스트레이터 텍스트박스의
  // 세로 정렬과 같아요). heightPct로 박스 높이를 고정했을 때만 실제로 차이가 보여요(높이가
  // 글자 양에 맞춰 자동으로 늘어나는 박스는 남는 공간이 없어서 항상 위와 같아요). 값이
  // 없으면 기존처럼 "위"로 취급해요(하위 호환, 2026-09-22 추가).
  verticalAlign?: "top" | "middle" | "bottom";
};

// 자유 배치 이미지박스 하나예요(내지 스프레드·표지 앞면 공통으로 써요). 텍스트박스와
// 달리 "왼쪽 페이지"·"오른쪽 페이지" 각각이 아니라 "스프레드(펼침면) 전체 폭"을 100%로
// 보는 퍼센트 좌표예요 — 그래야 박스를 끌어서 가운데(페이지 경계)를 넘나들며 자유롭게
// 배치할 수 있어요(혜민님 확인, 2026-09). 인쇄 파일을 만들 때는 이 좌표를 기준으로 같은
// 사진을 왼쪽 낱장·오른쪽 낱장 파일에 각각 필요한 부분만 잘라서 그려서, 실제로 펼쳤을 때
// 하나로 이어져 보이게 해요.
export type ImageBoxDef = {
  id: string;
  url: string; // 사진 원본 URL
  naturalWidth: number;
  naturalHeight: number;
  xPct: number; // 스프레드 전체 폭 기준 왼쪽 끝 위치(0~100, 왼쪽 페이지는 0~50, 오른쪽 페이지는 50~100)
  yPct: number; // 스프레드 높이 기준 위쪽 끝 위치(0~100)
  widthPct: number; // 스프레드 폭 기준 너비(0~100) — 박스(틀) 크기예요. 세로(heightPct)와
  // 독립적으로 조절 가능해요(원본 비율에 안 묶여요, 2026-09-18 변경).
  heightPct: number; // 스프레드 높이 기준 높이(0~100) — 박스(틀) 크기예요.
  // 박스 안에서 사진이 보이는 위치/확대예요("cover"로 박스를 항상 꽉 채운 상태를
  // 기준으로, 그 안에서 얼마나 더 확대했는지·어느 방향으로 옮겼는지). 박스 크기를
  // 조절하면 이 확대/위치 값은 그대로 유지된 채 새 박스 크기 기준으로 다시 계산되기
  // 때문에, 박스만 조절해도 항상 비율이 맞고 빈 여백 없이 꽉 차요(2026-09-22 확정 —
  // 이전엔 사진을 박스와 분리된 절대 좌표로 관리했었는데, 박스를 조절할 때 사진이 잘려서
  // 빈 공간이 생기는 문제가 있어 다시 이 방식으로 되돌림). 지정 안 하면 0/0/1(꽉 채운
  // 기본 위치, 확대 없음)로 취급해요 — 기존에 저장된 이미지박스는 이 필드가 없어도
  // 그대로 잘 나와요. lib/imageBoxGeometry.ts의 computeImageBoxCoverRect가 이 값들로
  // 실제 그려질 위치·크기를 계산하고, 화면 미리보기와 인쇄 파일 둘 다 같은 함수를 써요.
  innerOffsetXPct?: number; // 박스 너비 대비 %, 왼쪽(-)/오른쪽(+) 이동
  innerOffsetYPct?: number; // 박스 높이 대비 %, 위(-)/아래(+) 이동
  innerScale?: number; // 1 = 박스를 딱 채우는 기본 확대율, 1보다 크면 더 확대
  // 사진을 좌우로 뒤집을지예요(2026-09-22 추가, 자유 배치 이미지박스용). 화면·인쇄
  // 파일 둘 다 같은 값을 보고 그려요. 회전은 박스 크기 계산이 훨씬 복잡해져서 아직
  // 지원하지 않아요 — 필요하면 다음에 별도로 추가해요.
  flipX?: boolean;
};

export type SpreadDef = {
  left: PageTemplateId;
  right: PageTemplateId;
  // 내지 배경색(hex, 예: "#F5E9DA"). 지정 안 하면 기존처럼 흰색이에요.
  // 왼쪽·오른쪽 페이지가 한 스프레드(펼침면)라서 배경색도 스프레드 단위로 같이 적용돼요.
  backgroundColor?: string;
  // 그래픽·패턴·텍스처 배경 꾸미기(lib/backgroundPatterns.ts의 preset id)예요. 지정돼
  // 있으면 backgroundColor보다 우선해요(서로 배타적으로 골라요).
  backgroundPattern?: string;
  // 자유 배치 텍스트박스예요. 왼쪽·오른쪽 페이지가 서로 다른 낱장이라 각각 따로 가져요.
  textBoxesLeft?: TextBoxDef[];
  textBoxesRight?: TextBoxDef[];
  // 자유 배치 이미지박스예요. 텍스트박스와 달리 스프레드 전체를 공유해요(페이지 경계를
  // 넘어 배치할 수 있어야 하니까요).
  imageBoxes?: ImageBoxDef[];
};

export type AlbumTemplate = {
  id: string;
  name: string;
  description: string;
  spreads: SpreadDef[];
};

export const albumTemplates: AlbumTemplate[] = [
  {
    id: "ai-auto",
    name: "AI 맞춤 레이아웃",
    description: "사진을 올리면 개수와 비율에 맞춰 AI가 자동으로 배치해드려요",
    // 고정된 스프레드가 없어요 — 사진을 올리면 generateAutoSpreads()가 그때그때 만들어요.
    spreads: [],
  },
  {
    id: "classic",
    name: "클래식",
    description: "사진과 여백이 번갈아 나오는 균형 잡힌 구성",
    spreads: [
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
      { left: "quad", right: "full" },
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
      { left: "quad", right: "full" },
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
    ],
  },
  {
    id: "minimal",
    name: "미니멀",
    description: "큰 사진 위주로, 여백을 넉넉하게 살린 담백한 구성",
    spreads: [
      { left: "full", right: "full" },
      { left: "full", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "full" },
    ],
  },
  {
    id: "collage",
    name: "콜라주",
    description: "사진을 최대한 많이, 촘촘하게 담고 싶은 분께",
    spreads: [
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
    ],
  },
  {
    id: "story",
    name: "스토리",
    description: "잔잔하게 시작해서 점점 풍성해지는 흐름",
    spreads: [
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "duo", right: "duo" },
      { left: "duo", right: "trio" },
      { left: "trio", right: "trio" },
      { left: "trio", right: "quad" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
    ],
  },
  {
    id: "magazine",
    name: "매거진",
    description: "잡지 화보 느낌의 큰 사진과 작은 사진의 조화",
    spreads: [
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
    ],
  },
  {
    id: "storytelling",
    name: "스토리텔링",
    description: "사진마다 짧은 이야기를 함께 담는, 여행기록 같은 구성",
    spreads: [
      { left: "quad", right: "photoText" },
      { left: "photoText", right: "trio" },
      { left: "duo", right: "photoText" },
      { left: "photoText", right: "duo" },
      { left: "trio", right: "photoText" },
      { left: "photoText", right: "quad" },
      { left: "full", right: "photoText" },
      { left: "photoText", right: "full" },
      { left: "duo", right: "photoText" },
      { left: "photoText", right: "trio" },
    ],
  },
];

// 옵션 단계에서 고른 "내지 페이지 수"에 맞춰 편집기 스프레드 개수를 정해요.
// 스프레드 1개 = 펼침면(왼쪽+오른쪽) 2페이지라서 페이지 수 ÷ 2가 스프레드 개수예요.
export function calcRequiredSpreadCount(pages: number): number {
  return Math.max(1, Math.round(pages / 2));
}

// 템플릿(예: "클래식")은 스프레드 구성이 고정돼 있는데, 고객마다 고른 내지 페이지 수가
// 달라서 그 템플릿 패턴을 반복해서 스프레드 개수를 정확히 맞춰요.
export function fitSpreadsToCount(spreads: SpreadDef[], count: number): SpreadDef[] {
  if (spreads.length === 0 || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => ({ ...spreads[i % spreads.length] }));
}

export function getTemplatePhotoCount(template: AlbumTemplate) {
  return template.spreads.reduce((total, spread) => {
    return (
      total +
      pageTemplates[spread.left].photoCount +
      pageTemplates[spread.right].photoCount
    );
  }, 0);
}

// "AI 맞춤 레이아웃"을 고르면 이 id로 들어와요. 정해진 spreads가 없고,
// 올린 사진에 맞춰 generateAutoSpreads()로 그때그때 만들어요.
export const AI_AUTO_LAYOUT_TEMPLATE_ID = "ai-auto";

// 2026-09-24부터 "AI 맞춤 레이아웃"은 칸(1/2/3/4분할) 배정 없이, 사진을 올리는 즉시
// 자유 배치 이미지박스로 바로 넣어요(편집메뉴에서 바로 위치·크기를 조절할 수 있게).
// 그래서 처음엔 빈 스프레드만 필요한 개수만큼 만들어두고, 사진이 올라올 때마다
// findAutoPhotoSlotPosition()이 정해주는 자리에 박스를 하나씩 추가해요.
export function generateEmptyFreeformSpreads(requiredSpreadCount: number): SpreadDef[] {
  const count = Math.max(1, requiredSpreadCount);
  return Array.from({ length: count }, () => ({ left: "blank" as PageTemplateId, right: "blank" as PageTemplateId }));
}

// slot 0, 1, 2, 3... 순서를 "몇 번째 스프레드의 어느 쪽 면"인지로 바꿔줘요. 스프레드
// 1(index 0)의 왼쪽 면은 표지 뒷면(인쇄 안 됨)이라 항상 건너뛰고 오른쪽부터 채워요.
// 정해진 페이지 수(requiredSpreadCount)를 다 채운 뒤에 더 들어오는 사진은, 잃어버리지
// 않도록 마지막 스프레드에 겹쳐서라도 계속 추가해요(overflow: true로 표시).
export function findAutoPhotoSlotPosition(
  slot: number,
  requiredSpreadCount: number
): { spreadIndex: number; side: "left" | "right"; overflow: boolean } {
  const count = Math.max(1, requiredSpreadCount);
  const totalSlots = Math.max(1, count * 2 - 1);
  const clamped = Math.min(slot, totalSlots - 1);
  const overflow = slot > totalSlots - 1;
  if (clamped === 0) return { spreadIndex: 0, side: "right", overflow };
  const idx = clamped - 1;
  const spreadIndex = Math.min(1 + Math.floor(idx / 2), count - 1);
  const side: "left" | "right" = idx % 2 === 0 ? "left" : "right";
  return { spreadIndex, side, overflow };
}

export type PhotoAspect = { width: number; height: number };

// 정해진 페이지 칸 수(slotCount)에 사진(photoCount)을 최대한 고르게 나눠 담아요.
// 한 칸엔 1~4장까지 들어갈 수 있어요. 사진이 딱 맞아떨어지지 않으면(너무 적거나
// 너무 많으면) 가능한 범위까지 채우고 나머지는 그대로 둬서, 위쪽 화면에서
// "사진이 N장 더/덜 필요해요" 안내가 정확하게 계산되도록 해요.
function distributePhotosIntoSlots(photoCount: number, slotCount: number): number[] {
  const MIN = 1;
  const MAX = 4;
  if (slotCount <= 0) return [];
  const base = Math.min(MAX, Math.max(MIN, Math.round(photoCount / slotCount)));
  const sizes = Array(slotCount).fill(base);
  let sum = sizes.reduce((a, b) => a + b, 0);

  let guard = 0;
  while (sum < photoCount && sizes.some((s) => s < MAX) && guard < slotCount * MAX * 2) {
    const idx = guard % slotCount;
    if (sizes[idx] < MAX) {
      sizes[idx] += 1;
      sum += 1;
    }
    guard += 1;
  }
  guard = 0;
  while (sum > photoCount && sizes.some((s) => s > MIN) && guard < slotCount * MAX * 2) {
    const idx = guard % slotCount;
    if (sizes[idx] > MIN) {
      sizes[idx] -= 1;
      sum -= 1;
    }
    guard += 1;
  }
  return sizes;
}

// singleIndex: 지금까지 나온 "한 칸에 사진 한 장" 배치 중 몇 번째인지예요.
// 전부 꽉 찬 사진(full)만 나오면 밋밋해서, 세 번에 한 번은 여백이 있는
// fullMargin으로 바꿔서 다양하게 보여줘요.
function sizeToTemplateId(size: number, singleIndex: number): PageTemplateId {
  if (size >= 4) return "quad";
  if (size === 3) return "trio";
  if (size === 2) return "duo";
  return singleIndex % 3 === 2 ? "fullMargin" : "full";
}

// 올린 사진들을 보고 스프레드(왼쪽/오른쪽 페이지) 구성을 자동으로 만들어요.
// requiredSpreadCount(고객이 고른 내지 페이지 수 ÷ 2)만큼 스프레드 개수를 정확히
// 맞춰요. 스프레드 1의 왼쪽 면은 표지 뒷면이라 항상 빈 면(사진 없음)으로 두고,
// 나머지 칸에 사진을 최대한 고르게 나눠 담아요.
export function generateAutoSpreads(
  photos: PhotoAspect[],
  requiredSpreadCount: number
): SpreadDef[] {
  const count = Math.max(1, requiredSpreadCount);
  const availableSlots = Math.max(1, count * 2 - 1);
  const slotSizes = distributePhotosIntoSlots(photos.length, availableSlots);

  let singleIndex = 0;
  const sideTemplates = slotSizes.map((size) => {
    const templateId = sizeToTemplateId(size, singleIndex);
    if (size === 1) singleIndex += 1;
    return templateId;
  });

  const spreads: SpreadDef[] = [{ left: "blank", right: sideTemplates[0] ?? "blank" }];
  for (let i = 1; i < sideTemplates.length; i += 2) {
    spreads.push({
      left: sideTemplates[i],
      right: sideTemplates[i + 1] ?? "blank",
    });
  }
  while (spreads.length < count) {
    spreads.push({ left: "blank", right: "blank" });
  }
  return spreads.slice(0, count);
}