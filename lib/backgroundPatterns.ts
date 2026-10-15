// 내지 배경 "그래픽·패턴·텍스처" 꾸미기 기능이에요. 기존 단색 배경(스프레드 배경색)에
// 더해서, 미리 만들어둔 배경 조합을 골라 쓸 수 있어요.
//
// 화면 미리보기(CSS)와 실제 인쇄 PDF(Canvas)가 정확히 같은 결과를 보여줘야 해서, 각
// 배경을 "색 + 방식(kind) + 간격(mm)"이라는 하나의 조합(레시피)으로 정의해두고,
// 화면용 CSS 문자열과 인쇄용 Canvas 그리기 함수를 이 레시피 하나에서 함께 만들어요.

import { drawBackgroundArt, isArtKind } from "@/lib/backgroundArt";

export type BackgroundPatternCategory = "graphic" | "pattern" | "texture";

export type BackgroundPatternKind =
  | "diagonalSplit"
  | "gradient"
  | "dots"
  | "stripes"
  | "grid"
  // 2026-11 새로 그린(원본, lib/backgroundArt.ts) 무늬 — 그래픽
  | "clouds"
  | "meadow"
  | "leaves"
  | "wave"
  | "blockBottom"
  | "blockSplit"
  | "arches"
  | "cloudsSoft"
  | "archesLow"
  // 2026-12 차분한 새 그래픽(얇은 선·작은 모서리 장식·색면)
  | "cornerVine"
  | "cornerVine4"
  | "cornerArc"
  | "thinFrame"
  | "rules"
  | "splitPlain"
  | "splitSpine"
  // 패턴
  | "checks"
  | "gingham"
  | "diamonds"
  | "zigzag"
  | "stars"
  | "hearts"
  | "scallops"
  // 2026-12 차분한 새 패턴(아주 작은 점·가는 줄)
  | "dotsFine"
  | "pinstripes"
  // 2026-14 체크 계열 새 패턴(얇은 선·돌린 체크·부드러운 줄)
  | "windowpane"
  | "tattersall"
  | "harlequin"
  | "bands"
  // 텍스처
  | "paper"
  | "linen"
  | "watercolor"
  | "grain";

export type BackgroundPatternPreset = {
  id: string;
  label: string;
  category: BackgroundPatternCategory;
  kind: BackgroundPatternKind;
  colors: [string, string];
  // dots/stripes/grid 전용 — 무늬가 반복되는 간격이에요(mm 기준, 인쇄 파일과 같은 실제
  // 크기). diagonalSplit/gradient는 안 써요.
  spacingMm?: number;
};

