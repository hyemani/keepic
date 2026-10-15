// 표지(뒤표지 | 책등 | 앞표지)에서 "책등 쪽 여백"과 "책등 이음띠"를 정하는 순수 계산이에요(2026-10, 45차 → 46차에서 요소별 규칙으로 세분화).
// 화면 편집기·인쇄 PDF·인쇄 미리보기·디자인 카드가 모두 같은 값을 읽어요. 이 파일은 다른 lib를 불러오지 않아요(순환 방지).
//
// ⚠ 인쇄소 확인 전 값이에요 — UNVERIFIED_PRINTER_SPEC
//  · 확인된 책등 폭은 "소프트커버 20쪽 7.22mm"와 "하드커버 20쪽 9.1mm" 두 개뿐이에요(lib/photobookPricing.ts CONFIRMED_SPINE_WIDTHS_MM).
//    그 밖의 쪽 수는 간편 공식(평량×쪽수×0.6÷1000 + 여유 최대 1mm) "예상치"라서 실제 책등과 다를 수 있어요(이 공식은 20쪽에서도 실측과 3mm 넘게 어긋나요).
//  · 아래 28mm / 22mm / 20mm / 5mm는 "디자인 값"이에요. 인쇄소가 정한 규격이 아니고, 인쇄 최종값으로 보여주면 안 돼요(화면 문구에도 "확정"이라고 쓰지 않아요).
export const UNVERIFIED_PRINTER_SPEC = true;

// ── 28mm는 "무엇에서 무엇까지"의 거리인가요? ──────────────────────────────────────────────
//  표지 펼침면(왼→오):  [ 뒤표지 판 ][접힘선][ 책등 7.22mm ][접힘선][ 앞표지 판 ]
//                       0 ──────→ W │                       │ 0 ──────→ W      (W = 판 + 바깥쪽 도련, 책등 쪽에는 도련이 없어요)
//  · 앞표지 판의 왼쪽 끝(x=0)과 뒤표지 판의 오른쪽 끝(x=W)이 "책등 쪽 접힘선"(= 책등과 판이 만나는 경계)이에요. 판 좌표 0%도 바로 그 선이에요.
//  · 그래서 28mm = "접힘선(책등 경계)에서, 그 판 안쪽으로" 재는 거리예요. 책등 가운데에서 재는 값도, 도련·재단선에서 재는 값도 아니에요.
//    (책등 가운데에서 재면 28 + 책등폭/2 ≈ 31.6mm, 책등 전체를 건너 반대편 판에서 재면 책등폭만큼 더해져요 — 이 파일의 모든 값은 그 판 자기 접힘선 기준이에요.)
//  · 28mm = 접힘 안전 20mm(편집기 회색 "접힘·제본 경계"와 같은 값) + 숨 쉴 자리 8mm. 같은 판의 바깥쪽은 재단선에서 15mm(도련 5 + 15 = 판 가장자리에서 20mm)예요.
//
// ── 요소 종류별 규칙(46차) — 한 가지 값을 모든 요소에 똑같이 쓰지 않아요 ──────────────────────
//   text / logo        28mm  제목·문구·로고는 접히거나 책등에 눌리면 안 되는 "꼭 지킬 것"이에요.
//   photo-hero         28mm  표지의 주인공 사진 한 장(여백형·프레임형·타이틀 중심형 등).
//   photo-structure    22mm  디자인 구성의 일부인 사진 묶음(2장 이상 레이아웃, 폴라로이드·필름 틀 사진). 접힘 안전 20mm 아래로는 안 내려가요.
//                            바깥쪽 여백(재단선 15mm)과 좌우 균형을 맞추려고 28mm보다 조금 가깝게 허용해요.
//   sticker            20mm  장식 스티커(접힘 안전선까지).
//   photo-bleed         0mm  판 전체를 채우는 사진(전체 사진형) — 배경 역할이라 접힘선·도련까지 가요. 그 위의 글·로고는 여전히 28mm를 지켜요.
//   deco / background   0mm  색 띠·줄무늬·패턴·배경은 접힘선까지, 책등을 지나 이어져도 돼요(재단선 밖 도련 안에서만).
// 역할을 알 수 없는 요소는 COVER_SPINE_CLEARANCE_MM(28mm)을 그대로 써요.
//
// ── 왜 필요한가요? ────────────────────────────────────────────────────────────────────
//  - 표지 펼침면에서 책등은 아주 얇아요(소프트커버 20쪽 7.22mm, 하드커버 9.1mm). 접히는 자리(책등 경계)에서 20mm(도련 5 + 안전 15)는
//    "잘리거나 접혀서 안 보일 수 있는" 한계선이지, "보기 좋은 간격"이 아니에요. 그 선에 글자·사진이 딱 붙어 있으면 책을 덮었을 때 책등에 눌려 답답해 보여요.
//  - 좌우 분할 같은 표지 배경은 책등 가운데에서 색이 뚝 바뀌어 "낱장 두 장을 붙인" 것처럼 보였어요. 책등보다 조금 넓은 이음띠로 이어서 한 장짜리 표지로 보이게 해요(좌우 분할 구조인 표지에서만).

