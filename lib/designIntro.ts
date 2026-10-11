// 마지막 "소개 페이지" 디자인 — 모양이 실제로 다른 5가지(포근한 아치 · 미니멀 라인 · 필기체 폴라로이드 · 키즈 구름 · MZ 필름)예요.
// 행사(가족·여행·커플·생일)는 "디자인"이 아니라 "마무리 문구"(글귀)만 바꿔요 → 디자인과 문구는 따로 고르고, 서로 영향이 없어요(INTRO_PHRASES).
// 소개 페이지는 인쇄되는 "왼쪽 낱장" 한 장(접히는 쪽 = 오른쪽 가장자리)이라, 이 파일의 디자인은 left(g)만 의미가 있고 right는 빈 면이에요.
// 책의 "끝"은 내지 마지막 펼침면(마무리 디자인)이 한 번만 말해요. 이 소개 페이지는 그 뒤에 붙는 "판권 면"(책 정보 면)이라서 두 번째 표지·두 번째 "끝"이 되지 않게
// 구성해요: 작은 기념 사진 1개 → 앨범 제목(작은 한 줄 · 표지에 보이는 진짜 제목, 없으면 이 줄을 아예 만들지 않아요) → 마무리 글귀(여기가 중심) → 발행일 · 만든이(입력했을 때만) · 키픽 로고.
// 글상자 순서가 약속이에요(0 제목 · 1 글귀 · 2 발행일 · 3 만든이 · 4~ 장식). page.tsx가 이 순서(INTRO_ROLE)로 내용을 채워요.
// 모든 자리는 안전영역(재단선 안쪽 15mm = 작업 파일 가장자리에서 20mm)과 접힘선 20mm 안쪽에 들어와요(lib/designKit.ts 규칙 그대로).
import type { BackgroundSpec } from "./backgroundSpec";
import type { ImageBoxDef } from "./albumTemplates";
import type { SpreadDef } from "./albumTemplates";
import { DESIGN_BACK_Z, DESIGN_ID_PREFIX, solid, toolkit as kitToolkit, type DesignGeo, type DesignPageLayout, type DesignThemeId, type InnerDesign } from "./designKit";

export const INTRO_ID_PREFIX = "intro-";
export const INTRO_ROLE = { title: 0, quote: 1, date: 2, maker: 3 } as const;
// 예전(~25차)에는 제목 칸의 기본 글이 "우리의 이야기"였어요(큰 제목). 이제는 표지에 보이는 앨범 제목을 쓰고, 이 옛 기본 글은 "직접 쓴 글"로 치지 않아요(옛 저장본을 다시 적용할 때만 새 글로 바뀌어요).
export const INTRO_LEGACY_TITLE = "우리의 이야기";
// 썸네일처럼 진짜 제목을 모를 때만 보여주는 견본 글이에요(저장되는 글상자에는 안 들어가요).
export const INTRO_SAMPLE_TITLE = "나의 앨범";
export const INTRO_DEFAULT_DATE = "2026년 10월 10일";
export const INTRO_DEFAULT_MAKER_PREFIX = "Made by ";
const LOGO = "/logo.svg";
const LOGO_ASPECT = 1155 / 367;

// 마무리 문구(글귀) 4종 — 소개 페이지의 글귀 글상자(INTRO_ROLE.quote)에 들어가는 글이에요. 제목은 앨범 제목이라 문구와 상관없어요.
const QUOTE: Record<DesignThemeId, string> = {
  family: "함께한 모든 날이\n오래도록 따뜻하게 남기를.",
  travel: "길 위의 모든 순간이\n이 책에 고스란히 남았어요.",
  couple: "우리의 이야기는\n지금도 이어지고 있어요.",
  birthday: "오늘의 축하가\n오래도록 기억되기를.",
};

export type IntroPhraseId = DesignThemeId;
export const INTRO_PHRASES: { id: IntroPhraseId; name: string }[] = [
  { id: "family", name: "가족" },
  { id: "travel", name: "여행" },
  { id: "couple", name: "커플" },
  { id: "birthday", name: "생일" },
];
export const INTRO_DEFAULT_PHRASE: IntroPhraseId = "family";
export function isIntroPhraseId(v: unknown): v is IntroPhraseId {
  return typeof v === "string" && INTRO_PHRASES.some((p) => p.id === v);
}
export function introPhraseText(id: string | undefined): string {
  return QUOTE[isIntroPhraseId(id) ? id : INTRO_DEFAULT_PHRASE];
}

