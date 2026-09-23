"use client";

import { Suspense, useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productConfig, ProductName } from "@/lib/productConfig";
import { supabase } from "@/lib/supabase";
import {
  albumTemplates,
  pageTemplates,
  PageTemplateId,
  SpreadDef,
  TextBoxDef,
  ImageBoxDef,
  AI_AUTO_LAYOUT_TEMPLATE_ID,
  generateEmptyFreeformSpreads,
  findAutoPhotoSlotPosition,
  calcRequiredSpreadCount,
  fitSpreadsToCount,
} from "@/lib/albumTemplates";
import {
  photobookCovers,
  coverCoatingOptions,
  innerPaperOptions,
  calcPagesLabel,
  photobookSizes,
  calcEstimatedSpineWidthMm,
  printFileSpec,
} from "@/lib/photobookPricing";
import { buildInnerPrintPdf, buildCoverPrintPdf, SpreadPhotoGroup } from "@/lib/printCompose";
import {
  backgroundPatterns,
  backgroundPatternCategories,
  resolveSpreadBackgroundCss,
  patternToCssBackground,
  BackgroundPatternCategory,
} from "@/lib/backgroundPatterns";
// [테스트용] 새 pdf-lib 기반 PDF 생성기예요. ?pdftest=1 일 때만 화면에 테스트 버튼이 보여요.
// 기존 다운로드/발주 흐름(buildInnerPrintPdf)은 이 테스트와 무관하게 그대로 동작해요.
import { buildInnerPrintPdfLib, buildCoverPrintPdfLib, computeSpineLogoLayout } from "@/lib/printPdfLib";
import { mmToPt } from "@/lib/printGeometry";
import { computeImageBoxCoverRect, clampImageBoxInnerOffset } from "@/lib/imageBoxGeometry";
import {
  PhotoLayoutTemplate,
  LayoutApplyRange,
  templatesForRange,
  slotToSpreadCoords,
} from "@/lib/photoLayoutTemplates";

// 책등 제목의 글자 크기를 실제 mm 기준으로 재요(화면 미리보기용). lib/printCompose.ts의
// drawSpineTitleCanvas와 같은 원리예요 — 다만 "300dpi px" 대신 "mm"을 그대로 캔버스
// font-size 숫자로 써요(숫자 단위가 뭐든 비율만 맞으면 결과는 똑같아요). 이렇게 실제
// mm 크기를 구해서 화면에도 %(cqh) 단위로 넣으면, 창 크기가 바뀌어도 항상 책 실물
// 비율 그대로 커지고 작아져요(브라우저 창 크기와는 무관해요).
const SPINE_TEXT_SIDE_PADDING_MM_SCREEN = 1.5; // 혜민님 확인(2026-09-19): 책등 여백 1.5mm(lib/printCompose.ts와 같은 값)
const SPINE_TITLE_MIN_FONT_MM = (12 / 72) * 25.4; // 12pt
const SPINE_TITLE_MAX_FONT_RATIO_SCREEN = 0.55; // 혜민님 확인(2026-09-19): 책등 폭 꽉 채우면 글자가 너무 커 보여서 상한을 둬요(lib/printCompose.ts와 같은 값)
const COVER_TITLE_PT_PRESETS = [12, 18, 24, 30, 36, 48, 60, 72];

// 페이지에 자유롭게 얹을 수 있는 기본 스티커 세트예요. 실제로는 이미지박스와 같은
// 방식(ImageBoxDef)으로 다뤄져서, 스티커도 사진처럼 끌어서 옮기고 크기를 바꿀 수
// 있어요.
const STICKERS: { id: string; url: string; label: string }[] = [
  { id: "heart", url: "/stickers/heart.svg", label: "하트" },
  { id: "star", url: "/stickers/star.svg", label: "별" },
  { id: "ribbon", url: "/stickers/ribbon.svg", label: "리본" },
  { id: "tape", url: "/stickers/tape.svg", label: "마스킹 테이프" },
  { id: "speech-bubble", url: "/stickers/speech-bubble.svg", label: "말풍선" },
  { id: "cloud", url: "/stickers/cloud.svg", label: "구름" },
  { id: "sparkle", url: "/stickers/sparkle.svg", label: "반짝임" },
  { id: "frame", url: "/stickers/frame.svg", label: "프레임" },
];

// 편집 화면 왼쪽 아이콘 메뉴예요(스프레드 페이지 편집 전용, 2026-09-19). 예전엔 사진 추가·
// 스티커 추가가 캔버스 위에 마우스를 올려야만 보이는 숨은 버튼이었고, 배경 설정은 항상
// 펼쳐진 패널로만 있었는데, 이제 다른 사진책 편집기들처럼 아이콘을 눌러야 해당 메뉴가
// 열리는 구조로 통일해요. "표지변경"(테마 골라서 한 번에 바꾸기)과 "손글씨스티커"는 아직
// 실제 기능이 없어서 "준비 중" 안내만 보여줘요.
type EditTabId = "photo" | "layout" | "background" | "theme" | "sticker" | "handwriting" | "text";
const EDIT_TABS: { id: EditTabId; label: string; icon: string }[] = [
  { id: "photo", label: "사진", icon: "🖼️" },
  { id: "layout", label: "레이아웃", icon: "▦" },
  { id: "background", label: "배경", icon: "🎨" },
  { id: "theme", label: "표지변경", icon: "✨" },
  { id: "sticker", label: "스티커", icon: "⭐" },
  { id: "handwriting", label: "손글씨스티커", icon: "✏️" },
  { id: "text", label: "텍스트", icon: "Tt" },
];
// "레이아웃" 탭 안에서 셀 개수(사진 몇 장용 템플릿인지)로 골라볼 수 있는 필터예요.
// "auto"는 지금 적용 범위(왼쪽/오른쪽/펼침면)에 있는 실제 사진 개수에 맞는 템플릿만
// 자동으로 보여줘요(기본값) — "전체"를 포함해 혜민님이 다른 개수 템플릿도 미리 보고
// 싶을 때만 직접 골라요.
type LayoutCountFilter = "auto" | "all" | 1 | 2 | 3 | 4 | 5 | "6+";
const LAYOUT_COUNT_FILTERS: { id: LayoutCountFilter; label: string }[] = [
  { id: "auto", label: "현재 개수" },
  { id: "all", label: "전체" },
  { id: 1, label: "1장" },
  { id: 2, label: "2장" },
  { id: 3, label: "3장" },
  { id: 4, label: "4장" },
  { id: 5, label: "5장" },
  { id: "6+", label: "6장+" },
];
// 표지 페이지 전용 아이콘 메뉴예요 — 내지(EDIT_TABS)와 항목이 달라서 따로 둬요
// (2026-09-23, 혜민님 요청으로 표지도 내지처럼 아이콘 메뉴로 재설계).
type CoverEditTabId = "photo" | "title" | "background" | "textbox";
const COVER_EDIT_TABS: { id: CoverEditTabId; label: string; icon: string }[] = [
  { id: "photo", label: "사진", icon: "🖼️" },
  { id: "title", label: "제목", icon: "Tt" },
  { id: "background", label: "배경", icon: "🎨" },
  { id: "textbox", label: "텍스트박스", icon: "💬" },
];
function measureSpineTitleFontSizeMm(
  title: string,
  spineMm: number,
  maxLengthMm: number,
  fontSizePt?: number, // 혜민님이 직접 고른 글자 크기(pt). 비워두면 책등 폭 기준 자동 크기.
  fontFamily: string = "Pretendard, sans-serif"
): { sizeMm: number; textLengthMm: number } {
  if (!title || typeof document === "undefined") return { sizeMm: 0, textLengthMm: 0 };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { sizeMm: 0, textLengthMm: 0 };
  const maxCrossMm = Math.max(1, spineMm - SPINE_TEXT_SIDE_PADDING_MM_SCREEN * 2);
  // 혜민님이 pt로 직접 고른 값(mm로 환산)을 쓰되, 책등 여백(1.5mm)이 줄어들지 않도록
  // maxCrossMm을 넘지 않게 잘라요. 안 골랐으면(자동) 책등 폭의 55%를 시작 크기로 써요.
  const requestedMm = fontSizePt !== undefined ? (fontSizePt * 25.4) / 72 : maxCrossMm * SPINE_TITLE_MAX_FONT_RATIO_SCREEN;
  let size = Math.min(requestedMm, maxCrossMm);
  ctx.font = `bold ${size}px ${fontFamily}`;
  let textLengthMm = ctx.measureText(title).width;
  while (size > SPINE_TITLE_MIN_FONT_MM && textLengthMm > maxLengthMm) {
    size -= 0.05;
    ctx.font = `bold ${size}px ${fontFamily}`;
    textLengthMm = ctx.measureText(title).width;
  }
  if (size < SPINE_TITLE_MIN_FONT_MM) size = SPINE_TITLE_MIN_FONT_MM;
  ctx.font = `bold ${size}px ${fontFamily}`;
  textLengthMm = ctx.measureText(title).width;
  return { sizeMm: size, textLengthMm };
}

type Photo = {
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
  // 드래그(x, y)는 화면에 보이던 사진칸의 실제 픽셀 크기를 기준으로 저장돼요.
  // 인쇄 파일을 만들 때는 그 화면 크기와 인쇄용 캔버스 크기 비율을 계산해서,
  // 화면에서 본 위치와 똑같은 자리에 사진이 오도록 맞춰줘요.
  containerW: number;
  containerH: number;
  rotation: number; // 0/90/180/270도
  flipX: boolean; // 좌우 반전
};

// 텍스트박스가 어디 있는지(표지 앞면인지, 어느 스프레드의 왼쪽/오른쪽 낱장인지) 가리키는
// 값이에요. 상단 툴바가 지금 고치는 텍스트박스를 찾아가는 데 써요.
type TextBoxRef =
  | { scope: "cover" }
  | { scope: "backCover" }
  | { scope: "spread"; spreadIndex: number; side: "left" | "right" };

function textBoxScopeLabel(ref: TextBoxRef): string {
  if (ref.scope === "cover") return "앞표지 텍스트박스";
  if (ref.scope === "backCover") return "뒤표지 텍스트박스";
  return `내지 ${ref.side === "left" ? "왼쪽" : "오른쪽"} 페이지 텍스트박스`;
}

const captionSizeClass: Record<Photo["size"], string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
};

const alignClass: Record<Photo["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const fontOptions = [
  { id: "Pretendard, sans-serif", label: "고딕" },
  { id: "'Noto Serif KR', serif", label: "명조" },
  { id: "'Nanum Myeongjo', serif", label: "클래식 명조" },
  { id: "'Gowun Batang', serif", label: "우아한 바탕체" },
  { id: "'Gowun Dodum', sans-serif", label: "둥근 고딕" },
  { id: "'Black Han Sans', sans-serif", label: "굵은 임팩트체" },
  { id: "'Gaegu', cursive", label: "귀여운 손글씨" },
  { id: "'Nanum Pen Script', cursive", label: "감성 손글씨" },
  { id: "'Dongle', sans-serif", label: "동글동글체" },
  { id: "'Gamja Flower', cursive", label: "감자꽃체" },
  { id: "'East Sea Dokdo', cursive", label: "붓글씨체" },
  { id: "'Poor Story', sans-serif", label: "포근한 손글씨" },
  { id: "'Do Hyeon', sans-serif", label: "굵은 포인트체" },
  { id: "'Jua', sans-serif", label: "주아체" },
  { id: "'HsSantoki20', sans-serif", label: "산토끼체" },
  { id: "'KkuBulLim', sans-serif", label: "꾸불림체" },
  { id: "'GriunDujunDujun', sans-serif", label: "두준두준체" },
  { id: "'ChaiHwaljjak', sans-serif", label: "활짝체" },
  { id: "'LeeSeoyoon', sans-serif", label: "이서윤체" },
  { id: "'Cinzel Decorative', serif", label: "Cinzel Decorative" },
  { id: "'Cinzel', serif", label: "Cinzel" },
  { id: "'Castoro', serif", label: "Castoro" },
  { id: "'Pinyon Script', cursive", label: "Pinyon Script" },
  { id: "'Amatic SC', cursive", label: "Amatic SC" },
  { id: "'Luckiest Guy', cursive", label: "Luckiest Guy" },
  { id: "'Julius Sans One', sans-serif", label: "Julius Sans One" },
  { id: "'Gloock', serif", label: "Gloock" },
  { id: "'Pompiere', cursive", label: "Pompiere" },
  { id: "'Boogaloo', cursive", label: "Boogaloo" },
  { id: "'Henny Penny', cursive", label: "Henny Penny" },
  { id: "'Nosifer', cursive", label: "Nosifer" },
  { id: "'DM Serif Display', serif", label: "DM Serif Display" },
  { id: "'Bodoni Moda', serif", label: "Bodoni Moda" },
];

const PRINT_DPI = 200;


function parseSizeCm(detail: string) {
  const match = detail.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
  if (!match) return { w: 15, h: 15 };
  return { w: parseFloat(match[1]), h: parseFloat(match[3]) };
}

function calcRequiredMinPx(detail: string) {
  const { w, h } = parseSizeCm(detail);
  const shorterCm = Math.min(w, h);
  return Math.round((shorterCm / 2.54) * PRINT_DPI);
}

function isLowRes(photo: Photo, requiredMinPx: number) {
  return Math.min(photo.width, photo.height) < requiredMinPx;
}

// 스프레드별로 사진 배열에서 왼쪽/오른쪽 페이지가 각각 몇 번째 사진들을 쓰는지 계산해요.
// (미리보기 렌더링과 인쇄 파일 생성, 둘 다 같은 계산을 써야 순서가 어긋나지 않아요.)
// 스프레드 1(index 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 항상 고정돼요 —
// 그 칸에는 사진을 배정하지 않고, 사진 1장이 실제 내지 1페이지(스프레드 1 오른쪽)부터
// 채워지도록 건너뛰어요.
function computeSpreadPhotoGroups(customSpreads: SpreadDef[]): SpreadPhotoGroup[] {
  let cursor = 0;
  return customSpreads.map((spread, i) => {
    const leftCount = i === 0 ? 0 : pageTemplates[spread.left].photoCount;
    const rightCount = pageTemplates[spread.right].photoCount;
    const leftIndexes = Array.from({ length: leftCount }, (_, i2) => cursor + i2);
    cursor += leftCount;
    const rightIndexes = Array.from({ length: rightCount }, (_, i2) => cursor + i2);
    cursor += rightCount;
    return { leftIndexes, rightIndexes };
  });
}

// 왼쪽 레일에 보여줄 라벨이에요. "스프레드 N" 대신 실제 내지 페이지 번호로 보여줘요.
// 스프레드 1(index 0)은 왼쪽이 인쇄되지 않는 빈 면이라 오른쪽 페이지 번호(1) 하나만,
// 그 다음부터는 "2-3", "4-5"처럼 두 페이지 범위로 표시해요.
function formatSpreadPageLabel(i: number): string {
  if (i === 0) return "1";
  return `${2 * i}-${2 * i + 1}`;
}

const layoutOptions: { id: PageTemplateId; label: string }[] = [
  { id: "full", label: "사진 1장 (꽉 참)" },
  { id: "fullMargin", label: "사진 1장 (여백)" },
  { id: "duo", label: "2분할" },
  { id: "trio", label: "3분할" },
  { id: "quad", label: "4분할" },
  { id: "photoText", label: "사진+글" },
  { id: "trioText", label: "3장+설명 (여백)" },
  { id: "blank", label: "빈 페이지" },
];

// 내지(스프레드) 배경색 미리 정해둔 팔레트예요. 포토북 인쇄에 무난하게 쓸 수 있는
// 톤 위주로 골랐어요 — 사용자가 직접 색을 고르고 싶으면 옆의 색상 선택 버튼으로 자유롭게
// 고를 수도 있어요.
// "전체 사진 목록" 펼침 패널에서 한 번에 몇 장씩 보여줄지예요. 사진이 많을 때
// 한꺼번에 다 나열하지 않고, 이 수만큼 나눠서 옆으로 넘겨가며 보게 해요.
const PHOTO_GRID_PAGE_SIZE = 8;

const SPREAD_BACKGROUND_PRESETS: { color: string; label: string }[] = [
  { color: "#ffffff", label: "흰색(기본)" },
  { color: "#f7f3ec", label: "아이보리" },
  { color: "#f0ece4", label: "베이지" },
  { color: "#eef1f4", label: "라이트그레이" },
  { color: "#e9eef2", label: "페일블루" },
  { color: "#f4ece7", label: "페일핑크" },
  { color: "#232323", label: "차콜" },
];

