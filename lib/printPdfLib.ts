// [테스트용] pdf-lib 기반 인쇄 PDF 생성기예요.
//
// 기존 lib/printCompose.ts(jsPDF)는 페이지 전체를 캔버스로 한 장 그린 뒤 그 결과를
// JPEG 이미지 1장으로 통째로 PDF에 넣어요. 그래서 글자도 전부 "그림"이라서, 실제 인쇄소에서
// 요구하는 벡터 텍스트/글꼴 임베딩/TrimBox·BleedBox 같은 조건을 만족하지 못해요.
//
// 이 파일은 같은 편집 데이터(PrintPhoto, customSpreads 등)를 그대로 받아서, 대신:
//  - 사진은 "칸(cell) 단위"로만 캔버스에 그려서 JPEG로 만든 뒤 pdf-lib의 embedJpg로 넣어요.
//    (사진의 회전·반전·크롭·확대는 기존에 검증된 lib/printCompose.ts의 drawPhotoInCell을
//    그대로 재사용해요 — 좌표 계산을 새로 만들지 않아서 화면과 다르게 잘릴 위험이 없어요)
//  - 캡션(글자)은 이미지가 아니라 pdf-lib의 drawText로, 실제 글꼴(Pretendard)을 임베딩해서
//    진짜 텍스트로 넣어요.
//  - 페이지에 실제 재단선(TrimBox)·도련선(BleedBox)을 PDF 규격에 맞게 설정하고, 도련
//    바깥의 흰 여백에 "재단표시(트림마크)"만 얇은 벡터 선으로 넣어요. (혜민님이 보내주신
//    참고 PDF와 같은 방식 — 안전선/재단선 "안내선 그림"이나 사각형 테두리는 인쇄 PDF에
//    전혀 넣지 않아요. 그건 화면 편집기에서만 보여줘야 하는 것이라서요)
//
// 아직 이 파일은 "내지(inner) PDF"만 만들어요. (혜민님 지시대로 기존 다운로드 기능은
// 그대로 두고, 이 파일은 새 탭/새 버튼에서 별도로 테스트하는 용도예요)
//
// ⚠️ 아직 검증되지 않은 부분 (샘플 PDF를 직접 열어서 확인해야 해요):
//  - 재단표시의 위치/간격/길이가 참고 PDF와 비슷한 "느낌"인지 (숫자는 아래 상수로 조정 가능)
//  - 이 코드는 브라우저에서 실행 로그로만 확인했고, 실제로 뽑은 PDF를 Claude가 열어서 본 적은
//    없어요. 에러가 나거나 마크 위치가 이상하면 그대로 알려주세요.
//
// ⚠️ 인쇄소 확인 필요: 인쇄소에 따라 "재단표시를 파일에 넣지 말고 도련만 정확히 맞춰서
//    보내달라"고 요구하는 경우도 있어요. 실제 발주 전에 레드프린팅에 재단표시 포함 여부를
//    확인해주세요. (필요하면 아래 SHOW_TRIM_MARKS를 false로 바꿔서 마크 없이 뽑을 수 있어요)

import { PDFDocument, PDFFont, PDFImage, PDFName, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { PageTemplateId, SpreadDef, pageTemplates } from "@/lib/albumTemplates";
import { printFileSpec, PhotobookCoverId, calcEstimatedSpineWidthMm } from "@/lib/photobookPricing";
import {
  PrintPhoto,
  SpreadPhotoGroup,
  loadImage,
  drawPhotoInCell,
  parseWorkSizeMm,
  GUIDE_SAFETY_MARGIN_MM,
} from "@/lib/printCompose";
import { computePageLayout, mmToPt, CAPTION_FONT_PT, Rect } from "@/lib/printGeometry";

// 사진 칸을 몇 dpi로 래스터화(JPEG)할지예요. 300dpi가 인쇄 기본값이에요.
// (요구사항 6번: 200dpi는 테스트용, 300dpi를 실제 제작 기본값으로) — 지금은 테스트 단계라
// 값 하나로 고정해뒀어요. 다음 단계(해상도 설정 통합)에서 밖에서 넘겨받도록 바꿀 예정이에요.
const RASTER_DPI = 300;

// ---- 재단표시(트림마크) 설정 ----
// 혜민님이 보내주신 참고 PDF와 같은 형태: 도련 경계 바로 안쪽엔 아무것도 넣지 않고,
// 도련 바깥 흰 여백에 완성 크기(재단선) 위치를 가리키는 짧은 十자 아닌 ㄴ자 모양(가로선+세로선
// 따로, 서로 안 이어짐)의 얇은 선만 네 모서리에 둬요. 숫자는 전부 mm 기준이라 나중에 인쇄소
// 규격에 맞춰 쉽게 바꿀 수 있어요.
const SHOW_TRIM_MARKS = true;
const TRIM_MARK_LENGTH_MM = 4; // 마크 하나의 길이
const TRIM_MARK_GAP_FROM_BLEED_MM = 2; // 도련 바깥 경계에서 마크가 시작되기까지 남기는 흰 간격
const TRIM_MARK_OUTER_BUFFER_MM = 2; // 마크 바깥쪽, 페이지(용지) 끝까지 남기는 흰 여백
const TRIM_MARK_LINE_WIDTH_MM = 0.15; // 얇은 벡터선 두께 (약 0.4pt)
// 도련 바깥에 추가로 필요한 여백(용지 크기 = 도련 포함 작업사이즈 + 이 값*2)
const OUTER_MARGIN_MM = SHOW_TRIM_MARKS
  ? TRIM_MARK_GAP_FROM_BLEED_MM + TRIM_MARK_LENGTH_MM + TRIM_MARK_OUTER_BUFFER_MM
  : 0;

// ---- 책등(spine) 제목 · 로고 설정 ----
// 책등 폭이 보통 매우 좁아서(수 mm~수십 mm), 제목·로고 모두 "옆으로 눕혀서"(시계 반대
// 방향으로 90도 회전) 넣어요 — 책을 책장에 꽂아놓고 옆에서 볼 때 고개를 왼쪽으로 기울이면
// 정방향으로 읽히는, 가장 흔한 책등 표기 방향이에요.
const SPINE_TEXT_SIDE_PADDING_MM = 1.5; // 책등 좌우 끝에서 글자/로고까지 남기는 여백
const SPINE_TITLE_MARGIN_RATIO = 0.06; // 제목 위/아래로 반드시 남겨야 하는 여백(패널 높이 대비 비율)
const SPINE_TITLE_COLUMN_GAP_RATIO = 0.15; // 세로쓰기 열 사이 간격(글자 크기 대비 비율)
const SPINE_TITLE_MIN_FONT_PT = 4; // 이보다 작아지면 더 줄이지 않고 "너무 깁니다" 안내로 넘어가요
const SPINE_TITLE_LOGO_GAP_RATIO = 0.03; // 제목 블록과 로고 사이 최소 간격(패널 높이 대비 비율)
const SPINE_LOGO_HEIGHT_RATIO = 0.85; // 로고가 책등 폭(여백 제외) 중 차지하는 비율
const SPINE_LOGO_BOTTOM_MARGIN_MM = 8; // 책등 아래쪽 끝(도련 경계)에서 로고까지 띄우는 고정 여백 — 사용자가 바꿀 수 없음
// 책등이 이보다 좁으면(양옆 여백 제외 실 폭 기준) 로고를 읽기 어렵다고 보고 생략해요.
// ⚠️ 추정치예요 — 실제 가독성 최소 폭은 인쇄소·디자인 확인이 필요해요.
const SPINE_LOGO_MIN_CROSS_MM = 10;
const KEEPIC_LOGO_ASPECT = 1204 / 416; // public/logo.svg의 원본 가로:세로 비율

function ptToPx(pt: number): number {
  return Math.max(1, Math.round((pt / 72) * RASTER_DPI));
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function hexToRgb01(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || "#000000").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full || "000000", 16) || 0;
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

// 캔버스 좌표(작업사이즈 기준, 왼쪽 위 0,0)에 있는 좌표를, 실제 PDF 페이지 좌표(용지
// 왼쪽아래 0,0 — 여백만큼 밀려있음)로 바꿔요. y축 반전 + 여백 이동을 한 번에 해요.
type Offset = { x: number; y: number };

// ---- 글꼴 임베딩 ----

export type EmbeddedFonts = { regular: PDFFont; bold: PDFFont };

// public/fonts/Pretendard-Regular.ttf, public/fonts/Pretendard-Bold.ttf 파일이 있어야 해요.
// (사이트 화면에서는 CDN으로 Pretendard를 불러오지만, PDF에 폰트를 "포함"시키려면
// 실제 폰트 파일 바이트가 필요해서 CDN 링크만으로는 안 돼요)
async function embedPretendardFonts(pdfDoc: PDFDocument): Promise<EmbeddedFonts> {
  pdfDoc.registerFontkit(fontkit);

  async function fetchFontBytes(path: string): Promise<ArrayBuffer> {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(
        `폰트 파일을 찾을 수 없어요: ${path} (상태 ${res.status}). public/fonts 폴더에 Pretendard-Regular.ttf / Pretendard-Bold.ttf 파일을 넣어주세요.`
      );
    }
    return res.arrayBuffer();
  }

  // ⚠️ 반드시 .ttf(TrueType 외곽선)를 써야 해요. Pretendard의 "공식 static .otf" 빌드는
  // CID-keyed CFF(글자가 많은 한글 폰트에서 흔한 내부 구조)로 되어 있는데, pdf-lib가 쓰는
  // fontkit이 이 구조를 제대로 못 읽어서 "Not a CFF Font" / "Cannot read properties of
  // undefined (reading 'topDict')" 에러가 나요. (실제로 재현해서 원인 확인함 — 파일이 깨진
  // 게 아니라 pdf-lib의 CID-keyed CFF 처리 한계였어요) pretendard npm 패키지의
  // dist/public/static/alternative/*.ttf 빌드는 TrueType 외곽선이라 문제없이 동작해요.
  const [regularBytes, boldBytes] = await Promise.all([
    fetchFontBytes("/fonts/Pretendard-Regular.ttf"),
    fetchFontBytes("/fonts/Pretendard-Bold.ttf"),
  ]);

  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });
  return { regular, bold };
}

