"use client";

// 왼쪽 "레이아웃" 패널 화면 부품이에요(내지·표지 공용). 위에서부터
//   1) 적용 대상(내지: 왼쪽/오른쪽/현재 펼침, 표지: 앞표지/뒤표지) 선택
//   2) 사진 칸 개수 칩(전체·1장~5장·6장 이상) — 개수는 "그 대상 안의 사진 칸 총 개수"예요
//   3) 레이아웃 썸네일 목록(내지는 2열, 표지는 앞표지+책등+뒤표지 구성의 큰 썸네일)
// 썸네일은 실제로 적용할 때 쓰는 칸 좌표(slotsFor — 안전영역 보정까지 같은 함수)를 그대로 그려서,
// 썸네일 모양 = 적용 결과예요. 이 파일은 그리기만 하고, 실제 적용·사진 보존은 page.tsx의
// applyLayoutTemplate / applyCoverLayoutTemplate가 해요(기존 동작 그대로).
import type { PhotoLayoutTemplate, LayoutSlot } from "@/lib/photoLayoutTemplates";
import { captionSlotFor, slotToSpreadCoords } from "@/lib/photoLayoutTemplates";
import { NESTED_SCROLL, PANEL_STACK, SegTabs } from "./sidePanelShell";

export type LayoutCountFilter = "all" | 1 | 2 | 3 | 4 | 5 | "6+";

export const LAYOUT_COUNT_FILTERS: { id: LayoutCountFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: 1, label: "1장" },
  { id: 2, label: "2장" },
  { id: 3, label: "3장" },
  { id: 4, label: "4장" },
  { id: 5, label: "5장" },
  { id: "6+", label: "6장 이상" },
];

export function matchesLayoutCountFilter(photoCount: number, f: LayoutCountFilter): boolean {
  if (f === "all") return true;
  if (f === "6+") return photoCount >= 6;
  return photoCount === f;
}

export type LayoutThumbFrame =
  | { kind: "spread"; range: "left" | "right" | "spread"; leftBlank?: boolean; rightBlank?: boolean }
  | { kind: "cover"; target: "front" | "back"; backPct: number; spinePct: number; frontPct: number; aspect: number };

export type LayoutTargetOption = { id: string; label: string; disabled?: boolean; title?: string };

function SlotRect({ slot, selected }: { slot: LayoutSlot; selected: boolean }) {
  return (
    <div
      className={`absolute border border-white ${selected ? "bg-[var(--color-sky)]/75" : "bg-[var(--color-charcoal)]/30"}`}
      style={{
        left: `${slot.xPct}%`,
        top: `${slot.yPct}%`,
        width: `${slot.widthPct}%`,
        height: `${slot.heightPct}%`,
      }}
    />
  );
}

function CaptionBars({ rect }: { rect: { xPct: number; yPct: number; widthPct: number; heightPct: number } }) {
  return (
    <div
      className="absolute flex flex-col justify-center gap-[2px] px-[6%]"
      style={{ left: `${rect.xPct}%`, top: `${rect.yPct}%`, width: `${rect.widthPct}%`, height: `${rect.heightPct}%` }}
    >
      <div className="h-[2px] w-full bg-[var(--color-charcoal)]/25" />
      <div className="h-[2px] w-2/3 bg-[var(--color-charcoal)]/25" />
    </div>
  );
}

