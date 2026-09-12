export type MugTypeId = "glossy" | "glass-handle" | "beer-can" | "ice-color";

const GENERAL_NOTES = [
  "열을 가해 디자인을 옮기는 전사 인쇄 방식으로 제작되어",
  "화면과 실제 인쇄 색상이 다를 수 있어요.",
  "제품 크기는 측정 방법에 따라 약 1~2mm 차이가 있을 수 있어요.",
];

export const mugTypes: {
  id: MugTypeId;
  label: string;
  productLabel: string;
  capacity: string;
  size: string;
  price: number;
  description: string[];
  colors: { id: string; label: string; images: string[] }[];
}[] = [
  {
    id: "glossy",
    label: "유광 머그컵",
    productLabel: "유광 머그컵",
    capacity: "11oz",
    size: "약 8.4 × 9.8cm",
    price: 22000,
    description: [
      "은은한 미색과 반짝이는 유광 표면이 특징이에요.",
      "손잡이가 있는 기본 머그 형태로, 사진과 문구를 담기 좋아요.",
      ...GENERAL_NOTES,
    ],
    colors: [{ id: "default", label: "기본", images: ["/goods/mug/glossy-1.jpg"] }],
  },
  {
    id: "glass-handle",
    label: "무광 내열 유리컵",
    productLabel: "무광 내열 유리컵",
    capacity: "11oz",
    size: "약 7.8 × 10.1cm",
    price: 24000,
    description: [
      "반투명한 유리에 부드러운 무광 질감을 더했어요.",
      "손잡이가 있어 편안하게 잡을 수 있어요.",
      ...GENERAL_NOTES,
    ],
    colors: [{ id: "default", label: "기본", images: ["/goods/mug/glass-handle-1.jpg"] }],
  },
  {
    id: "beer-can",
    label: "무광 비어캔 글라스",
    productLabel: "무광 비어캔 글라스",
    capacity: "473ml",
    size: "약 7.5 × 13.3cm",
    price: 26000,
    description: [
      "손잡이 없이 깔끔한 캔 형태의 유리컵이에요.",
      "반투명한 무광 표면으로 음료와 디자인이 함께 보여요.",
      ...GENERAL_NOTES,
    ],
    colors: [{ id: "default", label: "기본", images: ["/goods/mug/beer-can-1.jpg"] }],
  },
  {
    id: "ice-color",
    label: "무광 아이스 변색 컵",
    productLabel: "무광 아이스 변색 컵",
    capacity: "473ml",
    size: "약 7.5 × 13.3cm",
    price: 32000,
    description: [
      "차가운 음료를 담으면 색상이 더욱 선명해져요.",
      "아이스 변색 컵은 음료의 온도에 따라 색상 변화 정도가 달라질 수 있어요.",
      "차가운 음료 전용으로, 뜨거운 음료에는 사용할 수 없어요.",
      ...GENERAL_NOTES,
    ],
    colors: [
      { id: "blue", label: "블루", images: ["/goods/mug/ice-color-1.jpg"] },
      { id: "pink", label: "핑크", images: ["/goods/mug/ice-color-1.jpg"] },
    ],
  },
];
