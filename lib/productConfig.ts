import { phoneBrands, phoneModelsByBrand, caseTypes, coatings } from "./phoneCaseModels";
import { tumblerTypes } from "./tumblerModels";

function buildPhoneCaseSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const caseType of caseTypes) {
    for (const material of caseType.materials) {
      for (const coating of coatings) {
        for (const brand of phoneBrands) {
          for (const model of phoneModelsByBrand[brand.id]) {
            list.push({
              id: `${caseType.id}-${material.id}-${coating.id}-${brand.id}-${model}`,
              label: `${brand.label} ${model} · ${caseType.label} · ${material.label} · ${coating.label}`,
              detail: `${caseType.productLabel} · ${brand.label} · ${material.label} · ${coating.label} · ${material.price.toLocaleString()}원`,
              aspect: "aspect-[75/163]",
            });
          }
        }
      }
    }
  }
  return list;
}

function buildTumblerSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const type of tumblerTypes) {
    for (const color of type.colors) {
      list.push({
        id: `${type.id}-${color.id}`,
        label: `${type.label} · ${color.label}`,
        detail: `${type.productLabel} · ${type.capacity} · ${type.material} · 각인 영역 ${type.engraveArea} · ${type.price.toLocaleString()}원`,
        aspect: "aspect-[3/5]",
      });
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
  "텀블러": {
    minPhotos: 1,
    maxPhotos: 1,
    // 종류 × 색상 조합을 사이즈 목록으로 관리합니다. lib/tumblerModels.ts에서 관리합니다.
    sizes: buildTumblerSizes(),
  },
} as const;

export type ProductName = keyof typeof productConfig;
