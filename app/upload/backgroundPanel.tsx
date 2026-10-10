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
    drawBackgroundSpecOnCanvas(ctx, { ...spec, span: "page" }, 0, 0, cv.width, cv.height, (mm) => mm * ppm, {
      x: 0,
      y: 0,
      w: pageMm.w * ppm,
      h: pageMm.h * ppm,
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
}: {
  targets: BackgroundTargetOption[];
  target: string;
  onTargetChange: (id: string) => void;
  current: BackgroundSpec | undefined;
  onApply: (spec: BackgroundSpec) => void;
  onReset: () => void;
  onApplyAllInner?: () => void;
  pageMm: { w: number; h: number };
  renderColorChart: (p: {
    activeColor: string;
    onPick: (c: string) => void;
    customValue: string;
    onCustomChange: (c: string) => void;
  }) => ReactNode;
}) {
  const [tabState, setTabState] = useState<TabId | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  // 이전 소재('더 보기')는 접어두되, 지금 고른 무늬가 이전 소재면 자동으로 펼쳐서 선택 표시가 보이게 해요.
  const [legacyOpen, setLegacyOpen] = useState(false);
  const tab: TabId = tabState ?? (current ? (current.kind === "solid" ? "solid" : current.kind) : "graphic");
  const currentPreset = current ? effectivePreset(current) : undefined;
  const isPatternKind = current?.kind === "pattern";
  const scaleNow = current?.scaleMm ?? currentPreset?.spacingMm;
  const hasPresetControls = !!current && current.kind !== "solid" && !!currentPreset;
  const solidNow = current?.kind === "solid" ? solidColorOf(current) : "";
  return (
    <div className="flex flex-col gap-1.5" data-bg-panel>
      <div role="tablist" aria-label="배경 종류" className="grid grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-bg-tab={t.id}
            aria-selected={tab === t.id}
            onClick={() => setTabState(t.id)}
            className={`flex min-h-[34px] items-center justify-center whitespace-nowrap px-0.5 text-xs font-medium transition ${
              tab === t.id
                ? "bg-[var(--color-charcoal)] text-white"
                : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:text-[var(--color-charcoal)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tablist" aria-label="배경 적용 대상" className="grid" style={{ gridTemplateColumns: `repeat(${targets.length}, minmax(0, 1fr))` }}>
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-bg-target={t.id}
            aria-selected={target === t.id}
            disabled={t.disabled}
            title={t.title}
            onClick={() => {
              setConfirmAll(false);
              onTargetChange(t.id);
            }}
            className={`flex min-h-[30px] items-center justify-center whitespace-nowrap border-b-2 px-0.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
              target === t.id
                ? "border-[var(--color-sky)] text-[var(--color-charcoal)]"
                : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/55 hover:text-[var(--color-charcoal)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {hasPresetControls && currentPreset ? (
        <div className="flex flex-col gap-1.5 border border-[var(--color-hairline)] bg-white p-1.5" data-bg-controls>
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
      <div className="grid grid-cols-1 gap-1">
        <button
          type="button"
          data-bg-reset
          onClick={() => {
            setConfirmAll(false);
            onReset();
          }}
          className="flex min-h-[30px] w-full items-center justify-center whitespace-nowrap border border-[var(--color-hairline)] bg-white text-[11px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)]"
        >
          배경 초기화
        </button>
        {onApplyAllInner ? (
          confirmAll ? (
            <div className="flex items-center gap-1" data-bg-all-confirm>
              <span className="min-w-0 flex-1 text-[11px] leading-tight text-[var(--color-charcoal)]/70">모든 내지 배경이 바뀌어요.</span>
              <button
                type="button"
                data-bg-all-ok
                onClick={() => {
                  setConfirmAll(false);
                  onApplyAllInner();
                }}
                className="min-h-[30px] whitespace-nowrap bg-[var(--color-charcoal)] px-2 text-[11px] text-white"
              >
                적용
              </button>
              <button
                type="button"
                onClick={() => setConfirmAll(false)}
                className="min-h-[30px] whitespace-nowrap border border-[var(--color-hairline)] bg-white px-2 text-[11px]"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-bg-all-inner
              onClick={() => setConfirmAll(true)}
              className="flex min-h-[30px] w-full items-center justify-center whitespace-nowrap border border-[var(--color-hairline)] bg-white text-[11px] text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)]"
            >
              전체 내지 배경 변경
            </button>
          )
        ) : null}
      </div>
      <div data-bg-list className="max-h-[calc(100vh-21rem)] min-h-[8rem] overflow-y-auto pr-0.5">
        {tab === "solid" ? (
          renderColorChart({
            activeColor: solidNow,
            onPick: (c) => onApply({ kind: "solid", color: c }),
            customValue: toHex6(solidNow || "#ffffff"),
            onCustomChange: (c) => onApply({ kind: "solid", color: c }),
          })
        ) : (
          (() => {
            const items = backgroundPatterns.filter((p) => p.category === tab);
            const byGroup = (g: "default" | "kids" | "legacy") => items.filter((p) => backgroundPresetGroup(p) === g);
            const kids = byGroup("kids");
            const legacy = byGroup("legacy");
            const currentBase = current && current.kind !== "solid" ? findBackgroundPattern(current.presetId) : undefined;
            const legacyShown = legacyOpen || (!!currentBase && legacy.some((p) => p.id === currentBase.id));
            const renderItem = (p: BackgroundPatternPreset) => {
              const spec: BackgroundSpec = { kind: p.category, presetId: p.id };
              const selected = current?.presetId === p.id && current.kind !== "solid";
              return (
                <button
                  key={p.id}
                  type="button"
                  data-bg-id={p.id}
                  data-bg-group={backgroundPresetGroup(p)}
                  data-bg-selected={selected ? "true" : "false"}
                  aria-pressed={selected}
                  title={p.label}
                  onClick={() => onApply(spec)}
                  className={`block overflow-hidden border-2 p-0 text-left transition ${
                    selected ? "border-[var(--color-sky)]" : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]/60"
                  }`}
                >
                  <BackgroundThumb spec={spec} pageMm={pageMm} />
                  <span className="block truncate bg-white px-1 py-0.5 text-[10px] text-[var(--color-charcoal)]/70">{p.label}</span>
                </button>
              );
            };
            return (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-1.5">{byGroup("default").map(renderItem)}</div>
                {kids.length ? (
                  <section data-bg-section="kids" className="flex flex-col gap-1">
                    <h3 className="text-[11px] font-medium text-[var(--color-charcoal)]/70">키즈·성장앨범용</h3>
                    <div className="grid grid-cols-2 gap-1.5">{kids.map(renderItem)}</div>
                  </section>
                ) : null}
                {legacy.length ? (
                  <section data-bg-section="legacy" className="flex flex-col gap-1">
                    <button
                      type="button"
                      data-bg-legacy-toggle
                      aria-expanded={legacyShown}
                      onClick={() => setLegacyOpen((v) => !v)}
                      className="flex min-h-[30px] w-full items-center justify-center whitespace-nowrap border border-[var(--color-hairline)] bg-white text-[11px] text-[var(--color-charcoal)]/80 transition hover:bg-[var(--color-ivory)]"
                    >
                      {legacyShown ? "이전 소재 접기" : `이전 소재 더 보기 (${legacy.length})`}
                    </button>
                    {legacyShown ? <div className="grid grid-cols-2 gap-1.5">{legacy.map(renderItem)}</div> : null}
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