function CaptionSettingsPopover({
  photo,
  onChange,
  showPosition,
}: {
  photo: Photo;
  onChange: (changes: Partial<Photo>) => void;
  showPosition: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: photo.fontFamily }}
        className="rounded border border-[var(--color-hairline)] bg-white/90 px-2 py-0.5 text-[11px] shadow-sm"
      >
        Aa
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-72 overflow-y-auto rounded-lg border border-[var(--color-hairline)] bg-white p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">캡션 설정</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-[var(--color-charcoal)]/50"
              >
                닫기
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">서체</p>
            <div className="mt-1 max-h-40 overflow-y-auto rounded border border-[var(--color-hairline)]">
              {fontOptions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange({ fontFamily: f.id })}
                  style={{ fontFamily: f.id }}
                  className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-[var(--color-ivory)] ${
                    f.id === photo.fontFamily ? "bg-[var(--color-sky)]/10" : ""
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">크기</p>
            <div className="mt-1 flex gap-1">
              {(["sm", "base", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onChange({ size })}
                  className={`flex-1 rounded border px-2 py-1 text-xs ${
                    photo.size === size ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                  }`}
                >
                  {size === "sm" ? "작게" : size === "base" ? "보통" : "크게"}
                </button>
              ))}
              <button
                onClick={() => onChange({ bold: !photo.bold })}
                className={`rounded border px-2 py-1 text-xs font-bold ${
                  photo.bold ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                }`}
              >
                B
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">정렬</p>
            <div className="mt-1 flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onChange({ align })}
                  className={`flex-1 rounded border px-2 py-1 text-xs ${
                    photo.align === align ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                  }`}
                >
                  {align === "left" ? "왼쪽" : align === "center" ? "가운데" : "오른쪽"}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">색상</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={photo.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-[var(--color-hairline)]"
              />
              <span className="text-xs text-[var(--color-charcoal)]/60">{photo.color}</span>
            </div>

            {showPosition && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">위치</p>
                <select
                  value={photo.position}
                  onChange={(e) => onChange({ position: e.target.value as Photo["position"] })}
                  className="mt-1 w-full rounded border border-[var(--color-hairline)] bg-white px-2 py-1 text-xs"
                >
                  <option value="below">사진 아래에</option>
                  <option value="overlayBottom">사진 위 하단</option>
                  <option value="overlayCenter">사진 위 가운데</option>
                </select>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 작업선(초록)·재단선(마젠타) 미리보기 오버레이예요. 실제 인쇄 파일(lib/printCompose.ts의
// drawGuideOverlay)과 같은 두 겹 구조를 화면에서도 보여줘요. (안전선은 이제 왼쪽·오른쪽
// 페이지를 각각 닫힌 사각형으로 따로 그려요 — PageSafetyBox/BindingGuide 참고. 표지의
// 책등 경계처럼 실제로 잘리는 자리가 아닌 쪽이 있으면 hideEdge로 그 변만 빼고 그려요.)
// 반드시 스프레드(또는 표지) 전체를 감싸는 딱 하나의 요소로만 그려야 점선이 가운데서
// 끊기지 않아요. (페이지마다 따로 그리면 이어지는 자리에서 점선 위상이 어긋나 끊겨 보여요)
// 모든 안내선을 색 대신 검정 하나로 통일하고, 종류는 선 굵기·스타일로만 구분해요
// (도련선=가는 파선, 재단선=굵은 실선, 안전영역=점선, 책등·제본 경계=이중선).
const GUIDE_LINE_COLOR = "#1a1a1a";

function GuideLines({
  trimXPct,
  trimYPct,
  hideEdge,
}: {
  trimXPct: number;
  trimYPct: number;
  // 책등(세네카)처럼 실제로 잘리는 자리가 아닌 쪽은 그쪽 변만 빼고 그려요.
  hideEdge?: "left" | "right";
}) {
  const edgeStyle: CSSProperties =
    hideEdge === "left"
      ? { borderLeftStyle: "none" }
      : hideEdge === "right"
      ? { borderRightStyle: "none" }
      : {};
  return (
    <div className="pointer-events-none absolute inset-0 z-[26]">
      <div
        className="absolute inset-0 border"
        style={{ borderStyle: "dashed", borderColor: GUIDE_LINE_COLOR, ...edgeStyle }}
      />
      <div
        className="absolute border-2"
        style={{
          left: `${trimXPct}%`,
          right: `${trimXPct}%`,
          top: `${trimYPct}%`,
          bottom: `${trimYPct}%`,
          borderStyle: "solid",
          borderColor: GUIDE_LINE_COLOR,
          ...edgeStyle,
        }}
      />
    </div>
  );
}

// 표지 안내선 전용 — 사각형/세로선을 "표지 펼침면 전체를 100%로 보는" 좌표(왼쪽 끝
// left%, 오른쪽 끝 right%, 위 top%, 아래 bottom%)로 그려요. 패널마다 따로 안 그리고,
// 이 좌표만 맞으면 항상 펼침면 전체 기준으로 하나로 이어져 보여요. variant로 선
// 스타일(파선/실선/점선)만 바꿔서, 색은 항상 검정 하나로 통일해요.
function CoverGuideBox({
  left,
  right,
  top,
  bottom,
  variant = "dashed",
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
  variant?: "dashed" | "solid" | "dotted";
}) {
  return (
    <div
      className={variant === "solid" ? "pointer-events-none absolute z-[26] border-2" : "pointer-events-none absolute z-[26] border"}
      style={{
        left: `${left}%`,
        right: `${100 - right}%`,
        top: `${top}%`,
        bottom: `${100 - bottom}%`,
        borderStyle: variant,
        borderColor: GUIDE_LINE_COLOR,
      }}
    />
  );
}

// 내지 펼침면 가운데의 "제본 경계"예요. 실제로 두 페이지가 만나는 정중앙(50%)에 검정
// 이중선을 하나 긋고(책등 경계와 같은 시각 언어), 그 양옆으로 제본 때문에 주의가
// 필요한 영역을 옅은 음영으로 보여줘요. 화면 전용 안내예요 — 인쇄 PDF에는 들어가지 않아요.
function BindingGuide({ leftPct, rightPct }: { leftPct: number; rightPct: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 bg-black/5"
      style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
    />
  );
}

// 눈금자 두께(px) — 위쪽(가로 눈금자) 높이와 왼쪽(세로 눈금자) 폭. 왼쪽 위 빈 모서리
// 칸도 이 두 값으로 크기를 맞춰요.
const RULER_THICKNESS_PX = { h: 20, w: 28 };
// 스프레드 박스 자체에 이미 있는 위쪽 여백(className의 "mt-3" = 12px)이에요. 눈금자
// 위쪽 공간(paddingTop)을 잡을 때 이 여백만큼 미리 빼줘야, 눈금자가 실제 캔버스 위쪽
// 가장자리에 딱 붙어요 — 안 그러면 눈금자와 캔버스 사이에 이 여백만큼 빈틈이 생겨서
// 눈금 위치가 재단선과 안 맞아 보여요(2026-09 수정).
const SPREAD_BOX_MARGIN_TOP_PX = 12;

// 일러스트레이터 편집대지처럼, 스프레드(펼침면) 위쪽·왼쪽에 실제 mm 눈금을 보여주는
// 눈금자예요(2026-09 요청). **0mm은 실제로 인쇄되는 면(재단선) 기준이에요** — 도련
// (bleed, 인쇄 후 잘려나가는 여분) 안쪽은 0보다 작은 음수로 표시돼요(일러스트레이터에서
// 아트보드 바깥 여분이 음수 좌표로 보이는 것과 같아요, 2026-09 수정 — 처음엔 도련
// 바깥쪽 끝을 0으로 잡았었는데 "인쇄되는 면 기준으로 잡아달라"는 피드백을 받고 고침).
// zeroOffsetMm(=도련 폭)만큼 안쪽으로 0점을 옮기되, 눈금이 화면에 그려지는 위치(퍼센트)는
// 여전히 GuideLines와 같은 좌표계(guideSpreadWorkMm/guidePageWorkMm, 도련 포함 전체 길이)
// 기준이라 재단선·안전영역과 항상 같은 자리에 맞아떨어져요. 캔버스 확대/축소(canvasZoom)와
// 같은 transform 안에 들어있어서 확대·축소하면 눈금자도 캔버스와 함께 자연스럽게 늘어나요.
// 일러스트레이터 편집대지처럼, 스프레드(펼침면) 위쪽·왼쪽에 실제 mm 눈금을 보여주는
// 눈금자예요(2026-09 요청). **0mm은 실제로 인쇄되는 면(재단선) 기준이에요** — 도련
// (bleed, 인쇄 후 잘려나가는 여분) 안쪽은 0보다 작은 음수로 표시돼요(일러스트레이터에서
// 아트보드 바깥 여분이 음수 좌표로 보이는 것과 같아요, 2026-09 수정 — 처음엔 도련
// 바깥쪽 끝을 0으로 잡았었는데 "인쇄되는 면 기준으로 잡아달라"는 피드백을 받고 고침).
//
// trimTotalMm: 재단선부터 재단선까지 실제로 표시하고 싶은 진짜 길이예요(예: 세로
// 페이지는 250mm, 가로 스프레드는 500mm). 화면에 그려지는 캔버스(totalMm, 도련
// 포함)의 재단 구간 길이(= totalMm - 2*zeroOffsetMm)가 이 값과 정확히 같지 않을 수
// 있어요 — 스프레드는 왼쪽·오른쪽 두 페이지 작업파일(도련 포함)을 나란히 붙인 화면이라,
// 두 파일이 만나는 가운데에 서로 마주보는 도련이 겹쳐서 캔버스 재단 구간이 510mm인데
// 실제 재단 폭은 500mm인 식이에요. 이 차이를 숫자 하나하나를 건너뛰는 대신, 재단
// 구간 전체를 진짜 길이에 맞춰 살짝 눌러서(예: 510mm→500mm, 약 2%) 균일하게
// 늘어나도록 다시 매겨요 — 그러면 0(왼쪽 재단선)·250(정중앙 접힘선)·500(오른쪽
// 재단선)이 전부 정확한 자리에 오고, 눈금 사이 간격이 갑자기 벌어지는 곳도 없어요
// (2026-09 수정 — "255가 가운데 접힘선" 피드백에 따라, "건너뛰기" 방식 대신 이 방식으로
// 교체). trimTotalMm을 생략하면(세로 눈금자처럼 이 차이가 없는 경우) 원래 재단 구간
// 길이를 그대로 써요.
//
// zeroOffsetMm(=도련 폭)만큼 안쪽으로 0점을 옮기되, 눈금이 화면에 그려지는 위치(퍼센트)는
// 여전히 GuideLines와 같은 좌표계(totalMm 기준, 도련 포함 전체 길이)라 재단선·안전영역과
// 항상 같은 자리에 맞아떨어져요. 캔버스 확대/축소(canvasZoom)와 같은 transform 안에
// 들어있어서 확대·축소하면 눈금자도 캔버스와 함께 자연스럽게 늘어나요.
function Ruler({
  orientation,
  totalMm,
  zeroOffsetMm = 0,
  trimTotalMm,
  majorStepMm = 50,
  minorStepMm = 10,
}: {
  orientation: "horizontal" | "vertical";
  totalMm: number;
  zeroOffsetMm?: number;
  trimTotalMm?: number;
  majorStepMm?: number;
  minorStepMm?: number;
}) {
  if (!(totalMm > 0)) return null;
  // 캔버스(도련 포함) 안에서 재단 구간이 차지하는 실제 길이예요.
  const rawTrimSpanMm = totalMm - 2 * zeroOffsetMm;
  // 화면에 보여줄 진짜 재단 길이 — 생략되면 캔버스의 재단 구간 길이를 그대로 써요.
  const displayTrimMm = trimTotalMm ?? rawTrimSpanMm;
  // 라벨(mm) 1개당 실제 캔버스에서 몇 mm를 움직여야 하는지의 배율이에요. 스프레드처럼
  // 캔버스 재단 구간(510)과 진짜 재단 길이(500)가 다를 때만 1이 아니에요.
  const rawPerLabelMm = displayTrimMm > 0 ? rawTrimSpanMm / displayTrimMm : 1;
  function labelToRawMm(labelMm: number): number {
    return zeroOffsetMm + labelMm * rawPerLabelMm;
  }
  const lastLabelMm = Math.floor(displayTrimMm / minorStepMm) * minorStepMm;
  const startLabelMm = Math.ceil(-zeroOffsetMm / rawPerLabelMm / minorStepMm) * minorStepMm;
  const ticks: { labelMm: number; rawMm: number; major: boolean }[] = [];
  for (let labelMm = startLabelMm; labelMm <= lastLabelMm + 0.01; labelMm += minorStepMm) {
    const rounded = Math.round(labelMm);
    ticks.push({ labelMm: rounded, rawMm: labelToRawMm(rounded), major: rounded % majorStepMm === 0 });
  }
  // 끝쪽 재단선도 50mm 눈금과 상관없이 항상 숫자가 찍히게 해요 — 상품 크기가 50의
  // 배수가 아니면 마지막 50mm 눈금이 재단선과 안 맞아 보일 수 있어서, "0"과 똑같이
  // 재단선 위치에는 항상 눈금을 하나 더 그려줘요.
  const farEdgeLabelMm = Math.round(displayTrimMm);
  const hasFarEdgeTick = ticks.some((t) => Math.abs(t.labelMm - farEdgeLabelMm) < 0.5);
  if (!hasFarEdgeTick) {
    ticks.push({ labelMm: farEdgeLabelMm, rawMm: labelToRawMm(farEdgeLabelMm), major: true });
  } else {
    const existing = ticks.find((t) => Math.abs(t.labelMm - farEdgeLabelMm) < 0.5);
    if (existing) existing.major = true;
  }
  ticks.sort((a, b) => a.rawMm - b.rawMm);
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[var(--color-ivory)] text-[8px] text-[var(--color-charcoal)]/55`}>
      {ticks.map(({ labelMm, rawMm, major }) =>
        orientation === "horizontal" ? (
          <div
            key={labelMm}
            className="absolute top-0 flex h-full flex-col items-start"
            style={{ left: `${(rawMm / totalMm) * 100}%` }}
          >
            <div className={`w-px bg-[var(--color-charcoal)]/40 ${major ? "h-2.5" : "h-1.5"}`} />
            {major && <span className="ml-0.5 leading-none">{labelMm}</span>}
          </div>
        ) : (
          <div
            key={labelMm}
            // items-center를 쓰면 이 줄(row)의 높이(숫자 텍스트 높이, 8px)만큼 눈금
            // 표시선이 아래로 밀려서(세로로 약 3~4px) 실제 위치(top%)보다 살짝 낮게
            // 그려졌어요 — 재단선과 눈금이 "살짝 안 맞아 보이는" 원인이었어요(2026-09
            // 수정). items-start로 바꿔서 눈금 표시선 자체는 항상 top% 위치에 정확히
            // 고정하고, 숫자 텍스트만 따로 위로 절반 옮겨서(-translate-y-1/2) 눈금
            // 옆에 보기 좋게 배치해요. justify-end + 숫자를 눈금선보다 앞에 둬서,
            // 숫자는 왼쪽에 눈금선은 항상 캔버스 쪽(오른쪽) 가장자리에 붙도록 했어요
            // (2026-09 수정 — "숫자가 왼쪽, 눈금이 오른쪽" 요청).
            className="absolute left-0 flex w-full items-start justify-end gap-0.5"
            style={{ top: `${(rawMm / totalMm) * 100}%` }}
          >
            {major && <span className="-translate-y-1/2 leading-none">{labelMm}</span>}
            <div className={`h-px bg-[var(--color-charcoal)]/40 ${major ? "w-2.5" : "w-1.5"}`} />
          </div>
        )
      )}
    </div>
  );
}

// 사진 프레임(칸)을 "원본 전체 보이기(contain, scale 1)" 기준에서 "프레임 꽉 채우기
// (cover)" 기준으로 바꿀 때 필요한 scale 배율을 계산해요. 칸과 사진의 가로세로 비율만
// 있으면 되고, 절대 픽셀 크기는 필요 없어요. (lib/printCompose.ts의 drawPhotoInCell과
// 같은 공식이에요 — 화면과 인쇄 파일이 항상 같은 구도로 나오게 하기 위해서예요.)
function computeFillScale(imgW: number, imgH: number, containerW: number, containerH: number) {
  if (!imgW || !imgH || !containerW || !containerH) return 1;
  const imgRatio = imgW / imgH;
  const cellRatio = containerW / containerH;
  return imgRatio > cellRatio ? imgRatio / cellRatio : cellRatio / imgRatio;
}

function PhotoCell({
  photo,
  requiredMinPx,
  onChange,
  backgroundColor,
  onConvertToImageBox,
}: {
  photo: Photo;
  requiredMinPx: number;
  onChange: (changes: Partial<Photo>) => void;
  // 사진이 프레임을 다 못 채울 때(전체 맞추기 등) 여백에 비치는 색이에요.
  // 지정 안 하면 기존처럼 아이보리색이에요.
  backgroundColor?: string;
  // "사진 1장(꽉 참/여백)" 페이지에서만 전달돼요 — 있으면 "이미지박스로" 버튼이 떠서, 이
  // 사진을 페이지 경계를 자유롭게 넘나들 수 있는 이미지박스로 전환할 수 있어요
  // (2026-09-22 추가, "왼쪽 페이지 사진을 오른쪽으로 넘어가게 할 수 없다"는 요청).
  onConvertToImageBox?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({
    mouseX: 0,
    mouseY: 0,
    photoX: 0,
    photoY: 0,
    containerW: 0,
    containerH: 0,
  });

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    const rect = cellRef.current?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      photoX: photo.x,
      photoY: photo.y,
      // 이 사진칸이 화면에서 실제로 몇 px인지 함께 저장해둬요.
      // (나중에 인쇄 파일을 만들 때, 같은 비율로 위치를 옮기기 위해 필요해요.)
      containerW: rect?.width || photo.containerW || 1,
      containerH: rect?.height || photo.containerH || 1,
    };
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      onChange({
        x: dragStart.current.photoX + dx,
        y: dragStart.current.photoY + dy,
        containerW: dragStart.current.containerW,
        containerH: dragStart.current.containerH,
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // "프레임 채우기" 버튼이 처음부터(드래그를 한 번도 안 해도) 정확히 동작하도록, 칸이 화면에
  // 그려지자마자 실제 픽셀 크기를 한 번 재서 저장해둬요.
  // 새로 추가된 사진(칸 크기를 한 번도 잰 적 없음, containerW/H가 아직 0)은 기본값을
  // "사진 전체 맞추기"(scale 1)가 아니라 "프레임 채우기"로 시작해요. 원본 파일은 그대로 두고
  // 화면에서 보여지는 비율(scale)만 바꾸는 거라 원본 손상은 없어요.
  useEffect(() => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect && (rect.width !== photo.containerW || rect.height !== photo.containerH)) {
      const isFirstMeasurement = photo.containerW === 0 && photo.containerH === 0;
      if (isFirstMeasurement) {
        const initialFillScale = computeFillScale(photo.width, photo.height, rect.width, rect.height);
        onChange({ containerW: rect.width, containerH: rect.height, scale: initialFillScale });
      } else {
        onChange({ containerW: rect.width, containerH: rect.height });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillScale = computeFillScale(photo.width, photo.height, photo.containerW, photo.containerH);
  const sliderMax = Math.max(2.5, fillScale);

  function stopThenRun(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation();
    fn();
  }

  return (
    <div
      ref={cellRef}
      className="relative h-full w-full overflow-hidden bg-[var(--color-ivory)]"
      style={backgroundColor ? { background: backgroundColor } : undefined}
    >
      <img
        src={photo.url}
        onMouseDown={handleMouseDown}
        draggable={false}
        style={{
          transform: `translate(${photo.x}px, ${photo.y}px) rotate(${photo.rotation}deg) scale(${
            photo.flipX ? -photo.scale : photo.scale
          }, ${photo.scale})`,
        }}
        className="h-full w-full cursor-grab select-none object-contain active:cursor-grabbing"
        alt=""
      />
      {isLowRes(photo, requiredMinPx) && (
        <span
          title="인쇄 기준 화질이 낮아요"
          className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          저해상도
        </span>
      )}

      <div className="absolute inset-x-1 bottom-8 flex items-center justify-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          title="사진 전체 맞추기 (여백이 생길 수 있어요)"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: 1 }))}
          className="flex h-6 items-center justify-center rounded-full bg-black/60 px-2 text-[10px] text-white"
        >
          전체
        </button>
        <button
          type="button"
          title="프레임 채우기 (여백 없이 채우고, 프레임 밖은 가려져요)"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: fillScale }))}
          className="flex h-6 items-center justify-center rounded-full bg-black/60 px-2 text-[10px] text-white"
        >
          채우기
        </button>
        {onConvertToImageBox && (
          <button
            type="button"
            title="이 사진을 자유 배치 이미지박스로 전환해요 — 이후 페이지 경계(책 가운데)를
자유롭게 넘나들며 옮기고 크기를 조절할 수 있어요. 전환 후에는 이 자리가 빈 페이지가
되고, 사진은 더블클릭으로 위치를 조정해요."
            onMouseDown={(e) => stopThenRun(e, () => onConvertToImageBox())}
            className="flex h-6 items-center justify-center rounded-full bg-[var(--color-brand-purple)]/90 px-2 text-[10px] text-white"
          >
            이미지박스로
          </button>
        )}
        <button
          type="button"
          title="축소"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: Math.max(1, photo.scale - 0.1) }))}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
        >
          −
        </button>
        <button
          type="button"
          title="확대"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: Math.min(sliderMax + 1, photo.scale + 0.1) }))}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
        >
          +
        </button>
        <button
          type="button"
          title="회전"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ rotation: (photo.rotation + 90) % 360 }))}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
        >
          ⟳
        </button>
        <button
          type="button"
          title="좌우 반전"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ flipX: !photo.flipX }))}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
        >
          ⇋
        </button>
        <button
          type="button"
          title="원래대로"
          onMouseDown={(e) =>
            stopThenRun(e, () => onChange({ x: 0, y: 0, scale: 1, rotation: 0, flipX: false }))
          }
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
        >
          ↺
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={sliderMax + 1}
        step={0.05}
        value={photo.scale}
        onChange={(e) => onChange({ scale: Number(e.target.value) })}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute inset-x-1 bottom-1 opacity-0 transition group-hover:opacity-100"
      />
    </div>
  );
}

function formatKoreanDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// "마지막 소개 페이지"에 들어가는 작은 표지 사진이에요. 앞표지 칸(PhotoCell)과 똑같은
// x/y/scale/rotation/flipX 값을 그대로 쓰되, 이 칸은 훨씬 작아서 드래그로 옮겼던 픽셀
// 거리(x, y)를 그 칸 크기 비율(cellW/containerW)로 다시 환산해요 — 인쇄 파일 쪽
// drawPhotoInCell/embedPhotoCell과 같은 계산이라, 화면과 실제 PDF의 크롭이 항상 같아요.
// 지금 단계는 읽기 전용(표지를 그대로 미러링)이에요 — 이 칸을 따로 드래그/확대할 수는
// 없고, 표지 사진·제목이 바뀌면 자동으로 같이 바뀌어요.
function IntroPhotoMirror({ photo }: { photo: Photo | null }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setCellSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!photo || !photo.url) {
    return <div ref={cellRef} className="h-full w-full bg-[var(--color-ivory)]" />;
  }

  const fx = photo.containerW > 0 && cellSize.w > 0 ? cellSize.w / photo.containerW : 1;
  const fy = photo.containerH > 0 && cellSize.h > 0 ? cellSize.h / photo.containerH : 1;

  return (
    <div ref={cellRef} className="relative h-full w-full overflow-hidden bg-[var(--color-ivory)]">
      <img
        src={photo.url}
        draggable={false}
        style={{
          transform: `translate(${photo.x * fx}px, ${photo.y * fy}px) rotate(${photo.rotation}deg) scale(${
            photo.flipX ? -photo.scale : photo.scale
          }, ${photo.scale})`,
        }}
        className="pointer-events-none h-full w-full select-none object-contain"
        alt=""
      />
    </div>
  );
}

// "마지막 소개 페이지" 화면 미리보기예요. 왼쪽 아래 영역에 위에서부터 작은 표지 사진 →
// 제목 → 발행일 → 만든이 → 제작 : KEEPIC 순서로 쌓아요. lib/printCompose.ts의
// drawIntroPage(인쇄용)와 같은 순서·배치 의도를 화면에서도 그대로 따라가요.
function IntroPagePreview({
  coverPhoto,
  coverTitle,
  introPublishDate,
  introMakerName,
}: {
  coverPhoto: Photo | null;
  coverTitle: string;
  introPublishDate: string;
  introMakerName: string;
}) {
  return (
    <div className="flex h-full w-full flex-col justify-end gap-2 bg-white p-[8%]">
      <div className="aspect-square w-[34%] overflow-hidden rounded-sm shadow-sm">
        <IntroPhotoMirror photo={coverPhoto} />
      </div>
      {coverTitle.trim() && (
        <p className="break-keep text-sm font-bold text-[var(--color-charcoal)]">{coverTitle}</p>
      )}
      <div className="text-[11px] leading-relaxed text-[var(--color-charcoal)]/70">
        <p>발행일 : {introPublishDate}</p>
        <p>만든이 : {introMakerName.trim() || "신규 작성자"}</p>
        <p>제작 : KEEPIC</p>
      </div>
      {/* "제작 : KEEPIC" 텍스트 아래에 실제 로고도 함께 넣어요 — lib/printCompose.ts의
          drawIntroPage(인쇄용)와 같은 자리, 같은 의도예요. */}
      <img src="/logo.svg" alt="Keepic" className="h-auto w-[14%] min-w-10 opacity-80" />
    </div>
  );
}

function CaptionField({
  photo,
  onCaptionChange,
  placeholder,
}: {
  photo: Photo;
  onCaptionChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={photo?.caption ?? ""}
      onChange={(e) => onCaptionChange(e.target.value)}
      placeholder={placeholder}
      style={{ color: photo?.color, fontFamily: photo?.fontFamily }}
      className={`w-full bg-transparent outline-none ${captionSizeClass[photo.size]} ${alignClass[photo.align]} ${
        photo.bold ? "font-bold" : "font-normal"
      }`}
    />
  );
}

// 자유 배치 텍스트박스 하나예요. 내지 페이지·표지 앞면 어디서나 같은 컴포넌트를 써요.
// PhotoCell과 같은 방식(mousemove/mouseup을 window에 직접 붙임)으로 드래그해요 — 다만
// 사진은 px 단위로 옮기고, 텍스트박스는 그 페이지(부모 칸) 크기를 100%로 보는 퍼센트로
// 옮겨요. 그래야 화면 크기가 달라져도 항상 같은 자리에 보여요.
// 드래그 중 박스 중심이 페이지 가운데(가로 50%/세로 50%)에 가까워지면 딱 맞춰 붙여주고,
// 일러스트레이터의 "스마트 가이드"처럼 그 순간 가운데 십자선을 보여줘요.
const CENTER_SNAP_THRESHOLD_PCT = 1.6;

// 텍스트박스 하나예요. 예전엔 박스마다 뜨는 작은 툴바(⠿ 손잡이·폰트·크기·정렬·색·삭제)로
// 옮기고 꾸몄는데, 그 툴바가 박스 위를 가리다 보니 안쪽을 클릭해서 글자를 넣기가 어렵다는
// 피드백을 받았어요. 이제는 박스 자체를 아무 데나 눌러서 바로 끌 수 있고("클릭 vs 드래그"를
// 이동 거리로 구분해요 — 몇 px 이상 움직여야 "드래그"로 보고, 그 전엔 그냥 클릭이라 텍스트
// 커서가 그대로 생겨요), 폰트·크기·정렬 같은 편집 메뉴는 화면 상단의 고정 툴바
// (TextBoxToolbar)로 옮겼어요. 지금 선택된 박스인지(isActive)는 상단 툴바가 어떤 박스를
// 고치고 있는지 보여주는 용도예요.
const TEXT_BOX_DRAG_THRESHOLD_PX = 4;

// 텍스트박스 안 줄바꿈(\n) 개수로 대략적인 줄 수를 세요 — 세로 정렬(가운데/아래)일 때
// textarea 자체 높이를 글자 양만큼만 차지하게 만드는 데 써요.
function textBoxRowCount(text: string): number {
  return Math.max(1, text.split("\n").length);
}

function TextBoxOverlay({
  box,
  onChange,
  isActive,
  onSelect,
}: {
  box: TextBoxDef;
  onChange: (changes: Partial<TextBoxDef>) => void;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  // 8방향(모서리 4개 + 변 4개) 크기 조절 전용 상태예요 — 포토샵/일러스트레이터의 선택
  // 상자처럼, 어느 손잡이를 끌든 그 방향에 맞게 너비·높이·(왼쪽/위쪽 손잡이는) 위치까지
  // 함께 조절돼요.
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    xPct: 0,
    yPct: 0,
    widthPct: 0,
    heightPct: 0,
    cellW: 1,
    cellH: 1,
    dir: "se" as TextBoxResizeDir,
  });

  // preventDefault를 하지 않아요 — 그래야 textarea 안을 클릭했을 때 브라우저가 원래 하던
  // 대로 포커스를 주고 그 자리에 커서를 놓아줘요(타이핑이 바로 가능해요). 대신
  // stopPropagation으로 상위(페이지 바깥 클릭 시 선택 해제하는) 핸들러만 막아요.
  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
    setMouseDownActive(true);
  }

  // 손잡이 8개(모서리 4개=가로·세로 동시, 변 4개=한쪽만) — 왼쪽/위쪽 손잡이를 끌면
  // 반대쪽 끝은 고정된 채 위치(xPct/yPct)와 크기가 함께 바뀌어요(포토샵 자유 변형과
  // 동일한 동작).
  function handleResizeStart(dir: TextBoxResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    const boxRect = boxRef.current?.getBoundingClientRect();
    const cellH = cellRect?.height || 1;
    const currentHeightPct = box.heightPct ?? (boxRect ? (boxRect.height / cellH) * 100 : 10);
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      widthPct: box.widthPct,
      heightPct: currentHeightPct,
      cellW: cellRect?.width || 1,
      cellH,
      dir,
    };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const s = resizeStart.current;
      const dxPct = ((e.clientX - s.mouseX) / s.cellW) * 100;
      const dyPct = ((e.clientY - s.mouseY) / s.cellH) * 100;
      const changes: Partial<TextBoxDef> = {};
      const hasE = s.dir.includes("e");
      const hasW = s.dir.includes("w");
      const hasS = s.dir.includes("s");
      const hasN = s.dir.includes("n");
      if (hasE) {
        changes.widthPct = Math.min(96, Math.max(6, s.widthPct + dxPct));
      } else if (hasW) {
        const nextWidth = Math.min(96, Math.max(6, s.widthPct - dxPct));
        changes.widthPct = nextWidth;
        changes.xPct = s.xPct + (s.widthPct - nextWidth);
      }
      if (hasS) {
        changes.heightPct = Math.min(96, Math.max(4, s.heightPct + dyPct));
      } else if (hasN) {
        const nextHeight = Math.min(96, Math.max(4, s.heightPct - dyPct));
        changes.heightPct = nextHeight;
        changes.yPct = s.yPct + (s.heightPct - nextHeight);
      }
      onChange(changes);
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!mouseDownActive) return;

    function handleMouseMove(e: MouseEvent) {
      const dxPxRaw = e.clientX - dragStart.current.mouseX;
      const dyPxRaw = e.clientY - dragStart.current.mouseY;

      if (!isDragging) {
        // 아직 문턱값을 못 넘었으면(=그냥 클릭일 수도 있으면) 박스를 옮기지 않아요. 이
        // 덕분에 텍스트 안쪽을 클릭해서 커서만 놓는 동작과, 끌어서 옮기는 동작이 둘 다
        // 자연스럽게 가능해요.
        if (Math.hypot(dxPxRaw, dyPxRaw) < TEXT_BOX_DRAG_THRESHOLD_PX) return;
        setIsDragging(true);
        // 드래그가 시작되면 혹시 텍스트에 포커스가 가 있어도 풀어줘요 — 안 그러면 마우스를
        // 움직이는 동안 글자가 드래그-선택(파랗게 반전)돼서 지저분해 보여요.
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      e.preventDefault();

      const parentEl = boxRef.current?.parentElement ?? null;
      const cellRect = parentEl?.getBoundingClientRect() ?? null;
      const dxPct = (dxPxRaw / dragStart.current.cellW) * 100;
      const dyPct = (dyPxRaw / dragStart.current.cellH) * 100;
      let nextX = Math.min(96, Math.max(0, dragStart.current.xPct + dxPct));
      let nextY = Math.min(96, Math.max(0, dragStart.current.yPct + dyPct));

      // 박스 실제 크기(픽셀)를 페이지 크기 대비 %로 환산해서, "박스의 가운데"가 페이지
      // 가운데(50%)에 오는 자리를 계산해요(왼쪽 위 좌표가 아니라 가운데 기준으로 맞춰야
      // 자연스럽게 붙어요).
      const boxRect = boxRef.current?.getBoundingClientRect();
      const boxWpct = boxRect ? (boxRect.width / dragStart.current.cellW) * 100 : box.widthPct;
      const boxHpct = boxRect ? (boxRect.height / dragStart.current.cellH) * 100 : 0;

      const centerXTarget = 50 - boxWpct / 2;
      const centerYTarget = 50 - boxHpct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;

      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });
      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging, box.widthPct]);

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      className={`absolute z-30 cursor-move border transition ${
        isActive ? "border-[var(--color-sky)]" : "border-transparent hover:border-[var(--color-sky)]/40"
      }`}
      style={{
        left: `${box.xPct}%`,
        top: `${box.yPct}%`,
        width: `${box.widthPct}%`,
        height: box.heightPct !== undefined ? `${box.heightPct}%` : undefined,
        overflow: box.heightPct !== undefined ? "hidden" : undefined,
        // 박스 높이가 고정돼 있을 때만 세로 정렬(위/가운데/아래)이 실제로 보여요 — 높이가
        // 글자 양에 맞춰 자동으로 늘어나는 박스는 남는 공간이 없어서 항상 위와 같아요.
        display: box.heightPct !== undefined ? "flex" : undefined,
        flexDirection: box.heightPct !== undefined ? "column" : undefined,
        justifyContent:
          box.heightPct !== undefined
            ? box.verticalAlign === "middle"
              ? "center"
              : box.verticalAlign === "bottom"
                ? "flex-end"
                : "flex-start"
            : undefined,
      }}
    >
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      <textarea
        value={box.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={box.heightPct !== undefined && box.verticalAlign && box.verticalAlign !== "top" ? textBoxRowCount(box.text) : 1}
        placeholder="텍스트 입력"
        style={{
          color: box.color,
          fontFamily: box.fontFamily,
          fontSize: `${0.85 * box.fontScale}rem`,
          textAlign: box.align,
          fontWeight: box.bold ? 700 : 400,
          flexShrink: 0,
        }}
        className={`w-full cursor-text resize-none border-none bg-transparent leading-snug outline-none ${
          box.heightPct !== undefined
            ? box.verticalAlign && box.verticalAlign !== "top"
              ? "max-h-full overflow-hidden"
              : "h-full overflow-hidden"
            : "overflow-hidden"
        }`}
      />
      {/* 모서리 4개(가로·세로 동시) + 변 4개(한쪽만) 손잡이예요 — 포토샵/일러스트레이터
          선택 상자처럼 어느 방향으로든 자유롭게 크기 조절할 수 있어요. */}
      {isActive && (
        <>
          {TEXT_BOX_RESIZE_HANDLES.map(({ dir, className, cursor, title }) => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              title={title}
              className={`absolute z-40 h-3 w-3 rounded-sm border border-white bg-[var(--color-sky)] shadow ${cursor} ${className}`}
            />
          ))}
        </>
      )}
    </div>
  );
}

// 텍스트박스 크기 조절 손잡이 방향 코드예요. 나침반 방향처럼 n(위)/s(아래)/e(오른쪽)/
// w(왼쪽)와 그 조합(모서리) 8개를 써요.
type TextBoxResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const TEXT_BOX_RESIZE_HANDLES: { dir: TextBoxResizeDir; className: string; cursor: string; title: string }[] = [
  { dir: "n", className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "cursor-ns-resize", title: "위로 끌어서 크기 조절" },
  { dir: "s", className: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "cursor-ns-resize", title: "아래로 끌어서 크기 조절" },
  { dir: "w", className: "top-1/2 -left-1.5 -translate-y-1/2", cursor: "cursor-ew-resize", title: "왼쪽으로 끌어서 크기 조절" },
  { dir: "e", className: "top-1/2 -right-1.5 -translate-y-1/2", cursor: "cursor-ew-resize", title: "오른쪽으로 끌어서 크기 조절" },
  { dir: "nw", className: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize", title: "끌어서 크기 조절" },
  { dir: "ne", className: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize", title: "끌어서 크기 조절" },
  { dir: "sw", className: "-left-1.5 -bottom-1.5", cursor: "cursor-nesw-resize", title: "끌어서 크기 조절" },
  { dir: "se", className: "-right-1.5 -bottom-1.5", cursor: "cursor-nwse-resize", title: "끌어서 크기 조절" },
];

// 지금 선택된 텍스트박스 하나를 고치는 툴바예요. 박스마다 따로 뜨던 작은 팝업 툴바
// 대신 하나만 두고 폰트·크기·정렬·굵게·색·삭제를 여기서 한 번에 다뤄요. 예전엔 페이지
// 맨 위(편집 화면 바깥)에 고정돼 있었는데, 2026-09-22부터 편집 화면 안으로 옮겼어요
// ("텍스트박스는 상단에 따로 넣지 말고 편집기 안에 전부 넣어달라"는 요청). 선택된
// 박스가 없으면 안내 문구만 보여줘요.
function TextBoxToolbar({
  box,
  onChange,
  onDelete,
  scopeLabel,
}: {
  box: TextBoxDef | null;
  onChange: (changes: Partial<TextBoxDef>) => void;
  onDelete: () => void;
  // 지금 고르고 있는 게 앞표지/뒤표지/내지 중 어떤 텍스트박스인지 — 혼동하지 않도록
  // 항상 보여줘요(2026-09-23 요청).
  scopeLabel?: string;
}) {
  function cycleAlign() {
    if (!box) return;
    const order: TextBoxDef["align"][] = ["left", "center", "right"];
    const next = order[(order.indexOf(box.align) + 1) % order.length];
    onChange({ align: next });
  }

  // 세로 정렬(위/가운데/아래) — 박스 높이(heightPct)를 손잡이로 조절해서 고정한 경우에만
  // 실제로 차이가 보여요.
  function cycleVerticalAlign() {
    if (!box) return;
    const order: NonNullable<TextBoxDef["verticalAlign"]>[] = ["top", "middle", "bottom"];
    const current = box.verticalAlign ?? "top";
    const next = order[(order.indexOf(current) + 1) % order.length];
    onChange({ verticalAlign: next });
  }

  return (
    <div className="z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-white/95 px-3 py-2 shadow-sm">
      {box ? (
        <>
          <span className="text-[11px] font-medium text-[var(--color-charcoal)]/60">
            {scopeLabel ?? "텍스트박스"}
          </span>
          <select
            value={box.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="h-8 rounded-full border border-[var(--color-hairline)] bg-white px-2 text-xs"
          >
            {fontOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="글자 작게"
              onClick={() => onChange({ fontScale: Math.max(0.4, Math.round((box.fontScale - 0.1) * 10) / 10) })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-sm"
            >
              −
            </button>
            <span className="w-9 text-center text-[11px] text-[var(--color-charcoal)]/60">
              {Math.round(box.fontScale * 100)}%
            </span>
            <button
              type="button"
              title="글자 크게"
              onClick={() => onChange({ fontScale: Math.min(4, Math.round((box.fontScale + 0.1) * 10) / 10) })}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-sm"
            >
              +
            </button>
          </div>
          <button
            type="button"
            title="가로 정렬 바꾸기"
            onClick={cycleAlign}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-xs"
          >
            {box.align === "left" ? "좌" : box.align === "center" ? "중" : "우"}
          </button>
          <button
            type="button"
            title="세로 정렬 바꾸기 (박스 높이를 조절했을 때만 보여요)"
            onClick={cycleVerticalAlign}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-xs"
          >
            {(box.verticalAlign ?? "top") === "top" ? "위" : box.verticalAlign === "middle" ? "중" : "아래"}
          </button>
          <button
            type="button"
            title="굵게"
            onClick={() => onChange({ bold: !box.bold })}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
              box.bold
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                : "border-[var(--color-hairline)]"
            }`}
          >
            B
          </button>
          <input
            type="color"
            value={box.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-8 cursor-pointer rounded-full border border-[var(--color-hairline)] bg-transparent p-0"
            title="글자 색"
          />
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto flex h-8 items-center gap-1 rounded-full border border-red-200 px-3 text-xs text-red-500 transition hover:bg-red-50"
          >
            ✕ 삭제
          </button>
        </>
      ) : (
        <span className="text-xs text-[var(--color-charcoal)]/40">
          텍스트박스를 선택하면 여기서 글꼴·크기·정렬·색을 바꿀 수 있어요
        </span>
      )}
    </div>
  );
}

// 한 페이지(또는 표지 앞면) 안의 텍스트박스들 + "+ 텍스트 추가" 버튼을 함께 그려요.
// renderPage()가 그리는 사진 레이아웃 위에 얹는 투명한 오버레이라서, 어떤 사진 템플릿을
// 쓰든 상관없이 항상 같은 방식으로 붙어요.
function TextBoxLayer({
  boxes,
  onAdd,
  onChange,
  activeBoxId,
  onSelect,
  showAddButton = true,
}: {
  boxes: TextBoxDef[];
  onAdd: () => void;
  onChange: (boxId: string, changes: Partial<TextBoxDef>) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
  // 내지 스프레드는 왼쪽 아이콘 메뉴("텍스트" 탭)에 이미 글상자 추가 버튼이 있어서, 캔버스
  // 위에 떠 있던 이 검은 버튼은 중복이라 꺼요(2026-09-19, 혜민님 요청). 표지·뒤표지는
  // 아직 그 메뉴가 없어서 그대로 둬요.
  showAddButton?: boolean;
}) {
  return (
    <>
      {boxes.map((box) => (
        <TextBoxOverlay
          key={box.id}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          isActive={box.id === activeBoxId}
          onSelect={() => onSelect(box.id)}
        />
      ))}
      {showAddButton && (
        <button
          type="button"
          onClick={onAdd}
          className="absolute right-1 top-1 z-20 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
        >
          + 텍스트 추가
        </button>
      )}
    </>
  );
}

function clampPct(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

// 이미지박스 크기를 조절할 때 손잡이가 이 거리(화면 px) 안으로 들어오는 안내선에
// 자동으로 달라붙어요(포토샵·일러스트레이터의 스마트 가이드 스냅과 같은 개념). 확대
// 배율과 무관하게 항상 같은 느낌으로 걸리도록 %가 아니라 px 기준 거리예요.
const IMAGE_BOX_SNAP_THRESHOLD_PX = 6;

// valuePct(0~100, 스프레드 전체 기준)에 가장 가까운 안내선이 SNAP 거리 안에 있으면 그
// 안내선 값으로 딱 맞춰줘요. cellPx는 그 축의 실제 화면 픽셀 크기(가로는 스프레드
// 폭, 세로는 페이지 높이)예요 — 이걸 알아야 "화면 px 몇 개 안"이라는 느낌을 %로 바꿀 수
// 있어요.
function snapToGuides(valuePct: number, guides: number[], cellPx: number): number {
  const thresholdPct = cellPx > 0 ? (IMAGE_BOX_SNAP_THRESHOLD_PX / cellPx) * 100 : 0;
  let best = valuePct;
  let bestDist = thresholdPct;
  for (const g of guides) {
    const dist = Math.abs(valuePct - g);
    if (dist < bestDist) {
      bestDist = dist;
      best = g;
    }
  }
  return best;
}

// 자유 배치 이미지박스 하나예요 — 텍스트박스와 같은 방식으로 끌어서 옮기고, 손잡이로
// 크기를 조절해요. 2026-09-18부터 가로·세로를 각각 따로 조절할 수 있게 됐고(원본 비율에
// 안 묶여요), 박스 안에서 사진 자체의 위치·확대(innerOffsetXPct/innerOffsetYPct/
// innerScale)도 "사진 위치 조정" 모드로 따로 옮길 수 있어요 — 박스(틀)는 항상 사진으로
// 빈틈없이 채워지고(object-fit: cover와 같은 방식), 그 안에서 어느 부분이 보일지만
// 옮기는 거예요. 화면과 인쇄 파일이 같은 계산(computeImageBoxCoverRect,
// lib/imageBoxGeometry.ts)을 공유해서 항상 일치해요.
// xPct·widthPct 등은 "스프레드 전체 폭"을 100%로 보는 좌표라서, 페이지 가운데(경계)를
// 자유롭게 넘나들며 배치할 수 있어요.
// 크기 조절 손잡이는 포토샵·일러스트레이터와 같은 단축키를 지원해요(2026-09-22,
// 혜민님 요청): Shift = 모서리 손잡이에서 정사각형으로, Alt(Option) = 반대쪽 고정이 아니라
// 중심을 고정한 채 양쪽이 같이 늘어남, Shift+Alt = 중심 고정 + 정사각형. 그리고 손잡이가
// 재단선·안전영역·펼침면 중앙(제본/책등 경계)에 가까워지면 자동으로 달라붙어요.
// 왼쪽 "사진" 편집 메뉴에서도 이 박스의 사진 위치 조정(축소/확대/좌우반전/초기화/완료)을
// 그대로 조작할 수 있도록, 부모(ImageBoxLayer → 상위 페이지)가 ref로 직접 호출할 수 있는
// 동작 목록이에요(2026-09-22 추가). 캔버스 안 작은 툴바랑 똑같은 함수를 그대로 호출해서
// 항상 같은 결과가 나와요.
type ImageBoxOverlayHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetPhotoPosition: () => void;
  toggleFlip: () => void;
  exitPhotoEditMode: () => void;
  // 왼쪽 "사진" 편집 메뉴에서도 "스프레드 전체 채우기"를 쓸 수 있도록(2026-09 요청 —
  // 캔버스 위 버튼만으로는 왼쪽 패널에서 찾을 수 없다는 피드백을 받아서 추가).
  fillSpread: () => void;
};