// ---- 사진 칸(cell) 래스터화 + 배치 ----
// 회전/반전/크롭/확대 계산은 새로 만들지 않고, 기존에 검증된 drawPhotoInCell을 그대로 써요.
// 차이는 "페이지 전체가 아니라 그 칸 크기만큼만" 캔버스를 만든다는 것뿐이에요 — 그래야
// 사진마다 별도의 PDF 이미지 객체가 되고, 글자와 분리돼요.
async function embedPhotoCell(
  pdfDoc: PDFDocument,
  page: PDFPage,
  photo: PrintPhoto | undefined,
  cellRectPt: Rect, // 캔버스 좌표계(작업사이즈 기준, 왼쪽 위 0,0) 기준, pt 단위
  pageHpt: number, // 작업사이즈(도련 포함) 높이 — y축 반전 계산용
  offset: Offset // 용지 여백만큼 최종 위치를 밀어주는 값
): Promise<void> {
  if (!photo || !photo.url) return;

  const img = await loadImage(photo.url);
  const cellWpx = ptToPx(cellRectPt.w);
  const cellHpx = ptToPx(cellRectPt.h);

  const canvas = document.createElement("canvas");
  canvas.width = cellWpx;
  canvas.height = cellHpx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cellWpx, cellHpx);
  drawPhotoInCell(ctx, img, photo, 0, 0, cellWpx, cellHpx);

  const jpgBytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
  const jpgImage = await pdfDoc.embedJpg(jpgBytes);

  const xPdf = cellRectPt.x + offset.x;
  const yPdf = pageHpt - (cellRectPt.y + cellRectPt.h) + offset.y;
  page.drawImage(jpgImage, { x: xPdf, y: yPdf, width: cellRectPt.w, height: cellRectPt.h });
}

// ---- 마지막 소개 페이지(발행 정보) ----
// lib/printCompose.ts의 drawIntroPage와 같은 배치 계산(캔버스 좌표, 왼쪽 위 0,0 기준)을
// 그대로 쓰고, 마지막에 pdf-lib 좌표(왼쪽 아래 0,0)로 한 번만 변환해요. 사진 칸은 이미
// 검증된 embedPhotoCell을 그대로 재사용해서, 화면 미리보기(IntroPhotoMirror)·jsPDF
// 발주 파일과 같은 크롭 계산을 공유해요.
async function drawIntroPageLib(
  pdfDoc: PDFDocument,
  page: PDFPage,
  coverPhoto: PrintPhoto | null,
  coverTitle: string,
  introDate: string,
  introMaker: string,
  workWpt: number,
  workHpt: number,
  fonts: EmbeddedFonts,
  offset: Offset
): Promise<void> {
  const safetyPt = mmToPt(GUIDE_SAFETY_MARGIN_MM);
  const stackWpt = workWpt * 0.32;
  const stackXCanvas = safetyPt;
  const infoFontPt = workHpt * 0.018;
  const titleFontPt = workHpt * 0.03;
  const lineHeightPt = infoFontPt * 1.7;

  const makerLabel = introMaker.trim() || "신규 작성자";
  const infoLines = [`발행일 : ${introDate}`, `만든이 : ${makerLabel}`, `제작 : KEEPIC`];

  // 캔버스 기준(위→아래로 증가) 커서를 먼저 계산하고, drawText 호출마다
  // "workHpt - 캔버스y"로 pdf-lib y(아래→위)로 바꿔서 넣어요.
  let cursorYCanvas = workHpt - safetyPt;
  for (let i = infoLines.length - 1; i >= 0; i--) {
    page.drawText(infoLines[i], {
      x: offset.x + stackXCanvas,
      y: offset.y + (workHpt - cursorYCanvas),
      size: infoFontPt,
      font: fonts.regular,
      color: rgb(0.2, 0.2, 0.2),
    });
    cursorYCanvas -= lineHeightPt;
  }

  cursorYCanvas -= infoFontPt * 0.6;
  const title = coverTitle.trim();
  if (title) {
    let size = titleFontPt;
    while (size > 8 && fonts.bold.widthOfTextAtSize(title, size) > stackWpt) size -= 0.5;
    page.drawText(title, {
      x: offset.x + stackXCanvas,
      y: offset.y + (workHpt - cursorYCanvas),
      size,
      font: fonts.bold,
      color: rgb(0.07, 0.07, 0.07),
    });
    cursorYCanvas -= titleFontPt * 1.5;
  }

  const photoHpt = stackWpt; // 표지 패널이 정사각형이라 같은 비율을 써요.
  const photoYCanvas = cursorYCanvas - photoHpt;
  await embedPhotoCell(
    pdfDoc,
    page,
    coverPhoto ?? undefined,
    { x: stackXCanvas, y: photoYCanvas, w: stackWpt, h: photoHpt },
    workHpt,
    offset
  );
}