const LINE = 0.0014;
const emptyRight = (): DesignPageLayout => ({ slots: [], texts: [], stickers: [] });

type Maker = (g: DesignGeo, occ: IntroPhraseId, title: string) => DesignPageLayout;

// ---------- 포근한 기억: 아치 사진 + 가운데 정렬 ----------
const WM = { serif: "'Gowun Batang', serif", hand: "'Gaegu', cursive", sans: "'Gowun Dodum', sans-serif" } as const;
const wm: Maker = (g, occ, title) => {
  const t = kitToolkit(g, "#4A4036");
  const ink = "#4A4036";
  const mute = "#8B7F70";
  return {
    bg: solid("#FBF7EE"),
    slots: [t.slot([0.3, 0, 0.4, 0.46], { frameShape: "arch" } as Partial<ImageBoxDef>)],
    texts: [
      t.text({ t: title, f: [0.05, 0.515, 0.9, 0.05], font: WM.serif, pt: 12, align: "center", color: mute, ls: 0.14, lh: 1.3 }),
      t.text({ t: QUOTE[occ], f: [0.08, 0.625, 0.84, 0.16], font: WM.hand, pt: 18, align: "center", color: ink, lh: 1.65 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0.1, 0.84, 0.8, 0.045], font: WM.sans, pt: 10, align: "center", color: mute, ls: 0.1 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.1, 0.885, 0.8, 0.045], font: WM.sans, pt: 10, align: "center", color: mute, ls: 0.06 }),
      t.rule([0.46, 0.583, 0.08, LINE * 1.6], "#6B8466"),
    ],
    stickers: [
      t.sticker("/stickers/plant/flower-sticker-06.png", 0.74, 0.4, 22, 12),
      t.sticker("/stickers/plant/flower-sticker-05.png", 0.25, 0.43, 20, -10),
      t.sticker(LOGO, 0.5, 0.965, 22, 0, LOGO_ASPECT),
    ],
  };
};

// ---------- 미니멀: 왼쪽 위 사진 + 헤어라인 + 왼쪽 정렬 ----------
const MN = { serif: "'Nanum Myeongjo', serif", sans: "Pretendard, sans-serif", latin: "'Julius Sans One', sans-serif" } as const;
const mn: Maker = (g, occ, title) => {
  const t = kitToolkit(g, "#1D1D1F");
  return {
    bg: solid("#FAF9F6"),
    slots: [t.slot([0, 0, 0.5, 0.42])],
    texts: [
      t.text({ t: title, f: [0, 0.57, 0.9, 0.04], font: MN.sans, pt: 9.5, color: "#76766F", ls: 0.1 }),
      t.text({ t: QUOTE[occ], f: [0, 0.64, 0.92, 0.16], font: MN.serif, pt: 16, color: "#1D1D1F", lh: 1.75 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0, 0.885, 0.55, 0.04], font: MN.sans, pt: 9, color: "#76766F", ls: 0.14 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0, 0.93, 0.55, 0.04], font: MN.sans, pt: 9, color: "#76766F", ls: 0.1 }),
      t.text({ t: "COLOPHON", f: [0.58, 0, 0.42, 0.04], font: MN.latin, pt: 9, color: "#76766F", ls: 0.34, align: "right" }),
      t.rule([0, 0.545, 1, LINE], "#CFCDC5"),
      t.rule([0, 0.86, 1, LINE], "#CFCDC5"),
    ],
    stickers: [t.sticker(LOGO, 0.9, 0.945, 24, 0, LOGO_ASPECT)],
  };
};

// ---------- 감성 필기체: 기울인 폴라로이드 + 마스킹테이프 ----------
const HW = { pen: "'Nanum Pen Script', cursive", hand: "'Gaegu', cursive", dokdo: "'East Sea Dokdo', cursive" } as const;
const hw: Maker = (g, occ, title) => {
  const t = kitToolkit(g, "#5B4632");
  const fr = t.framed("polaroid", 0.5, 0.29, 0.46, -3);
  return {
    bg: { kind: "texture", presetId: "t-paper-cream" } as BackgroundSpec,
    slots: [fr.slot],
    texts: [
      t.text({ t: title, f: [0.05, 0.635, 0.9, 0.06], font: HW.pen, pt: 20, align: "center", color: "#85735F", lh: 1.1 }),
      t.text({ t: QUOTE[occ], f: [0.08, 0.71, 0.84, 0.13], font: HW.hand, pt: 21, align: "center", color: "#5B4632", lh: 1.55 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0.1, 0.855, 0.8, 0.055], font: HW.dokdo, pt: 18, align: "center", color: "#C65A45" }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.1, 0.905, 0.8, 0.045], font: HW.hand, pt: 14, align: "center", color: "#85735F" }),
    ],
    stickers: [
      fr.sticker,
      t.sticker("/stickers/tape/tape-sticker-05.png", 0.5, 0.02, 34, 2),
      t.sticker("/stickers/plant/flower-sticker-01.png", 0.1, 0.93, 28, -8),
      t.sticker("/stickers/icon/icon-heart-02.svg", 0.9, 0.9, 18, 10),
      t.sticker(LOGO, 0.5, 0.97, 20, 0, LOGO_ASPECT),
    ],
  };
};

