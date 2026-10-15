"use client";

// 왼쪽 "배경" 패널 화면 부품이에요(내지·표지 공용). 위에서부터
//   1) 그래픽 / 패턴 / 텍스처 / 단색 탭(맨 위에 고정)
//   2) 적용 대상 선택(내지: 왼쪽/오른쪽/현재 펼침, 표지: 앞표지/뒤표지/표지 전체)
//   3) 지금 배경의 조절(바탕색·무늬색·반복 크기(mm)) + 배경 초기화 (+ 내지: 전체 내지 배경 변경)
//   4) 2열 썸네일 목록 — 여기만 스크롤돼요
// 썸네일은 실제 화면·인쇄와 같은 그리기 함수(lib/backgroundSpec.ts → drawBackgroundPatternOnCanvas)로 그려서
// 보이는 그대로 적용돼요. 이 파일은 그리기·선택만 하고, 실제로 배경을 바꾸고 저장하는 건 page.tsx가 해요.
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  backgroundPatterns,
  backgroundPresetGroup,
  findBackgroundPattern,
  type BackgroundPatternCategory,
  type BackgroundPatternPreset,
} from "@/lib/backgroundPatterns";
import { ACTION_BUTTON_BASE, NESTED_SCROLL, PANEL_STACK, SECONDARY_ACTION_BUTTON_CLASS, SETTING_BOX, SegTabs } from "./sidePanelShell";
import { drawBackgroundSpecOnCanvas, effectivePreset, solidColorOf, type BackgroundSpec } from "@/lib/backgroundSpec";

type TabId = BackgroundPatternCategory | "solid";

const TABS: { id: TabId; label: string }[] = [
  { id: "graphic", label: "그래픽" },
  { id: "pattern", label: "패턴" },
  { id: "texture", label: "텍스처" },
  { id: "solid", label: "단색" },
];

export type BackgroundTargetOption = { id: string; label: string; disabled?: boolean; title?: string };

const THUMB_PX = 160;