// ---- 캡션(실제 텍스트) ----
// 기존 fitFontSize(캔버스 measureText로 줄여가며 맞추기)와 같은 방식을, pdf-lib의
// font.widthOfTextAtSize로 재구현했어요. (지금은 한 줄 캡션만 지원 — 기존 <input> 캡션과 동일)
function fitCaptionFontSize(font: PDFFont, text: string, startSizePt: number, maxWidthPt: number): number {
  let size = startSizePt;
  const minSizePt = 6;
  while (size > minSizePt) {
    if (font.widthOfTextAtSize(text, size) <= maxWidthPt) break;
    size -= 0.5;
  }
  return size;
}

function drawCaptionPdf(
  page: PDFPage,
  photo: PrintPhoto | undefined,
  cellRectPt: Rect,
  baseFontPt: number,
  fonts: EmbeddedFonts,
  pageHpt: number,
  offset: Offset
): void {
  if (!photo || !photo.caption.trim()) return;
  const font = photo.bold ? fonts.bold : fonts.regular;
  const padPt = cellRectPt.w * 0.04;
  const maxWidthPt = Math.max(1, cellRectPt.w - padPt * 2);
  const fontSize = fitCaptionFontSize(font, photo.caption, baseFontPt, maxWidthPt);
  const textWidth = font.widthOfTextAtSize(photo.caption, fontSize);

  let textXpt: number;
  if (photo.align === "left") textXpt = cellRectPt.x + padPt;
  else if (photo.align === "right") textXpt = cellRectPt.x + cellRectPt.w - padPt - textWidth;
  else textXpt = cellRectPt.x + cellRectPt.w / 2 - textWidth / 2;

  // 캔버스 버전은 textBaseline="middle"이라 (글자 상자의 세로 중앙에 글자 중심이 오도록)
  // 대략 폰트 크기의 0.35배만큼 위로 올려서 베이스라인 위치를 잡아요.
  const centerYCanvas = cellRectPt.y + cellRectPt.h / 2;
  const centerYPdf = pageHpt - centerYCanvas;
  const baselineYpt = centerYPdf - fontSize * 0.35;

  const { r, g, b } = hexToRgb01(photo.color);
  page.drawText(photo.caption, {
    x: textXpt + offset.x,
    y: baselineYpt + offset.y,
    size: fontSize,
    font,
    color: rgb(r, g, b),
  });
}

// ---- 페이지 한 장 그리기 ----
async function drawPageLib(
  pdfDoc: PDFDocument,
  page: PDFPage,
  templateId: PageTemplateId,
  photos: PrintPhoto[],
  pageWpt: number,
  pageHpt: number,
  fonts: EmbeddedFonts,
  offset: Offset
): Promise<void> {
  if (templateId === "blank") return;

  const count = pageTemplates[templateId].photoCount;
  const cellPhotos = photos.slice(0, count);

  if (templateId === "photoText") {
    const photo = cellPhotos[0];
    if (!photo) return;

    if (photo.position === "below") {
      const captionHpt = pageHpt * 0.12;
      await embedPhotoCell(
        pdfDoc,
        page,
        photo,
        { x: 0, y: 0, w: pageWpt, h: pageHpt - captionHpt },
        pageHpt,
        offset
      );
      drawCaptionPdf(
        page,
        photo,
        { x: 0, y: pageHpt - captionHpt, w: pageWpt, h: captionHpt },
        CAPTION_FONT_PT[photo.size],
        fonts,
        pageHpt,
        offset
      );
      return;
    }

    await embedPhotoCell(pdfDoc, page, photo, { x: 0, y: 0, w: pageWpt, h: pageHpt }, pageHpt, offset);
    const overlayHpt = pageHpt * 0.16;
    const overlayYCanvas =
      photo.position === "overlayCenter" ? pageHpt / 2 - overlayHpt / 2 : pageHpt - overlayHpt - pageHpt * 0.03;
    drawCaptionPdf(
      page,
      photo,
      { x: 0, y: overlayYCanvas, w: pageWpt, h: overlayHpt },
      CAPTION_FONT_PT[photo.size],
      fonts,
      pageHpt,
      offset
    );
    return;
  }

  const layout = computePageLayout(templateId, pageWpt, pageHpt);
  for (let i = 0; i < layout.cells.length; i++) {
    await embedPhotoCell(pdfDoc, page, cellPhotos[i], layout.cells[i], pageHpt, offset);
  }
  if (layout.captions) {
    for (const cap of layout.captions) {
      drawCaptionPdf(page, cellPhotos[cap.index], cap.rect, cap.baseFontPt, fonts, pageHpt, offset);
    }
  }
}

// TrimBox(재단선) / BleedBox(도련선) / MediaBox(용지 전체)를 PDF 페이지 딕셔너리에
// 직접 설정해요. pdf-lib에 TrimBox/BleedBox를 위한 고수준 API가 없어서, 저수준 페이지
// 객체에 직접 값을 넣는 방식이에요.
//  - MediaBox: 여백(재단표시 포함) + 도련 + 재단(완성) 크기를 전부 합친 용지 전체 크기
//  - BleedBox: 도련까지 포함한 크기 (배경/사진이 실제로 꽉 채워지는 범위)
//  - TrimBox: 재단 후 완성 크기
function setPdfBoxes(
  page: PDFPage,
  workWpt: number, // 도련 포함 작업사이즈 (기존 buildInnerPrintPdf의 workW/H와 동일)
  workHpt: number,
  bleedPt: number,
  offset: Offset
): void {
  const ctx = page.doc.context;
  page.node.set(
    PDFName.of("BleedBox"),
    ctx.obj([offset.x, offset.y, offset.x + workWpt, offset.y + workHpt])
  );
  page.node.set(
    PDFName.of("TrimBox"),
    ctx.obj([
      offset.x + bleedPt,
      offset.y + bleedPt,
      offset.x + workWpt - bleedPt,
      offset.y + workHpt - bleedPt,
    ])
  );
}

