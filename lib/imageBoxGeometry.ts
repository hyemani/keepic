// 이미지박스(자유 배치 사진·스티커) 안에서 사진이 실제로 그려질 위치·크기를 계산하는
// 순수 함수예요. DOM/캔버스 의존 없이 숫자만 다뤄서, 화면 미리보기(app/upload/page.tsx의
// ImageBoxOverlay)와 실제 인쇄 파일(lib/printCompose.ts의 drawImageBoxOnCanvas)이 똑같은
// 계산을 공유해요 — 그래야 화면에서 본 사진 위치/확대가 인쇄 결과와 항상 일치해요.
//
// 기준 동작: innerOffsetXPct/innerOffsetYPct가 0이고 innerScale이 1이면, 사진이 박스를
// 빈틈없이 꽉 채우도록(원본 비율은 유지한 채 넘치는 부분만 잘림, CSS object-fit: cover와
// 같은 방식) 중앙 정렬돼요. innerScale을 키우면 그 상태에서 더 확대되고, innerOffset은
// 박스 너비/높이에 대한 %로 사진을 원하는 방향으로 옮겨요(옮긴 뒤에도 항상 박스를 꽉
// 채운 상태가 유지되도록 호출하는 쪽에서 범위를 벗어나지 않게 clamp해서 써야 해요 —
// clampImageBoxInnerOffset 참고).
export type ImageBoxCoverRect = { x: number; y: number; width: number; height: number };

export function computeImageBoxCoverRect(
  boxWidthPx: number,
  boxHeightPx: number,
  naturalWidth: number,
  naturalHeight: number,
  innerOffsetXPct: number = 0,
  innerOffsetYPct: number = 0,
  innerScale: number = 1
): ImageBoxCoverRect {
  const safeBoxWidth = boxWidthPx || 1;
  const safeBoxHeight = boxHeightPx || 1;
  const safeNaturalWidth = naturalWidth || 1;
  const safeNaturalHeight = naturalHeight || 1;
  const imageAspect = safeNaturalWidth / safeNaturalHeight;
  const boxAspect = safeBoxWidth / safeBoxHeight;

  let baseWidth: number;
  let baseHeight: number;
  if (imageAspect > boxAspect) {
    baseHeight = safeBoxHeight;
    baseWidth = baseHeight * imageAspect;
  } else {
    baseWidth = safeBoxWidth;
    baseHeight = baseWidth / imageAspect;
  }

  const safeScale = Math.max(1, innerScale || 1);
  const width = baseWidth * safeScale;
  const height = baseHeight * safeScale;
  // 저장된 옮김(innerOffset)이 "지금 이 영역" 기준으로는 사진이 영역을 못 덮을 만큼 클 수 있어요
  // (예: 사진을 옮겨 놓은 뒤 장식 프레임을 씌우면 사진이 놓이는 영역이 박스 → 더 작은 "창"으로
  // 바뀌어서 같은 %가 허용 범위를 넘어요) — 그러면 영역 한쪽에 뒤 배경이 비치는 띠가 생겨요.
  // 그려질 때마다 허용 범위 안으로 잘라서(clampImageBoxInnerOffset) 사진이 항상 영역을 꽉 채우게
  // 해요. 이미 범위 안인 값은 그대로라 기존 문서의 모습은 안 바뀌어요.
  const offX = clampImageBoxInnerOffset(innerOffsetXPct, safeBoxWidth, width);
  const offY = clampImageBoxInnerOffset(innerOffsetYPct, safeBoxHeight, height);
  const x = (safeBoxWidth - width) / 2 + (offX / 100) * safeBoxWidth;
  const y = (safeBoxHeight - height) / 2 + (offY / 100) * safeBoxHeight;

  return { x, y, width, height };
}

// innerOffset이 너무 커서 박스 안에 빈 여백이 생기지 않도록, 지금 크기(width/height)와
// 박스 크기 기준으로 허용 가능한 최대 범위 안으로 잘라내요. computeImageBoxCoverRect로
// 계산한 rect를 넘겨주면 돼요(같은 width/height를 다시 계산할 필요 없게).
export function clampImageBoxInnerOffset(
  offsetPct: number,
  boxSizePx: number,
  contentSizePx: number
): number {
  const safeBoxSize = boxSizePx || 1;
  const maxOffsetPx = Math.max(0, (contentSizePx - safeBoxSize) / 2);
  const maxOffsetPct = (maxOffsetPx / safeBoxSize) * 100;
  return Math.min(maxOffsetPct, Math.max(-maxOffsetPct, offsetPct));
}

// 장식 프레임 이음새 방지용 — 창 기준 cover 사각형(rect)을 창 가운데를 중심으로 "균일하게" 살짝
// 키워서, 창보다 bleedPx만큼 더 큰 사진 영역(창+사방 bleedPx)도 사진이 빈틈없이 덮게 해요.
// (cover가 창의 한 축에 딱 맞는 경우, 그 축 방향 창 바깥쪽엔 사진 픽셀이 없어서 bleed가 소용없었어요.)
// 확대 비율은 1+2×bleed÷창 크기(≈1~2%)라 눈에 띄는 변화는 없고, 화면과 인쇄가 같은 함수를 써요.
export function expandCoverRectForBleed(
  rect: ImageBoxCoverRect,
  winWidthPx: number,
  winHeightPx: number,
  bleedPx: number
): ImageBoxCoverRect {
  if (!(bleedPx > 0)) return rect;
  const s = Math.max((winWidthPx + 2 * bleedPx) / winWidthPx, (winHeightPx + 2 * bleedPx) / winHeightPx);
  const cx = winWidthPx / 2;
  const cy = winHeightPx / 2;
  return {
    x: cx + (rect.x - cx) * s,
    y: cy + (rect.y - cy) * s,
    width: rect.width * s,
    height: rect.height * s,
  };
}
