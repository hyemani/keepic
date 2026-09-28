// 텍스트박스 안에서 "일부 글자만" 다른 서체/크기/색/굵게/기울임/밑줄을 줄 수 있게
// 해주는 기능(문자 단위 서식, 2026-10-06 추가)의 핵심 로직을 모아둔 파일이에요.
//
// 기존 TextBoxDef는 fontFamily/fontScale/color/bold/italic/underline이 박스 전체에
// 딱 하나씩만 있었어요(박스 전체가 같은 서식). 이제 TextBoxDef에 선택적으로
// runs?: TextRun[]를 추가해서, "이 부분은 굵게, 이 부분은 빨간색" 같은 걸 표현할 수
// 있어요. runs가 없거나 비어있으면(예전에 저장된 모든 텍스트박스가 이 상태예요)
// 완전히 예전과 똑같이 동작해요 — TextRun의 각 필드가 undefined면 박스 자신의
// 값(box.fontFamily 등)을 그대로 따라가는 "상속" 구조라서예요.
//
// 이 파일의 함수들은 화면 편집(app/upload/page.tsx의 TextBoxRichEditor·
// TextBoxToolbar)과 인쇄 PDF(lib/printCompose.ts의 drawTextBoxOnCanvas) 양쪽에서
// 똑같이 써요 — "runs를 어떻게 나누고 합치고 해석하는지"가 화면·인쇄에서 어긋나면
// 화면에서 본 것과 다른 PDF가 나오니까, 로직을 한 곳에만 둬요.

import type { TextBoxDef } from "./albumTemplates";