// 도련 바깥 흰 여백에 재단표시(트림마크)를 그려요. 완성 크기(재단선) 모서리를 기준으로,
// 도련 쪽으로는 닿지 않게 조금 간격을 띄우고, 그 바깥으로 짧은 가로선 1개 + 세로선 1개를
// (서로 떨어진 채로) 그려요 — 혜민님이 보내주신 참고 PDF와 같은 방식이에요.
function drawTrimMarks(page: PDFPage, workWpt: number, workHpt: number, bleedPt: number, offset: Offset): void {
  if (!SHOW_TRIM_MARKS) return;

  const gapPt = bleedPt + mmToPt(TRIM_MARK_GAP_FROM_BLEED_MM);
  const markLenPt = mmToPt(TRIM_MARK_LENGTH_MM);
  const lineWidthPt = mmToPt(TRIM_MARK_LINE_WIDTH_MM);
  const color = rgb(0, 0, 0);

  // 완성 크기(재단선) 네 모서리를, 용지(페이지) 절대좌표로.
  const trimX0 = offset.x + bleedPt;
  const trimY0 = offset.y + bleedPt;
  const trimX1 = offset.x + workWpt - bleedPt;
  const trimY1 = offset.y + workHpt - bleedPt;

  const corners: { cx: number; cy: number; dx: 1 | -1; dy: 1 | -1 }[] = [
    { cx: trimX0, cy: trimY0, dx: -1, dy: -1 }, // 왼쪽 아래
    { cx: trimX1, cy: trimY0, dx: 1, dy: -1 }, // 오른쪽 아래
    { cx: trimX0, cy: trimY1, dx: -1, dy: 1 }, // 왼쪽 위
    { cx: trimX1, cy: trimY1, dx: 1, dy: 1 }, // 오른쪽 위
  ];

  for (const c of corners) {
    // 가로선: 재단선의 가로 위치(y=cy)를 가리키며, 모서리에서 바깥쪽(x방향)으로 떨어져 있어요.
    page.drawLine({
      start: { x: c.cx + c.dx * gapPt, y: c.cy },
      end: { x: c.cx + c.dx * (gapPt + markLenPt), y: c.cy },
      thickness: lineWidthPt,
      color,
    });
    // 세로선: 재단선의 세로 위치(x=cx)를 가리키며, 모서리에서 바깥쪽(y방향)으로 떨어져 있어요.
    page.drawLine({
      start: { x: c.cx, y: c.cy + c.dy * gapPt },
      end: { x: c.cx, y: c.cy + c.dy * (gapPt + markLenPt) },
      thickness: lineWidthPt,
      color,
    });
  }
}

// 표지 펼침면의 책등(spine) 양쪽 접히는 경계선 위치에도, 페이지 위/아래 여백에
// 재단표시와 같은 스타일의 짧은 세로선을 넣어요. 책등은 실제로 "잘리는" 자리는
// 아니지만, 인쇄소가 책등이 정확히 어디서 시작하고 끝나는지(접는 위치) 알 수 있게
// 표시해달라는 요청이에요. 코너 재단표시와 똑같이 짧고 얇은 벡터선 1개씩,
// 도련 경계에서 살짝 띄운 흰 여백 안에만 그려요(본문/사진 위에는 올라가지 않음).
function drawSpineFoldMarks(
  page: PDFPage,
  spineXStartCanvas: number, // 책등 왼쪽 경계 (캔버스 기준 x, 뒤표지 패널이 끝나는 지점)
  spineXEndCanvas: number, // 책등 오른쪽 경계 (앞표지 패널이 시작되는 지점)
  workHpt: number,
  bleedPt: number,
  offset: Offset
): void {
  if (!SHOW_TRIM_MARKS) return;

  const gapPt = bleedPt + mmToPt(TRIM_MARK_GAP_FROM_BLEED_MM);
  const markLenPt = mmToPt(TRIM_MARK_LENGTH_MM);
  const lineWidthPt = mmToPt(TRIM_MARK_LINE_WIDTH_MM);
  const color = rgb(0, 0, 0);

  const trimY0 = offset.y + bleedPt;
  const trimY1 = offset.y + workHpt - bleedPt;

  for (const xCanvas of [spineXStartCanvas, spineXEndCanvas]) {
    const x = offset.x + xCanvas;
    // 아래쪽 바깥 여백으로 향하는 세로선
    page.drawLine({
      start: { x, y: trimY0 - gapPt },
      end: { x, y: trimY0 - (gapPt + markLenPt) },
      thickness: lineWidthPt,
      color,
    });
    // 위쪽 바깥 여백으로 향하는 세로선
    page.drawLine({
      start: { x, y: trimY1 + gapPt },
      end: { x, y: trimY1 + (gapPt + markLenPt) },
      thickness: lineWidthPt,
      color,
    });
  }
}

export type PrintPdfLibResult = {
  printBlob: Blob;
  pageCount: number;
  workSizeMm: { w: number; h: number };
  trimSizeMm: { w: number; h: number };
  bleedMm: number;
  mediaSizeMm: { w: number; h: number };
};

