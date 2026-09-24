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
import { PageTemplateId, SpreadDef, TextBoxDef, ImageBoxDef, pageTemplates, sortStackedBoxes } from "@/lib/albumTemplates";
import { findBackgroundPattern, drawBackgroundPatternOnCanvas } from "@/lib/backgroundPatterns";
import { computeImageBoxCoverRect } from "@/lib/imageBoxGeometry";
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

// 화면(app/upload/page.tsx의 TextBoxOverlay)과 같은 좌표계로 텍스트박스 하나를 그려요:
// xPct/yPct/widthPct는 그 페이지 전체를 100%로 보는 퍼센트, fontScale은 coverTitle과
// 같은 방식의 배율이에요. Canvas는 자동 줄바꿈을 안 해줘서, 지정한 너비를 넘으면
// 직접 줄을 나눠요(영어 단어 기준으로 먼저 나누고, 그래도 넘치면 한 글자씩 더 나눠요 —
// 띄어쓰기가 없는 한국어 문장도 자연스럽게 줄바꿈되도록).
function wrapTextForCanvas(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let current = "";
    for (const ch of paragraph) {
      const attempt = current + ch;
      if (current && ctx.measureText(attempt).width > maxWidth) {
        lines.push(current);
        current = ch;
      } else {
        current = attempt;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// fontScale(배율, 1이 기본)을 실제 픽셀 크기로 환산할 때 곱하는 "페이지 폭 대비 비율"
// 이에요 — 화면(app/upload/page.tsx)에서 0.85rem * fontScale로 그리는 것과 같은 비율이
// 되도록 맞춘 값이라(coverTitle의 titlePx = panelPx * 0.07 * scale와 같은 방식), 화면·
// 인쇄가 항상 같은 크기로 보여요. lib/textBoxFontSize.ts의 pt 환산도 이 상수를 그대로
// 가져다 써서(문자 패널의 "글자 크기(pt)" 입력), 화면에 보여주는 pt 숫자가 실제 인쇄
// 결과와 어긋나지 않게 해요 — 값을 바꾸면 그쪽도 같이 바뀌어야 해요.
export const TEXT_BOX_FONT_SCALE_BASE_RATIO = 0.032;

function drawTextBoxOnCanvas(
  ctx: CanvasRenderingContext2D,
  box: TextBoxDef,
  pageW: number,
  pageH: number,
  offsetX: number = 0,
  offsetY: number = 0
) {
  const text = box.text.trim();
  if (!text) return;
  const x = offsetX + (box.xPct / 100) * pageW;
  const y = offsetY + (box.yPct / 100) * pageH;
  const w = (box.widthPct / 100) * pageW;
  const fontPx = Math.max(8, Math.round(pageW * TEXT_BOX_FONT_SCALE_BASE_RATIO * box.fontScale));
  // 기울임(이탤릭)도 화면(app/upload/page.tsx의 CSS fontStyle)과 똑같이 폰트 문자열
  // 맨 앞에 붙여요(2026-10-02, "문자" 패널 밑줄/기울임/배경 기능을 인쇄 PDF에도 반영).
  ctx.font = `${box.italic ? "italic " : ""}${box.bold ? "bold " : ""}${fontPx}px ${box.fontFamily}`;
  ctx.fillStyle = box.color;
  ctx.textAlign = box.align;
  ctx.textBaseline = "top";
  // letterSpacing이 지정돼 있으면(0이 아니어도, 0이어도 "지정"과 "미지정"을 구분해요)
  // 측정(wrapTextForCanvas)도 실제 그리기와 같은 자간으로 해야 줄바꿈 위치가 어긋나지
  // 않아요 — 표지 제목(printCompose.ts의 buildCoverPrintPdf)과 같은 feature-detect
  // 패턴이에요("letterSpacing" in ctx로 지원 여부 확인 후 px 단위 문자열로 지정).
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      box.letterSpacing ? `${fontPx * box.letterSpacing}px` : "0px";
  }
  // 행간 배수가 지정 안 됐으면 기존처럼 1.35를 그대로 써요(기존 저장된 텍스트박스가
  // 인쇄 파일에서도 예전과 똑같은 크기로 나오도록).
  const lineHeight = fontPx * (box.lineHeight ?? 1.35);
  const lines = wrapTextForCanvas(ctx, text, w);
  const textX = box.align === "left" ? x : box.align === "right" ? x + w : x + w / 2;

  // 밑줄·배경을 그릴 때 필요한, 그 줄의 실제 가로폭과 시작 x예요 — 정렬(align)에 따라
  // textX가 왼쪽/가운데/오른쪽 중 어느 기준점인지 다르고, 줄마다 글자 수가 달라 폭도
  // 다르니 줄마다 다시 재요(화면의 boxDecorationBreak: clone과 같은 "줄마다 따로"
  // 느낌을 인쇄 PDF에서도 내려고요).
  const measureLineBox = (line: string) => {
    const lineWidth = ctx.measureText(line).width;
    const lineStartX =
      box.align === "left" ? textX : box.align === "right" ? textX - lineWidth : textX - lineWidth / 2;
    return { lineStartX, lineWidth };
  };

  // 글자 배경(하이라이트)을 지정했으면 글자를 그리기 전에 먼저 그려요(글자가 배경 위에
  // 올라오도록) — 화면(TextBoxOverlay)의 backgroundColor + em 단위 패딩과 같은 비율로
  // 맞췄어요(기본값 가로 40%·세로 25%, box.backgroundPaddingXPct/YPct로 조절).
  const drawLineBackground = (line: string, lineY: number) => {
    if (!box.backgroundColor) return;
    const { lineStartX, lineWidth } = measureLineBox(line);
    const padX = (fontPx * (box.backgroundPaddingXPct ?? 40)) / 100;
    const padY = (fontPx * (box.backgroundPaddingYPct ?? 25)) / 100;
    ctx.save();
    ctx.fillStyle = box.backgroundColor;
    ctx.fillRect(lineStartX - padX / 2, lineY - padY / 2, lineWidth + padX, fontPx + padY);
    ctx.restore();
  };

  // 밑줄은 글자를 그린 "다음"에 그려요(글자 위에 선이 깔끔히 보이도록) — 베이스라인
  // 근처(글자 높이의 약 92% 지점)에 글자 색과 같은 색, 글자 크기에 비례한 두께로 그어요.
  const drawLineUnderline = (line: string, lineY: number) => {
    if (!box.underline) return;
    const { lineStartX, lineWidth } = measureLineBox(line);
    const underlineY = lineY + fontPx * 0.92;
    ctx.save();
    ctx.strokeStyle = box.color;
    ctx.lineWidth = Math.max(1, fontPx * 0.06);
    ctx.beginPath();
    ctx.moveTo(lineStartX, underlineY);
    ctx.lineTo(lineStartX + lineWidth, underlineY);
    ctx.stroke();
    ctx.restore();
  };

  // 높이(heightPct)가 정해져 있으면 화면과 똑같이 그 안쪽만 그리고 넘치는 줄은 잘라요
  // (일러스트레이터 텍스트박스처럼 높이를 고정한 경우예요). 세로 정렬(verticalAlign)에
  // 따라 남는 세로 공간만큼 시작 y를 아래로 밀어요 — 화면(app/upload/page.tsx)의 flex
  // justify-content와 같은 결과가 나오도록.
  if (box.heightPct !== undefined) {
    const h = (box.heightPct / 100) * pageH;
    const textBlockHeight = lines.length * lineHeight;
    const extraSpace = Math.max(0, h - textBlockHeight);
    const startYOffset =
      box.verticalAlign === "middle" ? extraSpace / 2 : box.verticalAlign === "bottom" ? extraSpace : 0;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    lines.forEach((line, i) => {
      const lineY = y + startYOffset + i * lineHeight;
      if (lineY - y > h) return;
      drawLineBackground(line, lineY);
      ctx.fillText(line, textX, lineY, w);
      drawLineUnderline(line, lineY);
    });
    ctx.restore();
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    }
    return;
  }

  lines.forEach((line, i) => {
    const lineY = y + i * lineHeight;
    drawLineBackground(line, lineY);
    ctx.fillText(line, textX, lineY, w);
    drawLineUnderline(line, lineY);
  });
  // 다음에 이 ctx로 그릴 다른 글자(다른 텍스트박스·캡션 등)에 이 박스의 자간이
  // 그대로 남아 번지지 않도록 매번 원상복구해요(표지 제목과 같은 패턴).
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  }
}

