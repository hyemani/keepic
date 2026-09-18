// 포토북 "인쇄용 제작 파일"을 만드는 곳이에요.
//
// 고객이 /upload 화면에서 사진을 배치하고 캡션을 적은 내용을 그대로,
// 실제 인쇄에 필요한 재단/작업 사이즈(mm) 캔버스에 다시 그려서
// 내지 PDF 1개, 표지 PDF 1개로 만들어요. (레드프린팅 작업 가이드 기준 규격)
//
// 주의: 이 파일이 만드는 표지의 "세네카(책등) 폭"은 lib/photobookPricing.ts의
// calcEstimatedSpineWidthMm() 간편 공식으로 계산한 "참고용 예상치"예요.
// 실제 제작처(레드프린팅)에 파일을 넘기기 전에는 반드시 제작처 자체 계산기나
// 와우프레스 책등 계산기로 책등 폭을 다시 확인하고, 필요하면 표지 PDF를
// 다시 생성해주세요.

import { jsPDF } from "jspdf";
import { PageTemplateId, SpreadDef, pageTemplates } from "@/lib/albumTemplates";
import { findBackgroundPattern, drawBackgroundPatternOnCanvas } from "@/lib/backgroundPatterns";
import {
  PhotobookCoverId,
  printFileSpec,
  calcEstimatedSpineWidthMm,
} from "@/lib/photobookPricing";

export type PrintPhoto = {
  url: string;
  caption: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
  fontFamily: string;
  size: "sm" | "base" | "lg";
  bold: boolean;
  color: string;
  align: "left" | "center" | "right";
  position: "below" | "overlayBottom" | "overlayCenter";
  containerW: number;
  containerH: number;
  rotation: number;
  flipX: boolean;
};

const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;

function mmToPx(mm: number) {
  return Math.round((mm / MM_PER_INCH) * PRINT_DPI);
}

function pxToMm(px: number) {
  return (px / PRINT_DPI) * MM_PER_INCH;
}