// [테스트용] 내지(inner) PDF만 pdf-lib로 생성해요. 표지는 아직 이 방식으로 옮기지 않았어요.
// 입력값은 기존 buildInnerPrintPdf와 똑같아서, app/upload/page.tsx의 실제 편집 데이터를
// 그대로 넣어서 테스트할 수 있어요.
export async function buildInnerPrintPdfLib({
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
  introPage?: {
    coverPhoto: PrintPhoto | null;
    coverTitle: string;
    introDate: string;
    introMaker: string;
  } | null;
}): Promise<PrintPdfLibResult> {
  const { w: workW, h: workH } = parseWorkSizeMm(productionFileSizeMm);
  const workWpt = mmToPt(workW); // 도련 포함 작업사이즈 (기존과 동일한 의미)
  const workHpt = mmToPt(workH);
  const bleedMm = printFileSpec.innerTrimBleedMm;
  const bleedPt = mmToPt(bleedMm);

  const outerMarginPt = mmToPt(OUTER_MARGIN_MM);
  const mediaWpt = workWpt + outerMarginPt * 2; // 재단표시까지 포함한 실제 용지(PDF 페이지) 크기
  const mediaHpt = workHpt + outerMarginPt * 2;
  const offset: Offset = { x: outerMarginPt, y: outerMarginPt }; // 작업사이즈 캔버스를 용지 중앙에 배치

  const pdfDoc = await PDFDocument.create();
  const fonts = await embedPretendardFonts(pdfDoc);

  function drawOnePage(backgroundColor: string = "#ffffff") {
    const page = pdfDoc.addPage([mediaWpt, mediaHpt]);
    // 용지 전체를 먼저 배경색으로 채워요(여백까지 포함) — 뷰어/인쇄기마다 "칠하지 않은 영역"
    // 처리가 다를 수 있어서, 명시적으로 칠해요. 지정한 배경색이 없으면 기존처럼 흰색이에요.
    const { r, g, b } = hexToRgb01(backgroundColor);
    page.drawRectangle({ x: 0, y: 0, width: mediaWpt, height: mediaHpt, color: rgb(r, g, b) });
    return page;
  }

  let pageCount = 0;
  for (let i = 0; i < customSpreads.length; i++) {
    const spread = customSpreads[i];
    const group = spreadPhotoGroups[i];
    const sides: { templateId: PageTemplateId; indexes: number[] }[] = [
      { templateId: spread.left, indexes: group.leftIndexes },
      { templateId: spread.right, indexes: group.rightIndexes },
    ];

    for (const side of sides) {
      const sidePhotos = side.indexes.map((idx) => photos[idx]).filter(Boolean);
      const page = drawOnePage(spread.backgroundColor ?? "#ffffff");
      // 페이지를 순서대로(1p, 2p, ...) 그려야 해서 일부러 순차적으로 기다려요. (기존과 동일)
      await drawPageLib(pdfDoc, page, side.templateId, sidePhotos, workWpt, workHpt, fonts, offset);
      setPdfBoxes(page, workWpt, workHpt, bleedPt, offset);
      drawTrimMarks(page, workWpt, workHpt, bleedPt, offset);
      pageCount++;
    }
  }

  if (introPage) {
    // "마지막 소개 페이지"는 실제로 인쇄되는 내지의 마지막 장이에요. 다른 내지 페이지들과
    // 같은 방식(재단표시 포함)으로 한 장 더 그려요.
    const page = drawOnePage();
    await drawIntroPageLib(
      pdfDoc,
      page,
      introPage.coverPhoto,
      introPage.coverTitle,
      introPage.introDate,
      introPage.introMaker,
      workWpt,
      workHpt,
      fonts,
      offset
    );
    setPdfBoxes(page, workWpt, workHpt, bleedPt, offset);
    drawTrimMarks(page, workWpt, workHpt, bleedPt, offset);
    pageCount++;
  }

  if (pageCount === 0) {
    const page = drawOnePage();
    setPdfBoxes(page, workWpt, workHpt, bleedPt, offset);
    drawTrimMarks(page, workWpt, workHpt, bleedPt, offset);
    pageCount = 1;
  }

  const bytes = await pdfDoc.save();
  return {
    printBlob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    pageCount,
    workSizeMm: { w: workW, h: workH },
    trimSizeMm: { w: workW - bleedMm * 2, h: workH - bleedMm * 2 },
    bleedMm,
    mediaSizeMm: { w: workW + OUTER_MARGIN_MM * 2, h: workH + OUTER_MARGIN_MM * 2 },
  };
}

// ---- 표지(cover) PDF: 펼침면(바깥면/안쪽면) 2페이지 ----
// 혜민님 요청: 표지는 낱장이 아니라 실제 인쇄용 "펼침면 전체"로 나와야 해요.
//  - 1페이지(바깥면): 왼쪽 뒤표지 / (책등) / 오른쪽 앞표지 — 앞표지에 사진+제목
//  - 2페이지(안쪽면): 왼쪽 마지막 내지 안쪽 면 / (책등) / 오른쪽 첫 내지 안쪽 면
//    ("첫 페이지는 앞표지 안쪽, 마지막 페이지는 뒤표지 안쪽"이라는 설명 그대로 —
//     안쪽면도 바깥면과 정확히 같은 전체 크기·접히는 위치를 써요. 양면 인쇄할 때
//     앞뒤가 맞아야 하니까요. 안쪽면 사진·글자는 좌우반전하지 않아요.)
//  - 도련·재단표시는 펼침면 전체 바깥쪽 둘레에만 한 번 적용하고, 책등 옆 접히는
//    자리에는 넣지 않아요(실제로 잘리는 자리가 아니라서요) — 페이지 전체를 감싸는
//    TrimBox/BleedBox가 하나뿐이라 자연스럽게 그렇게 돼요.
//  - 아직 책등 디자인은 안 넣어요(기존 jsPDF 버전과 동일하게 옅은 배경만).
//
// ⚠️ 근사치인 부분: "안쪽면"의 첫/마지막 내지 내용은 표지 패널 크기(panelMm × panelMm)에
// 맞춰 다시 배치해요. 하드커버는 panelMm(=내지 재단 + 판 여유 3mm×2)이 내지 자체의
// 작업사이즈(내지 재단 + 도련 5mm×2)와 정확히 같지 않아서, 사진의 위치/크롭이 실제
// 내지 페이지와 픽셀 단위로 완전히 똑같지는 않을 수 있어요. 이 부분은 혜민님이 실제
// 결과를 보고 괜찮은지 확인해주셔야 해요.

export type CoverPagePhotos = { templateId: PageTemplateId; photos: PrintPhoto[] };

export type CoverPrintPdfLibResult = {
  printBlob: Blob;
  outerSizeMm: { w: number; h: number }; // 재단표시 뺀, 도련 포함 작업사이즈(페이지1·2 공통)
  panelMm: number;
  spineMm: number;
  spineIsConfirmed: boolean;
  bleedMm: number;
  // 책등 제목이 줄이지 않고도(가독성 최소 크기 이상으로) 책등 안에 다 들어갔는지예요.
  // 제목이 없으면 undefined예요.
  spineTitleFits?: boolean;
  // 책등이 너무 좁아 로고를 생략했으면 false예요.
  spineLogoDrawn?: boolean;
};

function drawCoverTitle(
  page: PDFPage,
  title: string,
  panelXCanvas: number, // 앞표지 패널의 캔버스 기준 왼쪽 x
  panelPt: number,
  bleedPt: number,
  fonts: EmbeddedFonts,
  offset: Offset,
  fontScale: number = 1 // 표지 제목 글자 크기 배율(1이 기본)
): void {
  const text = title.trim();
  if (!text) return;
  const font = fonts.bold;
  const maxWidthPt = panelPt * 0.86;
  let size = panelPt * 0.07 * fontScale;
  while (size > 8 && font.widthOfTextAtSize(text, size) > maxWidthPt) size -= 0.5;
  const textWidth = font.widthOfTextAtSize(text, size);
  const textX = offset.x + panelXCanvas + panelPt / 2 - textWidth / 2;
  // 패널 아래쪽에서 8% 지점에 베이스라인을 둬요 (기존 캔버스 버전과 같은 위치).
  const baselineY = offset.y + bleedPt + panelPt * 0.08;

  // 사진 위에서도 글자가 잘 보이도록, 글자 뒤에 살짝 어두운 반투명 띠를 깔아요.
  // (기존 캔버스 버전은 그림자 효과를 썼는데 pdf-lib엔 없어서 이 방식으로 대체했어요 —
  // 화면 미리보기와 완전히 같은 모양은 아니에요.)
  const barPaddingPt = size * 0.5;
  page.drawRectangle({
    x: offset.x + panelXCanvas,
    y: baselineY - size * 0.32,
    width: panelPt,
    height: size + barPaddingPt,
    color: rgb(0, 0, 0),
    opacity: 0.32,
  });

  page.drawText(text, { x: textX, y: baselineY, size, font, color: rgb(1, 1, 1) });
}

