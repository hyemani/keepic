// 54차: 표지 제목 글자(잉크)가 안전선(왼쪽 책등 쪽 20mm / 바깥·위·아래 15mm) 밖으로 나가는지 재는 순수 함수예요.
// 편집 화면 안내(작은 알림)에만 써요 — 인쇄·미리보기·PDF에는 안 나오고, 사용자의 글자 크기·자리는 절대 안 바꿔요.
// 좌표계는 앞표지 칸(책등 접힘선이 왼쪽 끝, 바깥 도련이 오른쪽 끝) 기준 mm예요.

export type SafeSide = "left" | "right" | "top" | "bottom";

export type CoverTitleSafeInput = {
  cellWmm: number; // 앞표지 칸 너비(판 + 도련)
  cellHmm: number; // 표지 칸 높이(판 + 위아래 도련)
  bleedMm: number;
  safetyMm: number; // 바깥·위·아래 안전선(재단선에서 안쪽, 15mm)
  spineSafetyMm: number; // 책등 쪽 안전선(책등 접힘선에서 앞표지 쪽, 20mm)
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct?: number;
  verticalAlign?: "top" | "middle" | "bottom";
  align: "left" | "center" | "right";
  lineWidthsMm: number[]; // 줄마다 글자 폭(줄 끝 띄어쓰기 뺀 값)
  lineHeightEm: number;
  fontSizeMm: number;
  insetXEm: number;
  insetYEm: number;
  rotationDeg?: number; // 제목 칸을 칸 중심 기준으로 시계 방향 회전(표지 제목은 지금 회전이 없어서 0이에요 — 글상자와 같은 규칙: box.rotation)
};

export type InkBoxMm = { l: number; t: number; r: number; b: number };

/** 글자 덩어리(잉크)의 바깥 사각형(mm). 회전이 있으면 제목 칸 중심 기준으로 돌린 네 모서리의 바깥 사각형이에요. */
export function coverTitleInkBoxMm(a: CoverTitleSafeInput): InkBoxMm | null {
  const n = a.lineWidthsMm.length;
  if (n === 0) return null;
  const f = a.fontSizeMm;
  const boxX = (a.xPct / 100) * a.cellWmm;
  const boxY = (a.yPct / 100) * a.cellHmm;
  const boxW = (a.widthPct / 100) * a.cellWmm;
  const areaL = boxX + a.insetXEm * f;
  const areaR = boxX + boxW - a.insetXEm * f;
  let l = Infinity;
  let r = -Infinity;
  for (const w of a.lineWidthsMm) {
    const x0 = a.align === "left" ? areaL : a.align === "right" ? areaR - w : (areaL + areaR) / 2 - w / 2;
    l = Math.min(l, x0);
    r = Math.max(r, x0 + w);
  }
  const blockH = (n * a.lineHeightEm + a.insetYEm * 2) * f;
  const boxH = a.heightPct !== undefined ? (a.heightPct / 100) * a.cellHmm : blockH;
  const off = a.heightPct !== undefined && boxH > blockH ? (a.verticalAlign === "middle" ? (boxH - blockH) / 2 : a.verticalAlign === "bottom" ? boxH - blockH : 0) : 0;
  const top0 = boxY + off;
  const halfLead = Math.max(0, (a.lineHeightEm - 1) / 2);
  // 글자 모양의 위·아래(줄 상자 맨 위/아래의 반 행간은 뺀 값, 안쪽 여백 포함 — 52차 아래쪽 판단과 같은 기준)
  // 글자가 있는 첫 줄~마지막 줄만 잉크로 쳐요(앞뒤 빈 줄은 글자 모양이 없어요: Enter로 끝에 남은 빈 줄이 안전선 안내를 잘못 켜지 않게).
  let first = a.lineWidthsMm.findIndex((w) => w > 0.01);
  let last = a.lineWidthsMm.length - 1;
  while (last >= 0 && !(a.lineWidthsMm[last] > 0.01)) last--;
  if (first < 0) { first = 0; last = n - 1; }
  let t = top0 + (a.insetYEm + first * a.lineHeightEm + halfLead) * f;
  let b = top0 + (a.insetYEm + (last + 1) * a.lineHeightEm - halfLead) * f;
  const rot = ((a.rotationDeg ?? 0) % 360 + 360) % 360;
  if (rot !== 0) {
    const cx = boxX + boxW / 2;
    const cy = boxY + boxH / 2;
    const rad = (rot * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [px, py] of [[l, t], [r, t], [r, b], [l, b]]) {
      const dx = px - cx;
      const dy = py - cy;
      xs.push(cx + dx * cos - dy * sin);
      ys.push(cy + dx * sin + dy * cos);
    }
    l = Math.min(...xs);
    r = Math.max(...xs);
    t = Math.min(...ys);
    b = Math.max(...ys);
  }
  return { l, t, r, b };
}

/** 안전선 밖으로 나가는 쪽들과 얼마나 나갔는지(mm). 0.3mm 이하는 반올림 오차로 봐요(52차와 같은 허용치). */
export function coverTitleSafeViolations(a: CoverTitleSafeInput, tolMm = 0.3): { sides: SafeSide[]; overMm: Record<SafeSide, number>; ink: InkBoxMm } | null {
  const ink = coverTitleInkBoxMm(a);
  if (!ink) return null;
  const limL = a.spineSafetyMm;
  const limR = a.cellWmm - a.bleedMm - a.safetyMm;
  const limT = a.bleedMm + a.safetyMm;
  const limB = a.cellHmm - a.bleedMm - a.safetyMm;
  const overMm: Record<SafeSide, number> = {
    left: Math.max(0, limL - ink.l),
    right: Math.max(0, ink.r - limR),
    top: Math.max(0, limT - ink.t),
    bottom: Math.max(0, ink.b - limB),
  };
  const sides = (["left", "right", "top", "bottom"] as SafeSide[]).filter((s) => overMm[s] > tolMm);
  return { sides, overMm, ink };
}

const SIDE_KO: Record<SafeSide, string> = { left: "왼쪽(책등 쪽)", right: "오른쪽", top: "위쪽", bottom: "아래쪽" };

/** 안전선 밖 안내 문구. 아래쪽만 나가는 경우는 52차 문구 그대로예요. */
export function coverTitleSafeNoticeText(sides: SafeSide[]): string {
  if (sides.length === 1 && sides[0] === "bottom") return "제목 아래쪽이 안전선 밖으로 나가요. 위로 옮기거나 글자 크기를 줄여 주세요.";
  return `제목이 안전선 밖으로 나가요 (${sides.map((s) => SIDE_KO[s]).join("·")}). 안쪽으로 옮기거나 글자 크기를 줄여 주세요.`;
}
