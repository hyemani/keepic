import type { ReactNode } from "react";

// 편집 화면 왼쪽 "아이콘 메뉴 + 상세 패널"에서 모든 메뉴(테마·레이아웃·사진·스티커·손글씨·
// 텍스트·배경)가 같이 쓰는 상세 패널 껍데기예요 (2026-10, 혜민님 요청: "메뉴 전환 시 패널 폭과
// 위치 통일").
//
// 규칙 한 줄 요약
// - (2026-13) 패널은 오른쪽 세로 구분선(편집 명령 바 왼쪽 끝)까지 꽉 채워요: 폭 232px(= 이전 224 + 구분선 앞 여백 8)로
//   구분선·캔버스 위치는 그대로고, 탭 줄의 오른쪽 끝이 구분선에 정확히 닿아요. 스크롤바는 자리를 차지하지 않게
//   숨겨요(휠·트랙패드·키보드 스크롤은 그대로 — 스크롤바 자리 때문에 탭 줄·칩·목록 오른쪽 끝이 들쭉날쭉해지는 걸 막아요).
// - 폭은 큰 화면(lg, 1024px~)에서 항상 하나(232px)로 고정해요. 예전 clamp(160px, 22cqw, 224px)는
//   창 크기에 따라 조금씩 달라질 수 있어서 없앴어요. 작은 화면(lg 미만)에서는 모든 메뉴가
//   똑같이 캔버스 위에 가로 폭 전체로 쌓여요.
// - 가로로 넘치는 건 숨기고(overflow-x-hidden), 자식은 min-w-0이라 긴 글/설정이 패널을 넓히지
//   못해요 (글은 줄바꿈).
export const SIDE_PANEL_WIDTH_PX = 232;

