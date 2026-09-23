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

// pt → fontScale(배율). 기존 텍스트박스 크기 조절 버튼과 같은 범위(0.4~4)로 잘라내요.
export function textBoxPtToFontScale(pt: number, pageWidthMm: number): number {
  if (!Number.isFinite(pageWidthMm) || pageWidthMm <= 0) return 1;
  const scale = pt / (pageWidthMm * TEXT_BOX_FONT_SCALE_BASE_RATIO * (PT_PER_INCH / MM_PER_INCH));
  return Math.max(0.4, Math.min(4, Math.round(scale * 100) / 100));
}
