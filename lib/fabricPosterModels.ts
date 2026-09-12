// 패브릭 포스터: 규격(5) × 원단(4) × 행잉 가공(4, 필수) × 테두리 가공(4, 선택 · 기본값 "가공 없음") 조합으로 관리해요.
// 1개당 판매가 = 규격 기본 판매가 + 원단 차액 + 행잉 가공비 + 테두리 가공비

export type FabricPosterSizeId =
  | "700x1000"
  | "750x750"
  | "800x1400"
  | "900x1200"
  | "1000x1300";

export const fabricPosterSizes: {
  id: FabricPosterSizeId;
  label: string;
  width: number;
  height: number;
  price: number;
  aspect: string;
}[] = [
  { id: "700x1000", label: "700 × 1000mm", width: 700, height: 1000, price: 55000, aspect: "aspect-[7/10]" },
  { id: "750x750", label: "750 × 750mm", width: 750, height: 750, price: 45000, aspect: "aspect-square" },
  { id: "800x1400", label: "800 × 1400mm", width: 800, height: 1400, price: 79000, aspect: "aspect-[4/7]" },
  { id: "900x1200", label: "900 × 1200mm", width: 900, height: 1200, price: 77000, aspect: "aspect-[3/4]" },
  { id: "1000x1300", label: "1000 × 1300mm", width: 1000, height: 1300, price: 99000, aspect: "aspect-[10/13]" },
];

// 규격 기본 판매가는 면 10수 화이트 기준이에요. 원단을 바꾸면 아래 차액만큼 더하거나 빼요.
export type FabricPosterFabricId = "cotton10" | "cotton20" | "cotton40" | "cotton60";

export const fabricPosterFabrics: {
  id: FabricPosterFabricId;
  label: string;
  priceDelta: number;
  desc: string;
}[] = [
  { id: "cotton10", label: "면 10수 화이트", priceDelta: 0, desc: "사선으로 짜인 트윌 원단으로, 도톰하고 탄탄한 느낌입니다." },
  { id: "cotton20", label: "면 20수 화이트", priceDelta: -2000, desc: "10수보다 얇은 평직 원단으로, 먼지 날림이 적고 통기성이 있습니다." },
  { id: "cotton40", label: "면 40수 화이트", priceDelta: 1000, desc: "60수보다 도톰하고 부드러운 평직 원단입니다." },
  { id: "cotton60", label: "면 60수 화이트", priceDelta: 0, desc: "네 가지 중 가장 얇은 평직 원단으로, 비침이 있습니다." },
];

// 행잉 가공은 필수 옵션이에요. 원하는 설치 방식에 맞게 골라주세요.
export type FabricPosterHangingId = "rod-plain" | "rod-loop" | "small-ring" | "velcro";

export const fabricPosterHangingOptions: {
  id: FabricPosterHangingId;
  label: string;
  price: number;
  desc: string;
  image: string;
}[] = [
  {
    id: "rod-plain",
    label: "봉 일반",
    price: 3000,
    desc: "원단 상단을 접어 만든 통로에 봉을 끼워 사용해요. 앞에서는 봉이 원단에 가려져요.",
    image: "/goods/fabric-poster/detail-06.jpg",
  },
  {
    id: "rod-loop",
    label: "봉 고리형",
    price: 5000,
    desc: "원단 위쪽에 달린 여러 개의 고리에 봉을 끼워 사용해요. 고리 사이로 봉이 보여요.",
    image: "/goods/fabric-poster/detail-07.jpg",
  },
  {
    id: "small-ring",
    label: "작은고리",
    price: 3000,
    desc: "원단 모서리의 작은 리본 고리를 걸이에 걸어 사용해요. 봉 없이 간편하게 걸 수 있어요.",
    image: "/goods/fabric-poster/detail-08.jpg",
  },
  {
    id: "velcro",
    label: "벨크로(찍찍이)",
    price: 4000,
    desc: "원단 상단 뒷면의 벨크로를 설치 면의 벨크로와 맞붙여요. 떼었다 붙일 수 있어요.",
    image: "/goods/fabric-poster/detail-09.jpg",
  },
];