// ---- 책등(spine) 제목 레이아웃 계산(글꼴 폭 측정 제외 순수 기하 계산) ----
// 화면 미리보기(app/upload/page.tsx)도 이 함수를 그대로 가져다 써서, "제목이 책등 안에
// 들어가는지"를 인쇄 PDF와 똑같은 기준으로 판단해요(글자 폭 측정은 여기 포함 안 돼요 —
// 열 개수·글자 크기만으로 판단 가능해서 pdf-lib 글꼴 객체 없이도 계산할 수 있어요).
export function computeSpineTitleLayout(
  charCount: number,
  spinePt: number,
  panelPt: number,
  logoReserveHeightPt: number
): {
  fits: boolean;
  size: number;
  charsPerColumn: number;
  columnCount: number;
  gapPt: number;
  blockCrossPt: number;
  blockLengthPt: number;
  marginPt: number;
  gapBeforeLogoPt: number;
} {
  const sidePaddingPt = mmToPt(SPINE_TEXT_SIDE_PADDING_MM);
  const maxCrossPt = Math.max(4, spinePt - sidePaddingPt * 2); // 책등 폭 방향(열이 늘어나는 방향) 최대치

  const marginPt = panelPt * SPINE_TITLE_MARGIN_RATIO;
  const gapBeforeLogoPt = logoReserveHeightPt > 0 ? panelPt * SPINE_TITLE_LOGO_GAP_RATIO : 0;
  const maxLengthPt = Math.max(
    4,
    panelPt - marginPt * 2 - logoReserveHeightPt - gapBeforeLogoPt
  ); // 책등 길이 방향(한 열의 세로 길이) 최대치

  // 큰 글자에서 시작해서, "열 전체 폭(글자 크기 x 필요한 열 개수 + 열 간격)"이 책등 폭
  // 안에 들어올 때까지 글자 크기를 줄여요. 열 개수는 한 열에 몇 글자가 들어가는지(세로
  // 길이 기준)로 정해져요.
  let size = maxCrossPt;
  let charsPerColumn = Math.max(1, Math.floor(maxLengthPt / size));
  let columnCount = Math.ceil(charCount / charsPerColumn);
  let fits = false;
  while (size >= SPINE_TITLE_MIN_FONT_PT) {
    charsPerColumn = Math.max(1, Math.floor(maxLengthPt / size));
    columnCount = Math.ceil(charCount / charsPerColumn);
    const gapPt = size * SPINE_TITLE_COLUMN_GAP_RATIO;
    const totalCrossPt = columnCount * size + Math.max(0, columnCount - 1) * gapPt;
    if (totalCrossPt <= maxCrossPt) {
      fits = true;
      break;
    }
    size -= 0.5;
  }
  if (size < SPINE_TITLE_MIN_FONT_PT) {
    size = SPINE_TITLE_MIN_FONT_PT;
    charsPerColumn = Math.max(1, Math.floor(maxLengthPt / size));
    columnCount = Math.ceil(charCount / charsPerColumn);
  }
  const gapPt = size * SPINE_TITLE_COLUMN_GAP_RATIO;
  const blockCrossPt = columnCount * size + Math.max(0, columnCount - 1) * gapPt;
  const blockLengthPt = Math.min(maxLengthPt, charsPerColumn * size);

  return { fits, size, charsPerColumn, columnCount, gapPt, blockCrossPt, blockLengthPt, marginPt, gapBeforeLogoPt };
}

// ---- 책등(spine) 제목 ----
// 문장 전체를 90도로 눕히지 않고, 한 글자씩 정방향(똑바로 선 채)으로 위→아래로 쌓아요.
// 기본은 한 열이고, 한 열에 다 못 담으면 오른쪽에 새 열을 추가해요(왼쪽 열부터 읽혀요).
// 반환값은 "책등 폭·길이 안에 깔끔하게 들어갔는지"예요 — false면 더 줄이지 않고(가독성
// 최소 크기 SPINE_TITLE_MIN_FONT_PT 유지) 화면에서 "제목이 너무 깁니다" 안내를 보여주는
// 용도로 써요. logoReserveHeightPt만큼은 제목 블록 아래쪽에 비워둬서 로고와 겹치지 않아요.
function drawSpineTitle(
  page: PDFPage,
  title: string,
  spineXStartCanvas: number,
  spinePt: number,
  panelPt: number,
  bleedPt: number,
  offset: Offset,
  fonts: EmbeddedFonts,
  verticalOffsetRatio: number,
  logoReserveHeightPt: number
): boolean {
  const chars = Array.from(title.trim());
  if (chars.length === 0) return true;
  const font = fonts.bold;

  const layout = computeSpineTitleLayout(chars.length, spinePt, panelPt, logoReserveHeightPt);
  const { fits, size, charsPerColumn, gapPt, blockCrossPt, blockLengthPt, marginPt, gapBeforeLogoPt } = layout;

  // 세로 방향(책등 길이) 위치: 로고 위 공간(제목 가능 영역) 안에서, verticalOffsetRatio(-1~1,
  // 0이 정중앙)만큼 위/아래로 옮겨요. 항상 로고 예약 공간 위쪽(패널 바닥 기준)에서 시작해요.
  const usableBottomPt = marginPt + logoReserveHeightPt + gapBeforeLogoPt;
  const usableTopPt = panelPt - marginPt;
  const usableHeightPt = Math.max(0, usableTopPt - usableBottomPt);
  const halfRangePt = Math.max(0, usableHeightPt / 2 - blockLengthPt / 2);
  const clampedRatio = Math.max(-1, Math.min(1, verticalOffsetRatio));
  const blockCenterFromPanelBottomPt = usableBottomPt + usableHeightPt / 2 + clampedRatio * halfRangePt;
  const blockTopFromPanelBottomPt = blockCenterFromPanelBottomPt + blockLengthPt / 2;

  // 가로 방향(책등 폭) 위치: 열 블록 전체를 책등 폭 가운데 정렬해요. 왼쪽 열(0번)이 가장
  // 왼쪽이고, 오른쪽으로 갈수록 열 번호가 커져요(왼쪽 열부터 읽혀요).
  const spineCenterXCanvas = spineXStartCanvas + spinePt / 2;
  const blockLeftXCanvas = spineCenterXCanvas - blockCrossPt / 2;

  for (let i = 0; i < chars.length; i++) {
    const col = Math.floor(i / charsPerColumn);
    const row = i % charsPerColumn;
    const ch = chars[i];
    if (ch.trim() === "") continue; // 공백은 자리만 차지하고 그리지 않아요.

    const colCenterXCanvas = blockLeftXCanvas + col * (size + gapPt) + size / 2;
    const charWidth = font.widthOfTextAtSize(ch, size);
    const x = offset.x + colCenterXCanvas - charWidth / 2;
    // row 0이 블록 맨 위 글자예요. 위→아래로 한 글자씩 내려가요.
    const yFromPanelBottom = blockTopFromPanelBottomPt - (row + 1) * size + size * 0.22;
    const y = offset.y + bleedPt + yFromPanelBottom;

    page.drawText(ch, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) });
  }

  return fits;
}

