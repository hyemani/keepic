export type PageTemplateId =
  | "full"
  | "duo"
  | "trio"
  | "quad"
  | "photoText"
  | "blank"
  | "fullMargin"
  | "trioText"
  // "사진 1장(꽉 참/여백)" 페이지의 사진을 자유 배치 이미지박스로 전환했을 때 쓰는
  // 자리표시예요(2026-09-22 추가). 이 페이지는 더 이상 순서대로 사진을 자동 배정받지
  // 않고(photoCount 0), 대신 그 사진이 spread.imageBoxes 안에 독립적으로 들어가서 페이지
  // 경계를 자유롭게 넘나들 수 있어요. 목록에서 직접 고를 수 있는 템플릿이 아니라, "이미지
  // 박스로 전환" 버튼을 눌렀을 때만 자동으로 지정돼요.
  | "freeform";

export const pageTemplates: Record<PageTemplateId, { photoCount: number }> = {
  full: { photoCount: 1 },
  duo: { photoCount: 2 },
  trio: { photoCount: 3 },
  quad: { photoCount: 4 },
  photoText: { photoCount: 1 },
  blank: { photoCount: 0 },
  fullMargin: { photoCount: 1 },
  trioText: { photoCount: 3 },
  freeform: { photoCount: 0 },
};

// 자유 배치 텍스트박스 하나예요(내지 페이지·표지 앞면 공통으로 써요). 위치·너비는 그
// 텍스트박스가 놓인 "페이지(또는 표지 앞면) 전체"를 100%로 보는 퍼센트 좌표라서, 화면
// 크기가 달라져도(모바일 등) 항상 같은 자리에 보여요.
export type TextBoxDef = {
  id: string;
  text: string;
  xPct: number; // 왼쪽 끝 위치 (0~100)
  yPct: number; // 위쪽 끝 위치 (0~100)
  widthPct: number; // 박스 너비(가로, 0~100) — 고정이에요. 이 너비에서 줄바꿈돼요.
  heightPct?: number; // 박스 높이(세로, 0~100). 비워두면 글자 양에 맞춰 자동으로 늘어나요
  // (예전 방식·책등처럼 세로쓰기인 경우). 값이 있으면 일러스트레이터 텍스트박스처럼
  // 높이가 고정되고, 아래쪽 손잡이로 끌어서 조절할 수 있어요.
  fontFamily: string;
  fontScale: number; // 기본 글자 크기 대비 배율(1이 기본) — 표지 제목 배율(coverTitleFontScale)과 같은 방식이에요.
  color: string;
  align: "left" | "center" | "right";
  bold: boolean;
  // 행간(줄바꿈 시 줄 사이 배수, em) — 지정 안 하면 기존처럼 화면은 CSS "leading-snug"
  // (1.375), 인쇄 파일은 1.35를 그대로 써요(2026-09-23 "문자" 패널 통합 때 추가 — 기존에
  // 저장된 텍스트박스는 이 필드가 없어도 예전과 완전히 같은 크기로 보여요).
  lineHeight?: number;
  // 자간(em) — 지정 안 하면(undefined) 기존처럼 자간을 아예 안 줘요(0과 다르게 취급 —
  // 브라우저 기본 자간 그대로). 표지 제목의 letterSpacing(em)과 같은 단위예요.
  letterSpacing?: number;
  // 글자 가로/세로 폭(%, 일러스트레이터 문자 패널의 "가로 폭"/"세로 폭"과 같아요) —
  // 100이 기본(늘리거나 안 눌림)이에요. 지정 안 하면 100으로 취급해요(2026-09-27
  // 추가). ⚠️ 지금은 화면 미리보기에만 반영되고, 실제 인쇄 PDF에는 아직 반영 안
  // 돼요(이미지박스 회전과 같은 상태 — 인쇄 반영은 다음 과제).
  scaleXPct?: number;
  scaleYPct?: number;
  // 박스 안에서 텍스트를 위/가운데/아래 중 어디에 둘지예요(일러스트레이터 텍스트박스의
  // 세로 정렬과 같아요). heightPct로 박스 높이를 고정했을 때만 실제로 차이가 보여요(높이가
  // 글자 양에 맞춰 자동으로 늘어나는 박스는 남는 공간이 없어서 항상 위와 같아요). 값이
  // 없으면 기존처럼 "위"로 취급해요(하위 호환, 2026-09-22 추가).
  verticalAlign?: "top" | "middle" | "bottom";
  // 사진박스·다른 텍스트박스와 뒤섞어서 앞뒤 순서(쌓임 순서)를 매길 때 쓰는 값이에요
  // (2026-09-25, "종류 상관없이 전부" 레이어 순서 기능 추가). 값이 클수록 나중에
  // 그려져서(=화면·인쇄 모두) 더 위에 보여요. 값이 없으면(예전에 저장된 텍스트박스)
  // "사진은 전부 아래, 텍스트는 전부 위"였던 기존 화면 그대로 보이도록
  // effectiveZOrder()가 안전한 기본값을 대신 매겨요 — 불러온 프로젝트가 이 필드가
  // 없다고 해서 갑자기 순서가 달라지지 않아요.
  zOrder?: number;
  // 밑줄(2026-10-02 추가, "문자" 패널 요청). 값이 없으면 밑줄 없음(기존과 동일).
  underline?: boolean;
  // 기울임(이탤릭). 값이 없으면 기울임 없음(기존과 동일).
  italic?: boolean;
  // 글자 배경색(하이라이트) — 지정 안 하면(undefined) 배경 없음(기존과 동일, 완전
  // 투명). 지정하면 텍스트 블록 뒤에 이 색으로 배경 사각형을 그려요.
  backgroundColor?: string;
  // 배경 사각형이 글자보다 가로로 얼마나 더 넉넉한지(%, 글자 크기 기준) — 지정 안
  // 하면 40(기본값)으로 취급해요.
  backgroundPaddingXPct?: number;
  // 배경 사각형이 글자보다 세로로 얼마나 더 넉넉한지(%, 글자 크기 기준) — 지정 안
  // 하면 25(기본값)으로 취급해요.
  backgroundPaddingYPct?: number;
};

