// 사진 픽셀 보정 파이프라인 — 필터(흑백·따뜻함·차가움·빈티지·부드러움) + 보정(밝기·대비·채도·
// 색온도·하이라이트·그림자·선명도)을 "사진 픽셀에만" 적용하는 순수 계산이에요.
//
// 화면 미리보기·필터 썸네일·인쇄(PDF) 모두 이 파일의 같은 함수(applyPhotoEditToImageData)를
// 써요 — ctx.filter(Safari 미지원)나 CSS filter 에 기대지 않아서 어느 브라우저에서도 같은 수식이에요.
// 원본 파일/URL 은 절대 바꾸지 않아요: 보정값은 ImageBoxDef.photoFilter / photoAdjust 에 따로 저장되고,
// 그릴 때마다 원본에서 새로 계산한 "복사본 캔버스"에만 적용돼요(액자·테두리·스티커·글자에는 안 닿아요).
//
// 계산 순서(한 픽셀): 필터(강도만큼 섞기) → 색온도 → 그림자/하이라이트 → 밝기 → 대비 → 채도 → (이웃 픽셀 필요) 선명도.

export type PhotoFilterId = "original" | "bw" | "warm" | "cool" | "vintage" | "soft";

export type PhotoFilter = {
  id: PhotoFilterId;
  /** 0~100 — 필터를 얼마나 세게 섞을지(0이면 원본, 100이면 필터 100%). */
  strength: number;
};

export type PhotoAdjust = {
  brightness: number; // -100~100
  contrast: number; // -100~100
  saturation: number; // -100~100
  temperature: number; // -100(차갑게)~100(따뜻하게)
  highlights: number; // -100~100
  shadows: number; // -100~100
  sharpness: number; // 0~100
};

export const PHOTO_FILTER_OPTIONS: { id: PhotoFilterId; label: string }[] = [
  { id: "original", label: "원본" },
  { id: "bw", label: "흑백" },
  { id: "warm", label: "따뜻함" },
  { id: "cool", label: "차가움" },
  { id: "vintage", label: "빈티지" },
  { id: "soft", label: "부드러움" },
];

export const PHOTO_ADJUST_FIELDS: { key: keyof PhotoAdjust; label: string; min: number; max: number }[] = [
  { key: "brightness", label: "밝기", min: -100, max: 100 },
  { key: "contrast", label: "대비", min: -100, max: 100 },
  { key: "saturation", label: "채도", min: -100, max: 100 },
  { key: "temperature", label: "색온도", min: -100, max: 100 },
  { key: "highlights", label: "하이라이트", min: -100, max: 100 },
  { key: "shadows", label: "그림자", min: -100, max: 100 },
  { key: "sharpness", label: "선명도", min: 0, max: 100 },
];

export const DEFAULT_PHOTO_ADJUST: PhotoAdjust = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
};

const FILTER_IDS = new Set<string>(PHOTO_FILTER_OPTIONS.map((o) => o.id));

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 저장된 값(없거나 깨져 있어도 OK)을 안전한 필터 값으로 — 모르는 id 는 "원본" 으로. */
export function resolvePhotoFilter(f?: Partial<PhotoFilter> | null): PhotoFilter {
  const id = f && typeof f.id === "string" && FILTER_IDS.has(f.id) ? (f.id as PhotoFilterId) : "original";
  return { id, strength: clampNum(f?.strength, 0, 100, 100) };
}

export function resolvePhotoAdjust(a?: Partial<PhotoAdjust> | null): PhotoAdjust {
  const out = { ...DEFAULT_PHOTO_ADJUST };
  for (const fld of PHOTO_ADJUST_FIELDS) {
    out[fld.key] = clampNum(a?.[fld.key], fld.min, fld.max, 0);
  }
  return out;
}

/** 필터·보정이 전부 "아무 것도 안 바꾸는" 값이면 true — 이때는 원본을 그대로 그려요(계산 생략). */
export function isPhotoEditIdentity(f?: Partial<PhotoFilter> | null, a?: Partial<PhotoAdjust> | null): boolean {
  const rf = resolvePhotoFilter(f);
  const ra = resolvePhotoAdjust(a);
  const filterIdentity = rf.id === "original" || rf.strength <= 0;
  const adjustIdentity = PHOTO_ADJUST_FIELDS.every((fld) => ra[fld.key] === 0);
  return filterIdentity && adjustIdentity;
}

