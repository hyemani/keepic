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
} as const;

export type ProductName = keyof typeof productConfig;