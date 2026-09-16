// ⚠️ 관리자 전용 내부 참고 자료입니다. 어떤 고객 화면(app/ 아래 페이지)에서도
// 이 파일을 import하지 마세요. 판매가(lib/diasecFrameModels.ts)와는 완전히
// 분리해서 관리합니다.
//
// 아래 값은 혜민님이 전달한 "디아섹 아크릴액자" 원가예요. id는
// lib/diasecFrameModels.ts의 diasecFrameSizes와 1:1로 대응돼요.

export const diasecFrameCosts: { id: string; cost: number }[] = [
  { id: "desk-glossy-127x177", cost: 13200 },
  { id: "desk-glossy-152x203", cost: 15400 },
  { id: "desk-glossy-203x254", cost: 19800 },
  { id: "desk-antiglare-127x177", cost: 15400 },
  { id: "desk-antiglare-152x203", cost: 17600 },
  { id: "desk-antiglare-203x254", cost: 19800 },
  { id: "desk-birch-glossy-127x177", cost: 23760 },
  { id: "desk-birch-glossy-152x203", cost: 23760 },
  { id: "desk-birch-glossy-203x254", cost: 27720 },
  { id: "desk-birch-glossy-210x297", cost: 29700 },
  { id: "desk-birch-matte-127x177", cost: 25960 },
  { id: "desk-birch-matte-152x203", cost: 25960 },
  { id: "desk-birch-matte-203x254", cost: 29920 },
  { id: "desk-birch-matte-210x297", cost: 31900 },
  { id: "wall-birch-glossy-279x355", cost: 35640 },
  { id: "wall-birch-matte-279x355", cost: 37840 },
];
