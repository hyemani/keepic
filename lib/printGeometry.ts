// 인쇄용 PDF의 "위치 계산"만 담당하는 순수 함수 모음이에요. (브라우저 DOM이나 pdf-lib에
// 의존하지 않아요 — 그래서 이 파일의 로직은 Node에서도, 브라우저에서도 똑같이 동작하고
// 테스트하기도 쉬워요)
//
// 여기 있는 공식들은 lib/printCompose.ts(기존 Canvas 방식)의 drawPhotoInCell / drawPage와
// 똑같은 수식을 그대로 옮긴 거예요. 다만 "픽셀을 그리는" 대신 "사진을 어디에, 어떤 회전/반전
// 행렬로 배치해야 하는지, 어디까지 잘라야(clip) 하는지"를 숫자로 돌려줘요.
//
// 캔버스 좌표계(위가 0, 아래로 갈수록 y가 커짐)와 PDF 좌표계(아래가 0, 위로 갈수록 y가
// 커짐)가 서로 다르기 때문에, 이 파일 안에서 그 변환을 한 번만 정확히 해두고
// lib/printPdfLib.ts는 이 결과를 그대로 갖다 쓰기만 하면 되게 만들었어요.

export const PT_PER_MM = 72 / 25.4;

export function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

export type Rect = { x: number; y: number; w: number; h: number };

// 2D 어파인 변환 행렬을 [a, b, c, d, e, f]로 나타내요.
// 점 (x, y)는 (a*x + c*y + e, b*x + d*y + f)로 이동해요.
// PDF의 "cm" 연산자와 같은 표현이에요.
export type Matrix6 = [number, number, number, number, number, number];

export const IDENTITY: Matrix6 = [1, 0, 0, 1, 0, 0];

