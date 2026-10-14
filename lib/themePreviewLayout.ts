// 앨범 테마 눈 아이콘 미리보기 창의 자리·크기 계산(순수 계산).
// 패널 오른쪽 바로 옆에 두되, 화면 안(위쪽은 패널 윗선 = 상단바 아래)에 항상 들어오게 잘라 줘요.
export type Rect = { left: number; top: number; right: number; bottom: number };
export type PreviewBox = { left: number; top: number; width: number; height: number };

export const PREVIEW_PAD = 8; // 창 안쪽 여백(px)
export const PREVIEW_GAP = 6; // 펼침면 사이 간격(px)
export const PREVIEW_COLS = 2;
export const PREVIEW_EDGE = 8; // 화면 가장자리·패널과 띄우는 거리(px)
export const PREVIEW_MAX_W = 480;
export const PREVIEW_MAX_W_NARROW = 420; // 화면 폭 1200px 미만에서는 편집 화면이 작아서 창도 조금 더 작게

// count장의 펼침면(가로:세로 = ratio)을 2열로 놓았을 때 창 높이
export function previewHeight(width: number, count: number, ratio: number): number {
  const cols = Math.min(PREVIEW_COLS, Math.max(1, count));
  const cell = (width - PREVIEW_PAD * 2 - PREVIEW_GAP * (cols - 1)) / cols;
  const rows = Math.ceil(count / cols);
  return Math.round(PREVIEW_PAD * 2 + rows * (cell / ratio) + PREVIEW_GAP * (rows - 1));
}

export function computePreviewBox(opts: { panel: Rect; anchor: Rect; vw: number; vh: number; count: number; ratio: number; minTop?: number }): PreviewBox {
  const { panel, anchor, vw, vh, count, ratio } = opts;
  const minTop = Math.max(PREVIEW_EDGE, opts.minTop ?? panel.top);
  const left = Math.round(panel.right + PREVIEW_EDGE);
  const room = vw - PREVIEW_EDGE - left;
  const w = Math.max(120, Math.min(vw < 1200 ? PREVIEW_MAX_W_NARROW : PREVIEW_MAX_W, room)); // 화면이 아주 좁으면 남는 폭만큼만(가로 스크롤·잘림 없음)
  const height = previewHeight(w, count, ratio);
  // 눈 아이콘 높이에 맞춰 위로 살짝 올리되(첫 줄이 눈 옆에 보이게) 화면 안으로 잘라요.
  const wantTop = Math.round(anchor.top - 16);
  const maxTop = Math.max(minTop, vh - PREVIEW_EDGE - height);
  return { left, top: Math.max(minTop, Math.min(wantTop, maxTop)), width: Math.round(w), height };
}