/** 접히는 곳 안전 여백(mm): 편집기 회색 "접힘·제본 경계"와 같은 값(lib/designKit.ts FOLD_SAFE_MM와 같아요). 디자인 값이에요(인쇄소 확인 전). */
export const COVER_FOLD_SAFE_MM = 20;
/** 접힘 안전 위에 더하는 "숨 쉴 자리"(mm). 소프트 책등(7.2mm)·하드 책등(9.1mm)과 비슷한 크기. 디자인 값이에요(인쇄소 확인 전). */
export const COVER_SPINE_BREATHING_MM = 8;
/** 글·로고·주인공 사진이 책등 쪽 접힘선에서 최소한 떨어질 거리(mm). 역할을 모르는 요소의 기본값이기도 해요. */
export const COVER_SPINE_CLEARANCE_MM = COVER_FOLD_SAFE_MM + COVER_SPINE_BREATHING_MM; // 28
/** 구성의 일부인 사진(photo-structure)이 접힘 안전 20mm 위에 더하는 작은 여유(mm). */
export const COVER_STRUCTURE_EXTRA_MM = 2;
/** 이음띠가 책등 양옆으로 더 나오는 폭(mm). 제본 오차(±1~2mm)를 덮고도 사진·글 자리(28mm)보다 훨씬 안쪽이에요. */
export const COVER_SPINE_BAND_OVERHANG_MM = 5;

/** 표지 안 요소의 종류. 종류마다 책등 쪽 접힘선에서 떨어질 최소 거리가 달라요(위 주석 표). */
export type CoverElementRole = "text" | "logo" | "photo-hero" | "photo-structure" | "photo-bleed" | "sticker" | "deco" | "background";

export const COVER_ROLE_CLEARANCE_MM: Readonly<Record<CoverElementRole, number>> = {
  text: COVER_SPINE_CLEARANCE_MM,
  logo: COVER_SPINE_CLEARANCE_MM,
  "photo-hero": COVER_SPINE_CLEARANCE_MM,
  "photo-structure": COVER_FOLD_SAFE_MM + COVER_STRUCTURE_EXTRA_MM, // 22
  sticker: COVER_FOLD_SAFE_MM, // 20
  "photo-bleed": 0,
  deco: 0,
  background: 0,
};

/** 요소 종류 → 책등 쪽 접힘선에서 최소 거리(mm). 종류를 모르면(undefined) 28mm예요. */
export function clearanceFor(role?: CoverElementRole): number {
  return role ? COVER_ROLE_CLEARANCE_MM[role] : COVER_SPINE_CLEARANCE_MM;
}

/** 이 역할이 "접힘 안전 20mm 아래로 내려가도 되는 장식·배경"인지(= 규칙 검사에서 20mm 미만을 허용하는지). */
export function mayTouchFold(role: CoverElementRole): boolean {
  return clearanceFor(role) < COVER_FOLD_SAFE_MM;
}

/**
 * 레이아웃 템플릿의 사진 칸들에서 역할을 추측해요(역할을 직접 정하지 않은 레이아웃용).
 *  · 칸 하나가 판 거의 전부(가로·세로 98% 이상)를 덮으면 photo-bleed(전체 사진형)
 *  · 칸이 2개 이상이면 photo-structure(묶음으로 디자인된 구성)
 *  · 칸 하나(여백형·프레임형 등)는 주인공 사진이라 photo-hero(28mm)
 * 추측할 수 없으면(칸 0개) undefined → 28mm.
 */
export function inferCoverPhotoRole(slots: readonly { xPct: number; yPct: number; widthPct: number; heightPct: number }[]): CoverElementRole | undefined {
  if (slots.length === 0) return undefined;
  if (slots.length >= 2) return "photo-structure";
  const s = slots[0];
  return s.widthPct >= 98 && s.heightPct >= 98 ? "photo-bleed" : "photo-hero";
}

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