// 자유 배치 이미지박스 하나예요(내지 스프레드·표지 앞면 공통으로 써요). 텍스트박스와
// 달리 "왼쪽 페이지"·"오른쪽 페이지" 각각이 아니라 "스프레드(펼침면) 전체 폭"을 100%로
// 보는 퍼센트 좌표예요 — 그래야 박스를 끌어서 가운데(페이지 경계)를 넘나들며 자유롭게
// 배치할 수 있어요(혜민님 확인, 2026-09). 인쇄 파일을 만들 때는 이 좌표를 기준으로 같은
// 사진을 왼쪽 낱장·오른쪽 낱장 파일에 각각 필요한 부분만 잘라서 그려서, 실제로 펼쳤을 때
// 하나로 이어져 보이게 해요.
export type ImageBoxDef = {
  id: string;
  // 사진 원본 URL이에요. 빈 문자열("")이면 "빈 프레임"(레이아웃은 적용됐지만 아직 사진을
  // 안 채운 칸)이에요 — 2026-09-23, "사진 수가 안 맞으면 레이아웃 적용을 막는다"는
  // 예전 조건을 폐기하면서 추가됨. 미리보기·인쇄 파일에는 빈 프레임을 그리지 않아요.
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  xPct: number; // 스프레드 전체 폭 기준 왼쪽 끝 위치(0~100, 왼쪽 페이지는 0~50, 오른쪽 페이지는 50~100)
  yPct: number; // 스프레드 높이 기준 위쪽 끝 위치(0~100)
  widthPct: number; // 스프레드 폭 기준 너비(0~100) — 박스(틀) 크기예요. 세로(heightPct)와
  // 독립적으로 조절 가능해요(원본 비율에 안 묶여요, 2026-09-18 변경).
  heightPct: number; // 스프레드 높이 기준 높이(0~100) — 박스(틀) 크기예요.
  // 박스 안에서 사진이 보이는 위치/확대예요("cover"로 박스를 항상 꽉 채운 상태를
  // 기준으로, 그 안에서 얼마나 더 확대했는지·어느 방향으로 옮겼는지). 박스 크기를
  // 조절하면 이 확대/위치 값은 그대로 유지된 채 새 박스 크기 기준으로 다시 계산되기
  // 때문에, 박스만 조절해도 항상 비율이 맞고 빈 여백 없이 꽉 차요(2026-09-22 확정 —
  // 이전엔 사진을 박스와 분리된 절대 좌표로 관리했었는데, 박스를 조절할 때 사진이 잘려서
  // 빈 공간이 생기는 문제가 있어 다시 이 방식으로 되돌림). 지정 안 하면 0/0/1(꽉 채운
  // 기본 위치, 확대 없음)로 취급해요 — 기존에 저장된 이미지박스는 이 필드가 없어도
  // 그대로 잘 나와요. lib/imageBoxGeometry.ts의 computeImageBoxCoverRect가 이 값들로
  // 실제 그려질 위치·크기를 계산하고, 화면 미리보기와 인쇄 파일 둘 다 같은 함수를 써요.
  innerOffsetXPct?: number; // 박스 너비 대비 %, 왼쪽(-)/오른쪽(+) 이동
  innerOffsetYPct?: number; // 박스 높이 대비 %, 위(-)/아래(+) 이동
  innerScale?: number; // 1 = 박스를 딱 채우는 기본 확대율, 1보다 크면 더 확대
  // 사진을 좌우로 뒤집을지예요(2026-09-22 추가, 자유 배치 이미지박스용). 화면·인쇄
  // 파일 둘 다 같은 값을 보고 그려요. 회전은 박스 크기 계산이 훨씬 복잡해져서 아직
  // 지원하지 않아요 — 필요하면 다음에 별도로 추가해요.
  flipX?: boolean;
  // 텍스트박스의 zOrder와 같은 개념·같은 값 범위예요(둘을 하나로 섞어서 정렬해요).
  // 값이 없으면(예전 이미지박스) effectiveZOrder()가 "사진은 전부 아래" 기본값을
  // 매겨요.
  zOrder?: number;
  // 이 박스가 "사진"인지 "스티커"(스티커/손글씨스티커 탭에서 추가한 장식 이미지)인지예요
  // (2026-09-24 추가 — "스티커 선택 시 사진 메뉴로 이동하는 버그", "스티커는 사진처럼
  // 잘라내지(crop) 말고 이동+비율유지 크기조절만" 요청으로 신설). 값이 없으면(기존
  // 저장된 프로젝트, 또는 사진으로 추가된 박스) "photo"로 취급해요 — 이 필드가 없어도
  // 기존 사진박스는 예전과 똑같이 동작해요.
  kind?: "photo" | "sticker";
  // 박스 회전(도, 시계방향) — 2026-09 "편집툴에 회전 버튼 추가" 요청으로 신설. 화면
  // 미리보기에서만 CSS로 돌려서 보여줘요 — 인쇄 파일(lib/printCompose.ts)에는 아직
  // 반영 안 했어요(스프레드 경계를 넘나드는 박스를 양쪽 낱장 캔버스에 나눠 그리는
  // 기존 방식과 회전을 함께 계산하려면 별도 검증이 필요해서, 이번 라운드는 화면
  // 편집만 먼저 지원해요). 값이 없으면 0도(회전 없음)예요.
  rotation?: number;
  // 박스 투명도(0~1, 1이 불투명) — 값이 없으면 1(완전 불투명)이에요. 화면·인쇄 파일
  // 둘 다 반영돼요.
  opacity?: number;
  // 박스 테두리 두께(px, 화면 기준)·색이에요. borderWidthPx가 없거나 0이면 테두리를
  // 안 그려요. 화면·인쇄 파일 둘 다 반영돼요.
  borderWidthPx?: number;
  borderColor?: string;
  // 모서리 둥글게 — 0~50(%) 슬라이더 하나로 사각형(0)부터 완전한 원/타원(50, CSS
  // border-radius:50%와 같은 값 — 정사각형 박스면 정원, 직사각형이면 타원이 됨)까지
  // 자연스럽게 이어져요(2026-09-28 재요청: "타원(원형)만 있는데 둥글게 직접
  // 조절할수있도록 만들어주세요. 타원말고 둥글게를 최대치로하면 원이 되도록요" —
  // 예전엔 "사각형/타원" 두 모드로 나뉘어 있었는데, 하나의 슬라이더로 합침).
  // rotation과 같은 이유로 화면 미리보기 전용이에요(인쇄 파일 쪽 클리핑은 아직 반영
  // 안 함). 별·반달·액자 모양은 box-shadow 테두리로는 두께가 고르게 안 나와서 SVG
  // 윤곽선이 필요한 더 큰 작업이라 다음에 따로 만들어요.
  borderRadiusPct?: number;
};

