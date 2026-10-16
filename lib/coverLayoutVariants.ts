// 표지 "레이아웃" 탭의 사진 칸을 앞·뒤표지 판 안에 놓는 순수 계산이에요(화면 편집기·썸네일·적용·검사가 모두 이 파일을 읽어요).
//
// 50차(혜민님 요청): "레이아웃이 전부 책등에 붙어 있어요. 안내선에 맞춘 디자인으로 만들어주세요."
// 49차까지는 템플릿 칸(0~100%)을 판 전체에 깔고 가장자리 한 변씩만 당겼기 때문에 칸이 접힘선(책등)에 붙었어요.
// 이제는 레이아웃 전체를 "안전 상자"(안내선 안쪽: 책등 쪽 접힘선에서 20mm, 바깥쪽 재단선에서 15mm, 위아래 재단선에서 15mm — 편집기 점선 안내선과 같은 값,
// lib/designKit.ts coverDesignGeo)에 똑같은 비율로 줄여 넣어요. 칸 폭 비율·간격 비율·큰 사진/작은 사진 비율은 템플릿 그대로예요(한 변만 당기지 않아요).
// 뒤표지는 좌우가 거울이라 책등 쪽이 오른쪽이에요. 숫자(20mm 등)는 인쇄소 확인 전의 디자인 값이에요(UNVERIFIED_PRINTER_SPEC).
import type { LayoutSlot, PhotoLayoutTemplate } from "./photoLayoutTemplates";
import { HALF_LAYOUT_TEMPLATES, LISTED_HALF_LAYOUT_TEMPLATES } from "./photoLayoutTemplates";
import { COVER_SPINE_CLEARANCE_MM } from "./coverSpine";

const SAFE_EDGE_MM = 15; // 재단선 안쪽 안전 여백(= GUIDE_SAFETY_MARGIN_MM)

type Dims = { panelMm: number; bleedMm: number };

/** 표지 레이아웃 탭에 보여줄 목록 = 예전 목록(이름·순서·구성 모두 그대로, 45차 이전과 같아요). */
export function coverPanelTemplates(): PhotoLayoutTemplate[] {
  return LISTED_HALF_LAYOUT_TEMPLATES;
}

export function findCoverTemplate(id: string | undefined): PhotoLayoutTemplate | undefined {
  if (!id) return undefined;
  return HALF_LAYOUT_TEMPLATES.find((t) => t.id === id);
}

/** 안내선 안쪽 "안전 상자"(그 판 기준 %): 앞표지는 왼쪽이 책등, 뒤표지는 오른쪽이 책등이에요. */
export function coverSafeBoxPct(side: "front" | "back", dims: Dims): { x0: number; y0: number; x1: number; y1: number } {
  const W = dims.panelMm + dims.bleedMm;
  const H = dims.panelMm + dims.bleedMm * 2;
  const outerX = W > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / W) * 100 : 0;
  const spineX = W > 0 ? (COVER_SPINE_CLEARANCE_MM / W) * 100 : 0;
  const safeY = H > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / H) * 100 : 0;
  return {
    x0: side === "front" ? spineX : outerX,
    x1: side === "front" ? 100 - outerX : 100 - spineX,
    y0: safeY,
    y1: 100 - safeY,
  };
}

/** 템플릿 좌표(0~100%) 칸 하나를 안전 상자 안으로 똑같은 비율로 옮겨요(가로·세로 각각 균일 축소라 열 폭 비율·간격 비율이 그대로예요). */
export function fitSlotToCoverSafeBox(slot: LayoutSlot, side: "front" | "back", dims: Dims): LayoutSlot {
  const b = coverSafeBoxPct(side, dims);
  const bw = b.x1 - b.x0;
  const bh = b.y1 - b.y0;
  return {
    xPct: b.x0 + (slot.xPct / 100) * bw,
    yPct: b.y0 + (slot.yPct / 100) * bh,
    widthPct: (slot.widthPct / 100) * bw,
    heightPct: (slot.heightPct / 100) * bh,
  };
}

/**
 * 표지 판 하나(앞/뒤)에 레이아웃 칸이 실제로 놓일 자리(그 판 기준 %)예요(편집기·썸네일·적용 모두 이 값).
 * 레이아웃 탭의 목록 템플릿(half-*)은 템플릿 전체(0~100%)를 안전 상자에 균일하게 맞춰 넣어서, 모든 칸이 책등에서 20mm·바깥/위/아래 재단선에서 15mm 안쪽이에요.
 * 49차까지의 "책등 쪽 한 변만 당기기"(열 폭이 어긋나던 원인)는 이 경로에서 없앴어요.
 * 테마 표지 디자인("design:*" 합성 템플릿)은 이미 자기 안전영역(coverDesignGeo) 좌표라서 다시 줄이면 안 돼요 — 예전 계산(바깥 변만 안전선 보정)을 그대로 써요.
 */
