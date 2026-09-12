export type PhoneBrandId = "apple" | "samsung";

export const phoneBrands: { id: PhoneBrandId; label: string }[] = [
  { id: "apple", label: "애플" },
  { id: "samsung", label: "삼성" },
];

export const phoneModelsByBrand: Record<PhoneBrandId, string[]> = {
  apple: [
    "아이폰17e",
    "아이폰17Pro Max",
    "아이폰17Pro",
    "아이폰17",
    "아이폰16e",
    "아이폰16Pro Max",
    "아이폰16Pro",
    "아이폰16+",
    "아이폰16",
    "아이폰15Pro Max",
    "아이폰15Pro",
    "아이폰15+",
    "아이폰15",
    "아이폰14Pro Max",
    "아이폰14Pro",
    "아이폰14+",
    "아이폰14",
    "아이폰13Pro Max",
    "아이폰13Pro",
    "아이폰13Mini",
    "아이폰13",
    "아이폰12Pro Max",
    "아이폰12Pro",
    "아이폰12Mini",
    "아이폰12",
  ],
  samsung: [
    "갤럭시 S26Ultra",
    "갤럭시 S26+",
    "갤럭시 S26",
    "갤럭시 S25Ultra",
    "갤럭시 S25+",
    "갤럭시 S25",
    "갤럭시 S24Ultra",
    "갤럭시 S24+",
    "갤럭시 S24",
    "갤럭시 S23Ultra",
    "갤럭시 S23+",
    "갤럭시 S23",
  ],
};

export type CaseMaterialId = "normal" | "magsafe";

export type CaseTypeId = "premium" | "standard";

export const caseTypes: {
  id: CaseTypeId;
  label: string;
  productLabel: string;
  description: string[];
  materials: { id: CaseMaterialId; label: string; price: number }[];
}[] = [
  {
    id: "premium",
    label: "투명 젤하드 케이스",
    productLabel: "투명 젤하드 케이스",
    description: [
      "투명한 소재라 사진이나 문구가 또렷하게 비쳐 보여요.",
      "얇고 가벼운 두께로 핸드폰 본연의 디자인을 해치지 않아요.",
      "카메라 주변과 모서리를 감싸는 범퍼 디자인으로 충격에도 강해요.",
      "맥세이프케이스는 뒷면에 자석 링이 내장되어 있어",
      "맥세이프 액세서리를 그대로 사용하실 수 있어요.",
    ],
    materials: [
      { id: "normal", label: "일반케이스", price: 23000 },
      { id: "magsafe", label: "맥세이프케이스", price: 28000 },
    ],
  },
  {
    id: "standard",
    label: "하드케이스",
    productLabel: "하드케이스",
    description: [
      "불투명한 하드 소재 표면에 사진을 꽉 차게 인쇄해요.",
      "무광코팅은 은은하고 차분한 느낌,",
      "유광코팅은 선명하고 반짝이는 느낌을 줘요.",
      "튼튼한 하드 소재라 스크래치와 충격에 강해요.",
      "맥세이프케이스는 뒷면에 자석 링이 내장되어 있어",
      "맥세이프 액세서리를 그대로 사용하실 수 있어요.",
    ],
    materials: [
      { id: "normal", label: "일반케이스", price: 29000 },
      { id: "magsafe", label: "맥세이프케이스", price: 34000 },
    ],
  },
];

export type CoatingId = "matte" | "glossy";

export const coatings: { id: CoatingId; label: string }[] = [
  { id: "matte", label: "무광코팅" },
  { id: "glossy", label: "유광코팅" },
];

// 하드케이스(불투명) 전용 배경색상 옵션이에요.
// 맨 위 5개는 실제 제작 예시 사진에서 쓰인 색이라 "추천 색상"으로 보여줘요.
export type CaseColor = { id: string; label: string; hex: string };

export const caseColorPresets: CaseColor[] = [
  { id: "sample-sky", label: "하늘색", hex: "#9eccee" },
  { id: "sample-yellow", label: "옐로우", hex: "#edd899" },
  { id: "sample-teal", label: "틸블루", hex: "#549cb3" },
  { id: "sample-pink", label: "코랄핑크", hex: "#f0b0a9" },
  { id: "sample-green", label: "세이지그린", hex: "#91957a" },
  { id: "black", label: "블랙", hex: "#1a1a1a" },
  { id: "gray", label: "그레이", hex: "#9a9a9a" },
  { id: "lightgray", label: "라이트그레이", hex: "#d9d9d9" },
  { id: "white", label: "화이트", hex: "#ffffff" },
  { id: "hotpink", label: "핫핑크", hex: "#e0447e" },
  { id: "pink", label: "핑크", hex: "#f2a0c1" },
  { id: "palepink", label: "페일핑크", hex: "#f8d3e0" },
  { id: "red", label: "레드", hex: "#e0332f" },
  { id: "coral", label: "코랄", hex: "#f2755a" },
  { id: "orange", label: "오렌지", hex: "#f2941f" },
  { id: "peach", label: "피치", hex: "#f6c89a" },
  { id: "yellow", label: "옐로우", hex: "#f6e04b" },
  { id: "lemon", label: "레몬", hex: "#f2ee9b" },
  { id: "lime", label: "라임", hex: "#b6d44e" },
  { id: "green", label: "그린", hex: "#4a9c4a" },
  { id: "mint", label: "민트", hex: "#7fd1a8" },
  { id: "teal", label: "틸", hex: "#3a9aa0" },
  { id: "skyblue", label: "스카이블루", hex: "#8fc7ee" },
  { id: "blue", label: "블루", hex: "#3468c4" },
  { id: "navy", label: "네이비", hex: "#26327a" },
  { id: "lavender", label: "라벤더", hex: "#a6a0d6" },
  { id: "purple", label: "퍼플", hex: "#7c4fa8" },
  { id: "brown", label: "브라운", hex: "#8a5a3c" },
];