const ImageBoxOverlay = forwardRef<
  ImageBoxOverlayHandle,
  {
    box: ImageBoxDef;
    onChange: (changes: Partial<ImageBoxDef>) => void;
    onDelete: () => void;
    isActive: boolean;
    onSelect: () => void;
    guidesX: number[];
    guidesY: number[];
    // 사진 위치 조정 모드(더블클릭으로 들어가는 모드)에 들어가거나 나올 때마다 부모에게
    // 알려줘요 — 왼쪽 "사진" 메뉴에 조작 버튼을 보여줄지 말지 결정하는 데 씀.
    onPhotoEditModeChange?: (active: boolean) => void;
  }
>(function ImageBoxOverlay(
  { box, onChange, onDelete, isActive, onSelect, guidesX, guidesY, onPhotoEditModeChange },
  ref
) {
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // 박스 안에서 사진 위치/확대를 조정하는 모드예요. 예전엔 별도 "사진 위치" 버튼을
  // 눌러야 했는데, 2026-09-22부터 포토샵/일러스트레이터처럼 "내용물(사진)을 한 번 더
  // 클릭(더블클릭)하면 들어가는" 방식으로 바꿨어요 — 박스 자체를 조절할 땐 항상 박스
  // 모드, 사진 위치를 만지고 싶을 때만 더블클릭으로 들어가요.
  const [photoEditMode, setPhotoEditMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [boxSizePx, setBoxSizePx] = useState({ w: 1, h: 1 });
  // 박스를 끌 때 스프레드 가로 중앙(책등)·페이지 세로 중앙에 딱 붙는 느낌을 주는 안내선이에요
  // (텍스트박스에 이미 있던 것과 같은 방식, 2026-09-23 이미지박스에도 추가).
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    xPct: 0,
    yPct: 0,
    widthPct: 0,
    heightPct: 0,
    cellW: 1,
    cellH: 1,
    dir: "se" as TextBoxResizeDir,
  });
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });

  // 박스가 실제로 화면에 몇 px로 그려지는지 재요 — 사진이 박스를 항상 꽉 채우도록
  // 계산(computeImageBoxCoverRect)하려면 박스의 실제 픽셀 크기가 필요해요.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) setBoxSizePx({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Esc를 누르면 사진 위치 조정 모드에서 박스 모드로 돌아가요.
  useEffect(() => {
    if (!photoEditMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPhotoEditMode(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoEditMode]);

  // 부모(왼쪽 "사진" 편집 메뉴)에게 지금 이 박스가 사진 위치 조정 모드인지 알려줘요.
  useEffect(() => {
    onPhotoEditModeChange?.(photoEditMode);
  }, [photoEditMode, onPhotoEditModeChange]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // 다른 박스를 만지다가 이 박스를 "새로" 선택하는 거라면(이전엔 비활성 상태였다면),
    // 예전에 이 박스가 사진 위치 조정 모드였더라도 무시하고 항상 박스 모드로 시작해요 —
    // 그래야 다른 박스를 편집하고 돌아와서 무심코 클릭했을 때 갑자기 사진이 움직이는
    // 일이 없어요(리액트 렌더 중 setState를 피하려고 effect 대신 여기서 직접 처리해요).
    const wasActive = isActive;
    onSelect();
    if (photoEditMode && wasActive) {
      panStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        offsetX: box.innerOffsetXPct ?? 0,
        offsetY: box.innerOffsetYPct ?? 0,
      };
      setIsPanning(true);
      return;
    }
    // 스테일 상태 정리: 이전에 이 박스가 사진 위치 조정 모드였는데 비활성 상태를 거쳐
    // 다시 선택된 거라면, 박스 모드로 확실히 되돌려요.
    if (photoEditMode) setPhotoEditMode(false);
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
    setMouseDownActive(true);
  }

  // 사진(또는 스티커)을 더블클릭하면 "박스 조절 모드"에서 "사진 위치 조정 모드"로
  // 들어가요(포토샵에서 스마트오브젝트를 더블클릭해서 들어가는 것과 비슷해요). 다시
  // 더블클릭하거나 Esc를 누르면 박스 모드로 돌아가요.
  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    setPhotoEditMode((v) => !v);
  }

  useEffect(() => {
    if (!mouseDownActive) return;
    function handleMouseMove(e: MouseEvent) {
      const dxPxRaw = e.clientX - dragStart.current.mouseX;
      const dyPxRaw = e.clientY - dragStart.current.mouseY;
      if (!isDragging) {
        if (Math.hypot(dxPxRaw, dyPxRaw) < TEXT_BOX_DRAG_THRESHOLD_PX) return;
        setIsDragging(true);
      }
      const dxPct = (dxPxRaw / dragStart.current.cellW) * 100;
      const dyPct = (dyPxRaw / dragStart.current.cellH) * 100;
      let nextX = Math.min(100 - 4, Math.max(0, dragStart.current.xPct + dxPct));
      let nextY = Math.min(100 - 4, Math.max(0, dragStart.current.yPct + dyPct));

      // 가운데 정렬 스냅: 박스의 가로 중심이 스프레드 정중앙(책등, 50%)에, 세로 중심이
      // 페이지 세로 정중앙(50%)에 가까워지면 자동으로 딱 맞춰요(텍스트박스와 같은 방식,
      // 2026-09-23 요청).
      const cellRect = boxRef.current?.parentElement?.getBoundingClientRect() ?? null;
      const centerXTarget = 50 - box.widthPct / 2;
      const centerYTarget = 50 - box.heightPct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;
      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });

      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging, box.widthPct, box.heightPct]);

  // "사진 위치 조정" 모드에서 박스를 끌면 박스(틀)가 아니라 그 안의 사진만 옮겨요 —
  // 사진이 박스를 벗어나 빈 여백이 생기지 않도록 매번 clampImageBoxInnerOffset으로
  // 범위를 잘라요.
  useEffect(() => {
    if (!isPanning) return;
    function handleMouseMove(e: MouseEvent) {
      const rect = computeImageBoxCoverRect(
        boxSizePx.w,
        boxSizePx.h,
        box.naturalWidth,
        box.naturalHeight,
        0,
        0,
        box.innerScale ?? 1
      );
      const dxPct = ((e.clientX - panStart.current.mouseX) / boxSizePx.w) * 100;
      const dyPct = ((e.clientY - panStart.current.mouseY) / boxSizePx.h) * 100;
      const nextOffsetX = clampImageBoxInnerOffset(panStart.current.offsetX + dxPct, boxSizePx.w, rect.width);
      const nextOffsetY = clampImageBoxInnerOffset(panStart.current.offsetY + dyPct, boxSizePx.h, rect.height);
      onChange({ innerOffsetXPct: nextOffsetX, innerOffsetYPct: nextOffsetY });
    }
    function handleMouseUp() {
      setIsPanning(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, boxSizePx, box.naturalWidth, box.naturalHeight, box.innerScale]);

  // 모서리 4개(가로·세로 동시) + 변 4개(한쪽만), 텍스트박스와 똑같은 8방향 손잡이예요
  // ("포토샵처럼 박스 조절이 가능해야 한다"는 요청, 2026-09-22). 왼쪽/위쪽 손잡이는
  // 반대쪽 끝이 고정된 채 위치(xPct/yPct)와 크기가 함께 바뀌어요. 박스 크기를 조절하면
  // 사진은 항상 "박스를 꽉 채우는(cover)" 기준을 유지한 채(빈 여백이 생기지 않아요)
  // 확대/위치(innerScale·innerOffset)를 그대로 적용한 결과가 다시 계산돼요 — 그래서
  // 박스만 조절해도 늘 비율이 맞고 안 비는 틀이 생기지 않아요.
  function handleResizeStart(dir: TextBoxResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      widthPct: box.widthPct,
      heightPct: box.heightPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
      dir,
    };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const s = resizeStart.current;
      const dxPct = ((e.clientX - s.mouseX) / s.cellW) * 100;
      const dyPct = ((e.clientY - s.mouseY) / s.cellH) * 100;
      const hasE = s.dir.includes("e");
      const hasW = s.dir.includes("w");
      const hasS = s.dir.includes("s");
      const hasN = s.dir.includes("n");
      const isCorner = (hasE || hasW) && (hasN || hasS);

      // "커지는 방향 = 양수"로 통일한 순수 이동량이에요(w/n 손잡이는 부호를 뒤집어요).
      let widthDeltaPct = hasE ? dxPct : hasW ? -dxPct : 0;
      let heightDeltaPct = hasS ? dyPct : hasN ? -dyPct : 0;

      // Shift: 모서리 손잡이에서 정사각형으로 — 가로·세로 칸 크기(cellW/cellH)가 서로
      // 다를 수 있어서 %가 아니라 실제 화면 px 기준으로 맞춰야 진짜 정사각형이 돼요.
      // 두 축 중 더 많이 움직인 쪽을 기준으로 나머지 축을 맞춰요.
      if (e.shiftKey && isCorner) {
        const widthDeltaPx = (widthDeltaPct / 100) * s.cellW;
        const heightDeltaPx = (heightDeltaPct / 100) * s.cellH;
        const magnitudePx = Math.max(Math.abs(widthDeltaPx), Math.abs(heightDeltaPx));
        const signedWidthPx = (widthDeltaPx < 0 ? -1 : 1) * magnitudePx;
        const signedHeightPx = (heightDeltaPx < 0 ? -1 : 1) * magnitudePx;
        widthDeltaPct = (signedWidthPx / s.cellW) * 100;
        heightDeltaPct = (signedHeightPx / s.cellH) * 100;
      }

      let widthPct = s.widthPct;
      let heightPct = s.heightPct;
      let xPct = s.xPct;
      let yPct = s.yPct;

      if (e.altKey) {
        // Alt(Option): 반대쪽 손잡이가 고정되는 게 아니라, 박스 중심을 고정한 채 양쪽이
        // 같이 늘어나요(포토샵의 Alt 드래그와 동일). 중심이 스프레드 밖으로 나가지 않게,
        // 중심에서 양쪽 끝(0%/100%)까지 중 더 좁은 쪽을 기준으로 최대 크기를 잡아요 —
        // 그래야 늘어난 박스가 스프레드 밖으로 삐져나가지 않아요.
        if (hasE || hasW) {
          const centerX = s.xPct + s.widthPct / 2;
          const maxWidth = Math.max(6, 2 * Math.min(centerX, 100 - centerX));
          widthPct = clampPct(6, maxWidth, s.widthPct + 2 * widthDeltaPct);
          xPct = centerX - widthPct / 2;
        }
        if (hasS || hasN) {
          const centerY = s.yPct + s.heightPct / 2;
          const maxHeight = Math.max(4, 2 * Math.min(centerY, 100 - centerY));
          heightPct = clampPct(4, maxHeight, s.heightPct + 2 * heightDeltaPct);
          yPct = centerY - heightPct / 2;
        }
      } else {
        // 고정된 반대쪽 끝(반대쪽 손잡이)을 기준으로 최대 크기를 잡아서, 박스가 스프레드
        // 가장자리(0%/100%)에 정확히 딱 맞을 수 있게 해요(예전엔 96%까지만 늘어나서
        // 스프레드 전체를 꽉 채울 수 없었던 문제를 고침, 2026-09 요청).
        if (hasE) {
          widthPct = clampPct(6, Math.max(6, 100 - s.xPct), s.widthPct + widthDeltaPct);
        } else if (hasW) {
          const rightEdge = s.xPct + s.widthPct;
          widthPct = clampPct(6, Math.max(6, rightEdge), s.widthPct + widthDeltaPct);
          xPct = rightEdge - widthPct;
        }
        if (hasS) {
          heightPct = clampPct(4, Math.max(4, 100 - s.yPct), s.heightPct + heightDeltaPct);
        } else if (hasN) {
          const bottomEdge = s.yPct + s.heightPct;
          heightPct = clampPct(4, Math.max(4, bottomEdge), s.heightPct + heightDeltaPct);
          yPct = bottomEdge - heightPct;
        }
      }

      // 재단선·안전영역·펼침면 중앙(책등/제본 경계) 같은 안내선에 가까우면 그 손잡이가
      // 움직이는 쪽 변(왼쪽/오른쪽/위/아래)만 딱 맞춰요 — 고정된 반대쪽 변은 건드리지 않아요.
      if (hasE) {
        const snappedRight = snapToGuides(xPct + widthPct, guidesX, s.cellW);
        widthPct = Math.max(6, snappedRight - xPct);
      } else if (hasW) {
        const snappedLeft = snapToGuides(xPct, guidesX, s.cellW);
        widthPct = Math.max(6, xPct + widthPct - snappedLeft);
        xPct = snappedLeft;
      }
      if (hasS) {
        const snappedBottom = snapToGuides(yPct + heightPct, guidesY, s.cellH);
        heightPct = Math.max(4, snappedBottom - yPct);
      } else if (hasN) {
        const snappedTop = snapToGuides(yPct, guidesY, s.cellH);
        heightPct = Math.max(4, yPct + heightPct - snappedTop);
        yPct = snappedTop;
      }

      // 마지막 안전장치: 어떤 경로로 계산되든 박스가 스프레드(0~100%) 밖으로 나가지
      // 않도록 한 번 더 확실히 막아요.
      const safeXPct = Math.min(Math.max(0, xPct), 100 - widthPct);
      const safeYPct = Math.min(Math.max(0, yPct), 100 - heightPct);
      onChange({ widthPct, heightPct, xPct: safeXPct, yPct: safeYPct });
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, guidesX, guidesY]);

  function handleZoom(delta: number) {
    const nextScale = Math.min(3, Math.max(1, (box.innerScale ?? 1) + delta));
    const rect = computeImageBoxCoverRect(boxSizePx.w, boxSizePx.h, box.naturalWidth, box.naturalHeight, 0, 0, nextScale);
    const nextOffsetX = clampImageBoxInnerOffset(box.innerOffsetXPct ?? 0, boxSizePx.w, rect.width);
    const nextOffsetY = clampImageBoxInnerOffset(box.innerOffsetYPct ?? 0, boxSizePx.h, rect.height);
    onChange({ innerScale: nextScale, innerOffsetXPct: nextOffsetX, innerOffsetYPct: nextOffsetY });
  }

  function handleResetPhotoPosition() {
    onChange({ innerOffsetXPct: 0, innerOffsetYPct: 0, innerScale: 1 });
  }

  // 박스를 스프레드(펼침면) 전체에 한 번에 꽉 채워요 — 사진 한 장으로 양쪽 페이지를
  // 가득 채우고 싶을 때 매번 손잡이로 정확히 맞추지 않아도 되게(2026-09 요청).
  function handleFillSpread() {
    onChange({ xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 });
  }

  // 왼쪽 "사진" 편집 메뉴의 버튼들이 캔버스 안 작은 툴바와 똑같은 동작을 하도록 노출해요.
  useImperativeHandle(ref, () => ({
    zoomIn: () => handleZoom(0.1),
    zoomOut: () => handleZoom(-0.1),
    resetPhotoPosition: handleResetPhotoPosition,
    toggleFlip: () => onChange({ flipX: !box.flipX }),
    exitPhotoEditMode: () => setPhotoEditMode(false),
    fillSpread: handleFillSpread,
  }));

  const coverRect = computeImageBoxCoverRect(
    boxSizePx.w,
    boxSizePx.h,
    box.naturalWidth,
    box.naturalHeight,
    box.innerOffsetXPct ?? 0,
    box.innerOffsetYPct ?? 0,
    box.innerScale ?? 1
  );

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`absolute z-[25] border transition ${
        isActive && photoEditMode ? "cursor-grab" : "cursor-move"
      } ${
        isActive && photoEditMode
          ? "border-[var(--color-brand-purple)]"
          : isActive
            ? "border-[var(--color-sky)]"
            : "border-transparent hover:border-[var(--color-sky)]/40"
      }`}
      style={{ left: `${box.xPct}%`, top: `${box.yPct}%`, width: `${box.widthPct}%`, height: `${box.heightPct}%` }}
    >
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src={box.url}
          alt=""
          draggable={false}
          // max-w-none/max-h-none: Tailwind 기본 스타일(img { max-width: 100% })이
          // 없으면, 사진이 박스보다 크게(cover 계산 결과) 커져야 할 때도 브라우저가
          // 폭을 박스 크기로 강제로 줄여버려서(높이는 style로 고정) 사진이 박스를
          // 다 못 채우고 한쪽에 빈 공간이 생겨요 — 특히 책등 쪽에서 보였던 문제의
          // 진짜 원인이에요(2026-09).
          className="pointer-events-none absolute max-w-none max-h-none select-none"
          style={{
            left: coverRect.x,
            top: coverRect.y,
            width: coverRect.width,
            height: coverRect.height,
            transform: box.flipX ? "scaleX(-1)" : undefined,
          }}
        />
      </div>
      {isActive && !photoEditMode && (
        <>
          <button
            type="button"
            title="이미지박스 삭제"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -right-1.5 -top-1.5 z-40 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-red-500 text-[10px] text-white shadow"
          >
            ✕
          </button>
          {TEXT_BOX_RESIZE_HANDLES.map(({ dir, className, cursor, title }) => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              title={title}
              className={`absolute z-40 h-3.5 w-3.5 rounded-sm border border-white bg-[var(--color-sky)] shadow ${cursor} ${className}`}
            />
          ))}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute -bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap"
          >
            <button
              type="button"
              title="이 사진박스로 펼침면(양쪽 페이지) 전체를 꽉 채워요"
              onClick={handleFillSpread}
              className="rounded-full bg-[var(--color-charcoal)]/80 px-2 py-0.5 text-[10px] text-white"
            >
              스프레드 전체 채우기
            </button>
            <span className="rounded-full bg-[var(--color-charcoal)]/80 px-2 py-0.5 text-[10px] text-white">
              더블클릭하면 안의 사진 위치를 옮길 수 있어요
            </span>
          </div>
        </>
      )}
      {isActive && photoEditMode && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -bottom-9 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-white px-1.5 py-1 shadow"
        >
          <span className="px-1 text-[10px] font-medium text-[var(--color-brand-purple)]">사진 위치 조정 중</span>
          <button
            type="button"
            title="축소"
            onClick={() => handleZoom(-0.1)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ivory)] text-xs text-[var(--color-charcoal)]/70"
          >
            −
          </button>
          <button
            type="button"
            title="확대"
            onClick={() => handleZoom(0.1)}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ivory)] text-xs text-[var(--color-charcoal)]/70"
          >
            +
          </button>
          <button
            type="button"
            title="좌우 반전"
            onClick={() => onChange({ flipX: !box.flipX })}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ivory)] text-xs text-[var(--color-charcoal)]/70"
          >
            ⇌
          </button>
          <button
            type="button"
            title="사진 위치 초기화"
            onClick={handleResetPhotoPosition}
            className="rounded-full bg-[var(--color-ivory)] px-2 py-0.5 text-[10px] text-[var(--color-charcoal)]/70"
          >
            초기화
          </button>
          <button
            type="button"
            title="박스 조절 모드로 돌아가기"
            onClick={() => setPhotoEditMode(false)}
            className="rounded-full bg-[var(--color-charcoal)] px-2 py-0.5 text-[10px] text-white"
          >
            완료
          </button>
        </div>
      )}
    </div>
  );
});

// 한 스프레드(펼침면) 전체의 이미지박스들 + "+ 사진 추가" 버튼을 함께 그려요. 텍스트박스와
// 달리 왼쪽/오른쪽 낱장이 아니라 스프레드 전체 컨테이너 위에 얹어서, 박스가 페이지 경계를
// 자유롭게 넘나들 수 있게 해요.
function ImageBoxLayer({
  boxes,
  onChange,
  onDelete,
  activeBoxId,
  onSelect,
  guidesX,
  guidesY,
  onPhotoEditModeChange,
  registerBoxRef,
}: {
  boxes: ImageBoxDef[];
  onChange: (boxId: string, changes: Partial<ImageBoxDef>) => void;
  onDelete: (boxId: string) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
  // 크기 조절 손잡이가 달라붙을 안내선 위치예요(스프레드 전체를 0~100으로 보는 %,
  // 재단선·안전영역·펼침면 중앙 등) — 상위 컴포넌트가 계산해서 내려줘요.
  guidesX: number[];
  guidesY: number[];
  // 박스가 사진 위치 조정 모드로 들어가거나 나올 때 상위에 알려줘요(왼쪽 "사진" 메뉴에
  // 조작 버튼을 보여줄지 결정하는 데 씀, 2026-09-22 추가).
  onPhotoEditModeChange?: (active: boolean) => void;
  // 상위가 각 박스의 사진 위치 조정 동작(확대/축소/반전/초기화/완료)을 ref로 직접 호출할
  // 수 있도록 박스 id별 핸들을 등록해요.
  registerBoxRef?: (boxId: string, handle: ImageBoxOverlayHandle | null) => void;
}) {
  // 사진 추가·스티커 추가 버튼은 2026-09-19부터 캔버스 위 숨은 버튼이 아니라 왼쪽
  // 아이콘 메뉴("사진"/"스티커" 탭)로 옮겨졌어요 — 이 레이어는 이제 박스 렌더링만 해요.
  return (
    <>
      {boxes.map((box) => (
        <ImageBoxOverlay
          key={box.id}
          ref={(instance) => registerBoxRef?.(box.id, instance)}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          onDelete={() => onDelete(box.id)}
          isActive={box.id === activeBoxId}
          onSelect={() => onSelect(box.id)}
          onPhotoEditModeChange={box.id === activeBoxId ? onPhotoEditModeChange : undefined}
          guidesX={guidesX}
          guidesY={guidesY}
        />
      ))}
    </>
  );
}

// 표지 제목이에요. 예전엔 하단에 고정된 텍스트였는데, 이제 텍스트박스처럼 끌어서 원하는
// 자리로 옮길 수 있어요(가운데로 가져가면 딱 붙는 안내선도 함께 떠요).
function CoverTitleOverlay({
  title,
  xPct,
  yPct,
  widthPct,
  fontSizeCqh,
  lineHeightEm,
  letterSpacingEm,
  fontFamily,
  onMove,
}: {
  title: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  fontSizeCqh: number; // 실제 pt 크기를 컨테이너 높이 대비 %(cqh)로 환산한 값 — 창 크기와 무관하게 항상 같은 실물 크기로 보여요.
  lineHeightEm: number;
  letterSpacingEm: number;
  fontFamily: string;
  onMove: (changes: { xPct: number; yPct: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct,
      yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) {
      const parentEl = boxRef.current?.parentElement ?? null;
      const cellRect = parentEl?.getBoundingClientRect() ?? null;
      const dxPct = ((e.clientX - dragStart.current.mouseX) / dragStart.current.cellW) * 100;
      const dyPct = ((e.clientY - dragStart.current.mouseY) / dragStart.current.cellH) * 100;
      let nextX = Math.min(98, Math.max(0, dragStart.current.xPct + dxPct));
      let nextY = Math.min(98, Math.max(0, dragStart.current.yPct + dyPct));

      const boxRect = boxRef.current?.getBoundingClientRect();
      const boxWpct = boxRect ? (boxRect.width / dragStart.current.cellW) * 100 : widthPct;
      const boxHpct = boxRect ? (boxRect.height / dragStart.current.cellH) * 100 : 0;
      const centerXTarget = 50 - boxWpct / 2;
      const centerYTarget = 50 - boxHpct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;

      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });
      onMove({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, widthPct]);

  if (!title.trim()) return null;

  return (
    <div
      ref={boxRef}
      className="group/ct absolute z-20"
      style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${widthPct}%` }}
    >
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      <button
        type="button"
        title="끌어서 이동"
        onMouseDown={handleDragStart}
        className="absolute -top-7 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-black/60 text-[11px] text-white opacity-0 transition active:cursor-grabbing group-hover/ct:opacity-100"
      >
        ⠿
      </button>
      <p
        className="pointer-events-none whitespace-pre-wrap text-center font-semibold text-white drop-shadow"
        style={{
          fontSize: `${fontSizeCqh}cqh`,
          lineHeight: lineHeightEm,
          letterSpacing: `${letterSpacingEm}em`,
          fontFamily,
        }}
      >
        {title}
      </p>
    </div>
  );
}

// 책등 텍스트박스예요. 책등 폭 자체가 아주 좁아서 가로로 조절할 일이 없어요 — 항상 책등
// 패널 폭 전체(왼쪽 0%~오른쪽 100%)를 그대로 쓰고, 세로 위치·높이만 끌어서 바꿔요.
// 일러스트레이터 텍스트박스 도구처럼 파란 테두리 박스로 보이고, 아래쪽 손잡이로 세로
// 크기를 조절해요.
function SpineTitleOverlay({
  title,
  emptyLabel,
  yPct,
  heightPct,
  fontSizeCqh,
  fontFamily,
  onMove,
  onResize,
}: {
  title: string;
  emptyLabel: string;
  yPct: number;
  heightPct: number;
  fontSizeCqh: number; // 실제 mm 크기를 컨테이너 높이 대비 %(cqh)로 환산한 값 — 창 크기와 무관하게 항상 같은 실물 비율로 보여요.
  fontFamily: string;
  onMove: (yPct: number) => void;
  onResize: (heightPct: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseY: 0, yPct: 0, cellH: 1 });
  const resizeStart = useRef({ mouseY: 0, heightPct: 0, cellH: 1 });

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = { mouseY: e.clientY, yPct, cellH: cellRect?.height || 1 };
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) {
      const dyPct = ((e.clientY - dragStart.current.mouseY) / dragStart.current.cellH) * 100;
      const nextY = Math.min(90, Math.max(0, dragStart.current.yPct + dyPct));
      onMove(nextY);
    }
    function handleMouseUp() {
      setIsDragging(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = { mouseY: e.clientY, heightPct, cellH: cellRect?.height || 1 };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const dyPct = ((e.clientY - resizeStart.current.mouseY) / resizeStart.current.cellH) * 100;
      const nextHeight = Math.min(90, Math.max(8, resizeStart.current.heightPct + dyPct));
      onResize(nextHeight);
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const active = isDragging || isResizing;

  return (
    <div
      ref={boxRef}
      onMouseDown={handleDragStart}
      className={`group/st absolute left-0 z-20 flex w-full cursor-move items-center justify-center overflow-hidden border px-0.5 transition ${
        active ? "border-[var(--color-sky)]" : "border-transparent hover:border-[var(--color-sky)]/50"
      }`}
      style={{ top: `${yPct}%`, height: `${heightPct}%` }}
    >
      {title.trim() ? (
        // 키픽 로고와 같은 방향(90도)으로 한 줄로 눕혀서 보여줘요 — 글자를 하나씩 세로로
        // 쌓지 않아요. font-size는 cqh(컨테이너 높이 기준 %)라서 창 크기가 바뀌어도 항상
        // 책 실물 크기 그대로 커지고 작아져요(고정 px이 아니에요).
        <span
          className="whitespace-nowrap font-bold text-[var(--color-charcoal)]"
          style={{ fontSize: `${fontSizeCqh}cqh`, lineHeight: 1, transform: "rotate(90deg)", fontFamily }}
        >
          {title}
        </span>
      ) : (
        <span
          className="text-[11px] text-[var(--color-charcoal)]/40"
          style={{ writingMode: "vertical-lr", textOrientation: "upright" }}
        >
          {emptyLabel}
        </span>
      )}
      <div
        onMouseDown={handleResizeStart}
        title="끌어서 세로 크기 조절"
        className="absolute -bottom-1.5 left-1/2 z-40 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-sm border border-white bg-[var(--color-sky)] opacity-0 shadow transition group-hover/st:opacity-100"
      />
    </div>
  );
}

function renderPage(
  templateId: PageTemplateId,
  photos: Photo[],
  photoIndexes: number[],
  onPhotoChange: (index: number, changes: Partial<Photo>) => void,
  onCaptionChange: (photoIndex: number, value: string) => void,
  requiredMinPx: number,
  // 이 페이지가 속한 스프레드의 배경색(hex)이에요. 지정 안 하면 기존 색 그대로예요.
  backgroundColor?: string,
  // "사진 1장(꽉 참/여백)" 페이지에서만 쓰여요 — 이 사진을 자유 배치 이미지박스로
  // 전환하는 버튼을 눌렀을 때 호출돼요(2026-09-22 추가).
  onConvertToImageBox?: () => void
) {
  const bgStyle = backgroundColor ? { background: backgroundColor } : undefined;

  if (templateId === "blank") {
    return <div className="aspect-square bg-white" style={bgStyle} />;
  }

  // 이 페이지의 사진이 이미 자유 배치 이미지박스로 전환된 상태예요 — 사진은 더 이상 여기
  // 없고(spread.imageBoxes 안에서 따로 그려져요), 빈 배경만 보여줘요.
  if (templateId === "freeform") {
    return <div className="aspect-square" style={bgStyle} />;
  }

  if (templateId === "full") {
    return (
      <div className="aspect-square overflow-hidden" style={bgStyle}>
        {photos[0] && (
          <PhotoCell
            photo={photos[0]}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(photoIndexes[0], c)}
            backgroundColor={backgroundColor}
            onConvertToImageBox={onConvertToImageBox}
          />
        )}
      </div>
    );
  }

  if (templateId === "fullMargin") {
    return (
      <div className="aspect-square overflow-hidden bg-white p-10" style={bgStyle}>
        <div className="h-full w-full overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
              backgroundColor={backgroundColor}
              onConvertToImageBox={onConvertToImageBox}
            />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "duo") {
    return (
      <div className="grid aspect-square grid-cols-2 gap-1" style={bgStyle}>
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                backgroundColor={backgroundColor}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (templateId === "trio") {
    return (
      <div className="grid aspect-square grid-rows-2 gap-1" style={bgStyle}>
        <div className="overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
              backgroundColor={backgroundColor}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[1, 2].map((i) => (
            <div key={i} className="overflow-hidden">
              {photos[i] && (
                <PhotoCell
                  photo={photos[i]}
                  requiredMinPx={requiredMinPx / 2}
                  onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                  backgroundColor={backgroundColor}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templateId === "trioText") {
    return (
      <div className="grid aspect-square grid-cols-3 items-center gap-4 bg-white p-6" style={bgStyle}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="relative aspect-square overflow-hidden">
              {photos[i] && (
                <PhotoCell
                  photo={photos[i]}
                  requiredMinPx={requiredMinPx / 3}
                  onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                  backgroundColor={backgroundColor}
                />
              )}
              {photos[i] && (
                <div className="absolute right-1 top-1 z-10">
                  <CaptionSettingsPopover
                    photo={photos[i]}
                    onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                    showPosition={false}
                  />
                </div>
              )}
            </div>
            {photos[i] && (
              <CaptionField
                photo={photos[i]}
                onCaptionChange={(v) => onCaptionChange(photoIndexes[i], v)}
                placeholder="설명"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (templateId === "quad") {
    return (
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1" style={bgStyle}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                backgroundColor={backgroundColor}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  const photo = photos[0];
  const realIndex = photoIndexes[0];

  if (!photo) return <div className="aspect-square bg-[var(--color-ivory)]" style={bgStyle} />;

  if (photo.position === "below") {
    return (
      <div className="flex aspect-square flex-col bg-[var(--color-ivory)]" style={bgStyle}>
        <div className="relative flex-1 overflow-hidden">
          <PhotoCell
            photo={photo}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(realIndex, c)}
            backgroundColor={backgroundColor}
          />
          <div className="absolute right-1 top-1 z-10">
            <CaptionSettingsPopover
              photo={photo}
              onChange={(c) => onPhotoChange(realIndex, c)}
              showPosition={true}
            />
          </div>
        </div>
        <div className="p-2">
          <CaptionField
            photo={photo}
            onCaptionChange={(v) => onCaptionChange(realIndex, v)}
            placeholder="이 사진에 짧은 설명을 적어주세요"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden bg-[var(--color-ivory)]" style={bgStyle}>
      <PhotoCell
        photo={photo}
        requiredMinPx={requiredMinPx}
        onChange={(c) => onPhotoChange(realIndex, c)}
        backgroundColor={backgroundColor}
      />
      <div className="absolute right-1 top-1 z-10">
        <CaptionSettingsPopover
          photo={photo}
          onChange={(c) => onPhotoChange(realIndex, c)}
          showPosition={true}
        />
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 px-4 ${
          photo.position === "overlayCenter" ? "top-1/2 -translate-y-1/2" : "bottom-3"
        }`}
      >
        <div className="pointer-events-auto">
          <CaptionField
            photo={photo}
            onCaptionChange={(v) => onCaptionChange(realIndex, v)}
            placeholder="설명을 적어주세요"
          />
        </div>
      </div>
    </div>
  );
}