export const backgroundPatterns: BackgroundPatternPreset[] = [
  // ---- 2026-12 사진이 주인공인 차분한 새 소재(기본 목록). 옛 id는 아래에 그대로 남아 있어요 ----
  // 색면·얇은 선·작은 모서리 장식
  {
    id: "g2-block-sage",
    label: "하단 색면(세이지)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#F6F3EC", "#DDE5D6"],
  },
  {
    id: "g2-block-sky",
    label: "하단 색면(하늘)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#F6F3EC", "#DCE7EE"],
  },
  {
    id: "g2-block-sand",
    label: "하단 색면(샌드)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#F8F5EE", "#E8DFCF"],
  },
  {
    id: "g2-block-gray",
    label: "하단 색면(그레이)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#F6F3EC", "#E4E3DF"],
  },
  {
    id: "g-block-bottom",
    label: "하단 컬러블록(베이지)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#f7f3ec", "#c8a98a"],
  },
  {
    id: "g-block-sage",
    label: "하단 컬러블록(세이지)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#fbfaf4", "#a9c1a0"],
  },
  {
    id: "g3-block-sky",
    label: "하단 컬러블록(하늘)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#f7f3ec", "#a9c3d6"],
  },
  {
    id: "g3-block-blush",
    label: "하단 컬러블록(블러시)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#f7f3ec", "#e0b5ae"],
  },
  {
    id: "g3-block-gray",
    label: "하단 컬러블록(그레이)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#f7f3ec", "#b9b8b3"],
  },
  {
    id: "g3-block-lavender",
    label: "하단 컬러블록(라벤더)",
    category: "graphic",
    kind: "blockBottom",
    colors: ["#f7f3ec", "#c3b5d6"],
  },
  {
    id: "g2-split-sage",
    label: "좌우 분할(세이지)",
    category: "graphic",
    kind: "splitPlain",
    colors: ["#F6F3EC", "#E3E9DE"],
  },
  {
    id: "g2-split-sky",
    label: "좌우 분할(하늘)",
    category: "graphic",
    kind: "splitPlain",
    colors: ["#F6F3EC", "#E1EAF0"],
  },
  // 45차: 표지 전용 — 색이 바뀌는 자리를 책등 이음띠 안으로 옮긴 좌우 분할(표지 "표지 전체" 대상에서만 목록에 나와요, 옛 "좌우 분할"은 그대로 남아 있어요).
  {
    id: "g2-split-sage-spine",
    label: "좌우 분할 · 책등 이음(세이지)",
    category: "graphic",
    kind: "splitSpine",
    colors: ["#F6F3EC", "#E3E9DE"],
  },
  {
    id: "g2-split-sky-spine",
    label: "좌우 분할 · 책등 이음(하늘)",
    category: "graphic",
    kind: "splitSpine",
    colors: ["#F6F3EC", "#E1EAF0"],
  },
  {
    id: "g2-frame-sage",
    label: "얇은 프레임(세이지)",
    category: "graphic",
    kind: "thinFrame",
    colors: ["#F6F3EC", "#B5C0AE"],
  },
  {
    id: "g2-frame-gray",
    label: "얇은 프레임(그레이)",
    category: "graphic",
    kind: "thinFrame",
    colors: ["#F6F3EC", "#BEBDB8"],
  },
  {
    id: "g2-rules-sage",
    label: "위아래 얇은 선(세이지)",
    category: "graphic",
    kind: "rules",
    colors: ["#F6F3EC", "#B5C0AE"],
  },
  {
    id: "g2-rules-sky",
    label: "위아래 얇은 선(하늘)",
    category: "graphic",
    kind: "rules",
    colors: ["#EEF3F6", "#A9BCC9"],
  },
  {
    id: "g2-vine-2",
    label: "모서리 덩굴(2곳)",
    category: "graphic",
    kind: "cornerVine",
    colors: ["#F6F3EC", "#7E927A"],
  },
  {
    id: "g2-vine-4",
    label: "모서리 덩굴(4곳)",
    category: "graphic",
    kind: "cornerVine4",
    colors: ["#F6F3EC", "#7E927A"],
  },
  {
    id: "g2-vine-sage",
    label: "모서리 덩굴(세이지 바탕)",
    category: "graphic",
    kind: "cornerVine",
    colors: ["#EEF2E9", "#7E927A"],
  },
  {
    id: "g2-vine-sky",
    label: "모서리 덩굴(하늘 바탕)",
    category: "graphic",
    kind: "cornerVine",
    colors: ["#EEF3F6", "#7E927A"],
  },
  {
    id: "g2-arc-ivory",
    label: "모서리 곡선(아이보리)",
    category: "graphic",
    kind: "cornerArc",
    colors: ["#F6F3EC", "#C3B9A5"],
  },
  {
    id: "g2-arc-sage",
    label: "모서리 곡선(세이지)",
    category: "graphic",
    kind: "cornerArc",
    colors: ["#EEF2E9", "#A3B59D"],
  },
  // 그라데이션: 아이보리·연회색·세이지·연하늘 안에서 비슷한 색 두 개, 밝기 차 작게
  {
    id: "g2-grad-ivory-sand",
    label: "그라데이션(아이보리-샌드)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F6F3EC", "#ECE6D8"],
  },
  {
    id: "g2-grad-ivory-sage",
    label: "그라데이션(아이보리-세이지)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F6F3EC", "#E2E8DA"],
  },
  {
    id: "g2-grad-ivory-sky",
    label: "그라데이션(아이보리-하늘)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F6F3EC", "#DFE8EF"],
  },
  {
    id: "g2-grad-ivory-gray",
    label: "그라데이션(아이보리-그레이)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F6F3EC", "#E6E5E1"],
  },
  {
    id: "g2-grad-sage",
    label: "그라데이션(세이지)",
    category: "graphic",
    kind: "gradient",
    colors: ["#EEF2E9", "#D8E1D2"],
  },
  {
    id: "g2-grad-sky",
    label: "그라데이션(연하늘)",
    category: "graphic",
    kind: "gradient",
    colors: ["#EEF3F6", "#D6E2EA"],
  },
  {
    id: "g2-grad-gray",
    label: "그라데이션(연회색)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F0F0EE", "#DFDFDB"],
  },
  // ---- 2026-14 체크 중심 새 패턴(작은 깅엄·피크닉·창살·태터솔 …). 무늬색은 부드럽게, 선은 0.35mm 이상 ----
  {
    id: "p5-ging-pink",
    label: "깅엄 체크 · 핑크",
    category: "pattern",
    kind: "gingham",
    colors: ["#FFFAF9", "#F4B6C0"],
    spacingMm: 5,
  },
  {
    id: "p5-ging-sky",
    label: "깅엄 체크 · 하늘",
    category: "pattern",
    kind: "gingham",
    colors: ["#FBFDFE", "#A3C6E2"],
    spacingMm: 5,
  },
  {
    id: "p5-ging-sage",
    label: "깅엄 체크 · 세이지",
    category: "pattern",
    kind: "gingham",
    colors: ["#FAFCF7", "#AECBA9"],
    spacingMm: 5,
  },
  {
    id: "p5-ging-butter",
    label: "깅엄 체크 · 버터",
    category: "pattern",
    kind: "gingham",
    colors: ["#FFFDF3", "#F0D78A"],
    spacingMm: 5,
  },
  {
    id: "p5-ging-lilac",
    label: "깅엄 체크 · 라일락",
    category: "pattern",
    kind: "gingham",
    colors: ["#FCFAFE", "#C7B6E2"],
    spacingMm: 5,
  },
  {
    id: "p5-ging-peach",
    label: "깅엄 체크 · 피치",
    category: "pattern",
    kind: "gingham",
    colors: ["#FFFAF5", "#F4B895"],
    spacingMm: 5,
  },
  {
    id: "p5-picnic-rose",
    label: "피크닉 체크 · 로즈",
    category: "pattern",
    kind: "gingham",
    colors: ["#FFFDFB", "#EDA8A8"],
    spacingMm: 14,
  },
  {
    id: "p5-picnic-blue",
    label: "피크닉 체크 · 블루",
    category: "pattern",
    kind: "gingham",
    colors: ["#FDFEFF", "#9DBBE0"],
    spacingMm: 14,
  },
  {
    id: "p5-window-sky",
    label: "창살 체크 · 하늘",
    category: "pattern",
    kind: "windowpane",
    colors: ["#F8FBFD", "#A8C4DA"],
    spacingMm: 12,
  },
  {
    id: "p5-window-blush",
    label: "창살 체크 · 블러시",
    category: "pattern",
    kind: "windowpane",
    colors: ["#FFF9F7", "#E3A9A5"],
    spacingMm: 12,
  },
  {
    id: "p5-tatt-blue",
    label: "태터솔 체크 · 블루",
    category: "pattern",
    kind: "tattersall",
    colors: ["#FBFAF5", "#93AACB"],
    spacingMm: 16,
  },
  {
    id: "p5-tatt-rose",
    label: "태터솔 체크 · 로즈",
    category: "pattern",
    kind: "tattersall",
    colors: ["#FBFAF5", "#DE9F99"],
    spacingMm: 16,
  },
  {
    id: "p5-harlequin-lilac",
    label: "다이아 체크 · 라일락",
    category: "pattern",
    kind: "harlequin",
    colors: ["#FBF9FD", "#E3DAF0"],
    spacingMm: 10,
  },
  {
    id: "p5-bands-sage",
    label: "부드러운 줄무늬 · 세이지",
    category: "pattern",
    kind: "bands",
    colors: ["#FAFBF6", "#DCE7D4"],
    spacingMm: 8,
  },
  // 패턴: 작은 점·가는 줄·조용한 체크·얇은 격자(무늬색은 바탕과 밝기 차 6~12%)
  {
    id: "p2-dots-ivory",
    label: "작은 점(아이보리)",
    category: "pattern",
    kind: "dotsFine",
    colors: ["#F6F3EC", "#E1DACB"],
    spacingMm: 6,
  },
  {
    id: "p2-dots-sage",
    label: "작은 점(세이지)",
    category: "pattern",
    kind: "dotsFine",
    colors: ["#F4F6EF", "#D4DCCE"],
    spacingMm: 6,
  },
  {
    id: "p2-dots-sky",
    label: "작은 점(하늘)",
    category: "pattern",
    kind: "dotsFine",
    colors: ["#F1F5F8", "#CCDAE5"],
    spacingMm: 6,
  },
  {
    id: "p2-dots-gray",
    label: "작은 점(그레이)",
    category: "pattern",
    kind: "dotsFine",
    colors: ["#F4F4F2", "#D9D9D5"],
    spacingMm: 6,
  },
  {
    id: "p2-pin-ivory",
    label: "가는 줄(아이보리)",
    category: "pattern",
    kind: "pinstripes",
    colors: ["#F6F3EC", "#E0DACB"],
    spacingMm: 6,
  },
  {
    id: "p2-pin-sage",
    label: "가는 줄(세이지)",
    category: "pattern",
    kind: "pinstripes",
    colors: ["#F4F6EF", "#D3DBCD"],
    spacingMm: 6,
  },
  {
    id: "p2-pin-sky",
    label: "가는 줄(하늘)",
    category: "pattern",
    kind: "pinstripes",
    colors: ["#F1F5F8", "#CFDCE6"],
    spacingMm: 6,
  },
  {
    id: "p2-pin-gray",
    label: "가는 줄(그레이)",
    category: "pattern",
    kind: "pinstripes",
    colors: ["#F4F4F2", "#DADAD6"],
    spacingMm: 6,
  },
  {
    id: "p2-check-ivory",
    label: "조용한 체크(아이보리)",
    category: "pattern",
    kind: "checks",
    colors: ["#F6F3EC", "#E9E3D5"],
    spacingMm: 10,
  },
  {
    id: "p2-check-sage",
    label: "조용한 체크(세이지)",
    category: "pattern",
    kind: "checks",
    colors: ["#F4F6EF", "#E1E8D8"],
    spacingMm: 10,
  },
  {
    id: "p2-check-sky",
    label: "조용한 체크(하늘)",
    category: "pattern",
    kind: "checks",
    colors: ["#F1F5F8", "#DDE7EF"],
    spacingMm: 10,
  },
  {
    id: "p2-grid-ivory",
    label: "얇은 격자(아이보리)",
    category: "pattern",
    kind: "grid",
    colors: ["#F6F3EC", "#E0D9CA"],
    spacingMm: 8,
  },
  {
    id: "p2-grid-sky",
    label: "얇은 격자(하늘)",
    category: "pattern",
    kind: "grid",
    colors: ["#F1F5F8", "#D2DFE9"],
    spacingMm: 8,
  },
  // ---- 아래는 옛 소재(저장된 포토북이 그대로 열리도록 id·그림 변경 없음) ----
  // 그래픽
  {
    id: "diagonal-ivory-beige",
    label: "대각 분할",
    category: "graphic",
    kind: "diagonalSplit",
    colors: ["#f7f3ec", "#e9dfc9"],
  },
  {
    id: "diagonal-sky-ivory",
    label: "대각 분할(하늘)",
    category: "graphic",
    kind: "diagonalSplit",
    colors: ["#eef1f4", "#dbe6ef"],
  },
  {
    id: "gradient-sunset",
    label: "그라데이션(선셋)",
    category: "graphic",
    kind: "gradient",
    colors: ["#f8e4d8", "#e4ecf4"],
  },
  {
    id: "gradient-sage",
    label: "그라데이션(세이지)",
    category: "graphic",
    kind: "gradient",
    colors: ["#eef1e8", "#dbe4d6"],
  },
  // 패턴
  {
    id: "dots-sand",
    label: "도트(샌드)",
    category: "pattern",
    kind: "dots",
    colors: ["#f7f3ec", "#c9b89a"],
    spacingMm: 6,
  },
  {
    id: "dots-sky",
    label: "도트(하늘)",
    category: "pattern",
    kind: "dots",
    colors: ["#eef4fa", "#a9c6dd"],
    spacingMm: 6,
  },
  {
    id: "stripes-mint",
    label: "스트라이프(민트)",
    category: "pattern",
    kind: "stripes",
    colors: ["#eef1f4", "#c7d6e0"],
    spacingMm: 5,
  },
  {
    id: "stripes-blush",
    label: "스트라이프(블러시)",
    category: "pattern",
    kind: "stripes",
    colors: ["#faf1ee", "#e9c9c1"],
    spacingMm: 5,
  },
  // 텍스처
  {
    id: "grid-linen",
    label: "리넨 그리드",
    category: "pattern", // 2026-11: 작은 격자 반복이라 "패턴"으로 옮김(예전엔 텍스처 탭)
    kind: "grid",
    colors: ["#f5f1ea", "#d8cfbd"],
    spacingMm: 4,
  },
  {
    id: "grain-kraft",
    label: "크래프트 결",
    category: "texture",
    kind: "dots",
    colors: ["#efe6d8", "#ddccae"],
    spacingMm: 2.2,
  },
  // 2026-10-05, 혜민님 요청: "컬러팔레트 만들어줘 폴더에 예시색상 넣어뒀거든 그대로
  // 넣어도 좋아. 그라데이션도 넣어줘" — Desktop/컬러칩 폴더에 넣어주신 참고 팔레트
  // 12종(각 5색)의 첫색↔끝색을 이어 만든 그라데이션이에요. kind: "gradient"라 화면
  // CSS(patternToCssBackground)와 인쇄 Canvas(drawBackgroundPatternOnCanvas)가 이미
  // 똑같이 그려줘요(위 gradient-sunset/gradient-sage와 같은 방식).
  {
    id: "gradient-lavender-teal",
    label: "그라데이션(라벤더-틸)",
    category: "graphic",
    kind: "gradient",
    colors: ["#CCABD8", "#055B5C"],
  },
  {
    id: "gradient-teal-olive",
    label: "그라데이션(청록-올리브)",
    category: "graphic",
    kind: "gradient",
    colors: ["#54C0CC", "#213502"],
  },
  {
    id: "gradient-pastel-multi",
    label: "그라데이션(파스텔 멀티)",
    category: "graphic",
    kind: "gradient",
    colors: ["#86E3CE", "#CCABD8"],
  },
  {
    id: "gradient-navy-sky",
    label: "그라데이션(네이비-스카이)",
    category: "graphic",
    kind: "gradient",
    colors: ["#001B48", "#D6EBEE"],
  },
  {
    id: "gradient-sunset-sage",
    label: "그라데이션(선셋-세이지)",
    category: "graphic",
    kind: "gradient",
    colors: ["#E25845", "#ADCB65"],
  },
  {
    id: "gradient-blush-peach",
    label: "그라데이션(블러시-피치)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F5CEC7", "#C6C09C"],
  },
  {
    id: "gradient-sunset-blue",
    label: "그라데이션(선셋-블루)",
    category: "graphic",
    kind: "gradient",
    colors: ["#EFC868", "#4F7D89"],
  },
  {
    id: "gradient-rose-mauve",
    label: "그라데이션(로즈-모브)",
    category: "graphic",
    kind: "gradient",
    colors: ["#E3B292", "#7F9680"],
  },
  {
    id: "gradient-grey-blue",
    label: "그라데이션(그레이-블루)",
    category: "graphic",
    kind: "gradient",
    colors: ["#EAE5BF", "#5D7295"],
  },
  {
    id: "gradient-lime-olive",
    label: "그라데이션(라임-올리브)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F2AA58", "#6B7F4C"],
  },
  {
    id: "gradient-red-olive",
    label: "그라데이션(레드-올리브)",
    category: "graphic",
    kind: "gradient",
    colors: ["#BFCA5F", "#72181A"],
  },
  {
    id: "gradient-plum-slate",
    label: "그라데이션(플럼-슬레이트)",
    category: "graphic",
    kind: "gradient",
    colors: ["#F8CEB9", "#5B6D76"],
  },
  // ---- 2026-11 새로 그린 원본 무늬(lib/backgroundArt.ts, 외부 이미지 없음) ----
  {
    id: "g-clouds-sky",
    label: "구름(하늘)",
    category: "graphic",
    kind: "clouds",
    colors: ["#cfe6f5", "#ffffff"],
  },
  {
    id: "g-clouds-blush",
    label: "구름(블러시)",
    category: "graphic",
    kind: "clouds",
    colors: ["#f8e3e3", "#ffffff"],
  },
  // 2026-13 새 구름·아치(옛 id g-clouds-*, g-arches는 목록에서만 숨기고 그림은 그대로)
  {
    id: "g4-clouds-sky",
    label: "구름(하늘)",
    category: "graphic",
    kind: "cloudsSoft",
    colors: ["#cfe6f5", "#ffffff"],
  },
  {
    id: "g4-clouds-blush",
    label: "구름(블러시)",
    category: "graphic",
    kind: "cloudsSoft",
    colors: ["#f8e3e3", "#ffffff"],
  },
  {
    id: "g4-arches-low",
    label: "아치 하단",
    category: "graphic",
    kind: "archesLow",
    colors: ["#fbf4ec", "#d99a8c"],
  },
  {
    id: "g-meadow",
    label: "들판",
    category: "graphic",
    kind: "meadow",
    colors: ["#fdf7e3", "#9cc86b"],
  },
  {
    id: "g-meadow-sky",
    label: "들판(하늘)",
    category: "graphic",
    kind: "meadow",
    colors: ["#d8ecf7", "#8fc283"],
  },
  {
    id: "g-leaves",
    label: "나뭇잎",
    category: "graphic",
    kind: "leaves",
    colors: ["#f7f5ec", "#7fae6a"],
  },
  {
    id: "g-leaves-deep",
    label: "나뭇잎(딥그린)",
    category: "graphic",
    kind: "leaves",
    colors: ["#eef2e6", "#3f7a52"],
  },
  {
    id: "g-wave",
    label: "물결 하단",
    category: "graphic",
    kind: "wave",
    colors: ["#eef6fb", "#6fb4d6"],
  },
  {
    id: "g-wave-sand",
    label: "물결 하단(샌드)",
    category: "graphic",
    kind: "wave",
    colors: ["#fbf3e6", "#e2b98a"],
  },
  {
    id: "g-block-split",
    label: "좌우 컬러 분할",
    category: "graphic",
    kind: "blockSplit",
    colors: ["#f6efe7", "#dfc3b0"],
  },
  {
    id: "g-arches",
    label: "아치 하단",
    category: "graphic",
    kind: "arches",
    colors: ["#fbf4ec", "#e8a79a"],
  },
  {
    id: "p-checks",
    label: "체크",
    category: "pattern",
    kind: "checks",
    colors: ["#ffffff", "#dfe6ee"],
    spacingMm: 8,
  },
  {
    id: "p-checks-pink",
    label: "체크(핑크)",
    category: "pattern",
    kind: "checks",
    colors: ["#fff7f5", "#f5d3cd"],
    spacingMm: 8,
  },
  {
    id: "p-gingham-red",
    label: "깅엄(레드)",
    category: "pattern",
    kind: "gingham",
    colors: ["#ffffff", "#e07b7b"],
    spacingMm: 8,
  },
  {
    id: "p-gingham-blue",
    label: "깅엄(블루)",
    category: "pattern",
    kind: "gingham",
    colors: ["#ffffff", "#7fa6d6"],
    spacingMm: 8,
  },
  {
    id: "p-diamonds",
    label: "다이아몬드",
    category: "pattern",
    kind: "diamonds",
    colors: ["#f7f3ec", "#d9c7a7"],
    spacingMm: 10,
  },
  {
    id: "p-zigzag",
    label: "지그재그",
    category: "pattern",
    kind: "zigzag",
    colors: ["#f2f7f5", "#9fcfc0"],
    spacingMm: 8,
  },
  {
    id: "p-stars",
    label: "별",
    category: "pattern",
    kind: "stars",
    colors: ["#f3f4fa", "#c3c8e8"],
    spacingMm: 14,
  },
  {
    id: "p-hearts",
    label: "하트",
    category: "pattern",
    kind: "hearts",
    colors: ["#fff5f5", "#f0b3bd"],
    spacingMm: 14,
  },
  {
    id: "p-scallops",
    label: "스캘럽",
    category: "pattern",
    kind: "scallops",
    colors: ["#f4f8f3", "#b9d4b0"],
    spacingMm: 10,
  },
  {
    id: "p-dots-mint",
    label: "도트(민트)",
    category: "pattern",
    kind: "dots",
    colors: ["#f2faf6", "#a9d9c4"],
    spacingMm: 6,
  },
  {
    id: "p-stripes-navy",
    label: "스트라이프(블루)",
    category: "pattern",
    kind: "stripes",
    colors: ["#ffffff", "#c3cfe0"],
    spacingMm: 6,
  },
  {
    id: "t-paper-white",
    label: "종이(화이트)",
    category: "texture",
    kind: "paper",
    colors: ["#fbfaf6", "#c9c2b4"],
  },
  {
    id: "t-paper-cream",
    label: "종이(크림)",
    category: "texture",
    kind: "paper",
    colors: ["#f6efe0", "#b9a98a"],
  },
  {
    id: "t-paper-kraft",
    label: "크라프트지",
    category: "texture",
    kind: "paper",
    colors: ["#d9bd96", "#8b6b43"],
  },
  {
    id: "t-paper-gray",
    label: "종이(그레이)",
    category: "texture",
    kind: "paper",
    colors: ["#e9e9e6", "#8a8a84"],
  },
  {
    id: "t-linen-ivory",
    label: "리넨",
    category: "texture",
    kind: "linen",
    colors: ["#efe8d9", "#a79c85"],
  },
  {
    id: "t-linen-denim",
    label: "데님",
    category: "texture",
    kind: "linen",
    colors: ["#8fa7c4", "#33496a"],
  },
  {
    id: "t-linen-sage",
    label: "리넨(세이지)",
    category: "texture",
    kind: "linen",
    colors: ["#c9d4bd", "#6e8260"],
  },
  {
    id: "t-wc-blue",
    label: "수채화(블루)",
    category: "texture",
    kind: "watercolor",
    colors: ["#f4f8fb", "#7fb2d9"],
  },
  {
    id: "t-wc-peach",
    label: "수채화(피치)",
    category: "texture",
    kind: "watercolor",
    colors: ["#fdf6f0", "#f2a68a"],
  },
  {
    id: "t-wc-sage",
    label: "수채화(세이지)",
    category: "texture",
    kind: "watercolor",
    colors: ["#f7f9f2", "#9cc18a"],
  },
  {
    id: "t-wc-lavender",
    label: "수채화(라벤더)",
    category: "texture",
    kind: "watercolor",
    colors: ["#faf6fb", "#b79bd6"],
  },
];


