"use client";

import { useEffect, useRef, type ReactNode } from "react";

// 60차: 폰을 가로로 눕힌 "편집" 화면 전용 위쪽 도구 줄이에요(혜민님이 보내주신 모바일 포토북 편집기 참고 화면 배치).
// 예전의 상단 로고 줄·왼쪽 아이콘 세로 막대·편집 명령 줄을 이 한 줄(높이 46px)로 합쳤어요.
//   패널 닫힘:  [←] [↶][↷]   디자인 레이아웃 사진 스티커 손글씨 텍스트 배경 재배치하기   ● [저장][다음] [···]
//   패널 열림:  [✕] [↶][↷]   (같은 도구 글자들, 지금 도구는 진하게+밑줄)             [‹ 2-3 페이지 ›] [···]
// 글자 도구가 한 줄에 다 안 들어가는 아주 좁은 폰(예: 667px)에서는 도구 글자들 부분만 옆으로 밀어서 보고, 양 끝 묶음(왼쪽/오른쪽)은 고정이에요.
// 마우스 PC·태블릿·폰 세로에서는 이 컴포넌트를 아예 그리지 않아요(page.tsx에서 phlEdit일 때만).
export const PHL_BAR_H = 46;
// 아이콘 버튼 한 칸(폭은 쓰는 곳에서 w-9=36px 등으로 줘요): 누르는 영역은 양옆으로 4px씩 늘려 44px 이상이 돼요.
export const PHL_BAR_ICON_BTN =
  "relative flex h-full shrink-0 items-center justify-center text-[var(--color-charcoal)]/85 transition-colors active:bg-black/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] disabled:cursor-not-allowed disabled:opacity-30 disabled:active:bg-transparent after:absolute after:inset-y-0 after:-inset-x-1 after:content-[''] motion-reduce:transition-none";

export type PhlTool = { id: string; label: string };

export function PhlTopBar({
  tools,
  activeId,
  panelOpen,
  onTool,
  onClosePanel,
  onBack,
  history,
  relayout,
  nav,
  trailing,
  more,
}: {
  tools: PhlTool[];
  activeId: string | null;
  panelOpen: boolean;
  onTool: (id: string) => void;
  onClosePanel: () => void;
  onBack: () => void;
  // 되돌리기·다시 버튼(아이콘은 page.tsx의 편집 아이콘을 그대로 써요)
  history: ReactNode;
  relayout: { disabled: boolean; onClick: () => void };
  nav: { label: string; prevDisabled: boolean; nextDisabled: boolean; onPrev: () => void; onNext: () => void };
  // 패널이 닫혀 있을 때 오른쪽 끝에 보이는 저장 상태 점·저장·다음
  trailing: ReactNode;
  // "···" 더보기 메뉴(항상 맨 오른쪽)
  more: ReactNode;
}) {
  const toolsRef = useRef<HTMLDivElement>(null);
  // 지금 도구가 옆으로 밀어야 보이는 자리에 있으면 보이는 곳으로 가져와요(667px 같은 좁은 화면).
  useEffect(() => {
    if (!activeId) return;
    const el = toolsRef.current?.querySelector<HTMLElement>(`[data-phl-tool="${activeId}"]`);
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeId, panelOpen]);
  const toolBtn =
    "relative flex h-full min-w-11 shrink-0 items-center justify-center whitespace-nowrap px-3 [@media(max-width:700px)]:px-2 text-[14px] font-medium leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none";
  return (
    <div
      role="toolbar"
      aria-label="편집 도구"
      data-testid="phl-topbar"
      data-panel-open={panelOpen ? "true" : "false"}
      onMouseDown={(e) => e.stopPropagation()}
      style={{ height: PHL_BAR_H }}
      className="relative z-40 -ml-[var(--ed-l)] -mr-[var(--ed-r)] flex shrink-0 items-stretch border-b border-[var(--color-hairline)] bg-[#F8F8F8] pl-[max(4px,var(--sa-l))] pr-[max(8px,var(--sa-r))]"
    >
      <div data-testid="phl-bar-left" className="flex shrink-0 items-stretch">
        {panelOpen ? (
          <button type="button" data-testid="phl-panel-close" data-drawer-close onClick={onClosePanel} aria-label="패널 닫기" title="패널 닫기" className={`${PHL_BAR_ICON_BTN} w-10`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        ) : (
          <button type="button" data-testid="back-to-preview" onClick={onBack} aria-label="미리보기로 돌아가기" title="미리보기로 돌아가기" className={`${PHL_BAR_ICON_BTN} w-10`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
        )}
        {history}
      </div>
      {/* 62차: 도구 글자 줄은 옆으로 밀어서 보고(양 끝 12px는 옅게 사라지는 가장자리라, 그 자리를 안쪽 여백으로 비워 둬서 글자가 반쯤 잘려 보이지 않아요),
          눈에 띄는 "재배치하기"는 줄 밖(오른쪽)에 따로 고정해요 — 좁은 폰·패널이 열려 페이지 이동이 자리를 차지해도 항상 통째로 보여요. */}
      <div ref={toolsRef} data-testid="phl-bar-tools" className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-12px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-full min-w-full items-stretch justify-evenly px-3">
          {tools.map((t) => {
            const active = panelOpen && activeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-phl-tool={t.id}
                aria-pressed={active}
                onClick={() => onTool(t.id)}
                className={`${toolBtn} ${active ? "text-[var(--color-charcoal)]" : "text-[var(--color-charcoal)]/60 active:text-[var(--color-charcoal)]"}`}
              >
                {t.label}
                <span aria-hidden="true" className={`absolute inset-x-3 [@media(max-width:700px)]:inset-x-2 bottom-0 h-0.5 bg-[var(--color-charcoal)] transition-opacity duration-150 motion-reduce:transition-none ${active ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>
      </div>
      <div data-testid="phl-bar-relayout" className="flex shrink-0 items-stretch">
        <button
          type="button"
          data-phl-tool="relayout"
          disabled={relayout.disabled}
          onClick={relayout.onClick}
          title="재배치하기 — 레이아웃 패널을 열어 사진을 다시 배치해요"
          className={`${toolBtn} font-semibold text-[var(--color-sky)] disabled:cursor-not-allowed disabled:opacity-35`}
        >
          재배치하기
        </button>
      </div>
      <div data-testid="edit-bar-trailing" className="flex shrink-0 items-center gap-1 pl-1">
        {panelOpen ? (
          <div data-testid="phl-page-nav" role="group" aria-label="페이지 이동" className="flex h-full items-stretch">
            <button type="button" aria-label="이전 페이지" disabled={nav.prevDisabled} onClick={nav.onPrev} className={`${PHL_BAR_ICON_BTN} w-8 text-[24px] leading-none`}>
              ‹
            </button>
            <span aria-live="polite" className="flex min-w-[64px] items-center justify-center whitespace-nowrap text-[13px] tabular-nums text-[var(--color-charcoal)]/80">
              {nav.label}
            </span>
            <button type="button" aria-label="다음 페이지" disabled={nav.nextDisabled} onClick={nav.onNext} className={`${PHL_BAR_ICON_BTN} w-8 text-[24px] leading-none`}>
              ›
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 [&_[data-testid=next-step-button]]:rounded-md [&_[data-testid=save-button]]:rounded-md">{trailing}</div>
        )}
        {more}
      </div>
    </div>
  );
}