export function SidePanelShell({
  open = true,
  drawerOpen = true,
  onClose,
  title,
  children,
}: {
  open?: boolean;
  // 43차: 폭 1024px 미만(태블릿 세로)에서만 의미 있어요 — 패널은 캔버스 위에 뜨는 서랍이고, false면 숨겨요.
  // 데스크톱(lg~)은 이 값과 상관없이 예전 그대로예요(폭 232px 고정, 캔버스 옆 자리).
  drawerOpen?: boolean;
  onClose?: () => void;
  // 59차: 폰에서만 맨 윗줄(36px)에 "제목 + ✕"로 보여줘요. 태블릿·데스크톱은 예전 그대로예요.
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-side-panel
      data-drawer-open={drawerOpen ? "true" : "false"}
      className={`${
        open
          ? "flex min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-[232px] lg:shrink-0 [&>*]:min-w-0"
          : "flex min-h-0 flex-col overflow-hidden lg:w-0 lg:shrink-0"
      } max-lg:absolute max-lg:bottom-0 max-lg:left-full max-lg:top-0 max-lg:z-40 max-lg:w-[296px] max-lg:max-w-[calc(100vw-72px)] max-lg:border-r max-lg:border-[var(--color-hairline)] max-lg:bg-white max-lg:p-2 max-lg:shadow-[8px_0_24px_-12px_rgba(0,0,0,0.35)] phl:top-0! phl:w-[var(--phl-panel-w)]! phl:max-w-none! phl:border-t-0 phl:shadow-none! php:top-auto php:h-auto php:max-h-[calc(var(--app-vh,100dvh)*0.42)] php:w-[calc(var(--app-vw,100vw)-60px)] php:max-w-none php:border-t php:pb-[max(8px,env(safe-area-inset-bottom))] php:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] ${
        drawerOpen && open ? "" : "max-lg:hidden"
      }`}
    >
      {onClose && (
        // 61차: 폰에서 가상 키보드가 올라온 동안만 보이는 맨 위 줄(globals.css의 html[data-kb="open"] 규칙) — 글 칸이 패널 맨 위로 오고, "완료"가 키보드를 내려요.
        <div data-kb-head className="sticky top-[-8px] z-10 -mx-2 -mt-2 mb-1 hidden h-9 shrink-0 items-center justify-between gap-2 bg-white px-2 shadow-[0_1px_0_var(--color-hairline)]">
          <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-charcoal)]">{title ?? "편집"}</span>
          <button
            type="button"
            data-testid="kb-done"
            onClick={() => (document.activeElement as HTMLElement | null)?.blur?.()}
            className="relative flex h-8 shrink-0 items-center rounded-md bg-[var(--color-charcoal)] px-3 text-[13px] font-semibold text-white transition-colors active:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-sky)] after:absolute after:-inset-x-1 after:-inset-y-1.5 after:content-[''] motion-reduce:transition-none"
          >
            완료
          </button>
        </div>
      )}
      {onClose && (
        <div data-panel-head className="hidden shrink-0 max-lg:flex phl:hidden ph:sticky ph:top-[-8px] ph:z-10 ph:-mx-2 ph:-mt-2 ph:mb-2 ph:h-9 ph:items-center ph:justify-between ph:gap-2 ph:bg-white ph:px-2 ph:shadow-[0_1px_0_var(--color-hairline)]">
          {title && <span className="hidden min-w-0 truncate text-[13px] font-semibold text-[var(--color-charcoal)] ph:block">{title}</span>}
          <button
            type="button"
            data-drawer-close
            onClick={onClose}
            aria-label="패널 닫기"
            className="mb-1 flex h-11 flex-1 shrink-0 items-center justify-end gap-1 px-2 text-xs text-[var(--color-charcoal)]/60 transition hover:text-[var(--color-charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none ph:relative ph:mb-0 ph:h-8 ph:flex-none ph:px-1.5 ph:after:absolute ph:after:-inset-1.5 ph:after:content-['']"
          >
            <span className="ph:sr-only">닫기</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="ph:h-[18px] ph:w-[18px]">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── 공통 규격(2026-10, 혜민님 요청: "왼쪽 메뉴 UI를 레이아웃 메뉴 기준으로 통일") ───
// 기준은 실제 "레이아웃" 패널을 브라우저에서 재서 얻은 값이에요(224px 패널, 안쪽 폭 205px =
// 224 - 스크롤바 자리 15 - 오른쪽 여백 4 → 2026-13에 232px 전체 폭으로 바뀜). 탭 높이 34px · 모서리 0 · 탭 사이 간격 0 ·
// 글자 12px(medium) · 선택됨 = 검정(차콜) 바탕+흰 글자 · 섹션 사이 간격 6px(gap-1.5).
// 모든 메뉴가 아래 상수/부품만 가져다 써서 크기가 메뉴마다 달라지지 않아요.
export const PANEL_STACK = "flex flex-col gap-1.5 ph:gap-2"; // 탭 아래 첫 내용·섹션 사이 간격 6px
export const SETTING_BOX = "border border-[var(--color-hairline)] bg-white p-2"; // 설정 상자 안쪽 여백 8px
export const NESTED_SCROLL = "overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"; // 패널 안쪽 스크롤 목록(스크롤바 자리를 아예 안 만들어서 폭 고정)

// 탭 줄: 칸 수만큼 똑같이 나눠요(grid). 선택 여부·글자 길이와 상관없이 칸 폭/높이가 안 변해요.
export const SEG_TAB_ROW = "grid grid-cols-3";
export const segTabClass = (active: boolean) =>
  `box-border flex h-[34px] [@media(pointer:coarse)]:h-11 min-w-0 items-center justify-center whitespace-nowrap px-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ph:h-8! ph:text-[13px] ph:relative ph:after:absolute ph:after:inset-x-0 ph:after:-inset-y-1.5 ph:after:content-[''] ${
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
// 칸 수가 3~5개여도 좌우 안쪽 여백(4px)·높이·글자 크기는 똑같아요(232px 폭에서 5칸=46px, 3글자 라벨이 들어가요).
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
            className={segTabClass(value === t.id)}
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
  "flex h-[34px] [@media(pointer:coarse)]:h-11 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ph:h-8! ph:text-[13px] ph:relative ph:after:absolute ph:after:inset-x-0 ph:after:-inset-y-1.5 ph:after:content-['']";
export const SECONDARY_ACTION_BUTTON_CLASS = `${ACTION_BUTTON_BASE} border border-[var(--color-hairline)] bg-white px-2 text-[var(--color-charcoal)] hover:bg-[var(--color-ivory)]`;
