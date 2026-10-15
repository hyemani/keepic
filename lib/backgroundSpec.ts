// 배경 "설정값" 하나(BackgroundSpec)와, 그걸 화면 CSS / 인쇄 Canvas / 썸네일에 똑같이 그려주는 함수들이에요.
//
// 왜 따로 만들었나: 옛 방식은 "단색 hex 하나 + 무늬 id 하나"뿐이라 (1) 무늬 색·크기를 못 바꾸고 (2) 왼쪽/오른쪽
// 낱장마다 다른 배경을 못 줬어요. 그래서 설정값을 BackgroundSpec으로 넓히되, 옛 저장 파일(backgroundColor /
// backgroundPattern / coverPatternId …)은 그대로 읽어요 — 새 필드가 없으면 예전과 똑같이 보이고 인쇄돼요.
//
// 그리는 방법은 하나예요: drawBackgroundSpecOnCanvas(= lib/backgroundPatterns.ts의 drawBackgroundPatternOnCanvas)
// 가 화면(미리보기·썸네일)과 인쇄 PDF를 같이 그려요. 화면은 이 Canvas 결과를 이미지로 만들어 CSS 배경으로 깔아요.
import {
  drawBackgroundPatternOnCanvas,
  findBackgroundPattern,
  type BackgroundPatternPreset,
} from "@/lib/backgroundPatterns";

export type BackgroundKind = "solid" | "graphic" | "pattern" | "texture";

export type BackgroundSpec = {
  kind: BackgroundKind;
  // solid: 칠할 색. 그 외: 바탕색을 이 색으로 바꿔요(없으면 무늬 원래 색).
  color?: string;
  // 무늬(그래픽·패턴·텍스처) id — lib/backgroundPatterns.ts의 backgroundPatterns 중 하나.
  presetId?: string;
  // 무늬(포인트) 색을 바꿔요(없으면 무늬 원래 색).
  accent?: string;
  // 반복 무늬(점·줄·격자·체크…)의 간격(mm)을 바꿔요(없으면 무늬 원래 간격).
  scaleMm?: number;
  // "page": 이 낱장(앞표지·뒤표지·책등·왼쪽/오른쪽 한 면)만 기준으로 그려요. "whole"(기본): 펼침면 전체
  // (내지 한 펼침, 또는 표지 전체)를 기준으로 하나로 이어서 그려요(그라데이션·그래픽·무늬 위상이 가운데에서 이어져요).
  span?: "page" | "whole";
};

export const WHITE_SPEC: BackgroundSpec = { kind: "solid", color: "#ffffff" };

export type CoverBackgrounds = {
  whole?: BackgroundSpec;
  front?: BackgroundSpec;
  back?: BackgroundSpec;
  spine?: BackgroundSpec;
  // 46차: true면 책등 단색(spine)이 앞·뒤표지 쪽으로 COVER_SPINE_BAND_OVERHANG_MM(5mm)씩 더 나와요. 좌우 투톤 표지 디자인이 켜요(없으면 예전과 똑같아요).
  spineBridge?: boolean;
};

/** 책등 이음띠를 그릴 색(꺼져 있거나 책등이 단색이 아니면 undefined). 화면·인쇄가 같이 읽어요. */
export function spineBridgeColor(cb: CoverBackgrounds | undefined): string | undefined {
  if (!cb?.spineBridge) return undefined;
  const sp = cb.spine;
  if (!sp || sp.kind !== "solid") return undefined;
  return sp.color ?? "#ffffff";
}

export function resolveCoverPanelSpec(
  cb: CoverBackgrounds | undefined,
  panel: "front" | "back" | "spine"
): BackgroundSpec | undefined {
  if (!cb) return undefined;
  return cb[panel] ?? cb.whole;
}

export function resolveSpreadSideSpec(
  spread: { background?: BackgroundSpec; backgroundLeft?: BackgroundSpec; backgroundRight?: BackgroundSpec },
  side: "left" | "right"
): BackgroundSpec | undefined {
  return (side === "left" ? spread.backgroundLeft : spread.backgroundRight) ?? spread.background;
}

// 설정값 + 무늬 기본값 → 실제로 그릴 무늬(바탕색·포인트색·간격을 덮어쓴 것). solid거나 무늬를 못 찾으면 undefined.
export function effectivePreset(spec: BackgroundSpec): BackgroundPatternPreset | undefined {
  if (spec.kind === "solid") return undefined;
  const base = findBackgroundPattern(spec.presetId);
  if (!base) return undefined;
  return {
    ...base,
    colors: [spec.color ?? base.colors[0], spec.accent ?? base.colors[1]],
    spacingMm: spec.scaleMm ?? base.spacingMm,
  };
}

