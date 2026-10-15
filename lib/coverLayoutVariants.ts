// 표지 "레이아웃" 탭의 사진 구성 후보(46차)와, 그 칸을 앞·뒤표지 판 안에 놓는 순수 계산이에요.
// "AI 맞춤 레이아웃"(lib/coverAutoLayout.ts)은 올린 사진을 보고 자동으로 하나를 고르고, 여기 있는 구성은 사용자가 직접 골라요 — 이미 직접 고친 표지는 어느 쪽도 덮어쓰지 않아요.
//
// 후보(앞표지 기준, 모두 "눈에 보이는 판"에서 mm로 여백을 맞춰요 — 판 크기(S/M/L·소프트/하드)가 달라도 좌우 여백이 같아요)
//   전체 사진형   기존 "꽉 채우기"(half-1-fill)를 표지에서 이렇게 불러요 — 사진이 판 전체(도련까지)를 덮어요(책등 쪽 여백 0, 글·로고만 28mm 지켜요)
//   여백형       cover-1-margin  접힘선에서 28mm, 재단선에서 28mm — 좌우 여백이 같은 한 장
//   프레임형     cover-1-frame   여백형보다 더 안쪽 + 가는 테두리선이 있는 액자 느낌
//   타이틀 중심형 cover-1-title   사진을 위쪽에 작게, 아래 40%를 제목 자리로 비워 둬요(제목 글상자는 안 만들어요 — 직접 쓰면 인쇄돼요)
//   좌우 분할형   cover-2-split   두 장을 나란히(접힘선에서 22mm = 구성 사진 규칙, lib/coverSpine.ts)
// 숫자(28·22mm 등)는 인쇄소 확인 전의 디자인 값이에요.
import type { LayoutSlot, PhotoLayoutTemplate } from "./photoLayoutTemplates";
import { HALF_LAYOUT_TEMPLATES, LISTED_HALF_LAYOUT_TEMPLATES } from "./photoLayoutTemplates";
import { clampSlotsToSpineClearance, clearanceFor, inferCoverPhotoRole, COVER_SPINE_CLEARANCE_MM, type CoverElementRole } from "./coverSpine";

const SAFE_EDGE_MM = 15; // 재단선 안쪽 안전 여백(= GUIDE_SAFETY_MARGIN_MM)

type Dims = { panelMm: number; bleedMm: number };

// 앞표지 판(왼쪽 끝 = 책등 쪽 접힘선) 기준 mm 사각형 → % 칸
function mmSlot(d: Dims, x0: number, y0: number, x1: number, y1: number): LayoutSlot {
  const W = d.panelMm + d.bleedMm;
  const H = d.panelMm + d.bleedMm * 2;
  return { xPct: (x0 / W) * 100, yPct: (y0 / H) * 100, widthPct: ((x1 - x0) / W) * 100, heightPct: ((y1 - y0) / H) * 100 };
}
const trimRight = (d: Dims) => d.panelMm; // = W - bleed : 재단선의 x 위치(판 왼쪽 끝=접힘선 기준)

const MARGIN_MM = COVER_SPINE_CLEARANCE_MM; // 28
const FRAME_MARGIN_MM = 32;
const STRUCTURE_MM = clearanceFor("photo-structure"); // 22

export const COVER_VARIANT_TEMPLATES: PhotoLayoutTemplate[] = [
  {
    id: "cover-1-margin",
    name: "여백형",
    photoCount: 1,
    scope: "half",
    coverRole: "photo-hero",
    slots: [{ xPct: 11, yPct: 11, widthPct: 76, heightPct: 67 }],
    coverBuild: (d) => {
      const H = d.panelMm + d.bleedMm * 2;
      return [mmSlot(d, MARGIN_MM, d.bleedMm + 24, trimRight(d) - MARGIN_MM, H * 0.78)];
    },
    titleZone: { yPct: 84, heightPct: 8 },
  },
  {
    id: "cover-1-frame",
    name: "프레임형",
    photoCount: 1,
    scope: "half",
    coverRole: "photo-hero",
    slots: [{ xPct: 12.5, yPct: 14, widthPct: 72, heightPct: 62 }],
    coverBuild: (d) => {
      const H = d.panelMm + d.bleedMm * 2;
      return [mmSlot(d, FRAME_MARGIN_MM, d.bleedMm + 30, trimRight(d) - FRAME_MARGIN_MM, H * 0.76)];
    },
    coverSlotPatches: [{ borderWidthPx: 3, borderColor: "#2B2B2B" }],
    titleZone: { yPct: 84, heightPct: 8 },
  },
  {
    id: "cover-1-title",
    name: "타이틀 중심형",
    photoCount: 1,
    scope: "half",
    coverRole: "photo-hero",
    slots: [{ xPct: 11, yPct: 9, widthPct: 76, heightPct: 48 }],
    coverBuild: (d) => {
      const H = d.panelMm + d.bleedMm * 2;
      return [mmSlot(d, MARGIN_MM, d.bleedMm + 20, trimRight(d) - MARGIN_MM, H * 0.58)];
    },
    titleZone: { yPct: 70, heightPct: 14 },
  },
  {
    id: "cover-2-split",
    name: "좌우 분할형",
    photoCount: 2,
    scope: "half",
    coverRole: "photo-structure",
    slots: [
      { xPct: 8.6, yPct: 11, widthPct: 39, heightPct: 67 },
      { xPct: 50.4, yPct: 11, widthPct: 39, heightPct: 67 },
    ],
    coverBuild: (d) => {
      const H = d.panelMm + d.bleedMm * 2;
      const x0 = STRUCTURE_MM;
      const x1 = trimRight(d) - STRUCTURE_MM;
      const gap = 5;
      const mid = (x0 + x1) / 2;
      const y0 = d.bleedMm + 24;
      const y1 = H * 0.78;
      return [mmSlot(d, x0, y0, mid - gap / 2, y1), mmSlot(d, mid + gap / 2, y0, x1, y1)];
    },
    titleZone: { yPct: 84, heightPct: 8 },
  },
];

