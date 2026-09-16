// 배송비 설정
import { isDiasecDeskSizeId, isDiasecWallSizeId } from "./diasecFrameModels";
// 배송비는 3,000원 고정이며, 상품 금액(단가 × 수량)이 5만원 이상이면 무료배송이에요.
// 나중에 배송비나 무료배송 기준을 바꾸고 싶으면 아래 숫자만 수정하면 돼요.
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 50000;

export function getShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

// 디아섹 아크릴액자 배송비
// - 탁상용: 같은 배송지의 탁상용 수량을 합산해서 10개마다 3,500원 (올림 계산)
// - 벽걸이용: 개당 4,000원
// - 디아섹은 상품금액 무관하게 항상 위 기준대로 부과하고, 장바구니의 다른 상품(포토북/굿즈/일반 액자 등)
//   무료배송 기준(5만원 이상)에는 포함시키지 않아요. 디아섹 배송비 + 다른 상품 배송비를 그대로 합산해요.
export const DIASEC_DESK_UNIT_COUNT = 10;
export const DIASEC_DESK_FEE_PER_UNIT_COUNT = 3500;
export const DIASEC_WALL_FEE_PER_ITEM = 4000;

// 도서산간 추가 배송비: 아직 확정된 금액이 없어서 비워둬요.
// 혜민님이 확정 금액을 알려주면 이 값을 채우고, 실제 배송비 계산에 더하는 로직을 추가해주세요.
// (임의의 숫자를 넣지 않기로 했어요.)
export const DIASEC_REMOTE_AREA_SURCHARGE: number | null = null;

export function calcDiasecShippingFee(deskQuantity: number, wallQuantity: number): number {
  const deskFee = Math.ceil(deskQuantity / DIASEC_DESK_UNIT_COUNT) * DIASEC_DESK_FEE_PER_UNIT_COUNT;
  const wallFee = wallQuantity * DIASEC_WALL_FEE_PER_ITEM;
  return deskFee + wallFee;
}

// 장바구니/주문에 담긴 상품들을 기준으로 전체 배송비를 계산해요.
// 디아섹(탁상용·벽걸이)과 그 외 상품(포토북·굿즈·일반 액자 등)을 나눠서 각각 계산한 뒤 합산해요.
export type ShippingCalcItem = {
  productName: string;
  sizeId: string;
  quantity: number;
  unitPrice: number;
};

export type ShippingCalcResult = {
  diasecDeskQuantity: number;
  diasecWallQuantity: number;
  diasecFee: number;
  otherSubtotal: number;
  otherFee: number;
  totalFee: number;
};

export function calcShippingFee(items: ShippingCalcItem[]): ShippingCalcResult {
  let diasecDeskQuantity = 0;
  let diasecWallQuantity = 0;
  let otherSubtotal = 0;

  for (const item of items) {
    if (isDiasecDeskSizeId(item.sizeId)) {
      diasecDeskQuantity += item.quantity;
    } else if (isDiasecWallSizeId(item.sizeId)) {
      diasecWallQuantity += item.quantity;
    } else {
      otherSubtotal += item.unitPrice * item.quantity;
    }
  }

  const diasecFee = calcDiasecShippingFee(diasecDeskQuantity, diasecWallQuantity);
  const otherFee = getShippingFee(otherSubtotal);

  return {
    diasecDeskQuantity,
    diasecWallQuantity,
    diasecFee,
    otherSubtotal,
    otherFee,
    totalFee: diasecFee + otherFee,
  };
}