function LayoutThumb({
  template,
  frame,
  slots,
  selected,
}: {
  template: PhotoLayoutTemplate;
  frame: LayoutThumbFrame;
  slots: LayoutSlot[];
  selected: boolean;
}) {
  const caption = captionSlotFor(template);
  if (frame.kind === "spread") {
    const range = frame.range;
    const cap = caption && range !== "spread" ? { ...caption, ...slotToSpreadCoords(caption, range) } : null;
    return (
      <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: "2 / 1" }}>
        {range === "left" && <div className="absolute inset-y-0 right-0 w-1/2 bg-[var(--color-charcoal)]/[0.06]" />}
        {range === "right" && <div className="absolute inset-y-0 left-0 w-1/2 bg-[var(--color-charcoal)]/[0.06]" />}
        {frame.leftBlank && range !== "right" && <div className="absolute inset-y-0 left-0 w-1/2 bg-[var(--color-charcoal)]/[0.06]" />}
        {frame.rightBlank && range !== "left" && <div className="absolute inset-y-0 right-0 w-1/2 bg-[var(--color-charcoal)]/[0.06]" />}
        <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--color-charcoal)]/25" />
        {slots.map((s, i) => (
          <SlotRect key={i} slot={s} selected={selected} />
        ))}
        {cap && <CaptionBars rect={cap} />}
      </div>
    );
  }
  // 표지: 뒤표지 | 책등 | 앞표지를 실제 폭 비율로 그리고, 선택한 대상(앞 또는 뒤) 칸 안에만 사진 칸을 그려요.
  const { backPct, spinePct, frontPct, target } = frame;
  const panelLeft = target === "back" ? 0 : backPct + spinePct;
  const panelWidth = target === "back" ? backPct : frontPct;
  const mapX = (xPct: number) => panelLeft + (xPct / 100) * panelWidth;
  const mapW = (wPct: number) => (wPct / 100) * panelWidth;
  return (
    <div className="relative w-full overflow-hidden bg-white" style={{ aspectRatio: String(frame.aspect) }}>
      <div className="absolute inset-y-0 bg-[var(--color-ivory)]" style={{ left: `${backPct}%`, width: `${spinePct}%` }} />
      <div className="absolute inset-y-0 w-px bg-[var(--color-charcoal)]/30" style={{ left: `${backPct}%` }} />
      <div className="absolute inset-y-0 w-px bg-[var(--color-charcoal)]/30" style={{ left: `${backPct + spinePct}%` }} />
      <div
        className="absolute inset-y-0 bg-[var(--color-charcoal)]/[0.05]"
        style={target === "back" ? { left: `${backPct + spinePct}%`, right: 0 } : { left: 0, width: `${backPct + spinePct}%` }}
      />
      <span className="absolute bottom-0.5 left-1 text-[8px] leading-none text-[var(--color-charcoal)]/35">뒤</span>
      <span className="absolute bottom-0.5 right-1 text-[8px] leading-none text-[var(--color-charcoal)]/35">앞</span>
      {slots.map((s, i) => (
        <SlotRect
          key={i}
          selected={selected}
          slot={{ xPct: mapX(s.xPct), yPct: s.yPct, widthPct: mapW(s.widthPct), heightPct: s.heightPct }}
        />
      ))}
      {caption && (
        <CaptionBars
          rect={{ xPct: mapX(caption.xPct), yPct: caption.yPct, widthPct: mapW(caption.widthPct), heightPct: caption.heightPct }}
        />
      )}
    </div>
  );
}

export function LayoutPanel({
  targets,
  target,
  onTargetChange,
  templates,
  frame,
  slotsFor,
  isSelected,
  onApply,
  filter,
  onFilterChange,
  message,
}: {
  targets: LayoutTargetOption[];
  target: string;
  onTargetChange: (id: string) => void;
  templates: PhotoLayoutTemplate[];
  frame: LayoutThumbFrame;
  slotsFor: (t: PhotoLayoutTemplate) => LayoutSlot[];
  isSelected: (t: PhotoLayoutTemplate) => boolean;
  onApply: (t: PhotoLayoutTemplate) => void;
  filter: LayoutCountFilter;
  onFilterChange: (f: LayoutCountFilter) => void;
  message?: string | null;
}) {
  const visible = templates.filter((t) => matchesLayoutCountFilter(t.photoCount, filter));
  const isCover = frame.kind === "cover";
  const countOf = (f: LayoutCountFilter) => templates.filter((t) => matchesLayoutCountFilter(t.photoCount, f)).length;
  return (
    <div className={PANEL_STACK} data-layout-panel data-layout-mode={isCover ? "cover" : "inner"}>
      <SegTabs
        ariaLabel="레이아웃 적용 대상"
        dataAttr="data-layout-target"
        items={targets}
        value={target}
        onChange={onTargetChange}
      />
      <div className="grid grid-cols-4 gap-px bg-[var(--color-hairline)] text-[11px]" role="group" aria-label="사진 칸 개수">
        {LAYOUT_COUNT_FILTERS.map((f) => (
          <button
            key={String(f.id)}
            type="button"
            data-layout-chip={String(f.id)}
            aria-pressed={filter === f.id}
            onClick={() => onFilterChange(f.id)}
            title={`${countOf(f.id)}개`}
            className={`flex min-h-[30px] items-center justify-center whitespace-nowrap px-1 font-medium transition ${
              f.id === "6+" ? "col-span-2" : ""
            } ${
              filter === f.id
                ? "bg-[var(--color-charcoal)] text-white"
                : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:text-[var(--color-charcoal)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {message ? (
        <p className="bg-[var(--color-ivory)] px-1.5 py-2 text-[11px] break-keep text-[var(--color-charcoal)]/70">{message}</p>
      ) : null}
      <div
        data-layout-list
        className={`grid gap-1.5 ${NESTED_SCROLL} max-h-[calc(100vh-15rem)] ${isCover ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {visible.map((t) => {
          const selected = isSelected(t);
          return (
            <button
              key={t.id}
              type="button"
              data-layout-id={t.id}
              data-layout-count={t.photoCount}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
              title={`${t.name} · 사진 칸 ${t.photoCount}개`}
              onClick={() => onApply(t)}
              className={`block border-2 p-0.5 text-left transition ${
                selected
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]/60"
              }`}
            >
              <LayoutThumb template={t} frame={frame} slots={slotsFor(t)} selected={selected} />
            </button>
          );
        })}
        {visible.length === 0 && (
          <p className="col-span-full text-[11px] text-[var(--color-charcoal)]/40">이 개수에 맞는 레이아웃이 없어요.</p>
        )}
      </div>
    </div>
  );
}