export function parseWorkSizeMm(productionFileSizeMm: string | null): { w: number; h: number } {
  const match = (productionFileSizeMm ?? "").match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
  if (!match) return { w: 310, h: 310 }; // 혹시 규격을 못 읽으면 L사이즈 기준으로 안전하게
  return { w: parseFloat(match[1]), h: parseFloat(match[3]) };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지를 불러오지 못했어요: ${url}`));
    img.src = url;
  });
}

// 화면(PhotoCell)에서 CSS로 그리던 것과 최대한 같은 결과가 나오도록,
// object-fit: cover + translate(x,y) + scale(s)를 캔버스에 그대로 재현해요.
export function drawPhotoInCell(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  photo: PrintPhoto,
  cellX: number,
  cellY: number,
  cellW: number,
  cellH: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(cellX, cellY, cellW, cellH);
  ctx.clip();

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const cellRatio = cellW / cellH;
  // "프레임 채우기"(cover, 칸을 꽉 채우고 넘치는 부분은 잘림)가 아니라 "사진 전체
  // 맞추기"(contain, 원본 전체가 보이고 남는 공간은 여백)를 기본 배치로 써요. 사용자가
  // scale을 키우면 이 기준에서 확대되고, "프레임 채우기" 버튼을 누르면 scale 값 자체를
  // 칸을 꽉 채우는 배율로 맞춰줘요(화면 쪽 computeFillScale과 같은 공식).
  let baseW: number;
  let baseH: number;
  if (imgRatio > cellRatio) {
    baseW = cellW;
    baseH = cellW / imgRatio;
  } else {
    baseH = cellH;
    baseW = cellH * imgRatio;
  }

  const drawW = baseW * photo.scale;
  const drawH = baseH * photo.scale;

  // 화면에서 드래그했던 픽셀 거리(x, y)를, 그 사진칸의 화면 크기 대비 비율로 환산해서
  // 인쇄용 캔버스 크기에 똑같이 적용해요.
  const fx = photo.containerW > 0 ? cellW / photo.containerW : 0;
  const fy = photo.containerH > 0 ? cellH / photo.containerH : 0;

  const centerX = cellX + cellW / 2;
  const centerY = cellY + cellH / 2;

  // 화면과 같은 순서로 적용해요: 드래그 이동(바깥, 회전/반전 영향 없음) → 칸 중심 기준 회전 → 좌우반전.
  ctx.translate(photo.x * fx, photo.y * fy);
  ctx.translate(centerX, centerY);
  ctx.rotate((photo.rotation * Math.PI) / 180);
  if (photo.flipX) ctx.scale(-1, 1);

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string,
  bold: boolean,
  startPx: number,
  maxWidth: number
) {
  let size = startPx;
  while (size > 8) {
    ctx.font = `${bold ? "bold " : ""}${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  photo: PrintPhoto,
  x: number,
  y: number,
  w: number,
  h: number,
  baseFontPx: number
) {
  if (!photo.caption.trim()) return;
  const pad = w * 0.04;
  const maxWidth = w - pad * 2;
  const fontPx = fitFontSize(ctx, photo.caption, photo.fontFamily, photo.bold, baseFontPx, maxWidth);
  ctx.font = `${photo.bold ? "bold " : ""}${fontPx}px ${photo.fontFamily}`;
  ctx.fillStyle = photo.color;
  ctx.textBaseline = "middle";
  ctx.textAlign = photo.align;
  const textX = photo.align === "left" ? x + pad : photo.align === "right" ? x + w - pad : x + w / 2;
  ctx.fillText(photo.caption, textX, y + h / 2, maxWidth);
}

const CAPTION_FONT_PX: Record<PrintPhoto["size"], number> = {
  sm: 26,
  base: 32,
  lg: 40,
};

async function drawPage(
  ctx: CanvasRenderingContext2D,
  templateId: PageTemplateId,
  photos: PrintPhoto[],
  pageW: number,
  pageH: number,
  backgroundColor: string = "#ffffff",
  backgroundPatternId?: string
) {
  const pattern = findBackgroundPattern(backgroundPatternId);
  if (pattern) {
    drawBackgroundPatternOnCanvas(ctx, pattern, 0, 0, pageW, pageH, mmToPx);
  } else {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, pageW, pageH);
  }

  const gap = mmToPx(1.5);
  const count = pageTemplates[templateId].photoCount;
  const loaded = await Promise.all(
    photos.slice(0, count).map((p) => (p.url ? loadImage(p.url) : null))
  );

  if (templateId === "blank") return;

  if (templateId === "full") {
    if (loaded[0]) drawPhotoInCell(ctx, loaded[0], photos[0], 0, 0, pageW, pageH);
    return;
  }

  if (templateId === "fullMargin") {
    const margin = pageW * 0.08;
    if (loaded[0]) {
      drawPhotoInCell(ctx, loaded[0], photos[0], margin, margin, pageW - margin * 2, pageH - margin * 2);
    }
    return;
  }

  if (templateId === "duo") {
    const cellW = (pageW - gap) / 2;
    const rects = [
      { x: 0, y: 0, w: cellW, h: pageH },
      { x: cellW + gap, y: 0, w: cellW, h: pageH },
    ];
    rects.forEach((r, i) => {
      const img = loaded[i];
      if (img) drawPhotoInCell(ctx, img, photos[i], r.x, r.y, r.w, r.h);
    });
    return;
  }

  if (templateId === "quad") {
    const cellW = (pageW - gap) / 2;
    const cellH = (pageH - gap) / 2;
    const rects = [
      { x: 0, y: 0, w: cellW, h: cellH },
      { x: cellW + gap, y: 0, w: cellW, h: cellH },
      { x: 0, y: cellH + gap, w: cellW, h: cellH },
      { x: cellW + gap, y: cellH + gap, w: cellW, h: cellH },
    ];
    rects.forEach((r, i) => {
      const img = loaded[i];
      if (img) drawPhotoInCell(ctx, img, photos[i], r.x, r.y, r.w, r.h);
    });
    return;
  }

  if (templateId === "trio") {
    const topH = (pageH - gap) / 2;
    const botH = pageH - gap - topH;
    const botW = (pageW - gap) / 2;
    const rects = [
      { x: 0, y: 0, w: pageW, h: topH },
      { x: 0, y: topH + gap, w: botW, h: botH },
      { x: botW + gap, y: topH + gap, w: botW, h: botH },
    ];
    rects.forEach((r, i) => {
      const img = loaded[i];
      if (img) drawPhotoInCell(ctx, img, photos[i], r.x, r.y, r.w, r.h);
    });
    return;
  }

  if (templateId === "trioText") {
    const pad = pageW * 0.06;
    const colGap = mmToPx(1.5);
    const contentW = pageW - pad * 2;
    const colW = (contentW - colGap * 2) / 3;
    const captionH = mmToPx(8);
    for (let i = 0; i < 3; i++) {
      const cx = pad + i * (colW + colGap);
      const photoY = pad;
      const img = loaded[i];
      if (img) drawPhotoInCell(ctx, img, photos[i], cx, photoY, colW, colW);
      if (photos[i]) {
        drawCaption(ctx, photos[i], cx, photoY + colW + mmToPx(3), colW, captionH, 22);
      }
    }
    return;
  }

  // photoText: 사진 1장 + 캡션(아래 / 사진 위 하단 / 사진 위 가운데)
  const photo = photos[0];
  const img = loaded[0];
  if (!photo) return;

  if (photo.position === "below") {
    const captionH = pageH * 0.12;
    if (img) drawPhotoInCell(ctx, img, photo, 0, 0, pageW, pageH - captionH);
    drawCaption(ctx, photo, 0, pageH - captionH, pageW, captionH, CAPTION_FONT_PX[photo.size]);
    return;
  }

  if (img) drawPhotoInCell(ctx, img, photo, 0, 0, pageW, pageH);
  const overlayH = pageH * 0.16;
  const overlayY = photo.position === "overlayCenter" ? pageH / 2 - overlayH / 2 : pageH - overlayH - pageH * 0.03;
  drawCaption(ctx, photo, 0, overlayY, pageW, overlayH, CAPTION_FONT_PX[photo.size]);
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/jpeg", 0.92);
}

// 재단선/안전선을 보여주는 "확인용 가이드" 파일에서만 쓰는 값이에요.
// (레드프린팅에서 공식적으로 확인받은 수치가 아니라, 업계에서 흔히 쓰는 안전여백 기준이에요.
//  실제 안전여백 기준을 제작처에서 알려주면 이 값을 그 값으로 바꿔주세요.)
export const GUIDE_SAFETY_MARGIN_MM = 8; // 혜민님 확인 기준(2026-09): 재단선 안쪽 안전여백 약 8mm
const GUIDE_WORK_COLOR = "#22a559"; // 작업선(파일 바깥 여유분 경계) - 초록
const GUIDE_TRIM_COLOR = "#ff2fb0"; // 재단선 - 마젠타
const GUIDE_SAFETY_COLOR = "#2f7bff"; // 안전선 - 파랑

function strokeDashedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lineWidthPx: number
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidthPx;
  ctx.setLineDash([mmToPx(2.2), mmToPx(1.6)]);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// 스프레드로 이어지는 안쪽(접히는) 면은 실제로 잘리는 자리가 아니라서,
// 그쪽 변만 빼고 나머지 3면만 그려요.
function strokeDashedRectSkipSide(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  lineWidthPx: number,
  skipSide: "left" | "right"
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidthPx;
  ctx.setLineDash([mmToPx(2.2), mmToPx(1.6)]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  if (skipSide !== "left") {
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
  }
  if (skipSide !== "right") {
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
  }
  ctx.stroke();
  ctx.restore();
}

function drawCornerMarks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  armPx: number,
  color: string,
  lineWidthPx: number,
  hideEdge?: "left" | "right"
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidthPx;
  ctx.setLineDash([]);
  // side: 접힘면 쪽 모서리는 크롭마크도 생략해요.
  const corners: [number, number, number, number, "left" | "right"][] = [
    [x, y, 1, 1, "left"],
    [x + w, y, -1, 1, "right"],
    [x, y + h, 1, -1, "left"],
    [x + w, y + h, -1, -1, "right"],
  ];
  corners
    .filter(([, , , , side]) => side !== hideEdge)
    .forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + dx * armPx, cy);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + dy * armPx);
      ctx.stroke();
    });
  ctx.restore();
}

