"use client";

// 테두리 색상 고르기 — 글자 없이 작은 색 동그라미 6개(검정·흰색·회색·크림·연분홍·하늘색)가 한 줄로, 그 끝에 7번째로
// "직접 고르기" 버튼(누르면 색 선택창이 열려요)이 있어요. 지금 고른 색은 동그라미 바깥 테두리(링)로 표시하고, 색 이름은
// 마우스를 올리면 뜨는 설명(title)으로 보여줘요. 저장된 색은 그대로 쓰여요 — 6개 색 중 하나가 아니면 7번째(직접 고르기)가
// 선택된 상태로 그 색을 보여줘요. 값은 ImageBoxDef.borderColor("#rrggbb")라서 저장 형식은 예전과 똑같아요.

export const BORDER_COLOR_PRESETS: { hex: string; label: string }[] = [
  { hex: "#000000", label: "검정" },
  { hex: "#ffffff", label: "흰색" },
  { hex: "#9a9a9a", label: "회색" },
  { hex: "#f3e9d2", label: "크림" },
  { hex: "#f8c8d4", label: "연분홍" },
  { hex: "#a9d6f2", label: "하늘색" },
];

export function BorderColorSwatches({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const cur = (value || "#ffffff").toLowerCase();
  const presetHit = BORDER_COLOR_PRESETS.some((c) => c.hex === cur);
  const ring = "ring-2 ring-[var(--color-sky)] ring-offset-1";
  return (
    <div className="mb-2 flex flex-nowrap items-center gap-1.5" role="group" aria-label="테두리 색 고르기" data-border-color-swatches>
      {BORDER_COLOR_PRESETS.map((c) => {
        const active = c.hex === cur;
        return (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            aria-label={`테두리 색 ${c.label}`}
            aria-pressed={active}
            onClick={() => onChange(c.hex)}
            className={`h-6 w-6 shrink-0 rounded-full border border-[var(--color-charcoal)]/25 transition ${active ? ring : "hover:scale-110"}`}
            style={{ backgroundColor: c.hex }}
          />
        );
      })}
      <label
        title="직접 고르기"
        className={`relative block h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[var(--color-charcoal)]/25 transition ${
          presetHit ? "hover:scale-110" : ring
        }`}
        style={{
          background: presetHit
            ? "conic-gradient(from 0deg, #ff5e5e, #ffd34e, #6ee06e, #4ec9ff, #8a6bff, #ff6bd0, #ff5e5e)"
            : cur,
        }}
        data-border-color-custom
        data-selected={presetHit ? undefined : "1"}
      >
        <input
          type="color"
          aria-label="테두리 색상 직접 선택"
          value={/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
