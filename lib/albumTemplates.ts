export type PageTemplateId =
  | "full"
  | "duo"
  | "trio"
  | "quad"
  | "photoText"
  | "blank"
  | "fullMargin"
  | "trioText";

export const pageTemplates: Record<PageTemplateId, { photoCount: number }> = {
  full: { photoCount: 1 },
  duo: { photoCount: 2 },
  trio: { photoCount: 3 },
  quad: { photoCount: 4 },
  photoText: { photoCount: 1 },
  blank: { photoCount: 0 },
  fullMargin: { photoCount: 1 },
  trioText: { photoCount: 3 },
};

export type SpreadDef = {
  left: PageTemplateId;
  right: PageTemplateId;
  // 내지 배경색(hex, 예: "#F5E9DA"). 지정 안 하면 기존처럼 흰색이에요.
  // 왼쪽·오른쪽 페이지가 한 스프레드(펼침면)라서 배경색도 스프레드 단위로 같이 적용돼요.
  backgroundColor?: string;
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