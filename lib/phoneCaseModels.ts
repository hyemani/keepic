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
  materials: { id: CaseMaterialId; label: string; price: number }[];
}[] = [
  {
    id: "premium",
    label: "투명 젤하드 케이스",
    productLabel: "투명 젤하드케이스 프리미엄",
    materials: [
      { id: "normal", label: "일반케이스", price: 23000 },
      { id: "magsafe", label: "맥세이프케이스", price: 28000 },
    ],
  },
  {
    id: "standard",
    label: "하드케이스",
    productLabel: "나만의 핸드폰 케이스",
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
