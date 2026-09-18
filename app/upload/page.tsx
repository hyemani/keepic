"use client";

import { Suspense, useState, useRef, useEffect } from "react";
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
  generateAutoSpreads,
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

// 책등 제목의 글자 크기를 실제 mm 기준으로 재요(화면 미리보기용). lib/printCompose.ts의
// drawSpineTitleCanvas와 같은 원리예요 — 다만 "300dpi px" 대신 "mm"을 그대로 캔버스
// font-size 숫자로 써요(숫자 단위가 뭐든 비율만 맞으면 결과는 똑같아요). 이렇게 실제
// mm 크기를 구해서 화면에도 %(cqh) 단위로 넣으면, 창 크기가 바뀌어도 항상 책 실물
// 비율 그대로 커지고 작아져요(브라우저 창 크기와는 무관해요).
const SPINE_TEXT_SIDE_PADDING_MM_SCREEN = 0.5;
const SPINE_TITLE_MIN_FONT_MM = (12 / 72) * 25.4; // 12pt
const COVER_TITLE_PT_PRESETS = [12, 18, 24, 30, 36, 48, 60, 72];
function measureSpineTitleFontSizeMm(
  title: string,
  spineMm: number,
  maxLengthMm: number
): { sizeMm: number; textLengthMm: number } {
  if (!title || typeof document === "undefined") return { sizeMm: 0, textLengthMm: 0 };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { sizeMm: 0, textLengthMm: 0 };
  const maxCrossMm = Math.max(1, spineMm - SPINE_TEXT_SIDE_PADDING_MM_SCREEN * 2);
  let size = maxCrossMm;
  ctx.font = `bold ${size}px Pretendard, sans-serif`;
  let textLengthMm = ctx.measureText(title).width;
  while (size > SPINE_TITLE_MIN_FONT_MM && textLengthMm > maxLengthMm) {
    size -= 0.05;
    ctx.font = `bold ${size}px Pretendard, sans-serif`;
    textLengthMm = ctx.measureText(title).width;
  }
  if (size < SPINE_TITLE_MIN_FONT_MM) size = SPINE_TITLE_MIN_FONT_MM;
  ctx.font = `bold ${size}px Pretendard, sans-serif`;
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
    <div className="pointer-events-none absolute inset-0 z-20">
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
      className={variant === "solid" ? "pointer-events-none absolute z-20 border-2" : "pointer-events-none absolute z-20 border"}
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
}: {
  photo: Photo;
  requiredMinPx: number;
  onChange: (changes: Partial<Photo>) => void;
  // 사진이 프레임을 다 못 채울 때(전체 맞추기 등) 여백에 비치는 색이에요.
  // 지정 안 하면 기존처럼 아이보리색이에요.
  backgroundColor?: string;
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
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  const resizeStart = useRef({ mouseY: 0, heightPct: 0, cellH: 1 });
  const resizeWidthStart = useRef({ mouseX: 0, widthPct: 0, cellW: 1 });

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

  // 세로 크기 조절 손잡이예요 — 가로폭(widthPct)은 고정이고, 아래쪽으로 끌어서 높이만
  // 늘리거나 줄여요(일러스트레이터의 텍스트박스 도구처럼요).
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    const boxRect = boxRef.current?.getBoundingClientRect();
    const cellH = cellRect?.height || 1;
    const currentHeightPct = box.heightPct ?? (boxRect ? (boxRect.height / cellH) * 100 : 10);
    resizeStart.current = { mouseY: e.clientY, heightPct: currentHeightPct, cellH };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const dyPct = ((e.clientY - resizeStart.current.mouseY) / resizeStart.current.cellH) * 100;
      const nextHeight = Math.min(96, Math.max(4, resizeStart.current.heightPct + dyPct));
      onChange({ heightPct: nextHeight });
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

  // 가로 크기 조절 손잡이예요 — 오른쪽으로 끌어서 widthPct를 줄이거나 늘려요.
  function handleResizeWidthStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeWidthStart.current = { mouseX: e.clientX, widthPct: box.widthPct, cellW: cellRect?.width || 1 };
    setIsResizingWidth(true);
  }

  useEffect(() => {
    if (!isResizingWidth) return;
    function handleMouseMove(e: MouseEvent) {
      const dxPct = ((e.clientX - resizeWidthStart.current.mouseX) / resizeWidthStart.current.cellW) * 100;
      const nextWidth = Math.min(96, Math.max(6, resizeWidthStart.current.widthPct + dxPct));
      onChange({ widthPct: nextWidth });
    }
    function handleMouseUp() {
      setIsResizingWidth(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingWidth]);

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
        rows={1}
        placeholder="텍스트 입력"
        style={{
          color: box.color,
          fontFamily: box.fontFamily,
          fontSize: `${0.85 * box.fontScale}rem`,
          textAlign: box.align,
          fontWeight: box.bold ? 700 : 400,
        }}
        className={`w-full cursor-text resize-none border-none bg-transparent leading-snug outline-none ${
          box.heightPct !== undefined ? "h-full overflow-hidden" : "overflow-hidden"
        }`}
      />
      {/* 아래쪽 손잡이로 세로, 오른쪽 손잡이로 가로 크기를 조절해요 — 일러스트레이터
          텍스트박스처럼요. */}
      {isActive && (
        <>
          <div
            onMouseDown={handleResizeStart}
            title="끌어서 세로 크기 조절"
            className="absolute -bottom-1.5 left-1/2 z-40 h-3 w-3 -translate-x-1/2 cursor-ns-resize rounded-sm border border-white bg-[var(--color-sky)] shadow"
          />
          <div
            onMouseDown={handleResizeWidthStart}
            title="끌어서 가로 크기 조절"
            className="absolute top-1/2 z-40 h-3 w-3 -translate-y-1/2 translate-x-1/2 cursor-ew-resize rounded-sm border border-white bg-[var(--color-sky)] shadow"
            style={{ right: "-6px" }}
          />
        </>
      )}
    </div>
  );
}

