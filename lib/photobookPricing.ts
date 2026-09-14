// 포토북 가격/옵션 설정 (판매가 기준, 고객 화면에 노출되는 값)
//
// 이 파일은 나중에 자유롭게 수정하는 용도예요.
// - 아래 숫자는 전부 "임시 판매가"예요. 실제 견적(원가)이 바뀌면 여기 숫자를 업데이트해주세요.
// - 완성 규격(finishedSizeCm)과 제작 파일 규격(productionFileSizeMm)은
//   서로 다른 값이라 따로 관리해요. productionFileSizeMm은 레드프린팅 내지 작업
//   가이드 기준(재단 사이즈 + 사방 5mm 재단여유) 작업 사이즈예요.

export type PhotobookCoverId = "soft" | "hard";
export type PhotobookSizeId = "S" | "M" | "L";
export type CoverCoatingId = "matte" | "glossy";
export type InnerPaperId = "glossy" | "luster";

// 판매 준비 상태: 실제 주문(결제)을 받을 수 있으면 true예요.
// 아래 가격은 여전히 임시 판매가 기준이라, 원가가 크게 바뀌면 이 파일의 가격표를 다시 확인해주세요.
export const isSalesOpen = true;

export const photobookCovers: { id: PhotobookCoverId; name: string }[] = [
  { id: "soft", name: "소프트커버" },
  { id: "hard", name: "하드커버" },
];

export type PhotobookSize = {
  id: PhotobookSizeId;
  label: string;
  // 견적서 기준 완성 규격 (임시). 주문 옵션 화면에는 이 값을 그대로 씁니다.
  finishedSizeCm: string;
  // 제작 파일 규격(작업 도면 mm) - 아직 업체 확인 전이라 비워둡니다.
  // 확인되는 대로 이 값을 채우고, 완성 규격과 혼동하지 않도록 유지하세요.
  productionFileSizeMm: string | null;
};

export const photobookSizes: PhotobookSize[] = [
  { id: "S", label: "S", finishedSizeCm: "20 x 20cm", productionFileSizeMm: "210 x 210mm" },
  { id: "M", label: "M", finishedSizeCm: "25 x 25cm", productionFileSizeMm: "260 x 260mm" },
  { id: "L", label: "L", finishedSizeCm: "30 x 30cm", productionFileSizeMm: "310 x 310mm" },
];

// 인쇄 파일 규격 (레드프린팅 작업 가이드 기준, 2026-09 확인)
// - 내지: 재단 사이즈(완성 규격) 기준 사방 5mm 재단여유를 더한 값이 작업(제작 파일) 사이즈예요.
//   예) L(30x30cm) 내지 → 재단 300x300mm / 작업 310x310mm.
// - 표지: 소프트커버는 사방 5mm, 하드커버는 사방 20mm(보드를 감싸는 여유) 재단여유가 붙어요.
//   하드커버 앞/뒤판은 내지보다 살짝 커요(레드프린팅 예시 기준 L: 내지 300mm → 하드커버 판 306mm,
//   한 변당 +3mm 여유). 책등(세네카) 폭은 페이지 수에 따라 달라지므로
//   calcEstimatedSpineWidthMm로 계산한 값을 그대로 써요.
export const printFileSpec = {
  innerTrimBleedMm: 5,
  softCoverBleedMm: 5,
  hardCoverWrapBleedMm: 20,
  hardCoverPanelOverhangMm: 3,
  // 책등(세네카) 전용 안전 여백이에요. 앞뒤 표지 안전 여백(GUIDE_SAFETY_MARGIN_MM, 8mm)을
  // 책등에 그대로 적용하면 책등이 좁을 때 음수가 되기 쉬워서, 책등만의 별도 값을 둬요.
  // 이 값에서 파생(예: 절반으로 자르기)하지 않고, 이 값 자체를 그대로 좌우에 적용해요.
  // ⚠️ 추정치예요 — 실제 제본 규격은 인쇄소 확인이 필요해요.
  spineSafetyMarginMm: 4,
  // 하드커버는 책등 양옆에 접히는 홈(그루브/힌지) 구조가 있어서, 소프트커버보다 더 넓은
  // 여백이 필요해요. spineSafetyMarginMm에 더해서 적용해요.
  // ⚠️ 추정치예요 — 실제 하드커버 제본 방식(그루브 폭 등) 확인이 필요해요.
  hardCoverSpineGrooveSafetyMm: 3,
};

