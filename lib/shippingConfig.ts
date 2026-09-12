// 배송비 설정
// 배송비는 3,000원 고정이며, 상품 금액(단가 × 수량)이 5만원 이상이면 무료배송이에요.
// 나중에 배송비나 무료배송 기준을 바꾸고 싶으면 아래 숫자만 수정하면 돼요.
export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 50000;

export function getShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