// ---- 목록 분류(2026-12) ----
// "default"는 기본 추천 목록, "kids"는 키즈·성장앨범용(동화풍), "legacy"는 목록에서 숨긴 예전 소재예요(목록에는 안 나오지만
// id·그리기는 그대로라 이미 저장된 포토북은 똑같이 열리고, 그때는 목록 맨 위에 '현재 배경'으로 보여요).
// 분류만 바꾸는 거라 그리는 결과·저장 id는 그대로예요(저장된 포토북은 예전과 똑같이 열려요).
export type BackgroundPresetGroup = "default" | "kids" | "legacy";
const KIDS_IDS = new Set([
  "g4-clouds-sky", "g4-clouds-blush", "g-meadow", "g-meadow-sky", "g4-arches-low", "g-wave", "g-wave-sand",
  "p-stars", "p-hearts",
]);
const LEGACY_IDS = new Set([
  // 그래픽: 옛 덩굴(큰 잎·굵은 선), 색 대비가 큰 그라데이션, 진한 색면
  "g-leaves", "g-leaves-deep", "g-block-split",
  // 2026-13 새 구름·아치로 교체(옛 그림은 저장된 포토북용으로 그대로 둠)
  "g-clouds-sky", "g-clouds-blush", "g-arches",
  // 2026-12 인쇄 위험(재단선 6mm 안쪽의 얇은 사각 프레임 — 재단 오차에 선이 잘리거나 한쪽으로 치우쳐 보임)
  "g2-frame-sage", "g2-frame-gray",
  "gradient-sunset", "gradient-lavender-teal", "gradient-teal-olive", "gradient-pastel-multi", "gradient-navy-sky",
  "gradient-sunset-sage", "gradient-blush-peach", "gradient-sunset-blue", "gradient-rose-mauve", "gradient-grey-blue",
  "gradient-lime-olive", "gradient-red-olive", "gradient-plum-slate",
  // 패턴: 큰 점·굵은 줄·진한 색 대비
  "dots-sand", "dots-sky", "stripes-mint", "stripes-blush", "grid-linen", "p-checks-pink", "p-gingham-red", "p-gingham-blue",
  "p-diamonds", "p-zigzag", "p-scallops", "p-dots-mint", "p-stripes-navy",
]);
export function backgroundPresetGroup(p: { id: string }): BackgroundPresetGroup {
  if (KIDS_IDS.has(p.id)) return "kids";
  if (LEGACY_IDS.has(p.id)) return "legacy";
  return "default";
}