async function drawPage(
  ctx: CanvasRenderingContext2D,
  templateId: PageTemplateId,
  photos: PrintPhoto[],
  pageW: number,
  pageH: number,
  backgroundColor: string = "#ffffff",
  backgroundPatternId?: string,
  textBoxes?: TextBoxDef[],
  // 스프레드 전체 기준 자유 배치 이미지박스예요. 이 낱장(왼쪽/오른쪽)에서 보이는 부분만
  // 잘라 그려요 — pageOffsetPx/spreadWidthPx가 그 계산에 필요해요.
  imageBoxes?: ImageBoxDef[],
  pageOffsetPx?: number,
  spreadWidthPx?: number
) {
  await drawPageTemplate(ctx, templateId, photos, pageW, pageH, backgroundColor, backgroundPatternId, pageOffsetPx, spreadWidthPx);
  // 2026-09-25, "종류 상관없이 전부" 레이어 순서 기능: 사진박스·텍스트박스를 예전처럼
  // "사진 전부 먼저, 텍스트 전부 나중"(두 단계 루프)으로 그리지 않고, 화면
  // (app/upload/page.tsx의 ImageBoxLayer/TextBoxLayer)과 완전히 같은 sortStackedBoxes
  // 정렬 순서로 한 번에 그려요 — 그래야 화면에서 사진을 텍스트 위로 올리면 PDF에서도
  // 똑같이 사진이 위에 그려져요.
  const canPlaceImages = imageBoxes && pageOffsetPx !== undefined && spreadWidthPx !== undefined;
  const stackedOrder = sortStackedBoxes(canPlaceImages ? imageBoxes! : [], textBoxes ?? []);
  const imageById = new Map((imageBoxes ?? []).map((b) => [b.id, b] as const));
  const textById = new Map((textBoxes ?? []).map((b) => [b.id, b] as const));
  for (const item of stackedOrder) {
    if (item.kind === "image") {
      if (!canPlaceImages) continue;
      const box = imageById.get(item.id);
      // 아직 사진을 안 채운 빈 프레임(url이 빈 문자열)은 인쇄 파일에 아무것도 안
      // 그려요(2026-09-23) — 미리보기 화면에서만 "+사진 추가" 안내로 보여요.
      if (!box || !box.url) continue;
      const img = await loadImage(box.url);
      drawImageBoxOnCanvas(ctx, box, img, pageW, pageH, pageOffsetPx!, spreadWidthPx!);
    } else {
      const box = textById.get(item.id);
      if (!box) continue;
      drawTextBoxOnCanvas(ctx, box, pageW, pageH);
    }
  }
}