// `kind`가 스티커/손글씨스티커 탭에서 새로 추가되는 박스에만 붙기 시작해서(2026-09-24),
// 그 이전에 이미 캔버스에 놓여있던 스티커들은 이 필드가 비어있어요. `box.kind ===
// "sticker"`만 보면 그런 "예전 스티커"가 사진으로 오판되어(선택 시 "사진" 탭으로 튕기고,
// crop 방식으로 잘리는 문제 재발) 혜민님이 "스티커 선택시 사진탭으로 바뀐다"고 다시
// 보고하신 원인이 됐어요(2026-09-24 재수정). `kind`가 없을 땐 스티커 파일 경로
// (`/stickers/...`)인지로 한 번 더 판단해서, 예전에 추가된 스티커도 똑같이 스티커로
// 인식하도록 고쳤어요.
export function isStickerImageBox(box: { kind?: "photo" | "sticker"; url: string }): boolean {
  if (box.kind === "sticker") return true;
  if (box.kind === "photo") return false;
  return box.url.startsWith("/stickers/");
}

export type SpreadDef = {
  left: PageTemplateId;
  right: PageTemplateId;
  // 내지 배경색(hex, 예: "#F5E9DA"). 지정 안 하면 기존처럼 흰색이에요.
  // 왼쪽·오른쪽 페이지가 한 스프레드(펼침면)라서 배경색도 스프레드 단위로 같이 적용돼요.
  backgroundColor?: string;
  // 그래픽·패턴·텍스처 배경 꾸미기(lib/backgroundPatterns.ts의 preset id)예요. 지정돼
  // 있으면 backgroundColor보다 우선해요(서로 배타적으로 골라요).
  backgroundPattern?: string;
  // 자유 배치 텍스트박스예요. 왼쪽·오른쪽 페이지가 서로 다른 낱장이라 각각 따로 가져요.
  textBoxesLeft?: TextBoxDef[];
  textBoxesRight?: TextBoxDef[];
  // 자유 배치 이미지박스예요. 텍스트박스와 달리 스프레드 전체를 공유해요(페이지 경계를
  // 넘어 배치할 수 있어야 하니까요).
  imageBoxes?: ImageBoxDef[];
  // 레이아웃 템플릿 적용 시 "읽는 순서"(왼쪽→오른쪽, 위→아래)로 각 이미지박스를 슬롯에
  // 배정한 순서를 이미지박스의 id로 저장해둬요(2026-09-23 추가). 최초 템플릿 적용 시
  // 한 번만 계산해서 저장하고, 이후 다른 템플릿으로 바꿀 때도 이 순서를 그대로 재사용해서
  // 비대칭 배치나 수동 드래그 후에도 사진 순서가 흐트러지지 않게 해요. url(사진)이 아니라
  // 각 박스의 고유 id로 추적해요 — 같은 사진이 여러 박스에 중복으로 들어갈 수도 있어서요.
  // imageBoxes 배열에 없는 id는 무시하고, 배열에 있지만 이 목록에 없는 id는 읽는 순서로
  // 보정해서 취급해요(사진 추가/삭제 시 항상 최신 상태로 유지돼요).
  imageBoxOrder?: string[];
};

