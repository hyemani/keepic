export type TumblerTypeId = "clip-vacuum" | "etched";

export const tumblerTypes: {
  id: TumblerTypeId;
  label: string;
  productLabel: string;
  capacity: string;
  material: string;
  engraveArea: string;
  price: number;
  description: string[];
  colors: { id: string; label: string; images: string[] }[];
}[] = [
  {
    id: "clip-vacuum",
    label: "클립진공",
    productLabel: "클립진공 텀블러",
    capacity: "500ml",
    material: "스테인리스 SUS304 · 뚜껑: PP+실리콘",
    engraveArea: "45 x 100 mm",
    price: 26000,
    description: [
      "클립 방식 뚜껑으로 한 손으로도 간편하게 여닫을 수 있어요.",
      "진공 이중구조라 보온·보냉이 오래 유지돼요.",
      "스테인리스 SUS304 소재로 튼튼하고 위생적이에요.",
      "45 x 100mm 영역에 사진이나 문구를 각인해드려요.",
    ],
    colors: [
      {
        id: "black",
        label: "블랙",
        images: [
          "/goods/tumbler/main-1.jpg",
          "/goods/tumbler/clip-black-1.jpg",
          "/goods/tumbler/clip-black-2.jpg",
          "/goods/tumbler/clip-black-3.jpg",
          "/goods/tumbler/clip-black-4.jpg",
          "/goods/tumbler/clip-black-5.jpg",
        ],
      },
      {
        id: "ivory",
        label: "아이보리",
        images: [
          "/goods/tumbler/clip-ivory-1.jpg",
          "/goods/tumbler/clip-ivory-2.jpg",
          "/goods/tumbler/clip-ivory-3.jpg",
          "/goods/tumbler/clip-ivory-4.jpg",
          "/goods/tumbler/clip-ivory-5.jpg",
        ],
      },
    ],
  },
  {
    id: "etched",
    label: "에치드",
    productLabel: "에치드 텀블러",
    capacity: "500ml",
    material: "내부: 스테인리스 304 · 뚜껑: PP+실리콘",
    engraveArea: "35 x 125 mm",
    price: 29000,
    description: [
      "에칭(각인) 방식으로 표면에 깊이감 있는 디자인을 새겨요.",
      "슬림한 실루엣이라 손에 쥐기 편하고 가방에도 쏙 들어가요.",
      "내부 스테인리스 304 소재로 보온·보냉과 위생을 챙겼어요.",
      "35 x 125mm 영역에 사진이나 문구를 각인해드려요.",
    ],
    colors: [
      {
        id: "black",
        label: "블랙",
        images: [
          "/goods/tumbler/etched-black-1.jpg",
          "/goods/tumbler/etched-black-2.jpg",
          "/goods/tumbler/etched-black-3.jpg",
          "/goods/tumbler/etched-black-4.jpg",
          "/goods/tumbler/etched-black-5.jpg",
        ],
      },
      {
        id: "purple",
        label: "퍼플",
        images: [
          "/goods/tumbler/etched-purple-1.jpg",
          "/goods/tumbler/etched-purple-2.jpg",
          "/goods/tumbler/etched-purple-3.jpg",
          "/goods/tumbler/etched-purple-4.jpg",
          "/goods/tumbler/etched-purple-5.jpg",
        ],
      },
    ],
  },
];
