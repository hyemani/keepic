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

export const caseMaterials: { id: CaseMaterialId; label: string; price: number }[] = [
  { id: "normal", label: "일반케이스", price: 23000 },
  { id: "magsafe", label: "맥세이프케이스", price: 28000 },
];