export type AlbumTemplate = {
  id: string;
  name: string;
  description: string;
  spreads: SpreadDef[];
};

export const albumTemplates: AlbumTemplate[] = [
  {
    id: "ai-auto",
    name: "AI 맞춤 레이아웃",
    description: "사진을 올리면 개수와 비율에 맞춰 AI가 자동으로 배치해드려요",
    // 고정된 스프레드가 없어요 — 사진을 올리면 generateAutoSpreads()가 그때그때 만들어요.
    spreads: [],
  },
  {
    id: "classic",
    name: "클래식",
    description: "사진과 여백이 번갈아 나오는 균형 잡힌 구성",
    spreads: [
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
      { left: "quad", right: "full" },
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
      { left: "quad", right: "full" },
      { left: "full", right: "trio" },
      { left: "duo", right: "duo" },
    ],
  },
  {
    id: "minimal",
    name: "미니멀",
    description: "큰 사진 위주로, 여백을 넉넉하게 살린 담백한 구성",
    spreads: [
      { left: "full", right: "full" },
      { left: "full", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "full" },
    ],
  },
  {
    id: "collage",
    name: "콜라주",
    description: "사진을 최대한 많이, 촘촘하게 담고 싶은 분께",
    spreads: [
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
    ],
  },
  {
    id: "story",
    name: "스토리",
    description: "잔잔하게 시작해서 점점 풍성해지는 흐름",
    spreads: [
      { left: "full", right: "full" },
      { left: "full", right: "duo" },
      { left: "duo", right: "duo" },
      { left: "duo", right: "trio" },
      { left: "trio", right: "trio" },
      { left: "trio", right: "quad" },
      { left: "quad", right: "quad" },
      { left: "trio", right: "trio" },
      { left: "duo", right: "duo" },
      { left: "full", right: "full" },
    ],
  },
  {
    id: "magazine",
    name: "매거진",
    description: "잡지 화보 느낌의 큰 사진과 작은 사진의 조화",
    spreads: [
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
      { left: "duo", right: "full" },
      { left: "full", right: "duo" },
      { left: "full", right: "trio" },
      { left: "trio", right: "full" },
    ],
  },
  {
    id: "storytelling",
    name: "스토리텔링",
    description: "사진마다 짧은 이야기를 함께 담는, 여행기록 같은 구성",
    spreads: [
      { left: "quad", right: "photoText" },
      { left: "photoText", right: "trio" },
      { left: "duo", right: "photoText" },
      { left: "photoText", right: "duo" },
      { left: "trio", right: "photoText" },
      { left: "photoText", right: "quad" },
      { left: "full", right: "photoText" },
      { left: "photoText", right: "full" },
      { left: "duo", right: "photoText" },
      { left: "photoText", right: "trio" },
    ],
  },
];

