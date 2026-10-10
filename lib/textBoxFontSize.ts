// 텍스트박스(TextBoxDef)의 fontScale(배율, 1이 기본)을 "문자" 패널에서 보여줄 pt 값으로
// 환산해요. 표지 제목(coverTitleFontSizePt)처럼 진짜 물리적인 pt와 똑같은 방식으로
// 맞추려고, lib/printCompose.ts의 drawTextBoxOnCanvas가 실제 인쇄 파일(300dpi)에 그릴 때
// 쓰는 것과 완전히 같은 공식(TEXT_BOX_FONT_SCALE_BASE_RATIO)을 그대로 가져다 써요 — 그래야
// 패널에 보이는 pt 숫자가 실제 인쇄 결과 크기와 어긋나지 않아요.
//
// ⚠️ 화면 편집기(app/upload/page.tsx)의 텍스트박스 <textarea>는 `0.85rem * fontScale`로
// 그려요 — 이건 브라우저 rem 기준이라 "실물 크기"가 아니라 편집 화면 전용 표시예요(표지
// 제목처럼 cqh로 실물 비율을 맞추지 않아요). 그래서 이 pt 환산은 "인쇄 파일 기준 실물
// pt"이고, 편집 화면에 보이는 글자 크기와는 화면 배율에 따라 약간 다르게 느껴질 수 있어요
// (박스를 실제로 화면에서 봤을 때 몇 pt로 "보이는지"가 아니라, 인쇄됐을 때 몇 pt가
// 되는지를 기준으로 입력하는 값이에요). 이 부분은 라이브 화면 확인 없이는 완전히 검증
// 못 했어요 — 혜민님이 실제로 pt를 바꿔보면서 인쇄 미리보기/파일과 비교해주세요.
//
// pageWidthMm은 이 텍스트박스가 속한 칸(앞표지/뒤표지 칸 또는 내지 낱장)의 실제 폭(mm)
// 이에요 — 칸마다 폭이 달라서(표지 칸 vs 내지 페이지) 같은 fontScale이어도 칸에 따라
// 실제 인쇄 pt가 달라요. 호출하는 쪽(app/upload/page.tsx)에서 지금 텍스트박스가 어느
// 칸(TextBoxRef.scope)에 속하는지 보고 그 칸의 mm 폭을 넘겨줘야 해요.
import { TEXT_BOX_FONT_SCALE_BASE_RATIO } from "./printCompose";

const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;

// fontScale(배율) → pt. 소수 첫째 자리까지 반올림해요(표지 제목 pt 입력과 같은 느낌으로
// 쓸 수 있게).
export function textBoxFontScaleToPt(fontScale: number, pageWidthMm: number): number {
  if (!Number.isFinite(pageWidthMm) || pageWidthMm <= 0) return 0;
  const pt = pageWidthMm * TEXT_BOX_FONT_SCALE_BASE_RATIO * fontScale * (PT_PER_INCH / MM_PER_INCH);
  return Math.round(pt * 10) / 10;
}

// 글자 크기 입력의 진짜 범위(pt). 예전엔 입력칸은 6~200이라고 했지만 실제로는 fontScale을 0.4~4배로 잘라서
// (페이지 폭 260mm면 9.4~94pt) 60pt를 쳐도 안 맞는 경우가 있었어요. 이제 이 범위가 화면·저장·인쇄 모두의 기준이에요.
export const TEXT_FONT_PT_MIN = 4;
export const TEXT_FONT_PT_MAX = 400;

export function clampFontPt(pt: number): number {
  if (!Number.isFinite(pt)) return TEXT_FONT_PT_MIN;
  return Math.max(TEXT_FONT_PT_MIN, Math.min(TEXT_FONT_PT_MAX, pt));
}

// pt → fontScale(배율). pt를 4~400으로 잘라낸 뒤 소수 넷째 자리까지 저장해요(예전엔 소수 둘째 자리라
// 60pt를 넣으면 59.9로 보이기도 했어요 — 이제 입력한 pt가 소수 첫째 자리까지 그대로 되돌아와요).
export function textBoxPtToFontScale(pt: number, pageWidthMm: number): number {
  if (!Number.isFinite(pageWidthMm) || pageWidthMm <= 0) return 1;
  const scale = clampFontPt(pt) / (pageWidthMm * TEXT_BOX_FONT_SCALE_BASE_RATIO * (PT_PER_INCH / MM_PER_INCH));
  return Math.round(scale * 10000) / 10000;
}

// ---- 키보드·화살표로 크기 바꾸기 ----

function roundPt(pt: number): number {
  return Math.round(pt * 10) / 10;
}

// 입력칸의 ↑/↓·휠·▲▼ 버튼: 지금 값에서 정확히 step만큼(기본 1pt, Shift 10pt, Alt 0.1pt) 더하고 빼요.
export function stepFontPtField(currentPt: number, dir: 1 | -1, mod: "normal" | "shift" | "alt" = "normal"): number {
  const step = mod === "shift" ? 10 : mod === "alt" ? 0.1 : 1;
  return clampFontPt(roundPt(currentPt + dir * step));
}

// 단축키(Ctrl/Cmd+Shift+< / >)의 한 번 간격: 20pt 미만 1pt, 72pt 미만 2pt, 200pt 미만 5pt, 그 위 10pt.
// 크기가 클수록 1pt는 눈에 안 띄어서 구간별로 키웠어요. 올릴 땐 "다음 눈금"(예: 23.6 → 24, 60 → 65), 내릴 땐
// "이전 눈금"(23.6 → 22, 60 → 55)으로 가요 — 올리고 바로 내리면 같은 크기로 돌아오는 대칭이에요.
function shortcutStep(pt: number): number {
  return pt < 20 ? 1 : pt < 72 ? 2 : pt < 200 ? 5 : 10;
}
export function stepFontPtShortcut(currentPt: number, dir: 1 | -1): number {
  const eps = 1e-6;
  const step = shortcutStep(dir === 1 ? currentPt + eps : currentPt - eps);
  const q = currentPt / step;
  const next = dir === 1 ? (Math.floor(q + eps) + 1) * step : (Math.ceil(q - eps) - 1) * step;
  return clampFontPt(roundPt(next));
}

// 이 키 이벤트가 "글자 크기 줄이기(-1) / 키우기(+1)" 단축키인지: Ctrl 또는 Cmd + Shift + (< 또는 >) — Alt가 같이 눌리면 아니에요.
// US 배열에서 Shift+, → "<", Shift+. → ">" 인데, 한글 입력기(IME)가 켜져 있거나 다른 배열이면 event.key가 달라질 수 있어서
// event.key("<" ">")를 먼저 보고, 아니면 물리 키(event.code "Comma"/"Period")로 판단해요.
export function fontSizeShortcutDir(e: { key: string; code: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }): -1 | 0 | 1 {
  if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey) return 0;
  if (e.key === "<") return -1;
  if (e.key === ">") return 1;
  if (e.code === "Comma") return -1;
  if (e.code === "Period") return 1;
  return 0;
}
