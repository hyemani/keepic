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
import { SEG_TAB_ROW, segTabClass } from "./sidePanelShell";

export type PhotoEditSection = "crop" | "filter" | "adjust";

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
  | "compare";

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
}: {
  icon: PhotoToolIconName;
  label: string;
  title?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[34px] min-w-[44px] items-center justify-center gap-1 border px-1 py-1 text-[12px] leading-tight transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
          : `border-[var(--color-hairline)] bg-white ${TEXT_MAIN} hover:bg-[var(--color-ivory)]`
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

const SECTION_TABS: { id: PhotoEditSection; label: string }[] = [
  { id: "crop", label: "위치·크롭" },
  { id: "filter", label: "필터" },
  { id: "adjust", label: "보정" },
];

/**
 * 선택한 사진 한 장의 편집 패널 — 맨 위에 "사진 변경" 버튼, 그 아래 4개 구역(탭):
 * 사진 변경 / 위치·크롭 / 필터 / 보정. 원본 사진은 절대 안 바뀌고, 값은 ImageBoxDef 의 선택 필드로만 저장돼요.
 */
export function PhotoEditPanel({
  box,
  onChange,
  getHandle,
  onRequestReplace,
  section,
  onSectionChange,
}: {
  box: ImageBoxDef;
  onChange: (changes: Partial<ImageBoxDef>) => void;
  getHandle: () => PhotoEditHandle | undefined;
  onRequestReplace: () => void;
  section: PhotoEditSection;
  onSectionChange: (s: PhotoEditSection) => void;
}) {
  const filter = resolvePhotoFilter(box.photoFilter);
  const adjust = resolvePhotoAdjust(box.photoAdjust);
  const hasEdit = !isPhotoEditIdentity(box.photoFilter, box.photoAdjust);
  const thumbs = usePhotoFilterThumbs(section === "filter" ? box.url : "");
  const turn = normalizePhotoQuarterTurn(box.photoRotation);

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

  // 왼쪽 패널 폭이 좁아서(약 220px) 두 버튼을 세로로 쌓아요 — 눌러야 하는 높이는 각각 40px 이상.
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
        className="flex min-h-[34px] w-full items-center justify-center gap-1.5 border border-[var(--color-hairline)] bg-white px-2 text-[12px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-40"
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
        className={`min-h-[34px] w-full border px-2 text-[12px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
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
      className="flex min-h-[34px] w-full items-center justify-center gap-1.5 border border-[var(--color-hairline)] bg-white px-2 text-[12px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <PhotoToolIcon name="reset" className="h-5 w-5 shrink-0" />
      <span className="whitespace-nowrap">보정 초기화</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-2" data-photo-edit-panel>
      <PrimaryActionButton
        title="이 사진을 다른 사진으로 바꿔요 (모양·액자·테두리·위치·크기는 그대로)"
        ariaLabel="사진 변경"
        onClick={onRequestReplace}
      >
        <PhotoToolIcon name="replace" className="h-5 w-5 shrink-0" />
        <span className="whitespace-nowrap">사진 변경</span>
      </PrimaryActionButton>

      <div role="tablist" aria-label="사진 편집 구역" className={SEG_TAB_ROW}>
        {SECTION_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={section === t.id}
            onClick={() => onSectionChange(t.id)}
            className={segTabClass(section === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section === "crop" && (
        <div className="border border-[var(--color-hairline)] bg-white p-2">
          <p className="mb-2 text-[12px] leading-snug text-[var(--color-charcoal)]/60 break-keep">
            사진 위에서 끌면 안쪽 사진만 움직여요. 박스 크기는 캔버스의 손잡이로 조절해요.
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <PanelToolButton icon="zoomOut" label="축소" onClick={() => getHandle()?.zoomOut()} />
            <PanelToolButton icon="zoomIn" label="확대" onClick={() => getHandle()?.zoomIn()} />
            <PanelToolButton icon="fit" label="맞춤" title="맞춤 (확대·위치만 처음으로)" onClick={() => getHandle()?.resetPhotoPosition()} />
            <PanelToolButton
              icon="rotate"
              label="회전"
              title="사진 90° 회전"
              onClick={() =>
                onChange({ photoRotation: (turn + 90) % 360, innerOffsetXPct: 0, innerOffsetYPct: 0 })
              }
            />
            <PanelToolButton
              icon="flipH"
              label="좌우"
              title="좌우 반전"
              active={!!box.flipX}
              onClick={() => onChange({ flipX: !box.flipX })}
            />
            <PanelToolButton
              icon="flipV"
              label="상하"
              title="상하 반전"
              active={!!box.flipY}
              onClick={() => onChange({ flipY: !box.flipY })}
            />
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
            className="flex min-h-[34px] w-full items-center justify-center gap-1.5 border border-[var(--color-hairline)] bg-white px-2 text-[12px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)]"
          >
            <PhotoToolIcon name="reset" className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">위치 초기화</span>
          </button>
        </div>
      )}

      {section === "filter" && (
        <div className="border border-[var(--color-hairline)] bg-white p-2">
          <div className="grid grid-cols-3 gap-1.5">
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
      )}

      {section === "adjust" && (
        <div className="border border-[var(--color-hairline)] bg-white p-2">
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
      )}
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
        aria-label="사진 변경"
        className="flex max-h-[88vh] w-full max-w-[560px] flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-4 py-3">
          <p className="text-[14px] font-semibold text-[var(--color-charcoal)]">사진 변경</p>
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
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxW: number } | null>(null);

  const update = useCallback(() => {
    const bar = ref.current;
    const anchor = anchorRef.current;
    if (!bar || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const stageEl = anchor.closest("[data-canvas-stage]") as HTMLElement | null;
    const sr = stageEl ? stageEl.getBoundingClientRect() : null;
    const bounds = {
      left: Math.max(0, sr ? sr.left : 0),
      top: Math.max(0, sr ? sr.top : 0),
      right: Math.min(window.innerWidth, sr ? sr.right : window.innerWidth),
      bottom: Math.min(window.innerHeight, sr ? sr.bottom : window.innerHeight),
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
      <ToolbarIconButton icon="check" label="완료" withText primary onClick={onDone} />
    </div>
  );
  return createPortal(bar, document.body);
}