// 옵션 단계에서 고른 "내지 페이지 수"에 맞춰 편집기 스프레드 개수를 정해요.
// 스프레드 1개 = 펼침면(왼쪽+오른쪽) 2페이지라서 페이지 수 ÷ 2가 스프레드 개수예요.
export function calcRequiredSpreadCount(pages: number): number {
  return Math.max(1, Math.round(pages / 2));
}

// 템플릿(예: "클래식")은 스프레드 구성이 고정돼 있는데, 고객마다 고른 내지 페이지 수가
// 달라서 그 템플릿 패턴을 반복해서 스프레드 개수를 정확히 맞춰요.
export function fitSpreadsToCount(spreads: SpreadDef[], count: number): SpreadDef[] {
  if (spreads.length === 0 || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => ({ ...spreads[i % spreads.length] }));
}

export function getTemplatePhotoCount(template: AlbumTemplate) {
  return template.spreads.reduce((total, spread) => {
    return (
      total +
      pageTemplates[spread.left].photoCount +
      pageTemplates[spread.right].photoCount
    );
  }, 0);
}

// "AI 맞춤 레이아웃"을 고르면 이 id로 들어와요. 정해진 spreads가 없고,
// 올린 사진에 맞춰 generateAutoSpreads()로 그때그때 만들어요.
export const AI_AUTO_LAYOUT_TEMPLATE_ID = "ai-auto";

