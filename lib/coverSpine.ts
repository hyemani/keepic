// 표지(뒤표지 | 책등 | 앞표지)에서 "책등 쪽 여백"과 "책등 이음띠"를 정하는 순수 계산이에요(2026-10, 45차).
// 화면 편집기·인쇄 PDF·인쇄 미리보기·디자인 카드가 모두 같은 값을 읽어요. 이 파일은 다른 lib를 불러오지 않아요(순환 방지).
//
// 왜 필요한가요?
//  - 표지 펼침면에서 책등은 아주 얇아요(소프트커버 20쪽 7.22mm, 하드커버 9.1mm). 접히는 자리(책등 경계)에서 20mm(도련 5 + 안전 15)는
//    "잘리거나 접혀서 안 보일 수 있는" 한계선이지, "보기 좋은 간격"이 아니에요. 그 선에 글자·사진이 딱 붙어 있으면 책을 덮었을 때 책등에 눌려 답답해 보여요.
//  - 그래서 표지 디자인·표지 레이아웃은 책등 경계에서 COVER_SPINE_CLEARANCE_MM(=28mm) 이상 띄워요(= 접힘 안전 20mm + 숨 쉴 자리 8mm ≈ 책등 폭 한 개).
//  - 좌우 분할 같은 표지 배경은 책등 가운데에서 색이 뚝 바뀌어 "낱장 두 장을 붙인" 것처럼 보였어요. 책등보다 조금 넓은 이음띠로 이어서 한 장짜리 표지로 보이게 해요.

/** 접히는 곳 안전 여백(mm): 편집기 회색 "접힘·제본 경계"와 같은 값(lib/designKit.ts FOLD_SAFE_MM와 같아요). */
export const COVER_FOLD_SAFE_MM = 20;
/** 접힘 안전 위에 더하는 "숨 쉴 자리"(mm). 소프트 책등(7.2mm)·하드 책등(9.1mm)과 비슷한 크기. */
export const COVER_SPINE_BREATHING_MM = 8;
/** 표지 디자인·표지 레이아웃의 사진 칸·글·스티커가 책등 경계(접히는 선)에서 최소한 떨어질 거리(mm). */
export const COVER_SPINE_CLEARANCE_MM = COVER_FOLD_SAFE_MM + COVER_SPINE_BREATHING_MM; // 28
/** 이음띠가 책등 양옆으로 더 나오는 폭(mm). 제본 오차(±1~2mm)를 덮고도 사진·글 자리(28mm)보다 훨씬 안쪽이에요. */
export const COVER_SPINE_BAND_OVERHANG_MM = 5;

export type SpineBandMm = { x0: number; x1: number; spineX0: number; spineX1: number };

/** 표지 펼침면(도련 포함 전체 폭 totalWmm, 책등 폭 spineMm, 뒤·앞 칸이 같은 폭) 안에서 이음띠의 mm 위치. */
export function spineBandMm(totalWmm: number, spineMm: number, overhangMm: number = COVER_SPINE_BAND_OVERHANG_MM): SpineBandMm {
  const c = totalWmm / 2;
  const half = Math.max(0, spineMm) / 2;
  return { x0: c - half - overhangMm, x1: c + half + overhangMm, spineX0: c - half, spineX1: c + half };
}

type Slot = { xPct: number; yPct: number; widthPct: number; heightPct: number };

/** 한 판(앞/뒤표지 칸, 도련 포함 폭 panelWmm)에서 책등 쪽 여백(%). */
export function spineClearancePct(panelWmm: number, clearanceMm: number = COVER_SPINE_CLEARANCE_MM): number {
  return panelWmm > 0 ? (clearanceMm / panelWmm) * 100 : 0;
}

/**
 * 레이아웃 칸 묶음을 책등 쪽 여백 안으로 들어가지 않게 "한꺼번에" 옮겨요(칸마다 따로 자르면 같은 폭 칸이 제각각이 되어서, 내지 안전영역과 같은 방식으로
 * 묶음 전체의 가장 책등 쪽 변을 기준으로 가로 방향을 같은 비율로 줄여요).
 * front: 책등은 왼쪽(0%), back: 책등은 오른쪽(100%). 이미 여백이 충분한 레이아웃은 그대로(no-op)예요.
 */
