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

// 패널 안 3칸짜리 탭 줄(사진 추가/프레임 변경/사진 편집 등)의 공통 규격이에요.
// 높이 34px 고정 + 테두리 1px(투명)로 선택돼도 바깥 크기가 변하지 않고, 글자 굵기도 같아요.
export const SEG_TAB_ROW = "grid grid-cols-3 gap-1.5";
export const segTabClass = (active: boolean) =>
  `box-border flex h-[34px] min-w-0 items-center justify-center whitespace-nowrap border border-transparent px-1 text-xs font-medium transition ${
    active
      ? "bg-[var(--color-charcoal)] text-white"
      : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:text-[var(--color-charcoal)]"
  }`;
