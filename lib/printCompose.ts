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

// 재단선/안전선을 보여주는 "확인용 가이드" 파일에서만 쓰는 값이에요.
// (레드프린팅에서 공식적으로 확인받은 수치가 아니라, 업계에서 흔히 쓰는 안전여백 기준이에요.
//  실제 안전여백 기준을 제작처에서 알려주면 이 값을 그 값으로 바꿔주세요.)
const GUIDE_SAFETY_MARGIN_MM = 8; // 혜민님 확인 기준(2026-09): 재단선 안쪽 안전여백 약 8mm
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
}: {
  customSpreads: SpreadDef[];
  spreadPhotoGroups: SpreadPhotoGroup[];
  photos: PrintPhoto[];
  productionFileSizeMm: string | null;
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
    const sides: { templateId: PageTemplateId; indexes: number[]; hideEdge: "left" | "right" }[] = [
      { templateId: spread.left, indexes: leftIndexes, hideEdge: "right" },
      { templateId: spread.right, indexes: rightIndexes, hideEdge: "left" },
    ];

    for (const side of sides) {
      const sidePhotos = side.indexes.map((idx) => photos[idx]).filter(Boolean);
      // 페이지를 순서대로(1p, 2p, ...) 그려야 해서 일부러 순차적으로 기다려요.
      await drawPage(ctx, side.templateId, sidePhotos, pxW, pxH);
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

  if (!pdf || !guidePdf) {
    pdf = new jsPDF({ orientation: "p", unit: "mm", format: [workW, workH] });
    guidePdf = new jsPDF({ orientation: "p", unit: "mm", format: [workW, workH] });
  }

  return { printBlob: pdf.output("blob"), guideBlob: guidePdf.output("blob") };
}

// 표지 PDF: 뒤표지 - 책등(세네카) - 앞표지가 한 장으로 이어진 펼침 도면 1페이지를 만들어요.
// 앞표지에는 고객이 고른 사진과 제목을 넣고, 책등/뒤표지는 우선 흰색 배경으로 비워둬요.
// printBlob = 실제 발주용, guideBlob = 재단선·안전선·책등 경계가 표시된 확인용 파일이에요.
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

  const cleanDataUrl = canvasToJpegDataUrl(canvas);

  // 가이드용: 표지 전체 재단선/안전선 + 뒤표지·책등·앞표지 경계선을 함께 표시해요.
  drawGuideOverlay(
    ctx,
    pxW,
    pxH,
    bleedPx,
    safetyPx,
    `작업 ${roundMm(totalWmm)}×${roundMm(totalHmm)}mm / 책등 ${spineMm}mm(${spine.isConfirmed ? "실측" : "예상치"})`
  );
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