// ---- 책등(spine) 로고 ----
// Keepic 워드마크(public/logo.svg)를 PNG로 래스터화해서 임베딩해요. pdf-lib는 SVG를 직접
// 못 넣어서, 사진 칸을 굽는 것과 같은 방식(캔버스 → PNG bytes → embedPng)을 써요. 위치는
// "책등 아래쪽에서 고정 여백"으로 고정이고, 혜민님이 화면에서 바꿀 수 없어요.
async function embedKeepicLogo(pdfDoc: PDFDocument): Promise<PDFImage> {
  const img = await loadImage("/logo.svg");
  const naturalW = img.naturalWidth || 1204;
  const naturalH = img.naturalHeight || 416;

  const canvas = document.createElement("canvas");
  // 로고는 글자보다 훨씬 작게 들어가지만, 선명하게 나오도록 원본보다 넉넉한 해상도로 구워요.
  canvas.width = naturalW;
  canvas.height = naturalH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("로고를 그릴 캔버스를 만들지 못했어요.");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const pngBytes = dataUrlToBytes(canvas.toDataURL("image/png"));
  return pdfDoc.embedPng(pngBytes);
}

// 책등 폭(spinePt) 기준으로 로고를 얼마나 크게 그릴지, 혹은 너무 좁아서 생략할지 미리
// 계산해요. 실제로 이미지를 굽기(embedKeepicLogo) 전에도 크기를 알아야, 제목이 로고
// 자리를 남겨두고 배치될 수 있어요(drawSpineTitle의 logoReserveHeightPt).
export function computeSpineLogoLayout(spinePt: number): {
  fits: boolean;
  drawnWidthPt: number; // 책등 폭 방향(가로, 로고를 눕히지 않으므로)
  drawnHeightPt: number; // 책등 길이 방향(세로) — 제목이 피해야 하는 예약 높이
} {
  const sidePaddingPt = mmToPt(SPINE_TEXT_SIDE_PADDING_MM);
  const maxCrossPt = Math.max(0, spinePt - sidePaddingPt * 2);
  if (maxCrossPt < mmToPt(SPINE_LOGO_MIN_CROSS_MM)) {
    return { fits: false, drawnWidthPt: 0, drawnHeightPt: 0 };
  }
  const drawnWidthPt = maxCrossPt * SPINE_LOGO_HEIGHT_RATIO;
  const drawnHeightPt = drawnWidthPt / KEEPIC_LOGO_ASPECT;
  return { fits: true, drawnWidthPt, drawnHeightPt };
}

// 로고는 회전하거나 글자를 분해하지 않고, "Keepic"이 왼쪽→오른쪽으로 읽히는 정방향
// 그대로 책등 아래쪽에 넣어요. 원본 가로:세로 비율(KEEPIC_LOGO_ASPECT)은 그대로 유지해요.
function drawSpineLogo(
  page: PDFPage,
  logoImage: PDFImage,
  spineXStartCanvas: number,
  spinePt: number,
  bleedPt: number,
  offset: Offset,
  layout: { drawnWidthPt: number; drawnHeightPt: number }
): void {
  const spineCenterXCanvas = spineXStartCanvas + spinePt / 2;
  const anchorX = offset.x + spineCenterXCanvas - layout.drawnWidthPt / 2;
  const anchorY = offset.y + bleedPt + mmToPt(SPINE_LOGO_BOTTOM_MARGIN_MM);

  page.drawImage(logoImage, {
    x: anchorX,
    y: anchorY,
    width: layout.drawnWidthPt,
    height: layout.drawnHeightPt,
  });
}

// 표지 펼침면(바깥면 또는 안쪽면) 한 페이지를 그려요.
async function drawCoverSpreadPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  params: {
    workHpt: number;
    bleedPt: number;
    panelPt: number;
    spinePt: number;
    offset: Offset;
    fonts: EmbeddedFonts;
    leftContent: CoverPagePhotos | null; // 안쪽면: 마지막 내지 / 바깥면: null(뒤표지, 비워둠)
    rightContent: CoverPagePhotos | null; // 안쪽면: 첫 내지 / 바깥면: null(앞표지는 frontPhoto로)
    frontPhoto?: PrintPhoto | null; // 바깥면 전용: 앞표지 사진
    frontTitle?: string; // 바깥면 전용: 앞표지 제목
    frontTitleFontScale?: number; // 바깥면 전용: 앞표지 제목 글자 크기 배율(1이 기본)
  }
): Promise<void> {
  const {
    workHpt,
    bleedPt,
    panelPt,
    spinePt,
    offset,
    fonts,
    leftContent,
    rightContent,
    frontPhoto,
    frontTitle,
    frontTitleFontScale,
  } = params;
  const backX = bleedPt; // 캔버스/PDF 공통 x좌표: 왼쪽(뒤표지) 패널 시작 x
  const spineX = bleedPt + panelPt;
  const frontX = spineX + spinePt; // 오른쪽(앞표지) 패널 시작 x

  // 책등(spine) 영역에는 인쇄 파일에 아무 배경색도 넣지 않아요 — 혜민님 요청:
  // 나중에 책등에 책 제목 + Keepic 로고를 직접 배치할 예정이라, 지금은 옅은 배경조차
  // 인쇄 파일에 남으면 안 돼요. (화면 에디터에서 책등 위치를 시각적으로 구분해 보여주는
  // 용도가 필요하면, 그건 이 인쇄용 PDF가 아니라 에디터 화면 쪽에서 별도로 처리해야 해요.)

  // 왼쪽 패널 — 패널 자신을 "도련 포함 정사각형 페이지"로 보고 기존 drawPageLib을
  // 그대로 재사용해요. offset을 패널의 실제 위치로 넘겨서 배치해요.
  if (leftContent) {
    const panelOffset: Offset = { x: offset.x + backX, y: offset.y + bleedPt };
    await drawPageLib(pdfDoc, page, leftContent.templateId, leftContent.photos, panelPt, panelPt, fonts, panelOffset);
  }

  // 오른쪽 패널
  if (rightContent) {
    const panelOffset: Offset = { x: offset.x + frontX, y: offset.y + bleedPt };
    await drawPageLib(
      pdfDoc,
      page,
      rightContent.templateId,
      rightContent.photos,
      panelPt,
      panelPt,
      fonts,
      panelOffset
    );
  }

  // 바깥면 전용: 앞표지 사진 + 제목
  // 사진 칸을 재단 패널(panelPt)이 아니라 패널+바깥쪽 도련까지 넓게 잡아요 — 앞표지의
  // 오른쪽·위·아래는 실제로 재단되는 바깥 경계라서, 사진이 도련 끝까지 채워져 있어야
  // 재단 위치가 살짝 밀려도 흰 여백이 보이지 않아요(책등 쪽은 접히는 자리라 도련이
  // 필요 없어요). lib/printCompose.ts의 buildCoverPrintPdf, 화면 편집기(app/upload/page.tsx)
  // 앞표지 칸과 같은 비율이에요.
  if (frontPhoto?.url) {
    await embedPhotoCell(
      pdfDoc,
      page,
      frontPhoto,
      { x: frontX, y: 0, w: panelPt + bleedPt, h: panelPt + bleedPt * 2 },
      workHpt,
      offset
    );
  }
  if (frontTitle) {
    drawCoverTitle(page, frontTitle, frontX, panelPt, bleedPt, fonts, offset, frontTitleFontScale ?? 1);
  }
}