export const backgroundPatternCategories: { id: BackgroundPatternCategory; label: string }[] = [
  { id: "graphic", label: "그래픽" },
  { id: "pattern", label: "패턴" },
  { id: "texture", label: "텍스처" },
];

export function findBackgroundPattern(id: string | undefined): BackgroundPatternPreset | undefined {
  if (!id) return undefined;
  return backgroundPatterns.find((p) => p.id === id);
}

// mm를 "화면 미리보기용" CSS px로 바꿔요(96dpi 기준 — 실제 인쇄 해상도와는 무관하게,
// 무늬 간격이 화면에서 보기 좋은 크기가 되도록 대략치만 맞추면 돼요).
function mmToCssPx(mm: number): number {
  return Math.max(4, Math.round(mm * 3.78));
}

// 화면(React 인라인 스타일)에 쓸 CSS background 값이에요. background 단축 속성이라
// 색 하나만 있어도, 그라데이션·반복 무늬가 있어도 모두 이 한 문자열로 표현돼요.
//
// anchorSide: 내지 스프레드는 왼쪽·오른쪽 두 낱장을 나란히 보여주는데, 각 낱장에 무늬를
// "왼쪽 위(0,0)부터" 독립적으로 반복시키면 두 낱장의 무늬 위상이 어긋나서 가운데(제본
// 경계)에서 간격이 안 맞아 보여요(마치 다른 이미지 두 장을 붙여놓은 것처럼). 그래서 왼쪽
// 낱장은 무늬 기준점을 "오른쪽"(=가운데 쪽)에, 오른쪽 낱장은 "왼쪽"(=가운데 쪽)에 둬서,
// 가운데를 기준으로 무늬가 대칭으로 맞아떨어지게 해요.
export function patternToCssBackground(
  preset: BackgroundPatternPreset,
  anchorSide: "left" | "right" = "left",
  // 2026-10-06, 혜민님 요청: "그라데이션이 낱장만 적용되는데 스프레드페이지 기준으로
  // 적용해주세요" — 이 낱장(패널)이 전체 펼침면(스프레드 또는 표지 전체) 중 몇 %를
  // 차지하고, 왼쪽 끝에서 몇 % 지점부터 시작하는지 알려주면, 그라데이션을 "전체
  // 펼침면 기준" 하나로 계산해서 이 낱장에 해당하는 조각만 보여줘요(표지는 뒤표지·
  // 책등·앞표지 3칸의 폭이 서로 달라서 폭·시작위치를 직접 넘겨받아요). 안 넘기면
  // anchorSide만으로 좌/우 절반(내지 스프레드 기본값)을 가정해요.
  spreadSpan?: { panelWidthPct: number; offsetPct: number }
): string {
  const [c0, c1] = preset.colors;
  const posX = anchorSide === "right" ? "right" : "left";
  switch (preset.kind) {
    case "diagonalSplit":
      return `linear-gradient(135deg, ${c0} 50%, ${c1} 50%)`;
    case "gradient": {
      const span = spreadSpan ?? { panelWidthPct: 50, offsetPct: anchorSide === "right" ? 50 : 0 };
      if (span.panelWidthPct > 0 && span.panelWidthPct < 100) {
        // background-size(%)는 "이 낱장(컨테이너) 자신의 크기" 기준이라, 전체
        // 펼침면 폭만큼 이미지를 키우려면 (100/이_낱장이_차지하는_%)*100%가 필요해요.
        // background-position(%)은 (컨테이너폭-이미지폭)*퍼센트/100 공식이라, 이
        // 낱장의 시작위치(offsetPct)가 이미지 원점과 맞아떨어지도록 역산했어요.
        const sizePct = (100 / span.panelWidthPct) * 100;
        const posPct = (span.offsetPct * 100) / (100 - span.panelWidthPct);
        return `linear-gradient(135deg, ${c0}, ${c1}) ${posPct}% 0% / ${sizePct}% 100%`;
      }
      return `linear-gradient(135deg, ${c0}, ${c1})`;
    }
    case "dots": {
      const s = mmToCssPx(preset.spacingMm ?? 6);
      return `radial-gradient(${c1} 22%, transparent 23%) ${posX} top/${s}px ${s}px, ${c0}`;
    }
    case "stripes": {
      const w = mmToCssPx(preset.spacingMm ?? 5);
      return `repeating-linear-gradient(45deg, ${c1} 0 ${w / 2}px, ${c0} ${w / 2}px ${w}px) ${posX} top`;
    }
    case "grid": {
      const w = mmToCssPx(preset.spacingMm ?? 4);
      return `repeating-linear-gradient(0deg, ${c1} 0 1px, transparent 1px ${w}px) ${posX} top, repeating-linear-gradient(90deg, ${c1} 0 1px, transparent 1px ${w}px) ${posX} top, ${c0}`;
    }
    default:
      return c0;
  }
}