// ---------- 키즈: 구름 사진 + 동물 스티커 ----------
const KD = { jua: "'Jua', sans-serif", hand: "'Gaegu', cursive" } as const;
const kd: Maker = (g, occ, title) => {
  const t = kitToolkit(g, "#4A5568");
  return {
    bg: { kind: "graphic", presetId: "g4-clouds-sky" } as BackgroundSpec,
    slots: [t.slot([0.2, 0.02, 0.6, 0.4], { frameShape: "cloud" } as Partial<ImageBoxDef>)],
    texts: [
      t.text({ t: title, f: [0.05, 0.46, 0.9, 0.06], font: KD.jua, pt: 14, align: "center", color: "#3E86C0", lh: 1.2 }),
      t.text({ t: QUOTE[occ], f: [0.1, 0.56, 0.8, 0.15], font: KD.hand, pt: 22, align: "center", color: "#4A5568", lh: 1.5 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0.28, 0.8, 0.44, 0.06], font: KD.jua, pt: 12, align: "center", va: "middle", color: "#4A5568", bg: "#FFFFFF", radius: 50 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.1, 0.875, 0.8, 0.05], font: KD.hand, pt: 16, align: "center", color: "#4A5568" }),
    ],
    stickers: [
      t.sticker("/stickers/animal/animal-sticker-02.png", 0.1, 0.4, 34, -8),
      t.sticker("/stickers/animal/animal-sticker-13.png", 0.9, 0.38, 32, 8),
      t.sticker(LOGO, 0.5, 0.965, 20, 0, LOGO_ASPECT),
    ],
  };
};

// ---------- MZ: 검정 바탕 + 필름 띠 + 라임 날짜 ----------
const MZ = { black: "'Black Han Sans', sans-serif", dh: "'Do Hyeon', sans-serif", sans: "Pretendard, sans-serif" } as const;
const mz: Maker = (g, occ, title) => {
  const t = kitToolkit(g, "#F2F0EA");
  const fr = t.framed("film", 0.5, 0.24, 0.56, -2);
  return {
    bg: solid("#111111"),
    slots: [fr.slot],
    texts: [
      t.text({ t: title, f: [0, 0.545, 1, 0.055], font: MZ.black, pt: 13, color: "#CCFF00", ls: 0.08, lh: 1.1 }),
      t.text({ t: QUOTE[occ], f: [0, 0.625, 0.95, 0.16], font: MZ.dh, pt: 18, color: "#F2F0EA", lh: 1.5 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0, 0.84, 0.36, 0.06], font: MZ.dh, pt: 12, color: "#111111", align: "center", va: "middle", bg: "#CCFF00", ls: 0.06 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.4, 0.84, 0.6, 0.06], font: MZ.sans, pt: 10, color: "#8D8D86", bold: true, va: "middle", ls: 0.12 }),
      t.rule([0.6, 0.925, 0.4, 0.065], "#F2F0EA", 50, DESIGN_BACK_Z),
    ],
    stickers: [
      fr.sticker,
      t.sticker("/stickers/season/party-sticker-01.svg", 0.92, 0.44, 30, 10),
      t.sticker(LOGO, 0.8, 0.958, 24, 0, LOGO_ASPECT),
    ],
  };
};

const MAKERS: Record<string, Maker> = { "warm-memory": wm, minimal: mn, handwriting: hw, kids: kd, mz };

const CARD_NAME: Record<string, string> = {
  "warm-memory": "포근한 아치",
  minimal: "미니멀 라인",
  handwriting: "필기체 폴라로이드",
  kids: "키즈 구름",
  mz: "MZ 필름",
};
const OCCASIONS: DesignThemeId[] = ["family", "travel", "couple", "birthday"];

