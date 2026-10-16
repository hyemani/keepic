// 표지 "레이아웃" 탭의 사진 칸을 앞·뒤표지 판 안에 놓는 순수 계산이에요(화면 편집기·썸네일·적용·검사가 모두 이 파일을 읽어요).
//
// 48차(혜민님 요청): 46차에 더했던 새 구성(여백형·프레임형·타이틀 중심형·좌우 분할형)은 "사방을 20mm씩 안으로 넣은" 레이아웃이라 없앴어요.
// 표지 레이아웃 목록은 45차 이전(25ddee2)과 똑같이 기존 템플릿(꽉 채우기·사방 여백 등) 그대로이고, 각 레이아웃의 전체 크기·비율은 건드리지 않아요.
// 책등 쪽만 접힘 안전선(20mm)에 맞추고(= 책등에 붙은 칸·글만 보정), 바깥쪽은 원래 안전선(재단선에서 15mm)이에요.
// 숫자(20mm 등)는 인쇄소 확인 전의 디자인 값이에요(UNVERIFIED_PRINTER_SPEC).
import type { LayoutSlot, PhotoLayoutTemplate } from "./photoLayoutTemplates";
import { HALF_LAYOUT_TEMPLATES, LISTED_HALF_LAYOUT_TEMPLATES } from "./photoLayoutTemplates";
import { COVER_SPINE_CLEARANCE_MM } from "./coverSpine";

const SAFE_EDGE_MM = 15; // 재단선 안쪽 안전 여백(= GUIDE_SAFETY_MARGIN_MM)
/**
 * 책등 쪽 접힘선에 딱 붙어 시작하는 칸(꽉 채우기·2단·격자의 왼쪽 열 등, 접힘선까지 0mm)도 20mm 안내선으로 당길지 정해요.
 * true(48차 요청: "책등 쪽 사진 칸이 20mm 안내선을 넘으면 안 돼요")면 접힘선에서 20mm 안쪽으로 당기고(재단선 쪽을 안전선으로 당기던 것과 같은 방식), false면 붙은 칸은 예전처럼 접힘선까지 두고
 * "사방 여백" 계열처럼 어중간하게 가까운 칸(S 사이즈 16.4mm)만 20mm로 당겨요.
 */
export const CLAMP_FOLD_FLUSH_SLOTS = true;

type Dims = { panelMm: number; bleedMm: number };

/** 표지 레이아웃 탭에 보여줄 목록 = 예전 목록(이름·순서·구성 모두 그대로, 45차 이전과 같아요). */
export function coverPanelTemplates(): PhotoLayoutTemplate[] {
  return LISTED_HALF_LAYOUT_TEMPLATES;
}

export function findCoverTemplate(id: string | undefined): PhotoLayoutTemplate | undefined {
  if (!id) return undefined;
  return HALF_LAYOUT_TEMPLATES.find((t) => t.id === id);
}

/**
 * 표지 판 하나(앞/뒤)에 레이아웃 칸이 실제로 놓일 자리(그 판 기준 %)예요.
 *  · 재단선(트림) 쪽 가장자리에 닿은 변만 안전선(재단선 15mm 안)으로 당겨요 — 45차 이전(25ddee2)의 clampSlotToCoverSafety와 똑같아요. 이미 안쪽인 변은 그대로예요.
 *  · 48차: 책등 쪽 변은 접힘선에서 20mm(편집기 안내선)보다 가까우면 그 변만 20mm로 당겨요(책등에 붙거나 안내선을 넘는 칸). 이미 20mm 밖인 칸·다른 세 변·칸 크기 비율은 그대로예요
 *    (예: 소프트 S의 "사방 여백" 계열은 접힘선에서 16.4mm → 20mm, M·L은 20.4·24.4mm라 그대로).
 */
export function placeCoverSlots(template: PhotoLayoutTemplate, side: "front" | "back", dims: Dims): LayoutSlot[] {
  const raw: LayoutSlot[] = template.slots.map((s) => ({ ...s }));
  const W = dims.panelMm + dims.bleedMm;
  const H = dims.panelMm + dims.bleedMm * 2;
  const sx = W > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / W) * 100 : 0;
  const sy = H > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / H) * 100 : 0;
  const spineX = W > 0 ? (COVER_SPINE_CLEARANCE_MM / W) * 100 : 0; // 책등 쪽 접힘 안전(20mm)
  const EPS = 0.5;
  return raw.map((s) => {
    let left = s.xPct;
    let right = s.xPct + s.widthPct;
    if (side === "front") {
      if (right >= 100 - EPS) right = Math.min(right, 100 - sx);
      if (CLAMP_FOLD_FLUSH_SLOTS || left > EPS) left = Math.max(left, spineX);
    } else {
      if (left <= EPS) left = Math.max(left, sx);
      if (CLAMP_FOLD_FLUSH_SLOTS || right < 100 - EPS) right = Math.min(right, 100 - spineX);
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