// 지금 선택된 텍스트박스 하나를 고치는 상단 고정 툴바예요. 박스마다 따로 뜨던 작은
// 팝업 툴바 대신, 화면 맨 위에 하나만 두고(예시로 받은 전문 편집기 화면처럼) 폰트·크기·
// 정렬·굵게·색·삭제를 여기서 한 번에 다뤄요. 선택된 박스가 없으면 안내 문구만 보여줘요.
function TextBoxToolbar({
  box,
  onChange,
  onDelete,
}: {
  box: TextBoxDef | null;
  onChange: (changes: Partial<TextBoxDef>) => void;
  onDelete: () => void;
}) {
  function cycleAlign() {
    if (!box) return;
    const order: TextBoxDef["align"][] = ["left", "center", "right"];
    const next = order[(order.indexOf(box.align) + 1) % order.length];
    onChange({ align: next });
  }

  return (
    <div className="sticky top-0 z-40 mb-3 hidden flex-wrap items-center gap-2 rounded-xl border border-[var(--color-hairline)] bg-white/95 px-3 py-2 shadow-sm backdrop-blur landscape:flex lg:flex">
      {box ? (
        <>
          <span className="text-[11px] font-medium text-[var(--color-charcoal)]/60">텍스트박스</span>
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
            title="정렬 바꾸기"
            onClick={cycleAlign}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-xs"
          >
            {box.align === "left" ? "좌" : box.align === "center" ? "중" : "우"}
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
}: {
  boxes: TextBoxDef[];
  onAdd: () => void;
  onChange: (boxId: string, changes: Partial<TextBoxDef>) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
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
      <button
        type="button"
        onClick={onAdd}
        className="absolute right-1 top-1 z-20 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
      >
        + 텍스트 추가
      </button>
    </>
  );
}

// 자유 배치 이미지박스 하나예요 — 텍스트박스와 같은 방식으로 끌어서 옮기고, 오른쪽 아래
// 손잡이로 크기를 조절해요(사진이 찌그러지지 않도록 가로세로 비율은 그대로 유지해요).
// xPct·widthPct 등은 "스프레드 전체 폭"을 100%로 보는 좌표라서, 페이지 가운데(경계)를
// 자유롭게 넘나들며 배치할 수 있어요.
function ImageBoxOverlay({
  box,
  onChange,
  onDelete,
  isActive,
  onSelect,
}: {
  box: ImageBoxDef;
  onChange: (changes: Partial<ImageBoxDef>) => void;
  onDelete: () => void;
  isActive: boolean;
  onSelect: () => void;
}) {
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  const resizeStart = useRef({ mouseX: 0, widthPct: 0, cellW: 1 });

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
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
      const nextX = Math.min(100 - 4, Math.max(0, dragStart.current.xPct + dxPct));
      const nextY = Math.min(100 - 4, Math.max(0, dragStart.current.yPct + dyPct));
      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging]);

  // 오른쪽 아래 손잡이 — 가로로 끌면 가로폭이 바뀌고, 세로 크기는 사진 원본 비율 그대로
  // 자동으로 따라와요(찌그러지지 않아요). 스프레드 전체 폭이 페이지(정사각형) 두 배라서,
  // "가로 %"와 "세로 %"의 실제 축척이 2:1이에요 — 그 비율까지 감안해서 계산해요.
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = { mouseX: e.clientX, widthPct: box.widthPct, cellW: cellRect?.width || 1 };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const dxPct = ((e.clientX - resizeStart.current.mouseX) / resizeStart.current.cellW) * 100;
      const nextWidth = Math.min(96, Math.max(6, resizeStart.current.widthPct + dxPct));
      const nextHeight = 2 * nextWidth * (box.naturalHeight / box.naturalWidth);
      onChange({ widthPct: nextWidth, heightPct: nextHeight });
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
  }, [isResizing, box.naturalHeight, box.naturalWidth]);

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      className={`absolute z-[25] cursor-move overflow-hidden border transition ${
        isActive ? "border-[var(--color-sky)]" : "border-transparent hover:border-[var(--color-sky)]/40"
      }`}
      style={{ left: `${box.xPct}%`, top: `${box.yPct}%`, width: `${box.widthPct}%`, height: `${box.heightPct}%` }}
    >
      <img src={box.url} alt="" draggable={false} className="pointer-events-none h-full w-full select-none object-cover" />
      {isActive && (
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
          <div
            onMouseDown={handleResizeStart}
            title="끌어서 크기 조절(비율 유지)"
            className="absolute bottom-0 right-0 z-40 h-3.5 w-3.5 -translate-x-0.5 -translate-y-0.5 cursor-nwse-resize rounded-sm border border-white bg-[var(--color-sky)] shadow"
          />
        </>
      )}
    </div>
  );
}