export function clampSlotsToSpineClearance<T extends Slot>(slots: readonly T[], side: "front" | "back", panelWmm: number, clearanceMm: number = COVER_SPINE_CLEARANCE_MM): T[] {
  if (slots.length === 0) return slots.slice();
  const c = spineClearancePct(panelWmm, clearanceMm);
  if (c <= 0) return slots.slice();
  if (side === "front") {
    const minX = Math.min(...slots.map((s) => s.xPct));
    if (minX >= c - 1e-6) return slots.slice();
    const maxX = Math.max(...slots.map((s) => s.xPct + s.widthPct));
    const span = maxX - minX;
    if (span <= 1e-6) return slots.slice();
    const k = (maxX - c) / span; // minX→c, maxX→maxX
    return slots.map((s) => ({ ...s, xPct: c + (s.xPct - minX) * k, widthPct: Math.max(1, s.widthPct * k) }));
  }
  const maxX = Math.max(...slots.map((s) => s.xPct + s.widthPct));
  const limit = 100 - c;
  if (maxX <= limit + 1e-6) return slots.slice();
  const minX = Math.min(...slots.map((s) => s.xPct));
  const span = maxX - minX;
  if (span <= 1e-6) return slots.slice();
  const k = (limit - minX) / span; // minX→minX, maxX→limit
  return slots.map((s) => ({ ...s, xPct: minX + (s.xPct - minX) * k, widthPct: Math.max(1, s.widthPct * k) }));
}

/** 한 판(front/back) 안의 사각형들 중 책등 경계에서 가장 가까운 거리(mm). 회전은 호출하는 쪽에서 반영해서 넘겨요. */
export function minSpineClearanceMm(rects: readonly Slot[], side: "front" | "back", panelWmm: number): number {
  let min = Infinity;
  for (const r of rects) {
    const c = side === "front" ? (r.xPct * panelWmm) / 100 : ((100 - (r.xPct + r.widthPct)) * panelWmm) / 100;
    if (c < min) min = c;
  }
  return min;
}

// ---- 뒤표지 키픽 로고 자리 ----
// 인쇄(lib/printCompose.ts drawBackCoverLogo)와 같은 크기 규칙이에요: 너비 = 칸 너비의 34% × (scalePct/100), 높이 = 너비 ÷ 로고 가로세로비(1155:367).
const BACK_LOGO_ASPECT = 1155 / 367;
export type Rect4 = { xPct: number; yPct: number; widthPct: number; heightPct: number };

/** 뒤표지 칸(도련 포함) 기준 % 사각형. cellAspect = 칸 가로÷세로. */
export function backLogoRectPct(logo: { xPct: number; yPct: number; scalePct: number }, cellAspect: number): Rect4 {
  const widthPct = 34 * (logo.scalePct / 100);
  const heightPct = (widthPct * cellAspect) / BACK_LOGO_ASPECT;
  return { xPct: logo.xPct - widthPct / 2, yPct: logo.yPct - heightPct / 2, widthPct, heightPct };
}

/**
 * "사진 아래 문구 공간" 레이아웃이 만드는 빈 문구 글상자가 뒤표지 로고와 겹치지 않게 세로 범위를 줄여요(편집 화면의 "텍스트 입력" 안내 글자가 로고 위에 겹쳐 보이던 문제).
 * 로고가 글상자 아래쪽에 걸치면 로고 위까지만, 위쪽에 걸치면 로고 아래부터. 남는 높이가 minHeightPct보다 작으면 null(글상자를 만들지 않아요).
 */
export function captionAvoidLogo(slot: Rect4, logo: Rect4, gapPct = 1.5, minHeightPct = 6): Rect4 | null {
  const sTop = slot.yPct;
  const sBot = slot.yPct + slot.heightPct;
  const lTop = logo.yPct - gapPct;
  const lBot = logo.yPct + logo.heightPct + gapPct;
  const overlapX = slot.xPct < logo.xPct + logo.widthPct && slot.xPct + slot.widthPct > logo.xPct;
  if (!overlapX || lBot <= sTop || lTop >= sBot) return slot;
  const logoMid = logo.yPct + logo.heightPct / 2;
  const slotMid = (sTop + sBot) / 2;
  const next = logoMid >= slotMid ? { ...slot, heightPct: lTop - sTop } : { ...slot, yPct: lBot, heightPct: sBot - lBot };
  return next.heightPct >= minHeightPct ? next : null;
}