// 2026-09-24부터 "AI 맞춤 레이아웃"은 칸(1/2/3/4분할) 배정 없이, 사진을 올리는 즉시
// 자유 배치 이미지박스로 바로 넣어요(편집메뉴에서 바로 위치·크기를 조절할 수 있게).
// 그래서 처음엔 빈 스프레드만 필요한 개수만큼 만들어두고, 사진이 올라올 때마다
// findAutoPhotoSlotPosition()이 정해주는 자리에 박스를 하나씩 추가해요.
export function generateEmptyFreeformSpreads(requiredSpreadCount: number): SpreadDef[] {
  const count = Math.max(1, requiredSpreadCount);
  return Array.from({ length: count }, () => ({ left: "blank" as PageTemplateId, right: "blank" as PageTemplateId }));
}

// slot 0, 1, 2, 3... 순서를 "몇 번째 스프레드의 어느 쪽 면"인지로 바꿔줘요. 스프레드
// 1(index 0)의 왼쪽 면은 표지 뒷면(인쇄 안 됨)이라 항상 건너뛰고 오른쪽부터 채워요.
// 정해진 페이지 수(requiredSpreadCount)를 다 채운 뒤에 더 들어오는 사진은, 잃어버리지
// 않도록 마지막 스프레드에 겹쳐서라도 계속 추가해요(overflow: true로 표시).
export function findAutoPhotoSlotPosition(
  slot: number,
  requiredSpreadCount: number
): { spreadIndex: number; side: "left" | "right"; overflow: boolean } {
  const count = Math.max(1, requiredSpreadCount);
  const totalSlots = Math.max(1, count * 2 - 1);
  const clamped = Math.min(slot, totalSlots - 1);
  const overflow = slot > totalSlots - 1;
  if (clamped === 0) return { spreadIndex: 0, side: "right", overflow };
  const idx = clamped - 1;
  const spreadIndex = Math.min(1 + Math.floor(idx / 2), count - 1);
  const side: "left" | "right" = idx % 2 === 0 ? "left" : "right";
  return { spreadIndex, side, overflow };
}

export type PhotoAspect = { width: number; height: number };

// 정해진 페이지 칸 수(slotCount)에 사진(photoCount)을 최대한 고르게 나눠 담아요.
// 한 칸엔 1~4장까지 들어갈 수 있어요. 사진이 딱 맞아떨어지지 않으면(너무 적거나
// 너무 많으면) 가능한 범위까지 채우고 나머지는 그대로 둬서, 위쪽 화면에서
// "사진이 N장 더/덜 필요해요" 안내가 정확하게 계산되도록 해요.
function distributePhotosIntoSlots(photoCount: number, slotCount: number): number[] {
  const MIN = 1;
  const MAX = 4;
  if (slotCount <= 0) return [];
  const base = Math.min(MAX, Math.max(MIN, Math.round(photoCount / slotCount)));
  const sizes = Array(slotCount).fill(base);
  let sum = sizes.reduce((a, b) => a + b, 0);

  let guard = 0;
  while (sum < photoCount && sizes.some((s) => s < MAX) && guard < slotCount * MAX * 2) {
    const idx = guard % slotCount;
    if (sizes[idx] < MAX) {
      sizes[idx] += 1;
      sum += 1;
    }
    guard += 1;
  }
  guard = 0;
  while (sum > photoCount && sizes.some((s) => s > MIN) && guard < slotCount * MAX * 2) {
    const idx = guard % slotCount;
    if (sizes[idx] > MIN) {
      sizes[idx] -= 1;
      sum -= 1;
    }
    guard += 1;
  }
  return sizes;
}

// singleIndex: 지금까지 나온 "한 칸에 사진 한 장" 배치 중 몇 번째인지예요.
// 전부 꽉 찬 사진(full)만 나오면 밋밋해서, 세 번에 한 번은 여백이 있는
// fullMargin으로 바꿔서 다양하게 보여줘요.
function sizeToTemplateId(size: number, singleIndex: number): PageTemplateId {
  if (size >= 4) return "quad";
  if (size === 3) return "trio";
  if (size === 2) return "duo";
  return singleIndex % 3 === 2 ? "fullMargin" : "full";
}