/** (사진, 값) 단위 캐시 키 — 같은 값이면 같은 문자열. */
export function photoEditKey(f?: Partial<PhotoFilter> | null, a?: Partial<PhotoAdjust> | null): string {
  const rf = resolvePhotoFilter(f);
  const ra = resolvePhotoAdjust(a);
  const fk = rf.id === "original" || rf.strength <= 0 ? "o" : `${rf.id}:${Math.round(rf.strength)}`;
  return `${fk}|${PHOTO_ADJUST_FIELDS.map((fld) => Math.round(ra[fld.key])).join(",")}`;
}

// ---------------------------------------------------------------------------------------------
// 픽셀 계산

type Plan = {
  filterCode: number; // 0 none, 1 bw, 2 warm, 3 cool, 4 vintage, 5 soft
  fs: number; // 0~1 필터 강도
  temp: number; // -1~1
  shadows: number; // -1~1
  highlights: number; // -1~1
  bright: number; // 밝기 가산(0~255 단위)
  contrastFactor: number;
  satFactor: number;
  hasAdjust: boolean;
  sharpAmount: number; // 0~
};

const FILTER_CODE: Record<PhotoFilterId, number> = { original: 0, bw: 1, warm: 2, cool: 3, vintage: 4, soft: 5 };

function makePlan(f: PhotoFilter, a: PhotoAdjust): Plan {
  const filterCode = f.strength > 0 ? FILTER_CODE[f.id] : 0;
  const c = a.contrast / 100;
  return {
    filterCode,
    fs: Math.min(1, Math.max(0, f.strength / 100)),
    temp: a.temperature / 100,
    shadows: a.shadows / 100,
    highlights: a.highlights / 100,
    bright: (a.brightness / 100) * 70,
    contrastFactor: 1 + c, // -100 → 0(회색 한 톤), 0 → 1, +100 → 2
    satFactor: 1 + a.saturation / 100, // -100 → 0(흑백), +100 → 2
    hasAdjust:
      a.temperature !== 0 || a.shadows !== 0 || a.highlights !== 0 || a.brightness !== 0 || a.contrast !== 0 || a.saturation !== 0,
    sharpAmount: (a.sharpness / 100) * 1.2,
  };
}