// 테두리 가공은 필수가 아닌 선택 옵션이에요. 기본값은 "가공 없음"입니다.
export type FabricPosterEdgeId = "none" | "overlock-thin" | "overlock-thick" | "rolled-hem";

export const fabricPosterEdgeOptions: {
  id: FabricPosterEdgeId;
  label: string;
  price: number;
  desc: string;
}[] = [
  {
    id: "none",
    label: "가공 없음",
    price: 0,
    desc: "인쇄 후 재단만 진행하며, 사용하거나 세탁할 때 가장자리의 올이 풀릴 수 있습니다.",
  },
  {
    id: "overlock-thin",
    label: "얇은 오버로크(2mm)",
    price: 5000,
    desc: "원단 가장자리를 실로 감싸 봉제해 올 풀림을 줄이는 얇은 마감이에요.",
  },
  {
    id: "overlock-thick",
    label: "두꺼운 오버로크(4mm)",
    price: 5000,
    desc: "원단 가장자리를 실로 감싸 봉제해 올 풀림을 줄이는 두꺼운 마감이에요.",
  },
  {
    id: "rolled-hem",
    label: "말아박기(1cm)",
    price: 9000,
    desc: "가장자리를 1cm로 말아 박아 마감하는 방식이에요.",
  },
];

export const FABRIC_POSTER_DEFAULT_HANGING: FabricPosterHangingId = "rod-plain";
export const FABRIC_POSTER_DEFAULT_EDGE: FabricPosterEdgeId = "none";

export function calcFabricPosterUnitPrice(
  sizeId: FabricPosterSizeId,
  fabricId: FabricPosterFabricId,
  hangingId: FabricPosterHangingId,
  edgeId: FabricPosterEdgeId
) {
  const size = fabricPosterSizes.find((s) => s.id === sizeId)!;
  const fabric = fabricPosterFabrics.find((f) => f.id === fabricId)!;
  const hanging = fabricPosterHangingOptions.find((h) => h.id === hangingId)!;
  const edge = fabricPosterEdgeOptions.find((e) => e.id === edgeId)!;
  return size.price + fabric.priceDelta + hanging.price + edge.price;
}

// 상세 설명 이미지: 원단 → 사이즈 → 가공 → 주문 유의사항 순서예요.
export const fabricPosterDetailImages: string[] = [
  "/goods/fabric-poster/detail-02.jpg",
  "/goods/fabric-poster/detail-03.jpg",
  "/goods/fabric-poster/detail-04.jpg",
  "/goods/fabric-poster/detail-01.jpg",
  "/goods/fabric-poster/detail-05.jpg",
  "/goods/fabric-poster/detail-06.jpg",
  "/goods/fabric-poster/detail-07.jpg",
  "/goods/fabric-poster/detail-08.jpg",
  "/goods/fabric-poster/detail-09.jpg",
  "/goods/fabric-poster/detail-10.jpg",
  "/goods/fabric-poster/detail-11.jpg",
  "/goods/fabric-poster/detail-12.jpg",
  "/goods/fabric-poster/detail-13.jpg",
  "/goods/fabric-poster/detail-14.jpg",
  "/goods/fabric-poster/detail-15.jpg",
  "/goods/fabric-poster/detail-16.jpg",
  "/goods/fabric-poster/detail-17.jpg",
  "/goods/fabric-poster/detail-18.jpg",
];

export const fabricPosterGalleryImages: string[] = [
  "/goods/fabric-poster/gallery-1.jpg",
  "/goods/fabric-poster/gallery-2.jpg",
  "/goods/fabric-poster/gallery-3.jpg",
  "/goods/fabric-poster/gallery-4.jpg",
  "/goods/fabric-poster/gallery-5.jpg",
];