// 올린 사진들을 보고 스프레드(왼쪽/오른쪽 페이지) 구성을 자동으로 만들어요.
// requiredSpreadCount(고객이 고른 내지 페이지 수 ÷ 2)만큼 스프레드 개수를 정확히
// 맞춰요. 스프레드 1의 왼쪽 면은 표지 뒷면이라 항상 빈 면(사진 없음)으로 두고,
// 나머지 칸에 사진을 최대한 고르게 나눠 담아요.
export function generateAutoSpreads(
  photos: PhotoAspect[],
  requiredSpreadCount: number
): SpreadDef[] {
  const count = Math.max(1, requiredSpreadCount);
  const availableSlots = Math.max(1, count * 2 - 1);
  const slotSizes = distributePhotosIntoSlots(photos.length, availableSlots);

  let singleIndex = 0;
  const sideTemplates = slotSizes.map((size) => {
    const templateId = sizeToTemplateId(size, singleIndex);
    if (size === 1) singleIndex += 1;
    return templateId;
  });

  const spreads: SpreadDef[] = [{ left: "blank", right: sideTemplates[0] ?? "blank" }];
  for (let i = 1; i < sideTemplates.length; i += 2) {
    spreads.push({
      left: sideTemplates[i],
      right: sideTemplates[i + 1] ?? "blank",
    });
  }
  while (spreads.length < count) {
    spreads.push({ left: "blank", right: "blank" });
  }
  return spreads.slice(0, count);
}
// ---- 사진박스·텍스트박스 쌓임 순서(zOrder, 2026-09-25 추가) ----
// "레이어" 메뉴에서 종류(사진/텍스트) 상관없이 앞뒤 순서를 바꿀 수 있게 하는 공용
// 계산이에요. 화면(app/upload/page.tsx)과 인쇄(lib/printCompose.ts)가 이 파일의
// effectiveZOrder·sortStackedBoxes·computeZOrderUpdates를 똑같이 가져다 써서, 화면에
// 보이는 순서와 실제 PDF에 그려지는 순서가 절대 어긋나지 않도록 해요.

export type StackKind = "image" | "text";

export type StackedItem = { kind: StackKind; id: string; z: number };

// zOrder가 없는(예전에 저장된) 박스에 매기는 기본값이에요. 사진은 배열 순서 그대로
// 0부터, 텍스트는 배열 순서 그대로 1000부터 — 그래서 zOrder를 아무도 아직 안 건드린
// 스프레드/표지 패널은 예전과 똑같이 "사진은 전부 아래, 텍스트는 전부 위"로 보여요
// (한 패널에 사진이 1000장 넘게 있는 것처럼 극단적인 경우만 예외예요).
export function effectiveZOrder(kind: StackKind, zOrder: number | undefined, arrayIndex: number): number {
  // 음수 zOrder는 절대 CSS zIndex로 그대로 내보내지 않아요 — "맨 뒤로"를 반복해서 누르면
  // (예전 코드로) 저장돼버린 음수 값이 있을 수 있는데, 음수 zIndex는 배경(스프레드
  // 배경색/무늬) 요소 뒤로 완전히 숨어버리는 문제가 있었어요(2026-09-26 확인). 이미
  // 저장된 음수 값도 0으로 바닥을 깔아서 항상 화면에 보이게 해요 — computeZOrderUpdates의
  // "back" 액션도 이제 음수를 만들지 않도록 같이 고쳤어요.
  if (zOrder !== undefined && Number.isFinite(zOrder)) return Math.max(0, zOrder);
  return kind === "image" ? arrayIndex : 1000 + arrayIndex;
}

// 같은 패널(스프레드 전체, 또는 표지 앞/뒤면 한 칸) 안의 사진박스·텍스트박스를 전부
// 하나로 합쳐서 "아래→위" 순서로 정렬해요. z값이 같으면(드물게 zOrder를 직접 같은
// 값으로 줬을 때) 원래 배열 순서(사진 배열 전체 다음 텍스트 배열 전체)를 그대로
// 유지해요 — Array.prototype.sort는 안정 정렬이라 표준상 보장돼요.
// 이 패널(스프레드 전체, 또는 표지 앞/뒤면 한 칸)에서 "지금 가장 위"보다 한 칸 더
// 위에 놓을 zOrder 값이에요 — 사진을 새로 올렸을 때 기존 사진·스티커·텍스트박스 중
// zOrder를 직접 조작한(예: "맨 앞으로") 것이 있으면, effectiveZOrder의 기본값(배열
// 순번)만으로는 그 값보다 낮아서 뒤에 가려질 수 있었던 버그(2026-09-28, "사진
// 올릴때 사진이 맨 뒤로 적용되어 안보이는 현상")를 막기 위해, 새 박스를 만들 때
// 이 값을 명시적으로 zOrder에 넣어요.
export function nextTopZOrder(images: ImageBoxDef[], texts: TextBoxDef[]): number {
  const order = sortStackedBoxes(images, texts);
  return order.length ? order[order.length - 1].z + 1 : 0;
}

