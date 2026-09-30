// 2026-11-8차, 혜민님 요청("표스타일을 저장해서 뒷페이지나 추후에도 다시 사용할수있게
// 만들어주세요", "텍스트스타일도 저장해서 뒷페이지나 추후에도 다시 사용할수있게
// 만들어주세요") — 표/텍스트박스의 "꾸밈" 값(선·배경색·글꼴 등, 내용·칸 구성은
// 제외)을 이름 붙여 저장해뒀다가, 나중에(다른 페이지에서도, 다음에 다시 들어와서도)
// 다른 표/텍스트박스에 그대로 적용할 수 있게 해요. 이 앱엔 실제 로그인 계정 데이터
// 저장소가 없고(최종 PDF 업로드 전까진 전부 화면 메모리 + 실행취소 스택뿐) 브라우저를
// 새로고침하거나 나중에 다시 들어와도 남아있어야 하므로, lib/cart.ts(장바구니)와 같은
// 패턴으로 localStorage에 저장해요 — 이 파일이 이 앱에서 유일하게 localStorage를 쓰던
// 곳이라 그 패턴(SSR 가드, try/catch, JSON 직렬화)을 그대로 따랐어요.
//
// 표 스타일과 텍스트 스타일은 담는 필드 모양이 서로 달라서(표엔 선/칸 배경, 텍스트엔
// 굵게·취소선·배경 띠 등) 저장소 키를 분리하고, 실제 읽기/쓰기/추가/삭제 로직만
// 제네릭 헬퍼(readPresets/writePresets/addPreset/deletePreset) 하나로 공유해요 —
// 필드 모양이 다른 두 프리셋 종류를 하나의 배열에 억지로 합치지 않으면서도 코드
// 중복은 피해요.

import type { TableBorderPositionKey, TableBorderPositionStyle, TableCellStyle } from "./albumTemplates";

export type NamedStylePreset<T> = {
  id: string;
  name: string;
  style: T;
  savedAt: number;
};

// captureTableStyle/captureTextStyle(app/upload/page.tsx)가 "이 필드는 표/텍스트박스에
// 지금 없다"는 뜻으로 명시적으로 undefined를 넣은 채 객체를 만들어요(타입에 있는
// 필드를 전부 나열하는 게 실수로 빠뜨리기 쉬운 것보다 안전해서). 이 값을 그대로
// localStorage에 저장하면 JSON.stringify가 undefined 키를 자동으로 지워버려서,
// "방금 저장한 프리셋을 새로고침 없이 바로 적용"(메모리에 있는 원본 객체, undefined
// 키가 살아있음)과 "새로고침 후 적용"(localStorage에서 다시 읽음, undefined 키가
// 사라져 있음)이 서로 다르게 동작할 뻔했어요(전자는 대상의 그 필드를 기본값으로
// 되돌리고, 후자는 안 건드림) — 저장 시점에 항상 이 함수로 undefined 키를 미리
// 정리해서, 새로고침 여부와 무관하게 always 항상 "그 필드가 저장 당시 없었으면
// 적용해도 안 건드린다"로 통일해요.
function pruneUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function readPresets<T>(storageKey: string): NamedStylePreset<T>[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is NamedStylePreset<T> =>
        p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string" && "style" in p
    );
  } catch {
    return [];
  }
}

function writePresets<T>(storageKey: string, presets: NamedStylePreset<T>[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(presets));
  } catch {
    // localStorage가 꽉 찼거나(용량 제한) 브라우저 설정으로 막혀 있으면 조용히
    // 무시해요 — 저장 프리셋은 "있으면 편한" 보조 기능이라, 저장이 실패했다고 해서
    // 지금 하던 작업(표/텍스트 편집)까지 막을 이유는 없어요.
  }
}

function addPreset<T extends object>(storageKey: string, name: string, style: T): NamedStylePreset<T>[] {
  const presets = readPresets<T>(storageKey);
  const next: NamedStylePreset<T>[] = [
    ...presets,
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      style: pruneUndefined(style),
      savedAt: Date.now(),
    },
  ];
  writePresets(storageKey, next);
  return next;
}

function deletePreset<T>(storageKey: string, id: string): NamedStylePreset<T>[] {
  const next = readPresets<T>(storageKey).filter((p) => p.id !== id);
  writePresets(storageKey, next);
  return next;
}