// 편집 캔버스(표지/소개 페이지/스프레드)를 실제 사용 가능한 화면 크기에 맞춰 보여주는
// 공용 "무대"예요. 2026-09 화면 배치 개편 — 예전엔 캔버스가 그냥 남는 가로 폭을 꽉 채우고
// 세로는 그 폭에 비례해서 자동으로 정해지는 방식이라, 모니터가 넓을수록 세로가 커져서
// 화면 아래로 잘려 보이는 문제가 있었어요. 이제 이 컴포넌트가 실제로 화면에 남는 가로·세로
// 공간을 재서, 어느 방향으로도 잘리지 않게 "화면에 맞추기" 크기(zoom=1 기준)를 계산해요.
// 인쇄 규격(mm)·오브젝트 좌표(%)는 이 계산과 완전히 분리되어 있어요 — 여기서 바뀌는 건
// 딱 하나, 화면에 보여지는 크기(px)뿐이고, 안에 있는 사진·텍스트박스는 항상 그대로예요.
function CanvasStage({
  aspect,
  zoom,
  fitToken,
  className,
  children,
}: {
  aspect: number;
  zoom: number;
  // "화면에 맞추기" 버튼을 누른 횟수예요 — 이 값이 바뀔 때만 맞춤 크기를 다시 계산해요.
  // 생략하면 최초 진입 시 1번만 맞추고 그 뒤로는 전혀 다시 계산하지 않아요.
  fitToken?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 눈금자·여백 등 캔버스 바깥 자잘한 요소들을 위한 여유 공간이에요. 정확히 딱 맞추기보다,
  // 약간 여유를 둬서 어떤 경우에도 스크롤 없이 전체가 보이도록 해요.
  const SAFETY_PX = 28;

  // "화면에 맞추기" 기준 크기(zoom=1일 때의 크기)예요. 예전엔 뷰포트 크기가 바뀔 때마다
  // (ResizeObserver 콜백마다) 매번 다시 계산해서, 창 크기를 줄이거나 왼쪽 패널이
  // 열리고 닫힐 때마다 사용자가 정한 배율과 무관하게 책이 저절로 커지거나 작아졌어요
  // (2026-09-23 혜민님 지적). 이제는 "최초로 뷰포트 크기를 잴 수 있게 된 시점"에 딱
  // 한 번만 계산해서 고정하고, 그 뒤로는 fitToken이 바뀔 때(=사용자가 "화면에 맞추기"를
  // 직접 눌렀을 때)만 다시 계산해요. 그 사이 창 크기가 바뀌면 이 컨테이너의 overflow-auto가
  // 스크롤/이동으로 대응해요(자동 재배율 없음). 실제 인쇄 좌표(%)는 이 값과 전혀 무관해요
  // — 화면에 몇 px로 그려지는지만 바뀔 뿐, 원본 좌표 데이터는 손대지 않아요.
  const [baseFit, setBaseFit] = useState<{ w: number; h: number } | null>(null);
  const hasFitOnceRef = useRef(false);
  const prevFitTokenRef = useRef(fitToken);

  useEffect(() => {
    if (box.w <= 0 || box.h <= 0) return;
    const tokenChanged = fitToken !== prevFitTokenRef.current;
    if (hasFitOnceRef.current && !tokenChanged) return;
    prevFitTokenRef.current = fitToken;
    const availW = Math.max(0, box.w - SAFETY_PX * 2);
    const availH = Math.max(0, box.h - SAFETY_PX * 2);
    let fitW = availW;
    let fitH = availW / aspect;
    if (fitH > availH && availH > 0) {
      fitH = availH;
      fitW = availH * aspect;
    }
    if (fitW > 0 && fitH > 0) {
      setBaseFit({ w: fitW, h: fitH });
      hasFitOnceRef.current = true;
    }
  }, [box, aspect, fitToken]);

  const ready = !!baseFit;
  const displayW = baseFit ? baseFit.w * zoom : 0;

  return (
    <div
      ref={viewportRef}
      className={`relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto ${className ?? ""}`}
    >
      <div
        className="shrink-0"
        style={ready ? { width: `${displayW}px` } : { opacity: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productName = (searchParams.get("product") ?? "포토북") as ProductName;
  const sizeId = searchParams.get("size") ?? "";
  const quantity = searchParams.get("quantity") ?? "1";
  const templateId = searchParams.get("template") ?? "";
  const unitPrice = Number(searchParams.get("unitPrice") ?? "0");
  // 포토북 옵션 선택 화면에서 넘어온 값이에요. 주문 내역(사이즈 라벨)에 함께 담아줘요.
  const photobookCover = searchParams.get("cover") ?? "";
  const photobookCoverCoating = searchParams.get("coverCoating") ?? "";
  const photobookInnerPaper = searchParams.get("innerPaper") ?? "";
  const photobookPages = searchParams.get("pages") ?? "";
  // 하드케이스 배경색상처럼 자동으로 붙는 메모는 고객이 고치지 못하게 별도로 갖고 있어요.
  const colorNote = searchParams.get("colorNote") ?? "";
  const hasNoteFeature =
    productName === "텀블러" ||
    productName === "폰케이스" ||
    productName === "에코백" ||
    productName === "머그" ||
    productName === "캘린더" ||
    productName === "패브릭포스터";

  const config = productConfig[productName];
  const selectedSizeInfo = config.sizes.find((s) => s.id === sizeId) ?? config.sizes[1];
  const template = albumTemplates.find((t) => t.id === templateId);
  const requiredMinPx = calcRequiredMinPx(selectedSizeInfo.detail);

  // 포토북은 사이즈 외에 커버·코팅·용지·페이지 수까지 정해야 해서,
  // 주문 내역에 표시/저장되는 라벨에 그 선택 내용을 함께 담아줘요.
  const isPhotobook = productName === "포토북";
  const photobookOptionParts = isPhotobook
    ? [
        photobookCovers.find((c) => c.id === photobookCover)?.name,
        coverCoatingOptions.find((o) => o.id === photobookCoverCoating)?.name,
        innerPaperOptions.find((o) => o.id === photobookInnerPaper)?.name,
        photobookPages ? calcPagesLabel(Number(photobookPages)) : undefined,
      ].filter((v): v is string => !!v)
    : [];
  const displaySizeLabel = [selectedSizeInfo.label, ...photobookOptionParts].join(" · ");
  const displaySizeDetail = [selectedSizeInfo.detail, ...photobookOptionParts].join(" · ");

  // 옵션 단계에서 고른 내지 페이지 수예요(기본 20p). 표지 책등 폭 계산뿐 아니라,
  // 편집기 스프레드 개수도 이 값에 정확히 맞춰요(스프레드 1개 = 2페이지).
  const pages = photobookPages ? Number(photobookPages) : 20;
  const requiredSpreadCount = calcRequiredSpreadCount(pages);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const isAiAuto = isPhotobook && templateId === AI_AUTO_LAYOUT_TEMPLATE_ID;
  const [customSpreads, setCustomSpreads] = useState<SpreadDef[]>(() =>
    template
      ? template.id === AI_AUTO_LAYOUT_TEMPLATE_ID
        ? generateEmptyFreeformSpreads(requiredSpreadCount)
        : fitSpreadsToCount(template.spreads, requiredSpreadCount)
      : []
  );

  // "AI 맞춤 레이아웃"은 2026-09-24부터 칸(분할) 배정을 아예 안 해요 — 사진을 올리면
  // (handleFileSelect) 그 즉시 findAutoPhotoSlotPosition()이 정해주는 자리에 자유 배치
  // 이미지박스로 바로 들어가고, 그 뒤로는 편집메뉴에서 위치·크기를 자유롭게 조절해요
  // (박스 자리를 뒤에서 다시 계산해서 덮어쓰지 않아요 — 그래야 한 번 옮긴 사진이
  // 나중에 사진을 더 추가해도 그대로 유지돼요). "다음 사진이 몇 번째 자리에 들어갈지"는
  // 별도 state로 따로 세지 않고, 그때그때 photos.length를 기준으로 계산해요
  // (handleFileSelect의 autoPhotoBaseSlot 참고) — 화면 전환 중에 상태가 어긋날 일이 없게요.
  const [isSaving, setIsSaving] = useState(false);
  // [테스트용] 새 pdf-lib PDF 생성기 테스트 버튼 상태예요. (?pdftest=1 일 때만 노출)
  const isPdfLibTestMode = searchParams.get("pdftest") === "1";
  const [pdfLibTestState, setPdfLibTestState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; info: string } | { status: "error"; message: string }
  >({ status: "idle" });
  const [coverPdfLibTestState, setCoverPdfLibTestState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; info: string } | { status: "error"; message: string }
  >({ status: "idle" });
  // [테스트용] 책등 제목 위/아래 위치 (-1~1, 0이 정중앙). 혜민님이 화면에서 조정 가능하게 해달라고
  // 요청한 값이에요. 로고는 이 값과 무관하게 항상 책등 아래쪽 고정 위치에 들어가요.
  const [coverSpineTitleOffset, setCoverSpineTitleOffset] = useState(0);
  // 이전 단계에서 남긴 요청사항이에요. 이 페이지에서 바로 고칠 수 있어요.
  const [requestNote, setRequestNote] = useState(searchParams.get("note") ?? "");
  // 포토북 표지(앞표지 사진 + 제목)예요. 표지 종류(소프트/하드)는 이전 단계에서 이미
  // 골랐고, 여기서는 표지에 들어갈 사진과 제목만 정해요.
  const [coverPhoto, setCoverPhoto] = useState<Photo | null>(null);
  const [coverTitle, setCoverTitle] = useState("");
  // 책등(세네카) 제목은 따로 없어요 — 앞표지 제목을 그대로 책등에도 써요(혜민님 확인,
  // 2026-09: 표지 제목이 곧 책등 제목이라 입력칸을 두 개 둘 필요가 없음).
  // 표지 제목 글자 크기(pt, 실제 인쇄 크기 그대로) · 행간 · 자간이에요. 화면에서
  // pt 단위로 직접 지정하고, 실제 인쇄 파일에도 그대로 반영돼요.
  const [coverTitleFontSizePt, setCoverTitleFontSizePt] = useState(36);
  const [coverTitleLineHeightEm, setCoverTitleLineHeightEm] = useState(1.2);
  const [coverTitleLetterSpacingEm, setCoverTitleLetterSpacingEm] = useState(0);
  // 표지 제목 위치예요(앞표지 칸 전체를 100%로 보는 퍼센트). 기존엔 하단에 고정이었는데,
  // 이제 텍스트박스처럼 끌어서 옮길 수 있어요 — 기본값은 예전 고정 위치(하단 중앙)와
  // 비슷한 자리예요.
  const [coverTitleXPct, setCoverTitleXPct] = useState(8);
  const [coverTitleYPct, setCoverTitleYPct] = useState(84);
  const coverTitleWidthPct = 84;
  // 책등 텍스트박스예요. 가로폭은 책등 폭에 항상 맞춰지도록 고정이고(따로 조절 안 해요),
  // 세로 위치·높이만 화면에서 끌어서 바꿀 수 있어요(일러스트레이터 텍스트박스처럼요).
  const [spineTitleYPct, setSpineTitleYPct] = useState<number | null>(null); // null = 아직 직접 옮기지 않음 → 기본값(위에서 25mm)을 화면에서 계산해서 보여줘요
  const [spineTitleHeightPct, setSpineTitleHeightPct] = useState(50); // 12pt 최소 크기가 여유있게 들어가도록 기본 높이를 늘렸어요(로고 자리와는 안 겹쳐요).
  // 책등 제목 크기(pt)·서체 — 표지 제목과 별도로 고를 수 있어요. 비워두면(null) 책등
  // 폭에 맞춰 자동으로 크기를 정해요.
  const [spineTitleFontSizePt, setSpineTitleFontSizePt] = useState<number | null>(null);
  const [spineTitleFontFamily, setSpineTitleFontFamily] = useState(fontOptions[0].id);
  // 표지 제목 서체예요. 캡션 서체 선택지(fontOptions)와 같은 목록을 그대로 써요.
  const [coverTitleFontFamily, setCoverTitleFontFamily] = useState(fontOptions[0].id);
  // 뒤표지예요 — 무지(흰 배경)로 비워두지 않고, 기본으로 키픽 로고를 가운데에 배치해요.
  // "사진"을 고르면 작은 사진을 대신 넣을 수 있고, 배경색도 내지처럼 자유롭게 바꿀 수 있어요.
  const [backCoverMode, setBackCoverMode] = useState<"logo" | "photo">("logo");
  const [backCoverPhoto, setBackCoverPhoto] = useState<Photo | null>(null);
  const [backCoverBackgroundColor, setBackCoverBackgroundColor] = useState<string | undefined>(undefined);
  // 뒤표지도 내지처럼 그래픽·패턴·텍스처 배경과 자유 배치 텍스트박스를 넣을 수 있어요.
  const [backCoverPatternId, setBackCoverPatternId] = useState<string | undefined>(undefined);
  const [backCoverTextBoxes, setBackCoverTextBoxes] = useState<TextBoxDef[]>([]);
  // 책등·앞표지 배경색이에요. 뒤표지와 마찬가지로 지정 안 하면 기존 기본색(책등은 아이보리,
  // 앞표지는 흰색) 그대로예요. 세 곳 모두 따로 고를 수도, 아래 "배경색" 팔레트에서 한 번에
  // 세트로 맞출 수도 있어요.
  const [coverSpineBackgroundColor, setCoverSpineBackgroundColor] = useState<string | undefined>(undefined);
  const [coverFrontBackgroundColor, setCoverFrontBackgroundColor] = useState<string | undefined>(undefined);
  // 표지 앞면에 자유롭게 배치하는 텍스트박스예요(제목과는 별개예요).
  const [coverTextBoxes, setCoverTextBoxes] = useState<TextBoxDef[]>([]);
  const [isGeneratingPrintFiles, setIsGeneratingPrintFiles] = useState(false);
  // "마지막 소개 페이지"(발행 정보)예요. 발행일은 최초 생성 시 한국 날짜로 한 번만
  // 정하고(아래 useEffect), 그 뒤로는 다시 열거나 PDF를 저장해도 자동으로 바뀌지
  // 않아요 — 혜민님/사용자가 직접 고치기 전까지는요. 만든이는 비어 있으면 인쇄 시
  // "신규 작성자"를 기본값으로 써요.
  const [introPublishDate, setIntroPublishDate] = useState("");
  const [introMakerName, setIntroMakerName] = useState("");

  // "마지막 소개 페이지"의 발행일 기본값도 마운트된 뒤(브라우저에서만) 한 번만 오늘
  // 날짜로 채워요. 이미 값이 있으면(다시 방문 등) 그대로 둬서, 사용자가 고친 값이나
  // 예전에 정해진 최초 생성일이 자동으로 바뀌지 않게 해요.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntroPublishDate((prev) => (prev ? prev : formatKoreanDate(new Date())));
  }, []);

  // 앞표지 제목을 입력하면 책등 제목도 자동으로 같이 채워요. 단, 사용자가 책등 제목을
  function handleCoverTitleChange(value: string) {
    setCoverTitle(value);
  }
  // 지금 화면 오른쪽 큰 미리보기에 어떤 페이지를 보여줄지예요.
  // "cover"면 표지(뒤표지-세네카-앞표지)를, 숫자면 그 번째 스프레드를 보여줘요.
  const [selectedPageKey, setSelectedPageKey] = useState<"cover" | "intro" | number>(
    isPhotobook ? "cover" : 0
  );
  // 하단 페이지 목록의 이전·다음 이동, 페이지 번호 표시용 — 표지 → 스프레드들 → 소개
  // 페이지 순서예요(포토북이 아니면 표지·소개 페이지가 없어서 스프레드만 있어요).
  const pageOrder = useMemo<("cover" | "intro" | number)[]>(() => {
    const spreadKeys = customSpreads.map((_, i) => i);
    return isPhotobook ? (["cover", ...spreadKeys, "intro"] as ("cover" | "intro" | number)[]) : spreadKeys;
  }, [isPhotobook, customSpreads]);
  // "전체 사진 목록" 펼침 패널의 현재 페이지(0부터 시작, PHOTO_GRID_PAGE_SIZE장씩)예요.
  const [photoGridPage, setPhotoGridPage] = useState(0);
  // 내지 배경 꾸미기 탭(단색/그래픽/패턴/텍스처) — 모든 스프레드가 같은 탭을 공유해요.
  const [backgroundTab, setBackgroundTab] = useState<"solid" | BackgroundPatternCategory>("solid");
  // "미리보기"(보기만) / "편집"(실제 수정 가능) 두 화면을 분리해요. 페이지를 새로 고를
  // 때마다 항상 미리보기부터 보여주고, 미리보기 위에 마우스를 올리면 "편집하기"가 뜨고
  // 그걸 눌러야 편집 화면으로 들어가요. (useEffect 대신 렌더 중 비교 — React가 권장하는
  // "prop이 바뀌면 상태 리셋" 패턴이에요, 불필요한 리렌더를 한 번 줄여줘요)
  const [editorModeState, setEditorModeState] = useState<{
    forPageKey: typeof selectedPageKey;
    mode: "preview" | "edit";
  }>({ forPageKey: selectedPageKey, mode: "preview" });
  // 렌더 중에 selectedPageKey가 바뀐 걸 감지해서 같은 렌더에서 바로 미리보기로
  // 되돌려요(리렌더 한 번을 줄이는, ref 변형 없이 안전한 방식이에요).
  const editorMode = editorModeState.forPageKey === selectedPageKey ? editorModeState.mode : "preview";
  function setEditorMode(mode: "preview" | "edit") {
    setEditorModeState({ forPageKey: selectedPageKey, mode });
  }
  // 편집 화면 왼쪽 아이콘 메뉴(사진/배경/표지변경/스티커/손글씨스티커/텍스트) — 어떤
  // 탭이 열려 있는지예요. 페이지를 새로 고르면 항상 "사진" 탭부터 보여줘요.
  const [activeEditTab, setActiveEditTab] = useState<EditTabId>("photo");
  // "레이아웃" 탭 상태 — 적용 범위(왼쪽/오른쪽/펼침면 전체)와 개수 필터, 그리고 사진
  // 개수가 안 맞아 적용을 막았을 때 보여줄 안내 문구예요.
  const [layoutApplyRange, setLayoutApplyRange] = useState<LayoutApplyRange>("spread");
  const [layoutCountFilter, setLayoutCountFilter] = useState<LayoutCountFilter>("auto");
  const [layoutApplyMessage, setLayoutApplyMessage] = useState<string | null>(null);
  const [activeCoverEditTab, setActiveCoverEditTab] = useState<CoverEditTabId>("photo");
  // 편집 화면에서 재단선·안전선을 겹쳐 보여줄지 여부예요. (내지 스프레드에만 적용돼요)
  // 예전엔 체크박스로 각각 켜고 끌 수 있었는데, 2026-09-19부터 항상 보이도록 고정하고
  // (체크박스 UI는 없앴어요) 대신 "인쇄 미리보기"를 켜면 전부 숨기고 재단선 안쪽만 종이
  // 처럼 확대해서 보여줘요.
  const showGuidelines = true;
  const showInnerSafetyGuide = true;
  const showInnerBindingGuide = true;
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  // 표지 편집 화면 전용 안내선 켜기/끄기예요(뒤표지·책등·앞표지를 하나의 펼침면으로 보고
  // 계산해요 — 도련선/재단선은 펼침면 전체 기준, 안전영역은 뒤표지·책등·앞표지 각각 기준,
  // 책등 경계는 접힘 위치 전용 안내선이에요). 네 가지를 따로 켜고 끌 수 있어요.

  async function handleCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setCoverPhoto({
        url,
        caption: "",
        x: 0,
        y: 0,
        scale: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fontFamily: fontOptions[0].id,
        size: "base",
        bold: false,
        color: "#2B2B2B",
        align: "center",
        position: "below",
        containerW: 0,
        containerH: 0,
        rotation: 0,
        flipX: false,
      });
    };
    img.src = url;
  }

  // 뒤표지에 "사진" 모드일 때 넣을 작은 이미지를 골라요. (표지 앞면 사진과는 별개예요)
  async function handleBackCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setBackCoverPhoto({
        url,
        caption: "",
        x: 0,
        y: 0,
        scale: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fontFamily: fontOptions[0].id,
        size: "base",
        bold: false,
        color: "#2B2B2B",
        align: "center",
        position: "below",
        containerW: 0,
        containerH: 0,
        rotation: 0,
        flipX: false,
      });
    };
    img.src = url;
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    // "AI 맞춤 레이아웃"에서 이번에 새로 올리는 사진들이 자유 배치 이미지박스로 들어갈
    // 자리를 정하는 기준이에요. 별도 카운터 state 대신 photos.length를 그대로 써요 —
    // 사진 목록은 항상 뒤에 이어붙이는 방식(prev => [...prev, ...newPhotos])이라, "지금
    // 몇 번째 사진부터 새로 추가되는지"가 곧 지금 이 순간의 photos.length예요.
    const autoPhotoBaseSlot = photos.length;

    const newPhotosPromises = Array.from(files).map((file) => {
      return new Promise<Photo>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          resolve({
            url,
            caption: "",
            x: 0,
            y: 0,
            scale: 1,
            width: img.naturalWidth,
            height: img.naturalHeight,
            fontFamily: fontOptions[0].id,
            size: "sm",
            bold: false,
            color: "#2B2B2B",
            align: "left",
            position: "below",
            containerW: 0,
            containerH: 0,
            rotation: 0,
            flipX: false,
          });
        };
        img.src = url;
      });
    });

    const newPhotos = await Promise.all(newPhotosPromises);
    setPhotos((prev) => [...prev, ...newPhotos]);

    // 표지 사진을 아직 안 골랐으면, 처음 올린 사진을 표지 앞면에 자동으로 배치해요.
    // (직접 고른 표지 사진이 있으면 건드리지 않고, "표지 사진 바꾸기"로 언제든 바꿀 수 있어요.)
    setCoverPhoto((prev) => {
      if (prev) return prev;
      const first = newPhotos[0];
      if (!first) return prev;
      return { ...first, caption: "", size: "base", align: "center", position: "below" };
    });

    // "AI 맞춤 레이아웃"이면 방금 올린 사진들을 곧바로 자유 배치 이미지박스로 넣어요
    // (분할 메뉴 없이, 편집메뉴에서 바로 위치·크기를 조절할 수 있게). 이미 놓인 다른
    // 박스들은 건드리지 않고, 다음 빈 자리부터 순서대로 채워요.
    if (isAiAuto) {
      setCustomSpreads((prevSpreads) => {
        let spreads = prevSpreads;
        newPhotos.forEach((p, k) => {
          const slot = autoPhotoBaseSlot + k;
          const pos = findAutoPhotoSlotPosition(slot, requiredSpreadCount);
          const box: ImageBoxDef = {
            id: crypto.randomUUID(),
            url: p.url,
            naturalWidth: p.width || 1,
            naturalHeight: p.height || 1,
            xPct: pos.overflow ? 25 + ((slot * 7) % 30) : pos.side === "left" ? 0 : 50,
            yPct: pos.overflow ? 25 + ((slot * 11) % 30) : 0,
            widthPct: pos.overflow ? 40 : 50,
            heightPct: pos.overflow ? 40 : 100,
            innerOffsetXPct: 0,
            innerOffsetYPct: 0,
            innerScale: 1,
          };
          spreads = spreads.map((s2, i) =>
            i === pos.spreadIndex
              ? {
                  ...s2,
                  imageBoxes: [...(s2.imageBoxes ?? []), box],
                  imageBoxOrder: [...getSpreadImageBoxOrder(s2), box.id],
                }
              : s2
          );
        });
        return spreads;
      });
    }
  }

  function handleCaptionChange(photoIndex: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => (i === photoIndex ? { ...p, caption: value } : p)));
  }

  function handlePhotoTransform(index: number, changes: Partial<Photo>) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function handleRemovePhoto(index: number) {
    // "AI 맞춤 레이아웃"에서는 사진이 곧 자유 배치 이미지박스라서, 목록에서 지우면
    // 스프레드에 놓인 그 박스도 같이 지워요(url로 짝을 찾아요 — 사진마다 고유해요).
    if (isAiAuto) {
      const removedUrl = photos[index]?.url;
      if (removedUrl) {
        setCustomSpreads((prev) =>
          prev.map((s) => {
            const removedIds = (s.imageBoxes ?? []).filter((b) => b.url === removedUrl).map((b) => b.id);
            if (removedIds.length === 0) return s;
            const removedIdSet = new Set(removedIds);
            return {
              ...s,
              imageBoxes: (s.imageBoxes ?? []).filter((b) => !removedIdSet.has(b.id)),
              imageBoxOrder: getSpreadImageBoxOrder(s).filter((id) => !removedIdSet.has(id)),
            };
          })
        );
      }
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleChangeLayout(
    spreadIndex: number,
    side: "left" | "right",
    newId: PageTemplateId
  ) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [side]: newId } : s))
    );
  }

  // 스프레드(왼쪽+오른쪽 펼침면) 배경색을 바꿔요. color가 undefined면 기본값(흰색)으로 되돌려요.
  // 단색 배경을 골라요. 그래픽·패턴·텍스처(backgroundPattern)와는 하나만 고를 수 있어서,
  // 단색을 고르면 그쪽은 자동으로 해제돼요.
  function handleChangeBackground(spreadIndex: number, color: string | undefined) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => {
        if (i !== spreadIndex) return s;
        const next = { ...s };
        if (color) {
          next.backgroundColor = color;
        } else {
          delete next.backgroundColor;
        }
        delete next.backgroundPattern;
        return next;
      })
    );
  }

  // 그래픽·패턴·텍스처 배경을 골라요. 단색 배경(backgroundColor)과는 하나만 고를 수
  // 있어서, 패턴을 고르면 단색은 자동으로 해제돼요. patternId가 undefined면 해제예요.
  function handleChangePattern(spreadIndex: number, patternId: string | undefined) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => {
        if (i !== spreadIndex) return s;
        const next = { ...s };
        if (patternId) {
          next.backgroundPattern = patternId;
        } else {
          delete next.backgroundPattern;
        }
        delete next.backgroundColor;
        return next;
      })
    );
  }

  // 새 텍스트박스 하나를 기본값으로 만들어요(항상 페이지 가운데 근처, 기본 서체/검정 글자).
  function makeTextBox(): TextBoxDef {
    return {
      id: crypto.randomUUID(),
      text: "",
      xPct: 15,
      yPct: 42,
      widthPct: 70,
      fontFamily: fontOptions[0].id,
      fontScale: 1,
      color: "#1a1a1a",
      align: "center",
      verticalAlign: "top",
      bold: false,
    };
  }

  // 내지 페이지(스프레드 하나의 왼쪽/오른쪽 낱장)에 텍스트박스를 추가·수정·삭제해요.
  function handleAddTextBox(spreadIndex: number, side: "left" | "right") {
    const box = makeTextBox();
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [key]: [...(s[key] ?? []), box] } : s))
    );
    setActiveTextBox({ ref: { scope: "spread", spreadIndex, side }, boxId: box.id });
  }

  function handleTextBoxChange(
    spreadIndex: number,
    side: "left" | "right",
    boxId: string,
    changes: Partial<TextBoxDef>
  ) {
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, [key]: (s[key] ?? []).map((b) => (b.id === boxId ? { ...b, ...changes } : b)) }
          : s
      )
    );
  }

  function handleDeleteTextBox(spreadIndex: number, side: "left" | "right", boxId: string) {
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [key]: (s[key] ?? []).filter((b) => b.id !== boxId) } : s))
    );
  }

  // 표지 앞면 텍스트박스예요. 스프레드가 아니라서 별도 state(coverTextBoxes)로 따로 관리해요.
  function handleAddCoverTextBox() {
    const box = makeTextBox();
    setCoverTextBoxes((prev) => [...prev, box]);
    setActiveTextBox({ ref: { scope: "cover" }, boxId: box.id });
  }

  function handleCoverTextBoxChange(boxId: string, changes: Partial<TextBoxDef>) {
    setCoverTextBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteCoverTextBox(boxId: string) {
    setCoverTextBoxes((prev) => prev.filter((b) => b.id !== boxId));
  }

  // 뒤표지 텍스트박스예요. 표지 앞면(coverTextBoxes)과 같은 방식으로, 별도 state로
  // 관리해요.
  function handleAddBackCoverTextBox() {
    const box = makeTextBox();
    setBackCoverTextBoxes((prev) => [...prev, box]);
    setActiveTextBox({ ref: { scope: "backCover" }, boxId: box.id });
  }

  function handleBackCoverTextBoxChange(boxId: string, changes: Partial<TextBoxDef>) {
    setBackCoverTextBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteBackCoverTextBox(boxId: string) {
    setBackCoverTextBoxes((prev) => prev.filter((b) => b.id !== boxId));
  }

  // 지금 선택된 텍스트박스가 어디(표지 앞면·뒤표지인지, 어느 스프레드의 왼쪽/오른쪽
  // 낱장인지) 있는지 가리켜요. 상단 툴바(TextBoxToolbar)가 이 값 하나만 보고 어떤
  // 텍스트박스를 고치는지 알 수 있게 해요.
  const [activeTextBox, setActiveTextBox] = useState<{ ref: TextBoxRef; boxId: string } | null>(null);

  function getTextBoxesForRef(ref: TextBoxRef): TextBoxDef[] {
    if (ref.scope === "cover") return coverTextBoxes;
    if (ref.scope === "backCover") return backCoverTextBoxes;
    const spread = customSpreads[ref.spreadIndex];
    if (!spread) return [];
    return (ref.side === "left" ? spread.textBoxesLeft : spread.textBoxesRight) ?? [];
  }

  function updateTextBoxByRef(ref: TextBoxRef, boxId: string, changes: Partial<TextBoxDef>) {
    if (ref.scope === "cover") handleCoverTextBoxChange(boxId, changes);
    else if (ref.scope === "backCover") handleBackCoverTextBoxChange(boxId, changes);
    else handleTextBoxChange(ref.spreadIndex, ref.side, boxId, changes);
  }

  function deleteTextBoxByRef(ref: TextBoxRef, boxId: string) {
    if (ref.scope === "cover") handleDeleteCoverTextBox(boxId);
    else if (ref.scope === "backCover") handleDeleteBackCoverTextBox(boxId);
    else handleDeleteTextBox(ref.spreadIndex, ref.side, boxId);
    setActiveTextBox(null);
  }

  const activeTextBoxDef: TextBoxDef | null = activeTextBox
    ? getTextBoxesForRef(activeTextBox.ref).find((b) => b.id === activeTextBox.boxId) ?? null
    : null;

  // ---- 자유 배치 이미지박스(스프레드 전체 기준) ----
  // 지금 선택된 이미지박스가 어느 스프레드에 있는지 가리켜요.
  const [activeImageBox, setActiveImageBox] = useState<{ spreadIndex: number; boxId: string } | null>(null);
  // 지금 "선택된" 이미지박스가 사진 위치 조정 모드(더블클릭으로 들어가는 모드)인지예요.
  // 왼쪽 "사진" 편집 메뉴에 조작 버튼(확대/축소/반전/초기화/완료)을 보여줄지 결정하는 데
  // 써요(2026-09-22 추가) — 박스를 새로 선택할 때마다 항상 false로 시작해요(더블클릭
  // 해야만 다시 true가 됨, ImageBoxOverlay와 동일한 "항상 박스 모드로 시작" 규칙).
  const [imageBoxPhotoEditActive, setImageBoxPhotoEditActive] = useState(false);
  // 왼쪽 메뉴 버튼이 실제 박스 컴포넌트의 확대/축소/반전/초기화/완료 동작을 그대로
  // 호출할 수 있도록, 박스 id → 핸들 맵을 들고 있어요.
  const imageBoxHandlesRef = useRef<Map<string, ImageBoxOverlayHandle>>(new Map());

  // 사진 파일이든 스티커든 결국 "이미지박스 하나 추가"라 로직을 공유해요 — url과
  // 기본 크기(widthPct)만 다르게 넘겨요.
  function handleAddImageBoxFromUrl(spreadIndex: number, url: string, widthPct: number) {
    const img = new window.Image();
    img.onload = () => {
      // 스프레드 전체 폭이 페이지(정사각형) 두 배라서, 가로 %와 세로 %의 실제 축척이
      // 2:1이에요 — 새 이미지박스도 처음부터 원본 비율 그대로 보이도록 계산해요.
      // naturalWidth/naturalHeight를 못 읽어오는 경우(예: width/height 속성이 없는
      // SVG 등)에 0으로 나눠서 NaN이 되는 걸 막아요 — NaN이 되면 박스가 화면에 아예
      // 안 보이거나 편집기 전체가 멈추는 문제로 이어질 수 있어서, 이럴 땐 정사각형
      // (1:1)으로 안전하게 대체해요.
      const naturalWidth = img.naturalWidth || 1;
      const naturalHeight = img.naturalHeight || naturalWidth;
      const heightPct = 2 * widthPct * (naturalHeight / naturalWidth);
      // 스프레드 1(spreadIndex === 0)은 왼쪽 면이 인쇄 안 되는 표지 안쪽 면이라, 오른쪽
      // 페이지(1페이지) 안쪽에만 들어오도록 기본 위치를 오른쪽 절반(50~100%)으로 옮겨요.
      // 다른 스프레드는 기존처럼 펼침면 정중앙에 걸치도록 둬요.
      const xPct = spreadIndex === 0 ? Math.max(50, 100 - widthPct - 7) : 32;
      const yPct = 25;
      // 새로 만들 때는 박스(틀) 크기 자체가 이미 사진 비율과 정확히 일치하도록 계산했으니
      // (heightPct 계산식 참고), 확대/위치는 기본값(꽉 채움, 이동 없음)으로 시작해요 —
      // 이후 박스 크기를 자유롭게 조절해도 사진은 항상 박스를 빈틈없이 꽉 채워요
      // ("이미지를 불러올 때 꽉 채워지는 비율이 기본", 2026-09-22 확인).
      const box: ImageBoxDef = {
        id: crypto.randomUUID(),
        url,
        naturalWidth,
        naturalHeight,
        xPct,
        yPct,
        widthPct,
        heightPct,
        innerOffsetXPct: 0,
        innerOffsetYPct: 0,
        innerScale: 1,
      };
      setCustomSpreads((prev) =>
        prev.map((s, i) =>
          i === spreadIndex
            ? {
                ...s,
                imageBoxes: [...(s.imageBoxes ?? []), box],
                imageBoxOrder: [...getSpreadImageBoxOrder(s), box.id],
              }
            : s
        )
      );
      setActiveImageBox({ spreadIndex, boxId: box.id });
    };
    img.src = url;
  }

  function handleAddImageBox(spreadIndex: number, file: File) {
    const url = URL.createObjectURL(file);
    handleAddImageBoxFromUrl(spreadIndex, url, 36);
  }

  // "사진 1장(꽉 참/여백)" 페이지의 사진을 자유 배치 이미지박스로 전환해요(2026-09-22
  // 추가). 그 페이지 템플릿을 사진을 자동 배정받지 않는 "freeform"으로 바꾸고, 사진을
  // 원래 있던 자리(그 페이지 절반 영역)에 꼭 맞는 이미지박스로 새로 만들어요 — 그 뒤엔
  // 이미지박스이므로 자유롭게 끌어서 페이지 경계(책 가운데)를 넘나들 수 있어요. 원래
  // 사진은 전체 사진 목록(photos)에서도 함께 빼요 — 그래야 순서대로 자동 배정되는 다른
  // 페이지들의 사진이 밀리지 않고 그대로 유지돼요(이 페이지가 "사진 0장" 취급되면서
  // 정확히 사진 1장·자리 1칸이 함께 빠지는 셈이라 계산이 맞아떨어져요).
  function handleConvertPhotoToImageBox(spreadIndex: number, side: "left" | "right", realIndex: number) {
    const photo = photos[realIndex];
    if (!photo) return;
    const boxId = crypto.randomUUID();
    const box: ImageBoxDef = {
      id: boxId,
      url: photo.url,
      naturalWidth: photo.width || 1,
      naturalHeight: photo.height || 1,
      // 스프레드 전체 폭 기준 좌표라서, 원래 있던 자리(왼쪽 페이지=0~50%, 오른쪽
      // 페이지=50~100%)를 그대로 채우도록 잡아요 — 전환 직후엔 화면상 변화가 없고, 그
      // 다음부터 자유롭게 옮기고 크기를 바꿀 수 있어요.
      xPct: side === "left" ? 0 : 50,
      yPct: 0,
      widthPct: 50,
      heightPct: 100,
      innerOffsetXPct: 0,
      innerOffsetYPct: 0,
      innerScale: 1,
    };
    const key = side === "left" ? "left" : "right";
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? {
              ...s,
              [key]: "freeform",
              imageBoxes: [...(s.imageBoxes ?? []), box],
              imageBoxOrder: [...getSpreadImageBoxOrder(s), box.id],
            }
          : s
      )
    );
    handleRemovePhoto(realIndex);
    setActiveTextBox(null);
    setActiveImageBox({ spreadIndex, boxId });
  }

  function handleAddSticker(spreadIndex: number, stickerUrl: string) {
    handleAddImageBoxFromUrl(spreadIndex, stickerUrl, 14);
  }

  function handleImageBoxChange(spreadIndex: number, boxId: string, changes: Partial<ImageBoxDef>) {
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, imageBoxes: (s.imageBoxes ?? []).map((b) => (b.id === boxId ? { ...b, ...changes } : b)) }
          : s
      )
    );
  }

  // 이미지박스가 스프레드에서 "왼쪽 페이지"인지 "오른쪽 페이지"인지 — 박스 가로 중심
  // 좌표(스프레드 0~100 기준) 50%를 기준으로 나눠요. 레이아웃 템플릿 적용 범위 계산과
  // "이 스프레드에 사진이 몇 장 있는지" 세는 데 같이 써요.
  function imageBoxSide(box: ImageBoxDef): "left" | "right" {
    return box.xPct + box.widthPct / 2 < 50 ? "left" : "right";
  }

  // 레이아웃 템플릿을 적용할 범위(왼쪽/오른쪽/펼침면 전체)에 지금 놓여 있는 이미지박스만
  // 골라내요.
  function imageBoxesInRange(boxes: ImageBoxDef[], range: LayoutApplyRange): ImageBoxDef[] {
    if (range === "spread") return boxes;
    return boxes.filter((b) => imageBoxSide(b) === range);
  }

  // 처음 템플릿을 적용할 때(또는 아직 순서가 저장 안 돼 있을 때) "왼쪽→오른쪽, 위→아래"
  // 읽는 순서로 슬롯을 배정하는 데 쓰는 기본 정렬이에요. 이후엔 이 정렬 결과가 아니라
  // spread.imageBoxOrder에 저장된 순서를 그대로 재사용해요(아래 getSpreadImageBoxOrder).
  function sortImageBoxesReadingOrder(boxes: ImageBoxDef[]): ImageBoxDef[] {
    return [...boxes].sort((a, b) => {
      const rowA = Math.round((a.yPct + a.heightPct / 2) / 8);
      const rowB = Math.round((b.yPct + b.heightPct / 2) / 8);
      if (rowA !== rowB) return rowA - rowB;
      return a.xPct - b.xPct;
    });
  }

  // 스프레드의 "저장된 읽는 순서"(imageBoxOrder)를 돌려줘요. 아직 한 번도 저장된 적
  // 없는 스프레드(과거 데이터, 또는 아직 레이아웃 템플릿을 적용한 적 없는 스프레드)는
  // 읽는 순서로 한 번 계산해서 그 결과를 써요(최초 부트스트랩). 저장된 순서가 있지만
  // 그 뒤 사진이 추가/삭제돼서 목록과 안 맞을 수도 있으니, 지금 실제 있는 박스만
  // 걸러내고, 순서 목록에 없는(새로 생긴) 박스는 읽는 순서로 보정해서 끝에 붙여요.
  function getSpreadImageBoxOrder(spread: SpreadDef): string[] {
    const boxes = spread.imageBoxes ?? [];
    const boxIds = new Set(boxes.map((b) => b.id));
    const saved = (spread.imageBoxOrder ?? []).filter((id) => boxIds.has(id));
    const savedSet = new Set(saved);
    const missing = boxes.filter((b) => !savedSet.has(b.id));
    const missingOrdered = sortImageBoxesReadingOrder(missing).map((b) => b.id);
    return [...saved, ...missingOrdered];
  }

  // 레이아웃 템플릿을 적용해요 — 선택한 범위(왼쪽/오른쪽/펼침면)에 있는 이미지박스들의
  // 위치·크기만 템플릿이 정한 자리로 옮기고, 그 사진 자체(url·회전·반전·박스 안 사진
  // 위치)와 반대쪽 범위의 박스, 텍스트·스티커·배경은 전혀 안 건드려요. 슬롯 배정 순서는
  // 매번 새로 계산하지 않고 스프레드에 저장된 imageBoxOrder를 그대로 재사용해서, 비대칭
  // 배치나 수동 드래그 뒤에 템플릿을 바꿔도 사진 순서가 흐트러지지 않아요.
  function applyLayoutTemplate(spreadIndex: number, range: LayoutApplyRange, template: PhotoLayoutTemplate) {
    const spread = customSpreads[spreadIndex];
    if (!spread) return;
    const allBoxes = spread.imageBoxes ?? [];
    const inRange = imageBoxesInRange(allBoxes, range);
    if (inRange.length !== template.photoCount) {
      setLayoutApplyMessage(
        `이 템플릿은 사진 ${template.photoCount}장이 필요해요 (지금 이 범위엔 ${inRange.length}장 있어요).`
      );
      return;
    }
    setLayoutApplyMessage(null);
    const outOfRange = allBoxes.filter((b) => !inRange.includes(b));
    const fullOrder = getSpreadImageBoxOrder(spread);
    const inRangeById = new Map(inRange.map((b) => [b.id, b] as const));
    const ordered = fullOrder.filter((id) => inRangeById.has(id)).map((id) => inRangeById.get(id)!);
    const updated = ordered.map((box, idx) => {
      const slot = template.slots[idx];
      const { xPct, widthPct } = slotToSpreadCoords(slot, range);
      return { ...box, xPct, widthPct, yPct: slot.yPct, heightPct: slot.heightPct };
    });
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, imageBoxes: [...outOfRange, ...updated], imageBoxOrder: fullOrder }
          : s
      )
    );
  }

  function handleDeleteImageBox(spreadIndex: number, boxId: string) {
    // "AI 맞춤 레이아웃"에서 박스 자체의 ✕ 버튼으로 지울 때도, 반대 방향으로
    // "전체 사진 목록"의 사진 목록이 계속 남아있지 않도록 짝이 되는 사진도 같이 지워요.
    if (isAiAuto) {
      const removedUrl = customSpreads[spreadIndex]?.imageBoxes?.find((b) => b.id === boxId)?.url;
      if (removedUrl) {
        setPhotos((prev) => prev.filter((p) => p.url !== removedUrl));
      }
    }
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? {
              ...s,
              imageBoxes: (s.imageBoxes ?? []).filter((b) => b.id !== boxId),
              imageBoxOrder: getSpreadImageBoxOrder(s).filter((id) => id !== boxId),
            }
          : s
      )
    );
    setActiveImageBox(null);
  }

  // ---- 편집기 단축키: 실행취소/다시실행, 복사/붙여넣기, 확대·축소 ----
  // 실행취소는 "지금까지 편집한 내용(사진 배치, 텍스트, 배경 등)" 전체를 하나의 스냅샷으로
  // 찍어뒀다가 되돌리는 방식이에요(필드 하나하나를 따로 추적하지 않아요). 스냅샷에는
  // 인쇄에 실제로 들어가는 내용만 담고, 화면 전용 설정(가이드선 표시 여부, 확대 배율,
  // 현재 보고 있는 페이지 등)은 담지 않아요 — 그런 것까지 되돌리면 오히려 헷갈려요.
  const [canvasZoom, setCanvasZoom] = useState(1);
  // 편집 영역 높이는 이제(2026-09-23) 상단바 높이를 JS로 재서 calc()로 빼는 방식 대신,
  // <main>을 뷰포트 높이(h-dvh)에 고정하고 그 안을 flex 레이아웃으로 나누는 구조로
  // 바꿨어요(음수 마진이나 수동 높이 계산 없이, 상단바는 shrink-0, 편집 영역은
  // flex-1로 자동으로 남은 공간을 채움) — 그래서 이 높이 측정용 ref/state는 더 이상
  // 필요 없어서 지웠어요.
  // "화면에 맞추기"를 몇 번 눌렀는지 세는 값이에요 — CanvasStage는 이 값이 바뀔 때만
  // 맞춤 크기를 다시 계산해요(최초 진입 시 1회 + 사용자가 버튼을 누를 때만, 창 크기가
  // 저절로 바뀌었다고 배율이 따라 바뀌지 않도록, 2026-09-23 요청).
  const [canvasFitToken, setCanvasFitToken] = useState(0);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringHistoryRef = useRef(false);
  const lastHistorySnapshotRef = useRef<string | null>(null);
  // 드래그·리사이즈처럼 짧은 시간에 onChange가 여러 번(마우스무브마다) 연달아 일어나는
  // 동작을 "실행취소 한 번"으로 묶어주는 디바운스예요(2026-09-19, 혜민님 확인 — 예전엔
  // 마우스무브 한 번마다 스냅샷이 쌓여서 Ctrl+Z를 눌러도 찔끔찔끔씩만 되돌아갔어요).
  // burstBaseSnapshotRef = 지금 이어지고 있는 변화가 "시작되기 전" 상태 — 변화가
  // 멈춘 뒤 HISTORY_DEBOUNCE_MS 동안 조용하면 그 시작 시점 스냅샷 하나만 실행취소
  // 스택에 쌓아요.
  const burstBaseSnapshotRef = useRef<string | null>(null);
  const historyDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_DEBOUNCE_MS = 500;
  const copiedTextBoxRef = useRef<TextBoxDef | null>(null);
  const HISTORY_LIMIT = 60;

  // 디바운스 중(=아직 실행취소 스택에 안 쌓인) 변화가 있으면 지금 바로 하나로 묶어
  // 쌓아요. 실행취소/다시실행 직전에 반드시 불러야, 방금 끝낸 동작이 통째로 한 단계로
  // 잡혀요(안 그러면 타이머가 나중에 따로 쌓여서 순서가 엉켜요).
  function flushPendingHistoryBurst() {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (burstBaseSnapshotRef.current !== null) {
      undoStackRef.current.push(burstBaseSnapshotRef.current);
      if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
      redoStackRef.current = [];
      burstBaseSnapshotRef.current = null;
    }
  }

  function buildHistorySnapshot() {
    return JSON.stringify({
      customSpreads,
      coverPhoto,
      coverTitle,
      coverTitleFontSizePt,
      coverTitleLineHeightEm,
      coverTitleLetterSpacingEm,
      coverTitleXPct,
      coverTitleYPct,
      coverTitleFontFamily,
      spineTitleYPct,
      spineTitleHeightPct,
      spineTitleFontSizePt,
      spineTitleFontFamily,
      backCoverMode,
      backCoverPhoto,
      backCoverBackgroundColor,
      backCoverPatternId,
      backCoverTextBoxes,
      coverSpineBackgroundColor,
      coverFrontBackgroundColor,
      coverTextBoxes,
    });
  }

  function restoreHistorySnapshot(snapshotJson: string) {
    const s = JSON.parse(snapshotJson);
    isRestoringHistoryRef.current = true;
    setCustomSpreads(s.customSpreads);
    setCoverPhoto(s.coverPhoto);
    setCoverTitle(s.coverTitle);
    setCoverTitleFontSizePt(s.coverTitleFontSizePt ?? 36);
    setCoverTitleLineHeightEm(s.coverTitleLineHeightEm ?? 1.2);
    setCoverTitleLetterSpacingEm(s.coverTitleLetterSpacingEm ?? 0);
    setCoverTitleXPct(s.coverTitleXPct);
    setCoverTitleYPct(s.coverTitleYPct);
    setCoverTitleFontFamily(s.coverTitleFontFamily);
    setSpineTitleYPct(s.spineTitleYPct ?? null);
    setSpineTitleHeightPct(s.spineTitleHeightPct);
    setSpineTitleFontSizePt(s.spineTitleFontSizePt ?? null);
    setSpineTitleFontFamily(s.spineTitleFontFamily ?? fontOptions[0].id);
    setBackCoverMode(s.backCoverMode);
    setBackCoverPhoto(s.backCoverPhoto);
    setBackCoverBackgroundColor(s.backCoverBackgroundColor);
    setBackCoverPatternId(s.backCoverPatternId);
    setBackCoverTextBoxes(s.backCoverTextBoxes);
    setCoverSpineBackgroundColor(s.coverSpineBackgroundColor);
    setCoverFrontBackgroundColor(s.coverFrontBackgroundColor);
    setCoverTextBoxes(s.coverTextBoxes);
    setActiveTextBox(null);
  }

  // 매 렌더마다 지금 상태를 스냅샷으로 찍어서, 직전 스냅샷과 다르면(=혜민님이 뭔가
  // 바꿨으면) 직전 스냅샷을 실행취소 스택에 쌓아요. 되돌리기/다시하기로 인한 변경은
  // isRestoringHistoryRef로 표시해서 다시 쌓지 않아요.
  useEffect(() => {
    const snap = buildHistorySnapshot();
    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      lastHistorySnapshotRef.current = snap;
      // 되돌리기/다시실행으로 인한 변경은 새 묶음을 시작하지 않아요.
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      burstBaseSnapshotRef.current = null;
      return;
    }
    if (lastHistorySnapshotRef.current !== null && lastHistorySnapshotRef.current !== snap) {
      // 지금 이어지는 변화 묶음이 처음 시작될 때만 "시작 전" 상태를 기억해두고, 그 뒤로
      // 계속 바뀌는 동안은 타이머를 계속 미뤄요. 다 멈추면(HISTORY_DEBOUNCE_MS 동안
      // 조용) 그때 한 번만 실행취소 스택에 쌓여요 — 드래그 하나 = 실행취소 한 단계.
      if (burstBaseSnapshotRef.current === null) {
        burstBaseSnapshotRef.current = lastHistorySnapshotRef.current;
      }
      if (historyDebounceTimerRef.current) clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = setTimeout(() => {
        historyDebounceTimerRef.current = null;
        flushPendingHistoryBurst();
      }, HISTORY_DEBOUNCE_MS);
    }
    lastHistorySnapshotRef.current = snap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customSpreads,
    coverPhoto,
    coverTitle,
    coverTitleFontSizePt,
    coverTitleLineHeightEm,
    coverTitleLetterSpacingEm,
    coverTitleXPct,
    coverTitleYPct,
    coverTitleFontFamily,
    spineTitleYPct,
    spineTitleHeightPct,
    spineTitleFontSizePt,
    spineTitleFontFamily,
    backCoverMode,
    backCoverPhoto,
    backCoverBackgroundColor,
    backCoverPatternId,
    backCoverTextBoxes,
    coverSpineBackgroundColor,
    coverFrontBackgroundColor,
    coverTextBoxes,
  ]);

  function handleUndo() {
    flushPendingHistoryBurst();
    const prevSnap = undoStackRef.current.pop();
    if (prevSnap === undefined) return;
    const current = lastHistorySnapshotRef.current ?? buildHistorySnapshot();
    redoStackRef.current.push(current);
    restoreHistorySnapshot(prevSnap);
  }

  function handleRedo() {
    flushPendingHistoryBurst();
    const nextSnap = redoStackRef.current.pop();
    if (nextSnap === undefined) return;
    const current = lastHistorySnapshotRef.current ?? buildHistorySnapshot();
    undoStackRef.current.push(current);
    restoreHistorySnapshot(nextSnap);
  }

  // 텍스트박스가 표지/뒤표지/내지 중 어디 속해있는지에 상관없이 "지금 활성화된 자리에
  // 새 박스를 하나 더 넣기"를 할 수 있게 해줘요(붙여넣기용).
  function addTextBoxToRef(ref: TextBoxRef, box: TextBoxDef) {
    if (ref.scope === "cover") {
      setCoverTextBoxes((prev) => [...prev, box]);
    } else if (ref.scope === "backCover") {
      setBackCoverTextBoxes((prev) => [...prev, box]);
    } else {
      const key = ref.side === "left" ? "textBoxesLeft" : "textBoxesRight";
      setCustomSpreads((prev) =>
        prev.map((s, i) => (i === ref.spreadIndex ? { ...s, [key]: [...(s[key] ?? []), box] } : s))
      );
    }
    setActiveTextBox({ ref, boxId: box.id });
  }

  function handleCopyActiveTextBox() {
    if (!activeTextBoxDef) return;
    copiedTextBoxRef.current = activeTextBoxDef;
  }

  function handlePasteTextBox() {
    const copied = copiedTextBoxRef.current;
    if (!copied || !activeTextBox) return;
    const box: TextBoxDef = {
      ...copied,
      id: crypto.randomUUID(),
      xPct: Math.min(90, copied.xPct + 3),
      yPct: Math.min(90, copied.yPct + 3),
    };
    addTextBoxToRef(activeTextBox.ref, box);
  }

  function handleZoomIn() {
    setCanvasZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100));
  }
  function handleZoomOut() {
    setCanvasZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100));
  }
  function handleZoomReset() {
    setCanvasZoom(1);
    // 창 크기가 바뀌어도 배율을 자동으로 안 바꾸는 대신, 사용자가 이 버튼을 직접 눌렀을
    // 때만 지금 뷰포트 크기 기준으로 "화면에 맞추기"를 다시 계산해요.
    setCanvasFitToken((t) => t + 1);
  }

  // 실행취소(Ctrl/Cmd+Z), 다시실행(Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y), 텍스트박스
  // 복사·붙여넣기(Ctrl/Cmd+C/V)를 전역 단축키로 등록해요. 텍스트를 직접 입력 중일
  // 때(input·textarea)는 브라우저 기본 동작(글자 단위 실행취소 등)을 그대로 두고
  // 가로채지 않아요.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // ESC: 텍스트박스가 선택돼 있으면(글자를 입력하는 중이어도) 바로 지워요 — ESC는
      // 원래 "취소/빠져나가기" 용도라 텍스트 입력 중에 눌러도 글자가 지워질 걱정이 없어요.
      // 백스페이스는 입력 중이 아닐 때(=박스만 선택된 상태)만 지워요 — 입력 중에는 글자
      // 지우기 동작을 그대로 둬야 해요.
      if (!meta && key === "escape" && activeTextBox) {
        e.preventDefault();
        deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId);
        return;
      }
      // 이미지박스도 텍스트박스와 같은 방식으로 ESC/백스페이스로 지워요.
      if (!meta && key === "escape" && activeImageBox) {
        e.preventDefault();
        handleDeleteImageBox(activeImageBox.spreadIndex, activeImageBox.boxId);
        return;
      }
      if (!meta && key === "backspace" && !isTypingTarget(e.target)) {
        if (activeTextBox) {
          e.preventDefault();
          deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId);
        } else if (activeImageBox) {
          e.preventDefault();
          handleDeleteImageBox(activeImageBox.spreadIndex, activeImageBox.boxId);
        }
        return;
      }

      if (!meta) return;
      if (isTypingTarget(e.target)) {
        // 텍스트박스 안에서도 "붙여넣기"는 박스 자체를 복제하는 우리 기능과 헷갈릴 수
        // 있어서, 실행취소/다시실행만 브라우저 기본값에 맡기고 나머지는 건드리지 않아요.
        return;
      }
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (key === "y") {
        e.preventDefault();
        handleRedo();
      } else if (key === "c") {
        e.preventDefault();
        handleCopyActiveTextBox();
      } else if (key === "v") {
        e.preventDefault();
        handlePasteTextBox();
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        handleZoomIn();
      } else if (key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (key === "0") {
        e.preventDefault();
        handleZoomReset();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTextBoxDef, activeTextBox, activeImageBox]);

  async function uploadPhotoToStorage(photo: Photo): Promise<string> {
    const blob = await fetch(photo.url).then((res) => res.blob());
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("order-photos").upload(path, blob);
    if (error) throw error;

    const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  // 포토북 편집 내용을 실제 인쇄용 PDF(내지 1개 + 표지 1개)로 만들어서 Storage에 올리고,
  // 다운로드 링크를 주문 photos 배열에 특별한 표시(note: "[인쇄파일] ...")로 함께 담아요.
  // 혜민님은 관리자 화면에서 이 링크로 바로 파일을 받아 발주할 수 있어요.
  //
  // 주의: 표지의 책등(세네카) 폭은 참고용 예상치예요. 실제 발주 전에는 꼭 제작처
  // 계산기로 다시 확인해주세요. (자세한 내용은 lib/printCompose.ts 상단 설명 참고)
  async function generatePhotobookPrintFiles(): Promise<
    { url: string; caption: string; note: string }[]
  > {
    if (!template) return [];

    const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
    const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const innerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
    const trimMatch = (sizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const trimCm = trimMatch ? parseFloat(trimMatch[1]) : 30;

    const { printBlob: innerBlob, guideBlob: innerGuideBlob } = await buildInnerPrintPdf({
      customSpreads,
      spreadPhotoGroups,
      photos,
      productionFileSizeMm: sizeInfo?.productionFileSizeMm ?? null,
      // "마지막 소개 페이지"를 내지 맨 마지막 장으로 자동으로 붙여요.
      introPage: { coverPhoto, coverTitle, introDate: introPublishDate, introMaker: introMakerName },
    });
    const { printBlob: coverBlob, guideBlob: coverGuideBlob } = await buildCoverPrintPdf({
      cover: photobookCover === "hard" ? "hard" : "soft",
      sizeInnerTrimMm: trimCm * 10,
      coverPhoto,
      coverTitle,
      coverTitleFontSizePt,
      coverTitleLineHeightEm,
      coverTitleLetterSpacingEm,
      coverTitleFontFamily,
      coverTitleXPct,
      coverTitleYPct,
      coverTitleWidthPct,
      innerPaperWeightG: innerPaper.weightG,
      pages,
      spineTitleYPct: spineTitleYPct ?? undefined,
      spineTitleHeightPct,
      spineTitleFontSizePt: spineTitleFontSizePt ?? undefined,
      spineTitleFontFamily,
      backCoverMode,
      backCoverPhoto,
      backCoverBackgroundColor,
      backCoverPatternId,
      backCoverTextBoxes,
      coverSpineBackgroundColor,
      coverFrontBackgroundColor,
      coverTextBoxes,
    });

    const uuid = () => crypto.randomUUID();
    const files: { path: string; blob: Blob }[] = [
      { path: `print-files/${uuid()}-inner.pdf`, blob: innerBlob },
      { path: `print-files/${uuid()}-inner-guide.pdf`, blob: innerGuideBlob },
      { path: `print-files/${uuid()}-cover.pdf`, blob: coverBlob },
      { path: `print-files/${uuid()}-cover-guide.pdf`, blob: coverGuideBlob },
    ];

    const uploads = await Promise.all(
      files.map((f) =>
        supabase.storage.from("order-photos").upload(f.path, f.blob, { contentType: "application/pdf" })
      )
    );
    const uploadError = uploads.find((u) => u.error);
    if (uploadError?.error) throw uploadError.error;

    const [innerUrl, innerGuideUrl, coverUrl, coverGuideUrl] = files.map(
      (f) => supabase.storage.from("order-photos").getPublicUrl(f.path).data.publicUrl
    );

    const spineIsConfirmed = calcEstimatedSpineWidthMm(innerPaper.weightG, pages, photobookCover === "hard" ? "hard" : "soft")
      .isConfirmed;
    const coverNote = spineIsConfirmed
      ? "[인쇄파일] 표지 PDF (책등 폭: 레드프린팅 실측 확인값 적용)"
      : "[인쇄파일] 표지 PDF (책등 폭은 참고용 예상치 — 발주 전 재확인 필요)";

    return [
      { url: innerUrl, caption: "", note: "[인쇄파일] 내지 PDF" },
      { url: coverUrl, caption: "", note: coverNote },
      { url: innerGuideUrl, caption: "", note: "[가이드] 내지 확인용 PDF (재단선·안전선 표시 — 발주 금지, 확인 후 버려주세요)" },
      { url: coverGuideUrl, caption: "", note: "[가이드] 표지 확인용 PDF (재단선·안전선·책등 경계 표시 — 발주 금지, 확인 후 버려주세요)" },
    ];
  }

  // [테스트용] 지금 화면에 편집 중인 내용(photos, customSpreads)을 그대로 새 pdf-lib
  // 생성기에 넣어서 샘플 PDF를 만들고 바로 다운로드해요. Storage 업로드나 주문 흐름과는
  // 완전히 분리되어 있어서, 여러 번 눌러봐도 실제 주문/데이터에는 아무 영향이 없어요.
  async function handlePdfLibTest() {
    setPdfLibTestState({ status: "running" });
    try {
      const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
      const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
      const result = await buildInnerPrintPdfLib({
        customSpreads,
        spreadPhotoGroups,
        photos,
        productionFileSizeMm: sizeInfo?.productionFileSizeMm ?? null,
        introPage: { coverPhoto, coverTitle, introDate: introPublishDate, introMaker: introMakerName },
      });

      const objectUrl = URL.createObjectURL(result.printBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `pdflib-test-inner-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setPdfLibTestState({
        status: "done",
        info: `생성 완료 — ${result.pageCount}쪽 / 용지(재단표시 포함) ${result.mediaSizeMm.w}×${result.mediaSizeMm.h}mm / 도련 포함 작업사이즈 ${result.workSizeMm.w}×${result.workSizeMm.h}mm / 재단(완성) ${result.trimSizeMm.w}×${result.trimSizeMm.h}mm / 도련폭 ${result.bleedMm}mm`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPdfLibTestState({ status: "error", message });
      // eslint-disable-next-line no-console
      console.error("[pdflib-test]", err);
    }
  }

  // [테스트용] 표지 펼침면 2페이지(바깥면+안쪽면) 샘플 PDF를 만들어서 바로 다운로드해요.
  // 안쪽면에 들어갈 "첫 내지/마지막 내지" 내용은 지금 화면의 customSpreads 맨 처음 면(왼쪽)과
  // 맨 마지막 면(오른쪽)을 그대로 가져와요. Storage 업로드·주문 흐름과는 무관해요.
  async function handleCoverPdfLibTest() {
    setCoverPdfLibTestState({ status: "running" });
    try {
      const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
      const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
      const innerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
      const trimMatch = (sizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
      const trimCm = trimMatch ? parseFloat(trimMatch[1]) : 30;

      const firstSpread = customSpreads[0];
      const lastSpread = customSpreads[customSpreads.length - 1];
      const firstGroup = spreadPhotoGroups[0];
      const lastGroup = spreadPhotoGroups[spreadPhotoGroups.length - 1];
      const firstPage =
        firstSpread && firstGroup
          ? { templateId: firstSpread.left, photos: firstGroup.leftIndexes.map((idx) => photos[idx]).filter(Boolean) }
          : null;
      const lastPage =
        lastSpread && lastGroup
          ? { templateId: lastSpread.right, photos: lastGroup.rightIndexes.map((idx) => photos[idx]).filter(Boolean) }
          : null;

      const result = await buildCoverPrintPdfLib({
        cover: photobookCover === "hard" ? "hard" : "soft",
        sizeInnerTrimMm: trimCm * 10,
        coverPhoto,
        coverTitle,
        innerPaperWeightG: innerPaper.weightG,
        pages,
        firstPage,
        lastPage,
        spineTitleOffsetRatio: coverSpineTitleOffset,
      });

      const objectUrl = URL.createObjectURL(result.printBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `pdflib-test-cover-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setCoverPdfLibTestState({
        status: "done",
        info: `생성 완료 — 2쪽(1p 바깥면/2p 안쪽면) / 펼침면 전체 ${result.outerSizeMm.w}×${result.outerSizeMm.h}mm / 표지판 ${result.panelMm}mm / 책등 ${result.spineMm}mm(${result.spineIsConfirmed ? "실측" : "예상치"}) / 도련 ${result.bleedMm}mm` +
          (result.spineTitleFits === false ? " / ⚠️ 책등 제목이 길어서 최소 크기로도 다 안 들어갔어요" : "") +
          (result.spineLogoDrawn === false ? " / ⚠️ 책등이 좁아 로고를 생략했어요" : ""),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCoverPdfLibTestState({ status: "error", message });
      // eslint-disable-next-line no-console
      console.error("[pdflib-cover-test]", err);
    }
  }

  async function handleProceed(nextUrl: string, photosToUpload: Photo[], note?: string) {
    setIsSaving(true);
    try {
      const uploadedPhotos = await Promise.all(
        photosToUpload.map(async (p) => ({ ...p, url: await uploadPhotoToStorage(p) }))
      );

      // 텀블러 각인 요청사항이나 하드케이스 배경색상처럼 사진이 아닌 메모는
      // 실제 이미지 업로드 없이 photos 배열 맨 뒤에 { url: "", note } 형태로 함께 담아요.
      // (colorNote는 이 페이지에서 고칠 수 없는, 이전 단계에서 자동으로 붙은 메모예요.)
      const notePhotos = [note, colorNote]
        .filter((n): n is string => !!n && n.trim() !== "")
        .map((n) => ({ url: "", caption: "", note: n.trim() }));

      let printFilePhotos: { url: string; caption: string; note: string }[] = [];
      if (isPhotobook && template) {
        setIsGeneratingPrintFiles(true);
        try {
          printFilePhotos = await generatePhotobookPrintFiles();
        } catch (err) {
          console.error(err);
          alert(
            "인쇄용 파일을 만드는 중 문제가 발생했어요. 주문은 계속 접수되고, 인쇄 파일은 나중에 다시 만들어드릴게요."
          );
        } finally {
          setIsGeneratingPrintFiles(false);
        }
      }

      const draft = {
        productName,
        sizeId: selectedSizeInfo.id,
        sizeLabel: displaySizeLabel,
        sizeDetail: displaySizeDetail,
        quantity,
        unitPrice,
        templateId: template?.id ?? null,
        photos: [...uploadedPhotos, ...notePhotos, ...printFilePhotos],
      };

      sessionStorage.setItem("keepic_draft_order", JSON.stringify([draft]));
      router.push(nextUrl);
    } catch (err) {
      console.error(err);
      alert("사진을 올리는 중 문제가 발생했어요. 다시 시도해주세요.");
      setIsSaving(false);
    }
  }

  if (config.maxPhotos > 1 && template) {
    // 스프레드 1(index 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 고정돼서
    // 필요한 사진 장수에서 제외해요. (computeSpreadPhotoGroups와 같은 기준)
    const requiredCount = customSpreads.reduce(
      (total, s, i) =>
        total + (i === 0 ? 0 : pageTemplates[s.left].photoCount) + pageTemplates[s.right].photoCount,
      0
    );
    // "AI 맞춤 레이아웃"은 이제 칸 개수가 정해져 있지 않고(전부 자유 배치 이미지박스라서
    // requiredCount가 늘 0으로 계산돼요) 사진을 몇 장을 올리든 자유롭게 배치할 수 있어요 —
    // 그래서 "정확히 N장" 검사 대신 최소 1장만 있으면 다음으로 넘어갈 수 있게 해요.
    const isPhotoCountValid = isAiAuto ? photos.length >= 1 : photos.length === requiredCount;
    const lowResCount = photos.filter((p) => isLowRes(p, requiredMinPx / 2)).length;

    const nextUrl = `/checkout?product=${encodeURIComponent(
      productName
    )}&size=${selectedSizeInfo.id}&quantity=${quantity}`;

    const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);

    // 작업선·재단선·안전선 미리보기용 비율이에요. (실제 발주 파일의 수치와 같은 값을 써요:
    // lib/printCompose.ts의 printFileSpec.innerTrimBleedMm / GUIDE_SAFETY_MARGIN_MM)
    // 스프레드는 왼쪽+오른쪽 페이지 두 장이 나란히 붙은 통짜 작업 사이즈라서, 가로 비율은
    // 페이지 폭의 2배를 기준으로 계산해요. (가로/세로 기준을 따로 둬야 점선이 딱 맞아요)
    const guideSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const guideWorkMatch = (guideSizeInfo?.productionFileSizeMm ?? "").match(/(\d+(\.\d+)?)/);
    const guidePageWorkMm = guideWorkMatch ? parseFloat(guideWorkMatch[1]) : 310;
    const guideSpreadWorkMm = guidePageWorkMm * 2;
    const GUIDE_BLEED_MM = 5;
    const GUIDE_SAFETY_MM = 10; // lib/printCompose.ts의 GUIDE_SAFETY_MARGIN_MM과 같은 값
    const trimXPct = (GUIDE_BLEED_MM / guideSpreadWorkMm) * 100;
    const trimYPct = (GUIDE_BLEED_MM / guidePageWorkMm) * 100;
    // "변형" 패널(이미지박스 위치·크기를 mm로 직접 입력)에서 쓰는 mm↔퍼센트 변환이에요.
    // 이미지박스의 xPct/widthPct는 스프레드 전체 폭(guideSpreadWorkMm, 도련 포함)을
    // 100%로 보는 좌표라서, 눈금자(Ruler)에 표시되는 "재단선 기준 실제 mm"와 똑같은
    // 숫자가 나오도록 눈금자와 같은 보정을 적용해요 — 가로는 책등에서 겹치는 도련 때문에
    // 살짝 눌러서 표시하고(약 2%), 세로는 그대로예요(2026-09 추가).
    const transformTrimTotalMmX = (guidePageWorkMm - 2 * GUIDE_BLEED_MM) * 2;
    const transformRawPerLabelMmX =
      transformTrimTotalMmX > 0 ? (guideSpreadWorkMm - 2 * GUIDE_BLEED_MM) / transformTrimTotalMmX : 1;
    function pctXToMm(pct: number) {
      const rawMm = (pct / 100) * guideSpreadWorkMm;
      return (rawMm - GUIDE_BLEED_MM) / transformRawPerLabelMmX;
    }
    function mmToPctX(mm: number) {
      const rawMm = GUIDE_BLEED_MM + mm * transformRawPerLabelMmX;
      return (rawMm / guideSpreadWorkMm) * 100;
    }
    function pctYToMm(pct: number) {
      return (pct / 100) * guidePageWorkMm - GUIDE_BLEED_MM;
    }
    function mmToPctY(mm: number) {
      return ((mm + GUIDE_BLEED_MM) / guidePageWorkMm) * 100;
    }
    // 너비·높이는 원점 이동 없이 배율만 적용해요(0mm은 항상 0mm).
    function widthMmToPct(mm: number) {
      return ((mm * transformRawPerLabelMmX) / guideSpreadWorkMm) * 100;
    }
    function widthPctToMm(pct: number) {
      return ((pct / 100) * guideSpreadWorkMm) / transformRawPerLabelMmX;
    }
    function heightMmToPct(mm: number) {
      return (mm / guidePageWorkMm) * 100;
    }
    function heightPctToMm(pct: number) {
      return (pct / 100) * guidePageWorkMm;
    }
    // "인쇄 미리보기"에서 재단선 안쪽만 확대해서 꽉 차게 보여주는 배율이에요 — 가운데를
    // 기준으로 확대하면 도련(bleed) 부분이 바깥으로 밀려나서 overflow-hidden에 자동으로
    // 잘려나가고, 재단선 안쪽 라인이 딱 상자 테두리에 맞춰져요.
    const previewScaleX = 100 / (100 - 2 * trimXPct);
    const previewScaleY = 100 / (100 - 2 * trimYPct);
    // 바깥쪽(재단 기준) 안전 여백 — 위/아래 및 왼쪽 페이지의 왼쪽·오른쪽 페이지의 오른쪽
    // (제본부 반대쪽) 가장자리에 써요.
    const safetyOuterXPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guideSpreadWorkMm) * 100;
    const safetyYPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guidePageWorkMm) * 100;
    // 제본부(가운데) 전용 안전 여백 — 바깥쪽 안전 여백과 다른 값을 써요(제본 때문에 접히는
    // 쪽이라 더 넓은 여백이 필요해요). 표지 책등 폭과는 무관하게, 내지 자체의 여백이에요.
    // ⚠️ 추정치예요 — 실제 제본 방식(무선철 등) 확인이 필요해요.
    const GUIDE_BINDING_MARGIN_MM = 15;
    const bindingHalfPct = (GUIDE_BINDING_MARGIN_MM / guideSpreadWorkMm) * 100;
    const bindingCenterPct = 50;
    const bindingLeftEdgePct = bindingCenterPct - bindingHalfPct; // 왼쪽 페이지 안전영역의 오른쪽(제본쪽) 경계
    const bindingRightEdgePct = bindingCenterPct + bindingHalfPct; // 오른쪽 페이지 안전영역의 왼쪽(제본쪽) 경계
    // 왼쪽·오른쪽 페이지 각각 닫힌 사각형(재단 기준 3면 + 제본부 1면)이에요. 표지의 책등
    // 폭은 여기 더하지 않아요 — 내지는 각 페이지 안쪽에서 제본 여백을 확보하는 방식이에요.
    const leftPageSafetyLeftPct = safetyOuterXPct;
    const leftPageSafetyRightPct = bindingLeftEdgePct;
    const rightPageSafetyLeftPct = bindingRightEdgePct;
    const rightPageSafetyRightPct = 100 - safetyOuterXPct;
    const innerSafetyFits = leftPageSafetyRightPct > leftPageSafetyLeftPct; // 페이지가 너무 좁으면 박스가 찌그러질 수 있어요

    // 이미지박스 크기 조절 스냅용 안내선이에요(2026-09-22, 혜민님 요청) — 재단선·
    // 안전영역·펼침면 중앙(책등/제본 경계)까지 포함해서, 손잡이를 끌 때 가까우면 자동으로
    // 달라붙어요. 화면에 보이는지(showGuidelines 등)와 무관하게 항상 스냅 대상이에요.
    const imageBoxGuidesX = [
      0,
      100,
      bindingCenterPct,
      bindingLeftEdgePct,
      bindingRightEdgePct,
      trimXPct,
      100 - trimXPct,
      safetyOuterXPct,
      100 - safetyOuterXPct,
    ];
    const imageBoxGuidesY = [0, 100, trimYPct, 100 - trimYPct, safetyYPct, 100 - safetyYPct];

    // 표지(뒤표지-책등-앞표지) 실제 비율이에요. lib/printCompose.ts의 buildCoverPrintPdf와
    // 같은 계산식을 그대로 써서, 화면 미리보기가 실제 표지 인쇄 파일 비율과 일치하도록 해요.
    const coverIsHard = photobookCover === "hard";
    const coverSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const coverTrimMatch = (coverSizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const coverTrimCm = coverTrimMatch ? parseFloat(coverTrimMatch[1]) : 30;
    const coverInnerTrimMm = coverTrimCm * 10;
    const coverInnerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
    const coverPages = photobookPages ? Number(photobookPages) : 20;
    const coverPanelMm = coverIsHard
      ? coverInnerTrimMm + printFileSpec.hardCoverPanelOverhangMm * 2
      : coverInnerTrimMm;
    const coverBleedMm = coverIsHard ? printFileSpec.hardCoverWrapBleedMm : printFileSpec.softCoverBleedMm;
    const coverSpineInfo = calcEstimatedSpineWidthMm(coverInnerPaper.weightG, coverPages, coverIsHard ? "hard" : "soft");
    const coverSpineMm = coverSpineInfo.isConfirmed ? coverSpineInfo.estimateMm : coverSpineInfo.maxMm;
    const coverTotalWmm = coverPanelMm * 2 + coverSpineMm + coverBleedMm * 2;
    const coverTotalHmm = coverPanelMm + coverBleedMm * 2;
    const coverSpinePct = (coverSpineMm / coverTotalWmm) * 100;
    // 뒤표지·책등·앞표지를 하나의 표지 펼침면으로 보고 계산해요(2026-09 재설계). 뒤표지·
    // 앞표지 "칸"은 이제 그 바깥쪽 도련까지 포함해요 — 그래야 (1) 화면에 표시되는 칸 크기가
    // 실제 인쇄 파일의 사진 칸(도련까지 확장됨, 아래 lib/printCompose.ts 참고)과 정확히
    // 같은 비율이 되고, (2) 세 칸(뒤표지 칸+책등+앞표지 칸)의 폭을 더하면 정확히 100%가
    // 돼서 오른쪽 끝에 정체불명의 흰 여백이 남지 않아요.
    const coverBackPct = ((coverBleedMm + coverPanelMm) / coverTotalWmm) * 100;
    const coverFrontPct = ((coverPanelMm + coverBleedMm) / coverTotalWmm) * 100;
    // coverBackPct + coverSpinePct + coverFrontPct === 100

    // 아래는 표지 안내선(도련선·재단선·안전영역·책등 경계) 계산이에요. 전부 "표지 펼침면
    // 전체"를 100%로 보는 같은 좌표계를 써요(패널마다 따로 계산하지 않아요 — 그래야 점선이
    // 책등에서 끊기지 않고 하나로 이어져요).
    const coverBleedXPct = (coverBleedMm / coverTotalWmm) * 100; // 도련선(바깥 재단 경계)의 좌우 inset
    const coverBleedYPct = (coverBleedMm / coverTotalHmm) * 100; // 도련선의 상하 inset
    const coverSafetyXPct = (GUIDE_SAFETY_MM / coverTotalWmm) * 100;
    const coverSafetyYPct = (GUIDE_SAFETY_MM / coverTotalHmm) * 100;
    // 책등 좌우 경계(접힘 위치)의 x% 두 곳
    const coverSpineStartPct = coverBackPct;
    const coverSpineEndPct = coverBackPct + coverSpinePct;
    // 안전영역 상/하 경계는 뒤표지·책등·앞표지 모두 같아요(위아래 도련은 세 구역이 공통).
    const coverSafetyTopPct = coverBleedYPct + coverSafetyYPct;
    const coverSafetyBottomPct = 100 - coverBleedYPct - coverSafetyYPct;
    // 뒤표지 안전영역(재단선 안쪽으로 한 번 더 들어간 영역)
    const coverBackSafetyLeftPct = coverBleedXPct + coverSafetyXPct;
    const coverBackSafetyRightPct = coverSpineStartPct - coverSafetyXPct;
    // 앞표지 안전영역
    const coverFrontSafetyLeftPct = coverSpineEndPct + coverSafetyXPct;
    const coverFrontSafetyRightPct = 100 - coverBleedXPct - coverSafetyXPct;
    // 책등은 실측해보면(예: 소프트커버 20p 7.22mm) 11~12pt 글자도 여유 있게 들어가서,
    // 뒤표지·앞표지처럼 별도 안전영역 여백을 두지 않아요(2026-09, 사용자 확인). 책등
    // 경계(재단선)는 위 패널 테두리로 이미 보여주고 있어요.

    // 책등 키픽 로고 — 책등이 좁아서(7~9mm) 이미지를 90도로 눕혀서 넣어요(혜민님 확인:
    // "오른쪽으로 돌려서"). 재단선에서 로고 글자가 잘리지 않도록, 로고 블록의 아래쪽
    // 끝을 재단선(책등 맨 아래)에서 안전영역과 같은 10mm 띄운 자리에 둬요 — 정중앙이나
    // 임의의 비율이 아니라, 실제 mm 안전 여백을 기준으로 계산해요.
    const coverSpinePt = mmToPt(coverSpineMm);
    const coverSpineLogoLayout = computeSpineLogoLayout(coverSpinePt);
    const SPINE_LOGO_BOTTOM_MARGIN_MM = 25; // 재단선에서 로고까지 — 혜민님 확인(2026-09): 아래에서 25mm
    const SPINE_TITLE_TOP_MARGIN_MM = 25; // 책 제목 위쪽 여백 — 혜민님 확인(2026-09): 위에서 25mm
    const coverSpineTitleDefaultYPct = (SPINE_TITLE_TOP_MARGIN_MM / coverTotalHmm) * 100;
    const coverSpineTitleYPct = spineTitleYPct ?? coverSpineTitleDefaultYPct;
    // 책 제목 글자 크기 — 실제 mm 기준으로 계산해서 cqh(컨테이너 높이 대비 %)로 넣어요.
    // 고정 px이 아니라서 브라우저 창을 늘리거나 줄여도 항상 책 실물 크기 그대로예요.
    const spineTitleMaxLengthMm = (spineTitleHeightPct / 100) * coverTotalHmm;
    const spineTitleMeasure = measureSpineTitleFontSizeMm(
      coverTitle.replace(/\n/g, " ").trim(),
      coverSpineMm,
      spineTitleMaxLengthMm,
      spineTitleFontSizePt ?? undefined,
      spineTitleFontFamily
    );
    const spineTitleFontSizeCqh = (spineTitleMeasure.sizeMm / coverTotalHmm) * 100;
    // 표지 제목 글자 크기 — pt를 실제 mm로 환산해서 cqh(컨테이너 높이 대비 %)로 넣어요.
    // 고정 rem이 아니라서 창 크기가 바뀌어도 항상 pt로 지정한 실제 인쇄 크기 그대로예요.
    const coverTitleFontSizeMm = (coverTitleFontSizePt * 25.4) / 72;
    const coverTitleFontSizeCqh = (coverTitleFontSizeMm / coverTotalHmm) * 100;
    // computeSpineLogoLayout이 돌려주는 drawnWidthPt(책등 폭 방향)·drawnHeightPt(책등
    // 길이 방향)는 "눕힌 뒤(화면에 실제로 보이는)" 가로/세로예요. 회전 전 <img> 박스는
    // 가로/세로가 서로 뒤바뀌어야 rotate(90deg) 후 원하는 크기가 나와요. (표지 펼침면은
    // aspectRatio로 실측 mm 비율 그대로 렌더링돼서 가로·세로 축척이 같아요 — 그래서
    // "책등 폭 대비 %"와 "표지 전체 높이 대비 %"를 이렇게 서로 변환할 수 있어요.)
    const coverSpineLogoPreRotateWidthPct =
      coverSpinePt > 0 ? (coverSpineLogoLayout.drawnHeightPt / coverSpinePt) * 100 : 0;
    const coverSpineLogoPreRotateHeightPct = (coverSpineLogoLayout.drawnWidthPt / mmToPt(coverTotalHmm)) * 100;
    const coverSpineLogoVisibleHeightPct = (coverSpineLogoLayout.drawnHeightPt / mmToPt(coverTotalHmm)) * 100;
    const coverSpineLogoBottomMarginPct = (SPINE_LOGO_BOTTOM_MARGIN_MM / coverTotalHmm) * 100;
    const coverSpineLogoCenterYPct = 100 - coverSpineLogoBottomMarginPct - coverSpineLogoVisibleHeightPct / 2;

    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
        {/* 편집기 전용 상단바 — 2026-09 화면 배치 개편으로 로고 아래 빈 여백을 없애고,
            뒤로가기·로고·책 이름·실행취소/다시실행·미리보기·확대축소를 한 줄에 정돈함.
            좁은 화면에서는 flex-wrap으로 줄바꿈돼서 버튼이 겹치지 않아요. 실제로 동작하지
            않는 "저장" 버튼/상태 표시는 일부러 넣지 않았어요(혜민님 확인, 2026-09-23 —
            자동저장 기능은 이번 범위 밖). */}
        <header
          className="shrink-0 border-b border-[var(--color-hairline)] bg-[var(--color-ivory)]/95 backdrop-blur"
        >
          <div className="mx-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2 sm:px-6">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-hairline)]/30 hover:text-[var(--color-charcoal)]"
            >
              ←
            </button>
            <a href="/" className="shrink-0">
              <img src="/logo.svg" alt="Keepic" className="h-6 w-auto" />
            </a>
            <span className="min-w-0 max-w-[40vw] truncate text-sm font-medium text-[var(--color-charcoal)]/80 sm:max-w-xs">
              {coverTitle.trim() || "제목 없는 포토북"}
            </span>
            {photos.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-white px-1.5 py-1 text-xs shadow-sm">
                  <button
                    type="button"
                    onClick={handleUndo}
                    title="실행취소 (Ctrl+Z)"
                    className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    title="다시실행 (Ctrl+Shift+Z)"
                    className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    ↷
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorMode(editorMode === "edit" ? "preview" : "edit")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    editorMode === "preview"
                      ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                      : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
                  }`}
                >
                  {editorMode === "edit" ? "미리보기" : "✏️ 편집하기"}
                </button>
                <div className="flex items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-white px-1.5 py-1 text-xs shadow-sm">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="축소 (Ctrl+-)"
                    className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    title="화면에 맞추기 (Ctrl+0)"
                    className="w-14 rounded-full px-1 py-1 text-center text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    {Math.round(canvasZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="확대 (Ctrl+=)"
                    className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isPdfLibTestMode && (
          <section className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-4 sm:px-10">
            <div className="mt-4 rounded-xl border border-dashed border-[var(--color-charcoal)]/30 bg-white/60 p-4">
              <p className="text-sm font-medium">🧪 새 PDF 생성기 테스트 (pdf-lib) — 주문/저장과 무관해요</p>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                지금 화면에 있는 사진·캡션 편집 내용 그대로 샘플 PDF(내지만)를 만들어서 바로
                다운로드해요. 기존 &quot;다음&quot; 진행이나 주문 저장과는 전혀 연결되어 있지 않아요.
              </p>
              <button
                type="button"
                onClick={handlePdfLibTest}
                disabled={pdfLibTestState.status === "running"}
                className="mt-3 rounded-full bg-[var(--color-charcoal)] px-4 py-2 text-sm text-white transition disabled:opacity-50"
              >
                {pdfLibTestState.status === "running" ? "생성 중…" : "테스트 샘플 PDF 만들기"}
              </button>
              {pdfLibTestState.status === "done" && (
                <p className="mt-2 text-xs text-emerald-700 break-keep">✅ {pdfLibTestState.info}</p>
              )}
              {pdfLibTestState.status === "error" && (
                <p className="mt-2 text-xs text-red-600 break-keep">
                  ❌ 에러: {pdfLibTestState.message}
                </p>
              )}

              <div className="mt-4 border-t border-dashed border-[var(--color-charcoal)]/20 pt-4">
                <p className="text-sm font-medium">🧪 표지 펼침면 테스트 (바깥면+안쪽면 2쪽)</p>
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                  표지 사진·제목 + 지금 화면의 맨 처음/맨 마지막 페이지 내용으로 표지 펼침면
                  샘플 PDF(2쪽)를 만들어요. 이것도 주문·저장과 무관해요. 책등에는 위 제목과
                  Keepic 로고가 옆으로 눕혀서 들어가요(제목은 아래 슬라이더로 위/아래 위치만
                  조정 가능, 로고는 책등 아래쪽에 고정).
                </p>
                <div className="mt-3">
                  <label className="text-xs text-[var(--color-charcoal)]/70">
                    책등 제목 위치 (위 ↔ 아래)
                  </label>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={coverSpineTitleOffset}
                    onChange={(e) => setCoverSpineTitleOffset(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-charcoal)]/40">
                    <span>위쪽</span>
                    <span>정중앙</span>
                    <span>아래쪽</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCoverPdfLibTest}
                  disabled={coverPdfLibTestState.status === "running"}
                  className="mt-3 rounded-full bg-[var(--color-charcoal)] px-4 py-2 text-sm text-white transition disabled:opacity-50"
                >
                  {coverPdfLibTestState.status === "running" ? "생성 중…" : "표지 테스트 샘플 PDF 만들기"}
                </button>
                {coverPdfLibTestState.status === "done" && (
                  <p className="mt-2 text-xs text-emerald-700 break-keep">✅ {coverPdfLibTestState.info}</p>
                )}
                {coverPdfLibTestState.status === "error" && (
                  <p className="mt-2 text-xs text-red-600 break-keep">
                    ❌ 에러: {coverPdfLibTestState.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="flex w-full min-h-0 flex-1 flex-col bg-[var(--color-hairline)]/15 px-4 pb-4 pt-4 sm:px-6 lg:px-8">
          {photos.length === 0 && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
              <p className="text-[var(--color-charcoal)]/70 break-keep">
                {isAiAuto
                  ? "사진을 올리면 AI가 개수와 비율에 맞춰 자동으로 배치해드려요."
                  : `이 디자인은 정확히 사진 ${requiredCount}장이 필요해요.`}
              </p>
              <label className="inline-block cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90">
                사진 선택하기
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}
          {photos.length > 0 && (
            // PC 큰 화면에서는 좌우에 흰 여백이 남지 않도록 폭 제한을 풀어요(예전엔
            // max-w-6xl로 가운데 고정폭이었는데, 넓은 모니터에서 편집 캔버스 양옆이
            // 허전해 보인다는 피드백을 반영했어요 — 스위트북 편집기처럼 꽉 차게).
            <div
              className="mx-auto mt-2 flex w-full max-w-6xl flex-1 flex-col lg:max-w-none"
              style={{ minHeight: 420 }}
            >
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1 pb-2">
                <button
                  type="button"
                  onClick={() => setIsPrintPreview((v) => !v)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isPrintPreview
                      ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                      : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
                  }`}
                >
                  🖨️ {isPrintPreview ? "인쇄 미리보기 끄기" : "인쇄 미리보기"}
                </button>
              </div>

              {/* 텍스트박스 바깥(빈 곳)을 누르면 선택이 풀려요 — TextBoxOverlay 쪽 mousedown은
                  stopPropagation으로 여기까지 안 올라와서, 박스 자체를 누른 경우는 안 풀려요.
                  2026-09 화면 배치 개편: 왼쪽 페이지 목록은 하단 바(아래 BottomPageBar)로
                  옮겼고, 실행취소·다시실행·미리보기·확대축소는 상단바로 옮겨서 여기는
                  편집 캔버스 한 칸만 남았어요 — 높이가 "화면 전체 − 상단바"로 고정돼 있어서
                  펼침면이 항상 중앙에 꽉 차게 보여요. */}
              <div
                className="flex min-h-0 flex-1 flex-col"
                onMouseDown={() => {
                  setActiveTextBox(null);
                  setActiveImageBox(null);
                }}
              >
                  <div
                    className={
                      (editorMode === "preview" ? "pointer-events-none select-none " : "") +
                      "relative flex min-h-0 flex-1 flex-col"
                    }
                    onWheel={(e) => {
                      if (!e.ctrlKey && !e.metaKey) return;
                      e.preventDefault();
                      if (e.deltaY < 0) handleZoomIn();
                      else if (e.deltaY > 0) handleZoomOut();
                    }}
                  >
                    {editorMode === "preview" && (
                      <button
                        type="button"
                        onClick={() => setEditorMode("edit")}
                        aria-label="편집하기"
                        className="group pointer-events-auto absolute inset-0 z-30 flex cursor-pointer items-center justify-center"
                      >
                        <span className="pointer-events-none rounded-full bg-black/60 px-5 py-2.5 text-sm font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                          ✏️ 편집하기
                        </span>
                      </button>
                    )}
                  {selectedPageKey === "cover" ? (
                    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--color-hairline)] bg-white p-5">
                      <div className="shrink-0">
                        <p className="text-sm font-medium">앞표지 꾸미기</p>
                        <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                          여기서 고른 사진과 제목이 실제 표지 인쇄 파일에 그대로 들어가요. 뒤표지·책등
                          꾸미기는 아래에서 따로 설정할 수 있어요.
                        </p>
                      </div>

                      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                        {editorMode === "edit" && (
                        <div className="flex gap-2 lg:shrink-0">
                          {/* 표지도 내지처럼 왼쪽 아이콘 메뉴로 골라요 — 사진/제목/배경/텍스트박스
                              (2026-09-23, 이전엔 전부 한 화면에 세로로 나열돼 있었어요). */}
                          <div className="flex flex-row gap-1 overflow-x-auto lg:w-16 lg:shrink-0 lg:flex-col lg:overflow-visible">
                            {COVER_EDIT_TABS.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveCoverEditTab(tab.id)}
                                className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[10px] transition ${
                                  activeCoverEditTab === tab.id
                                    ? "bg-[var(--color-sky)]/15 text-[var(--color-sky)]"
                                    : "text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                }`}
                              >
                                <span className="text-base leading-none" aria-hidden>
                                  {tab.icon}
                                </span>
                                <span className="whitespace-nowrap">{tab.label}</span>
                              </button>
                            ))}
                          </div>
                          <div className="flex min-h-0 flex-col overflow-y-auto lg:w-72 lg:shrink-0 lg:pr-1">
                          {activeCoverEditTab === "photo" && (
                            <div className="flex flex-col gap-3">
                              {coverPhoto && (
                                <label className="inline-block cursor-pointer text-xs text-[var(--color-sky)] underline underline-offset-4">
                                  표지 사진 바꾸기
                                  <input type="file" accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                                </label>
                              )}
                              <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ivory)]/40 p-3">
                                <label className="mb-2 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  뒤표지 꾸미기
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex overflow-hidden rounded-full border border-[var(--color-hairline)]">
                                    <button
                                      type="button"
                                      onClick={() => setBackCoverMode("logo")}
                                      className={`px-3 py-1.5 text-xs transition ${
                                        backCoverMode === "logo"
                                          ? "bg-[var(--color-sky)] text-white"
                                          : "bg-white text-[var(--color-charcoal)]/70"
                                      }`}
                                    >
                                      키픽 로고
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBackCoverMode("photo")}
                                      className={`px-3 py-1.5 text-xs transition ${
                                        backCoverMode === "photo"
                                          ? "bg-[var(--color-sky)] text-white"
                                          : "bg-white text-[var(--color-charcoal)]/70"
                                      }`}
                                    >
                                      작은 사진
                                    </button>
                                  </div>
                                  {backCoverMode === "photo" && (
                                    <label className="inline-block cursor-pointer text-xs text-[var(--color-sky)] underline underline-offset-4">
                                      {backCoverPhoto ? "사진 바꾸기" : "사진 선택"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleBackCoverFileSelect}
                                        className="hidden"
                                      />
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          {activeCoverEditTab === "title" && (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={coverTitle}
                                onChange={(e) => handleCoverTitleChange(e.target.value)}
                                placeholder="표지에 넣을 제목 (예: 우리 가족의 여름)"
                                rows={2}
                                className="flex-1 resize-none rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
                              />
                              <p className="text-xs text-[var(--color-charcoal)]/50 break-keep">
                                제목은 비워둬도 괜찮아요. 사진 위에 흰 글씨로 들어가요. Enter를 누르면 줄이
                                바뀌어요(2줄 이상도 가능해요).
                              </p>
                              <p className="text-xs text-[var(--color-charcoal)]/50 break-keep">
                                이 제목이 책등에도 그대로 들어가요.
                              </p>
                              <div className="mt-2 grid grid-cols-1 gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    글자 크기(pt)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={8}
                                      max={200}
                                      list="titlePtPresets"
                                      value={coverTitleFontSizePt}
                                      onChange={(e) => setCoverTitleFontSizePt(Math.max(8, Math.min(200, Number(e.target.value) || 8)))}
                                      className="w-24 rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                    />
                                    <span className="text-xs text-[var(--color-charcoal)]/40">
                                      pt · 직접 입력하거나 목록에서 골라주세요
                                    </span>
                                    <datalist id="titlePtPresets">
                                      {COVER_TITLE_PT_PRESETS.map((pt) => (
                                        <option key={pt} value={pt} />
                                      ))}
                                    </datalist>
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    행간(줄 간격)
                                  </label>
                                  <input
                                    type="number"
                                    min={0.8}
                                    max={2.5}
                                    step={0.05}
                                    value={coverTitleLineHeightEm}
                                    onChange={(e) => setCoverTitleLineHeightEm(Math.max(0.8, Math.min(2.5, Number(e.target.value) || 1.2)))}
                                    className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    자간
                                  </label>
                                  <input
                                    type="number"
                                    min={-0.1}
                                    max={0.5}
                                    step={0.01}
                                    value={coverTitleLetterSpacingEm}
                                    onChange={(e) => setCoverTitleLetterSpacingEm(Math.max(-0.1, Math.min(0.5, Number(e.target.value) || 0)))}
                                    className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                  />
                                </div>
                              </div>
                              <div className="mt-2">
                                <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  표지 제목 서체
                                </label>
                                <select
                                  value={coverTitleFontFamily}
                                  onChange={(e) => setCoverTitleFontFamily(e.target.value)}
                                  className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
                                  style={{ fontFamily: coverTitleFontFamily }}
                                >
                                  {fontOptions.map((f) => (
                                    <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="mt-2 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ivory)]/40 p-3">
                                <label className="mb-2 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  책등 제목 크기·서체
                                </label>
                                <p className="mb-2 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                  책등 글자는 이 표지 제목 글자를 그대로 쓰지만, 크기·서체는 따로
                                  고를 수 있어요. 책등 양옆 여백은 항상 1.5mm를 넘지 않도록
                                  자동으로 잘라줘요(너무 크게 고르면 그 안에서 최대치로 맞춰져요).
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                      글자 크기(pt)
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={8}
                                        max={200}
                                        list="titlePtPresets"
                                        value={spineTitleFontSizePt ?? ""}
                                        placeholder="자동"
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setSpineTitleFontSizePt(v === "" ? null : Math.max(8, Math.min(200, Number(v) || 8)));
                                        }}
                                        className="w-20 rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setSpineTitleFontSizePt(null)}
                                        className={`shrink-0 rounded-lg border px-3 py-2.5 text-xs font-medium transition ${
                                          spineTitleFontSizePt === null
                                            ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                                            : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                        }`}
                                      >
                                        자동
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                      책등 서체
                                    </label>
                                    <select
                                      value={spineTitleFontFamily}
                                      onChange={(e) => setSpineTitleFontFamily(e.target.value)}
                                      className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                      style={{ fontFamily: spineTitleFontFamily }}
                                    >
                                      {fontOptions.map((f) => (
                                        <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                                          {f.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {activeCoverEditTab === "background" && (
                            <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ivory)]/40 p-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-[var(--color-charcoal)]/60">배경색(뒤표지·책등·표지 세트로)</span>
                                {SPREAD_BACKGROUND_PRESETS.map((preset) => {
                                  const isActive =
                                    (backCoverBackgroundColor ?? "#ffffff").toLowerCase() === preset.color.toLowerCase() &&
                                    (coverSpineBackgroundColor ?? "#f4f1ea").toLowerCase() === preset.color.toLowerCase() &&
                                    (coverFrontBackgroundColor ?? "#ffffff").toLowerCase() === preset.color.toLowerCase();
                                  return (
                                    <button
                                      key={preset.color}
                                      type="button"
                                      title={`${preset.label} — 뒤표지·책등·표지 모두 이 색으로`}
                                      onClick={() => {
                                        const next = preset.color === "#ffffff" ? undefined : preset.color;
                                        setBackCoverBackgroundColor(next);
                                        setCoverSpineBackgroundColor(next);
                                        setCoverFrontBackgroundColor(next);
                                      }}
                                      className={`h-6 w-6 rounded-full border transition ${
                                        isActive
                                          ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                          : "border-[var(--color-hairline)]"
                                      }`}
                                      style={{ backgroundColor: preset.color }}
                                    />
                                  );
                                })}
                              </div>
                              <p className="mt-2 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                아래에서 뒤표지·책등·표지를 각각 따로 지정할 수도 있어요.
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)]/70">
                                  뒤표지
                                  <input
                                    type="color"
                                    value={backCoverBackgroundColor ?? "#ffffff"}
                                    onChange={(e) => setBackCoverBackgroundColor(e.target.value)}
                                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                  />
                                </label>
                                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)]/70">
                                  책등
                                  <input
                                    type="color"
                                    value={coverSpineBackgroundColor ?? "#f4f1ea"}
                                    onChange={(e) => setCoverSpineBackgroundColor(e.target.value)}
                                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                  />
                                </label>
                                <label className="flex items-center gap-1.5 text-[11px] text-[var(--color-charcoal)]/70">
                                  앞표지
                                  <input
                                    type="color"
                                    value={coverFrontBackgroundColor ?? "#ffffff"}
                                    onChange={(e) => setCoverFrontBackgroundColor(e.target.value)}
                                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                  />
                                </label>
                              </div>
                              <div className="mt-3">
                                <span className="text-xs text-[var(--color-charcoal)]/60">
                                  그래픽·패턴·텍스처(뒤표지만)
                                </span>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setBackCoverPatternId(undefined)}
                                    className={`h-6 rounded-full border px-2 text-[11px] transition ${
                                      !backCoverPatternId
                                        ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                                        : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]/70"
                                    }`}
                                  >
                                    없음
                                  </button>
                                  {backgroundPatterns.map((preset) => {
                                    const isActive = backCoverPatternId === preset.id;
                                    return (
                                      <button
                                        key={preset.id}
                                        type="button"
                                        title={preset.label}
                                        onClick={() => setBackCoverPatternId(isActive ? undefined : preset.id)}
                                        className={`h-6 w-6 rounded-full border transition ${
                                          isActive
                                            ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                            : "border-[var(--color-hairline)]"
                                        }`}
                                        style={{ background: patternToCssBackground(preset) }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                          {activeCoverEditTab === "textbox" && (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={handleAddCoverTextBox}
                                className="rounded-full border border-[var(--color-sky)] px-4 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10"
                              >
                                + 앞표지에 텍스트박스 추가
                              </button>
                              <button
                                type="button"
                                onClick={handleAddBackCoverTextBox}
                                className="rounded-full border border-[var(--color-sky)] px-4 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10"
                              >
                                + 뒤표지에 텍스트박스 추가
                              </button>
                            </div>
                          )}
                          </div>
                        </div>
                        )}
                        <CanvasStage aspect={coverTotalWmm / coverTotalHmm} zoom={canvasZoom} fitToken={canvasFitToken}>
                        {/* 뒤표지·책등·앞표지를 하나의 표지 펼침면으로 보고 그려요. 안내선은
                            패널마다 따로 그리지 않고, 이 바깥 컨테이너 하나에 펼침면 전체 기준
                            좌표로 그려서 책등에서 끊기지 않게 해요. (화면 전용 — 인쇄 PDF에는
                            포함되지 않아요) */}
                        <div
                          className="relative mt-4 flex w-full overflow-hidden border border-[var(--color-hairline)] bg-white shadow-sm"
                          style={{ aspectRatio: `${coverTotalWmm} / ${coverTotalHmm}`, containerType: "size" }}
                        >
                          <div
                            className="group relative flex h-full items-center justify-center overflow-hidden"
                            style={{
                              width: `${coverBackPct}%`,
                              background: backCoverPatternId
                                ? resolveSpreadBackgroundCss({
                                    backgroundColor: backCoverBackgroundColor,
                                    backgroundPattern: backCoverPatternId,
                                  })
                                : (backCoverBackgroundColor ?? "#ffffff"),
                            }}
                          >
                            {backCoverMode === "logo" ? (
                              <img
                                src="/logo.svg"
                                alt="Keepic"
                                className="pointer-events-none w-[34%] max-w-24 opacity-80"
                              />
                            ) : backCoverPhoto ? (
                              <img
                                src={backCoverPhoto.url}
                                alt=""
                                className="h-[46%] w-[46%] rounded-sm object-cover shadow-sm"
                              />
                            ) : (
                              <label className="flex h-[46%] w-[46%] cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-[var(--color-charcoal)]/30 bg-white text-center text-[9px] text-[var(--color-charcoal)]/50">
                                사진 선택
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleBackCoverFileSelect}
                                  className="hidden"
                                />
                              </label>
                            )}
                            <TextBoxLayer
                              boxes={backCoverTextBoxes}
                              onAdd={handleAddBackCoverTextBox}
                              onChange={handleBackCoverTextBoxChange}
                              activeBoxId={activeTextBox?.ref.scope === "backCover" ? activeTextBox.boxId : null}
                              onSelect={(boxId) => setActiveTextBox({ ref: { scope: "backCover" }, boxId })}
                            />
                          </div>
                          <div
                            className="relative h-full overflow-hidden border-x border-[#1a1a1a]/70 px-1"
                            style={{ width: `${coverSpinePct}%`, backgroundColor: coverSpineBackgroundColor ?? "#f4f1ea" }}
                          >
                            {/* 책등엔 책등 제목과 키픽 로고만 보여줘요 — 제목 텍스트박스는 끌어서
                                위치를, 아래쪽 손잡이로 높이를 바꿀 수 있어요(가로폭은 책등 폭에
                                고정, 한 글자씩 정방향으로 위→아래 세로쓰기). 로고는 책등이 좁아서
                                90도로 눕히고(글자가 위→아래로 읽혀요), 재단선에서 안전영역과 같은
                                10mm 띄운 자리에 고정으로 둬요(화면에서 위치를 바꿀 수 없어요). */}
                            <SpineTitleOverlay
                              title={coverTitle.replace(/\n/g, " ")}
                              emptyLabel="책등"
                              yPct={coverSpineTitleYPct}
                              heightPct={spineTitleHeightPct}
                              fontSizeCqh={spineTitleFontSizeCqh}
                              fontFamily={spineTitleFontFamily}
                              onMove={setSpineTitleYPct}
                              onResize={setSpineTitleHeightPct}
                            />
                            {coverSpineLogoLayout.fits && (
                              <img
                                src="/logo.svg"
                                alt="Keepic"
                                className="pointer-events-none absolute z-10 opacity-90"
                                style={{
                                  top: `${coverSpineLogoCenterYPct}%`,
                                  left: "50%",
                                  width: `${coverSpineLogoPreRotateWidthPct}%`,
                                  height: `${coverSpineLogoPreRotateHeightPct}%`,
                                  transform: "translate(-50%, -50%) rotate(90deg)",
                                }}
                              />
                            )}
                          </div>
                          <div
                            className="group relative h-full overflow-hidden"
                            style={{ width: `${coverFrontPct}%`, backgroundColor: coverFrontBackgroundColor ?? "#ffffff" }}
                          >
                            {coverPhoto ? (
                              <PhotoCell
                                photo={coverPhoto}
                                requiredMinPx={requiredMinPx}
                                onChange={(c) => setCoverPhoto((prev) => (prev ? { ...prev, ...c } : prev))}
                              />
                            ) : (
                              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-[var(--color-ivory)] text-center text-xs text-[var(--color-charcoal)]/50">
                                표지 사진 선택
                                <input type="file" accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                              </label>
                            )}
                            <CoverTitleOverlay
                              title={coverTitle}
                              xPct={coverTitleXPct}
                              yPct={coverTitleYPct}
                              widthPct={coverTitleWidthPct}
                              fontSizeCqh={coverTitleFontSizeCqh}
                              lineHeightEm={coverTitleLineHeightEm}
                              letterSpacingEm={coverTitleLetterSpacingEm}
                              fontFamily={coverTitleFontFamily}
                              onMove={({ xPct, yPct }) => {
                                setCoverTitleXPct(xPct);
                                setCoverTitleYPct(yPct);
                              }}
                            />
                            <TextBoxLayer
                              boxes={coverTextBoxes}
                              onAdd={handleAddCoverTextBox}
                              onChange={handleCoverTextBoxChange}
                              activeBoxId={activeTextBox?.ref.scope === "cover" ? activeTextBox.boxId : null}
                              onSelect={(boxId) => setActiveTextBox({ ref: { scope: "cover" }, boxId })}
                            />
                          </div>

                          <CoverGuideBox left={0} right={100} top={0} bottom={100} variant="dashed" />
                          <CoverGuideBox
                            left={coverBleedXPct}
                            right={100 - coverBleedXPct}
                            top={coverBleedYPct}
                            bottom={100 - coverBleedYPct}
                            variant="solid"
                          />
                          <CoverGuideBox
                            left={coverBackSafetyLeftPct}
                            right={coverBackSafetyRightPct}
                            top={coverSafetyTopPct}
                            bottom={coverSafetyBottomPct}
                            variant="dotted"
                          />
                          <CoverGuideBox
                            left={coverFrontSafetyLeftPct}
                            right={coverFrontSafetyRightPct}
                            top={coverSafetyTopPct}
                            bottom={coverSafetyBottomPct}
                            variant="dotted"
                          />
                          {/* 안내선(도련선/재단선/안전영역)은 2026-09-23부터 편집 화면에서 항상 표시돼요
                              (예전엔 체크박스로 껐다 켤 수 있었는데, 혜민님 요청으로 토글을 없애고 늘
                              보이게 했어요 — 필요하면 "미리보기"로 전환해서 안내선 없는 최종 모습을
                              확인하면 돼요). 책등 경계는 위 패널 테두리(항상 표시)만으로 보여줘요. */}
                        </div>
                        </CanvasStage>
                        {editorMode === "edit" && activeTextBox && (activeTextBox.ref.scope === "cover" || activeTextBox.ref.scope === "backCover") && (
                          <div className="lg:w-72 lg:shrink-0">
                            <TextBoxToolbar
                              box={activeTextBoxDef}
                              onChange={(c) => updateTextBoxByRef(activeTextBox.ref, activeTextBox.boxId, c)}
                              onDelete={() => deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId)}
                              scopeLabel={textBoxScopeLabel(activeTextBox.ref)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selectedPageKey === "intro" ? (
                    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--color-hairline)] bg-white p-4">
                      <div className="shrink-0">
                        <p className="text-sm font-medium">마지막 소개 페이지</p>
                        <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                          앞표지 사진·제목이 자동으로 반영돼요(여기서 사진 크기·위치를 조절해도 실제
                          앞표지에는 영향을 주지 않아요). 오른쪽 면은 인쇄되지 않는 빈 면이에요 —
                          내지 페이지 수·PDF에는 포함되지 않아요.
                        </p>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                        {editorMode === "edit" && (
                        <div className="lg:w-72 lg:shrink-0">
                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <label className="text-xs text-[var(--color-charcoal)]/70">
                            발행일
                            <input
                              value={introPublishDate}
                              onChange={(e) => setIntroPublishDate(e.target.value)}
                              className="mt-1 w-full rounded border border-[var(--color-hairline)] px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs text-[var(--color-charcoal)]/70">
                            만든이
                            <input
                              value={introMakerName}
                              onChange={(e) => setIntroMakerName(e.target.value)}
                              placeholder="신규 작성자"
                              className="mt-1 w-full rounded border border-[var(--color-hairline)] px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                        </div>
                        )}
                        <CanvasStage aspect={2} zoom={canvasZoom} fitToken={canvasFitToken}>
                        <div className="relative flex w-full items-stretch bg-white shadow-sm">
                          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                          <div className="aspect-square w-1/2">
                            <IntroPagePreview
                              coverPhoto={coverPhoto}
                              coverTitle={coverTitle}
                              introPublishDate={introPublishDate}
                              introMakerName={introMakerName}
                            />
                          </div>
                          <div className="relative aspect-square w-1/2 overflow-hidden bg-[var(--color-ivory)]">
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-black/10 to-transparent" />
                          </div>
                        </div>
                        </CanvasStage>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const i = selectedPageKey;
                      const spread = customSpreads[i];
                      const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
                      const leftPhotos = leftIndexes.map((idx) => photos[idx]).filter(Boolean);
                      const rightPhotos = rightIndexes.map((idx) => photos[idx]).filter(Boolean);
                      // "변형" 패널용 — 지금 이 스프레드에서 선택된 이미지박스예요(2026-09 요청,
                      // 일러스트레이터 변형 패널처럼 위치·크기를 숫자로 직접 입력).
                      const activeBox =
                        activeImageBox?.spreadIndex === i
                          ? (spread.imageBoxes ?? []).find((b) => b.id === activeImageBox.boxId)
                          : undefined;
                      return (
                        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[var(--color-hairline)] bg-white p-4">
                          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
                            {editorMode === "edit" && (
                            <div className="flex gap-2 lg:shrink-0">
                              {/* 왼쪽 아이콘 메뉴 — 사진/배경/표지변경/스티커/손글씨스티커/텍스트를
                                  아이콘으로 골라요. 예전엔 배경만 항상 펼쳐져 있고 사진·스티커
                                  추가는 캔버스에 마우스를 올려야만 보이는 숨은 버튼이었는데,
                                  이제 다른 편집기들처럼 아이콘을 눌러야 해당 메뉴가 열려요. */}
                              <div className="flex flex-row gap-1 overflow-x-auto lg:w-16 lg:shrink-0 lg:flex-col lg:overflow-visible">
                                {/* "레이아웃" 탭은 사진 1장=이미지박스 1개 구조를 쓰는 "AI 맞춤
                                    레이아웃" 상품에서만 의미가 있어요(다른 고정 템플릿 상품은
                                    격자 칸 방식이라 이 기능이 적용되지 않아요). */}
                                {EDIT_TABS.filter((tab) => tab.id !== "layout" || isAiAuto).map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveEditTab(tab.id)}
                                    className={`flex shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-2 text-[10px] transition ${
                                      activeEditTab === tab.id
                                        ? "bg-[var(--color-sky)]/15 text-[var(--color-sky)]"
                                        : "text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                    }`}
                                  >
                                    <span className="text-base leading-none" aria-hidden>
                                      {tab.icon}
                                    </span>
                                    <span className="whitespace-nowrap">{tab.label}</span>
                                  </button>
                                ))}
                              </div>
                              <div className="flex min-h-0 flex-col overflow-y-auto lg:w-64 lg:shrink-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {i === 0 ? "표지/1" : formatSpreadPageLabel(i)}페이지
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={i === 0}
                                  onClick={() => setSelectedPageKey(i - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-hairline)] text-sm disabled:opacity-30"
                                >
                                  ‹
                                </button>
                                <button
                                  type="button"
                                  disabled={i === customSpreads.length - 1}
                                  onClick={() => setSelectedPageKey(i + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-hairline)] text-sm disabled:opacity-30"
                                >
                                  ›
                                </button>
                              </div>
                            </div>
                            <div className="mt-3">
                              {activeEditTab === "photo" && (
                                <div className="flex flex-col gap-3">
                                  {activeImageBox?.spreadIndex === i && !imageBoxPhotoEditActive && (
                                    <div className="rounded-lg border border-[var(--color-hairline)] bg-white p-3">
                                      <p className="text-xs font-medium text-[var(--color-charcoal)]">
                                        선택한 사진박스
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                        박스 크기·위치는 캔버스에서 손잡이로 조절하거나, 아래
                                        버튼으로 펼침면 전체를 한 번에 채울 수 있어요.
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.fillSpread()
                                          }
                                          className="rounded-full bg-[var(--color-brand-purple)] px-3 py-1 text-[11px] text-white"
                                        >
                                          스프레드 전체 채우기
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {/* 변형 패널 — 일러스트레이터의 "변형" 패널처럼, 선택한 사진박스의
                                      위치(X·Y)와 크기(폭·높이)를 mm 숫자로 직접 입력해서 조절해요
                                      (2026-09 요청). 위 눈금자와 똑같은 기준(재단선을 0mm로 보는
                                      실제 인쇄 mm)이라, 여기 적는 숫자가 캔버스 위 눈금자 숫자와
                                      그대로 맞아떨어져요. */}
                                  {activeBox && (
                                    <div className="rounded-lg border border-[var(--color-hairline)] bg-white p-3">
                                      <p className="text-xs font-medium text-[var(--color-charcoal)]">
                                        변형 (mm)
                                      </p>
                                      <div className="mt-2 grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="mb-1 block text-[10px] text-[var(--color-charcoal)]/60">
                                            X
                                          </label>
                                          <input
                                            type="number"
                                            step={1}
                                            value={Math.round(pctXToMm(activeBox.xPct) * 10) / 10}
                                            onChange={(e) => {
                                              const mm = Number(e.target.value);
                                              if (Number.isFinite(mm)) {
                                                handleImageBoxChange(i, activeBox.id, { xPct: mmToPctX(mm) });
                                              }
                                            }}
                                            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-[10px] text-[var(--color-charcoal)]/60">
                                            Y
                                          </label>
                                          <input
                                            type="number"
                                            step={1}
                                            value={Math.round(pctYToMm(activeBox.yPct) * 10) / 10}
                                            onChange={(e) => {
                                              const mm = Number(e.target.value);
                                              if (Number.isFinite(mm)) {
                                                handleImageBoxChange(i, activeBox.id, { yPct: mmToPctY(mm) });
                                              }
                                            }}
                                            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-[10px] text-[var(--color-charcoal)]/60">
                                            폭
                                          </label>
                                          <input
                                            type="number"
                                            step={1}
                                            min={1}
                                            value={Math.round(widthPctToMm(activeBox.widthPct) * 10) / 10}
                                            onChange={(e) => {
                                              const mm = Number(e.target.value);
                                              if (Number.isFinite(mm) && mm > 0) {
                                                handleImageBoxChange(i, activeBox.id, { widthPct: widthMmToPct(mm) });
                                              }
                                            }}
                                            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                          />
                                        </div>
                                        <div>
                                          <label className="mb-1 block text-[10px] text-[var(--color-charcoal)]/60">
                                            높이
                                          </label>
                                          <input
                                            type="number"
                                            step={1}
                                            min={1}
                                            value={Math.round(heightPctToMm(activeBox.heightPct) * 10) / 10}
                                            onChange={(e) => {
                                              const mm = Number(e.target.value);
                                              if (Number.isFinite(mm) && mm > 0) {
                                                handleImageBoxChange(i, activeBox.id, { heightPct: heightMmToPct(mm) });
                                              }
                                            }}
                                            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {activeImageBox?.spreadIndex === i && imageBoxPhotoEditActive && (
                                    <div className="rounded-lg border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-3">
                                      <p className="text-xs font-medium text-[var(--color-brand-purple)]">
                                        사진 위치 조정 중
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                        박스 안에서 사진의 위치·확대·반전을 조정해요(박스 자체
                                        크기는 캔버스에서 손잡이로 조절해주세요).
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          title="축소"
                                          onClick={() =>
                                            activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.zoomOut()
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-[var(--color-charcoal)]/70 shadow-sm"
                                        >
                                          −
                                        </button>
                                        <button
                                          type="button"
                                          title="확대"
                                          onClick={() =>
                                            activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.zoomIn()
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-[var(--color-charcoal)]/70 shadow-sm"
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          title="좌우 반전"
                                          onClick={() =>
                                            activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.toggleFlip()
                                          }
                                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-[var(--color-charcoal)]/70 shadow-sm"
                                        >
                                          ⇌
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            activeImageBox &&
                                            imageBoxHandlesRef.current.get(activeImageBox.boxId)?.resetPhotoPosition()
                                          }
                                          className="rounded-full bg-white px-3 py-1 text-[11px] text-[var(--color-charcoal)]/70 shadow-sm"
                                        >
                                          초기화
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            activeImageBox &&
                                            imageBoxHandlesRef.current.get(activeImageBox.boxId)?.exitPhotoEditMode()
                                          }
                                          className="rounded-full bg-[var(--color-charcoal)] px-3 py-1 text-[11px] text-white"
                                        >
                                          완료
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-medium text-[var(--color-charcoal)]/70">
                                      책 전체 사진 ({photos.length}장)
                                    </p>
                                    <label className="mt-1.5 inline-block cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-4 py-2 text-xs font-medium text-white transition hover:opacity-90">
                                      사진 더 올리기
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                      />
                                    </label>
                                    {lowResCount > 0 && (
                                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600 break-keep">
                                        해상도가 낮은 사진이 {lowResCount}장 있어요. 인쇄 시 흐릿하게
                                        나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
                                      </p>
                                    )}
                                  </div>
                                  <div className="border-t border-[var(--color-hairline)] pt-3">
                                      <p className="text-xs font-medium text-[var(--color-charcoal)]/70">
                                        이 페이지에 사진 추가
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                        끌어서 옮기고 크기를 조절할 수 있는 사진을 이 펼침면에
                                        자유롭게 얹어요(페이지 구성용 사진과는 별개예요).
                                      </p>
                                      <label className="mt-1.5 inline-block cursor-pointer rounded-full border border-[var(--color-sky)] px-4 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10">
                                        + 사진 추가
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleAddImageBox(i, file);
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                    </div>
                                </div>
                              )}
                              {activeEditTab === "layout" && (() => {
                                // 스프레드 1(i===0)의 왼쪽 면은 표지 뒷면이라 인쇄 안 되는 빈
                                // 면이에요 — 그래서 "왼쪽 페이지"·"펼침면 전체"는 고를 수 없고
                                // "오른쪽 페이지"(=1p)만 적용 가능해요.
                                const rangeOptions: { id: LayoutApplyRange; label: string }[] =
                                  i === 0
                                    ? [{ id: "right", label: "오른쪽 페이지(1p)" }]
                                    : [
                                        { id: "left", label: "왼쪽 페이지" },
                                        { id: "right", label: "오른쪽 페이지" },
                                        { id: "spread", label: "펼침면 전체" },
                                      ];
                                const effectiveRange: LayoutApplyRange =
                                  i === 0 ? "right" : layoutApplyRange;
                                const boxesInRange = imageBoxesInRange(spread.imageBoxes ?? [], effectiveRange);
                                const rangePhotoCount = boxesInRange.length;
                                const candidates = templatesForRange(effectiveRange);
                                const visibleTemplates = candidates.filter((t) => {
                                  if (layoutCountFilter === "auto") return t.photoCount === rangePhotoCount;
                                  if (layoutCountFilter === "all") return true;
                                  if (layoutCountFilter === "6+") return t.photoCount >= 6;
                                  return t.photoCount === layoutCountFilter;
                                });
                                return (
                                  <div className="flex flex-col gap-3">
                                    <div>
                                      <p className="text-xs font-medium text-[var(--color-charcoal)]/70">적용 범위</p>
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {rangeOptions.map((opt) => (
                                          <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                              setLayoutApplyRange(opt.id);
                                              setLayoutApplyMessage(null);
                                            }}
                                            className={`rounded-full border px-3 py-1 text-[11px] transition ${
                                              effectiveRange === opt.id
                                                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                                                : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
                                            }`}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      </div>
                                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50">
                                        지금 이 범위엔 사진이 {rangePhotoCount}장 있어요.
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-[var(--color-charcoal)]/70">사진 개수</p>
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        {LAYOUT_COUNT_FILTERS.map((f) => (
                                          <button
                                            key={String(f.id)}
                                            type="button"
                                            onClick={() => setLayoutCountFilter(f.id)}
                                            className={`rounded-full px-2.5 py-1 text-[10px] transition ${
                                              layoutCountFilter === f.id
                                                ? "bg-[var(--color-brand-purple)] text-white"
                                                : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60"
                                            }`}
                                          >
                                            {f.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    {layoutApplyMessage && (
                                      <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600 break-keep">
                                        {layoutApplyMessage}
                                      </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                      {visibleTemplates.map((t) => (
                                        <button
                                          key={t.id}
                                          type="button"
                                          onClick={() => applyLayoutTemplate(i, effectiveRange, t)}
                                          className={`rounded-lg border p-1.5 text-left transition ${
                                            t.photoCount === rangePhotoCount
                                              ? "border-[var(--color-hairline)] hover:border-[var(--color-sky)]"
                                              : "border-[var(--color-hairline)] opacity-50"
                                          }`}
                                        >
                                          <div
                                            className="relative w-full overflow-hidden rounded bg-[var(--color-ivory)]"
                                            style={{ aspectRatio: t.scope === "spread" ? "2 / 1" : "1 / 1" }}
                                          >
                                            {t.slots.map((slot, idx) => (
                                              <div
                                                key={idx}
                                                className="absolute rounded-[2px] border border-white bg-[var(--color-sky)]/60"
                                                style={{
                                                  left: `${slot.xPct}%`,
                                                  top: `${slot.yPct}%`,
                                                  width: `${slot.widthPct}%`,
                                                  height: `${slot.heightPct}%`,
                                                }}
                                              />
                                            ))}
                                          </div>
                                          <p className="mt-1 truncate text-[10px] text-[var(--color-charcoal)]/70">
                                            {t.name}
                                            {t.hasCaptionSpace ? " · 문구 공간" : ""}
                                          </p>
                                          {t.photoCount !== rangePhotoCount && (
                                            <p className="mt-0.5 text-[9px] font-medium text-red-500">
                                              사진 {t.photoCount}장 필요
                                            </p>
                                          )}
                                        </button>
                                      ))}
                                      {visibleTemplates.length === 0 && (
                                        <p className="col-span-2 text-[11px] text-[var(--color-charcoal)]/40">
                                          이 조건에 맞는 템플릿이 없어요.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              {activeEditTab === "background" && (
                              <div className="flex flex-wrap gap-1 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setBackgroundTab("solid")}
                                  className={`rounded-full px-3 py-1 transition ${
                                    backgroundTab === "solid"
                                      ? "bg-[var(--color-sky)] text-white"
                                      : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
                                  }`}
                                >
                                  단색
                                </button>
                                {backgroundPatternCategories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setBackgroundTab(cat.id)}
                                    className={`rounded-full px-3 py-1 transition ${
                                      backgroundTab === cat.id
                                        ? "bg-[var(--color-sky)] text-white"
                                        : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                              )}
                              {activeEditTab === "background" && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {backgroundTab === "solid" ? (
                                  <>
                                    {SPREAD_BACKGROUND_PRESETS.map((preset) => {
                                      const isActive =
                                        !spread.backgroundPattern &&
                                        (spread.backgroundColor ?? "#ffffff").toLowerCase() ===
                                          preset.color.toLowerCase();
                                      return (
                                        <button
                                          key={preset.color}
                                          type="button"
                                          title={preset.label}
                                          onClick={() =>
                                            handleChangeBackground(
                                              i,
                                              preset.color === "#ffffff" ? undefined : preset.color
                                            )
                                          }
                                          className={`h-6 w-6 rounded-full border transition ${
                                            isActive
                                              ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                              : "border-[var(--color-hairline)]"
                                          }`}
                                          style={{ backgroundColor: preset.color }}
                                        />
                                      );
                                    })}
                                    <label
                                      title="색 직접 고르기"
                                      className="relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[var(--color-charcoal)]/40 text-[10px] text-[var(--color-charcoal)]/60"
                                    >
                                      +
                                      <input
                                        type="color"
                                        value={spread.backgroundColor ?? "#ffffff"}
                                        onChange={(e) => handleChangeBackground(i, e.target.value)}
                                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                      />
                                    </label>
                                  </>
                                ) : (
                                  backgroundPatterns
                                    .filter((p) => p.category === backgroundTab)
                                    .map((preset) => {
                                      const isActive = spread.backgroundPattern === preset.id;
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          title={preset.label}
                                          onClick={() =>
                                            handleChangePattern(i, isActive ? undefined : preset.id)
                                          }
                                          className={`h-8 w-8 rounded-full border transition ${
                                            isActive
                                              ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                              : "border-[var(--color-hairline)]"
                                          }`}
                                          style={{ background: patternToCssBackground(preset) }}
                                        />
                                      );
                                    })
                                )}
                              </div>
                              )}
                              {activeEditTab === "theme" && (
                                <div className="rounded-lg bg-[var(--color-ivory)]/60 p-3 text-[11px] text-[var(--color-charcoal)]/60 break-keep">
                                  테마변경은 준비 중이에요. 완성되면 여기서 디자인 테마를 골라
                                  사진 배치를 한 번에 바꿀 수 있게 돼요.
                                </div>
                              )}
                              {activeEditTab === "sticker" && (
                                <div className="grid grid-cols-4 gap-1.5">
                                  {STICKERS.map((sticker) => (
                                    <button
                                      key={sticker.id}
                                      type="button"
                                      title={sticker.label}
                                      onClick={() => handleAddSticker(i, sticker.url)}
                                      className="flex h-10 w-10 items-center justify-center rounded border border-transparent p-1 transition hover:border-[var(--color-hairline)] hover:bg-[var(--color-ivory)] disabled:opacity-30"
                                    >
                                      <img src={sticker.url} alt={sticker.label} className="h-full w-full object-contain" />
                                    </button>
                                  ))}
                                </div>
                              )}
                              {activeEditTab === "handwriting" && (
                                <div className="rounded-lg bg-[var(--color-ivory)]/60 p-3 text-[11px] text-[var(--color-charcoal)]/60 break-keep">
                                  손글씨 스티커는 준비 중이에요. 곧 추가할게요.
                                </div>
                              )}
                              {activeEditTab === "text" && (
                                <div className="flex flex-col gap-2">
                                  {i !== 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleAddTextBox(i, "left")}
                                      className="rounded-full border border-[var(--color-sky)] px-4 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10"
                                    >
                                      + 왼쪽 페이지에 글상자 추가
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleAddTextBox(i, "right")}
                                    className="rounded-full border border-[var(--color-sky)] px-4 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10"
                                  >
                                    + 오른쪽 페이지에 글상자 추가
                                  </button>
                                </div>
                              )}
                            </div>
                              </div>
                            </div>
                            )}
                            <CanvasStage aspect={guideSpreadWorkMm / guidePageWorkMm} zoom={canvasZoom} fitToken={canvasFitToken}>
                            <div
                              className={
                                isPrintPreview
                                  ? "relative mx-auto w-full rounded-lg bg-[var(--color-charcoal)]/[0.07] p-8 sm:p-12"
                                  : ""
                              }
                            >
                              {isPrintPreview && (
                                <div className="pointer-events-none absolute inset-8 bg-white shadow-[0_25px_55px_-12px_rgba(0,0,0,0.5)] sm:inset-12" />
                              )}
                              <div
                                className="relative overflow-hidden"
                                style={
                                  !isPrintPreview
                                    ? {
                                        paddingLeft: RULER_THICKNESS_PX.w,
                                        paddingTop: Math.max(0, RULER_THICKNESS_PX.h - SPREAD_BOX_MARGIN_TOP_PX),
                                      }
                                    : undefined
                                }
                              >
                                {!isPrintPreview && (
                                  <>
                                    {/* 눈금자 왼쪽 위 빈 모서리 칸(일러스트레이터 편집대지와 같은 자리) */}
                                    <div
                                      className="pointer-events-none absolute left-0 top-0 z-30 bg-[var(--color-ivory)]"
                                      style={{ width: RULER_THICKNESS_PX.w, height: RULER_THICKNESS_PX.h }}
                                    />
                                    <div
                                      className="pointer-events-none absolute right-0 top-0 z-30"
                                      style={{ left: RULER_THICKNESS_PX.w, height: RULER_THICKNESS_PX.h }}
                                    >
                                      <Ruler
                                        orientation="horizontal"
                                        totalMm={guideSpreadWorkMm}
                                        zeroOffsetMm={GUIDE_BLEED_MM}
                                        trimTotalMm={(guidePageWorkMm - 2 * GUIDE_BLEED_MM) * 2}
                                      />
                                    </div>
                                    <div
                                      className="pointer-events-none absolute bottom-0 left-0 z-30"
                                      style={{ top: RULER_THICKNESS_PX.h, width: RULER_THICKNESS_PX.w }}
                                    >
                                      <Ruler orientation="vertical" totalMm={guidePageWorkMm} zeroOffsetMm={GUIDE_BLEED_MM} />
                                    </div>
                                  </>
                                )}
                            <div
                              className={`group relative mt-3 flex w-full items-start bg-white ${
                                isPrintPreview ? "" : "shadow-sm"
                              }`}
                              style={
                                isPrintPreview
                                  ? { transform: `scale(${previewScaleX}, ${previewScaleY})`, transformOrigin: "center center" }
                                  : undefined
                              }
                            >
                              {/* 스프레드 접힘선 - 두 페이지를 하나로 이어 보이게 하고, 가운데는 이 선 하나로만
                                  구분해요. "접힘·제본 경계" 안내선을 켜면 그 옆으로 옅은 배경(BindingGuide)이
                                  더해질 뿐, 선은 늘지 않아요. */}
                              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                              {/* 자유 배치 이미지박스 — 왼쪽·오른쪽 낱장이 아니라 스프레드 전체
                                  위에 얹어서, 박스를 끌어 페이지 경계를 자유롭게 넘나들 수 있어요. */}
                              <ImageBoxLayer
                                boxes={spread.imageBoxes ?? []}
                                onChange={(boxId, c) => handleImageBoxChange(i, boxId, c)}
                                onDelete={(boxId) => handleDeleteImageBox(i, boxId)}
                                activeBoxId={activeImageBox?.spreadIndex === i ? activeImageBox.boxId : null}
                                onSelect={(boxId) => {
                                  setActiveTextBox(null);
                                  setImageBoxPhotoEditActive(false);
                                  setActiveImageBox({ spreadIndex: i, boxId });
                                }}
                                onPhotoEditModeChange={setImageBoxPhotoEditActive}
                                registerBoxRef={(boxId, handle) => {
                                  if (handle) imageBoxHandlesRef.current.set(boxId, handle);
                                  else imageBoxHandlesRef.current.delete(boxId);
                                }}
                                guidesX={imageBoxGuidesX}
                                guidesY={imageBoxGuidesY}
                              />
                              <div className="group relative w-1/2">
                                {i === 0 ? (
                                  <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-ivory)] p-4" />
                                ) : (
                                  <>
                                    {!isAiAuto && (
                                      <select
                                        value={spread.left}
                                        onChange={(e) => handleChangeLayout(i, "left", e.target.value as PageTemplateId)}
                                        className="absolute left-1 top-1 z-10 rounded bg-white/90 px-1 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                                      >
                                        {layoutOptions.map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    {renderPage(
                                      spread.left,
                                      leftPhotos,
                                      leftIndexes,
                                      handlePhotoTransform,
                                      handleCaptionChange,
                                      requiredMinPx,
                                      resolveSpreadBackgroundCss(spread, "right"),
                                      !isAiAuto && (spread.left === "full" || spread.left === "fullMargin") && leftIndexes[0] !== undefined
                                        ? () => handleConvertPhotoToImageBox(i, "left", leftIndexes[0])
                                        : undefined
                                    )}
                                    <TextBoxLayer
                                      boxes={spread.textBoxesLeft ?? []}
                                      onAdd={() => handleAddTextBox(i, "left")}
                                      showAddButton={false}
                                      onChange={(boxId, c) => handleTextBoxChange(i, "left", boxId, c)}
                                      activeBoxId={
                                        activeTextBox?.ref.scope === "spread" &&
                                        activeTextBox.ref.spreadIndex === i &&
                                        activeTextBox.ref.side === "left"
                                          ? activeTextBox.boxId
                                          : null
                                      }
                                      onSelect={(boxId) =>
                                        setActiveTextBox({ ref: { scope: "spread", spreadIndex: i, side: "left" }, boxId })
                                      }
                                    />
                                  </>
                                )}
                              </div>
                              <div className="group relative w-1/2">
                                {!isAiAuto && (
                                  <select
                                    value={spread.right}
                                    onChange={(e) => handleChangeLayout(i, "right", e.target.value as PageTemplateId)}
                                    className="absolute left-1 top-1 z-10 rounded bg-white/90 px-1 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                                  >
                                    {layoutOptions.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {renderPage(
                                  spread.right,
                                  rightPhotos,
                                  rightIndexes,
                                  handlePhotoTransform,
                                  handleCaptionChange,
                                  requiredMinPx,
                                  resolveSpreadBackgroundCss(spread, "left"),
                                  !isAiAuto && (spread.right === "full" || spread.right === "fullMargin") && rightIndexes[0] !== undefined
                                    ? () => handleConvertPhotoToImageBox(i, "right", rightIndexes[0])
                                    : undefined
                                )}
                                <TextBoxLayer
                                  boxes={spread.textBoxesRight ?? []}
                                  onAdd={() => handleAddTextBox(i, "right")}
                                  showAddButton={false}
                                  onChange={(boxId, c) => handleTextBoxChange(i, "right", boxId, c)}
                                  activeBoxId={
                                    activeTextBox?.ref.scope === "spread" &&
                                    activeTextBox.ref.spreadIndex === i &&
                                    activeTextBox.ref.side === "right"
                                      ? activeTextBox.boxId
                                      : null
                                  }
                                  onSelect={(boxId) =>
                                    setActiveTextBox({ ref: { scope: "spread", spreadIndex: i, side: "right" }, boxId })
                                  }
                                />
                              </div>
                              {!isPrintPreview && showGuidelines && (
                                <GuideLines trimXPct={trimXPct} trimYPct={trimYPct} />
                              )}
                              {!isPrintPreview && showInnerBindingGuide && (
                                <BindingGuide leftPct={bindingLeftEdgePct} rightPct={bindingRightEdgePct} />
                              )}
                              {!isPrintPreview && showInnerSafetyGuide &&
                                (innerSafetyFits ? (
                                  <>
                                    <CoverGuideBox
                                      left={leftPageSafetyLeftPct}
                                      right={leftPageSafetyRightPct}
                                      top={safetyYPct}
                                      bottom={100 - safetyYPct}
                                      variant="dotted"
                                    />
                                    <CoverGuideBox
                                      left={rightPageSafetyLeftPct}
                                      right={rightPageSafetyRightPct}
                                      top={safetyYPct}
                                      bottom={100 - safetyYPct}
                                      variant="dotted"
                                    />
                                  </>
                                ) : (
                                  <div className="pointer-events-none absolute inset-x-0 top-1 z-20 text-center text-[10px] text-[#e0524c]">
                                    페이지가 좁아 제본부 안전영역을 확보하지 못했어요
                                  </div>
                                ))}
                            </div>
                              </div>
                              </div>
                            </CanvasStage>
                            {editorMode === "edit" && activeTextBox && activeTextBox.ref.scope === "spread" && (
                              <div className="lg:w-72 lg:shrink-0">
                                <TextBoxToolbar
                                  box={activeTextBoxDef}
                                  onChange={(c) => updateTextBoxByRef(activeTextBox.ref, activeTextBox.boxId, c)}
                                  onDelete={() => deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId)}
                                  scopeLabel={textBoxScopeLabel(activeTextBox.ref)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                  </div>
              </div>

              {/* 하단 페이지 목록 — 2026-09 화면 배치 개편으로 예전에 미리보기 모드에서만
                  왼쪽에 보이던 목록을 여기로 옮겨서, 편집 중에도 항상 보이고 캔버스 영역을
                  가로로 넓게 쓸 수 있게 했어요. 페이지가 많아지면 이 줄 안에서만
                  가로 스크롤돼요. */}
              <div className="mt-3 flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const order = pageOrder;
                    const idx = order.findIndex((k) => k === selectedPageKey);
                    if (idx > 0) setSelectedPageKey(order[idx - 1]);
                  }}
                  disabled={pageOrder.findIndex((k) => k === selectedPageKey) <= 0}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-sm transition disabled:opacity-30"
                  aria-label="이전 페이지"
                >
                  ‹
                </button>
                <div className="flex flex-1 gap-2 overflow-x-auto rounded-xl border border-[var(--color-hairline)] bg-white p-2 shadow-sm">
                  {isPhotobook && (
                    <button
                      type="button"
                      onClick={() => setSelectedPageKey("cover")}
                      className={`shrink-0 rounded-lg border-2 p-1 transition ${
                        selectedPageKey === "cover" ? "border-[var(--color-sky)]" : "border-transparent"
                      }`}
                    >
                      <div
                        className="pointer-events-none flex h-14 overflow-hidden rounded bg-white shadow-sm"
                        style={{ aspectRatio: `${coverTotalWmm} / ${coverTotalHmm}` }}
                      >
                        <div
                          className="h-full"
                          style={{ width: `${coverBackPct}%`, backgroundColor: backCoverBackgroundColor ?? "#ffffff" }}
                        />
                        <div
                          className="h-full border-x border-[#1a1a1a]/60"
                          style={{ width: `${coverSpinePct}%`, backgroundColor: coverSpineBackgroundColor ?? "#f4f1ea" }}
                        />
                        <div
                          className="relative h-full overflow-hidden"
                          style={{ width: `${coverFrontPct}%`, backgroundColor: coverFrontBackgroundColor ?? "#ffffff" }}
                        >
                          {coverPhoto && (
                            <img src={coverPhoto.url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">표지</p>
                    </button>
                  )}
                  {customSpreads.map((spread, i) => {
                    const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
                    const leftPhotos = leftIndexes.map((idx) => photos[idx]).filter(Boolean);
                    const rightPhotos = rightIndexes.map((idx) => photos[idx]).filter(Boolean);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPageKey(i)}
                        className={`shrink-0 rounded-lg border-2 p-1 transition ${
                          selectedPageKey === i ? "border-[var(--color-sky)]" : "border-transparent"
                        }`}
                      >
                        <div className="pointer-events-none relative h-14 overflow-hidden rounded bg-white shadow-sm" style={{ aspectRatio: "2 / 1" }}>
                          <div className="grid h-full grid-cols-2 overflow-hidden">
                            <div className="overflow-hidden">
                              {i === 0 ? (
                                <div className="flex h-full w-full items-center justify-center bg-[var(--color-ivory)]" />
                              ) : (
                                renderPage(
                                  spread.left,
                                  leftPhotos,
                                  leftIndexes,
                                  () => {},
                                  () => {},
                                  requiredMinPx,
                                  resolveSpreadBackgroundCss(spread, "right")
                                )
                              )}
                            </div>
                            <div className="overflow-hidden">
                              {renderPage(
                                spread.right,
                                rightPhotos,
                                rightIndexes,
                                () => {},
                                () => {},
                                requiredMinPx,
                                resolveSpreadBackgroundCss(spread, "left")
                              )}
                            </div>
                          </div>
                          {/* 자유 배치 이미지박스("AI 맞춤 레이아웃" 상품 등)는 위 격자 칸
                              렌더링(renderPage)이 사진을 전혀 안 그려요 — renderPage는 고정
                              템플릿 칸(photos 배열의 순번) 기준이라, 스프레드 전체 기준
                              자유 좌표인 imageBoxes는 아예 안 보고 있었어요(하단 썸네일이
                              빈칸처럼 보이던 버그의 원인). 그래서 imageBoxes는 실제 캔버스와
                              같은 스프레드 전체 0~100% 좌표를 그대로 써서 이 썸네일 위에
                              따로 겹쳐 그려요 — 별도 축소 계산 없이 그대로 얹으면 실제
                              배치와 항상 같은 자리에 보여요. */}
                          {(spread.imageBoxes ?? []).map((box) => (
                            <img
                              key={box.id}
                              src={box.url}
                              alt=""
                              className="pointer-events-none absolute rounded-[1px] border border-white/70 object-cover"
                              style={{
                                left: `${box.xPct}%`,
                                top: `${box.yPct}%`,
                                width: `${box.widthPct}%`,
                                height: `${box.heightPct}%`,
                                transform: box.flipX ? "scaleX(-1)" : undefined,
                              }}
                            />
                          ))}
                        </div>
                        <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">
                          {formatSpreadPageLabel(i)}
                        </p>
                      </button>
                    );
                  })}
                  {isPhotobook && (
                    <button
                      type="button"
                      onClick={() => setSelectedPageKey("intro")}
                      className={`shrink-0 rounded-lg border-2 p-1 transition ${
                        selectedPageKey === "intro" ? "border-[var(--color-sky)]" : "border-transparent"
                      }`}
                    >
                      <div className="pointer-events-none flex h-14 items-end overflow-hidden rounded bg-white p-1 shadow-sm" style={{ aspectRatio: "2 / 1" }}>
                        {coverPhoto && (
                          <img src={coverPhoto.url} alt="" className="h-1/2 w-1/2 rounded-sm object-cover" />
                        )}
                      </div>
                      <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">
                        소개 페이지
                      </p>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const order = pageOrder;
                    const idx = order.findIndex((k) => k === selectedPageKey);
                    if (idx >= 0 && idx < order.length - 1) setSelectedPageKey(order[idx + 1]);
                  }}
                  disabled={(() => {
                    const idx = pageOrder.findIndex((k) => k === selectedPageKey);
                    return idx < 0 || idx >= pageOrder.length - 1;
                  })()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white text-sm transition disabled:opacity-30"
                  aria-label="다음 페이지"
                >
                  ›
                </button>
                <span className="shrink-0 text-xs text-[var(--color-charcoal)]/50">
                  {pageOrder.findIndex((k) => k === selectedPageKey) + 1} / {pageOrder.length}
                </span>
              </div>
            </div>
          )}
        </div>

        <section className="mx-auto w-full max-w-5xl shrink-0 px-6 pb-24 pt-6 sm:px-10">
          {photos.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-[var(--color-charcoal)]/60 transition hover:text-[var(--color-charcoal)]">
                전체 사진 목록 보기 (순서 확인 · 삭제)
              </summary>
              {(() => {
                const pageCount = Math.max(1, Math.ceil(photos.length / PHOTO_GRID_PAGE_SIZE));
                const page = Math.min(photoGridPage, pageCount - 1);
                const start = page * PHOTO_GRID_PAGE_SIZE;
                const visiblePhotos = photos.slice(start, start + PHOTO_GRID_PAGE_SIZE);
                return (
                  <div className="mt-4">
                    {pageCount > 1 && (
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--color-charcoal)]/60">
                        <button
                          type="button"
                          onClick={() => setPhotoGridPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                          className="rounded-full border border-[var(--color-hairline)] px-3 py-1 transition disabled:opacity-30"
                        >
                          ‹ 이전
                        </button>
                        <span>
                          {page + 1} / {pageCount}페이지 · {start + 1}–
                          {Math.min(start + PHOTO_GRID_PAGE_SIZE, photos.length)}번째 (전체 {photos.length}장)
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoGridPage(Math.min(pageCount - 1, page + 1))}
                          disabled={page >= pageCount - 1}
                          className="rounded-full border border-[var(--color-hairline)] px-3 py-1 transition disabled:opacity-30"
                        >
                          다음 ›
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                      {visiblePhotos.map((photo, i) => {
                        const index = start + i;
                        return (
                          <div
                            key={index}
                            className="group relative aspect-square overflow-hidden border border-[var(--color-hairline)]"
                          >
                            <img
                              src={photo.url}
                              alt={`선택한 사진 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {isLowRes(photo, requiredMinPx / 2) && (
                              <span
                                title="인쇄 기준 화질이 낮아요"
                                className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-medium text-white"
                              >
                                저해상도
                              </span>
                            )}
                            <button
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </details>
          )}

          {photos.length > 0 && !isPhotoCountValid && (
            <p className="mt-6 text-sm text-red-500">
              {photos.length < requiredCount
                ? `사진이 ${requiredCount - photos.length}장 더 필요해요.`
                : `사진이 ${photos.length - requiredCount}장 더 많아요. ${photos.length - requiredCount}장을 빼주세요.`}
            </p>
          )}

          {photos.length > 0 &&
            (isPhotoCountValid ? (
              <button
                onClick={() => handleProceed(nextUrl, photos)}
                disabled={isSaving}
                className={`mt-10 rounded-full px-8 py-4 text-sm font-medium text-white transition ${
                  isSaving
                    ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                    : "bg-[var(--color-charcoal)] hover:opacity-90"
                }`}
              >
                {isGeneratingPrintFiles
                  ? "인쇄 파일 만드는 중..."
                  : isSaving
                    ? "사진 올리는 중..."
                    : "다음"}
              </button>
            ) : (
              <button
                disabled
                className="mt-10 cursor-not-allowed rounded-full bg-[var(--color-hairline)] px-8 py-4 text-sm font-medium text-white/70"
              >
                다음
              </button>
            ))}
        </section>
        </div>
      </main>
    );
  }

  const nextUrlSimple = `/checkout?product=${encodeURIComponent(
    productName
  )}&size=${selectedSizeInfo.id}&quantity=${quantity}`;

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-8 sm:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-hairline)]/30 hover:text-[var(--color-charcoal)]"
        >
          ←
        </button>
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm text-[var(--color-charcoal)]/60">
          {productName} · {selectedSizeInfo.label} · {quantity}개
        </p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          {productName === "텀블러" ? "요청사항을 확인해주세요" : "사진을 골라주세요"}
        </h1>
        <p className="mt-3 text-[var(--color-charcoal)]/70">
          {productName === "텀블러"
            ? "텀블러는 사진 대신 각인으로 제작해요. 참고할 사진이 있다면 함께 올려주셔도 좋아요. (선택)"
            : "이 상품은 사진 1장이 필요해요."}
        </p>

        {hasNoteFeature && (
          <div className="mt-6 border border-[var(--color-hairline)] bg-white px-5 py-4">
            <p className="text-xs font-medium text-[var(--color-charcoal)]/50 break-keep">
              앞에서 남기신 요청사항 · 수정하고 싶으면 바로 고칠 수 있어요
            </p>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="요청사항이 없다면 비워두셔도 돼요."
              rows={4}
              className="mt-3 w-full resize-none border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>
        )}

        <label className="mt-8 inline-block cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90">
          사진 선택하기
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </label>

        {photos.length === 1 && isLowRes(photos[0], requiredMinPx) && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 break-keep">
            이 사진은 인쇄 기준으로 해상도가 낮아요. 이대로 인쇄하면 흐릿하게 나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
          </p>
        )}

        {photos.length === 1 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <div className="mt-4 inline-block bg-white p-6 shadow-sm">
              <div
                className={`${selectedSizeInfo.aspect} w-64 p-3 ${
                  productName === "액자"
                    ? "border-8 border-[var(--color-charcoal)]"
                    : "rounded-[2rem] border-2 border-[var(--color-charcoal)]/40"
                }`}
              >
                <PhotoCell
                  photo={photos[0]}
                  requiredMinPx={requiredMinPx}
                  onChange={(c) => handlePhotoTransform(0, c)}
                />
              </div>
            </div>
          </div>
        )}

        {(photos.length > 0 ||
          (productName === "텀블러" && requestNote.trim() !== "")) && (
          <button
            onClick={() =>
              handleProceed(
                nextUrlSimple,
                photos,
                requestNote.trim() ? requestNote : undefined
              )
            }
            disabled={isSaving}
            className={`mt-10 rounded-full px-8 py-4 text-sm font-medium text-white transition ${
              isSaving
                ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                : "bg-[var(--color-charcoal)] hover:opacity-90"
            }`}
          >
            {isSaving
              ? productName === "텀블러"
                ? "신청 접수하는 중..."
                : "사진 올리는 중..."
              : productName === "텀블러"
                ? "제작 신청하기"
                : "다음"}
          </button>
        )}
      </section>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory)]" />}>
      <UploadPageContent />
    </Suspense>
  );
}