// 그래픽은 낱장 한 장 전체가 보이게, 패턴·텍스처는 실제 크기(약 60mm 정사각)로 보여줘요.
function BackgroundThumb({ spec, pageMm }: { spec: BackgroundSpec; pageMm: { w: number; h: number } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const preset = effectivePreset(spec);
  const isGraphic = spec.kind === "graphic";
  const key = JSON.stringify([spec, pageMm]);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const viewWmm = isGraphic ? pageMm.w : Math.min(60, pageMm.w);
    const viewHmm = isGraphic ? pageMm.h : Math.min(60, pageMm.h);
    const ppm = THUMB_PX / viewWmm;
    cv.width = THUMB_PX;
    cv.height = Math.max(2, Math.round(viewHmm * ppm));
    drawBackgroundSpecOnCanvas(ctx, { ...spec, span: "whole" }, 0, 0, cv.width, cv.height, (mm) => mm * ppm, {
      x: 0,
      y: 0,
      w: pageMm.w * ppm,
      h: pageMm.h * ppm,
      // 책등 이음띠 무늬는 한 판 썸네일에서도 띠가 보이게 책등 폭 7.2mm(소프트 20쪽)로 그려요(실제 표지는 실제 책등 폭을 써요).
      ...(preset?.kind === "splitSpine" ? { spineW: 7.2 * ppm } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <canvas
      ref={ref}
      aria-label={preset?.label}
      className="block w-full"
      style={{ aspectRatio: isGraphic ? `${pageMm.w} / ${pageMm.h}` : "1 / 1" }}
    />
  );
}

export function BackgroundPanel({
  targets,
  target,
  onTargetChange,
  current,
  onApply,
  onReset,
  onApplyAllInner,
  pageMm,
  renderColorChart,
  coverWhole = false,
}: {
  targets: BackgroundTargetOption[];
  target: string;
  onTargetChange: (id: string) => void;
  current: BackgroundSpec | undefined;
  onApply: (spec: BackgroundSpec) => void;
  onReset: () => void;
  onApplyAllInner?: () => void;
  pageMm: { w: number; h: number };
  // true면(표지 · "표지 전체" 대상) 책등 이음띠가 있는 좌우 분할 배경도 목록에 보여요(45차). 내지·앞/뒤 한 판에는 책등이 없어서 안 보여요.
  coverWhole?: boolean;
  renderColorChart: (p: {
    activeColor: string;
    onPick: (c: string) => void;
    customValue: string;
    onCustomChange: (c: string) => void;
  }) => ReactNode;
}) {
  const [tabState, setTabState] = useState<TabId | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const tab: TabId = tabState ?? (current ? (current.kind === "solid" ? "solid" : current.kind) : "graphic");
  const currentPreset = current ? effectivePreset(current) : undefined;
  const isPatternKind = current?.kind === "pattern";
  const scaleNow = current?.scaleMm ?? currentPreset?.spacingMm;
  const hasPresetControls = !!current && current.kind !== "solid" && !!currentPreset;
  const solidNow = current?.kind === "solid" ? solidColorOf(current) : "";
  return (
    <div className={PANEL_STACK} data-bg-panel>
      <SegTabs
        ariaLabel="배경 종류"
        dataAttr="data-bg-tab"
        items={TABS}
        value={tab}
        onChange={(id) => setTabState(id as TabId)}
      />
      <SegTabs
        ariaLabel="배경 적용 대상"
        dataAttr="data-bg-target"
        items={targets}
        value={target}
        onChange={(id) => {
          setConfirmAll(false);
          onTargetChange(id);
        }}
      />
      {hasPresetControls && currentPreset ? (
        <div className={`${PANEL_STACK} ${SETTING_BOX}`} data-bg-controls>
          <div className="flex items-center gap-2 text-[11px] text-[var(--color-charcoal)]/70">
            <span className="min-w-0 flex-1 truncate">{currentPreset.label}</span>
            <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap" title="바탕색">
              <span className="relative h-5 w-5 overflow-hidden border border-[var(--color-hairline)]" style={{ background: currentPreset.colors[0] }}>
                <input
                  type="color"
                  aria-label="바탕색"
                  data-bg-color="base"
                  value={toHex6(currentPreset.colors[0])}
                  onChange={(e) => current && onApply({ ...current, color: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </span>
              바탕
            </label>
            <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap" title="무늬색">
              <span className="relative h-5 w-5 overflow-hidden border border-[var(--color-hairline)]" style={{ background: currentPreset.colors[1] }}>
                <input
                  type="color"
                  aria-label="무늬색"
                  data-bg-color="accent"
                  value={toHex6(currentPreset.colors[1])}
                  onChange={(e) => current && onApply({ ...current, accent: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </span>
              무늬
            </label>
          </div>
          {isPatternKind && scaleNow ? (
            <label className="flex items-center gap-2 text-[11px] text-[var(--color-charcoal)]/70">
              <span className="whitespace-nowrap">크기</span>
              <input
                type="range"
                aria-label="무늬 크기(mm)"
                data-bg-scale
                min={2}
                max={40}
                step={0.5}
                value={scaleNow}
                onChange={(e) => current && onApply({ ...current, scaleMm: Number(e.target.value) })}
                className="min-w-0 flex-1"
              />
              <span className="w-10 text-right tabular-nums">{scaleNow}mm</span>
            </label>
          ) : null}
        </div>
      ) : null}
      <div className={PANEL_STACK}>
        <button
          type="button"
          data-bg-reset
          onClick={() => {
            setConfirmAll(false);
            onReset();
          }}
          className={SECONDARY_ACTION_BUTTON_CLASS}
        >
          배경 초기화
        </button>
        {onApplyAllInner ? (
          confirmAll ? (
            <div className="flex items-center gap-1.5" data-bg-all-confirm>
              <span className="min-w-0 flex-1 text-[11px] leading-tight text-[var(--color-charcoal)]/70">모든 내지 배경이 바뀌어요.</span>
              <button
                type="button"
                data-bg-all-ok
                onClick={() => {
                  setConfirmAll(false);
                  onApplyAllInner();
                }}
                className={`${ACTION_BUTTON_BASE} w-auto shrink-0 bg-[var(--color-charcoal)] px-2 text-white`}
              >
                적용
              </button>
              <button
                type="button"
                onClick={() => setConfirmAll(false)}
                className={`${SECONDARY_ACTION_BUTTON_CLASS} w-auto shrink-0`}
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-bg-all-inner
              onClick={() => setConfirmAll(true)}
              className={SECONDARY_ACTION_BUTTON_CLASS}
            >
              전체 내지 배경 변경
            </button>
          )
        ) : null}
      </div>
      <div data-bg-list className={`max-h-[calc(100vh-21rem)] min-h-[8rem] ${NESTED_SCROLL}`}>
        {tab === "solid" ? (
          renderColorChart({
            activeColor: solidNow,
            onPick: (c) => onApply({ kind: "solid", color: c }),
            customValue: toHex6(solidNow || "#ffffff"),
            onCustomChange: (c) => onApply({ kind: "solid", color: c }),
          })
        ) : (
          (() => {
            const items = backgroundPatterns.filter((p) => p.category === tab && (p.kind !== "splitSpine" || coverWhole || current?.presetId === p.id));
            const byGroup = (g: "default" | "kids" | "legacy") => items.filter((p) => backgroundPresetGroup(p) === g);
            const kids = byGroup("kids");
            // 목록에서 숨긴 예전 소재가 지금 배경이면, 목록 맨 위에 '현재 배경' 한 칸만 보여서 확인·초기화할 수 있게 해요.
            const currentBase = current && current.kind !== "solid" ? findBackgroundPattern(current.presetId) : undefined;
            const hiddenCurrent = currentBase && currentBase.category === tab && backgroundPresetGroup(currentBase) === "legacy" ? currentBase : undefined;
            const renderItem = (p: BackgroundPatternPreset, asCurrent = false) => {
              const spec: BackgroundSpec = asCurrent && current ? current : { kind: p.category, presetId: p.id };
              const selected = current?.presetId === p.id && current.kind !== "solid";
              return (
                <button
                  key={p.id}
                  type="button"
                  data-bg-id={p.id}
                  data-bg-group={backgroundPresetGroup(p)}
                  data-bg-selected={selected ? "true" : "false"}
                  aria-pressed={selected}
                  data-bg-current-tile={asCurrent ? "true" : undefined}
                  title={p.label}
                  onClick={() => (asCurrent ? undefined : onApply(spec))}
                  className={`block overflow-hidden border-2 p-0 text-left transition ${
                    selected ? "border-[var(--color-sky)]" : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]/60"
                  }`}
                >
                  <BackgroundThumb spec={spec} pageMm={pageMm} />
                  <span className="block truncate bg-white px-1 py-0.5 text-[10px] text-[var(--color-charcoal)]/70">{asCurrent ? `현재 배경 · ${p.label}` : p.label}</span>
                </button>
              );
            };
            return (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {hiddenCurrent ? renderItem(hiddenCurrent, true) : null}
                  {byGroup("default").map((p) => renderItem(p))}
                </div>
                {kids.length ? (
                  <section data-bg-section="kids" className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-medium text-[var(--color-charcoal)]/70">키즈·성장앨범용</h3>
                    <div className="grid grid-cols-2 gap-1.5">{kids.map((p) => renderItem(p))}</div>
                  </section>
                ) : null}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

// <input type="color">는 #rrggbb 형식만 받아요.
function toHex6(c: string): string {
  const m = /^#([0-9a-f]{3})$/i.exec(c);
  if (m) return "#" + m[1].split("").map((x) => x + x).join("");
  return /^#[0-9a-f]{6}$/i.test(c) ? c : "#ffffff";
}