/** 표지 레이아웃 탭에 보여줄 목록: 새 구성 4개 + 기존 한 판짜리 템플릿(전체 사진형은 이름만 바꾸고, "사방 여백"은 여백형과 겹쳐서 뺐어요 — id는 그대로라 저장된 앨범은 그대로 열려요). */
export function coverPanelTemplates(): PhotoLayoutTemplate[] {
  const rest = LISTED_HALF_LAYOUT_TEMPLATES.filter((t) => t.id !== "half-1-margin").map((t) => (t.id === "half-1-fill" ? { ...t, name: "전체 사진형" } : t));
  return [...COVER_VARIANT_TEMPLATES, ...rest];
}

export function findCoverTemplate(id: string | undefined): PhotoLayoutTemplate | undefined {
  if (!id) return undefined;
  return COVER_VARIANT_TEMPLATES.find((t) => t.id === id) ?? HALF_LAYOUT_TEMPLATES.find((t) => t.id === id);
}

/** 이 템플릿이 표지에서 쓰는 요소 종류(직접 정한 값 → 칸 모양 추측 → 모르면 undefined = 28mm). */
export function coverRoleOfTemplate(t: PhotoLayoutTemplate, override?: CoverElementRole): CoverElementRole | undefined {
  return override ?? t.coverRole ?? inferCoverPhotoRole(t.slots);
}

function mirror(slots: LayoutSlot[]): LayoutSlot[] {
  return slots.map((s) => ({ ...s, xPct: 100 - (s.xPct + s.widthPct) }));
}

/**
 * 표지 판 하나(앞/뒤)에 레이아웃 칸이 실제로 놓일 자리(그 판 기준 %)예요.
 * 1) 재단선(트림) 쪽 가장자리에 닿은 변만 안전선(재단선 15mm 안)으로 당기고(전체 사진형은 건너뛰어요),
 * 2) 책등 쪽은 칸 묶음 전체를 같은 비율로 옮겨 접힘선에서 요소 종류별 최소 거리(clearanceFor)만큼 띄워요.
 * 화면 편집기·썸네일·적용이 모두 이 함수를 써요.
 */
export function placeCoverSlots(template: PhotoLayoutTemplate, side: "front" | "back", dims: Dims, roleOverride?: CoverElementRole): LayoutSlot[] {
  const role = coverRoleOfTemplate(template, roleOverride);
  let raw: LayoutSlot[] = template.coverBuild ? template.coverBuild(dims) : template.slots.map((s) => ({ ...s }));
  if (template.coverBuild && side === "back") raw = mirror(raw);
  const W = dims.panelMm + dims.bleedMm;
  const H = dims.panelMm + dims.bleedMm * 2;
  if (role === "photo-bleed") return raw;
  const sx = W > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / W) * 100 : 0;
  const sy = H > 0 ? ((dims.bleedMm + SAFE_EDGE_MM) / H) * 100 : 0;
  const EPS = 0.5;
  const trimmed = raw.map((s) => {
    let left = s.xPct;
    let right = s.xPct + s.widthPct;
    if (side === "front") {
      if (right >= 100 - EPS) right = Math.min(right, 100 - sx);
    } else if (left <= EPS) left = Math.max(left, sx);
    const top = s.yPct <= EPS ? Math.max(s.yPct, sy) : s.yPct;
    const bottom = s.yPct + s.heightPct >= 100 - EPS ? Math.min(s.yPct + s.heightPct, 100 - sy) : s.yPct + s.heightPct;
    return { xPct: left, yPct: top, widthPct: Math.max(1, right - left), heightPct: Math.max(1, bottom - top) };
  });
  return clampSlotsToSpineClearance(trimmed, side, W, clearanceFor(role));
}
