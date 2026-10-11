// 펼침면에서 "인쇄되는 면"을 알려주는 단 하나의 기준이에요 — 편집기의 레이아웃·디자인·붙여넣기·복제 등 모든 "자동 배치" 경로가 이걸 같이 써요.
//  - 소개 페이지(intro 펼침면): 왼쪽 낱장만 인쇄돼요(오른쪽은 인쇄 안 되는 빈 면).
//  - 첫 펼침면(index 0): 왼쪽은 표지 뒷면이라 인쇄 안 돼요(오른쪽 1페이지만 인쇄).
//  - 그 밖의 펼침면: 양쪽 모두 인쇄돼요.
// 인쇄 안 되는 면에는 어떤 자동 동작도 내용을 놓지 않아요(인쇄 PDF도 그 면은 그리지 않아요 — lib/printCompose.ts).
export type PageSide = "left" | "right";
export type PageRange = PageSide | "spread";
type SpreadLike = { intro?: boolean } | null | undefined;

export function printedSidesOf(spreadIndex: number, spread?: SpreadLike): PageSide[] {
  if (spread?.intro) return ["left"];
  if (spreadIndex === 0) return ["right"];
  return ["left", "right"];
}

export function isPagePrinted(spreadIndex: number, spread: SpreadLike, side: PageSide): boolean {
  return printedSidesOf(spreadIndex, spread).includes(side);
}

export function unprintedSidesOf(spreadIndex: number, spread?: SpreadLike): PageSide[] {
  const printed = printedSidesOf(spreadIndex, spread);
  return (["left", "right"] as PageSide[]).filter((s) => !printed.includes(s));
}

// 적용 범위를 인쇄되는 면으로 좁혀요: "spread"는 인쇄되는 면이 한쪽뿐이면 그 한쪽으로, 인쇄 안 되는 면을 직접 가리키면 null(= 아무것도 안 해요).
export function scopeRangeToPrinted(spreadIndex: number, spread: SpreadLike, range: PageRange): PageRange | null {
  const sides = printedSidesOf(spreadIndex, spread);
  if (range === "spread") return sides.length === 2 ? "spread" : sides[0];
  return sides.includes(range) ? range : null;
}

// 사용자가 고른 대상(없으면 기본값)을 이 펼침면에서 쓸 수 있는 값으로 맞춰요 — 패널의 대상 탭이 쓰는 값이에요.
export function resolvePanelRange(spreadIndex: number, spread: SpreadLike, picked: PageRange | undefined): PageRange {
  const sides = printedSidesOf(spreadIndex, spread);
  const want: PageRange = picked ?? "spread";
  return scopeRangeToPrinted(spreadIndex, spread, want) ?? sides[0];
}

// 새로 만드는 박스(붙여넣기·복제)가 인쇄 안 되는 면에 중심이 놓이면, 인쇄되는 면 안으로 당겨 와요.
export function pullBoxIntoPrinted<T extends { xPct: number; widthPct: number }>(spreadIndex: number, spread: SpreadLike, box: T): T {
  const printed = printedSidesOf(spreadIndex, spread);
  if (printed.length === 2) return box;
  const center = box.xPct + box.widthPct / 2;
  if (printed[0] === "left" && center >= 50) return { ...box, xPct: Math.max(0, 50 - box.widthPct) };
  if (printed[0] === "right" && center < 50) return { ...box, xPct: Math.max(0, Math.min(50, 100 - box.widthPct)) };
  return box;
}

// 박스 중심이 인쇄 안 되는 면에 있는지
export function isBoxOnUnprintedSide(spreadIndex: number, spread: SpreadLike, box: { xPct: number; widthPct: number }): boolean {
  const printed = printedSidesOf(spreadIndex, spread);
  if (printed.length === 2) return false;
  const side: PageSide = box.xPct + box.widthPct / 2 < 50 ? "left" : "right";
  return !printed.includes(side);
}