// 텍스트박스 안의 "구간 하나"예요. text는 이 구간의 실제 글자(줄바꿈 \n 포함 가능).
// 나머지 필드는 전부 선택값(optional)이에요 — 지정 안 하면(undefined) 이 구간은
// 자기가 속한 박스(TextBoxDef)의 같은 이름 필드를 그대로 따라가요(상속). 예를 들어
// fontScale이 없으면 box.fontScale을 써요. 이 상속 덕분에, 박스 전체를 그대로
// text 하나로 두다가 일부만 다르게 서식을 준 순간에만 runs가 생기고, 나머지 부분은
// 필드가 거의 다 undefined인 가벼운 구간으로 남아요.
export type TextRun = {
  text: string;
  fontFamily?: string;
  fontScale?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

// 화면 CSS·인쇄 캔버스 양쪽에서 실제로 쓸 "이 구간의 최종 서식"이에요 — run 자신의
// 값이 있으면 그걸, 없으면 box의 값을 따라가는 상속을 다 풀어낸 결과예요.
export type ResolvedRunStyle = {
  fontFamily: string;
  fontScale: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

export function resolveRunStyle(box: TextBoxDef, run: TextRun): ResolvedRunStyle {
  return {
    fontFamily: run.fontFamily ?? box.fontFamily,
    fontScale: run.fontScale ?? box.fontScale,
    color: run.color ?? box.color,
    bold: run.bold ?? box.bold,
    italic: run.italic ?? box.italic ?? false,
    underline: run.underline ?? box.underline ?? false,
  };
}

// 지금 이 박스를 실제로 그릴 때 써야 하는 runs예요. box.runs가 있으면(길이 1
// 이상) 그걸 그대로, 없으면(예전 텍스트박스 전부, 또는 아직 문자 단위 서식을 한 번도
// 안 준 새 텍스트박스) box.text 전체를 필드가 전부 undefined인 구간 하나로 만들어서
// 돌려줘요(= 박스 자신의 서식을 그대로 상속하는 구간 하나) — 이러면 호출하는 쪽은
// runs 유무를 신경 안 쓰고 항상 "구간 배열"만 다루면 돼요.
export function getEffectiveRuns(box: TextBoxDef): TextRun[] {
  if (box.runs && box.runs.length > 0) return box.runs;
  return box.text ? [{ text: box.text }] : [];
}

export function runsPlainText(runs: TextRun[]): string {
  return runs.map((r) => r.text).join("");
}

function sameRunStyle(a: TextRun, b: TextRun): boolean {
  return (
    a.fontFamily === b.fontFamily &&
    a.fontScale === b.fontScale &&
    a.color === b.color &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline
  );
}

// 빈 구간(text === "")은 버리고, 서식이 완전히 같은 이웃 구간끼리는 하나로 합쳐요.
// applyStyleToRange가 구간을 쪼갠 뒤 다시 정리할 때, 그리고 화면 에디터가 타이핑
// 결과를 runs로 되읽을 때 둘 다 이 함수로 마무리해요 — 그래야 같은 서식이 계속
// 잘게 쪼개진 채로 쌓이지 않아요.
export function mergeAdjacentRuns(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const r of runs) {
    if (r.text.length === 0) continue;
    const last = out[out.length - 1];
    if (last && sameRunStyle(last, r)) {
      last.text += r.text;
    } else {
      out.push({ ...r });
    }
  }
  return out;
}

// runs 배열이 사실상 "박스 전체가 같은 서식"(구간이 0개, 또는 구간이 1개인데 그
// 구간의 서식 필드가 전부 undefined = 박스 자신의 서식을 그대로 따라감)이면
// undefined를 돌려줘요 — 그러면 호출한 쪽에서 box.runs를 아예 지우고 예전처럼
// text만 있는 가벼운 박스로 되돌릴 수 있어요(저장 용량·복잡도를 줄여요, "문자 단위
// 서식을 실제로 준 순간에만 runs가 생긴다"는 설계를 지켜요).
export function simplifyRuns(runs: TextRun[]): TextRun[] | undefined {
  if (runs.length === 0) return undefined;
  if (runs.length === 1) {
    const r = runs[0];
    const bare =
      r.fontFamily === undefined &&
      r.fontScale === undefined &&
      r.color === undefined &&
      r.bold === undefined &&
      r.italic === undefined &&
      r.underline === undefined;
    if (bare) return undefined;
  }
  return runs;
}

// runs를 순서대로 이어붙인 전체 글자 수 기준으로, offsets에 있는 모든 위치가 반드시
// "어느 구간의 경계"가 되도록 구간을 다시 쪼개요(경계에 걸리지 않는 offset은 그
// 구간을 둘로 나눠요). applyStyleToRange(서식을 구간별로 다르게 주기)와
// sliceRuns(구간 일부만 잘라내기, 인쇄 PDF의 trim에 써요) 둘 다 이 함수로 "정확히
// 이 글자 범위"를 구간 경계로 만든 다음 작업해요.
function splitRunsAtOffsets(runs: TextRun[], offsets: number[]): TextRun[] {
  const sorted = Array.from(new Set(offsets)).sort((a, b) => a - b);
  const out: TextRun[] = [];
  let pos = 0;
  for (const run of runs) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    const cuts = sorted.filter((o) => o > runStart && o < runEnd);
    if (cuts.length === 0) {
      out.push(run);
      pos = runEnd;
      continue;
    }
    let prev = runStart;
    for (const c of cuts) {
      out.push({ ...run, text: run.text.slice(prev - runStart, c - runStart) });
      prev = c;
    }
    out.push({ ...run, text: run.text.slice(prev - runStart) });
    pos = runEnd;
  }
  return out.filter((r) => r.text.length > 0);
}

// [start, end) 글자 범위만 잘라낸 runs를 돌려줘요(인쇄 PDF에서 앞뒤 공백을
// text.trim()처럼 잘라낼 때 써요 — 원래 코드가 box.text.trim()을 하던 것과 똑같은
// 결과가 나오도록, 구간 스타일은 유지한 채 글자만 잘라요).
export function sliceRuns(runs: TextRun[], start: number, end: number): TextRun[] {
  if (end <= start) return [];
  const split = splitRunsAtOffsets(runs, [start, end]);
  const out: TextRun[] = [];
  let pos = 0;
  for (const run of split) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    if (runStart >= start && runEnd <= end) out.push(run);
  }
  return out;
}

