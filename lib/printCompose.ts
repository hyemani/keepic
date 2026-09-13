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
};

const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;

function mmToPx(mm: number) {
  return Math.round((mm / MM_PER_INCH) * PRINT_DPI);
}

function pxToMm(px: number) {
  return (px / PRINT_DPI) * MM_PER_INCH;
}

function parseWorkSizeMm(productionFileSizeMm: string | null): { w: number; h: number } {
  const match = (productionFileSizeMm ?? "").match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
  if (!match) return { w: 310, h: 310 }; // 혹시 규격을 못 읽으면 L사이즈 기준으로 안전하게
  return { w: parseFloat(match[1]), h: parseFloat(match[3]) };
}

function loadImage(url: string): Promise<HTMLImageElement> {
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
function drawPhotoInCell(
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
  let baseW: number;
  let baseH: number;
  if (imgRatio > cellRatio) {
    baseH = cellH;
    baseW = cellH * imgRatio;
  } else {
    baseW = cellW;
    baseH = cellW / imgRatio;
  }

  const drawW = baseW * photo.scale;
  const drawH = baseH * photo.scale;
  let drawX = cellX + (cellW - drawW) / 2;
  let drawY = cellY + (cellH - drawH) / 2;

  // 화면에서 드래그했던 픽셀 거리(x, y)를, 그 사진칸의 화면 크기 대비 비율로 환산해서
  // 인쇄용 캔버스 크기에 똑같이 적용해요.
  const fx = photo.containerW > 0 ? cellW / photo.containerW : 0;
  const fy = photo.containerH > 0 ? cellH / photo.containerH : 0;
  drawX += photo.x * fx;
  drawY += photo.y * fy;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
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
  pageH: number
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pageW, pageH);

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

export type SpreadPhotoGroup = { leftIndexes: number[]; rightIndexes: number[] };

// 내지 PDF: 스프레드마다 왼쪽/오른쪽 페이지를 각각 한 페이지씩(재단여유 포함 작업 사이즈)
// 실제 크기 그대로 그려서 하나의 PDF로 합쳐요.
export async function buildInnerPrintPdf({
  customSpreads,
  spreadPhotoGroups,
  photos,
  productionFileSizeMm,
}: {
  customSpreads: SpreadDef[];
  spreadPhotoGroups: SpreadPhotoGroup[];
  photos: PrintPhoto[];
  productionFileSizeMm: string | null;
}): Promise<Blob> {
  const { w: workW, h: workH } = parseWorkSizeMm(productionFileSizeMm);
  const pxW = mmToPx(workW);
  const pxH = mmToPx(workH);

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했어요.");

  let pdf: jsPDF | null = null;

  for (let i = 0; i < customSpreads.length; i++) {
    const spread = customSpreads[i];
    const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
    const sides: { templateId: PageTemplateId; indexes: number[] }[] = [
      { templateId: spread.left, indexes: leftIndexes },
      { templateId: spread.right, indexes: rightIndexes },
    ];

    for (const side of sides) {
      const sidePhotos = side.indexes.map((idx) => photos[idx]).filter(Boolean);
      // 페이지를 순서대로(1p, 2p, ...) 그려야 해서 일부러 순차적으로 기다려요.
      await drawPage(ctx, side.templateId, sidePhotos, pxW, pxH);
      const dataUrl = canvasToJpegDataUrl(canvas);

      if (!pdf) {
        pdf = new jsPDF({ orientation: workW >= workH ? "l" : "p", unit: "mm", format: [workW, workH] });
      } else {
        pdf.addPage([workW, workH], workW >= workH ? "l" : "p");
      }
      pdf.addImage(dataUrl, "JPEG", 0, 0, workW, workH);
    }
  }

  if (!pdf) {
    pdf = new jsPDF({ orientation: "p", unit: "mm", format: [workW, workH] });
  }

  return pdf.output("blob");
}

// 표지 PDF: 뒤표지 - 책등(세네카) - 앞표지가 한 장으로 이어진 펼침 도면 1페이지를 만들어요.
// 앞표지에는 고객이 고른 사진과 제목을 넣고, 책등/뒤표지는 우선 흰색 배경으로 비워둬요.
export async function buildCoverPrintPdf({
  cover,
  sizeInnerTrimMm,
  coverPhoto,
  coverTitle,
  innerPaperWeightG,
  pages,
}: {
  cover: PhotobookCoverId;
  sizeInnerTrimMm: number; // 내지 재단 사이즈(정사각형 한 변, mm) — 예: L=300
  coverPhoto: PrintPhoto | null;
  coverTitle: string;
  innerPaperWeightG: number;
  pages: number;
}): Promise<Blob> {
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

  const canvas = document.createElement("canvas");
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 만들지 못했어요.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pxW, pxH);

  // 책등 영역 표시(옅은 안내선 — 실제 인쇄에는 큰 영향 없는 옅은 색이에요)
  const spineX = bleedPx + panelPx;
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(spineX, bleedPx, spinePx, panelPx);

  // 앞표지(오른쪽) 영역에 사진 + 제목
  const frontX = spineX + spinePx;
  if (coverPhoto?.url) {
    const img = await loadImage(coverPhoto.url);
    drawPhotoInCell(ctx, img, coverPhoto, frontX, bleedPx, panelPx, panelPx);
  }
  if (coverTitle.trim()) {
    const titlePx = Math.round(panelPx * 0.07);
    ctx.font = `bold ${titlePx}px Pretendard, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = titlePx * 0.4;
    ctx.fillText(coverTitle.trim(), frontX + panelPx / 2, bleedPx + panelPx - panelPx * 0.08, panelPx * 0.86);
    ctx.shadowBlur = 0;
  }

  const dataUrl = canvasToJpegDataUrl(canvas);
  const pdf = new jsPDF({
    orientation: totalWmm >= totalHmm ? "l" : "p",
    unit: "mm",
    format: [totalWmm, totalHmm],
  });
  pdf.addImage(dataUrl, "JPEG", 0, 0, totalWmm, totalHmm);

  return pdf.output("blob");
}

export { pxToMm, mmToPx };
