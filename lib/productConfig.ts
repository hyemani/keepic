import { phoneBrands, phoneModelsByBrand, caseTypes } from "./phoneCaseModels";

function buildPhoneCaseSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const caseType of caseTypes) {
    for (const material of caseType.materials) {
      for (const brand of phoneBrands) {
        for (const model of phoneModelsByBrand[brand.id]) {
          list.push({
            id: `${caseType.id}-${material.id}-${brand.id}-${model}`,
            label: `${brand.label} ${model} · ${caseType.label} · ${material.label}`,
            detail: `${caseType.productLabel} · ${brand.label} · ${material.label} · ${material.price.toLocaleString()}원`,
            aspect: "aspect-[75/163]",
          });
        }
      }
    }
  }
  return list;
}

export const productConfig = {
  "액자": {
    minPhotos: 1,
    maxPhotos: 1,
    sizes: [
      { id: "small", label: "스몰", detail: "13 x 18cm", aspect: "aspect-[13/18]" },
      { id: "medium", label: "미디엄", detail: "20 x 25cm", aspect: "aspect-[20/25]" },
      { id: "large", label: "라지", detail: "30 x 40cm", aspect: "aspect-[30/40]" },
    ],
  },
  "포토북": {
    minPhotos: 10,
    maxPhotos: 100,
    // 사이즈는 임시 견적 기준(완성 규격)이에요. lib/photobookPricing.ts와 함께 관리합니다.
    sizes: [
      { id: "S", label: "S", detail: "20 x 20cm", aspect: "aspect-square" },
      { id: "M", label: "M", detail: "25 x 25cm", aspect: "aspect-square" },
      { id: "L", label: "L", detail: "30 x 30cm", aspect: "aspect-square" },
    ],
  },
  "폰케이스": {
    minPhotos: 1,
    maxPhotos: 1,
    // 브랜드 × 자재종류 × 기종 조합을 사이즈 목록으로 관리합니다. lib/phoneCaseModels.ts에서 관리합니다.
    sizes: buildPhoneCaseSizes(),
  },
} as const;

export type ProductName = keyof typeof productConfig;
