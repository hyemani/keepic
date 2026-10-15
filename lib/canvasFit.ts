// 편집 캔버스의 "화면에 맞춤" 크기 계산(43차). 화면에 보이는 크기(px)만 정하고, 인쇄 규격(mm)·좌표(%)·
// 펼침면의 가로세로 비율은 절대 건드리지 않아요.
//
// 43차 원인 기록: 폭 1024px 미만(태블릿 세로)에서는 왼쪽 상세 패널이 캔버스 "위"에 가로 폭 전체로 쌓였고, 패널이
// 세로 공간을 거의 다 차지해서 캔버스 영역의 높이가 0~140px가 되었어요. 이 함수는 그 측정값에서
// 폭/높이 중 작은 쪽에 맞춰 줄이니 배율이 1%~11%로 떨어졌어요. 이제는 (1) 레이아웃이 캔버스 영역을 줄이지 않고
// (패널은 캔버스 위에 떠요), (2) 여기서도 바닥값(기본 실제 크기의 25%)을 두어 어떤 일이 있어도 1%로 떨어지지 않아요.

export const FIT_SAFETY_PX = 10;
/** 맞춤 크기가 이 값(실제 크기 대비 %)보다 작아지려 하면 이 값으로 두고, 넘치는 부분은 스크롤로 봐요. */
export const FIT_MIN_ACTUAL_PCT = 25;
/** 쓸 수 있는 공간이 이보다 작으면 tiny 표시만 해요(바닥값은 그래도 적용돼서 1%로 떨어지지 않아요)(px). */
export const FIT_TINY_PX = 120;

export type CanvasFit = {
  w: number;
  h: number;
  /** 바닥값이 적용돼서 영역보다 커졌어요(스크롤로 이동). */
  floored: boolean;
  /** 쓸 수 있는 공간이 비정상적으로 작아요(참고용). */
  tiny: boolean;
};

export function computeCanvasFit(opts: {
  boxW: number;
  boxH: number;
  aspect: number;
  widthMm?: number;
  cssPxPerMm: number;
  safetyPx?: number;
  minPct?: number;
  tinyPx?: number;
}): CanvasFit | null {
  const { boxW, boxH, aspect, widthMm, cssPxPerMm } = opts;
  const safety = opts.safetyPx ?? FIT_SAFETY_PX;
  const minPct = opts.minPct ?? FIT_MIN_ACTUAL_PCT;
  const tinyPx = opts.tinyPx ?? FIT_TINY_PX;
  if (!(boxW > 0) || !(boxH > 0) || !(aspect > 0)) return null;
  const availW = Math.max(0, boxW - safety * 2);
  const availH = Math.max(0, boxH - safety * 2);
  let w = availW;
  let h = availW / aspect;
  if (h > availH && availH > 0) {
    h = availH;
    w = availH * aspect;
  }
  if (w <= 0 || h <= 0) return null;
  const tiny = availW < tinyPx || availH < tinyPx;
  if (widthMm && widthMm > 0) {
    const floorW = (widthMm * cssPxPerMm * minPct) / 100;
    if (w < floorW) return { w: floorW, h: floorW / aspect, floored: true, tiny };
  }
  return { w, h, floored: false, tiny };
}
