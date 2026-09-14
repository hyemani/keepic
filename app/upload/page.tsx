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
// [테스트용] 새 pdf-lib 기반 PDF 생성기예요. ?pdftest=1 일 때만 화면에 테스트 버튼이 보여요.
// 기존 다운로드/발주 흐름(buildInnerPrintPdf)은 이 테스트와 무관하게 그대로 동작해요.
import { buildInnerPrintPdfLib, buildCoverPrintPdfLib } from "@/lib/printPdfLib";

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

// 책등(세네카) 제목 기본값 후보예요. 사용자가 앞표지 제목을 따로 입력하지 않으면
// 새 프로젝트에 들어올 때마다 이 중 하나를 무작위로 골라 기본값으로 넣어요.
const SPINE_TITLE_CANDIDATES = [
  "나의 소중한 순간들",
  "우리의 오늘",
  "오래 간직할 순간",
  "한 권의 추억",
  "내가 좋아하는 장면들",
  "지금, 이 순간",
  "우리의 계절",
  "소중한 날의 기록",
];

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
function computeSpreadPhotoGroups(customSpreads: SpreadDef[]): SpreadPhotoGroup[] {
  let cursor = 0;
  return customSpreads.map((spread) => {
    const leftCount = pageTemplates[spread.left].photoCount;
    const rightCount = pageTemplates[spread.right].photoCount;
    const leftIndexes = Array.from({ length: leftCount }, (_, i) => cursor + i);
    cursor += leftCount;
    const rightIndexes = Array.from({ length: rightCount }, (_, i) => cursor + i);
    cursor += rightCount;
    return { leftIndexes, rightIndexes };
  });
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

// 작업선(초록)·재단선(마젠타)·안전선(파랑) 미리보기 오버레이예요.
// 실제 인쇄 파일(lib/printCompose.ts의 drawGuideOverlay)과 같은 세 겹 구조를 화면에서도 보여줘요.
// 스프레드/표지 전체를 감싸는 작업선(초록)·재단선(마젠타)·안전선(파랑) 가이드 오버레이예요.
// 반드시 스프레드(또는 표지) 전체를 감싸는 딱 하나의 요소로만 그려야 점선이 가운데서
// 끊기지 않아요. (페이지마다 따로 그리면 이어지는 자리에서 점선 위상이 어긋나 끊겨 보여요)
function GuideLines({
  trimXPct,
  trimYPct,
  safetyXPct,
  safetyYPct,
  hideEdge,
}: {
  trimXPct: number;
  trimYPct: number;
  safetyXPct: number;
  safetyYPct: number;
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
      <div className="absolute inset-0 border border-dashed" style={{ borderColor: "#22a559", ...edgeStyle }} />
      <div
        className="absolute border border-dashed"
        style={{
          left: `${trimXPct}%`,
          right: `${trimXPct}%`,
          top: `${trimYPct}%`,
          bottom: `${trimYPct}%`,
          borderColor: "#ff2fb0",
          ...edgeStyle,
        }}
      />
      <div
        className="absolute border border-dashed"
        style={{
          left: `${safetyXPct}%`,
          right: `${safetyXPct}%`,
          top: `${safetyYPct}%`,
          bottom: `${safetyYPct}%`,
          borderColor: "#2f7bff",
          ...edgeStyle,
        }}
      />
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
}: {
  photo: Photo;
  requiredMinPx: number;
  onChange: (changes: Partial<Photo>) => void;
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
  useEffect(() => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect && (rect.width !== photo.containerW || rect.height !== photo.containerH)) {
      onChange({ containerW: rect.width, containerH: rect.height });
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
    <div ref={cellRef} className="relative h-full w-full overflow-hidden bg-[var(--color-ivory)]">
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

function renderPage(
  templateId: PageTemplateId,
  photos: Photo[],
  photoIndexes: number[],
  onPhotoChange: (index: number, changes: Partial<Photo>) => void,
  onCaptionChange: (photoIndex: number, value: string) => void,
  requiredMinPx: number
) {
  if (templateId === "blank") {
    return <div className="aspect-square bg-white" />;
  }

  if (templateId === "full") {
    return (
      <div className="aspect-square overflow-hidden">
        {photos[0] && (
          <PhotoCell
            photo={photos[0]}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(photoIndexes[0], c)}
          />
        )}
      </div>
    );
  }

  if (templateId === "fullMargin") {
    return (
      <div className="aspect-square overflow-hidden bg-white p-10">
        <div className="h-full w-full overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
            />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "duo") {
    return (
      <div className="grid aspect-square grid-cols-2 gap-1">
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (templateId === "trio") {
    return (
      <div className="grid aspect-square grid-rows-2 gap-1">
        <div className="overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
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
      <div className="grid aspect-square grid-cols-3 items-center gap-4 bg-white p-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="relative aspect-square overflow-hidden">
              {photos[i] && (
                <PhotoCell
                  photo={photos[i]}
                  requiredMinPx={requiredMinPx / 3}
                  onChange={(c) => onPhotoChange(photoIndexes[i], c)}
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
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  const photo = photos[0];
  const realIndex = photoIndexes[0];

  if (!photo) return <div className="aspect-square bg-[var(--color-ivory)]" />;

  if (photo.position === "below") {
    return (
      <div className="flex aspect-square flex-col bg-[var(--color-ivory)]">
        <div className="relative flex-1 overflow-hidden">
          <PhotoCell
            photo={photo}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(realIndex, c)}
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
    <div className="relative aspect-square overflow-hidden bg-[var(--color-ivory)]">
      <PhotoCell
        photo={photo}
        requiredMinPx={requiredMinPx}
        onChange={(c) => onPhotoChange(realIndex, c)}
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

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [customSpreads, setCustomSpreads] = useState<SpreadDef[]>(() =>
    template ? template.spreads.map((s) => ({ ...s })) : []
  );
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
  // 책등(세네카) 제목이에요. 앞표지 제목과는 별도로 관리해요 — 앞표지 제목을 입력하면
  // 자동으로 같이 채워지지만, 혜민님/사용자가 책등 제목을 직접 수정하면 그 뒤로는
  // 앞표지 제목을 따라가지 않고 독립적으로 유지돼요.
  const [spineTitle, setSpineTitle] = useState("");
  const [spineTitleTouched, setSpineTitleTouched] = useState(false);
  // 표지 제목 글자 크기 배율이에요(1이 기본, 화면 슬라이더로 조절). 실제 인쇄 파일에도
  // 그대로 반영돼요(기존 jsPDF 발주 파일 + pdf-lib 테스트 생성기 둘 다).
  const [coverTitleFontScale, setCoverTitleFontScale] = useState(1);
  const [isGeneratingPrintFiles, setIsGeneratingPrintFiles] = useState(false);

  // 이 화면에 처음 들어왔을 때(새 프로젝트) 책등 제목 기본값을 후보 중 무작위로 하나 골라요.
  // 서버 렌더링과 다른 값이 나오면 안 되니, 마운트된 뒤(브라우저에서만) 한 번만 실행해요.
  useEffect(() => {
    // 서버 렌더링 때는 무작위 값을 고를 수 없어서(Math.random 결과가 서버/클라이언트마다
    // 달라져 화면 깜빡임 오류가 날 수 있어요) 마운트 직후 한 번만 클라이언트에서 골라요.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpineTitle((prev) =>
      prev ? prev : SPINE_TITLE_CANDIDATES[Math.floor(Math.random() * SPINE_TITLE_CANDIDATES.length)]
    );
  }, []);

  // 앞표지 제목을 입력하면 책등 제목도 자동으로 같이 채워요. 단, 사용자가 책등 제목을
  // 직접 수정한 적이 있으면(spineTitleTouched) 더 이상 앞표지 제목을 따라가지 않아요.
  function handleCoverTitleChange(value: string) {
    setCoverTitle(value);
    if (!spineTitleTouched && value.trim()) {
      setSpineTitle(value);
    }
  }

  function handleSpineTitleChange(value: string) {
    setSpineTitle(value);
    setSpineTitleTouched(true);
  }
  // 지금 화면 오른쪽 큰 미리보기에 어떤 페이지를 보여줄지예요.
  // "cover"면 표지(뒤표지-세네카-앞표지)를, 숫자면 그 번째 스프레드를 보여줘요.
  const [selectedPageKey, setSelectedPageKey] = useState<"cover" | number>(
    isPhotobook ? "cover" : 0
  );
  // 편집 화면에서 재단선·안전선을 겹쳐 보여줄지 여부예요. (내지 스프레드에만 적용돼요)
  const [showGuidelines, setShowGuidelines] = useState(false);

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
    const pages = photobookPages ? Number(photobookPages) : 20;
    const trimMatch = (sizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const trimCm = trimMatch ? parseFloat(trimMatch[1]) : 30;

    const { printBlob: innerBlob, guideBlob: innerGuideBlob } = await buildInnerPrintPdf({
      customSpreads,
      spreadPhotoGroups,
      photos,
      productionFileSizeMm: sizeInfo?.productionFileSizeMm ?? null,
    });
    const { printBlob: coverBlob, guideBlob: coverGuideBlob } = await buildCoverPrintPdf({
      cover: photobookCover === "hard" ? "hard" : "soft",
      sizeInnerTrimMm: trimCm * 10,
      coverPhoto,
      coverTitle,
      coverTitleFontScale,
      innerPaperWeightG: innerPaper.weightG,
      pages,
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
      const pages = photobookPages ? Number(photobookPages) : 20;
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
        coverTitleFontScale,
        innerPaperWeightG: innerPaper.weightG,
        pages,
        firstPage,
        lastPage,
        spineTitle,
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
        info: `생성 완료 — 2쪽(1p 바깥면/2p 안쪽면) / 펼침면 전체 ${result.outerSizeMm.w}×${result.outerSizeMm.h}mm / 표지판 ${result.panelMm}mm / 책등 ${result.spineMm}mm(${result.spineIsConfirmed ? "실측" : "예상치"}) / 도련 ${result.bleedMm}mm`,
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
    const requiredCount = customSpreads.reduce(
      (total, s) => total + pageTemplates[s.left].photoCount + pageTemplates[s.right].photoCount,
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
    const GUIDE_SAFETY_MM = 8; // lib/printCompose.ts의 GUIDE_SAFETY_MARGIN_MM과 같은 값
    const trimXPct = (GUIDE_BLEED_MM / guideSpreadWorkMm) * 100;
    const trimYPct = (GUIDE_BLEED_MM / guidePageWorkMm) * 100;
    const safetyXPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guideSpreadWorkMm) * 100;
    const safetyYPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guidePageWorkMm) * 100;

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
    const coverBackPct = (coverPanelMm / coverTotalWmm) * 100;
    const coverSpinePct = (coverSpineMm / coverTotalWmm) * 100;
    const coverFrontPct = (coverPanelMm / coverTotalWmm) * 100;
    // 뒤표지·앞표지 각 패널 기준 작업선·재단선·안전선 비율이에요. (책등 쪽 변은 감춰서
    // 페이지 기준으로 따로 표시해요. 책등에는 안전선을 표시하지 않아요.)
    const coverPanelWorkMm = coverPanelMm + coverBleedMm * 2;
    const coverPanelTrimXPct = (coverBleedMm / coverPanelWorkMm) * 100;
    const coverPanelTrimYPct = (coverBleedMm / coverPanelWorkMm) * 100;
    const coverPanelSafetyXPct = ((coverBleedMm + GUIDE_SAFETY_MM) / coverPanelWorkMm) * 100;
    const coverPanelSafetyYPct = ((coverBleedMm + GUIDE_SAFETY_MM) / coverPanelWorkMm) * 100;

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

        <section className="mx-auto max-w-5xl px-6 pb-24 pt-8 sm:px-10">
          <p className="text-sm text-[var(--color-charcoal)]/60">
            {productName} · {displaySizeLabel} · {quantity}개 · {template.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">사진을 골라주세요</h1>
          <p className="mt-3 text-[var(--color-charcoal)]/70 break-keep">
            이 디자인은 정확히 사진 {requiredCount}장이 필요해요. (현재 {photos.length}장 선택됨)
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

          <label className="mt-8 inline-block cursor-pointer rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90">
            사진 선택하기
            <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          </label>

          {lowResCount > 0 && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 break-keep">
              해상도가 낮은 사진이 {lowResCount}장 있어요. 인쇄 시 흐릿하게 나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
            </p>
          )}

          {photos.length > 0 && (
            <div className="mt-10 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="group relative aspect-square overflow-hidden border border-[var(--color-hairline)]"
                >
                  <img src={photo.url} alt={`선택한 사진 ${index + 1}`} className="h-full w-full object-cover" />
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
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <div className="mt-12">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">페이지 편집</h2>
                <label className="flex items-center gap-1.5 text-xs text-[var(--color-charcoal)]/60">
                  <input
                    type="checkbox"
                    checked={showGuidelines}
                    onChange={(e) => setShowGuidelines(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--color-sky)]"
                  />
                  작업선·재단선·안전선 미리보기
                </label>
              </div>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/50 break-keep">
                왼쪽에서 페이지를 골라 오른쪽 큰 화면에서 편집해주세요.
              </p>
              {showGuidelines && (
                <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                  <span style={{ color: "#22a559" }}>■ 작업선</span>(파일 맨 끝, 배경은 이 선까지 채워주세요) ·{" "}
                  <span style={{ color: "#ff2fb0" }}>■ 재단선</span>(실제로 잘리는 선) ·{" "}
                  <span style={{ color: "#2f7bff" }}>■ 안전선</span>(글자·중요 사진은 이 안쪽에 배치해주세요)
                </p>
              )}

              <div className="mt-6 flex flex-col gap-4 lg:flex-row">
                {/* 왼쪽: 전체 페이지 한눈에 보기 */}
                <div className="flex gap-2 overflow-x-auto pb-2 lg:w-36 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
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
                        <div className="h-full bg-[var(--color-ivory)]" style={{ width: `${coverBackPct}%` }} />
                        <div className="h-full bg-[var(--color-hairline)]" style={{ width: `${coverSpinePct}%` }} />
                        <div
                          className="relative h-full overflow-hidden bg-[var(--color-ivory)]"
                          style={{ width: `${coverFrontPct}%` }}
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
                            {renderPage(spread.left, leftPhotos, leftIndexes, () => {}, () => {}, requiredMinPx)}
                          </div>
                          <div className="aspect-square overflow-hidden">
                            {renderPage(spread.right, rightPhotos, rightIndexes, () => {}, () => {}, requiredMinPx)}
                          </div>
                        </div>
                        <p className="mt-1 text-center text-[11px] text-[var(--color-charcoal)]/60">
                          스프레드 {i + 1}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* 오른쪽: 선택한 페이지 크게 편집 */}
                <div className="min-w-0 flex-1">
                  {selectedPageKey === "cover" ? (
                    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5">
                      <p className="text-sm font-medium">앞표지 꾸미기</p>
                      <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                        여기서 고른 사진과 제목이 실제 표지 인쇄 파일에 그대로 들어가요. (뒤표지·책등은 우선
                        무지로 비워둘게요)
                      </p>

                      <div
                        className="relative mt-4 flex w-full overflow-hidden rounded-lg border border-[var(--color-hairline)] bg-white shadow-sm"
                        style={{ aspectRatio: `${coverTotalWmm} / ${coverTotalHmm}` }}
                      >
                        <div
                          className="relative flex h-full items-center justify-center bg-[var(--color-ivory)] text-[10px] text-[var(--color-charcoal)]/40"
                          style={{ width: `${coverBackPct}%` }}
                        >
                          뒤표지(무지)
                          {showGuidelines && (
                            <GuideLines
                              trimXPct={coverPanelTrimXPct}
                              trimYPct={coverPanelTrimYPct}
                              safetyXPct={coverPanelSafetyXPct}
                              safetyYPct={coverPanelSafetyYPct}
                              hideEdge="right"
                            />
                          )}
                        </div>
                        <div
                          className="relative flex h-full flex-col items-center bg-[var(--color-hairline)]/60"
                          style={{ width: `${coverSpinePct}%` }}
                        >
                          {spineTitle.trim() ? (
                            // 실제 인쇄 파일에서는 책등 제목이 옆으로 눕혀져 들어가지만, 화면
                            // 미리보기는 혜민님이 읽기 편하도록 가로쓰기로, 살짝 위쪽에 보여줘요.
                            // (책등 폭이 좁아서 글자가 옆 칸까지 살짝 넘칠 수 있어요 — 편집
                            // 확인용 표시일 뿐, 실제 인쇄 파일의 재단 위치와는 무관해요.)
                            <span
                              className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold text-[var(--color-charcoal)]/70"
                            >
                              {spineTitle}
                            </span>
                          ) : (
                            <span
                              className="absolute inset-0 flex items-center justify-center text-[9px] text-[var(--color-charcoal)]/40"
                              style={{ writingMode: "vertical-rl" }}
                            >
                              책등
                            </span>
                          )}
                          {/* Keepic 로고 미리보기 — 실제 인쇄 파일과 같은 방향(옆으로 눕힘,
                              K가 위)으로 책등 아래쪽에 고정 표시해요. */}
                          <img
                            src="/logo.svg"
                            alt="Keepic"
                            className="pointer-events-none absolute bottom-3 left-1/2 h-auto w-6 -translate-x-1/2 opacity-70"
                            style={{ transform: "translateX(-50%) rotate(-90deg)" }}
                          />
                        </div>
                        <div className="relative h-full overflow-hidden" style={{ width: `${coverFrontPct}%` }}>
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
                          {coverTitle.trim() && (
                            <p
                              className="pointer-events-none absolute inset-x-3 bottom-3 text-center font-semibold text-white drop-shadow"
                              style={{ fontSize: `${0.875 * coverTitleFontScale}rem` }}
                            >
                              {coverTitle}
                            </p>
                          )}
                          {showGuidelines && (
                            <GuideLines
                              trimXPct={coverPanelTrimXPct}
                              trimYPct={coverPanelTrimYPct}
                              safetyXPct={coverPanelSafetyXPct}
                              safetyYPct={coverPanelSafetyYPct}
                              hideEdge="left"
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                        {coverPhoto && (
                          <label className="inline-block cursor-pointer text-xs text-[var(--color-sky)] underline underline-offset-4">
                            표지 사진 바꾸기
                            <input type="file" accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                          </label>
                        )}
                        <input
                          type="text"
                          value={coverTitle}
                          onChange={(e) => handleCoverTitleChange(e.target.value)}
                          placeholder="표지에 넣을 제목 (예: 우리 가족의 여름)"
                          className="flex-1 rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
                        />
                      </div>
                      <p className="mt-2 text-xs text-[var(--color-charcoal)]/50 break-keep">
                        제목은 비워둬도 괜찮아요. 사진 위에 흰 글씨로 들어가요.
                      </p>

                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                          책등 제목
                        </label>
                        <input
                          type="text"
                          value={spineTitle}
                          onChange={(e) => handleSpineTitleChange(e.target.value)}
                          placeholder="책등에 넣을 제목"
                          className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
                        />
                        <p className="mt-2 text-xs text-[var(--color-charcoal)]/50 break-keep">
                          책등에 들어갈 제목이에요. 원하는 문구로 바꿔보세요.
                        </p>
                      </div>

                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                          표지 제목 글자 크기
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-[var(--color-charcoal)]/40">작게</span>
                          <input
                            type="range"
                            min={0.6}
                            max={1.6}
                            step={0.05}
                            value={coverTitleFontScale}
                            onChange={(e) => setCoverTitleFontScale(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-[10px] text-[var(--color-charcoal)]/40">크게</span>
                        </div>
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
                            <p className="text-sm font-medium">스프레드 {i + 1}</p>
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
                          <div className="relative mt-3 flex w-full items-start bg-white shadow-sm">
                            {/* 스프레드 접힘선 - 두 페이지를 하나로 이어 보이게 하고, 가운데는 이 선 하나로만 구분해요. */}
                            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                            <div className="group relative w-1/2">
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
                                requiredMinPx
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
                                requiredMinPx
                              )}
                            </div>
                            {showGuidelines && (
                              <GuideLines
                                trimXPct={trimXPct}
                                trimYPct={trimYPct}
                                safetyXPct={safetyXPct}
                                safetyYPct={safetyYPct}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
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

        <label className="mt-8 inline-block cursor-pointer rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90">
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
