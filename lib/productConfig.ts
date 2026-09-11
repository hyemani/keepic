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
    sizes: [
      { id: "small", label: "스몰", detail: "15 x 15cm", aspect: "aspect-square" },
      { id: "medium", label: "미디엄", detail: "20 x 20cm", aspect: "aspect-square" },
      { id: "large", label: "라지", detail: "25 x 25cm", aspect: "aspect-square" },
    ],
  },
} as const;

export type ProductName = keyof typeof productConfig;