// 표 스타일 프리셋 — 표 전체의 "꾸밈" 기본값만 담아요(칸 구성·내용·칸별 개별
// 설정(cellStyles)은 빼고, 다른 표에 적용해도 그 표의 행/열 수·내용·병합은 전혀
// 안 건드려요 — TableBoxToolbar의 "표 구조" 섹션과 완전히 분리된 값들이에요).
export type TableStylePreset = {
  fillColor?: string;
  fillOpacity?: number;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  dashLength?: number;
  dashGap?: number;
  borderPositions?: Partial<Record<TableBorderPositionKey, TableBorderPositionStyle>>;
  fontFamily?: string;
  fontScale?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  lineHeight?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  cellPadding?: number;
  // 2026-11-9차, 혜민님 버그 리포트("표스타일 적용이안되네요") — 헤더 행·강조
  // 열처럼 표에서 눈에 보이는 색은 대부분 표 전체 기본값이 아니라 칸별 개별 설정
  // (cellStyles, "선택한 칸" 패널에서 칸을 골라 배경색 등을 따로 줌)으로 돼 있어서,
  // cellStyles를 빼고 저장/적용하면(예전 동작) 실제로 눈에 보이는 배색이 거의 안
  // 바뀌어 "적용해도 아무 효과가 없다"로 보였어요. 이제 cellStyles도 그대로 담아서
  // 적용 시 대상 표의 cellStyles를 통째로 덮어써요 — 키가 "${row}-${col}" 위치
  // 기준이라 대상 표의 행/열 수가 원본과 달라도 안전해요(범위 밖 키는 화면/인쇄
  // 렌더링에서 그냥 안 쓰이고 무시돼요).
  cellStyles?: Record<string, TableCellStyle>;
};

const TABLE_STYLE_STORAGE_KEY = "keepic_table_style_presets";

export function readTableStylePresets(): NamedStylePreset<TableStylePreset>[] {
  return readPresets<TableStylePreset>(TABLE_STYLE_STORAGE_KEY);
}

export function saveTableStylePreset(name: string, style: TableStylePreset): NamedStylePreset<TableStylePreset>[] {
  return addPreset(TABLE_STYLE_STORAGE_KEY, name, style);
}

export function deleteTableStylePreset(id: string): NamedStylePreset<TableStylePreset>[] {
  return deletePreset(TABLE_STYLE_STORAGE_KEY, id);
}

// 텍스트 스타일 프리셋 — 텍스트박스(표지 제목·책등 포함, TextBoxToolbar 하나를
// 셋이 공유)의 "꾸밈" 값만 담아요. text(내용)와 문자 단위 서식(runs)은 빼요 — runs가
// 있으면 그 구간들이 박스 자체 필드를 덮어쓰므로, 프리셋을 적용해도 runs가 남아있으면
// 눈에 보이는 효과가 없을 수 있어요(적용 시 runs는 건드리지 않고 박스 기본 서식만
// 바꿔요 — 한 박스 전체에 프리셋 서식을 입히고 싶으면 문자 단위 서식을 따로 지우면
// 돼요, 이번 범위 밖).
export type TextStylePreset = {
  fontFamily?: string;
  fontScale?: number;
  color?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  underlineColor?: string;
  strikethrough?: boolean;
  strikethroughColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  scaleXPct?: number;
  scaleYPct?: number;
  verticalAlign?: "top" | "middle" | "bottom";
  backgroundColor?: string;
  backgroundPaddingXPct?: number;
  backgroundPaddingYPct?: number;
  backgroundWidthPct?: number;
  backgroundMode?: "hugText" | "fillBox";
  // 2026-11-9차, 혜민님 요청("자막스타일처럼 만들어놓고싶거든요") — 텍스트선(외곽선)·
  // 그림자도 "꾸밈" 값이라 저장/적용 대상에 포함해요(TextBoxDef의 같은 이름 필드와
  // 1:1로 대응).
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
};

const TEXT_STYLE_STORAGE_KEY = "keepic_text_style_presets";

export function readTextStylePresets(): NamedStylePreset<TextStylePreset>[] {
  return readPresets<TextStylePreset>(TEXT_STYLE_STORAGE_KEY);
}

export function saveTextStylePreset(name: string, style: TextStylePreset): NamedStylePreset<TextStylePreset>[] {
  return addPreset(TEXT_STYLE_STORAGE_KEY, name, style);
}

export function deleteTextStylePreset(id: string): NamedStylePreset<TextStylePreset>[] {
  return deletePreset(TEXT_STYLE_STORAGE_KEY, id);
}
