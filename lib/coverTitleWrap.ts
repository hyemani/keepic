// 표지 제목 줄바꿈 계산(52차, 혜민님 요청: "편집 화면에서 보이는 제목이 인쇄에서도 같은 줄바꿈으로").
//
// 편집 화면(CoverTitleOverlay → contentEditable)은 CSS `white-space: pre-wrap; word-break: break-word`로 줄을 나눠요:
//  · 사용자가 Enter로 넣은 줄바꿈은 그대로 두고,
//  · 한 줄이 칸 너비를 넘으면 띄어쓰기 뒤에서 자동으로 줄을 바꾸고(영문 단어는 안 쪼개요),
//  · 한글·한자·가나는 글자 사이에서도 바꿀 수 있고,
//  · 띄어쓰기·단어가 칸보다 길 때만 글자 단위로 쪼개요.
// 인쇄(lib/printCompose.ts drawCoverTitle)는 예전엔 Enter 줄바꿈만 나누고 자동 줄바꿈은 없어서(`maxWidth`로 글자를 가로로 눌러 한 줄에 그림),
// 화면에서 2줄인 제목이 인쇄에선 한 줄로 찌그러졌어요. 이 파일의 순수 함수가 같은 규칙으로 줄을 나눠서 화면 줄 수를 인쇄에서 그대로 재현해요.
// 글자 폭은 호출하는 쪽이 재서 넘겨요(measure) — 화면(DOM)과 인쇄(canvas) 모두 같은 서체·굵기·자간으로 재면 같은 결과가 나와요.

export type MeasureFn = (s: string) => number;
/** epsilon: 폭 비교 여유(measure와 같은 단위). 기본 0 — 브라우저(DOM)와 비교한 실험에서 0이 가장 잘 맞았어요(자간이 있어도 줄 끝 자간을 따로 빼지 않는 쪽이 일치). */
export type WrapOpts = { epsilon?: number };

