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
      "무광코팅은 은은하고 차분한 느낌, 유광코팅은 선명하고 반짝이는 느낌을 줘요.",
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
