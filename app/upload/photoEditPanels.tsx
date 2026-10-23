"use client";

// 사진 편집 UI 조각들 — 왼쪽 "사진 편집" 패널(사진 변경 / 위치·크롭 / 필터 / 보정), "사진 변경" 선택창(라이브러리에서
// 고르기 or 새로 올리기), 그리고 사진 위치 조정 중에 사진 아래에 뜨는 도구 막대(PhotoPositionToolbar)예요.
// 사진 픽셀 계산은 lib/photoAdjust.ts, 화면 그리기는 app/upload/photoEditHooks.tsx 가 맡아요.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import type { ImageBoxDef } from "@/lib/albumTemplates";
import { normalizePhotoQuarterTurn } from "@/lib/imageBoxGeometry";
import {
  DEFAULT_PHOTO_ADJUST,
  PHOTO_ADJUST_FIELDS,
  PHOTO_FILTER_OPTIONS,
  isPhotoEditIdentity,
  resolvePhotoAdjust,
  resolvePhotoFilter,
  type PhotoAdjust,
} from "@/lib/photoAdjust";
import { usePhotoFilterThumbs } from "./photoEditHooks";
import { PrimaryActionButton } from "./primaryActionButton";
import { ACTION_BUTTON_BASE, PANEL_STACK, SECONDARY_ACTION_BUTTON_CLASS, SegTabs } from "./sidePanelShell";
import { localRect, virtualInner } from "@/lib/rotatedShell";

/** 이미지박스 컴포넌트가 밖으로 열어주는 동작 중 이 패널이 쓰는 것들(ImageBoxOverlayHandle 의 부분집합). */
export type PhotoEditHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (scale: number) => void;
  setCompareOriginal: (on: boolean) => void;
  resetPhotoPosition: () => void;
};

export type PhotoToolIconName =
  | "replace"
  | "zoomIn"
  | "zoomOut"
  | "fit"
  | "flipH"
  | "flipV"
  | "rotate"
  | "check"
  | "reset"
  | "compare"
  | "fill"
  | "front"
  | "back"
  | "forward"
  | "backward"
  | "copy"
  | "cut"
  | "paste"
  | "center"
  | "duplicate"
  | "trash";

export function PhotoToolIcon({ name, className }: { name: PhotoToolIconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className ?? "h-6 w-6",
    "aria-hidden": true,
  };
  switch (name) {
    case "replace":
      return (
        <svg {...common}>
          <path d="M7 20V6" />
          <path d="M3.5 9.5L7 6l3.5 3.5" />
          <path d="M17 4v14" />
          <path d="M13.5 14.5L17 18l3.5-3.5" />
        </svg>
      );
    case "zoomIn":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      );
    case "zoomOut":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
          <path d="M8 11h6" />
        </svg>
      );
    case "fit":
      return (
        <svg {...common}>
          <path d="M3 3l5 5" />
          <path d="M8 4.5V8H4.5" />
          <path d="M21 3l-5 5" />
          <path d="M16 4.5V8h3.5" />
          <path d="M3 21l5-5" />
          <path d="M8 19.5V16H4.5" />
          <path d="M21 21l-5-5" />
          <path d="M16 19.5V16h3.5" />
        </svg>
      );
    case "flipH":
      return (
        <svg {...common}>
          <path d="M12 3v18" strokeDasharray="2.4 2.2" />
          <path d="M8.5 7L3.5 12l5 5V7z" />
          <path d="M15.5 7l5 5-5 5V7z" />
        </svg>
      );
    case "flipV":
      return (
        <svg {...common}>
          <path d="M3 12h18" strokeDasharray="2.4 2.2" />
          <path d="M7 8.5l5-5 5 5H7z" />
          <path d="M7 15.5l5 5 5-5H7z" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v5h-5" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
    case "reset":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 1 0 2.6-5.9" />
          <path d="M4 4v5h5" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M12 5v14" />
          <path d="M12 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7z" fill="currentColor" fillOpacity="0.28" stroke="none" />
        </svg>
      );
    case "fill":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <path d="M3 4l5 5M21 4l-5 5M3 20l5-5M21 20l-5-5" />
        </svg>
      );
    case "front":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="11" height="11" rx="1.5" />
          <rect x="10" y="10" width="11" height="11" rx="1.5" fill="currentColor" fillOpacity="0.25" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <rect x="10" y="10" width="11" height="11" rx="1.5" />
          <rect x="3" y="3" width="11" height="11" rx="1.5" fill="currentColor" fillOpacity="0.25" />
        </svg>
      );
    case "forward":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="12" height="12" rx="1.5" />
          <path d="M14 8V3M11.5 5.5L14 3l2.5 2.5" />
        </svg>
      );
    case "backward":
      return (
        <svg {...common}>
          <rect x="8" y="3" width="12" height="12" rx="1.5" />
          <path d="M10 16v5M7.5 18.5L10 21l2.5-2.5" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="11" height="11" rx="1.5" />
          <path d="M5 15V5a1 1 0 0 1 1-1h10" />
        </svg>
      );
    case "cut":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
        </svg>
      );
    case "paste":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="1.5" />
          <path d="M9 4V3h6v1M9 4v2h6V4" />
        </svg>
      );
    case "center":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
        </svg>
      );
    case "duplicate":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="13" height="13" rx="1.5" />
          <path d="M19 8v13H8M10 9.5v4M8 11.5h4" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
        </svg>
      );
  }
}