/** data(RGBA) 의 [fromPx, toPx) 픽셀에 필터+보정(이웃 필요 없는 것들)을 제자리에서 적용해요. */
function applyPointOps(data: Uint8ClampedArray, plan: Plan, fromPx: number, toPx: number): void {
  const { filterCode, fs, temp, shadows, highlights, bright, contrastFactor, satFactor, hasAdjust } = plan;
  if (filterCode === 0 && !hasAdjust) return;
  const tR = 1 + 0.18 * temp;
  const tB = 1 - 0.18 * temp;
  for (let i = fromPx * 4, end = toPx * 4; i < end; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1) 필터 — 결과를 원본과 강도(fs)만큼 섞어요.
    if (filterCode !== 0) {
      let fr = r;
      let fg = g;
      let fb = b;
      switch (filterCode) {
        case 1: {
          const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const v = (y - 128) * 1.08 + 128;
          fr = fg = fb = v;
          break;
        }
        case 2:
          fr = r * 1.1 + 6;
          fg = g * 1.03 + 2;
          fb = b * 0.86;
          break;
        case 3:
          fr = r * 0.88;
          fg = g;
          fb = b * 1.12 + 8;
          break;
        case 4: {
          const sr = 0.393 * r + 0.769 * g + 0.189 * b;
          const sg = 0.349 * r + 0.686 * g + 0.168 * b;
          const sb = 0.272 * r + 0.534 * g + 0.131 * b;
          fr = (r + (sr - r) * 0.7 - 128) * 0.9 + 128 + 12;
          fg = (g + (sg - g) * 0.7 - 128) * 0.9 + 128 + 12;
          fb = (b + (sb - b) * 0.7 - 128) * 0.9 + 128 + 12;
          break;
        }
        default: {
          // 부드러움: 대비를 낮추고 살짝 밝게, 채도 8% 줄임
          const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          const dr = y + (r - y) * 0.92;
          const dg = y + (g - y) * 0.92;
          const db = y + (b - y) * 0.92;
          fr = (dr - 128) * 0.85 + 128 + 10;
          fg = (dg - 128) * 0.85 + 128 + 10;
          fb = (db - 128) * 0.85 + 128 + 10;
          break;
        }
      }
      r += (fr - r) * fs;
      g += (fg - g) * fs;
      b += (fb - b) * fs;
    }

    if (hasAdjust) {
      // 2) 색온도
      if (temp !== 0) {
        r *= tR;
        b *= tB;
      }
      // 3) 그림자/하이라이트 — 밝기(L)에 따라 어두운 곳/밝은 곳에만 가산
      if (shadows !== 0 || highlights !== 0) {
        let L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (L < 0) L = 0;
        else if (L > 1) L = 1;
        const inv = 1 - L;
        const add = shadows * 60 * inv * inv + highlights * 60 * L * L;
        r += add;
        g += add;
        b += add;
      }
      // 4) 밝기
      if (bright !== 0) {
        r += bright;
        g += bright;
        b += bright;
      }
      // 5) 대비 (중간 회색 128 기준)
      if (contrastFactor !== 1) {
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;
      }
      // 6) 채도
      if (satFactor !== 1) {
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = y + (r - y) * satFactor;
        g = y + (g - y) * satFactor;
        b = y + (b - y) * satFactor;
      }
    }
    // Uint8ClampedArray 가 0~255 로 자르고 반올림해요.
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * 선명도(언샤프 마스크): out = v + amount × (v − 박스블러(v)). 블록(strip) 안의 [rowFrom,rowTo) 행에만 써요.
 * 블록 가장자리는 edge-clamp 라서, 이웃이 필요한 만큼(radius 행)의 여분(halo)을 포함해 호출해야 정확해요.
 */
function unsharp(data: Uint8ClampedArray, w: number, h: number, radius: number, amount: number, rowFrom: number, rowTo: number): void {
  if (amount <= 0 || radius < 1 || w < 1 || h < 1) return;
  const n = 2 * radius + 1;
  // 가로 박스블러 (Float32, RGB)
  const hb = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    const out = y * w * 3;
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += data[row + Math.min(w - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < w; x++) {
        hb[out + x * 3 + c] = sum / n;
        const add = Math.min(w - 1, x + 1 + radius);
        const sub = Math.max(0, x - radius);
        sum += data[row + add * 4 + c] - data[row + sub * 4 + c];
      }
    }
  }
  // 세로 박스블러(행 단위 슬라이딩) + 언샤프 적용
  const sumRow = new Float32Array(w * 3);
  const at = (yy: number) => Math.min(h - 1, Math.max(0, yy)) * w * 3;
  for (let k = -radius; k <= radius; k++) {
    const base = at(k);
    for (let j = 0; j < w * 3; j++) sumRow[j] += hb[base + j];
  }
  for (let y = 0; y < h; y++) {
    if (y >= rowFrom && y < rowTo) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const p = row + x * 4;
        const q = x * 3;
        const r0 = data[p];
        const g0 = data[p + 1];
        const b0 = data[p + 2];
        data[p] = r0 + amount * (r0 - sumRow[q] / n);
        data[p + 1] = g0 + amount * (g0 - sumRow[q + 1] / n);
        data[p + 2] = b0 + amount * (b0 - sumRow[q + 2] / n);
      }
    }
    const addB = at(y + 1 + radius);
    const subB = at(y - radius);
    for (let j = 0; j < w * 3; j++) sumRow[j] += hb[addB + j] - hb[subB + j];
  }
}

/** 선명도 반경(px) — 사진 긴 변의 1/1200(최소 1px). 화면용 축소본과 인쇄용 원본이 "같은 상대 크기"로 선명해져요. */
export function sharpRadiusFor(width: number, height: number): number {
  return Math.max(1, Math.round(Math.max(width, height) / 1200));
}

/**
 * ImageData 한 장 전체에 필터+보정을 제자리 적용해요(화면 미리보기·썸네일용).
 * radius 를 넘기면 그 값을, 아니면 ImageData 크기로 정해요.
 */