// 옛 저장 파일의 (단색 hex, 무늬 id) 쌍을 설정값으로 읽어요(무늬가 우선, 둘 다 없으면 undefined = 흰색).
export function specFromLegacy(color?: string, patternId?: string): BackgroundSpec | undefined {
  const preset = findBackgroundPattern(patternId);
  if (preset) return { kind: preset.category, presetId: preset.id };
  if (color) return { kind: "solid", color };
  return undefined;
}

export function solidColorOf(spec: BackgroundSpec | undefined): string {
  if (!spec) return "#ffffff";
  if (spec.kind === "solid") return spec.color ?? "#ffffff";
  return effectivePreset(spec)?.colors[0] ?? "#ffffff";
}

type Mm = { x: number; y: number; w: number; h: number };

// spec을 Canvas의 (x,y,w,h)에 그려요. fullSpan은 펼침면 전체(px)예요. 인쇄 PDF와 화면 이미지가 같이 써요.
export function drawBackgroundSpecOnCanvas(
  ctx: CanvasRenderingContext2D,
  spec: BackgroundSpec,
  x: number,
  y: number,
  w: number,
  h: number,
  mmToPxFn: (mm: number) => number,
  fullSpan?: { x: number; y: number; w: number; h: number; spineW?: number }
) {
  const preset = effectivePreset(spec);
  if (!preset) {
    ctx.fillStyle = solidColorOf(spec);
    ctx.fillRect(x, y, w, h);
    return;
  }
  const span = spec.span === "page" ? { x, y, w, h } : fullSpan ?? { x, y, w, h };
  drawBackgroundPatternOnCanvas(ctx, preset, x, y, w, h, mmToPxFn, span, true);
}

// ---------- 화면용: spec → CSS background ----------
// 낱장(패널) 하나의 mm 위치·크기와, 그 낱장이 속한 펼침면(span)의 mm 위치·크기예요.
export type BackgroundGeomMm = {
  panelXmm: number; // 펼침면 왼쪽 끝에서 이 낱장 왼쪽 끝까지
  panelWmm: number;
  heightMm: number; // 낱장·펼침면 공통 높이
  spanWmm: number;
  spineWmm?: number; // 표지 펼침면일 때 책등 폭(mm) — 책등 이음띠(splitSpine)만 읽어요
};

const urlCache = new Map<string, string>();

export function renderBackgroundDataUrl(spec: BackgroundSpec, geom: BackgroundGeomMm, ppmWanted = 3.5): string | null {
  if (typeof document === "undefined") return null;
  const preset = effectivePreset(spec);
  if (!preset) return null;
  const ppm = Math.min(ppmWanted, 2400 / Math.max(1, geom.panelWmm), 2400 / Math.max(1, geom.heightMm));
  const key = JSON.stringify([spec, geom, Math.round(ppm * 1000)]);
  const hit = urlCache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = Math.max(2, Math.round(geom.panelWmm * ppm));
  cv.height = Math.max(2, Math.round(geom.heightMm * ppm));
  const ctx = cv.getContext("2d");
  if (!ctx) return null;
  const span: Mm & { spineW?: number } = { x: -geom.panelXmm * ppm, y: 0, w: geom.spanWmm * ppm, h: geom.heightMm * ppm, ...(geom.spineWmm ? { spineW: geom.spineWmm * ppm } : {}) };
  drawBackgroundSpecOnCanvas(ctx, spec, 0, 0, cv.width, cv.height, (mm) => mm * ppm, span);
  const url = cv.toDataURL(preset.kind === "paper" || preset.kind === "linen" || preset.kind === "watercolor" ? "image/jpeg" : "image/png", 0.92);
  if (urlCache.size > 60) urlCache.delete(urlCache.keys().next().value as string);
  urlCache.set(key, url);
  return url;
}

export function backgroundSpecToCss(spec: BackgroundSpec | undefined, geom: BackgroundGeomMm): string {
  if (!spec) return "#ffffff";
  if (spec.kind === "solid") return spec.color ?? "#ffffff";
  const g: BackgroundGeomMm =
    spec.span === "page" ? { ...geom, panelXmm: 0, spanWmm: geom.panelWmm } : geom;
  const url = renderBackgroundDataUrl(spec, g);
  return url ? `url("${url}") 0 0 / 100% 100% no-repeat, ${solidColorOf(spec)}` : solidColorOf(spec);
}