// [테스트용] 표지 펼침면 2페이지(바깥면+안쪽면) PDF를 pdf-lib로 생성해요.
export async function buildCoverPrintPdfLib({
  cover,
  sizeInnerTrimMm,
  coverPhoto,
  coverTitle,
  coverTitleFontScale,
  innerPaperWeightG,
  pages,
  firstPage,
  lastPage,
  spineTitle,
  spineTitleOffsetRatio,
}: {
  cover: PhotobookCoverId;
  sizeInnerTrimMm: number; // 내지 재단 사이즈(정사각형 한 변, mm)
  coverPhoto: PrintPhoto | null;
  coverTitle: string;
  coverTitleFontScale?: number; // 표지 제목 글자 크기 배율(1이 기본)
  innerPaperWeightG: number;
  pages: number;
  firstPage: CoverPagePhotos | null; // 내지 1번째 페이지 내용 (표지 안쪽면 오른쪽에 들어감)
  lastPage: CoverPagePhotos | null; // 내지 마지막 페이지 내용 (표지 안쪽면 왼쪽에 들어감)
  spineTitle?: string; // 책등에 넣을 제목 (비우면 안 그림). 보통 coverTitle과 같은 값을 넘겨요.
  spineTitleOffsetRatio?: number; // 책등 제목 위/아래 위치 (-1~1, 0이 정중앙). 기본 0
}): Promise<CoverPrintPdfLibResult> {
  const panelMm =
    cover === "hard" ? sizeInnerTrimMm + printFileSpec.hardCoverPanelOverhangMm * 2 : sizeInnerTrimMm;
  const bleedMm = cover === "hard" ? printFileSpec.hardCoverWrapBleedMm : printFileSpec.softCoverBleedMm;
  const spine = calcEstimatedSpineWidthMm(innerPaperWeightG, pages, cover);
  const spineMm = spine.isConfirmed ? spine.estimateMm : spine.maxMm;

  const totalWmm = panelMm * 2 + spineMm + bleedMm * 2;
  const totalHmm = panelMm + bleedMm * 2;
  const workWpt = mmToPt(totalWmm);
  const workHpt = mmToPt(totalHmm);
  const bleedPt = mmToPt(bleedMm);
  const panelPt = mmToPt(panelMm);
  const spinePt = mmToPt(spineMm);
  const spineXStartCanvas = bleedPt + panelPt; // 책등 왼쪽 경계(뒤표지 패널 끝)
  const spineXEndCanvas = spineXStartCanvas + spinePt; // 책등 오른쪽 경계(앞표지 패널 시작)

  const outerMarginPt = mmToPt(OUTER_MARGIN_MM);
  const mediaWpt = workWpt + outerMarginPt * 2;
  const mediaHpt = workHpt + outerMarginPt * 2;
  const offset: Offset = { x: outerMarginPt, y: outerMarginPt };

  const pdfDoc = await PDFDocument.create();
  const fonts = await embedPretendardFonts(pdfDoc);

  function newPage() {
    const page = pdfDoc.addPage([mediaWpt, mediaHpt]);
    page.drawRectangle({ x: 0, y: 0, width: mediaWpt, height: mediaHpt, color: rgb(1, 1, 1) });
    return page;
  }

  // 페이지 1: 바깥면
  const outerPage = newPage();
  await drawCoverSpreadPage(pdfDoc, outerPage, {
    workHpt,
    bleedPt,
    panelPt,
    spinePt,
    offset,
    fonts,
    leftContent: null,
    rightContent: null,
    frontPhoto: coverPhoto,
    frontTitle: coverTitle,
    frontTitleFontScale: coverTitleFontScale,
  });
  setPdfBoxes(outerPage, workWpt, workHpt, bleedPt, offset);
  drawTrimMarks(outerPage, workWpt, workHpt, bleedPt, offset);
  drawSpineFoldMarks(outerPage, spineXStartCanvas, spineXEndCanvas, workHpt, bleedPt, offset);

  // 책등 제목·로고는 "바깥면"(실제로 눈에 보이는 책 표지)에만 넣어요 — 안쪽면은 표지
  // 재질의 안쪽 면이라 책등 그래픽이 인쇄되지 않아요.
  // 로고 자리를 먼저 계산해서(실제로 굽기 전에), 제목이 로고와 겹치지 않게 자리를 비워둬요.
  const spineLogoLayout = computeSpineLogoLayout(spinePt);
  const spineTitleText = (spineTitle ?? coverTitle ?? "").trim();
  let spineTitleFits: boolean | undefined = undefined;
  if (spineTitleText) {
    spineTitleFits = drawSpineTitle(
      outerPage,
      spineTitleText,
      spineXStartCanvas,
      spinePt,
      panelPt,
      bleedPt,
      offset,
      fonts,
      spineTitleOffsetRatio ?? 0,
      spineLogoLayout.fits ? spineLogoLayout.drawnHeightPt : 0
    );
  }
  if (spineLogoLayout.fits) {
    const keepicLogoImage = await embedKeepicLogo(pdfDoc);
    drawSpineLogo(outerPage, keepicLogoImage, spineXStartCanvas, spinePt, bleedPt, offset, spineLogoLayout);
  }

  // 페이지 2: 안쪽면 — 바깥면과 같은 전체 크기·접힘 위치. 좌우반전 없이 그대로 배치.
  const innerPage = newPage();
  await drawCoverSpreadPage(pdfDoc, innerPage, {
    workHpt,
    bleedPt,
    panelPt,
    spinePt,
    offset,
    fonts,
    leftContent: lastPage,
    rightContent: firstPage,
  });
  setPdfBoxes(innerPage, workWpt, workHpt, bleedPt, offset);
  drawTrimMarks(innerPage, workWpt, workHpt, bleedPt, offset);
  drawSpineFoldMarks(innerPage, spineXStartCanvas, spineXEndCanvas, workHpt, bleedPt, offset);

  const bytes = await pdfDoc.save();
  return {
    printBlob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    outerSizeMm: { w: totalWmm, h: totalHmm },
    panelMm,
    spineMm,
    spineIsConfirmed: spine.isConfirmed,
    bleedMm,
    spineTitleFits,
    spineLogoDrawn: spineLogoLayout.fits,
  };
}