// 커버 x 사이즈별 기본 판매가 (임시 판매가 — 특히 S 하드커버는 실제 견적 확인 전)
export const photobookBasePrice: Record<PhotobookCoverId, Record<PhotobookSizeId, number>> = {
  soft: { S: 69000, M: 79000, L: 89000 },
  hard: { S: 79000, M: 89000, L: 99000 },
};

// 기본 페이지 수 / 내지 장수 (1장 = 2페이지)
export const BASE_PAGES = 20;
export const BASE_SHEETS = 10;

// 최대 페이지 수는 설정값일 뿐, 업체에서 확정한 실제 주문 가능 최대치가 아니에요.
// 실제 최대치가 확인되면 이 값을 바꾸고 아래 note도 함께 정리해주세요.
export const MAX_PAGES = 60;
export const MAX_PAGES_NOTE = "실제 주문 가능한 최대 페이지 수는 제작처 확인 전이에요.";

// 2페이지 추가당 임시 판매 추가금 (Keepic 판매 추가금 — 제작처 실제 추가 단가와는 다른 값)
export const pageSurchargePerStep: Record<PhotobookSizeId, number> = {
  S: 5000,
  M: 5000,
  L: 7000,
};

export const coverCoatingOptions: {
  id: CoverCoatingId;
  name: string;
  description: string;
  surcharge: number;
}[] = [
  { id: "matte", name: "무광 코팅", description: "차분하고 은은한 표지 마감이에요.", surcharge: 0 },
  { id: "glossy", name: "유광 코팅", description: "광택이 도는 선명한 표지 마감이에요.", surcharge: 0 },
];
export const DEFAULT_COVER_COATING: CoverCoatingId = "matte";

export const innerPaperOptions: {
  id: InnerPaperId;
  name: string;
  spec: string;
  description: string;
  surcharge: number;
  weightG: number; // 평량(g) - 세네카(책등) 참고 계산에 사용
}[] = [
  {
    id: "glossy",
    name: "유광",
    spec: "285g · Glossy · 캐논 전용지",
    description: "광택 있는 표면으로 사진을 감상할 수 있어요.",
    surcharge: 0,
    weightG: 285,
  },
  {
    id: "luster",
    name: "반광",
    spec: "260g · Luster · 캐논 전용지",
    description: "은은한 광택의 표면으로 사진을 감상할 수 있어요.",
    surcharge: 0,
    weightG: 260,
  },
];
export const DEFAULT_INNER_PAPER: InnerPaperId = "glossy";

// 제작 사양 상세 (고객 상세 안내용 - "제작 사양 자세히 보기" 같은 곳에 노출)
export const productionSpec = {
  softCoverPrint: "소프트커버 표지: 아트지 300g / 단면 인쇄",
  hardCoverPrint: "하드커버 표지 인쇄지: 스노우 180g / 단면 인쇄 (표지 인쇄지 기준이며, 하드커버 전체 두께를 나타내지 않아요)",
  innerPrint: "내지 인쇄: 양면 8도",
  binding:
    "책을 펼쳤을 때 내지가 180도로 평평하게 펼쳐지는 레이플랫 제본이 모든 포토북에 기본 포함돼요. 두 페이지에 걸친 사진도 시원하게 감상할 수 있어, 여행 풍경이나 가족사진을 담기에 좋습니다.",
};