// 재단선(마젠타 점선) + 안전선(파란 점선) + 모서리 크롭마크 + 규격 라벨을 캔버스 위에 그려요.
// 이 오버레이는 "확인용 가이드" 파일에만 들어가고, 실제 발주 파일에는 들어가지 않아요.
function drawGuideOverlay(
  ctx: CanvasRenderingContext2D,
  pxW: number,
  pxH: number,
  bleedPx: number,
  safetyPx: number,
  label: string,
  // 스프레드로 이어지는 접힘면(가운데) 쪽은 실제로 잘리는 자리가 아니라서,
  // 작업선·재단선·안전선을 전부 그쪽 변만 빼고 그려요. (스프레드 전체를 하나로 감싸는 형태)
  hideEdge?: "left" | "right"
) {
  const lineW = Math.max(2, Math.round(mmToPx(0.25)));
  const armPx = mmToPx(3);

  // 작업선 - 파일(작업 사이즈) 맨 바깥 경계예요. 재단 오차 때문에 정확히 이 선까지 잘리진 않지만,
  // 배경이 꽉 찬 페이지는 이 선까지 사진/배경을 채워야 흰 여백 없이 재단돼요.
  if (hideEdge) {
    strokeDashedRectSkipSide(ctx, 0, 0, pxW, pxH, GUIDE_WORK_COLOR, lineW, hideEdge);
  } else {
    strokeDashedRect(ctx, 0, 0, pxW, pxH, GUIDE_WORK_COLOR, lineW);
  }

  // 재단선 - 작업(전체 캔버스) 안쪽으로 재단여유(bleed)만큼 들어간, 실제로 잘리는 자리
  if (hideEdge) {
    strokeDashedRectSkipSide(
      ctx,
      bleedPx,
      bleedPx,
      pxW - bleedPx * 2,
      pxH - bleedPx * 2,
      GUIDE_TRIM_COLOR,
      lineW,
      hideEdge
    );
  } else {
    strokeDashedRect(ctx, bleedPx, bleedPx, pxW - bleedPx * 2, pxH - bleedPx * 2, GUIDE_TRIM_COLOR, lineW);
  }
  drawCornerMarks(ctx, bleedPx, bleedPx, pxW - bleedPx * 2, pxH - bleedPx * 2, armPx, GUIDE_TRIM_COLOR, lineW, hideEdge);

  // 안전선 - 재단선에서 다시 안쪽으로 들어간 자리 (사진/글자가 이 안쪽에 있어야 잘려도 안전해요)
  const sx = bleedPx + safetyPx;
  const sy = bleedPx + safetyPx;
  if (hideEdge) {
    strokeDashedRectSkipSide(ctx, sx, sy, pxW - sx * 2, pxH - sy * 2, GUIDE_SAFETY_COLOR, lineW, hideEdge);
  } else {
    strokeDashedRect(ctx, sx, sy, pxW - sx * 2, pxH - sy * 2, GUIDE_SAFETY_COLOR, lineW);
  }

  ctx.save();
  const fontPx = Math.round(mmToPx(3.2));
  ctx.font = `${fontPx}px Pretendard, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = GUIDE_WORK_COLOR;
  ctx.fillText(
    `작업선(초록) · 재단선(마젠타) · 안전선(파랑, ${GUIDE_SAFETY_MARGIN_MM}mm)`,
    mmToPx(2),
    mmToPx(2)
  );
  ctx.fillStyle = "#333333";
  ctx.fillText(label, mmToPx(2), mmToPx(2) + fontPx * 1.3);
  ctx.restore();
}


// ---- 마지막 소개 페이지(발행 정보) ----
// 표지 전체를 꽉 채우는 방식이 아니라, 왼쪽 하단 영역에 위에서부터 "작은 사진 → 제목 →
// 발행일 → 만든이 → 제작 : KEEPIC" 순서로 쌓아요. 사진은 앞표지에서 쓴 크롭·비율을
// 그대로 재사용해요(drawPhotoInCell을 그대로 써서, 화면 미리보기의 IntroPhotoMirror와
// 같은 계산을 공유해요). 안전영역(GUIDE_SAFETY_MARGIN_MM) 안쪽에 들어가도록, 왼쪽·아래
// 기준을 안전선 위치로 잡아요.
// public/logo.svg의 원본 가로:세로 비율이에요 (lib/printPdfLib.ts의 KEEPIC_LOGO_ASPECT와 같은 값).
const KEEPIC_LOGO_ASPECT = 1204 / 416;

export async function drawIntroPage(
  ctx: CanvasRenderingContext2D,
  pageW: number,
  pageH: number,
  coverPhoto: PrintPhoto | null,
  coverTitle: string,
  introDate: string,
  introMaker: string
): Promise<void> {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

  const safetyPx = mmToPx(GUIDE_SAFETY_MARGIN_MM);
  const stackWpx = pageW * 0.32;
  const stackXpx = safetyPx;
  const infoFontPx = Math.round(pageH * 0.018);
  const titleFontPx = Math.round(pageH * 0.03);
  const lineHeightPx = infoFontPx * 1.7;

  const makerLabel = introMaker.trim() || "신규 작성자";
  const infoLines = [`발행일 : ${introDate}`, `만든이 : ${makerLabel}`, `제작 : KEEPIC`];

  // "제작 : KEEPIC" 텍스트 아래에 실제 키픽 로고도 함께 넣어요.
  const logoWpx = stackWpx * 0.42;
  const logoHpx = logoWpx / KEEPIC_LOGO_ASPECT;
  const logoYpx = pageH - safetyPx - logoHpx;
  const logoImg = await loadImage("/logo.svg");
  ctx.drawImage(logoImg, stackXpx, logoYpx, logoWpx, logoHpx);

  // 로고 위로 텍스트(제작:KEEPIC → 만든이 → 발행일) 순으로 쌓아요.
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let cursorY = logoYpx - infoFontPx * 0.7;
  for (let i = infoLines.length - 1; i >= 0; i--) {
    ctx.font = `${infoFontPx}px Pretendard, sans-serif`;
    ctx.fillStyle = "#333333";
    ctx.fillText(infoLines[i], stackXpx, cursorY);
    cursorY -= lineHeightPx;
  }

  cursorY -= infoFontPx * 0.6;
  const title = coverTitle.trim();
  if (title) {
    ctx.font = `bold ${titleFontPx}px Pretendard, sans-serif`;
    ctx.fillStyle = "#111111";
    ctx.fillText(title, stackXpx, cursorY, stackWpx);
    cursorY -= titleFontPx * 1.5;
  }

  const photoHpx = stackWpx; // 표지 패널이 정사각형(panelMm x panelMm)이라 같은 비율을 써요.
  const photoYpx = cursorY - photoHpx;
  if (coverPhoto?.url) {
    const img = await loadImage(coverPhoto.url);
    drawPhotoInCell(ctx, img, coverPhoto, stackXpx, photoYpx, stackWpx, photoHpx);
  }
}

export type SpreadPhotoGroup = { leftIndexes: number[]; rightIndexes: number[] };
export type PrintPdfResult = { printBlob: Blob; guideBlob: Blob };

// 내지 PDF: 스프레드마다 왼쪽/오른쪽 페이지를 각각 한 페이지씩(재단여유 포함 작업 사이즈)
// 실제 크기 그대로 그려서 하나의 PDF로 합쳐요.
// printBlob = 실제 발주용(재단선 표시 없음), guideBlob = 재단선·안전선이 표시된 확인용 파일이에요.
export async function buildInnerPrintPdf({
  customSpreads,
  spreadPhotoGroups,
  photos,
  productionFileSizeMm,
  introPage,
}: {
  customSpreads: SpreadDef[];
  spreadPhotoGroups: SpreadPhotoGroup[];
  photos: PrintPhoto[];
  productionFileSizeMm: string | null;
  // "마지막 소개 페이지"(발행 정보) — 있으면 내지 맨 마지막 장으로 한 장 더 추가해요.
  // 짝을 이루는 스프레드 없이 이 장 혼자 맨 뒤에 붙어요.
  introPage?: {
    coverPhoto: PrintPhoto | null;
    coverTitle: string;
    introDate: string;
    introMaker: string;
  } | null;
}): Promise<PrintPdfResult> {
  const { w: workW, h: workH } = parseWorkSizeMm(productionFileSizeMm);
  const pxW = mmToPx(workW);
  const pxH = mmToPx(workH);
  const bleedPx = mmToPx(printFileSpec.innerTrimBleedMm);
  const safetyPx = mmToPx(GUIDE_SAFETY_MARGIN_MM);
  const trimW = workW - printFileSpec.innerTrimBleedMm * 2;
  const trimH = workH - printFileSpec.innerTrimBleedMm * 2;
  const label = `작업 ${workW}×${workH}mm / 재단 ${trimW}×${trimH}mm`;

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했어요.");

  let pdf: jsPDF | null = null;
  let guidePdf: jsPDF | null = null;
  const orientation = workW >= workH ? "l" : "p";

  for (let i = 0; i < customSpreads.length; i++) {
    const spread = customSpreads[i];
    const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
    // 스프레드 1(i === 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 항상 고정돼요.
    const sides: { templateId: PageTemplateId; indexes: number[]; hideEdge: "left" | "right" }[] = [
      { templateId: i === 0 ? "blank" : spread.left, indexes: leftIndexes, hideEdge: "right" },
      { templateId: spread.right, indexes: rightIndexes, hideEdge: "left" },
    ];

    for (const side of sides) {
      const sidePhotos = side.indexes.map((idx) => photos[idx]).filter(Boolean);
      // 페이지를 순서대로(1p, 2p, ...) 그려야 해서 일부러 순차적으로 기다려요.
      await drawPage(
        ctx,
        side.templateId,
        sidePhotos,
        pxW,
        pxH,
        spread.backgroundColor ?? "#ffffff",
        spread.backgroundPattern
      );
      const cleanDataUrl = canvasToJpegDataUrl(canvas);
      drawGuideOverlay(ctx, pxW, pxH, bleedPx, safetyPx, label, side.hideEdge);
      const guideDataUrl = canvasToJpegDataUrl(canvas);

      if (!pdf || !guidePdf) {
        pdf = new jsPDF({ orientation, unit: "mm", format: [workW, workH] });
        guidePdf = new jsPDF({ orientation, unit: "mm", format: [workW, workH] });
      } else {
        pdf.addPage([workW, workH], orientation);
        guidePdf.addPage([workW, workH], orientation);
      }
      pdf.addImage(cleanDataUrl, "JPEG", 0, 0, workW, workH);
      guidePdf.addImage(guideDataUrl, "JPEG", 0, 0, workW, workH);
    }
  }

  if (introPage) {
    // "마지막 소개 페이지"는 실제로 인쇄되는 내지의 마지막 장이라서, 다른 내지 페이지들과
    // 똑같이 순서대로 이어서 한 장 더 그려요(짝이 되는 스프레드 없이 이 장 혼자예요).
    await drawIntroPage(
      ctx,
      pxW,
      pxH,
      introPage.coverPhoto,
      introPage.coverTitle,
      introPage.introDate,
      introPage.introMaker
    );
    const introCleanDataUrl = canvasToJpegDataUrl(canvas);
    drawGuideOverlay(ctx, pxW, pxH, bleedPx, safetyPx, label);
    const introGuideDataUrl = canvasToJpegDataUrl(canvas);

    if (!pdf || !guidePdf) {
      pdf = new jsPDF({ orientation, unit: "mm", format: [workW, workH] });
      guidePdf = new jsPDF({ orientation, unit: "mm", format: [workW, workH] });
    } else {
      pdf.addPage([workW, workH], orientation);
      guidePdf.addPage([workW, workH], orientation);
    }
    pdf.addImage(introCleanDataUrl, "JPEG", 0, 0, workW, workH);
    guidePdf.addImage(introGuideDataUrl, "JPEG", 0, 0, workW, workH);

    // 소개 페이지 다음 장(뒷표지 안쪽 면)도 인쇄되지 않는 빈 면으로 한 장 더 붙여요 —
    // 스프레드 1의 강제 빈 면과 짝을 이뤄서, 앞뒤 표지 안쪽 면이 모두 빈 면으로
    // 마무리되도록 해요.
    await drawPage(ctx, "blank", [], pxW, pxH, "#ffffff");
    const backBlankCleanDataUrl = canvasToJpegDataUrl(canvas);
    drawGuideOverlay(ctx, pxW, pxH, bleedPx, safetyPx, label);
    const backBlankGuideDataUrl = canvasToJpegDataUrl(canvas);
    pdf.addPage([workW, workH], orientation);
    guidePdf.addPage([workW, workH], orientation);
    pdf.addImage(backBlankCleanDataUrl, "JPEG", 0, 0, workW, workH);
    guidePdf.addImage(backBlankGuideDataUrl, "JPEG", 0, 0, workW, workH);
  }

  if (!pdf || !guidePdf) {
    pdf = new jsPDF({ orientation: "p", unit: "mm", format: [workW, workH] });
    guidePdf = new jsPDF({ orientation: "p", unit: "mm", format: [workW, workH] });
  }

  return { printBlob: pdf.output("blob"), guideBlob: guidePdf.output("blob") };
}

// ---- 책등(spine) 제목 · 로고 ----
// lib/printPdfLib.ts(테스트용 pdf-lib 생성기)의 같은 이름 로직을 캔버스(px) 기준으로
// 옮긴 거예요. 비율 상수는 동일하게 맞춰서 두 생성기의 책등 결과가 서로 비슷하게 나와요.
const SPINE_TEXT_SIDE_PADDING_MM = 1.5;
const SPINE_TITLE_MARGIN_RATIO = 0.06;
const SPINE_TITLE_COLUMN_GAP_RATIO = 0.15;
const SPINE_TITLE_MIN_FONT_PX = 6; // printPdfLib.ts의 4pt(≈5.3px)보다 조금 더 여유 있게 잡았어요.
const SPINE_TITLE_LOGO_GAP_RATIO = 0.03;
const SPINE_LOGO_HEIGHT_RATIO = 0.85;
const SPINE_LOGO_BOTTOM_MARGIN_MM = 8;
const SPINE_LOGO_MIN_CROSS_MM = 10;

function computeSpineTitleLayoutPx(
  charCount: number,
  spinePx: number,
  panelPx: number,
  logoReserveHeightPx: number
): {
  fits: boolean;
  size: number;
  charsPerColumn: number;
  gapPx: number;
  blockCrossPx: number;
  blockLengthPx: number;
  marginPx: number;
  gapBeforeLogoPx: number;
} {
  const sidePaddingPx = mmToPx(SPINE_TEXT_SIDE_PADDING_MM);
  const maxCrossPx = Math.max(4, spinePx - sidePaddingPx * 2);
  const marginPx = panelPx * SPINE_TITLE_MARGIN_RATIO;
  const gapBeforeLogoPx = logoReserveHeightPx > 0 ? panelPx * SPINE_TITLE_LOGO_GAP_RATIO : 0;
  const maxLengthPx = Math.max(4, panelPx - marginPx * 2 - logoReserveHeightPx - gapBeforeLogoPx);

  let size = maxCrossPx;
  let charsPerColumn = Math.max(1, Math.floor(maxLengthPx / size));
  let fits = false;
  while (size >= SPINE_TITLE_MIN_FONT_PX) {
    charsPerColumn = Math.max(1, Math.floor(maxLengthPx / size));
    const columnCount = Math.ceil(charCount / charsPerColumn);
    const gapPx = size * SPINE_TITLE_COLUMN_GAP_RATIO;
    const totalCrossPx = columnCount * size + Math.max(0, columnCount - 1) * gapPx;
    if (totalCrossPx <= maxCrossPx) {
      fits = true;
      break;
    }
    size -= 0.5;
  }
  if (size < SPINE_TITLE_MIN_FONT_PX) {
    size = SPINE_TITLE_MIN_FONT_PX;
    charsPerColumn = Math.max(1, Math.floor(maxLengthPx / size));
  }
  const columnCount = Math.ceil(charCount / charsPerColumn);
  const gapPx = size * SPINE_TITLE_COLUMN_GAP_RATIO;
  const blockCrossPx = columnCount * size + Math.max(0, columnCount - 1) * gapPx;
  const blockLengthPx = Math.min(maxLengthPx, charsPerColumn * size);

  return { fits, size, charsPerColumn, gapPx, blockCrossPx, blockLengthPx, marginPx, gapBeforeLogoPx };
}

// 문장 전체를 눕히지 않고, 한 글자씩 정방향으로 위→아래로 쌓아요. 한 열에 다 못 담으면
// 오른쪽에 새 열을 추가해요(왼쪽 열부터 읽혀요). logoReserveHeightPx만큼은 로고 자리로
// 비워둬서 겹치지 않아요.
function drawSpineTitleCanvas(
  ctx: CanvasRenderingContext2D,
  title: string,
  spineXpx: number,
  spinePx: number,
  panelPx: number,
  bleedPx: number,
  logoReserveHeightPx: number
): boolean {
  const chars = Array.from(title.trim());
  if (chars.length === 0) return true;

  const layout = computeSpineTitleLayoutPx(chars.length, spinePx, panelPx, logoReserveHeightPx);
  const { fits, size, charsPerColumn, gapPx, blockCrossPx, blockLengthPx, marginPx, gapBeforeLogoPx } = layout;

  // 세로 방향(책등 길이) 위치: 로고 위 공간(제목 가능 영역) 한가운데에 둬요.
  const usableBottomPx = marginPx + logoReserveHeightPx + gapBeforeLogoPx;
  const usableTopPx = panelPx - marginPx;
  const usableHeightPx = Math.max(0, usableTopPx - usableBottomPx);
  const blockTopFromPanelBottomPx = usableBottomPx + usableHeightPx / 2 + blockLengthPx / 2;

  // 가로 방향(책등 폭) 위치: 열 블록 전체를 책등 폭 가운데 정렬해요.
  const spineCenterXpx = spineXpx + spinePx / 2;
  const blockLeftXpx = spineCenterXpx - blockCrossPx / 2;

  ctx.font = `bold ${size}px Pretendard, sans-serif`;
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  for (let i = 0; i < chars.length; i++) {
    const col = Math.floor(i / charsPerColumn);
    const row = i % charsPerColumn;
    const ch = chars[i];
    if (ch.trim() === "") continue;

    const colCenterXpx = blockLeftXpx + col * (size + gapPx) + size / 2;
    // row 0이 블록 맨 위 글자예요. 캔버스는 y가 아래로 증가해서, panelPx 바닥 기준
    // 거리(...FromPanelBottomPx)를 "패널 안에서 위에서부터의 y좌표"로 뒤집어요.
    const yFromPanelBottomPx = blockTopFromPanelBottomPx - row * size;
    const yPx = bleedPx + (panelPx - yFromPanelBottomPx) + size * 0.78;

    ctx.fillText(ch, colCenterXpx, yPx);
  }

  return fits;
}

// 책등 폭(spinePx) 기준으로 로고를 얼마나 크게 그릴지, 혹은 너무 좁아서 생략할지 계산해요.
function computeSpineLogoLayoutPx(spinePx: number): {
  fits: boolean;
  drawnWidthPx: number;
  drawnHeightPx: number;
} {
  const sidePaddingPx = mmToPx(SPINE_TEXT_SIDE_PADDING_MM);
  const maxCrossPx = Math.max(0, spinePx - sidePaddingPx * 2);
  if (maxCrossPx < mmToPx(SPINE_LOGO_MIN_CROSS_MM)) {
    return { fits: false, drawnWidthPx: 0, drawnHeightPx: 0 };
  }
  const drawnWidthPx = maxCrossPx * SPINE_LOGO_HEIGHT_RATIO;
  const drawnHeightPx = drawnWidthPx / KEEPIC_LOGO_ASPECT;
  return { fits: true, drawnWidthPx, drawnHeightPx };
}

// 로고는 회전 없이 "Keepic"이 왼쪽→오른쪽으로 읽히는 정방향 그대로, 책등 아래쪽 고정
// 위치에 넣어요.
function drawSpineLogoCanvas(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  spineXpx: number,
  spinePx: number,
  panelPx: number,
  bleedPx: number,
  layout: { drawnWidthPx: number; drawnHeightPx: number }
) {
  const spineCenterXpx = spineXpx + spinePx / 2;
  const x = spineCenterXpx - layout.drawnWidthPx / 2;
  // 캔버스 y는 위에서 아래로 증가하니, "패널 바닥에서 고정 여백만큼 위"는
  // 패널 맨 아래(bleedPx + panelPx)에서 위로 올라간 자리예요.
  const y = bleedPx + panelPx - mmToPx(SPINE_LOGO_BOTTOM_MARGIN_MM) - layout.drawnHeightPx;
  ctx.drawImage(logoImg, x, y, layout.drawnWidthPx, layout.drawnHeightPx);
}

// 표지 PDF: 뒤표지 - 책등(세네카) - 앞표지가 한 장으로 이어진 펼침 도면 1페이지를 만들어요.
// 앞표지에는 고객이 고른 사진과 제목을 넣고, 책등엔 책등 제목·키픽 로고를, 뒤표지엔
// 키픽 로고(기본) 또는 작은 사진을 넣어요.
// printBlob = 실제 발주용, guideBlob = 재단선·안전선·책등 경계가 표시된 확인용 파일이에요.
export async function buildCoverPrintPdf({
  cover,
  sizeInnerTrimMm,
  coverPhoto,
  coverTitle,
  coverTitleFontScale = 1,
  coverTitleFontFamily = "Pretendard, sans-serif",
  innerPaperWeightG,
  pages,
  spineTitle,
  backCoverMode = "logo",
  backCoverPhoto = null,
  backCoverBackgroundColor,
}: {
  cover: PhotobookCoverId;
  sizeInnerTrimMm: number; // 내지 재단 사이즈(정사각형 한 변, mm) — 예: L=300
  coverPhoto: PrintPhoto | null;
  coverTitle: string;
  coverTitleFontScale?: number; // 표지 제목 글자 크기 배율(1이 기본). 혜민님이 화면에서 조절 가능해요.
  coverTitleFontFamily?: string; // 표지 제목 서체(CSS font-family 값). 캔버스로 그려서 jsPDF에
  // 넣기 때문에, 브라우저에 로드된 폰트라면(화면 편집기의 서체 선택지와 같은 값) 그대로 반영돼요.
  innerPaperWeightG: number;
  pages: number;
  spineTitle?: string; // 책등 제목. 비어 있으면 coverTitle을 대신 써요.
  backCoverMode?: "logo" | "photo";
  backCoverPhoto?: PrintPhoto | null;
  backCoverBackgroundColor?: string;
}): Promise<PrintPdfResult> {
  const panelMm =
    cover === "hard" ? sizeInnerTrimMm + printFileSpec.hardCoverPanelOverhangMm * 2 : sizeInnerTrimMm;
  const bleedMm = cover === "hard" ? printFileSpec.hardCoverWrapBleedMm : printFileSpec.softCoverBleedMm;
  // 레드프린팅에 실측 확인받은 페이지 수(20p)라면 그 정확한 값을 그대로 쓰고,
  // 아직 실측값이 없는 페이지 수라면 참고용 예상치의 여유치(0.5~1mm) 포함 최대값을 써서
  // 너무 좁게 잡히는 것보다는 안전하게 맞춰요.
  const spine = calcEstimatedSpineWidthMm(innerPaperWeightG, pages, cover);
  const spineMm = spine.isConfirmed ? spine.estimateMm : spine.maxMm;

  const totalWmm = panelMm * 2 + spineMm + bleedMm * 2;
  const totalHmm = panelMm + bleedMm * 2;

  const pxW = mmToPx(totalWmm);
  const pxH = mmToPx(totalHmm);
  const bleedPx = mmToPx(bleedMm);
  const panelPx = mmToPx(panelMm);
  const spinePx = mmToPx(spineMm);
  const safetyPx = mmToPx(GUIDE_SAFETY_MARGIN_MM);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했어요.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pxW, pxH);

  // 뒤표지(왼쪽) 영역 — 배경색을 채우고, 무지로 비워두지 않도록 키픽 로고(기본) 또는
  // 작은 사진을 가운데에 배치해요. 바깥쪽(왼쪽)·위·아래는 실제 재단 경계라서 도련까지
  // 포함해서 채워요(책등 쪽만 접히는 자리라 도련이 필요 없어요).
  const backCellWpx = bleedPx + panelPx;
  const backCellHpx = panelPx + bleedPx * 2;
  if (backCoverBackgroundColor) {
    ctx.fillStyle = backCoverBackgroundColor;
    ctx.fillRect(0, 0, backCellWpx, backCellHpx);
  }
  const backCenterXpx = backCellWpx / 2;
  const backCenterYpx = backCellHpx / 2;
  if (backCoverMode === "photo" && backCoverPhoto?.url) {
    const backImg = await loadImage(backCoverPhoto.url);
    const naturalW = backImg.naturalWidth || 1;
    const naturalH = backImg.naturalHeight || 1;
    const squarePx = Math.min(backCellWpx, backCellHpx) * 0.46;
    let sx = 0;
    let sy = 0;
    const sSize = Math.min(naturalW, naturalH);
    if (naturalW > naturalH) sx = (naturalW - sSize) / 2;
    else sy = (naturalH - sSize) / 2;
    ctx.drawImage(
      backImg,
      sx,
      sy,
      sSize,
      sSize,
      backCenterXpx - squarePx / 2,
      backCenterYpx - squarePx / 2,
      squarePx,
      squarePx
    );
  } else {
    const backLogoImg = await loadImage("/logo.svg");
    const backLogoWpx = backCellWpx * 0.34;
    const backLogoHpx = backLogoWpx / KEEPIC_LOGO_ASPECT;
    ctx.drawImage(
      backLogoImg,
      backCenterXpx - backLogoWpx / 2,
      backCenterYpx - backLogoHpx / 2,
      backLogoWpx,
      backLogoHpx
    );
  }

  // 책등(세네카) 영역 — 배경을 채우고, 책등 제목(있으면)과 키픽 로고를 넣어요.
  const spineX = bleedPx + panelPx;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(spineX, bleedPx, spinePx, panelPx);

  const spineLogoLayout = computeSpineLogoLayoutPx(spinePx);
  const spineTitleText = (spineTitle ?? coverTitle ?? "").trim();
  if (spineTitleText) {
    drawSpineTitleCanvas(
      ctx,
      spineTitleText,
      spineX,
      spinePx,
      panelPx,
      bleedPx,
      spineLogoLayout.fits ? spineLogoLayout.drawnHeightPx : 0
    );
  }
  if (spineLogoLayout.fits) {
    const spineLogoImg = await loadImage("/logo.svg");
    drawSpineLogoCanvas(ctx, spineLogoImg, spineX, spinePx, panelPx, bleedPx, spineLogoLayout);
  }

  // 앞표지(오른쪽) 영역에 사진 + 제목
  const frontX = spineX + spinePx;
  // 사진 칸을 "재단 패널(panelPx)"이 아니라 "패널 + 바깥쪽 도련"까지 넓게 잡아요. 앞표지의
  // 오른쪽·위·아래는 실제로 종이가 재단되는 바깥 경계라서, 사진이 도련 끝까지 채워져
  // 있어야 재단 위치가 살짝 밀려도 흰 여백이 보이지 않아요(책등 쪽은 접히는 자리일 뿐
  // 재단되지 않아서 도련이 필요 없어요). 이 칸 크기는 화면 편집기(app/upload/page.tsx의
  // 앞표지 칸)와 반드시 같은 비율이어야, 화면에서 "프레임 채우기"로 맞춘 구도가 인쇄
  // 파일에도 그대로 나와요.
  const frontCellWpx = panelPx + bleedPx;
  const frontCellHpx = panelPx + bleedPx * 2;
  if (coverPhoto?.url) {
    const img = await loadImage(coverPhoto.url);
    drawPhotoInCell(ctx, img, coverPhoto, frontX, 0, frontCellWpx, frontCellHpx);
  }
  if (coverTitle.trim()) {
    const titlePx = Math.round(panelPx * 0.07 * coverTitleFontScale);
    ctx.font = `bold ${titlePx}px ${coverTitleFontFamily}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = titlePx * 0.4;
    ctx.fillText(coverTitle.trim(), frontX + panelPx / 2, bleedPx + panelPx - panelPx * 0.08, panelPx * 0.86);
    ctx.shadowBlur = 0;
  }

  const cleanDataUrl = canvasToJpegDataUrl(canvas);

  // 가이드용: 뒤표지·앞표지는 각각 "페이지 기준"으로 작업선·재단선·안전선을 따로 표시해요.
  // 책등 쪽 변은 실제로 잘리는 자리가 아니라서 그 변만 생략하고, 책등 경계는 아래
  // 옅은 점선(책등 안내선)으로만 표시해요. (책등 자체에는 안전선을 넣지 않아요)
  const spineNote = `책등 ${spineMm}mm(${spine.isConfirmed ? "실측" : "예상치"})`;
  drawGuideOverlay(
    ctx,
    spineX,
    pxH,
    bleedPx,
    safetyPx,
    `뒤표지 · 작업 ${roundMm(totalWmm)}×${roundMm(totalHmm)}mm / ${spineNote}`,
    "right"
  );
  ctx.save();
  ctx.translate(frontX - bleedPx, 0);
  drawGuideOverlay(ctx, panelPx + bleedPx, pxH, bleedPx, safetyPx, "앞표지", "left");
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "#8a7f66";
  ctx.setLineDash([mmToPx(1.5), mmToPx(1.5)]);
  ctx.lineWidth = Math.max(2, Math.round(mmToPx(0.2)));
  [spineX, spineX + spinePx].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, bleedPx);
    ctx.lineTo(x, bleedPx + panelPx);
    ctx.stroke();
  });
  ctx.restore();
  const guideDataUrl = canvasToJpegDataUrl(canvas);

  const orientation = totalWmm >= totalHmm ? "l" : "p";
  const pdf = new jsPDF({ orientation, unit: "mm", format: [totalWmm, totalHmm] });
  pdf.addImage(cleanDataUrl, "JPEG", 0, 0, totalWmm, totalHmm);
  const guidePdf = new jsPDF({ orientation, unit: "mm", format: [totalWmm, totalHmm] });
  guidePdf.addImage(guideDataUrl, "JPEG", 0, 0, totalWmm, totalHmm);

  return { printBlob: pdf.output("blob"), guideBlob: guidePdf.output("blob") };
}

function roundMm(mm: number) {
  return Math.round(mm * 10) / 10;
}

export { pxToMm, mmToPx };
