// 포토북 "종류"(상품종류)별 가격 설정
//
// 이 파일은 나중에 자유롭게 수정하는 용도예요.
// - 종류를 새로 추가하고 싶으면 photobookTypes 배열에 항목을 하나 더 추가하면 돼요.
// - 가격을 바꾸고 싶으면 prices 안의 숫자만 고치면 돼요.
// - isPurchasable이 false인 종류는 손님 화면에 "준비 중"으로 표시되고,
//   실제로 주문(결제)까지 진행할 수 없어요. 인쇄 방식/용지/가격이 확정되면
//   true로 바꿔서 판매를 시작하면 돼요.
// - isTestPrice가 true인 가격은 "테스트용 임시 가격"이라는 뜻이에요.
//   실제 판매가가 정해지면 숫자를 바꾸고 isTestPrice를 false로 바꿔주세요.

export type PhotobookSizeId = "small" | "medium" | "large";

export type PhotobookType = {
  id: string;
  name: string; // 손님 화면에 보이는 이름
  prices: Record<PhotobookSizeId, number>; // 사이즈별 가격 (원)
  isTestPrice: boolean; // true면 아직 확정 안 된 테스트용 가격이라는 뜻
  isPurchasable: boolean; // true여야 실제로 주문까지 진행할 수 있어요
};

export const photobookTypes: PhotobookType[] = [
  {
    id: "hd_square",
    name: "고화질 스퀘어북",
    prices: { small: 25000, medium: 45000, large: 75000 },
    isTestPrice: true,
    isPurchasable: false,
  },
  {
    id: "uhd_square",
    name: "초고화질 스퀘어북",
    prices: { small: 35000, medium: 60000, large: 95000 },
    isTestPrice: true,
    isPurchasable: false,
  },
  {
    id: "layflat",
    name: "레이플랫북",
    prices: { small: 40000, medium: 70000, large: 110000 },
    isTestPrice: true,
    isPurchasable: false,
  },
];
