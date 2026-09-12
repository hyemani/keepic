import { phoneBrands, phoneModelsByBrand, caseTypes, coatings } from "./phoneCaseModels";
import { tumblerTypes } from "./tumblerModels";
import { ecobagShapes, ecobagFabrics, ecobagAddons } from "./ecobagModels";
import { mugTypes } from "./mugModels";
import { calendarShapes, ringColors, standColors } from "./calendarModels";

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

// 형태 × 원단 × 후가공(끈/라벨/포켓/자석 on-off) 조합을 사이즈 목록으로 관리합니다.
// 후가공 색상(끈/라벨 커스텀 색)은 자유 색상이라 사이즈 목록에 넣지 않고,
// 폰케이스 배경색상처럼 별도 메모(colorNote)로 전달해요.
function buildEcobagSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const shape of ecobagShapes) {
    for (const fabric of ecobagFabrics) {
      for (let strapOn = 0; strapOn < 2; strapOn++) {
        for (let labelOn = 0; labelOn < 2; labelOn++) {
          for (let pocketOn = 0; pocketOn < 2; pocketOn++) {
            for (let magnetOn = 0; magnetOn < 2; magnetOn++) {
              const flags = [
                strapOn && "strap",
                labelOn && "label",
                pocketOn && "pocket",
                magnetOn && "magnet",
              ].filter(Boolean) as string[];
              const addonLabels = ecobagAddons
                .filter((a) => flags.includes(a.id))
                .map((a) => a.label);
              const addonKey = flags.length ? flags.join("-") : "none";
              list.push({
                id: `${shape.id}-${fabric.id}-${addonKey}`,
                label: `${shape.label} · ${fabric.label}${
                  addonLabels.length ? " · " + addonLabels.join("/") : ""
                }`,
                detail: `${shape.detail} · ${fabric.label}${
                  addonLabels.length ? " · " + addonLabels.join(", ") : ""
                }`,
                aspect: shape.id === "horizontal" ? "aspect-[42/35]" : "aspect-[37/39]",
              });
            }
          }
        }
      }
    }
  }
  return list;
}

function buildMugSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const type of mugTypes) {
    for (const color of type.colors) {
      list.push({
        id: `${type.id}-${color.id}`,
        label: type.colors.length > 1 ? `${type.label} · ${color.label}` : type.label,
        detail: `${type.productLabel} · ${type.capacity} · ${type.size} · ${type.price.toLocaleString()}원`,
        aspect: "aspect-square",
      });
    }
  }
  return list;
}

function buildCalendarSizes() {
  const list: { id: string; label: string; detail: string; aspect: string }[] = [];
  for (const shape of calendarShapes) {
    for (const ring of ringColors) {
      for (const stand of standColors) {
        list.push({
          id: `${shape.id}-${ring.id}-${stand.id}`,
          label: `${shape.label} · ${ring.label} · ${stand.label}`,
          detail: `${shape.detail} · 트윈링 ${ring.label} · 삼각대 ${stand.label}`,
          aspect: "aspect-square",
        });
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
  "텀블러": {
    minPhotos: 1,
    maxPhotos: 1,
    // 종류 × 색상 조합을 사이즈 목록으로 관리합니다. lib/tumblerModels.ts에서 관리합니다.
    sizes: buildTumblerSizes(),
  },
  "에코백": {
    minPhotos: 1,
    maxPhotos: 1,
    // 형태 × 원단 × 후가공 조합을 사이즈 목록으로 관리합니다. lib/ecobagModels.ts에서 관리합니다.
    sizes: buildEcobagSizes(),
  },
  "머그": {
    minPhotos: 1,
    maxPhotos: 1,
    // 종류 × 색상(아이스 변색 컵만 해당) 조합을 사이즈 목록으로 관리합니다. lib/mugModels.ts에서 관리합니다.
    sizes: buildMugSizes(),
  },
  "캘린더": {
    // 아직 가격·이미지가 확정되지 않은 준비중 상품이에요. minPhotos/maxPhotos는
    // 12달 분량 사진을 가정한 임시값이고, 실제 구성이 정해지면 조정해주세요.
    minPhotos: 1,
    maxPhotos: 12,
    // 모양 × 트윈링 컬러 × 삼각대 색상 조합을 사이즈 목록으로 관리합니다. lib/calendarModels.ts에서 관리합니다.
    sizes: buildCalendarSizes(),
  },
} as const;

export type ProductName = keyof typeof productConfig;