// 한 스프레드(펼침면) 전체의 이미지박스들 + "+ 사진 추가" 버튼을 함께 그려요. 텍스트박스와
// 달리 왼쪽/오른쪽 낱장이 아니라 스프레드 전체 컨테이너 위에 얹어서, 박스가 페이지 경계를
// 자유롭게 넘나들 수 있게 해요.
function ImageBoxLayer({
  boxes,
  onAdd,
  onChange,
  onDelete,
  activeBoxId,
  onSelect,
}: {
  boxes: ImageBoxDef[];
  onAdd: (file: File) => void;
  onChange: (boxId: string, changes: Partial<ImageBoxDef>) => void;
  onDelete: (boxId: string) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
}) {
  return (
    <>
      {boxes.map((box) => (
        <ImageBoxOverlay
          key={box.id}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          onDelete={() => onDelete(box.id)}
          isActive={box.id === activeBoxId}
          onSelect={() => onSelect(box.id)}
        />
      ))}
      <label className="absolute right-1 top-7 z-20 cursor-pointer rounded-full bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100">
        + 사진 추가
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onAdd(file);
            e.target.value = "";
          }}
        />
      </label>
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
  onMove,
  onResize,
}: {
  title: string;
  emptyLabel: string;
  yPct: number;
  heightPct: number;
  fontSizeCqh: number; // 실제 mm 크기를 컨테이너 높이 대비 %(cqh)로 환산한 값 — 창 크기와 무관하게 항상 같은 실물 비율로 보여요.
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
          style={{ fontSize: `${fontSizeCqh}cqh`, lineHeight: 1, transform: "rotate(90deg)" }}
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
  backgroundColor?: string
) {
  const bgStyle = backgroundColor ? { background: backgroundColor } : undefined;

  if (templateId === "blank") {
    return <div className="aspect-square bg-white" style={bgStyle} />;
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
  const [customSpreads, setCustomSpreads] = useState<SpreadDef[]>(() =>
    template
      ? template.id === AI_AUTO_LAYOUT_TEMPLATE_ID
        ? generateAutoSpreads([], requiredSpreadCount)
        : fitSpreadsToCount(template.spreads, requiredSpreadCount)
      : []
  );

  // "AI 맞춤 레이아웃"을 선택했을 때만: 사진 개수가 바뀔 때마다(추가/삭제)
  // 사진 비율에 맞춰 스프레드 구성을 자동으로 다시 만들어요. 캡션 수정이나
  // 드래그처럼 개수가 그대로인 편집에는 반응하지 않아서, 사용자가 손으로
  // 바꾼 배치를 건드리지 않아요. (렌더링 도중 상태를 맞추는 React 권장 패턴 —
  // effect 대신 써서 불필요한 리렌더 한 번을 줄여요.) 스프레드 개수는 항상
  // requiredSpreadCount(내지 페이지 수 ÷ 2)에 맞춰져요.
  const isAiAuto = isPhotobook && templateId === AI_AUTO_LAYOUT_TEMPLATE_ID;
  const [autoLayoutPhotoCount, setAutoLayoutPhotoCount] = useState(0);
  if (isAiAuto && photos.length !== autoLayoutPhotoCount) {
    setAutoLayoutPhotoCount(photos.length);
    setCustomSpreads(generateAutoSpreads(photos, requiredSpreadCount));
  }
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
  // 편집 화면에서 재단선·안전선을 겹쳐 보여줄지 여부예요. (내지 스프레드에만 적용돼요)
  const [showGuidelines, setShowGuidelines] = useState(true);
  // 내지 펼침면 전용 — '안전영역'과 '접힘·제본 경계'를 각각 따로 켜고 끌 수 있어요
  // (표지는 이미 showCoverSafetyGuide/showCoverSpineGuide로 따로 있어요).
  const [showInnerSafetyGuide, setShowInnerSafetyGuide] = useState(true);
  const [showInnerBindingGuide, setShowInnerBindingGuide] = useState(true);
  // 표지 편집 화면 전용 안내선 켜기/끄기예요(뒤표지·책등·앞표지를 하나의 펼침면으로 보고
  // 계산해요 — 도련선/재단선은 펼침면 전체 기준, 안전영역은 뒤표지·책등·앞표지 각각 기준,
  // 책등 경계는 접힘 위치 전용 안내선이에요). 네 가지를 따로 켜고 끌 수 있어요.
  const [showCoverBleedGuide, setShowCoverBleedGuide] = useState(true);
  const [showCoverTrimGuide, setShowCoverTrimGuide] = useState(true);
  const [showCoverSafetyGuide, setShowCoverSafetyGuide] = useState(true);
  const [showCoverSpineGuide, setShowCoverSpineGuide] = useState(true);

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
  }

  function handleCaptionChange(photoIndex: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => (i === photoIndex ? { ...p, caption: value } : p)));
  }

  function handlePhotoTransform(index: number, changes: Partial<Photo>) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function handleRemovePhoto(index: number) {
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

  function handleAddImageBox(spreadIndex: number, file: File) {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const widthPct = 36;
      // 스프레드 전체 폭이 페이지(정사각형) 두 배라서, 가로 %와 세로 %의 실제 축척이
      // 2:1이에요 — 새 이미지박스도 처음부터 사진 원본 비율 그대로 보이도록 계산해요.
      const heightPct = 2 * widthPct * (img.naturalHeight / img.naturalWidth);
      const box: ImageBoxDef = {
        id: crypto.randomUUID(),
        url,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        xPct: 32,
        yPct: 25,
        widthPct,
        heightPct,
      };
      setCustomSpreads((prev) =>
        prev.map((s, i) => (i === spreadIndex ? { ...s, imageBoxes: [...(s.imageBoxes ?? []), box] } : s))
      );
      setActiveImageBox({ spreadIndex, boxId: box.id });
    };
    img.src = url;
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

  function handleDeleteImageBox(spreadIndex: number, boxId: string) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, imageBoxes: (s.imageBoxes ?? []).filter((b) => b.id !== boxId) } : s))
    );
    setActiveImageBox(null);
  }

  // ---- 편집기 단축키: 실행취소/다시실행, 복사/붙여넣기, 확대·축소 ----
  // 실행취소는 "지금까지 편집한 내용(사진 배치, 텍스트, 배경 등)" 전체를 하나의 스냅샷으로
  // 찍어뒀다가 되돌리는 방식이에요(필드 하나하나를 따로 추적하지 않아요). 스냅샷에는
  // 인쇄에 실제로 들어가는 내용만 담고, 화면 전용 설정(가이드선 표시 여부, 확대 배율,
  // 현재 보고 있는 페이지 등)은 담지 않아요 — 그런 것까지 되돌리면 오히려 헷갈려요.
  const [canvasZoom, setCanvasZoom] = useState(1);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringHistoryRef = useRef(false);
  const lastHistorySnapshotRef = useRef<string | null>(null);
  const copiedTextBoxRef = useRef<TextBoxDef | null>(null);
  const HISTORY_LIMIT = 60;

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
      return;
    }
    if (lastHistorySnapshotRef.current !== null && lastHistorySnapshotRef.current !== snap) {
      undoStackRef.current.push(lastHistorySnapshotRef.current);
      if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
      redoStackRef.current = [];
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
    const prevSnap = undoStackRef.current.pop();
    if (prevSnap === undefined) return;
    const current = lastHistorySnapshotRef.current ?? buildHistorySnapshot();
    redoStackRef.current.push(current);
    restoreHistorySnapshot(prevSnap);
  }

  function handleRedo() {
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
    const isPhotoCountValid = photos.length === requiredCount;
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
      spineTitleMaxLengthMm
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

        <section className="mx-auto max-w-5xl px-6 pt-8 sm:px-10">
          <p className="text-sm text-[var(--color-charcoal)]/60">
            {productName} · {displaySizeLabel} · {quantity}개 · {template.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">사진을 골라주세요</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70 break-keep">
            {isAiAuto
              ? `사진을 올리면 AI가 개수와 비율에 맞춰 자동으로 배치해드려요. (현재 ${photos.length}장 올림)`
              : `이 디자인은 정확히 사진 ${requiredCount}장이 필요해요. (현재 ${photos.length}장 선택됨)`}
          </p>
          <p className="mt-2 text-xs text-[var(--color-charcoal)]/50 break-keep">
            각 페이지 왼쪽 위 배치 메뉴로 구성을 바꿀 수 있어요. 사진 오른쪽 위 "Aa" 버튼으로 그 캡션만의 서체·크기·색상·정렬·위치를 따로 정할 수 있어요.
          </p>

          {isPdfLibTestMode && (
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
          )}

          <label className="mt-8 inline-block cursor-pointer rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90">
            사진 선택하기
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          </label>

          {lowResCount > 0 && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 break-keep">
              해상도가 낮은 사진이 {lowResCount}장 있어요. 인쇄 시 흐릿하게 나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
            </p>
          )}

        </section>

        <div className="w-full bg-[var(--color-hairline)]/15 px-4 pb-4 pt-10 sm:px-6 lg:px-8">
          {photos.length > 0 && (
            // PC 큰 화면에서는 좌우에 흰 여백이 남지 않도록 폭 제한을 풀어요(예전엔
            // max-w-6xl로 가운데 고정폭이었는데, 넓은 모니터에서 편집 캔버스 양옆이
            // 허전해 보인다는 피드백을 반영했어요 — 스위트북 편집기처럼 꽉 차게).
            <div className="mx-auto mt-2 max-w-6xl lg:max-w-none">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">페이지 편집</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal)]/60">
                    <input
                      type="checkbox"
                      checked={showGuidelines}
                      onChange={(e) => setShowGuidelines(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                    />
                    작업선·재단선
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal)]/60">
                    <input
                      type="checkbox"
                      checked={showInnerSafetyGuide}
                      onChange={(e) => setShowInnerSafetyGuide(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                    />
                    안전영역
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal)]/60">
                    <input
                      type="checkbox"
                      checked={showInnerBindingGuide}
                      onChange={(e) => setShowInnerBindingGuide(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                    />
                    접힘·제본 경계
                  </label>
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/50 break-keep">
                왼쪽에서 페이지를 골라 오른쪽 큰 화면에서 편집해주세요.
              </p>
              {(showGuidelines || showInnerSafetyGuide || showInnerBindingGuide) && (
                // 안내선 설명은 앱 전체에서 여기 한 곳에만 둬요(혜민님 확인, 2026-09).
                // 모바일에서는 항목마다 줄이 바뀌어서 정돈되게, 넓은 화면에서는 한 줄로
                // 이어붙여요.
                <ul className="mt-1 flex flex-col gap-0.5 text-[11px] text-[var(--color-charcoal)]/50 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-1.5">
                  {showGuidelines && (
                    <li className="break-keep">
                      <span className="font-semibold text-[#1a1a1a]">■ 작업선(파선)</span>(파일 맨 끝, 배경은 이
                      선까지 채워주세요) · <span className="font-semibold text-[#1a1a1a]">■ 재단선(실선)</span>
                      (실제로 잘리는 선)
                    </li>
                  )}
                  {showInnerSafetyGuide && (
                    <li className="break-keep">
                      <span className="font-semibold text-[#1a1a1a]">■ 안전영역(점선)</span>(왼쪽·오른쪽 페이지
                      각각, 글자·중요 사진은 이 안쪽에 배치해주세요 — 사진·배경은 밖으로 나가도 괜찮아요)
                    </li>
                  )}
                  {showInnerBindingGuide && (
                    <li className="break-keep">
                      <span className="font-semibold text-[#1a1a1a]">■ 제본 경계(이중선)</span>(두 페이지가 만나는
                      가운데 선, 옅은 음영은 제본 때문에 주의가 필요한 영역이에요)
                    </li>
                  )}
                </ul>
              )}

              {isAiAuto && photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomSpreads(generateAutoSpreads(photos, requiredSpreadCount))}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-sky)] px-4 py-2 text-sm font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10"
                >
                  <span aria-hidden>✨</span>
                  AI가 다시 배치하기
                </button>
              )}

              {/* 모바일 세로 화면일 때만 보여요 — 편집 화면은 가로가 넓어야 보기 편해서, 기기를 돌려달라고 안내해요 */}
              <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-charcoal)]/30 bg-white p-10 text-center landscape:hidden lg:hidden">
                <span className="text-3xl">📱↻</span>
                <p className="text-sm text-[var(--color-charcoal)]/70 break-keep">
                  화면을 가로로 돌리면 편집 화면이 넓게 보여요.
                  <br />
                  휴대폰을 가로로 돌려주세요.
                </p>
              </div>

              <TextBoxToolbar
                box={activeTextBoxDef}
                onChange={(c) => activeTextBox && updateTextBoxByRef(activeTextBox.ref, activeTextBox.boxId, c)}
                onDelete={() => activeTextBox && deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId)}
              />

              {/* 텍스트박스 바깥(빈 곳)을 누르면 선택이 풀려요 — TextBoxOverlay 쪽 mousedown은
                  stopPropagation으로 여기까지 안 올라와서, 박스 자체를 누른 경우는 안 풀려요. */}
              <div
                className="mt-6 hidden flex-col gap-4 landscape:flex lg:flex lg:flex-row"
                onMouseDown={() => {
                  setActiveTextBox(null);
                  setActiveImageBox(null);
                }}
              >
                {/* 왼쪽: 전체 페이지 한눈에 보기 */}
                <div className="flex gap-2 overflow-x-auto rounded-xl border border-[var(--color-hairline)] bg-white p-2 shadow-sm lg:max-h-[calc(100vh-200px)] lg:w-40 lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0">
                  {isPhotobook && (
                    <button
                      type="button"
                      onClick={() => setSelectedPageKey("cover")}
                      className={`shrink-0 rounded-lg border-2 p-1 transition ${
                        selectedPageKey === "cover" ? "border-[var(--color-sky)]" : "border-transparent"
                      }`}
                    >
                      <div
                        className="pointer-events-none flex w-28 overflow-hidden rounded bg-white shadow-sm lg:w-full"
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
                      <p className="mt-1 text-center text-[11px] text-[var(--color-charcoal)]/60">표지</p>
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
                        <div className="pointer-events-none grid w-28 grid-cols-2 overflow-hidden rounded bg-white shadow-sm lg:w-full">
                          <div className="aspect-square overflow-hidden">
                            {i === 0 ? (
                              <div className="flex h-full w-full items-center justify-center bg-[var(--color-ivory)] p-1">
                                <p className="text-center text-[8px] leading-tight text-[var(--color-charcoal)]/40 break-keep">
                                  인쇄 안 됨
                                </p>
                              </div>
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
                          <div className="aspect-square overflow-hidden">
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
                        <p className="mt-1 text-center text-[11px] text-[var(--color-charcoal)]/60">
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
                      <div className="pointer-events-none flex aspect-square w-28 items-end overflow-hidden rounded bg-white p-1 shadow-sm lg:w-full">
                        {coverPhoto && (
                          <img src={coverPhoto.url} alt="" className="h-1/2 w-1/2 rounded-sm object-cover" />
                        )}
                      </div>
                      <p className="mt-1 text-center text-[11px] text-[var(--color-charcoal)]/60">
                        소개 페이지
                      </p>
                    </button>
                  )}
                </div>

                {/* 오른쪽: 선택한 페이지 크게 편집 — 미리보기(보기 전용)로 먼저 보여주고,
                    마우스를 올려 "편집하기"를 눌러야 실제로 수정 가능한 편집 화면으로 들어가요 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    {editorMode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => setEditorMode("preview")}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-charcoal)]/60 underline underline-offset-4 transition hover:text-[var(--color-charcoal)]"
                      >
                        ← 미리보기로 돌아가기
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1 rounded-full border border-[var(--color-hairline)] bg-white px-1.5 py-1 text-xs shadow-sm">
                      <button
                        type="button"
                        onClick={handleUndo}
                        title="실행취소 (Ctrl+Z)"
                        className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                      >
                        ↶ 실행취소
                      </button>
                      <button
                        type="button"
                        onClick={handleRedo}
                        title="다시실행 (Ctrl+Shift+Z)"
                        className="rounded-full px-2 py-1 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                      >
                        ↷ 다시실행
                      </button>
                      <span className="mx-1 h-4 w-px bg-[var(--color-hairline)]" />
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
                        title="100%로 리셋 (Ctrl+0)"
                        className="w-12 rounded-full px-1 py-1 text-center text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
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
                  <div
                    className={editorMode === "preview" ? "relative pointer-events-none select-none" : "relative"}
                    style={{ transform: `scale(${canvasZoom})`, transformOrigin: "top center" }}
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
                    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5">
                      <p className="text-sm font-medium">앞표지 꾸미기</p>
                      <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                        여기서 고른 사진과 제목이 실제 표지 인쇄 파일에 그대로 들어가요. 뒤표지·책등
                        꾸미기는 아래에서 따로 설정할 수 있어요.
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--color-charcoal)]/70">
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={showCoverBleedGuide}
                            onChange={(e) => setShowCoverBleedGuide(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                          />
                          <span className="font-semibold text-[#1a1a1a]">■</span> 도련선(파선)
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={showCoverTrimGuide}
                            onChange={(e) => setShowCoverTrimGuide(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                          />
                          <span className="font-semibold text-[#1a1a1a]">■</span> 재단선(실선)
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={showCoverSafetyGuide}
                            onChange={(e) => setShowCoverSafetyGuide(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                          />
                          <span className="font-semibold text-[#1a1a1a]">■</span> 안전영역(점선)
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={showCoverSpineGuide}
                            onChange={(e) => setShowCoverSpineGuide(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                          />
                          <span className="font-semibold text-[#1a1a1a]">■</span> 책등 경계(이중선)
                        </label>
                      </div>

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

                        {showCoverBleedGuide && (
                          <CoverGuideBox left={0} right={100} top={0} bottom={100} variant="dashed" />
                        )}
                        {showCoverTrimGuide && (
                          <CoverGuideBox
                            left={coverBleedXPct}
                            right={100 - coverBleedXPct}
                            top={coverBleedYPct}
                            bottom={100 - coverBleedYPct}
                            variant="solid"
                          />
                        )}
                        {showCoverSafetyGuide && (
                          <>
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
                          </>
                        )}
                        {/* 책등 경계는 이제 위 패널 테두리(항상 표시)만으로 보여줘요 — 이중선을 더 그리면
                            선이 겹쳐 지저분해 보여서, 안내선 체크박스는 그대로 두되 여기서는 더 그리지
                            않아요. */}
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {coverPhoto && (
                          <label className="inline-block cursor-pointer text-xs text-[var(--color-sky)] underline underline-offset-4">
                            표지 사진 바꾸기
                            <input type="file" accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                          </label>
                        )}
                        <textarea
                          value={coverTitle}
                          onChange={(e) => handleCoverTitleChange(e.target.value)}
                          placeholder="표지에 넣을 제목 (예: 우리 가족의 여름)"
                          rows={2}
                          className="flex-1 resize-none rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[var(--color-charcoal)]/50 break-keep">
                        제목은 비워둬도 괜찮아요. 사진 위에 흰 글씨로 들어가요. Enter를 누르면 줄이
                        바뀌어요(2줄 이상도 가능해요).
                      </p>

                      <p className="mt-2 text-xs text-[var(--color-charcoal)]/50 break-keep">
                        이 제목이 책등에도 그대로 들어가요.
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                            글자 크기(pt)
                          </label>
                          <div className="flex items-center gap-2">
                            <select
                              value={COVER_TITLE_PT_PRESETS.includes(coverTitleFontSizePt) ? coverTitleFontSizePt : "custom"}
                              onChange={(e) => {
                                if (e.target.value !== "custom") setCoverTitleFontSizePt(Number(e.target.value));
                              }}
                              className="rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                            >
                              {COVER_TITLE_PT_PRESETS.map((pt) => (
                                <option key={pt} value={pt}>
                                  {pt}pt
                                </option>
                              ))}
                              <option value="custom">직접 입력</option>
                            </select>
                            <input
                              type="number"
                              min={8}
                              max={200}
                              value={coverTitleFontSizePt}
                              onChange={(e) => setCoverTitleFontSizePt(Math.max(8, Math.min(200, Number(e.target.value) || 8)))}
                              className="w-16 rounded-lg border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                            />
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

                      <div className="mt-4">
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

                      <div className="mt-4 rounded-xl border border-[var(--color-hairline)] bg-[var(--color-ivory)]/40 p-3">
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
                        <div className="mt-3">
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
                          <p className="mt-2 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                            뒤표지 미리보기 칸에 마우스를 올리면 뜨는 &quot;+ 텍스트 추가&quot; 버튼으로
                            글자도 자유롭게 넣을 수 있어요.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : selectedPageKey === "intro" ? (
                    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-4">
                      <p className="text-sm font-medium">마지막 소개 페이지</p>
                      <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                        앞표지 사진·제목이 자동으로 반영돼요(여기서 사진 크기·위치를 조절해도 실제
                        앞표지에는 영향을 주지 않아요). 오른쪽 면은 인쇄되지 않는 빈 면이에요 —
                        내지 페이지 수·PDF에는 포함되지 않아요.
                      </p>
                      <div className="relative mt-3 flex w-full items-stretch bg-white shadow-sm">
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
                          <div className="flex h-full w-full items-center justify-center p-4">
                            <p className="text-center text-xs text-[var(--color-charcoal)]/40 break-keep">
                              인쇄되지 않는 페이지입니다.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  ) : (
                    (() => {
                      const i = selectedPageKey;
                      const spread = customSpreads[i];
                      const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
                      const leftPhotos = leftIndexes.map((idx) => photos[idx]).filter(Boolean);
                      const rightPhotos = rightIndexes.map((idx) => photos[idx]).filter(Boolean);
                      return (
                        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-4">
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
                          </div>
                          <div className="group relative mt-3 flex w-full items-start bg-white shadow-sm">
                            {/* 스프레드 접힘선 - 두 페이지를 하나로 이어 보이게 하고, 가운데는 이 선 하나로만
                                구분해요. "접힘·제본 경계" 안내선을 켜면 그 옆으로 옅은 배경(BindingGuide)이
                                더해질 뿐, 선은 늘지 않아요. */}
                            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                            {/* 자유 배치 이미지박스 — 왼쪽·오른쪽 낱장이 아니라 스프레드 전체
                                위에 얹어서, 박스를 끌어 페이지 경계를 자유롭게 넘나들 수 있어요. */}
                            {i !== 0 && (
                              <ImageBoxLayer
                                boxes={spread.imageBoxes ?? []}
                                onAdd={(file) => handleAddImageBox(i, file)}
                                onChange={(boxId, c) => handleImageBoxChange(i, boxId, c)}
                                onDelete={(boxId) => handleDeleteImageBox(i, boxId)}
                                activeBoxId={activeImageBox?.spreadIndex === i ? activeImageBox.boxId : null}
                                onSelect={(boxId) => {
                                  setActiveTextBox(null);
                                  setActiveImageBox({ spreadIndex: i, boxId });
                                }}
                              />
                            )}
                            <div className="group relative w-1/2">
                              {i === 0 ? (
                                <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-ivory)] p-4">
                                  <p className="text-center text-xs text-[var(--color-charcoal)]/40 break-keep">
                                    인쇄되지 않는 페이지입니다.
                                    <br />
                                    (표지 안쪽 면이에요)
                                  </p>
                                </div>
                              ) : (
                                <>
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
                                  {renderPage(
                                    spread.left,
                                    leftPhotos,
                                    leftIndexes,
                                    handlePhotoTransform,
                                    handleCaptionChange,
                                    requiredMinPx,
                                    resolveSpreadBackgroundCss(spread, "right")
                                  )}
                                  <TextBoxLayer
                                    boxes={spread.textBoxesLeft ?? []}
                                    onAdd={() => handleAddTextBox(i, "left")}
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
                              {renderPage(
                                spread.right,
                                rightPhotos,
                                rightIndexes,
                                handlePhotoTransform,
                                handleCaptionChange,
                                requiredMinPx,
                                resolveSpreadBackgroundCss(spread, "left")
                              )}
                              <TextBoxLayer
                                boxes={spread.textBoxesRight ?? []}
                                onAdd={() => handleAddTextBox(i, "right")}
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
                            {showGuidelines && <GuideLines trimXPct={trimXPct} trimYPct={trimYPct} />}
                            {showInnerBindingGuide && (
                              <BindingGuide leftPct={bindingLeftEdgePct} rightPct={bindingRightEdgePct} />
                            )}
                            {showInnerSafetyGuide &&
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
                      );
                    })()
                  )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <section className="mx-auto max-w-5xl px-6 pb-24 pt-6 sm:px-10">
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
