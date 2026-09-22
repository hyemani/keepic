// 이미지박스(자유 배치 사진·스티커)의 "틀(박스)"과 "사진(콘텐츠)"을 분리해서 계산하는
// 순수 함수예요. DOM/캔버스 의존 없이 숫자만 다뤄서, 화면 미리보기(app/upload/page.tsx의
// ImageBoxOverlay)와 실제 인쇄 파일(lib/printCompose.ts의 drawImageBoxOnCanvas)이 똑같은
// 계산을 공유해요 — 그래야 화면에서 본 사진 위치/확대가 인쇄 결과와 항상 일치해요.
//
// 핵심 아이디어(2026-09-19, 혜민님 요청 — "박스 크기를 조절해도 사진 자체는 안 바뀌게"):
// 사진(콘텐츠)은 박스와 별개로 자기만의 절대 위치·크기(contentXPct/contentYPct/
// contentWidthPct/contentHeightPct, 박스의 xPct·widthPct와 같은 좌표계)를 가져요. 박스는
// 그 사진을 비추는 "창(윈도우)"일 뿐이에요 — 박스를 줄이면 사진은 그대로 있고 창만
// 좁아져서 더 많이 잘려 보이고, 박스를 늘리면 창만 넓어져서 더 많이 보여요(사진 자체가
// 확대/축소되지 않아요). 유일한 예외: 박스를 사진보다 더 크게 늘리면 빈틈이 생기니까,
// 그때만 어쩔 수 없이 사진을 딱 덮을 만큼 키워요(growContentToCoverBox).
//
// 좌표 단위 안내: xPct/widthPct류는 "스프레드 전체 폭" 기준 %, yPct/heightPct류는
// "페이지(낱장) 높이" 기준 %예요(box와 완전히 같은 좌표계). 페이지가 정사각형이라
// 스프레드 폭이 페이지 높이의 2배라서, 실제 물리 비율을 맞출 때는 이 2배 배율
// (PAGE_ASPECT_FACTOR)을 함께 고려해요.
const PAGE_ASPECT_FACTOR = 2;

export type ImageBoxRectPct = { xPct: number; yPct: number; widthPct: number; heightPct: number };
export type ImageBoxCoverRect = { x: number; y: number; width: number; height: number };

// 새 이미지박스를 만들거나 "초기화"할 때 쓰는, 사진이 박스를 빈틈없이 정확히 채우는
// 콘텐츠 크기예요(원본 비율 유지, object-fit: cover와 같은 방식).
export function computeCoverFitContentSizePct(
  boxWidthPct: number,
  boxHeightPct: number,
  naturalWidth: number,
  naturalHeight: number
): { widthPct: number; heightPct: number } {
  const safeBoxWidthPct = boxWidthPct || 1;
  const safeBoxHeightPct = boxHeightPct || 1;
  const safeNaturalWidth = naturalWidth || 1;
  const safeNaturalHeight = naturalHeight || 1;
  const imageAspect = safeNaturalWidth / safeNaturalHeight;
  const boxPhysicalAspect = (safeBoxWidthPct * PAGE_ASPECT_FACTOR) / safeBoxHeightPct;

  if (imageAspect > boxPhysicalAspect) {
    const heightPct = safeBoxHeightPct;
    return { widthPct: (heightPct * imageAspect) / PAGE_ASPECT_FACTOR, heightPct };
  }
  const widthPct = safeBoxWidthPct;
  return { widthPct, heightPct: (widthPct * PAGE_ASPECT_FACTOR) / imageAspect };
}

// 콘텐츠(사진) rect가 박스보다 작아서(예: 박스를 사진보다 크게 늘렸을 때) 빈 여백이
// 생기면, 중앙 기준으로 딱 덮을 만큼만 키워서 돌려줘요. 이미 충분히 덮고 있으면 그대로
// 돌려줘요 — 박스를 줄일 때는 이 함수가 절대 콘텐츠를 바꾸지 않아요, 그게 핵심이에요.
export function growContentToCoverBox(content: ImageBoxRectPct, box: ImageBoxRectPct): ImageBoxRectPct {
  const needsWidthGrow = content.widthPct < box.widthPct;
  const needsHeightGrow = content.heightPct < box.heightPct;
  if (!needsWidthGrow && !needsHeightGrow) return content;

  const scale = Math.max(
    needsWidthGrow ? box.widthPct / Math.max(content.widthPct, 0.0001) : 1,
    needsHeightGrow ? box.heightPct / Math.max(content.heightPct, 0.0001) : 1
  );
  const centerX = content.xPct + content.widthPct / 2;
  const centerY = content.yPct + content.heightPct / 2;
  const widthPct = content.widthPct * scale;
  const heightPct = content.heightPct * scale;
  return { xPct: centerX - widthPct / 2, yPct: centerY - heightPct / 2, widthPct, heightPct };
}

// 콘텐츠 위치를 박스가 항상 콘텐츠 안에 완전히 들어오도록(빈틈 없이) 클램프해요. 콘텐츠가
// 어느 축에서 박스보다 작으면(드물게, grow 전이라거나) 그 축은 그냥 중앙에 맞춰요.
export function clampContentPosition(content: ImageBoxRectPct, box: ImageBoxRectPct): { xPct: number; yPct: number } {
  function clampAxis(contentPos: number, contentSize: number, boxPos: number, boxSize: number): number {
    if (contentSize <= boxSize) return boxPos + (boxSize - contentSize) / 2;
    const min = boxPos + boxSize - contentSize;
    const max = boxPos;
    return Math.min(max, Math.max(min, contentPos));
  }
  return {
    xPct: clampAxis(content.xPct, content.widthPct, box.xPct, box.widthPct),
    yPct: clampAxis(content.yPct, content.heightPct, box.yPct, box.heightPct),
  };
}

// 화면 렌더링용 — 콘텐츠(절대 스프레드 %) 위치를 "박스 기준 로컬 px"로 바꿔줘요. 박스
// div가 자기 안쪽(0~100%)을 기준으로 이미지를 그리기 때문에, 절대 % 차이를 박스의 실제
// 렌더 픽셀 크기에 대한 비율로 바꿔주면 돼요.
export function contentRectToBoxLocalPx(
  content: ImageBoxRectPct,
  box: ImageBoxRectPct,
  boxWidthPx: number,
  boxHeightPx: number
): ImageBoxCoverRect {
  const safeBoxWidthPct = box.widthPct || 1;
  const safeBoxHeightPct = box.heightPct || 1;
  return {
    x: ((content.xPct - box.xPct) / safeBoxWidthPct) * boxWidthPx,
    y: ((content.yPct - box.yPct) / safeBoxHeightPct) * boxHeightPx,
    width: (content.widthPct / safeBoxWidthPct) * boxWidthPx,
    height: (content.heightPct / safeBoxHeightPct) * boxHeightPx,
  };
}