// 스프레드(SpreadDef)의 배경 설정을 화면에 그대로 쓸 수 있는 CSS background 값
// 하나로 정리해요. 패턴을 골랐으면 패턴이 우선이고, 아니면 기존 단색 배경색을 써요.
export function resolveSpreadBackgroundCss(
  spread: {
    backgroundColor?: string;
    backgroundPattern?: string;
  },
  anchorSide: "left" | "right" = "left",
  spreadSpan?: { panelWidthPct: number; offsetPct: number }
): string | undefined {
  const preset = findBackgroundPattern(spread.backgroundPattern);
  if (preset) return patternToCssBackground(preset, anchorSide, spreadSpan);
  return spread.backgroundColor;
}

// 인쇄 PDF(Canvas 2D)에 같은 배경을 그려요. mmToPxFn은 호출하는 쪽의 단위 변환 함수를
// 그대로 받아요(printCompose.ts는 px, printPdfLib.ts는 pt를 쓰기 때문에 함수로 받아서
// 이 파일은 두 생성기 모두에서 그대로 재사용할 수 있어요).
export function drawBackgroundPatternOnCanvas(
  ctx: CanvasRenderingContext2D,
  preset: BackgroundPatternPreset,
  x: number,
  y: number,
  w: number,
  h: number,
  mmToPxFn: (mm: number) => number,
  // 2026-10-06, 혜민님 요청: "그라데이션이 낱장만 적용되는데 스프레드페이지 기준으로
  // 적용해주세요" — 전체 펼침면(내지 스프레드 또는 표지 전체) 기준 좌표(px)예요.
  // 안 넘기면 이 낱장(x,y,w,h) 하나만 기준으로 그리던 기존 방식 그대로예요.
  fullSpan?: { x: number; y: number; w: number; h: number; spineW?: number },
  // true면 점·줄무늬·격자의 반복 위상을 "펼침면(fullSpan) 왼쪽 위"에 맞춰요(새 배경 패널이 쓰는 방식 —
  // 왼쪽·오른쪽 낱장 무늬가 가운데에서 이어져요). 안 주면(옛 방식) 이 낱장 왼쪽 위 기준 그대로예요.
  anchorToSpan?: boolean
) {
  const [c0, c1] = preset.colors;
  const ax = anchorToSpan && fullSpan ? fullSpan.x : x;
  const ay = anchorToSpan && fullSpan ? fullSpan.y : y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c0;
  ctx.fillRect(x, y, w, h);

  switch (preset.kind) {
    case "diagonalSplit": {
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "gradient": {
      const span = fullSpan ?? { x, y, w, h };
      const grad = ctx.createLinearGradient(span.x, span.y, span.x + span.w, span.y + span.h);
      grad.addColorStop(0, c0);
      grad.addColorStop(1, c1);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      break;
    }
    case "dots": {
      const spacing = mmToPxFn(preset.spacingMm ?? 6);
      const radius = spacing * 0.28;
      ctx.fillStyle = c1;
      for (let py = ay + Math.floor((y - ay) / spacing) * spacing; py < y + h + spacing; py += spacing) {
        for (let px = ax + Math.floor((x - ax) / spacing) * spacing; px < x + w + spacing; px += spacing) {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "stripes": {
      const spacing = mmToPxFn(preset.spacingMm ?? 5);
      const diag = (anchorToSpan && fullSpan ? Math.hypot(fullSpan.w, fullSpan.h) : Math.sqrt(w * w + h * h)) * 1.5;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.fillStyle = c1;
      for (let sx = -diag - Math.ceil(diag / spacing) * spacing; sx < diag + Math.ceil(diag / spacing) * spacing; sx += spacing) {
        ctx.fillRect(sx, -diag, spacing / 2, diag * 2);
      }
      ctx.restore();
      break;
    }
    case "grid": {
      const spacing = mmToPxFn(preset.spacingMm ?? 4);
      ctx.strokeStyle = c1;
      ctx.lineWidth = Math.max(1, spacing * 0.06);
      for (let gx = ax + Math.floor((x - ax) / spacing) * spacing; gx <= x + w; gx += spacing) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }
      for (let gy = ay + Math.floor((y - ay) / spacing) * spacing; gy <= y + h; gy += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
      }
      break;
    }
    default:
      if (isArtKind(preset.kind)) {
        drawBackgroundArt(
          ctx,
          { id: preset.id, kind: preset.kind, colors: preset.colors, spacingMm: preset.spacingMm },
          x,
          y,
          w,
          h,
          mmToPxFn,
          fullSpan
        );
      }
      break;
  }

  ctx.restore();
}