export function placeCoverSlots(template: PhotoLayoutTemplate, side: "front" | "back", dims: Dims): LayoutSlot[] {
  if (isListedCoverTemplate(template)) return template.slots.map((s) => fitSlotToCoverSafeBox(s, side, dims));
  return clampDesignSlotsToCover(template.slots, side, dims);
}

function isListedCoverTemplate(t: PhotoLayoutTemplate): boolean {
  return HALF_LAYOUT_TEMPLATES.some((h) => h.id === t.id);
}

/** 테마 표지 디자인 칸(이미 안전영역 좌표)용 — 49차 이전과 똑같은 계산이에요(재단선에 닿은 변만 안전선으로, 접힘선에서 0.5~20mm 사이 변만 20mm로). */
function clampDesignSlotsToCover(slots: LayoutSlot[], side: "front" | "back", dims: Dims): LayoutSlot[] {
  const W = dims.panelMm + dims.bleedMm;
  const H = dims.panelMm + dims.bleedMm * 2;
  const sx = W > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / W) * 100 : 0;
  const sy = H > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / H) * 100 : 0;
  const spineX = W > 0 ? (COVER_SPINE_CLEARANCE_MM / W) * 100 : 0;
  const EPS = 0.5;
  const flushPct = W > 0 ? (0.5 / W) * 100 : EPS;
  return slots.map((s) => {
    let left = s.xPct;
    let right = s.xPct + s.widthPct;
    if (side === "front") {
      if (right >= 100 - EPS) right = Math.min(right, 100 - sx);
      if (left > flushPct) left = Math.max(left, spineX);
    } else {
      if (left <= EPS) left = Math.max(left, sx);
      if (right < 100 - flushPct) right = Math.min(right, 100 - spineX);
    }
    const top = s.yPct <= EPS ? Math.max(s.yPct, sy) : s.yPct;
    const bottom = s.yPct + s.heightPct >= 100 - EPS ? Math.min(s.yPct + s.heightPct, 100 - sy) : s.yPct + s.heightPct;
    return { xPct: left, yPct: top, widthPct: Math.max(1, right - left), heightPct: Math.max(1, bottom - top) };
  });
}

/**
 * "사진 아래 문구 공간" 레이아웃이 만드는 문구 칸을 표지 판 안에 맞춰요(원래는 0~100% 꽉 찬 칸이라 책등에 붙었어요).
 *  · 책등 쪽 가장자리 = 접힘선에서 20mm(안내선), 바깥쪽 = 재단선에서 15mm 안전선, 아래쪽도 안전선 안.
 *  · 이미 안쪽에 있는 칸은 그대로(안쪽으로만 당기고 바깥으로 넓히지 않아요).
 */
export function clampCaptionSlotToCover(slot: LayoutSlot, side: "front" | "back", dims: Dims): LayoutSlot {
  const W = dims.panelMm + dims.bleedMm;
  const H = dims.panelMm + dims.bleedMm * 2;
  const spinePct = W > 0 ? (COVER_SPINE_CLEARANCE_MM / W) * 100 : 0;
  const safeX = W > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / W) * 100 : 0;
  const safeY = H > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / H) * 100 : 0;
  const x0 = side === "front" ? spinePct : safeX;
  const x1 = side === "front" ? 100 - safeX : 100 - spinePct;
  const left = Math.max(slot.xPct, x0);
  const right = Math.min(slot.xPct + slot.widthPct, x1);
  return {
    ...slot,
    xPct: left,
    widthPct: Math.max(10, right - left),
    heightPct: Math.min(slot.heightPct, Math.max(4, 100 - safeY - slot.yPct)),
  };
}

/**
 * 새 앨범의 기본 표지 제목 칸(앞표지 판 기준 %): 원래 값은 왼쪽 8%·폭 84%(오른쪽 끝 92%)예요.
 * 판이 작아서 8%가 접힘선 20mm보다 책등 쪽이면(S 소프트 16.4mm 등) 왼쪽 끝만 20mm로 옮기고 오른쪽 끝(92%)은 그대로 둬요.
 * 8%가 이미 20mm 밖이면(M·L 등) 예전과 똑같아요. 새 앨범에만 쓰이고 저장된 앨범은 자기 값을 읽어요.
 */
export function defaultCoverTitleBox(dims: Dims): { xPct: number; widthPct: number } {
  const W = dims.panelMm + dims.bleedMm;
  const spinePct = W > 0 ? (COVER_SPINE_CLEARANCE_MM / W) * 100 : 0;
  const xPct = Math.max(8, Math.ceil(spinePct * 100) / 100); // 올림이라 20mm 안쪽으로 내려가지 않아요
  return { xPct, widthPct: Math.round((92 - xPct) * 100) / 100 };
}