export function introDesignId(style: string): string {
  return `${INTRO_ID_PREFIX}${style}`;
}
export function isIntroDesignId(id: string): boolean {
  return id.startsWith(INTRO_ID_PREFIX);
}

// 소개 페이지 디자인 전체 목록(패널 목록·내지 디자인 목록에는 안 들어가요 — 앨범 테마를 적용할 때 자동으로 짝지어 써요).
// 기본 글귀는 가족 문구예요(실제 글귀는 적용할 때 고른 "마무리 문구"로 바뀌어요 — introDesignLayout).
export const INTRO_DESIGNS: InnerDesign[] = Object.entries(MAKERS).map(
  ([style, make]): InnerDesign => ({
    id: introDesignId(style),
    style,
    themes: OCCASIONS,
    name: CARD_NAME[style] ?? style,
    note: "작은 사진 1장 + 글귀·책 정보",
    left: (g) => make(g, INTRO_DEFAULT_PHRASE, INTRO_SAMPLE_TITLE),
    right: () => emptyRight(),
  })
);

// 예전 저장본의 옛 id(`intro-<스타일>-<행사>`, 20종) → 합친 디자인 id + 그 행사의 마무리 문구. (스타일 id에 '-'가 있어서 끝의 행사만 떼어 읽어요)
export function migrateIntroDesignId(id: string): { id: string; phrase?: IntroPhraseId } {
  if (!isIntroDesignId(id)) return { id };
  const body = id.slice(INTRO_ID_PREFIX.length);
  const k = body.lastIndexOf("-");
  if (k > 0) {
    const style = body.slice(0, k);
    const occ = body.slice(k + 1);
    if (MAKERS[style] && isIntroPhraseId(occ)) return { id: introDesignId(style), phrase: occ };
  }
  return { id };
}

export function findIntroDesign(id: string): InnerDesign | undefined {
  const m = migrateIntroDesignId(id).id;
  return INTRO_DESIGNS.find((d) => d.id === m);
}

// 디자인 + 마무리 문구로 그린 왼쪽 낱장 데이터(패널 썸네일·적용이 같이 써요)
export function introDesignLayout(designId: string, g: DesignGeo, phrase: string | undefined, title?: string): DesignPageLayout | undefined {
  const style = migrateIntroDesignId(designId).id.slice(INTRO_ID_PREFIX.length);
  const make = MAKERS[style];
  return make ? make(g, isIntroPhraseId(phrase) ? phrase : INTRO_DEFAULT_PHRASE, title && title.trim() ? title.trim() : INTRO_SAMPLE_TITLE) : undefined;
}

// 옛 저장본 보정: 소개 페이지 펼침면의 옛 디자인 id를 합친 id로 바꾸고(디자인이 만든 글상자·스티커 id 머리글도 같이), 옛 id에 들어 있던 행사를
// introPhrase로 옮겨요. 이미 새 id면 그대로 돌려줘요(같은 객체) → 사용자가 고친 글·사진·좌표는 하나도 안 건드려요.
export function normalizeIntroSpread(sp: SpreadDef): SpreadDef {
  if (!sp.intro || !sp.introDesign) return sp;
  const m = migrateIntroDesignId(sp.introDesign);
  if (m.id === sp.introDesign) return sp;
  const oldPre = `${DESIGN_ID_PREFIX}${sp.introDesign}~`;
  const newPre = `${DESIGN_ID_PREFIX}${m.id}~`;
  const re = (id: string) => (id.startsWith(oldPre) ? newPre + id.slice(oldPre.length) : id);
  return {
    ...sp,
    introDesign: m.id,
    ...(sp.introPhrase === undefined && m.phrase ? { introPhrase: m.phrase } : {}),
    ...(sp.imageBoxes ? { imageBoxes: sp.imageBoxes.map((b) => ({ ...b, id: re(b.id) })) } : {}),
    ...(sp.imageBoxOrder ? { imageBoxOrder: sp.imageBoxOrder.map(re) } : {}),
    ...(sp.textBoxesLeft ? { textBoxesLeft: sp.textBoxesLeft.map((b) => ({ ...b, id: re(b.id) })) } : {}),
    ...(sp.textBoxesRight ? { textBoxesRight: sp.textBoxesRight.map((b) => ({ ...b, id: re(b.id) })) } : {}),
  };
}