const TEXT_MAIN = "text-[var(--color-charcoal)]";

/** 왼쪽 패널용 도구 버튼: 20px 아이콘 + 12px 글자를 한 줄로(아이콘 왼쪽), 눌리는 영역 세로 34px. */
function PanelToolButton({
  icon,
  label,
  title,
  onClick,
  active,
  disabled,
  danger,
}: {
  icon: PhotoToolIconName;
  label: string;
  title?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`${ACTION_BUTTON_BASE} min-w-[44px] border px-1 ${
        active
          ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
          : `border-[var(--color-hairline)] bg-white ${danger ? "text-red-600" : TEXT_MAIN} hover:bg-[var(--color-ivory)]`
      }`}
    >
      <PhotoToolIcon name={icon} className="h-5 w-5 shrink-0" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/** 슬라이더 + 숫자 입력(직접 입력 가능) — 현재 값이 항상 숫자로 보여요. */
function AdjustSlider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className={`text-[12px] font-medium ${TEXT_MAIN}/80`}>{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${label} 숫자 입력`}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            value={draft ?? String(value)}
            onChange={(e) => {
              setDraft(e.target.value);
              const n = parseFloat(e.target.value);
              if (Number.isFinite(n)) onChange(snap(n));
            }}
            onBlur={() => setDraft(null)}
            className="h-7 w-16 border border-[var(--color-hairline)] bg-white px-1 text-right text-[12px] tabular-nums disabled:opacity-40"
          />
          {unit ? <span className="w-4 text-[12px] text-[var(--color-charcoal)]/50">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(snap(Number(e.target.value)))}
        className="h-6 w-full disabled:opacity-40"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// 62차: 왼쪽 "사진 편집" 상세 패널 — 캔버스의 빠른 툴바(사진 편집·사진 교체·삭제)에서 뺀 기능을 관련 있는 것끼리 묶었어요.
//   위치·크기 / 회전·반전 / 테두리·투명도 / 정렬·앞뒤 순서 / 복사·붙여넣기 / 필터 / 보정  (한 번에 한 묶음만 펼쳐요 — 패널이 길어지지 않게)
// 사진을 선택한 채로 열려요(선택은 이 패널을 열고 닫아도 풀리지 않아요).
export type PhotoEditSection = "position" | "rotate" | "border" | "arrange" | "clipboard" | "filter" | "adjust";

export type PanelCommand = { onClick: () => void; disabled?: boolean };
/** 캔버스 선택(복사·잘라내기·붙여넣기·가운데 맞춤은 "선택한 요소" 기준)과 앞뒤 순서·삭제·복제를 이 패널에서도 쓰도록 page 가 내려줘요. */
export type PhotoPanelActions = {
  onStack: (action: "front" | "back" | "forward" | "backward") => void;
  copy: PanelCommand;
  cut: PanelCommand;
  paste: PanelCommand;
  center: PanelCommand;
  duplicate: PanelCommand;
  onDelete: () => void;
};

const SECTION_META: { id: PhotoEditSection; label: string }[] = [
  { id: "position", label: "위치·크기" },
  { id: "rotate", label: "회전·반전" },
  { id: "border", label: "테두리·투명도" },
  { id: "arrange", label: "정렬·앞뒤 순서" },
  { id: "clipboard", label: "복사·붙여넣기" },
  { id: "filter", label: "필터" },
  { id: "adjust", label: "보정" },
];

const SECTION_BOX = "border border-[var(--color-hairline)] bg-white p-2";

function SectionHeader({ id, label, open, onToggle }: { id: string; label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      id={`pe-h-${id}`}
      aria-expanded={open}
      aria-controls={`pe-s-${id}`}
      data-photo-edit-section={id}
      onClick={onToggle}
      className={`flex h-[34px] [@media(pointer:coarse)]:h-11 w-full items-center justify-between border px-2 text-left text-[13px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none ${
        open ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white" : "border-[var(--color-hairline)] bg-[var(--color-ivory)] text-[var(--color-charcoal)] hover:bg-white"
      }`}
    >
      <span>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 transition-transform duration-150 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}

/**
 * 선택한 사진 한 장의 편집 패널. 원본 사진은 절대 안 바뀌고, 값은 ImageBoxDef 의 선택 필드로만 저장돼요.
 * - 맨 위: 짧은 조작 안내 + (위치 조정 중이면) 취소·완료
 * - 사진 교체 버튼
 * - 묶음(아코디언): 위치·크기 / 회전·반전 / 테두리·투명도 / 정렬·앞뒤 순서 / 복사·붙여넣기 / 필터 / 보정
 * mode="group": 폴라로이드 틀(스티커)이 선택된 상태 — 틀+사진이 한 덩어리로 움직이니 전체에 해당하는 것(칸 기울이기·투명도·앞뒤 순서·가운데 맞춤·삭제)만 보여요.
 */
export function PhotoEditPanel({
  box,
  onChange,
  getHandle,
  onRequestReplace,
  section,
  onSectionChange,
  actions,
  editing = false,
  onStartEdit,
  onDone,
  onCancel,
  mode = "photo",
}: {
  box: ImageBoxDef;
  onChange: (changes: Partial<ImageBoxDef>) => void;
  getHandle: () => (PhotoEditHandle & { fillSpread?: () => void; enterPhotoEditMode?: () => void }) | undefined;
  onRequestReplace: () => void;
  section: PhotoEditSection | null;
  onSectionChange: (s: PhotoEditSection | null) => void;
  actions?: PhotoPanelActions;
  editing?: boolean;
  onStartEdit?: () => void;
  onDone?: () => void;
  onCancel?: () => void;
  mode?: "photo" | "group";
}) {
  const isGroup = mode === "group";
  const filter = resolvePhotoFilter(box.photoFilter);
  const adjust = resolvePhotoAdjust(box.photoAdjust);
  const hasEdit = !isPhotoEditIdentity(box.photoFilter, box.photoAdjust);
  const thumbs = usePhotoFilterThumbs(!isGroup && section === "filter" ? box.url : "");
  const turn = normalizePhotoQuarterTurn(box.photoRotation);
  const hasDecor = !!box.frameDecor;

  // 원본과 비교: 누르고 있는 동안(또는 토글해 두면) 보정 없는 원본을 보여줘요.
  const [pinned, setPinned] = useState(false);
  const [holding, setHolding] = useState(false);
  const handleRef = useRef(getHandle);
  useEffect(() => {
    handleRef.current = getHandle;
  });
  const showingOriginal = pinned || holding;
  useEffect(() => {
    handleRef.current()?.setCompareOriginal(showingOriginal);
  }, [showingOriginal]);
  useEffect(
    () => () => {
      handleRef.current()?.setCompareOriginal(false);
    },
    []
  );

  const setAdjust = (key: keyof PhotoAdjust, v: number) => onChange({ photoAdjust: { ...adjust, [key]: v } });
  const resetEdits = () => onChange({ photoFilter: undefined, photoAdjust: undefined });
  const resetPosition = () =>
    onChange({
      innerOffsetXPct: 0,
      innerOffsetYPct: 0,
      innerScale: 1,
      flipX: undefined,
      flipY: undefined,
      photoRotation: undefined,
    });

  const compareButton = (
    <div className="mb-2 flex flex-col gap-1.5">
      <button
        type="button"
        title="누르고 있는 동안 보정 전 원본을 보여줘요"
        aria-label="원본과 비교 (누르고 있는 동안)"
        disabled={!hasEdit}
        onPointerDown={() => setHolding(true)}
        onPointerUp={() => setHolding(false)}
        onPointerLeave={() => setHolding(false)}
        onPointerCancel={() => setHolding(false)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") setHolding(true);
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") setHolding(false);
        }}
        className={SECONDARY_ACTION_BUTTON_CLASS}
      >
        <PhotoToolIcon name="compare" className="h-5 w-5 shrink-0" />
        <span className="whitespace-nowrap">원본과 비교 (누르고 있기)</span>
      </button>
      <button
        type="button"
        title="원본 보기 켜기/끄기"
        aria-label="원본 보기 고정"
        aria-pressed={pinned}
        disabled={!hasEdit}
        onClick={() => setPinned((v) => !v)}
        className={`${ACTION_BUTTON_BASE} border px-2 ${
          pinned
            ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
            : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]"
        }`}
      >
        {pinned ? "원본 보기 끄기" : "원본 보기 고정"}
      </button>
    </div>
  );

  const resetEditsButton = (
    <button
      type="button"
      title="필터와 보정값만 처음으로 (위치·확대·회전·반전은 그대로)"
      aria-label="보정 초기화"
      disabled={!hasEdit}
      onClick={resetEdits}
      className={SECONDARY_ACTION_BUTTON_CLASS}
    >
      <PhotoToolIcon name="reset" className="h-5 w-5 shrink-0" />
      <span className="whitespace-nowrap">보정 초기화</span>
    </button>
  );

  const cmd = (c: PanelCommand | undefined, icon: PhotoToolIconName, label: string, title?: string, danger?: boolean) => (
    <PanelToolButton icon={icon} label={label} title={title} disabled={!c || c.disabled} danger={danger} onClick={() => c?.onClick()} />
  );

  const body: Record<PhotoEditSection, ReactNode> = {
    position: (
      <div className={SECTION_BOX}>
        <div className="grid grid-cols-3 gap-1.5">
          <PanelToolButton icon="zoomOut" label="축소" onClick={() => getHandle()?.zoomOut()} />
          <PanelToolButton icon="zoomIn" label="확대" onClick={() => getHandle()?.zoomIn()} />
          <PanelToolButton icon="fit" label="맞춤" title="맞춤 — 사진을 칸에 꽉 맞게(확대·위치만 처음으로)" onClick={() => getHandle()?.resetPhotoPosition()} />
          <PanelToolButton icon="fill" label="채우기" title="채우기 — 칸을 페이지(펼침면) 전체에 꽉 채워요" onClick={() => getHandle()?.fillSpread?.()} />
          {cmd(actions?.center, "center", "중앙맞춤", "중앙맞춤 — 칸을 페이지 정중앙으로")}
        </div>
        <div className="mt-3">
          <AdjustSlider
            label="확대"
            unit="%"
            min={100}
            max={300}
            value={Math.round((box.innerScale ?? 1) * 100)}
            onChange={(v) => getHandle()?.zoomTo(v / 100)}
          />
        </div>
        <button
          type="button"
          title="위치·확대·회전·반전만 처음으로 (필터와 보정은 그대로)"
          aria-label="위치 초기화"
          onClick={resetPosition}
          className={SECONDARY_ACTION_BUTTON_CLASS}
        >
          <PhotoToolIcon name="reset" className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">위치 초기화</span>
        </button>
      </div>
    ),
    rotate: (
      <div className={SECTION_BOX}>
        <div className="grid grid-cols-3 gap-1.5">
          <PanelToolButton
            icon="rotate"
            label="90° 회전"
            title="사진 90° 회전"
            onClick={() => onChange({ photoRotation: (turn + 90) % 360, innerOffsetXPct: 0, innerOffsetYPct: 0 })}
          />
          <PanelToolButton icon="flipH" label="좌우" title="좌우 반전" active={!!box.flipX} onClick={() => onChange({ flipX: !box.flipX })} />
          <PanelToolButton icon="flipV" label="상하" title="상하 반전" active={!!box.flipY} onClick={() => onChange({ flipY: !box.flipY })} />
        </div>
        <div className="mt-3">
          <AdjustSlider label="칸 기울이기" unit="°" min={0} max={359} value={Math.round(box.rotation ?? 0)} onChange={(v) => onChange({ rotation: v })} />
          <button type="button" aria-label="기울기 초기화" disabled={!box.rotation} onClick={() => onChange({ rotation: 0 })} className={SECONDARY_ACTION_BUTTON_CLASS}>
            <PhotoToolIcon name="reset" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">기울기 초기화</span>
          </button>
        </div>
      </div>
    ),
    border: (
      <div className={SECTION_BOX}>
        {hasDecor ? (
          <p className="mb-2 text-[12px] leading-snug text-[var(--color-charcoal)]/60 break-keep">장식 프레임을 쓰는 동안은 테두리·모서리가 적용되지 않아요. 투명도만 바꿀 수 있어요.</p>
        ) : (
          <>
            <AdjustSlider label="테두리 두께" unit="px" min={0} max={12} value={box.borderWidthPx ?? 0} onChange={(v) => onChange({ borderWidthPx: v, borderColor: box.borderColor ?? "#ffffff" })} />
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-[var(--color-charcoal)]/80">테두리 색</span>
              <input
                type="color"
                aria-label="테두리 색"
                value={box.borderColor ?? "#ffffff"}
                onChange={(e) => onChange({ borderColor: e.target.value, borderWidthPx: box.borderWidthPx ?? 0 })}
                className="h-9 w-14 cursor-pointer border border-[var(--color-hairline)] bg-transparent p-0.5"
              />
            </div>
            <AdjustSlider label="모서리 둥글게" unit="%" min={0} max={50} value={box.borderRadiusPct ?? 0} onChange={(v) => onChange({ borderRadiusPct: v })} />
          </>
        )}
        <AdjustSlider label="투명도" unit="%" min={10} max={100} value={Math.round((box.opacity ?? 1) * 100)} onChange={(v) => onChange({ opacity: v / 100 })} />
      </div>
    ),
    arrange: (
      <div className={SECTION_BOX}>
        <div className="grid grid-cols-2 gap-1.5">
          <PanelToolButton icon="front" label="맨앞" title="맨 앞으로" onClick={() => actions?.onStack("front")} />
          <PanelToolButton icon="back" label="맨뒤" title="맨 뒤로" onClick={() => actions?.onStack("back")} />
          {!isGroup && <PanelToolButton icon="forward" label="앞으로" title="한 칸 앞으로" onClick={() => actions?.onStack("forward")} />}
          {!isGroup && <PanelToolButton icon="backward" label="뒤로" title="한 칸 뒤로" onClick={() => actions?.onStack("backward")} />}
          {cmd(actions?.center, "center", "페이지 정렬", "페이지 정렬 — 칸을 페이지 정중앙으로")}
        </div>
      </div>
    ),
    clipboard: (
      <div className={SECTION_BOX}>
        <div className="grid grid-cols-2 gap-1.5">
          {cmd(actions?.copy, "copy", "복사", "복사하기 (Ctrl+C)")}
          {cmd(actions?.cut, "cut", "잘라내기", "잘라내기 (Ctrl+X)")}
          {cmd(actions?.paste, "paste", "붙여넣기", "붙여넣기 (Ctrl+V)")}
          {cmd(actions?.duplicate, "duplicate", "복제", "복제 — 같은 사진 칸을 하나 더 만들어요")}
        </div>
      </div>
    ),
    filter: (
      <div className={SECTION_BOX}>
        <div className="grid grid-cols-2 gap-1.5">
          {PHOTO_FILTER_OPTIONS.map((opt) => {
            const active = (filter.id === opt.id && filter.strength > 0) || (opt.id === "original" && (filter.id === "original" || filter.strength <= 0));
            return (
              <button
                key={opt.id}
                type="button"
                title={`${opt.label} 필터`}
                aria-label={`${opt.label} 필터`}
                aria-pressed={active}
                data-filter-id={opt.id}
                onClick={() =>
                  onChange({
                    photoFilter: opt.id === "original" ? undefined : { id: opt.id, strength: filter.id === opt.id ? filter.strength || 100 : 100 },
                  })
                }
                className={`flex flex-col items-stretch border p-1 text-[12px] transition ${
                  active
                    ? "border-[var(--color-charcoal)] ring-1 ring-[var(--color-charcoal)]"
                    : "border-[var(--color-hairline)] hover:border-[var(--color-charcoal)]/50"
                }`}
              >
                <span className="relative block aspect-square w-full overflow-hidden bg-[var(--color-ivory)]">
                  {thumbs[opt.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[opt.id]} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </span>
                <span className="mt-1 text-center">{opt.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <AdjustSlider
            label="필터 강도"
            min={0}
            max={100}
            disabled={filter.id === "original"}
            value={filter.id === "original" ? 0 : Math.round(filter.strength)}
            onChange={(v) => onChange({ photoFilter: { id: filter.id, strength: v } })}
          />
        </div>
        {compareButton}
        {resetEditsButton}
      </div>
    ),
    adjust: (
      <div className={SECTION_BOX}>
        {PHOTO_ADJUST_FIELDS.map((fld) => (
          <AdjustSlider
            key={fld.key}
            label={fld.label}
            min={fld.min}
            max={fld.max}
            value={Math.round(adjust[fld.key] ?? DEFAULT_PHOTO_ADJUST[fld.key])}
            onChange={(v) => setAdjust(fld.key, v)}
          />
        ))}
        {compareButton}
        {resetEditsButton}
      </div>
    ),
  };
  const sections = isGroup ? SECTION_META.filter((m) => m.id === "rotate" || m.id === "border" || m.id === "arrange") : SECTION_META;

  return (
    <div className={PANEL_STACK} data-photo-edit-panel data-photo-edit-mode={isGroup ? "group" : "photo"}>
      {isGroup ? (
        <div className="border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-2" data-photo-edit-hint>
          <p className="text-[12px] font-semibold text-[var(--color-brand-purple)]">폴라로이드 전체가 선택됐어요</p>
          <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-charcoal)]/70 break-keep">틀과 사진이 함께 움직여요. 안의 사진만 고치려면 아래 버튼을 눌러요.</p>
          <button type="button" data-testid="inner-edit-start" onClick={onStartEdit} className={`${ACTION_BUTTON_BASE} mt-1.5 border border-[var(--color-charcoal)] bg-white px-2 text-[var(--color-charcoal)] hover:bg-[var(--color-ivory)]`}>
            <PhotoToolIcon name="fit" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">안의 사진 편집</span>
          </button>
        </div>
      ) : editing ? (
        <div className="border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-2" data-photo-edit-hint data-photo-edit-state="editing">
          <div className="flex items-center justify-between gap-2">
            <p className="whitespace-nowrap text-[12px] font-semibold text-[var(--color-brand-purple)]">사진 위치 조정 중</p>
            <div className="flex shrink-0 items-center gap-1">
              {onCancel ? (
                <button type="button" aria-label="취소" title="취소 — 들어오기 전 상태로 되돌려요" data-testid="photo-edit-cancel" onClick={onCancel} className="relative flex min-h-[34px] [@media(pointer:coarse)]:min-h-11 items-center border border-[var(--color-hairline)] bg-white px-3 text-[12px] font-medium text-[var(--color-charcoal)]">
                  취소
                </button>
              ) : null}
              <button type="button" aria-label="완료" title="완료 — 바꾼 것을 적용해요" data-testid="photo-edit-done" onClick={onDone} className="relative flex min-h-[34px] [@media(pointer:coarse)]:min-h-11 items-center gap-1 bg-[var(--color-charcoal)] px-3 text-[12px] font-medium text-white">
                <PhotoToolIcon name="check" className="h-5 w-5 shrink-0" />
                <span className="whitespace-nowrap">완료</span>
              </button>
            </div>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-[var(--color-charcoal)]/70 break-keep">사진을 드래그해 프레임 안의 위치를 조정하세요.</p>
        </div>
      ) : (
        <div className="border border-[var(--color-hairline)] bg-[var(--color-ivory)] p-2" data-photo-edit-hint>
          <p className="text-[12px] leading-snug text-[var(--color-charcoal)]/70 break-keep">사진을 드래그해 프레임 안의 위치를 조정하세요.</p>
          <button type="button" data-testid="photo-edit-start" onClick={onStartEdit ?? (() => getHandle()?.enterPhotoEditMode?.())} className={`${ACTION_BUTTON_BASE} mt-1.5 border border-[var(--color-charcoal)] bg-white px-2 text-[var(--color-charcoal)] hover:bg-[var(--color-ivory)]`}>
            <PhotoToolIcon name="fit" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">사진 위치 조정 시작</span>
          </button>
        </div>
      )}

      {!isGroup && (
        <PrimaryActionButton
          title="이 사진을 다른 사진으로 바꿔요 (모양·액자·테두리·위치·크기는 그대로)"
          ariaLabel="사진 교체"
          onClick={onRequestReplace}
        >
          <PhotoToolIcon name="replace" className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">사진 교체</span>
        </PrimaryActionButton>
      )}

      <div className="flex flex-col gap-1" role="group" aria-label="사진 편집 묶음">
        {sections.map((m) => {
          const open = section === m.id;
          return (
            <div key={m.id} className="flex flex-col gap-1">
              <SectionHeader id={m.id} label={m.label} open={open} onToggle={() => onSectionChange(open ? null : m.id)} />
              {open ? (
                <div id={`pe-s-${m.id}`} role="region" aria-labelledby={`pe-h-${m.id}`}>
                  {body[m.id]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {actions ? (
        <button
          type="button"
          aria-label="삭제"
          title={isGroup ? "삭제 — 폴라로이드(틀+사진)를 지워요" : "삭제"}
          data-testid="photo-panel-delete"
          onClick={actions.onDelete}
          className={`${ACTION_BUTTON_BASE} border border-red-200 bg-white px-2 text-red-600 hover:bg-red-50`}
        >
          <PhotoToolIcon name="trash" className="h-5 w-5 shrink-0" />
          <span className="whitespace-nowrap">삭제</span>
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// 사진 변경 선택창

export type ReplaceLibraryPhoto = { url: string; width: number; height: number };

const REPLACE_PAGE_SIZE = 16;

export function PhotoReplaceDialog({
  library,
  usedUrls,
  currentUrl,
  onUploadFile,
  onApply,
  onClose,
}: {
  library: ReplaceLibraryPhoto[];
  usedUrls: Set<string>;
  currentUrl: string;
  onUploadFile: (file: File) => Promise<ReplaceLibraryPhoto | null>;
  onApply: (photo: ReplaceLibraryPhoto) => void;
  onClose: () => void;
}) {
  const [uploaded, setUploaded] = useState<ReplaceLibraryPhoto[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const items = [...library, ...uploaded.filter((u) => !library.some((l) => l.url === u.url))];
  const pageCount = Math.max(1, Math.ceil(items.length / REPLACE_PAGE_SIZE));
  const curPage = Math.min(page, pageCount - 1);
  const visible = items.slice(curPage * REPLACE_PAGE_SIZE, (curPage + 1) * REPLACE_PAGE_SIZE);
  const selected = items.find((i) => i.url === selectedUrl) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const added = await onUploadFile(file);
      if (added) {
        setUploaded((prev) => [...prev, added]);
        setSelectedUrl(added.url);
        const total = library.length + uploaded.length + 1;
        setPage(Math.floor((total - 1) / REPLACE_PAGE_SIZE));
      }
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <div
      className="fixed inset-0 z-[200000] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사진 교체"
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
          <p className="text-[14px] font-semibold text-[var(--color-charcoal)]">사진 교체</p>
          <button
            type="button"
            aria-label="닫기"
            title="닫기 (사진은 그대로)"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-[18px] text-[var(--color-charcoal)]/60 hover:text-[var(--color-charcoal)]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">
          <p className="mb-3 text-[12px] leading-snug text-[var(--color-charcoal)]/65 break-keep">
            이미 올린 사진 중에서 고르거나 새 사진을 올리세요. 사진만 바뀌고 모양·액자·테두리·위치·크기는 그대로예요.
          </p>
          <label
            className={`mb-3 inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-1.5 border border-[var(--color-charcoal)] px-3 text-[12px] font-medium text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            {busy ? "올리는 중…" : "+ 새 사진 올리기"}
            <input
              type="file"
              accept="image/*"
              aria-label="새 사진 올리기"
              data-replace-upload
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {items.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-[var(--color-charcoal)]/50">아직 올린 사진이 없어요. 새 사진을 올려보세요.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2" data-replace-grid>
              {visible.map((p) => {
                const isCurrent = p.url === currentUrl;
                const isSel = p.url === selectedUrl;
                return (
                  <button
                    key={p.url}
                    type="button"
                    data-replace-item
                    aria-pressed={isSel}
                    aria-label={isCurrent ? "현재 사용 중인 사진" : usedUrls.has(p.url) ? "다른 곳에서 사용 중인 사진" : "사진 선택"}
                    onClick={() => setSelectedUrl(p.url)}
                    className={`relative aspect-square overflow-hidden border-2 transition ${
                      isSel ? "border-[var(--color-charcoal)]" : "border-transparent hover:border-[var(--color-charcoal)]/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
                    {isCurrent ? (
                      <span className="absolute left-1 top-1 bg-[var(--color-charcoal)]/85 px-1.5 py-0.5 text-[11px] text-white">현재</span>
                    ) : usedUrls.has(p.url) ? (
                      <span className="absolute left-1 top-1 bg-[var(--color-sky)]/90 px-1.5 py-0.5 text-[11px] text-white">사용 중</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between text-[12px] text-[var(--color-charcoal)]/65">
              <button
                type="button"
                disabled={curPage === 0}
                onClick={() => setPage(curPage - 1)}
                className="min-h-[34px] border border-[var(--color-hairline)] px-3 disabled:opacity-30"
              >
                ‹ 이전
              </button>
              <span>
                {curPage + 1} / {pageCount}
              </span>
              <button
                type="button"
                disabled={curPage >= pageCount - 1}
                onClick={() => setPage(curPage + 1)}
                className="min-h-[34px] border border-[var(--color-hairline)] px-3 disabled:opacity-30"
              >
                다음 ›
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-hairline)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[34px] border border-[var(--color-hairline)] px-4 text-[13px] text-[var(--color-charcoal)] hover:bg-[var(--color-ivory)]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!selected || selected.url === currentUrl}
            onClick={() => selected && onApply(selected)}
            className="min-h-[34px] bg-[var(--color-charcoal)] px-5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
}

// ---------------------------------------------------------------------------------------------
// 사진 위치 조정 중 도구 막대

const TOOLBAR_GAP = 8;
const TOOLBAR_EDGE = 4;

function ToolbarIconButton({
  icon,
  label,
  onClick,
  active,
  withText,
  primary,
}: {
  icon: PhotoToolIconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  withText?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-8 shrink-0 items-center justify-center gap-1 text-[12px] transition ${
        withText ? "min-w-[32px] px-2" : "w-8"
      } ${
        primary
          ? "bg-[var(--color-charcoal)] text-white hover:opacity-90"
          : active
            ? "bg-[var(--color-charcoal)] text-white"
            : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/80 hover:bg-[var(--color-hairline)]"
      }`}
    >
      <PhotoToolIcon name={icon} className="h-5 w-5 shrink-0" />
      {withText ? <span className="whitespace-nowrap font-medium">{label}</span> : null}
    </button>
  );
}

/**
 * 사진 위치 조정 중에 사진 근처에 뜨는 도구 막대 — 박스(회전·작은 크기)와 상관없이 항상 같은 크기(아이콘 20px,
 * 글자 12px, 버튼 32px)이고, 화면 맨 위(body) 에 position:fixed 로 띄워서 박스가 작아도 줄어들지 않아요.
 * 사진 아래(없으면 위, 그것도 안 되면 사진 안쪽 아래)에 놓고, 캔버스 영역 [data-canvas-stage] 안으로 위치를 잘라
 * 가장자리에서 잘리지 않게 해요.
 */
export function PhotoPositionToolbar({
  anchorRef,
  flipX,
  flipY,
  onReplace,
  onZoomOut,
  onZoomIn,
  onFit,
  onFlipX,
  onFlipY,
  onRotate,
  onDone,
  onCancel,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  flipX?: boolean;
  flipY?: boolean;
  onReplace: () => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onFlipX: () => void;
  onFlipY: () => void;
  onRotate: () => void;
  onDone: () => void;
  // 62차: 들어오기 전 상태로 되돌리고 끝내요.
  onCancel?: () => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxW: number } | null>(null);

  const update = useCallback(() => {
    const bar = ref.current;
    const anchor = anchorRef.current;
    if (!bar || !anchor) return;
    // 67차: 가로 고정(시험판)으로 돌려 보여주는 중이면 화면 좌표를 가상(돌리기 전) 좌표로 바꿔요(아니면 예전과 똑같은 값).
    const vi = virtualInner();
    const a = localRect(anchor);
    const stageEl = anchor.closest("[data-canvas-stage]") as HTMLElement | null;
    const sr = stageEl ? localRect(stageEl) : null;
    const bounds = {
      left: Math.max(0, sr ? sr.left : 0),
      top: Math.max(0, sr ? sr.top : 0),
      right: Math.min(vi.w, sr ? sr.right : vi.w),
      bottom: Math.min(vi.h, sr ? sr.bottom : vi.h),
    };
    const maxW = Math.max(120, bounds.right - bounds.left - TOOLBAR_EDGE * 2);
    const w = Math.min(bar.offsetWidth, maxW);
    const h = bar.offsetHeight;
    let left = a.left + a.width / 2 - w / 2;
    left = Math.min(bounds.right - TOOLBAR_EDGE - w, Math.max(bounds.left + TOOLBAR_EDGE, left));
    let top = a.bottom + TOOLBAR_GAP;
    if (top + h > bounds.bottom - TOOLBAR_EDGE) {
      const above = a.top - TOOLBAR_GAP - h;
      top = above >= bounds.top + TOOLBAR_EDGE ? above : a.bottom - TOOLBAR_GAP - h; // 위도 안 되면 사진 안쪽 아래
    }
    top = Math.min(bounds.bottom - TOOLBAR_EDGE - h, Math.max(bounds.top + TOOLBAR_EDGE, top));
    setPos((prev) =>
      prev && Math.abs(prev.left - left) < 0.5 && Math.abs(prev.top - top) < 0.5 && prev.maxW === maxW ? prev : { left, top, maxW }
    );
  }, [anchorRef]);

  useLayoutEffect(() => {
    update();
  });
  useEffect(() => {
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const ro = new ResizeObserver(update);
    if (anchorRef.current) ro.observe(anchorRef.current);
    const stage = anchorRef.current?.closest("[data-canvas-stage]");
    if (stage) ro.observe(stage);
    if (ref.current) ro.observe(ref.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      ro.disconnect();
    };
  }, [update, anchorRef]);

  if (typeof document === "undefined") return null;
  const bar = (
    <div
      ref={ref}
      role="toolbar"
      aria-label="사진 위치 조정"
      data-photo-position-toolbar
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[100002] flex w-max flex-wrap items-center gap-1 border border-[var(--color-hairline)] bg-white px-1.5 py-1 shadow-md"
      style={{
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxWidth: pos?.maxW,
        visibility: pos ? "visible" : "hidden",
      }}
    >
      <span className="whitespace-nowrap px-1.5 text-[12px] font-semibold text-[var(--color-brand-purple)]">사진 위치 조정 중</span>
      <ToolbarIconButton icon="replace" label="사진 변경" withText onClick={onReplace} />
      <ToolbarIconButton icon="zoomOut" label="축소" onClick={onZoomOut} />
      <ToolbarIconButton icon="zoomIn" label="확대" onClick={onZoomIn} />
      <ToolbarIconButton icon="fit" label="맞춤 (확대·위치 초기화)" onClick={onFit} />
      <ToolbarIconButton icon="flipH" label="좌우 반전" active={flipX} onClick={onFlipX} />
      <ToolbarIconButton icon="flipV" label="상하 반전" active={flipY} onClick={onFlipY} />
      <ToolbarIconButton icon="rotate" label="사진 90° 회전" onClick={onRotate} />
      {onCancel ? <ToolbarIconButton icon="reset" label="취소" withText onClick={onCancel} /> : null}
      <ToolbarIconButton icon="check" label="완료" withText primary onClick={onDone} />
    </div>
  );
  return createPortal(bar, document.body);
}