// 책등(세네카) 폭 참고 계산
//
// 레드프린팅의 공식 계산식/조합별 기준표는 아직 확인되지 않았어요.
// 대신 아래는 일반적으로 쓰이는 계산 공식이에요 (혜민님이 확인해준 자료 기준).
// - 기본 공식: (전체 페이지 수 ÷ 2) × 종이 1장의 두께(mm)
// - 간편 공식(종이 두께를 모를 때): 내지 평량(g) × 페이지 수 × 0.6 ÷ 1000
// 우리는 내지의 정확한 실측 두께(mm)를 모르고 평량(g)만 알고 있어서,
// 아래 계산은 간편 공식을 사용해요. 여기에 제본 여유치(0.5~1mm)를 더해
// "참고용 예상 범위"로 보여줍니다.
//
// 인쇄사·용지에 따라 실제 두께는 달라질 수 있어서, 이 값은 어디까지나 참고용
// 예상치예요. 실제 제작 파일을 넘기기 전에는 반드시 제작처(레드프린팅) 자체
// 계산기나 와우프레스 책등 계산기(https://wowpress.co.kr/ordr/prod/seneka) 같은
// 공식 도구로 다시 확인해주세요.

export const SPINE_BINDING_MARGIN_MM = { min: 0.5, max: 1 };
export const SPINE_CALCULATOR_REFERENCE_URL = "https://wowpress.co.kr/ordr/prod/seneka";
export const SPINE_REFERENCE_NOTE =
  "내지 평량 기준 간편 공식으로 계산한 참고용 예상치예요. 인쇄사·용지에 따라 실제 두께가 달라질 수 있어, 제작 전 제작처 계산기로 꼭 다시 확인해주세요.";

// 레드프린팅에 직접 확인받은 실측 책등(세네카) 폭이에요. (내지 10장·20페이지 기준, 2026-09 확인)
// 사이즈(S/M/L)에 관계없이 같은 값으로 측정됐어요. 페이지 수가 이 기준과 다르면
// 아직 실측값이 없어서, 그 경우에만 아래 간편 공식(참고용 예상치)으로 대신 계산해요.
// 다른 페이지 수 기준값도 확인되면 여기에 추가해주세요.
export const CONFIRMED_SPINE_WIDTHS_MM: Record<PhotobookCoverId, Record<number, number>> = {
  soft: { 20: 7.22 },
  hard: { 20: 9.1 },
};

function roundTo1Decimal(value: number) {
  return Math.round(value * 10) / 10;
}

export function calcEstimatedSpineWidthMm(
  paperWeightG: number,
  pages: number,
  cover?: PhotobookCoverId
) {
  const confirmedMm = cover ? CONFIRMED_SPINE_WIDTHS_MM[cover]?.[pages] : undefined;
  if (confirmedMm !== undefined) {
    return { estimateMm: confirmedMm, minMm: confirmedMm, maxMm: confirmedMm, isConfirmed: true as const };
  }

  const raw = (paperWeightG * pages * 0.6) / 1000;
  return {
    estimateMm: roundTo1Decimal(raw),
    minMm: roundTo1Decimal(raw + SPINE_BINDING_MARGIN_MM.min),
    maxMm: roundTo1Decimal(raw + SPINE_BINDING_MARGIN_MM.max),
    isConfirmed: false as const,
  };
}

export function calcPagesLabel(pages: number) {
  return `${pages}페이지 · 내지 ${pages / 2}장`;
}

export function calcPhotobookPrice({
  cover,
  size,
  pages,
  coverCoating,
  innerPaper,
}: {
  cover: PhotobookCoverId;
  size: PhotobookSizeId;
  pages: number;
  coverCoating: CoverCoatingId;
  innerPaper: InnerPaperId;
}) {
  const basePrice = photobookBasePrice[cover][size];
  const extraPages = Math.max(0, pages - BASE_PAGES);
  const pageSteps = Math.ceil(extraPages / 2);
  const pageSurcharge = pageSteps * pageSurchargePerStep[size];
  const coatingSurcharge =
    coverCoatingOptions.find((o) => o.id === coverCoating)?.surcharge ?? 0;
  const paperSurcharge =
    innerPaperOptions.find((o) => o.id === innerPaper)?.surcharge ?? 0;

  return {
    basePrice,
    pageSurcharge,
    coatingSurcharge,
    paperSurcharge,
    total: basePrice + pageSurcharge + coatingSurcharge + paperSurcharge,
  };
}
