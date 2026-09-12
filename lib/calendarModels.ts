// 캘린더 옵션은 아직 가격/사진이 확정되지 않아 자리만 먼저 만들어둔 상태예요.
// 실제 가격이 정해지면 CALENDAR_BASE_PRICE와 shape별 추가금액을 채워주세요.

export type CalendarShapeId = "narrow" | "small" | "large" | "wide";

export const calendarShapes: { id: CalendarShapeId; label: string; detail: string }[] = [
  { id: "narrow", label: "Narrow", detail: "세로로 긴 좁은 형태" },
  { id: "small", label: "Small", detail: "아담한 기본 사이즈" },
  { id: "large", label: "Large", detail: "여유 있는 큰 사이즈" },
  { id: "wide", label: "Wide", detail: "가로로 넓은 형태" },
];

export type RingColorId = "black" | "white" | "gold" | "silver";

export const ringColors: { id: RingColorId; label: string }[] = [
  { id: "black", label: "검정색" },
  { id: "white", label: "흰색" },
  { id: "gold", label: "금색" },
  { id: "silver", label: "은색" },
];

export type StandColorId = "black" | "navy" | "ivory";

export const standColors: { id: StandColorId; label: string }[] = [
  { id: "black", label: "블랙" },
  { id: "navy", label: "진곤색" },
  { id: "ivory", label: "아이보리" },
];

// TODO: 혜민 - 실제 판매가로 교체해주세요. 지금은 자리만 잡아둔 임시값(0원)이에요.
export const CALENDAR_BASE_PRICE = 0;