export function sortStackedBoxes(images: ImageBoxDef[], texts: TextBoxDef[]): StackedItem[] {
  const items: StackedItem[] = [
    ...images.map((b, i) => ({ kind: "image" as const, id: b.id, z: effectiveZOrder("image", b.zOrder, i) })),
    ...texts.map((b, i) => ({ kind: "text" as const, id: b.id, z: effectiveZOrder("text", b.zOrder, i) })),
  ];
  return items.sort((a, b) => a.z - b.z);
}

export type StackOrderAction = "front" | "back" | "forward" | "backward";

// 특정 박스 하나를 한 칸 앞으로/뒤로, 또는 맨 앞/맨 뒤로 보낼 때 실제로 zOrder를 새로
// 써야 하는 대상들을 계산해요(1개 또는 2개). 한 칸 이동은 바로 이웃한 박스와 z값을
// 맞바꾸는 방식이라 둘 다 결과에 포함되고, 맨 앞/맨 뒤는 지금 패널의 최댓값+1·최솟값-1로
// 옮기는 거라 자기 자신만 포함돼요. 이미 맨 앞/맨 뒤라 옮길 곳이 없으면 빈 배열이에요.
export function computeZOrderUpdates(
  images: ImageBoxDef[],
  texts: TextBoxDef[],
  kind: StackKind,
  id: string,
  action: StackOrderAction
): { kind: StackKind; id: string; z: number }[] {
  const order = sortStackedBoxes(images, texts);
  const idx = order.findIndex((it) => it.kind === kind && it.id === id);
  if (idx === -1 || order.length === 0) return [];

  if (action === "front") {
    if (idx === order.length - 1) return [];
    return [{ kind, id, z: order[order.length - 1].z + 1 }];
  }
  if (action === "back") {
    if (idx === 0) return [];
    // 예전엔 order[0].z - 1로 "맨 뒤로"를 구현했는데, 이러면 반복해서 누를 때마다 음수
    // zIndex가 나올 수 있었어요(예: 0 -> -1 -> -2...). 이 음수 zIndex 값이 그대로
    // React의 style={{ zIndex }}로 들어가면서, 배경(스프레드 배경색/무늬) 요소가 명시적
    // z-index 없이(auto) 그려지는 위치와 스태킹 순서가 꼬여 사진·스티커가 배경 뒤로
    // 완전히 숨어버리는 문제가 있었어요(2026-09-26, 혜민님이 "맨 뒤로 누르니 사라진다"로
    // 재현해주심). 그래서 음수를 아예 안 쓰도록 바꿨어요 — 나머지 박스를 전부 한 칸씩
    // 뒤로 밀고(z + 1), 이 박스만 0으로 보내는 방식이에요. 순서는 똑같이 맨 뒤가 되지만
    // zIndex는 항상 0 이상만 나와요.
    const updates = order
      .filter((it) => !(it.kind === kind && it.id === id))
      .map((it) => ({ kind: it.kind, id: it.id, z: it.z + 1 }));
    updates.push({ kind, id, z: 0 });
    return updates;
  }
  if (action === "forward") {
    if (idx >= order.length - 1) return [];
    const neighbor = order[idx + 1];
    return [
      { kind, id, z: neighbor.z },
      { kind: neighbor.kind, id: neighbor.id, z: order[idx].z },
    ];
  }
  // backward
  if (idx <= 0) return [];
  const neighbor = order[idx - 1];
  return [
    { kind, id, z: neighbor.z },
    { kind: neighbor.kind, id: neighbor.id, z: order[idx].z },
  ];
}