// 자유 배치 이미지박스 하나를 이 낱장(페이지)에 그려요. 박스 좌표는 "스프레드 전체 폭"을
// 100%로 보는 좌표라서, 이 페이지의 오프셋(pageOffsetPx: 왼쪽 낱장은 0, 오른쪽 낱장은
// spreadWidthPx의 절반)만큼 빼서 이 낱장 기준 좌표로 바꿔요. 박스가 페이지 경계를
// 넘어가면 이 페이지 캔버스 바깥으로 그려지는 부분이 생기는데, 클립으로 페이지 안쪽만
// 남기고 나머지는 자동으로 잘려요 — 같은 사진을 양쪽 낱장에 각각 이렇게 그리면, 실제로
// 펼쳤을 때 하나로 이어져 보여요.
function drawImageBoxOnCanvas(
  ctx: CanvasRenderingContext2D,
  box: ImageBoxDef,
  img: HTMLImageElement,
  pageW: number,
  pageH: number,
  pageOffsetPx: number,
  spreadWidthPx: number
) {
  const boxLeftSpreadPx = (box.xPct / 100) * spreadWidthPx;
  const boxTopPx = (box.yPct / 100) * pageH;
  const boxWidthSpreadPx = (box.widthPct / 100) * spreadWidthPx;
  const boxHeightPx = (box.heightPct / 100) * pageH;
  const boxLeftPagePx = boxLeftSpreadPx - pageOffsetPx;

  // 이 페이지와 전혀 안 겹치면 그릴 필요 없어요.
  if (boxLeftPagePx + boxWidthSpreadPx <= 0 || boxLeftPagePx >= pageW) return;

  // 박스(틀) 크기와 사진 원본 비율이 다를 수 있어요(가로·세로를 따로 조절할 수 있어서) —
  // 화면 미리보기와 똑같이 computeImageBoxCoverRect로 "박스를 항상 꽉 채우면서, 사용자가
  // 고른 확대/위치만큼 보이는 부분을 옮긴" 결과를 계산해서 그려요. 박스를 조절해도 이
  // 확대/위치(innerScale·innerOffset)는 그대로 유지된 채 새 박스 크기 기준으로 다시
  // 계산되기 때문에, 그냥 drawImage(img, x, y, boxW, boxH)로 늘려 그릴 때와 달리 사진이
  // 찌그러지거나 빈 여백이 생기지 않아요(2026-09-22 확정).
  const rect = computeImageBoxCoverRect(
    boxWidthSpreadPx,
    boxHeightPx,
    img.naturalWidth || box.naturalWidth,
    img.naturalHeight || box.naturalHeight,
    box.innerOffsetXPct ?? 0,
    box.innerOffsetYPct ?? 0,
    box.innerScale ?? 1
  );

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, pageW, pageH);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(boxLeftPagePx, boxTopPx, boxWidthSpreadPx, boxHeightPx);
  ctx.clip();
  // 투명도(2026-09-26 "편집툴 투명도" 요청으로 추가) — save()/restore() 안에서만
  // 바꿔서, 이 박스를 다 그리고 나면 자동으로 원래 값(1)으로 돌아가요.
  ctx.globalAlpha = box.opacity ?? 1;
  if (box.flipX) {
    // 화면 미리보기(scaleX(-1))와 똑같이, 그리는 좌표축만 좌우로 뒤집어서 그려요 —
    // 그러면 사진이 찌그러지지 않고 딱 그 자리에서 거울처럼 뒤집혀 보여요.
    ctx.save();
    ctx.translate(boxLeftPagePx + rect.x + rect.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, boxTopPx + rect.y, rect.width, rect.height);
    ctx.restore();
  } else {
    ctx.drawImage(img, boxLeftPagePx + rect.x, boxTopPx + rect.y, rect.width, rect.height);
  }
  // 테두리(2026-09-26 "편집툴 테두리" 요청으로 추가) — 화면(ImageBoxOverlay)에서
  // inset box-shadow로 박스 안쪽에 그린 것과 같은 결과가 되도록, strokeRect도 선
  // 두께의 절반만큼 안쪽으로 밀어서 그려요(그냥 박스 경계에 그리면 선의 바깥 절반이
  // 페이지 클립에 잘려서 화면보다 얇아 보여요). borderWidthPx는 화면 CSS px 기준이라,
  // 인쇄 캔버스 해상도(PRINT_DPI)에 맞게 같은 비율(PRINT_DPI/96)로 환산해요.
  if (box.borderWidthPx && box.borderWidthPx > 0) {
    const printBorderPx = box.borderWidthPx * (PRINT_DPI / 96);
    ctx.lineWidth = printBorderPx;
    ctx.strokeStyle = box.borderColor ?? "#ffffff";
    ctx.strokeRect(
      boxLeftPagePx + printBorderPx / 2,
      boxTopPx + printBorderPx / 2,
      boxWidthSpreadPx - printBorderPx,
      boxHeightPx - printBorderPx
    );
  }
  ctx.restore();
}

