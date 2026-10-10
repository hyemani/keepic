import type { ReactNode } from "react";

// 편집 화면 왼쪽 "아이콘 메뉴 + 상세 패널"에서 모든 메뉴(테마·레이아웃·사진·스티커·손글씨·
// 텍스트·배경)가 같이 쓰는 상세 패널 껍데기예요 (2026-10, 혜민님 요청: "메뉴 전환 시 패널 폭과
// 위치 통일").
//
// 규칙 한 줄 요약
// - 폭은 큰 화면(lg, 1024px~)에서 항상 224px 하나로 고정해요. 예전 clamp(160px, 22cqw, 224px)는
//   창 크기에 따라 조금씩 달라질 수 있어서 없앴어요. 작은 화면(lg 미만)에서는 모든 메뉴가
//   똑같이 캔버스 위에 가로 폭 전체로 쌓여요.
// - 스크롤바가 생겨도/안 생겨도 안쪽 내용 폭이 변하지 않게 scrollbar-gutter: stable로 자리를
//   미리 잡아둬요 (맥 기본 "스크롤바 자동 숨김" 설정에선 원래 자리를 안 차지해서 변화 없음).
// - 가로로 넘치는 건 숨기고(overflow-x-hidden), 자식은 min-w-0이라 긴 글/설정이 패널을 넓히지
//   못해요 (글은 줄바꿈).
export const SIDE_PANEL_WIDTH_PX = 224;

export function SidePanelShell({ open = true, children }: { open?: boolean; children: ReactNode }) {
  return (
    <div
      data-side-panel
      className={
        open
          ? "flex min-h-0 w-full min-w-0 flex-col overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] lg:w-56 lg:shrink-0 lg:pr-1 [&>*]:min-w-0"
          : "flex min-h-0 flex-col overflow-hidden lg:w-0 lg:shrink-0"
      }
    >
      {children}
    </div>
  );
}

// ─── 공통 규격(2026-10, 혜민님 요청: "왼쪽 메뉴 UI를 레이아웃 메뉴 기준으로 통일") ───
// 기준은 실제 "레이아웃" 패널을 브라우저에서 재서 얻은 값이에요(224px 패널, 안쪽 폭 205px =
// 224 - 스크롤바 자리 15 - 오른쪽 여백 4). 탭 높이 34px · 모서리 0 · 탭 사이 간격 0 ·
// 글자 12px(medium) · 선택됨 = 검정(차콜) 바탕+흰 글자 · 섹션 사이 간격 6px(gap-1.5).
// 모든 메뉴가 아래 상수/부품만 가져다 써서 크기가 메뉴마다 달라지지 않아요.
export const PANEL_STACK = "flex flex-col gap-1.5"; // 탭 아래 첫 내용·섹션 사이 간격 6px
export const SETTING_BOX = "border border-[var(--color-hairline)] bg-white p-2"; // 설정 상자 안쪽 여백 8px
export const NESTED_SCROLL = "overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"; // 패널 안쪽 스크롤 목록(스크롤바가 생겨도 폭 고정)

// 탭 줄: 칸 수만큼 똑같이 나눠요(grid). 선택 여부·글자 길이와 상관없이 칸 폭/높이가 안 변해요.
export const SEG_TAB_ROW = "grid grid-cols-3";
export const segTabClass = (active: boolean, dense = false) =>
  `box-border flex h-[34px] min-w-0 items-center justify-center whitespace-nowrap text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
    dense ? "px-0" : "px-1"
  } ${
    active
      ? "bg-[var(--color-charcoal)] text-white"
      : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:text-[var(--color-charcoal)]"
  }`;

export type SegTabItem = {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
};

// 모든 메뉴의 탭 줄(소품/동식물…, 그래픽/패턴…, 왼쪽/오른쪽/현재 펼침 등)이 같이 쓰는 부품이에요.
// 5칸 이상이면(스티커) 좌우 여백을 0으로 줄여서 224px 폭에서도 라벨이 안 잘리게 해요(높이·간격은 그대로).
export function SegTabs({
  items,
  value,
  onChange,
  ariaLabel,
  dataAttr,
}: {
  items: SegTabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  dataAttr?: string;
}) {
  const dense = items.length >= 5;
  return (
    <div role="tablist" aria-label={ariaLabel} className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((t) => {
        const extra = dataAttr ? { [dataAttr]: t.id } : {};
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            disabled={t.disabled}
            title={t.title}
            onClick={() => onChange(t.id)}
            className={segTabClass(value === t.id, dense)}
            {...extra}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// 패널 안 "실행 버튼" 공통 규격: 높이 34px · 글자 12px · 아이콘 20px · 아이콘-글자 간격 6px.
export const ACTION_BUTTON_BASE =
  "flex h-[34px] w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium leading-none transition disabled:cursor-not-allowed disabled:opacity-40";
export const SECONDARY_ACTION_BUTTON_CLASS = `${ACTION_BUTTON_BASE} border border-[var(--color-hairline)] bg-white px-2 text-[var(--color-charcoal)] hover:bg-[var(--color-ivory)]`;
