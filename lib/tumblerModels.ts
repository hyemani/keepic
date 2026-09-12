export type TumblerTypeId = "clip-vacuum" | "etched";

export const tumblerTypes: {
  id: TumblerTypeId;
  label: string;
  productLabel: string;
  capacity: string;
  material: string;
  engraveArea: string;
  price: number;
  colors: { id: string; label: string }[];
  images: string[];
}[] = [
  {
    id: "clip-vacuum",
    label: "클립진공",
    productLabel: "클립진공 텀블러",
    capacity: "500ml",
    material: "스테인리스 SUS304 · 뚜껑: PP+실리콘",
    engraveArea: "45 x 100 mm",
    price: 26000,
    colors: [
      { id: "black", label: "블랙" },
      { id: "ivory", label: "아이보리" },
    ],
    images: ["/goods/tumbler/clip-main.jpg", "/goods/tumbler/clip-colors.jpg"],
  },
  {
    id: "etched",
    label: "에치드",
    productLabel: "에치드 텀블러",
    capacity: "500ml",
    material: "내부: 스테인리스 304 · 뚜껑: PP+실리콘",
    engraveArea: "35 x 125 mm",
    price: 29000,
    colors: [
      { id: "black", label: "블랙" },
      { id: "purple", label: "퍼플" },
    ],
    images: ["/goods/tumbler/etched-main.jpg", "/goods/tumbler/etched-colors.jpg"],
  },
];