// 표지 앞표지·뒤표지의 "레이아웃" 탭(여러 장 배치, 2026-09-24)용이에요 — 위
// drawImageBoxOnCanvas와 같은 계산(computeImageBoxCoverRect)을 쓰지만, 스프레드처럼
// 페이지 경계를 넘나들 일이 없는 패널 하나(앞표지 칸 또는 뒤표지 칸) 안에서만 그려서 더
// 단순해요. box의 xPct 등은 이 패널 자체를 100%로 보는 좌표예요(화면 편집기의 표지
// 레이아웃 탭과 같은 좌표계). 빈 프레임(url이 빈 문자열)은 그대로 건너뛰어요.
async function drawImageBoxesInPanel(
  ctx: CanvasRenderingContext2D,
  boxes: ImageBoxDef[],
  originXpx: number,
  originYpx: number,
  panelWpx: number,
  panelHpx: number
) {
  for (const box of boxes) {
    if (!box.url) continue;
    const img = await loadImage(box.url);
    const boxLeftPx = originXpx + (box.xPct / 100) * panelWpx;
    const boxTopPx = originYpx + (box.yPct / 100) * panelHpx;
    const boxWidthPx = (box.widthPct / 100) * panelWpx;
    const boxHeightPx = (box.heightPct / 100) * panelHpx;
    const rect = computeImageBoxCoverRect(
      boxWidthPx,
      boxHeightPx,
      img.naturalWidth || box.naturalWidth,
      img.naturalHeight || box.naturalHeight,
      box.innerOffsetXPct ?? 0,
      box.innerOffsetYPct ?? 0,
      box.innerScale ?? 1
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(boxLeftPx, boxTopPx, boxWidthPx, boxHeightPx);
    ctx.clip();
    // 투명도·테두리(2026-09-26 추가) — drawImageBoxOnCanvas와 같은 방식이에요.
    ctx.globalAlpha = box.opacity ?? 1;
    if (box.flipX) {
      ctx.save();
      ctx.translate(boxLeftPx + rect.x + rect.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, boxTopPx + rect.y, rect.width, rect.height);
      ctx.restore();
    } else {
      ctx.drawImage(img, boxLeftPx + rect.x, boxTopPx + rect.y, rect.width, rect.height);
    }
    if (box.borderWidthPx && box.borderWidthPx > 0) {
      const printBorderPx = box.borderWidthPx * (PRINT_DPI / 96);
      ctx.lineWidth = printBorderPx;
      ctx.strokeStyle = box.borderColor ?? "#ffffff";
      ctx.strokeRect(
        boxLeftPx + printBorderPx / 2,
        boxTopPx + printBorderPx / 2,
        boxWidthPx - printBorderPx,
        boxHeightPx - printBorderPx
      );
    }
    ctx.restore();
  }
}

async function drawPageTemplate(
  ctx: CanvasRenderingContext2D,
  templateId: PageTemplateId,
  photos: PrintPhoto[],
  pageW: number,
  pageH: number,
  backgroundColor: string = "#ffffff",
  backgroundPatternId?: string,
  // 2026-10-06, 혜민님 요청: "그라데이션이 낱장만 적용되는데 스프레드페이지 기준으로
  // 적용해주세요" — 전체 스프레드 기준 좌표를 계산하기 위한 이 낱장의 오프셋·전체 폭.
  pageOffsetPx?: number,
  spreadWidthPx?: number
) {
  const pattern = findBackgroundPattern(backgroundPatternId);
  if (pattern) {
    const fullSpan =
      pageOffsetPx !== undefined && spreadWidthPx !== undefined
        ? { x: -pageOffsetPx, y: 0, w: spreadWidthPx, h: pageH }
        : undefined;
    drawBackgroundPatternOnCanvas(ctx, pattern, 0, 0, pageW, pageH, mmToPx, fullSpan);
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
    // 여백(마진)이 안전영역(GUIDE_SAFETY_MARGIN_MM)보다 좁아지지 않도록 둘 중 큰 값을
    // 써요 — 작은 사이즈 페이지에서 비율(8%)만 쓰면 실제 mm 여백이 안전영역보다 좁아질
    // 수 있어서, 재단이 살짝 밀리면 사진 가장자리가 잘려 보일 수 있었어요.
    const margin = Math.max(pageW * 0.08, mmToPx(GUIDE_SAFETY_MARGIN_MM));
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
    // fullMargin과 같은 이유로, 여백이 안전영역보다 좁아지지 않도록 해요.
    const pad = Math.max(pageW * 0.06, mmToPx(GUIDE_SAFETY_MARGIN_MM));
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
export const GUIDE_SAFETY_MARGIN_MM = 15; // 혜민님 확인 기준(2026-09-26 개정): 재단선 안쪽 안전여백 10mm → 15mm(네 면 모두)
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
const KEEPIC_LOGO_ASPECT = 1155 / 367; // public/logo.svg의 실제 그림(투명 여백 제외) 가로:세로 비율 — 2026-09-22, 여백 없이 벡터가 꽉 찬 기준으로 변경

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
    // 스프레드 1(i === 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 항상 고정돼요
    // (텍스트박스도 함께 생략해요 — 인쇄 안 되는 면이라 화면에서도 편집할 수 없어요).
    // 이미지박스는 오른쪽 면(1페이지, 시작 페이지)에는 꾸밀 수 있게 허용해요(2026-09
    // 혜민님 확인) — drawImageBoxOnCanvas가 각 낱장 폭 기준으로 이미 잘라 그려서,
    // 왼쪽(인쇄 안 되는) 면으로 넘어간 부분은 자동으로 생략돼요.
    const spreadImageBoxes = spread.imageBoxes;
    const spreadWidthPx = pxW * 2; // 이미지박스 좌표는 "스프레드 전체 폭"(낱장 두 개) 기준이에요.
    const sides: {
      templateId: PageTemplateId;
      indexes: number[];
      hideEdge: "left" | "right";
      textBoxes?: TextBoxDef[];
      pageOffsetPx: number;
    }[] = [
      {
        templateId: i === 0 ? "blank" : spread.left,
        indexes: leftIndexes,
        hideEdge: "right",
        textBoxes: i === 0 ? undefined : spread.textBoxesLeft,
        pageOffsetPx: 0,
      },
      {
        templateId: spread.right,
        indexes: rightIndexes,
        hideEdge: "left",
        textBoxes: spread.textBoxesRight,
        pageOffsetPx: pxW,
      },
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
        spread.backgroundPattern,
        side.textBoxes,
        spreadImageBoxes,
        side.pageOffsetPx,
        spreadWidthPx
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
const SPINE_TITLE_SIDE_PADDING_MM = 1.5; // 혜민님 확인(2026-09-19): 책등 여백 1.5mm.
const SPINE_TITLE_TOP_MARGIN_MM = 25; // 책 제목 위쪽 여백 — 혜민님 확인(2026-09): 재단선(책등 맨 위)에서 25mm
const SPINE_TITLE_MIN_FONT_PX = 50; // 12pt(300dpi 기준 50px) 밑으로는 줄이지 않아요 — 혜민님 확인: 소프트커버 최소 책등(7.22mm)에도 11~12pt가 넉넉히 들어가요.
const SPINE_TITLE_MAX_FONT_RATIO = 0.55; // 혜민님 확인(2026-09-19): 책등 폭에 꽉 채우면 글자가 너무 커 보여서, 짧은 제목이어도 책등 폭의 55%까지만 커지도록 상한을 둬요(길면 이 상한 밑으로 더 줄어들어요).
const SPINE_TITLE_LOGO_GAP_RATIO = 0.03;

// 책 제목 — 별도의 "책등 제목" 입력칸 없이 앞표지 제목을 그대로 써요(2026-09, 혜민님
// 확인). 키픽 로고와 같은 방향으로 90도 눕혀서 한 줄로 그려요(글자를 하나씩 세로로
// 쌓지 않아요) — 그래야 로고처럼 위(첫 글자)→아래(마지막 글자)로 자연스럽게 읽혀요.
// 폰트 크기는 책등 폭(cross)에 맞춰 최대한 크게 잡은 뒤, 글자가 다 안 들어가면(length
// 방향) 줄여요 — 그래서 화면/파일 크기와 무관하게 항상 실제 mm 기준으로 최대 크기예요.
function drawSpineTitleCanvas(
  ctx: CanvasRenderingContext2D,
  title: string,
  spineXpx: number,
  spinePx: number,
  panelPx: number,
  bleedPx: number,
  logoReserveHeightPx: number,
  titleBoxTopPx?: number, // 화면에서 끌어서 정한 텍스트박스의 위쪽 위치(패널 위쪽 기준 px)
  titleBoxHeightPx?: number, // 같은 텍스트박스의 높이(px)
  fontSizePt?: number, // 혜민님이 직접 고른 글자 크기(pt). 비워두면 책등 폭 기준 자동 크기.
  fontFamily: string = "Pretendard, sans-serif"
): boolean {
  const trimmed = title.trim();
  if (!trimmed) return true;

  const sidePaddingPx = mmToPx(SPINE_TITLE_SIDE_PADDING_MM);
  const maxCrossPx = Math.max(4, spinePx - sidePaddingPx * 2); // 책등 폭 방향 한도 — 폰트 크기(글자 높이)가 이걸 넘지 않아요. 여백(1.5mm)이 줄어들지 않도록, 사용자가 아무리 큰 pt를 골라도 이 값 밑으로 클램프해요.
  const topMarginPx = mmToPx(SPINE_TITLE_TOP_MARGIN_MM);
  const gapBeforeLogoPx = logoReserveHeightPx > 0 ? panelPx * SPINE_TITLE_LOGO_GAP_RATIO : 0;
  const maxLengthPx =
    titleBoxHeightPx !== undefined
      ? Math.max(4, titleBoxHeightPx)
      : Math.max(4, panelPx - topMarginPx - logoReserveHeightPx - gapBeforeLogoPx); // 책등 길이 방향 한도(로고 자리는 빼요)

  // 시작 크기: 혜민님이 pt로 직접 골랐으면 그 값(px로 환산)을 쓰되, 책등 여백(1.5mm)이
  // 줄어들지 않도록 maxCrossPx를 넘지 않게 잘라요. 직접 고르지 않았으면(자동) 책등 폭의
  // 55%를 시작 크기로 잡아요 — 어느 쪽이든 글자가 다 안 들어가면(length 방향) 더 줄여요.
  const requestedPx = fontSizePt !== undefined ? mmToPx((fontSizePt * 25.4) / 72) : maxCrossPx * SPINE_TITLE_MAX_FONT_RATIO;
  let size = Math.min(requestedPx, maxCrossPx);
  ctx.font = `bold ${size}px ${fontFamily}`;
  let textWidthPx = ctx.measureText(trimmed).width;
  while (size > SPINE_TITLE_MIN_FONT_PX && textWidthPx > maxLengthPx) {
    size -= 0.5;
    ctx.font = `bold ${size}px ${fontFamily}`;
    textWidthPx = ctx.measureText(trimmed).width;
  }
  if (size < SPINE_TITLE_MIN_FONT_PX) size = SPINE_TITLE_MIN_FONT_PX;
  ctx.font = `bold ${size}px ${fontFamily}`;
  textWidthPx = ctx.measureText(trimmed).width;
  const fits = textWidthPx <= maxLengthPx;

  // 화면에서 사용자가 텍스트박스를 끌어서 정한 자리(있으면)를 시작점으로 쓰고, 없으면
  // 책등 맨 위에서 25mm 내려온 자리부터 시작해요. 책등 폭 방향은 항상 가운데 정렬이에요.
  const spineCenterXpx = spineXpx + spinePx / 2;
  const startFromPanelTopPx = titleBoxTopPx !== undefined ? titleBoxTopPx : topMarginPx;
  const startYpx = bleedPx + startFromPanelTopPx;

  ctx.save();
  ctx.translate(spineCenterXpx, startYpx);
  ctx.rotate(Math.PI / 2); // 키픽 로고와 같은 방향 — 글자가 위(시작)→아래(끝)로 읽혀요
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(trimmed, 0, 0);
  ctx.restore();

  return fits;
}

// 책등 키픽 로고 — 책등이 좁아서(7~9mm) 이미지를 90도로 눕혀서 넣어요(혜민님 확인:
// "오른쪽으로 돌려서" 돌리고, 글자가 위→아래로 읽혀요). 재단선에서 로고가 잘리지 않게,
// 로고 블록의 아래쪽 끝을 재단선(책등 맨 아래)에서 안전영역과 같은 값만큼 띄운 자리에
// 고정해요(사용자가 화면에서 위치를 바꿀 수 없어요) — 임의의 비율이 아니라 실제 mm
// 안전 여백을 기준으로 계산해요.
const SPINE_LOGO_SIDE_PADDING_MM = 0.5; // 혜민님 확인(2026-09-19): 로고는 제목보다 좁은 여백으로 더 크게 — 로고가 작아 보인다는 피드백 반영.
const SPINE_LOGO_HEIGHT_RATIO = 1.0; // 책등 폭(여백 제외) 중 로고가 차지하는 비율 — 혜민님 확인(2026-09-19): 최대한 크게(여백까지 꽉 채움)
const SPINE_LOGO_BOTTOM_MARGIN_MM = 25; // 재단선에서 로고까지 — 혜민님 확인(2026-09): 아래에서 25mm
const SPINE_LOGO_MIN_CROSS_MM = 3; // 실측 책등(예: 소프트커버 20페이지 7.22mm)에서도 로고가 항상 보이도록 낮춘 값이에요.

// 책등 폭(spinePx) 기준으로 로고를 얼마나 크게 그릴지, 혹은 너무 좁아서 생략할지 계산해요.
// 로고를 눕혀서 넣기 때문에, drawnWidthPx/drawnHeightPx는 "눕힌 뒤(화면에 실제로 보이는)"
// 가로/세로 크기예요.
function computeSpineLogoLayoutPx(spinePx: number): {
  fits: boolean;
  drawnWidthPx: number; // 눕힌 뒤 가로(=책등 폭 방향) 크기
  drawnHeightPx: number; // 눕힌 뒤 세로(=책등 길이 방향) 크기 — 원래 로고의 가로가 이쪽으로 와요.
} {
  const sidePaddingPx = mmToPx(SPINE_LOGO_SIDE_PADDING_MM);
  const maxCrossPx = Math.max(0, spinePx - sidePaddingPx * 2);
  if (maxCrossPx < mmToPx(SPINE_LOGO_MIN_CROSS_MM)) {
    return { fits: false, drawnWidthPx: 0, drawnHeightPx: 0 };
  }
  const drawnWidthPx = maxCrossPx * SPINE_LOGO_HEIGHT_RATIO;
  const drawnHeightPx = drawnWidthPx * KEEPIC_LOGO_ASPECT; // 눕혔으니 원래 로고의 가로:세로 비율이 뒤집혀요.
  return { fits: true, drawnWidthPx, drawnHeightPx };
}

// 로고를 눕혀서(90도 회전, "Keepic" 글자가 위→아래로 읽혀요) 그려요. 로고 블록의 아래쪽
// 끝이 책등 맨 아래(재단선)에서 SPINE_LOGO_BOTTOM_MARGIN_MM만큼 띄운 자리에 오도록 둬요.
function drawSpineLogoCanvas(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  spineXpx: number,
  spinePx: number,
  panelPx: number,
  bleedPx: number,
  layout: { drawnWidthPx: number; drawnHeightPx: number }
) {
  const centerXpx = spineXpx + spinePx / 2;
  const bottomMarginPx = mmToPx(SPINE_LOGO_BOTTOM_MARGIN_MM);
  const centerYpx = bleedPx + panelPx - bottomMarginPx - layout.drawnHeightPx / 2;
  ctx.save();
  ctx.translate(centerXpx, centerYpx);
  ctx.rotate(Math.PI / 2); // 글자가 위(시작)->아래(끝)로 읽히도록
  // 회전된 좌표계 안에서는 가로·세로가 서로 바뀌어서, drawImage에는 뒤집어서 넘겨요.
  ctx.drawImage(
    logoImg,
    -layout.drawnHeightPx / 2,
    -layout.drawnWidthPx / 2,
    layout.drawnHeightPx,
    layout.drawnWidthPx
  );
  ctx.restore();
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
  coverTitleFontSizePt = 36,
  coverTitleLineHeightEm = 1.2,
  coverTitleLetterSpacingEm = 0,
  coverTitleFontFamily = "Pretendard, sans-serif",
  coverTitleAlign = "center",
  coverTitleXPct = 8,
  coverTitleYPct = 84,
  coverTitleWidthPct = 84,
  innerPaperWeightG,
  pages,
  spineTitle,
  spineTitleYPct,
  spineTitleHeightPct,
  spineTitleFontSizePt,
  spineTitleFontFamily = "Pretendard, sans-serif",
  backCoverLogo = { xPct: 50, yPct: 50, scalePct: 100 },
  backCoverPhoto = null,
  backCoverBackgroundColor,
  coverPatternId,
  backCoverTextBoxes,
  coverSpineBackgroundColor,
  coverFrontBackgroundColor,
  coverTextBoxes,
  coverImageBoxes,
  backCoverImageBoxes,
}: {
  cover: PhotobookCoverId;
  sizeInnerTrimMm: number; // 내지 재단 사이즈(정사각형 한 변, mm) — 예: L=300
  coverPhoto: PrintPhoto | null;
  coverTitle: string;
  coverTitleFontSizePt?: number; // 표지 제목 글자 크기(pt, 실제 인쇄 크기 그대로). 혜민님이 화면에서 pt 단위로 직접 지정해요.
  coverTitleLineHeightEm?: number; // 행간 배율(폰트 크기 기준). 제목을 줄바꿈(2줄 이상)해서 넣을 때 줄 간격이에요.
  coverTitleLetterSpacingEm?: number; // 자간 배율(폰트 크기 기준). 0이면 기본 자간이에요.
  coverTitleFontFamily?: string; // 표지 제목 서체(CSS font-family 값). 캔버스로 그려서 jsPDF에
  // 넣기 때문에, 브라우저에 로드된 폰트라면(화면 편집기의 서체 선택지와 같은 값) 그대로 반영돼요.
  coverTitleAlign?: "left" | "center" | "right"; // 2026-10-05, 혜민님 요청: 화면
  // 편집기(CoverTitleOverlay)의 "문단 정렬"과 같은 값. 기본 "center"는 예전부터 항상
  // 가운데 정렬이던 동작 그대로예요.
  // 표지 제목 위치예요(앞표지 칸 전체를 100%로 보는 퍼센트) — 화면에서 끌어서 옮긴 자리
  // 그대로예요. 기본값은 예전 고정 위치(하단 중앙)와 비슷해요.
  coverTitleXPct?: number;
  coverTitleYPct?: number;
  coverTitleWidthPct?: number;
  innerPaperWeightG: number;
  pages: number;
  spineTitle?: string; // 책등 제목. 비어 있으면 coverTitle을 대신 써요.
  spineTitleYPct?: number; // 책등 텍스트박스의 위쪽 위치(책등 패널 높이 기준 %). 화면에서
  // 끌어서 옮긴 자리 그대로예요. 지정 안 하면 예전처럼 자동으로 맨 위에 둬요.
  spineTitleHeightPct?: number; // 같은 텍스트박스의 높이(%). 지정 안 하면 자동 계산해요.
  spineTitleFontSizePt?: number; // 책등 제목 글자 크기(pt) — 혜민님이 화면에서 직접 지정. 비워두면 책등 폭에 맞춰 자동으로 정해요.
  spineTitleFontFamily?: string; // 책등 제목 서체(CSS font-family 값). 표지 제목과 별도로 고를 수 있어요.
  // 뒤표지 키픽 로고예요(2026-09, backCoverMode 토글을 대체) — null이면 로고를
  // 그리지 않고, 값이 있으면 그 위치(중심 기준 %)·크기(기본 100%=예전 고정 크기)로
  // 그려요. 사진(backCoverPhoto/backCoverImageBoxes)과는 독립된 객체라 함께 있을 수 있어요.
  backCoverLogo?: { xPct: number; yPct: number; scalePct: number } | null;
  backCoverPhoto?: PrintPhoto | null;
  backCoverBackgroundColor?: string;
  coverPatternId?: string; // 표지 전체(앞표지·책등·뒤표지) 그래픽·패턴·텍스처예요(2026-09-30, "적용범위" 메뉴 없애고 전체 표지에 하나로 통일). 지정하면 배경색보다 우선해요.
  backCoverTextBoxes?: TextBoxDef[]; // 뒤표지에 자유 배치한 텍스트박스예요.
  coverSpineBackgroundColor?: string; // 지정 안 하면 앞·뒤표지와 같은 흰색(#ffffff) 그대로예요(2026-09-25, 혜민님 요청 — 예전엔 아이보리 #f4f1ea가 기본값이라 흰 표지인데 책등만 베이지로 보이는 문제가 있었어요).
  coverFrontBackgroundColor?: string; // 지정 안 하면 흰색 그대로예요(사진 뒤로 비치는 여백 색).
  coverTextBoxes?: TextBoxDef[]; // 표지 앞면에 자유 배치한 텍스트박스예요.
  // 표지 "레이아웃" 탭(2026-09-24, 화면 app/upload/page.tsx)에서 여러 장짜리 템플릿을
  // 적용했을 때 쓰는 사진 배열이에요. 비어있으면(레이아웃을 안 썼으면) 기존처럼
  // coverPhoto/backCoverPhoto 사진 1장 방식 그대로 그려요.
  coverImageBoxes?: ImageBoxDef[];
  backCoverImageBoxes?: ImageBoxDef[];
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
  // 2026-09-30, "적용범위" 메뉴를 없애고 표지 전체(앞표지·책등·뒤표지)에 같은
  // 패턴을 적용하게 되면서, 이 패턴 객체를 뒤표지뿐 아니라 아래 책등·앞표지 영역을
  // 그릴 때도 그대로 재사용해요(화면 미리보기의 resolveSpreadBackgroundCss와 같은
  // 레시피를 Canvas로 그리는 셈).
  const coverPattern = findBackgroundPattern(coverPatternId);
  // 2026-10-06, 혜민님 요청: "그라데이션이 낱장만 적용되는데 스프레드페이지 기준으로
  // 적용해주세요" — 뒤표지·책등·앞표지 전체 폭(coverTotalCoverSpanWpx)을 기준으로 한
  // 그라데이션 하나를 세 군데 모두에 넘겨서, 제본 경계에서 끊기지 않고 이어지게 해요.
  const coverTotalCoverSpanWpx = backCellWpx + spinePx + backCellWpx;
  const coverFullSpan = { x: 0, y: 0, w: coverTotalCoverSpanWpx, h: backCellHpx };
  if (coverPattern) {
    drawBackgroundPatternOnCanvas(ctx, coverPattern, 0, 0, backCellWpx, backCellHpx, mmToPx, coverFullSpan);
  } else if (backCoverBackgroundColor) {
    ctx.fillStyle = backCoverBackgroundColor;
    ctx.fillRect(0, 0, backCellWpx, backCellHpx);
  }
  const backCenterXpx = backCellWpx / 2;
  const backCenterYpx = backCellHpx / 2;
  // 사진(레이아웃 여러 장 또는 사진 1장)과 로고는 이제 서로 독립된 객체라 함께
  // 있을 수 있어요(2026-09, backCoverMode 배타적 토글 제거) — 사진이 있으면 항상
  // 그리고, 로고는 backCoverLogo가 있을 때만 별도로 그 위·아래에 얹어요.
  // 뒤표지 키픽 로고는 표지 제목과 같은 이유로 "레이어 순서" 시스템 밖에 있는
  // 고정 요소예요(2026-09-25) — 화면(app/upload/page.tsx)에서도 별도 z-index로
  // 그려서, 사진·텍스트 순서를 아무리 바꿔도 로고 자체는 재정렬 대상이 아니에요.
  // 다만 "사진은 로고 아래, 텍스트는 로고 위"였던 예전 기본 모습은 그대로 지키고
  // 싶어서, effectiveZOrder()의 기본 텍스트 기준선(1000)을 그대로 로고를 그리는
  // 시점으로 재사용해요 — z<1000(기본 사진, 또는 명시적으로 뒤로 보낸 텍스트)은
  // 로고보다 먼저, z>=1000(기본 텍스트, 또는 명시적으로 앞으로 보낸 사진)은 로고보다
  // 나중에 그려요.
  const BACK_LOGO_Z_THRESHOLD = 1000;
  // TypeScript는 아래 화살표 함수(닫힘) 안에서 바깥 ctx의 non-null 좁히기를 그대로
  // 이어받지 못해서(위에서 이미 throw로 null을 걸러냈는데도) 별도 상수로 한 번 더
  // 확정해줘요.
  const ctxNN: CanvasRenderingContext2D = ctx;
  async function drawBackCoverLogo() {
    if (!backCoverLogo) return;
    // xPct/yPct는 뒤표지 칸(backCellWpx × backCellHpx) 기준, 로고 "중심"의 위치 %예요
    // (화면 편집기의 CSS left/top % + translate(-50%,-50%)와 같은 기준 — 2026-09).
    // scalePct 100 = 예전 고정 크기(칸 너비의 34%)와 같은 크기예요.
    const backLogoImg = await loadImage("/logo.svg");
    const scale = (backCoverLogo.scalePct ?? 100) / 100;
    const backLogoWpx = backCellWpx * 0.34 * scale;
    const backLogoHpx = backLogoWpx / KEEPIC_LOGO_ASPECT;
    const logoCenterXpx = backCellWpx * ((backCoverLogo.xPct ?? 50) / 100);
    const logoCenterYpx = backCellHpx * ((backCoverLogo.yPct ?? 50) / 100);
    ctxNN.drawImage(
      backLogoImg,
      logoCenterXpx - backLogoWpx / 2,
      logoCenterYpx - backLogoHpx / 2,
      backLogoWpx,
      backLogoHpx
    );
  }

  if (backCoverImageBoxes && backCoverImageBoxes.length > 0) {
    // 레이아웃 탭에서 여러 장 배치를 적용한 뒤표지예요 — 화면 편집기(ImageBoxLayer/
    // TextBoxLayer)와 완전히 같은 sortStackedBoxes 순서로, 사진·텍스트를 종류
    // 상관없이 하나로 섞어서 그려요(2026-09-25).
    const backStack = sortStackedBoxes(backCoverImageBoxes, backCoverTextBoxes ?? []);
    const backImgById = new Map(backCoverImageBoxes.map((b) => [b.id, b] as const));
    const backTxtById = new Map((backCoverTextBoxes ?? []).map((b) => [b.id, b] as const));
    let backLogoDrawn = !backCoverLogo;
    for (const item of backStack) {
      if (!backLogoDrawn && item.z >= BACK_LOGO_Z_THRESHOLD) {
        await drawBackCoverLogo();
        backLogoDrawn = true;
      }
      if (item.kind === "image") {
        const box = backImgById.get(item.id);
        if (box) await drawImageBoxesInPanel(ctx, [box], 0, 0, backCellWpx, backCellHpx);
      } else {
        const box = backTxtById.get(item.id);
        if (box) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, backCellWpx, backCellHpx);
          ctx.clip();
          drawTextBoxOnCanvas(ctx, box, backCellWpx, backCellHpx, 0, 0);
          ctx.restore();
        }
      }
    }
    if (!backLogoDrawn) await drawBackCoverLogo();
  } else {
    if (backCoverPhoto?.url) {
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
    }
    await drawBackCoverLogo();
    if (backCoverTextBoxes) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, backCellWpx, backCellHpx);
      ctx.clip();
      for (const box of backCoverTextBoxes) {
        drawTextBoxOnCanvas(ctx, box, backCellWpx, backCellHpx, 0, 0);
      }
      ctx.restore();
    }
  }

  // 책등(세네카) 영역 — 배경을 채우고, 책등 제목(있으면)과 키픽 로고를 넣어요.
  const spineX = bleedPx + panelPx;
  if (coverPattern) {
    drawBackgroundPatternOnCanvas(ctx, coverPattern, spineX, bleedPx, spinePx, panelPx, mmToPx, coverFullSpan);
  } else {
    ctx.fillStyle = coverSpineBackgroundColor ?? "#ffffff";
    ctx.fillRect(spineX, bleedPx, spinePx, panelPx);
  }

  const spineLogoLayout = computeSpineLogoLayoutPx(spinePx);
  const spineTitleText = (spineTitle ?? coverTitle ?? "").replace(/\n/g, " ").trim();
  if (spineTitleText) {
    drawSpineTitleCanvas(
      ctx,
      spineTitleText,
      spineX,
      spinePx,
      panelPx,
      bleedPx,
      spineLogoLayout.fits ? spineLogoLayout.drawnHeightPx + mmToPx(SPINE_LOGO_BOTTOM_MARGIN_MM) : 0,
      spineTitleYPct !== undefined ? (spineTitleYPct / 100) * panelPx : undefined,
      spineTitleHeightPct !== undefined ? (spineTitleHeightPct / 100) * panelPx : undefined,
      spineTitleFontSizePt,
      spineTitleFontFamily
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
  if (coverPattern) {
    drawBackgroundPatternOnCanvas(ctx, coverPattern, frontX, 0, frontCellWpx, frontCellHpx, mmToPx, coverFullSpan);
  } else if (coverFrontBackgroundColor) {
    ctx.fillStyle = coverFrontBackgroundColor;
    ctx.fillRect(frontX, 0, frontCellWpx, frontCellHpx);
  }
  // 표지 "제목"(CoverTitleOverlay)은 뒤표지 로고와 같은 이유로 레이어 순서 시스템
  // 밖에 있는 고정 요소예요(2026-09-25) — 화면에서도 별도 z-28로 그려서, 자유 배치
  // 사진·텍스트박스를 서로 어떻게 재정렬해도 제목 자체는 그 목록에 안 섞여요. "사진은
  // 제목 아래, 텍스트박스는 제목 위"였던 예전 기본 모습은 뒤표지 로고와 똑같이
  // effectiveZOrder()의 텍스트 기준선(1000)을 재사용해서 지켜요.
  const FRONT_TITLE_Z_THRESHOLD = 1000;
  async function drawCoverTitle() {
    if (!coverTitle.trim()) return;
    // 화면(CoverTitleOverlay)과 같은 칸 크기(frontCellWpx/Hpx)를 100%로 보는 퍼센트
    // 좌표라서, 화면에서 끌어다 놓은 자리와 인쇄 파일 자리가 같아요. 화면은 텍스트박스
    // 위에서 아래로 흐르는 왼쪽위 기준(top-left)이라, 여기서도 textBaseline을 top으로
    // 맞춰요. 글자 크기는 슬라이더 배율이 아니라 pt 단위 실제 크기를 그대로 써요(예:
    // 24pt, 36pt). Enter로 줄바꿈하면 여러 줄로 나눠 그리고, 줄 간격(행간)·자간도
    // 사용자가 지정한 값을 그대로 반영해요.
    const titlePx = mmToPx((coverTitleFontSizePt * 25.4) / 72);
    ctxNN.font = `bold ${titlePx}px ${coverTitleFontFamily}`;
    ctxNN.fillStyle = "#ffffff";
    ctxNN.textAlign = coverTitleAlign;
    ctxNN.textBaseline = "top";
    ctxNN.shadowColor = "rgba(0,0,0,0.45)";
    ctxNN.shadowBlur = titlePx * 0.4;
    if ("letterSpacing" in ctxNN) {
      (ctxNN as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${titlePx * coverTitleLetterSpacingEm}px`;
    }
    const titleBoxLeftPx = frontX + (coverTitleXPct / 100) * frontCellWpx;
    const titleBoxWidthPx = (coverTitleWidthPct / 100) * frontCellWpx;
    const titleXpx =
      coverTitleAlign === "left"
        ? titleBoxLeftPx
        : coverTitleAlign === "right"
          ? titleBoxLeftPx + titleBoxWidthPx
          : titleBoxLeftPx + titleBoxWidthPx / 2;
    const titleYpx = (coverTitleYPct / 100) * frontCellHpx;
    const titleMaxWidthPx = (coverTitleWidthPct / 100) * frontCellWpx;
    const titleLinePx = titlePx * coverTitleLineHeightEm;
    const titleLines = coverTitle.trim().split("\n");
    titleLines.forEach((line, i) => {
      ctxNN.fillText(line, titleXpx, titleYpx + i * titleLinePx, titleMaxWidthPx);
    });
    if ("letterSpacing" in ctxNN) {
      (ctxNN as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    }
    ctxNN.shadowBlur = 0;
  }

  if (coverImageBoxes && coverImageBoxes.length > 0) {
    // 레이아웃 탭에서 여러 장 배치를 적용한 앞표지예요 — 화면 편집기(ImageBoxLayer/
    // TextBoxLayer)와 완전히 같은 sortStackedBoxes 순서로, 사진·텍스트박스를 종류
    // 상관없이 하나로 섞어서 그려요(2026-09-25).
    const frontStack = sortStackedBoxes(coverImageBoxes, coverTextBoxes ?? []);
    const frontImgById = new Map(coverImageBoxes.map((b) => [b.id, b] as const));
    const frontTxtById = new Map((coverTextBoxes ?? []).map((b) => [b.id, b] as const));
    let titleDrawn = !coverTitle.trim();
    for (const item of frontStack) {
      if (!titleDrawn && item.z >= FRONT_TITLE_Z_THRESHOLD) {
        await drawCoverTitle();
        titleDrawn = true;
      }
      if (item.kind === "image") {
        const box = frontImgById.get(item.id);
        if (box) await drawImageBoxesInPanel(ctx, [box], frontX, 0, frontCellWpx, frontCellHpx);
      } else {
        const box = frontTxtById.get(item.id);
        if (box) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(frontX, 0, frontCellWpx, frontCellHpx);
          ctx.clip();
          drawTextBoxOnCanvas(
            ctx,
            { ...box, xPct: box.xPct, yPct: box.yPct, widthPct: box.widthPct },
            frontCellWpx,
            frontCellHpx,
            frontX,
            0
          );
          ctx.restore();
        }
      }
    }
    if (!titleDrawn) await drawCoverTitle();
  } else {
    if (coverPhoto?.url) {
      const img = await loadImage(coverPhoto.url);
      drawPhotoInCell(ctx, img, coverPhoto, frontX, 0, frontCellWpx, frontCellHpx);
    }
    await drawCoverTitle();
    // 표지 앞면 텍스트박스예요. 화면(앞표지 칸)과 같은 칸 크기(frontCellWpx/Hpx)를
    // 100%로 보는 퍼센트 좌표라서, 화면에서 본 자리와 인쇄 파일 자리가 같아요.
    if (coverTextBoxes && coverTextBoxes.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frontX, 0, frontCellWpx, frontCellHpx);
      ctx.clip();
      for (const box of coverTextBoxes) {
        drawTextBoxOnCanvas(
          ctx,
          { ...box, xPct: box.xPct, yPct: box.yPct, widthPct: box.widthPct },
          frontCellWpx,
          frontCellHpx,
          frontX,
          0
        );
      }
      ctx.restore();
    }
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