export function applyPhotoEditToImageData(
  img: ImageData,
  filter?: Partial<PhotoFilter> | null,
  adjust?: Partial<PhotoAdjust> | null,
  radius?: number
): ImageData {
  const f = resolvePhotoFilter(filter);
  const a = resolvePhotoAdjust(adjust);
  const plan = makePlan(f, a);
  applyPointOps(img.data, plan, 0, img.width * img.height);
  if (plan.sharpAmount > 0) {
    unsharp(img.data, img.width, img.height, radius ?? sharpRadiusFor(img.width, img.height), plan.sharpAmount, 0, img.height);
  }
  return img;
}

// ---------------------------------------------------------------------------------------------
// 캔버스 단위 렌더 (브라우저 전용)

export type PhotoEditRenderInfo = {
  srcW: number;
  srcH: number;
  outW: number;
  outH: number;
  downscaled: boolean;
  strips: number;
  radius: number;
  ms: number;
};

/** 최근 렌더 기록(검증·진단용, 최대 30개) — 인쇄가 실제로 몇 px 원본을 썼는지 확인하는 데 써요. */
export const photoEditRenderLog: PhotoEditRenderInfo[] = [];

/** 인쇄용 편집 캔버스 하나의 최대 픽셀 수(이보다 크면 비율을 지키며 줄여요 — Safari/iOS 캔버스 한도 대비 안전장치). */
export const PHOTO_EDIT_MAX_PIXELS = 36_000_000;

const STRIP_ROWS = 192;

/**
 * src(이미지/캔버스)에 필터+보정을 적용한 "새 캔버스"를 돌려줘요. src 는 안 바뀌어요.
 * 메모리를 아끼려고 STRIP_ROWS 행씩(선명도용 여분 행 포함) 나눠서 처리하고, 결과 캔버스에 조각을 이어 붙여요.
 * srcW×srcH 가 maxPixels 를 넘으면 비율을 지키며 줄여서 처리해요(downscaled=true).
 */
export function renderPhotoEditCanvas(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  filter?: Partial<PhotoFilter> | null,
  adjust?: Partial<PhotoAdjust> | null,
  opts?: { maxPixels?: number }
): HTMLCanvasElement {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const f = resolvePhotoFilter(filter);
  const a = resolvePhotoAdjust(adjust);
  const plan = makePlan(f, a);
  const maxPixels = opts?.maxPixels ?? PHOTO_EDIT_MAX_PIXELS;
  let w = Math.max(1, Math.round(srcW));
  let h = Math.max(1, Math.round(srcH));
  let downscaled = false;
  if (w * h > maxPixels) {
    const s = Math.sqrt(maxPixels / (w * h));
    w = Math.max(1, Math.floor(w * s));
    h = Math.max(1, Math.floor(h * s));
    downscaled = true;
  }
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const octx = out.getContext("2d")!;
  const radius = sharpRadiusFor(w, h);
  const halo = plan.sharpAmount > 0 ? radius : 0;
  const strip = document.createElement("canvas");
  strip.width = w;
  strip.height = Math.min(h, STRIP_ROWS + 2 * halo);
  const sctx = strip.getContext("2d", { willReadFrequently: true })!;
  sctx.imageSmoothingQuality = "high";
  const ratioY = srcH / h;
  let strips = 0;
  for (let y0 = 0; y0 < h; y0 += STRIP_ROWS) {
    const y1 = Math.min(h, y0 + STRIP_ROWS);
    const ya = Math.max(0, y0 - halo);
    const yb = Math.min(h, y1 + halo);
    const rows = yb - ya;
    sctx.clearRect(0, 0, strip.width, strip.height);
    sctx.drawImage(src, 0, ya * ratioY, srcW, rows * ratioY, 0, 0, w, rows);
    const id = sctx.getImageData(0, 0, w, rows);
    applyPointOps(id.data, plan, 0, w * rows);
    if (plan.sharpAmount > 0) unsharp(id.data, w, rows, radius, plan.sharpAmount, y0 - ya, y1 - ya);
    octx.putImageData(id, 0, ya, 0, y0 - ya, w, y1 - y0);
    strips++;
  }
  strip.width = 0;
  strip.height = 0;
  photoEditRenderLog.push({
    srcW,
    srcH,
    outW: w,
    outH: h,
    downscaled,
    strips,
    radius,
    ms: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0,
  });
  if (photoEditRenderLog.length > 30) photoEditRenderLog.shift();
  return out;
}