const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/;
const IDEO = /[⺀-⻿　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/;
// 줄 맨 앞에 오면 안 되는 문장부호(앞 글자에 붙여요)와, 줄 맨 끝에 오면 안 되는 여는 부호.
const NO_START = /[.,!?;:)\]}>%'"’”»、。，．！？）」』】ー…·]/;
const NO_END = /[(\[{<‘“«（「『【]/;

const isIdeo = (c: string) => HANGUL.test(c) || IDEO.test(c);
const isSpace = (c: string) => c === " " || c === "\t";
const isDigit = (c: string) => c >= "0" && c <= "9";

/** a와 b 사이(a가 앞 글자)에서 줄을 바꿀 수 있는지(띄어쓰기 뒤는 호출부에서 따로 처리). */
function canBreakBetween(a: string, b: string): boolean {
  if (isSpace(a) || isSpace(b)) return false;
  if (NO_START.test(b) || NO_END.test(a)) return false;
  if (isIdeo(a) || isIdeo(b)) {
    // 숫자 뒤 단위(3개, 2024년)·영문 뒤 조사는 CSS(Chrome)도 붙여 쓰는 경우가 많지만, 실제 동작은 probe로 확인한 규칙을 따라요.
    return true;
  }
  if (a === "-") return true; // Date-2024 → Date- / 2024 (Chrome은 하이픈 뒤에서 바꿔요)
  if ((a === "\u2014" || b === "\u2014") && !(a === "\u2014" && b === "\u2014")) return true; // 줄표(—)는 앞뒤 모두 바꿀 수 있어요
  if (a === "/" && !isDigit(b)) return true;
  return false;
}

/** 한 문단(Enter 없는 한 덩어리)을 maxW 폭에 맞춰 줄로 나눠요. 줄 끝 띄어쓰기는 줄에 남겨요(CSS pre-wrap처럼 폭에 안 셈). */
export function wrapParagraph(par: string, measure: MeasureFn, maxW: number, opts: WrapOpts = {}): string[] {
  if (par === "") return [""];
  const chars = Array.from(par);
  // 줄바꿈 가능한 덩어리(unit)로 쪼개요: unit 끝에서 줄을 바꿀 수 있어요. 띄어쓰기는 앞 단어 뒤에 붙어요(hang).
  const units: string[] = [];
  let cur = "";
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    cur += c;
    const n = chars[i + 1];
    if (n === undefined) break;
    const spaceRunEnds = isSpace(c) && !isSpace(n);
    if (spaceRunEnds || canBreakBetween(c, n)) {
      units.push(cur);
      cur = "";
    }
  }
  if (cur) units.push(cur);

  const lines: string[] = [];
  let line = "";
  const eps = opts.epsilon ?? 0;
  const fits = (s: string) => measure(s.replace(/[ \t]+$/, "")) <= maxW + eps + 1e-6;
  for (const u of units) {
    if (line === "" ) {
      if (fits(u)) { line = u; continue; }
    } else if (fits(line + u)) {
      line += u;
      continue;
    } else {
      lines.push(line);
      line = "";
      if (fits(u)) { line = u; continue; }
    }
    // unit 하나가 한 줄보다 길어요 → 글자 단위로 쪼개요(overflow-wrap).
    for (const g of Array.from(u)) {
      if (line === "" || fits(line + g)) line += g;
      else { lines.push(line); line = g; }
    }
  }
  lines.push(line);
  return lines;
}

/** 제목 전체: Enter 줄바꿈 단위로 나눈 뒤 각 문단을 자동 줄바꿈해요. 앞쪽 빈 줄은 화면과 같이 그대로 두고, 맨 끝 빈 줄·공백만 지워요. */
export function wrapCoverTitle(text: string, measure: MeasureFn, maxW: number, opts: WrapOpts = {}): string[] {
  const t = text.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  if (t === "") return [];
  const out: string[] = [];
  for (const par of t.split("\n")) out.push(...wrapParagraph(par, measure, maxW, opts));
  return out;
}

/** 가장 긴 줄이 maxW를 넘는지(줄을 더 나눌 수 없어 칸 밖으로 나가는 경우) — 한 글자도 칸에 안 들어가는 극단적 좁은 칸용 안전장치. */
export function widestLine(lines: string[], measure: MeasureFn): number {
  let w = 0;
  for (const l of lines) w = Math.max(w, measure(l.replace(/[ \t]+$/, "")));
  return w;
}

/** 크기와 상관없이 같은 줄바꿈이 나오도록, 글자 크기 100 기준 단위로 환산한 칸 너비(판 mm / 글자 mm × 100). */
export function boxWidthInFontUnits(boxWidthMm: number, fontSizeMm: number): number {
  return fontSizeMm > 0 ? (boxWidthMm / fontSizeMm) * 100 : 0;
}

// ---- canvas로 재는 줄바꿈(화면 안내·인쇄가 같이 써요) ----
export const TITLE_REF_PX = 100; // 글자 크기를 100px로 놓고 재요 — 화면 크기·인쇄 해상도와 상관없이 같은 결과가 나와요.

export type CoverTitleFontSpec = { fontFamily: string; bold: boolean; italic: boolean; letterSpacingEm: number };

/** 제목을 canvas 글자 폭으로 줄바꿈해요. textWidthMm = 글자가 들어가는 칸 너비(mm, 안쪽 여백 뺀 값), fontSizeMm = 글자 크기(mm). */
export function coverTitleLinesWithCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  spec: CoverTitleFontSpec,
  textWidthMm: number,
  fontSizeMm: number
): string[] {
  ctx.save();
  ctx.font = `${spec.italic ? "italic " : ""}${spec.bold ? "bold " : ""}${TITLE_REF_PX}px ${spec.fontFamily}`;
  // 브라우저(DOM)는 한글 글자 사이·띄어쓰기 커닝을 켜서 재요 — canvas 기본값(auto)은 그걸 안 해서 폭이 달라지므로 같게 맞춰요.
  (ctx as CanvasRenderingContext2D & { textRendering?: string }).textRendering = "optimizeLegibility";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${TITLE_REF_PX * spec.letterSpacingEm}px`;
  const maxW = boxWidthInFontUnits(textWidthMm, fontSizeMm);
  // 줄 끝에 0.03% 차이로 딱 맞는 글자는 브라우저(DOM)가 다음 줄로 넘겨요(52차 측정: 같은 제목 10건). canvas가 반대로 한 글자 더 담지 않게 0.2%만 보수적으로 재요.
  const lines = wrapCoverTitle(text, (s) => ctx.measureText(s).width, maxW, { epsilon: -maxW * 0.002 });
  ctx.restore();
  return lines;
}

/**
 * 제목 글자가 칸 안에서 놓이는 안쪽 여백(em). 화면(CoverTitleOverlay textStyle)과 똑같아요:
 *  · 배경 없음 → 0
 *  · 박스 전체(fillBox)·띠 너비 직접 지정 → 가로 0, 세로 = 배경 세로 여백(기본 25%)
 *  · 글자 크기에 맞춤(hugText) → 가로 = 배경 가로 여백(기본 40%), 세로 = 25%
 */
export function coverTitleInsetEm(bg: {
  color?: string;
  mode?: "hugText" | "fillBox";
  paddingXPct?: number;
  paddingYPct?: number;
  widthPct?: number;
}): { x: number; y: number } {
  if (!bg.color) return { x: 0, y: 0 };
  const y = (bg.paddingYPct ?? 25) / 100;
  if (bg.mode === "fillBox" || bg.widthPct !== undefined) return { x: 0, y };
  return { x: (bg.paddingXPct ?? 40) / 100, y };
}

// ---- 편집 화면 안내(작게 보여주는 알림) ----
export type CoverTitleNotice = { kind: "legacy-wrap" | "overflow-box" | "overflow-safe"; text: string };

/**
 * 제목에 대해 편집 화면에서 보여줄 안내를 정해요(없으면 빈 배열).
 *  · legacy-wrap: 옛 앨범(version 1)인데 화면이 인쇄보다 줄이 많을 때 — "PDF에서는 한 줄로 인쇄돼요" (한 번 눌러 새 줄바꿈으로 바꿀 수 있어요, 자동으로는 안 바꿔요)
 *  · overflow-box: 새 방식(version 2)에서 글자 덩어리가 지정한 칸 높이를 넘을 때 — 글자를 줄이지 않고 알려만 줘요
 *  · overflow-safe: 새 방식에서 글자 덩어리 아래쪽이 안전선(재단선에서 안쪽 safetyMm)을 넘을 때
 */
export function coverTitleNotices(a: {
  version: number;
  domLines: number; // 화면(편집)에서 보이는 줄 수
  legacyLines: number; // 옛 방식 인쇄에서 나오는 줄 수(Enter 줄바꿈 수)
  lineHeightEm: number;
  fontSizeMm: number;
  insetYEm: number;
  heightPct?: number;
  yPct: number;
  cellHmm: number;
  bleedMm: number;
  safetyMm: number;
}): CoverTitleNotice[] {
  const out: CoverTitleNotice[] = [];
  if (a.domLines <= 0) return out;
  if (a.version < 2) {
    if (a.domLines > a.legacyLines) {
      out.push({
        kind: "legacy-wrap",
        text:
          a.legacyLines === 1
            ? `화면에서는 ${a.domLines}줄이지만 PDF에서는 한 줄로 인쇄돼요.`
            : `화면에서는 ${a.domLines}줄이지만 PDF에서는 ${a.legacyLines}줄로 인쇄돼요.`,
      });
    }
    return out;
  }
  const blockMm = (a.domLines * a.lineHeightEm + a.insetYEm * 2) * a.fontSizeMm;
  const topMm = (a.yPct / 100) * a.cellHmm;
  if (a.heightPct !== undefined && blockMm > (a.heightPct / 100) * a.cellHmm + 0.3) {
    out.push({ kind: "overflow-box", text: "제목이 제목 칸보다 길어요. 칸을 늘리거나 글자 크기를 줄여 주세요." });
  } else if (topMm + (a.insetYEm + a.domLines * a.lineHeightEm - Math.max(0, (a.lineHeightEm - 1) / 2)) * a.fontSizeMm > a.cellHmm - a.bleedMm - a.safetyMm + 0.3) {
    // 안전선 판단은 "글자 모양의 아래쪽"(줄 상자 맨 아래의 반 행간은 뺀 값) 기준이에요.
    out.push({ kind: "overflow-safe", text: "제목 아래쪽이 안전선 밖으로 나가요. 위로 옮기거나 글자 크기를 줄여 주세요." });
  }
  return out;
}

/** 줄마다 글자 폭(mm, 줄 끝 띄어쓰기는 뺀 값) — 글자 덩어리에 딱 맞는 판을 깔 때 써요(화면·인쇄가 같은 함수). */
export function coverTitleLineWidthsMm(ctx: CanvasRenderingContext2D, lines: string[], spec: CoverTitleFontSpec, fontSizeMm: number): number[] {
  ctx.save();
  ctx.font = `${spec.italic ? "italic " : ""}${spec.bold ? "bold " : ""}${TITLE_REF_PX}px ${spec.fontFamily}`;
  (ctx as CanvasRenderingContext2D & { textRendering?: string }).textRendering = "optimizeLegibility";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${TITLE_REF_PX * spec.letterSpacingEm}px`;
  const out = lines.map((l) => (ctx.measureText(l.replace(/[ \t]+$/, "")).width / TITLE_REF_PX) * fontSizeMm);
  ctx.restore();
  return out;
}

/** 줄들 중 가장 넓은 줄의 폭(mm) — 글자 뒤 사진 밝기를 "글자가 실제로 놓이는 가로 범위"에서만 재려고 써요. */
export function coverTitleMaxLineWidthMm(ctx: CanvasRenderingContext2D, lines: string[], spec: CoverTitleFontSpec, fontSizeMm: number): number {
  ctx.save();
  ctx.font = `${spec.italic ? "italic " : ""}${spec.bold ? "bold " : ""}${TITLE_REF_PX}px ${spec.fontFamily}`;
  (ctx as CanvasRenderingContext2D & { textRendering?: string }).textRendering = "optimizeLegibility";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${TITLE_REF_PX * spec.letterSpacingEm}px`;
  let w = 0;
  for (const l of lines) w = Math.max(w, ctx.measureText(l.replace(/[ \t]+$/, "")).width);
  ctx.restore();
  return (w / TITLE_REF_PX) * fontSizeMm;
}
