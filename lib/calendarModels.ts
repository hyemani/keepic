// 내부 제작 참고용: 도면 규격은 Narrow 90×180 / Small 210×150 / Large 270×180 /
// Wide 280×125mm 이고, 작업 사이즈·안전영역은 각각 받은 도면 기준으로 적용해요.

export type CalendarShapeId = "narrow" | "small" | "large" | "wide";
export type CalendarPaperId = "rendezvous" | "luster";

export const calendarPapers: {
  id: CalendarPaperId;
  label: string;
  weight: string;
  desc: string;
}[] = [
  {
    id: "rendezvous",
    label: "랑데뷰 울트라 화이트",
    weight: "240g",
    desc: "차분하고 부드러운 종이 질감으로, 감성적인 사진과 일러스트에 잘 어울려요.",
  },
  {
    id: "luster",
    label: "반광 Luster",
    weight: "255g",
    desc: "은은한 광택과 선명한 사진 표현이 특징이라 여행·가족·반려동물 사진 위주의 캘린더에 추천해요.",
  },
];

export const calendarShapes: {
  id: CalendarShapeId;
  label: string;
  sizeLabel: string;
  badge?: string;
  prices: Record<CalendarPaperId, number>;
}[] = [
  {
    id: "narrow",
    label: "Narrow",
    sizeLabel: "90 × 180mm",
    prices: { rendezvous: 17000, luster: 21000 },
  },
  {
    id: "small",
    label: "Small",
    sizeLabel: "210 × 150mm",
    badge: "BEST",
    prices: { rendezvous: 24000, luster: 28000 },
  },
  {
    id: "large",
    label: "Large",
    sizeLabel: "270 × 180mm",
    badge: "추천",
    prices: { rendezvous: 37000, luster: 44000 },
  },
  {
    id: "wide",
    label: "Wide",
    sizeLabel: "280 × 125mm",
    prices: { rendezvous: 39000, luster: 46000 },
  },
];

export type RingColorId = "black" | "white" | "gold" | "silver";

export const ringColors: { id: RingColorId; label: string }[] = [
  { id: "black", label: "블랙" },
  { id: "white", label: "화이트" },
  { id: "gold", label: "골드" },
  { id: "silver", label: "실버" },
];

export type StandColorId = "black" | "navy" | "ivory";

export const standColors: { id: StandColorId; label: string }[] = [
  { id: "black", label: "블랙" },
  { id: "navy", label: "진곤색" },
  { id: "ivory", label: "아이보리" },
];

// 트윈링 제본 캘린더는 13장부터 24장까지 구성할 수 있어요. (가격은 현재 장수와 무관하게
// 모양·용지 기준으로 고정 — 장수별 추가금은 정해지면 반영해주세요.)
export const CALENDAR_MIN_PAGES = 13;
export const CALENDAR_MAX_PAGES = 24;
export const CALENDAR_DEFAULT_PAGES = 13;

export const calendarOrderNotes = [
  "중요한 얼굴이나 문구는 재단선 가까이에 배치하지 마세요.",
  "링 제본이 들어가는 상단과 재단 영역을 고려하여 여유 있게 디자인해 주세요.",
];