export function matMul(m1: Matrix6, m2: Matrix6): Matrix6 {
  // m1 . m2 (m2를 먼저 적용하고, 그 다음 m1을 적용해요)
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

function translate(tx: number, ty: number): Matrix6 {
  return [1, 0, 0, 1, tx, ty];
}
function scale(sx: number, sy: number): Matrix6 {
  return [sx, 0, 0, sy, 0, 0];
}
// 캔버스 ctx.rotate(theta)와 같은 "시계방향(clockwise)" 회전이에요. (y축이 아래로 향하는
// 캔버스 좌표계 기준)
function rotateClockwise(thetaDeg: number): Matrix6 {
  const t = (thetaDeg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, s, -s, c, 0, 0];
}

export type PhotoTransform = {
  x: number; // 드래그 오프셋(칸 기준, 아래 containerW/H와 같은 단위)
  y: number;
  scale: number;
  rotation: number; // 0/90/180/270도, 시계방향
  flipX: boolean;
  containerW: number; // 화면에서 드래그할 때 보였던 칸의 실제 픽셀 크기
  containerH: number;
};

// 사진 1장을 셀(cell) 안에 "object-fit: cover"로 배치할 때 필요한, 사진의 실제 크기를
// 계산해요. (칸을 완전히 채우고, 넘치는 부분은 잘려요 — 지금 화면 편집기와 동일한 동작)
export function computeCoverSize(
  imgW: number,
  imgH: number,
  cellW: number,
  cellH: number
): { drawW: number; drawH: number } {
  const imgRatio = imgW / imgH;
  const cellRatio = cellW / cellH;
  if (imgRatio > cellRatio) {
    const drawH = cellH;
    const drawW = cellH * imgRatio;
    return { drawW, drawH };
  }
  const drawW = cellW;
  const drawH = cellW / imgRatio;
  return { drawW, drawH };
}

// 사진을 셀 안에 배치할 때 필요한 최종 변환행렬(PDF 좌표계, y축이 위로)과 자르기(clip)
// 영역을 계산해요. 반환하는 matrix는 "가로세로 1x1짜리 이미지"를 cell의 왼쪽아래를
// (0,0)으로 하는 좌표계 안에서 어디에, 어떤 크기·회전·반전으로 그려야 하는지를 나타내요.
// (page 전체 좌표로 옮기는 건 호출하는 쪽에서 cell.x/cell.y만큼 한 번 더 이동하면 돼요)
export function computeImagePlacement(
  imgW: number,
  imgH: number,
  cell: Rect,
  photo: PhotoTransform
): { matrix: Matrix6; clip: Rect; drawW: number; drawH: number } {
  const { drawW: baseW, drawH: baseH } = computeCoverSize(imgW, imgH, cell.w, cell.h);
  const drawW = baseW * photo.scale;
  const drawH = baseH * photo.scale;

  // 화면에서 드래그했던 픽셀 거리를, 그 사진칸의 화면 크기 대비 비율로 환산해서
  // 인쇄용 크기에 그대로 적용해요. (lib/printCompose.ts와 동일한 방식)
  const offsetX = photo.containerW > 0 ? photo.x * (cell.w / photo.containerW) : photo.x;
  const offsetY = photo.containerH > 0 ? photo.y * (cell.h / photo.containerH) : photo.y;

  const centerX = cell.w / 2;
  const centerY = cell.h / 2;

  // 캔버스 좌표계 기준 변환 (M = T(offset) . T(center) . R(rotation) . S(flip))
  let canvasM: Matrix6 = translate(offsetX, offsetY);
  canvasM = matMul(canvasM, translate(centerX, centerY));
  canvasM = matMul(canvasM, rotateClockwise(photo.rotation));
  canvasM = matMul(canvasM, scale(photo.flipX ? -1 : 1, 1));

  // 캔버스(y축 아래) -> PDF(y축 위) 좌표계로 변환: Flip(x,y) = (x, cellH - y)
  const flip: Matrix6 = matMul(translate(0, cell.h), scale(1, -1));
  const pdfLocalM = matMul(flip, canvasM);

  // 위 행렬은 "가운데 정렬, drawW x drawH 크기"인 이미지 좌표를 기준으로 하니까,
  // 실제로는 유닛 정사각형(0..1, 0..1)에서 시작하는 pdf-lib 이미지 규약에 맞춰
  // Scale(drawW, drawH) . Translate(-0.5, -0.5)를 앞에 붙여요.
  const unitToLocal: Matrix6 = matMul(scale(drawW, drawH), translate(-0.5, -0.5));
  const matrix = matMul(pdfLocalM, unitToLocal);

  // 자르기(clip) 영역은 셀 자체(회전하지 않는 칸)예요. CSS의 overflow: hidden과 동일해요.
  const clip: Rect = { x: 0, y: 0, w: cell.w, h: cell.h };

  return { matrix, clip, drawW, drawH };
}

// 캔버스 좌표(왼쪽 위가 0,0, 아래로 갈수록 y가 커짐) 사각형을, 페이지 전체 기준
// PDF 좌표(왼쪽 아래가 0,0, 위로 갈수록 y가 커짐) 사각형으로 바꿔요.
export function canvasRectToPdfRect(rect: Rect, pageH: number): Rect {
  return { x: rect.x, y: pageH - (rect.y + rect.h), w: rect.w, h: rect.h };
}

// ---- 페이지 템플릿 레이아웃 ----
// lib/printCompose.ts의 drawPage()에 있던 각 템플릿별 칸 배치 공식을 그대로 옮겼어요.
// (숫자를 그대로 복사해왔기 때문에, 기존 파일과 나란히 놓고 비교하기 쉬워요)
// 반환값은 전부 "캔버스 좌표"(왼쪽 위가 0,0)예요 — canvasRectToPdfRect로 변환해서 쓰세요.

import type { PageTemplateId } from "@/lib/albumTemplates";

export type PageLayout = {
  cells: Rect[]; // 사진이 들어갈 칸들 (템플릿의 photoCount 순서와 같아요)
  captions?: { index: number; rect: Rect; baseFontPt: number }[]; // 캡션이 필요한 칸
};

const GAP_MM = 1.5;

// 기존 lib/printCompose.ts는 300dpi 캔버스 픽셀 기준으로 캡션 글자 크기를 정해뒀어요
// (CAPTION_FONT_PX: sm=26 base=32 lg=40). 같은 "실제 크기"가 되도록 pt로 환산해서 재사용해요.
// 1pt = 1/72인치, 300dpi 캔버스에서는 1px = 1/300인치 이므로 px * 72/300 = pt예요.
const PX_AT_300DPI_TO_PT = 72 / 300;
export const CAPTION_FONT_PT: Record<"sm" | "base" | "lg", number> = {
  sm: 26 * PX_AT_300DPI_TO_PT,
  base: 32 * PX_AT_300DPI_TO_PT,
  lg: 40 * PX_AT_300DPI_TO_PT,
};
const TRIO_TEXT_CAPTION_FONT_PT = 22 * PX_AT_300DPI_TO_PT;

export function computePageLayout(templateId: PageTemplateId, pageW: number, pageH: number): PageLayout {
  const gap = mmToPt(GAP_MM);

  if (templateId === "blank") return { cells: [] };

  if (templateId === "full") {
    return { cells: [{ x: 0, y: 0, w: pageW, h: pageH }] };
  }

  if (templateId === "fullMargin") {
    const margin = pageW * 0.08;
    return { cells: [{ x: margin, y: margin, w: pageW - margin * 2, h: pageH - margin * 2 }] };
  }

  if (templateId === "duo") {
    const cellW = (pageW - gap) / 2;
    return {
      cells: [
        { x: 0, y: 0, w: cellW, h: pageH },
        { x: cellW + gap, y: 0, w: cellW, h: pageH },
      ],
    };
  }

  if (templateId === "quad") {
    const cellW = (pageW - gap) / 2;
    const cellH = (pageH - gap) / 2;
    return {
      cells: [
        { x: 0, y: 0, w: cellW, h: cellH },
        { x: cellW + gap, y: 0, w: cellW, h: cellH },
        { x: 0, y: cellH + gap, w: cellW, h: cellH },
        { x: cellW + gap, y: cellH + gap, w: cellW, h: cellH },
      ],
    };
  }

  if (templateId === "trio") {
    const topH = (pageH - gap) / 2;
    const botH = pageH - gap - topH;
    const botW = (pageW - gap) / 2;
    return {
      cells: [
        { x: 0, y: 0, w: pageW, h: topH },
        { x: 0, y: topH + gap, w: botW, h: botH },
        { x: botW + gap, y: topH + gap, w: botW, h: botH },
      ],
    };
  }

  if (templateId === "trioText") {
    const pad = pageW * 0.06;
    const colGap = mmToPt(GAP_MM);
    const contentW = pageW - pad * 2;
    const colW = (contentW - colGap * 2) / 3;
    const captionH = mmToPt(8);
    const cells: Rect[] = [];
    const captions: { index: number; rect: Rect; baseFontPt: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const cx = pad + i * (colW + colGap);
      const photoY = pad;
      cells.push({ x: cx, y: photoY, w: colW, h: colW });
      captions.push({
        index: i,
        rect: { x: cx, y: photoY + colW + mmToPt(3), w: colW, h: captionH },
        baseFontPt: TRIO_TEXT_CAPTION_FONT_PT,
      });
    }
    return { cells, captions };
  }

  // photoText: 사진 1장 + 캡션(아래 / 사진 위 하단 / 사진 위 가운데) — position은 호출부에서 처리
  return { cells: [{ x: 0, y: 0, w: pageW, h: pageH }] };
}
