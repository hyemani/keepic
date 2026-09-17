// 디아섹 아크릴액자: 마감(탁상용 유광/무반사/자작나무 유광/자작나무 무광, 벽걸이 자작나무 유광/무광) ×
// 사이즈 조합으로 관리해요. 고객 화면에는 이 파일의 price(판매가)만 노출하고,
// 원가는 lib/diasecFrameInternalCostReference.ts(관리자 전용)에서 별도로 관리해요.
//
// id 규칙: "desk-..." 로 시작하면 탁상용, "wall-..." 로 시작하면 벽걸이예요.
// 배송비 계산(lib/shippingConfig.ts)에서 이 접두사로 탁상용/벽걸이를 구분해요.

export const DIASEC_PRODUCT_NAME = "디아섹 아크릴액자" as const;

export type DiasecMount = "desk" | "wall";

export type DiasecFrameSizeOption = {
  id: string;
  finishLabel: string;
  sizeLabel: string;
  mount: DiasecMount;
  price: number;
};

export const diasecFrameSizes: DiasecFrameSizeOption[] = [
  // 탁상용 유광
  { id: "desk-glossy-127x177", finishLabel: "탁상용 유광", sizeLabel: "127×177mm", mount: "desk", price: 35000 },
  { id: "desk-glossy-152x203", finishLabel: "탁상용 유광", sizeLabel: "152×203mm", mount: "desk", price: 39000 },
  { id: "desk-glossy-203x254", finishLabel: "탁상용 유광", sizeLabel: "203×254mm", mount: "desk", price: 55000 },
  // 탁상용 무반사
  { id: "desk-antiglare-127x177", finishLabel: "탁상용 무반사", sizeLabel: "127×177mm", mount: "desk", price: 39000 },
  { id: "desk-antiglare-152x203", finishLabel: "탁상용 무반사", sizeLabel: "152×203mm", mount: "desk", price: 44000 },
  { id: "desk-antiglare-203x254", finishLabel: "탁상용 무반사", sizeLabel: "203×254mm", mount: "desk", price: 49000 },
  // 탁상용 자작나무 유광
  { id: "desk-birch-glossy-127x177", finishLabel: "탁상용 자작나무 유광", sizeLabel: "127×177mm", mount: "desk", price: 62000 },
  { id: "desk-birch-glossy-152x203", finishLabel: "탁상용 자작나무 유광", sizeLabel: "152×203mm", mount: "desk", price: 62000 },
  { id: "desk-birch-glossy-203x254", finishLabel: "탁상용 자작나무 유광", sizeLabel: "203×254mm", mount: "desk", price: 72000 },
  { id: "desk-birch-glossy-210x297", finishLabel: "탁상용 자작나무 유광", sizeLabel: "210×297mm", mount: "desk", price: 72000 },
  // 탁상용 자작나무 무광
  { id: "desk-birch-matte-127x177", finishLabel: "탁상용 자작나무 무광", sizeLabel: "127×177mm", mount: "desk", price: 65000 },
  { id: "desk-birch-matte-152x203", finishLabel: "탁상용 자작나무 무광", sizeLabel: "152×203mm", mount: "desk", price: 65000 },
  { id: "desk-birch-matte-203x254", finishLabel: "탁상용 자작나무 무광", sizeLabel: "203×254mm", mount: "desk", price: 72000 },
  { id: "desk-birch-matte-210x297", finishLabel: "탁상용 자작나무 무광", sizeLabel: "210×297mm", mount: "desk", price: 77000 },
  // 벽걸이 자작나무 유광
  { id: "wall-birch-glossy-279x355", finishLabel: "벽걸이 자작나무 유광", sizeLabel: "279×355mm", mount: "wall", price: 95000 },
  // 벽걸이 자작나무 무광
  { id: "wall-birch-matte-279x355", finishLabel: "벽걸이 자작나무 무광", sizeLabel: "279×355mm", mount: "wall", price: 99000 },
];

// 옵션 선택 화면에서 16개 사이즈를 한 번에 보여주면 복잡해서,
// "거치방식/재질" 대분류(3개) → 마감(대분류 안 2개) → 사이즈 순으로 나눠 골라요.
export type DiasecGroup = {
  key: string;
  label: string;
  finishLabels: string[];
};

export const diasecGroups: DiasecGroup[] = [
  { key: "desk", label: "탁상용", finishLabels: ["탁상용 유광", "탁상용 무반사"] },
  {
    key: "desk-birch",
    label: "탁상용 자작나무",
    finishLabels: ["탁상용 자작나무 유광", "탁상용 자작나무 무광"],
  },
  {
    key: "wall-birch",
    label: "벽걸이 자작나무",
    finishLabels: ["벽걸이 자작나무 유광", "벽걸이 자작나무 무광"],
  },
];

export function isDiasecDeskSizeId(sizeId: string): boolean {
  return sizeId.startsWith("desk-");
}

export function isDiasecWallSizeId(sizeId: string): boolean {
  return sizeId.startsWith("wall-");
}

// 고객 안내 문구 (배송비 안내). 옵션 선택 화면과 장바구니/결제 화면에서 함께 노출해요.
export const DIASEC_SHIPPING_NOTICE =
  "탁상용은 10개당 3,500원, 벽걸이용은 개당 4,000원의 배송비가 부과됩니다. 다른 상품과 함께 주문하면 배송비가 별도로 계산되며, 상품은 따로 도착할 수 있습니다.";