// box.text.trim()과 똑같은 결과(양 끝 공백·줄바꿈 제거)를, runs의 구간별 서식은
// 그대로 유지한 채로 만들어요. 인쇄 PDF(printCompose.ts)가 예전엔
// `box.text.trim()`만 하면 됐는데, runs가 있을 땐 그 trim이 어느 구간에 걸치는지
// 몰라서 이 함수가 필요해요.
export function trimRuns(runs: TextRun[]): TextRun[] {
  const plain = runsPlainText(runs);
  const trimmed = plain.trim();
  if (trimmed.length === plain.length) return runs;
  if (trimmed.length === 0) return [];
  const start = plain.indexOf(trimmed);
  return sliceRuns(runs, start, start + trimmed.length);
}

// 지금 박스(또는 이미 있는 runs)에서 [start, end) 글자 범위에만 changes(서식
// 변경분)를 적용한 새 runs를 돌려줘요. 그 범위 앞/뒤에 걸치는 구간은 경계에서
// 정확히 잘라서, 범위 밖 글자의 서식은 전혀 안 건드려요(2026-10-06, 혜민님 요청
// "입력하거나 삭제할 때 주변 글자의 서식이 깨지지 않는지도 확인해줘"와 같은 이유로
// — 여기서도 범위 밖은 원래 구간 객체를 그대로 재사용해서 안 건드려요). 화면
// 문자 패널(TextBoxToolbar)에서 텍스트를 드래그 선택한 채 서체·크기·굵게·색·밑줄·
// 기울임을 바꿀 때, 그리고 "선택 없음 = 박스 전체"로 처리할 때(0~text.length 범위로
// 호출)도 이 함수 하나로 둘 다 처리해요.
export function applyStyleToRange(
  box: TextBoxDef,
  start: number,
  end: number,
  changes: Partial<Omit<TextRun, "text">>
): TextRun[] {
  const base = getEffectiveRuns(box);
  if (end <= start) return base;
  const split = splitRunsAtOffsets(base, [start, end]);
  let pos = 0;
  const out: TextRun[] = [];
  for (const run of split) {
    const runStart = pos;
    const runEnd = pos + run.text.length;
    pos = runEnd;
    if (runStart >= start && runEnd <= end) {
      out.push({ ...run, ...changes });
    } else {
      out.push(run);
    }
  }
  return mergeAdjacentRuns(out);
}

// 지금 선택(드래그로 고른 글자 범위)이 있으면 그 범위에만, 없으면(collapsed, 또는
// 다른 박스 것) 박스 전체에 서식 변경을 적용해요. 박스가 이미 runs를 갖고 있으면
// (문자 단위로 서로 다른 서식이 섞여 있으면) "선택 없음"도 0~text.length 전체 범위로
// 처리해서 정말로 모든 글자가 바뀌게 해요(구간마다 따로 있던 값도 다 덮어써짐) —
// 안 그러면 "전체 굵게" 버튼을 눌러도 이미 서식이 따로 있던 글자만 안 바뀌는 헷갈리는
// 결과가 나와요. box.runs가 없는 보통 박스는 예전처럼 박스 자신의 필드만 바꿔요
// (runs를 새로 만들지 않아요 — 저장 용량·위험을 최소화).
export function applyRunAwareStyleChange(
  box: TextBoxDef,
  selectionRange: { boxId: string; start: number; end: number } | null,
  changes: Partial<Omit<TextRun, "text">>
): Partial<TextBoxDef> {
  const hasRangeSelection =
    !!selectionRange && selectionRange.boxId === box.id && selectionRange.start !== selectionRange.end;
  if (hasRangeSelection) {
    const start = Math.min(selectionRange!.start, selectionRange!.end);
    const end = Math.max(selectionRange!.start, selectionRange!.end);
    const newRuns = applyStyleToRange(box, start, end, changes);
    return { runs: simplifyRuns(newRuns), text: runsPlainText(newRuns) };
  }
  if (box.runs && box.runs.length > 0) {
    const newRuns = applyStyleToRange(box, 0, box.text.length, changes);
    return { runs: simplifyRuns(newRuns), text: runsPlainText(newRuns), ...changes };
  }
  return changes;
}
