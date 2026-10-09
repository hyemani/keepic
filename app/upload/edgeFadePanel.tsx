"use client";

// "가장자리 페이드" 설정 칸 — 사진 프레임 변경 패널의 "기본 설정" 안에 들어가요(사진 모양·테두리와 같은 자리).
// 켜기/끄기, 방향(전체/왼쪽/오른쪽/위/아래), 페이드 폭(박스 짧은 변의 %), 강도(%) 슬라이더 + 숫자 입력이에요.
// 값은 ImageBoxDef.edgeFade 로 저장돼요(width 는 비율 0.02~0.5 — 화면 확대/축소·px 와 무관). 효과 계산은 lib/edgeFade.ts.

import { useState } from "react";
import type { ImageBoxDef } from "@/lib/albumTemplates";
import {
  EDGE_FADE_DIRECTIONS,
  EDGE_FADE_STRENGTH_RANGE,
  EDGE_FADE_WIDTH_RANGE,
  resolveEdgeFade,
  type EdgeFade,
} from "@/lib/edgeFade";

function FadeSlider({
  label,
  unit,
  min,
  max,
  value,
  disabled,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const snap = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div className="mb-2">
      <p className="mb-1 text-[11px] text-[var(--color-charcoal)]/70">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(snap(Number(e.target.value)))}
          className="min-w-0 flex-1 disabled:opacity-40"
        />
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
          className="h-7 w-14 shrink-0 border border-[var(--color-hairline)] px-1 text-right text-[11px] tabular-nums disabled:opacity-40"
        />
        <span className="w-3 shrink-0 text-[11px] text-[var(--color-charcoal)]/50">{unit}</span>
      </div>
    </div>
  );
}

export function EdgeFadePanel({
  box,
  onChange,
}: {
  box: ImageBoxDef;
  onChange: (changes: Partial<ImageBoxDef>) => void;
}) {
  const fade = resolveEdgeFade(box.edgeFade);
  const set = (patch: Partial<EdgeFade>) => onChange({ edgeFade: { ...fade, ...patch } });
  return (
    <div className="mt-2 border-t border-[var(--color-hairline)] pt-2" data-edge-fade-panel>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="whitespace-nowrap text-[11px] font-semibold text-[var(--color-charcoal)]">가장자리 페이드</p>
        <button
          type="button"
          role="switch"
          aria-checked={fade.enabled}
          aria-label="가장자리 페이드 켜기/끄기"
          onClick={() => set({ enabled: !fade.enabled })}
          className={`h-6 min-w-[44px] border px-2 text-[11px] font-medium transition ${
            fade.enabled
              ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
              : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]/70"
          }`}
        >
          {fade.enabled ? "켜짐" : "꺼짐"}
        </button>
      </div>
      <p className="mb-1 text-[10px] leading-snug text-[var(--color-charcoal)]/50">
        가운데는 또렷하게, 가장자리는 서서히 투명해져요. 테두리·장식은 그대로예요.
      </p>
      <div className="mb-2 grid grid-cols-5 gap-1" role="radiogroup" aria-label="페이드 방향">
        {EDGE_FADE_DIRECTIONS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={fade.direction === d.id}
            disabled={!fade.enabled}
            onClick={() => set({ direction: d.id })}
            className={`h-7 whitespace-nowrap border px-0.5 text-[11px] transition disabled:opacity-40 ${
              fade.direction === d.id
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <FadeSlider
        label="페이드 폭 (짧은 변 대비)"
        unit="%"
        min={EDGE_FADE_WIDTH_RANGE.min}
        max={EDGE_FADE_WIDTH_RANGE.max}
        disabled={!fade.enabled}
        value={Math.round(fade.width * 100)}
        onChange={(v) => set({ width: v / 100 })}
      />
      <FadeSlider
        label="페이드 강도"
        unit="%"
        min={EDGE_FADE_STRENGTH_RANGE.min}
        max={EDGE_FADE_STRENGTH_RANGE.max}
        disabled={!fade.enabled}
        value={Math.round(fade.strength)}
        onChange={(v) => set({ strength: v })}
      />
    </div>
  );
}
