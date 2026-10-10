// 마지막 "소개 페이지" 디자인 — 앨범 테마(스타일 5종 × 행사 4종)마다 어울리는 마무리 페이지예요.
// 소개 페이지는 인쇄되는 "왼쪽 낱장" 한 장(접히는 쪽 = 오른쪽 가장자리)이라, 이 파일의 디자인은 left(g)만 의미가 있고 right는 빈 면이에요.
// 표지를 복제하지 않고 "차분한 끝 페이지"로 구성해요: 작은~중간 사진 칸 1개 · 앨범 제목 · 짧은 글귀 · 발행일 · 만든이(입력했을 때만) · 키픽 로고.
// 글상자 순서가 약속이에요(0 제목 · 1 글귀 · 2 발행일 · 3 만든이 · 4~ 장식). page.tsx가 이 순서(INTRO_ROLE)로 내용을 채워요.
// 모든 자리는 안전영역(재단선 안쪽 15mm = 작업 파일 가장자리에서 20mm)과 접힘선 20mm 안쪽에 들어와요(lib/designKit.ts 규칙 그대로).
import type { BackgroundSpec } from "./backgroundSpec";
import type { ImageBoxDef } from "./albumTemplates";
import { DESIGN_BACK_Z, solid, toolkit as kitToolkit, type DesignGeo, type DesignPageLayout, type DesignThemeId, type InnerDesign } from "./designKit";

export const INTRO_ID_PREFIX = "intro-";
export const INTRO_ROLE = { title: 0, quote: 1, date: 2, maker: 3 } as const;
export const INTRO_DEFAULT_TITLE = "우리의 이야기";
export const INTRO_DEFAULT_DATE = "2026년 10월 10일";
export const INTRO_DEFAULT_MAKER_PREFIX = "Made by ";
const LOGO = "/logo.svg";
const LOGO_ASPECT = 1155 / 367;

const QUOTE: Record<DesignThemeId, string> = {
  family: "함께한 모든 날이\n오래도록 따뜻하게 남기를.",
  travel: "길 위의 모든 순간이\n이 책에 고스란히 남았어요.",
  couple: "우리의 이야기는\n지금도 이어지고 있어요.",
  birthday: "오늘의 축하가\n오래도록 기억되기를.",
};

const LINE = 0.0014;
const emptyRight = (): DesignPageLayout => ({ slots: [], texts: [], stickers: [] });

type Maker = (g: DesignGeo, occ: DesignThemeId) => DesignPageLayout;

// ---------- 포근한 기억: 아치 사진 + 가운데 정렬 ----------
const WM = { serif: "'Gowun Batang', serif", hand: "'Gaegu', cursive", sans: "'Gowun Dodum', sans-serif" } as const;
const wm: Maker = (g, occ) => {
  const t = kitToolkit(g, "#4A4036");
  const ink = "#4A4036";
  const mute = "#8B7F70";
  return {
    bg: solid("#FBF7EE"),
    slots: [t.slot([0.3, 0, 0.4, 0.46], { frameShape: "arch" } as Partial<ImageBoxDef>)],
    texts: [
      t.text({ t: INTRO_DEFAULT_TITLE, f: [0.05, 0.52, 0.9, 0.1], font: WM.serif, pt: 22, align: "center", color: ink, lh: 1.3 }),
      t.text({ t: QUOTE[occ], f: [0.1, 0.675, 0.8, 0.12], font: WM.hand, pt: 15, align: "center", color: mute, lh: 1.65 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0.1, 0.84, 0.8, 0.045], font: WM.sans, pt: 10, align: "center", color: mute, ls: 0.1 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.1, 0.885, 0.8, 0.045], font: WM.sans, pt: 10, align: "center", color: mute, ls: 0.06 }),
      t.rule([0.46, 0.65, 0.08, LINE * 1.6], "#6B8466"),
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
const mn: Maker = (g, occ) => {
  const t = kitToolkit(g, "#1D1D1F");
  return {
    bg: solid("#FAF9F6"),
    slots: [t.slot([0, 0, 0.5, 0.42])],
    texts: [
      t.text({ t: INTRO_DEFAULT_TITLE, f: [0, 0.58, 0.9, 0.12], font: MN.serif, pt: 24, color: "#1D1D1F", lh: 1.3 }),
      t.text({ t: QUOTE[occ], f: [0, 0.72, 0.8, 0.1], font: MN.sans, pt: 10.5, color: "#76766F", lh: 1.9 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0, 0.885, 0.55, 0.04], font: MN.sans, pt: 9, color: "#76766F", ls: 0.14 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0, 0.93, 0.55, 0.04], font: MN.sans, pt: 9, color: "#76766F", ls: 0.1 }),
      t.text({ t: "EPILOGUE", f: [0.58, 0, 0.42, 0.04], font: MN.latin, pt: 9, color: "#76766F", ls: 0.34, align: "right" }),
      t.rule([0, 0.545, 1, LINE], "#CFCDC5"),
      t.rule([0, 0.86, 1, LINE], "#CFCDC5"),
    ],
    stickers: [t.sticker(LOGO, 0.9, 0.945, 24, 0, LOGO_ASPECT)],
  };
};

// ---------- 감성 필기체: 기울인 폴라로이드 + 마스킹테이프 ----------
const HW = { pen: "'Nanum Pen Script', cursive", hand: "'Gaegu', cursive", dokdo: "'East Sea Dokdo', cursive" } as const;
const hw: Maker = (g, occ) => {
  const t = kitToolkit(g, "#5B4632");
  const fr = t.framed("polaroid", 0.5, 0.3, 0.48, -3);
  return {
    bg: { kind: "texture", presetId: "t-paper-cream" } as BackgroundSpec,
    slots: [fr.slot],
    texts: [
      t.text({ t: INTRO_DEFAULT_TITLE, f: [0.05, 0.62, 0.9, 0.1], font: HW.pen, pt: 40, align: "center", color: "#5B4632", lh: 1.1 }),
      t.text({ t: QUOTE[occ], f: [0.1, 0.735, 0.8, 0.11], font: HW.hand, pt: 17, align: "center", color: "#85735F", lh: 1.6 }),
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
const kd: Maker = (g, occ) => {
  const t = kitToolkit(g, "#4A5568");
  return {
    bg: { kind: "graphic", presetId: "g4-clouds-sky" } as BackgroundSpec,
    slots: [t.slot([0.14, 0.02, 0.72, 0.44], { frameShape: "cloud" } as Partial<ImageBoxDef>)],
    texts: [
      t.text({ t: INTRO_DEFAULT_TITLE, f: [0.05, 0.55, 0.9, 0.1], font: KD.jua, pt: 26, align: "center", color: "#3E86C0", lh: 1.2 }),
      t.text({ t: QUOTE[occ], f: [0.1, 0.665, 0.8, 0.12], font: KD.hand, pt: 20, align: "center", color: "#4A5568", lh: 1.5 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0.28, 0.8, 0.44, 0.06], font: KD.jua, pt: 12, align: "center", va: "middle", color: "#4A5568", bg: "#FFFFFF", radius: 50 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.1, 0.875, 0.8, 0.05], font: KD.hand, pt: 16, align: "center", color: "#4A5568" }),
    ],
    stickers: [
      t.sticker("/stickers/animal/animal-sticker-02.png", 0.1, 0.5, 34, -8),
      t.sticker("/stickers/animal/animal-sticker-13.png", 0.9, 0.48, 32, 8),
      t.sticker(LOGO, 0.5, 0.965, 20, 0, LOGO_ASPECT),
    ],
  };
};

// ---------- MZ: 검정 바탕 + 필름 띠 + 라임 날짜 ----------
const MZ = { black: "'Black Han Sans', sans-serif", dh: "'Do Hyeon', sans-serif", sans: "Pretendard, sans-serif" } as const;
const mz: Maker = (g, occ) => {
  const t = kitToolkit(g, "#F2F0EA");
  const fr = t.framed("film", 0.5, 0.25, 0.62, -2);
  return {
    bg: solid("#111111"),
    slots: [fr.slot],
    texts: [
      t.text({ t: INTRO_DEFAULT_TITLE, f: [0, 0.55, 1, 0.13], font: MZ.black, pt: 30, color: "#CCFF00", lh: 1.1 }),
      t.text({ t: QUOTE[occ], f: [0, 0.69, 0.9, 0.11], font: MZ.dh, pt: 14, color: "#F2F0EA", lh: 1.55 }),
      t.text({ t: INTRO_DEFAULT_DATE, f: [0, 0.84, 0.42, 0.06], font: MZ.dh, pt: 12, color: "#111111", align: "center", va: "middle", bg: "#CCFF00", ls: 0.06 }),
      t.text({ t: `${INTRO_DEFAULT_MAKER_PREFIX}만든이`, f: [0.46, 0.84, 0.54, 0.06], font: MZ.sans, pt: 10, color: "#8D8D86", bold: true, va: "middle", ls: 0.12 }),
      t.rule([0.6, 0.925, 0.4, 0.065], "#F2F0EA", 50, DESIGN_BACK_Z),
    ],
    stickers: [
      fr.sticker,
      t.sticker("/stickers/season/party-sticker-01.svg", 0.92, 0.5, 30, 10),
      t.sticker(LOGO, 0.8, 0.958, 24, 0, LOGO_ASPECT),
    ],
  };
};

const MAKERS: Record<string, Maker> = { "warm-memory": wm, minimal: mn, handwriting: hw, kids: kd, mz };

export function introDesignId(style: string, occasion: string): string {
  return `${INTRO_ID_PREFIX}${style}-${occasion}`;
}
export function isIntroDesignId(id: string): boolean {
  return id.startsWith(INTRO_ID_PREFIX);
}

const OCCASIONS: DesignThemeId[] = ["family", "travel", "couple", "birthday"];
// 소개 페이지 디자인 전체 목록(패널 목록·내지 디자인 목록에는 안 들어가요 — 앨범 테마를 적용할 때 자동으로 짝지어 써요).
export const INTRO_DESIGNS: InnerDesign[] = Object.entries(MAKERS).flatMap(([style, make]) =>
  OCCASIONS.map(
    (occ): InnerDesign => ({
      id: introDesignId(style, occ),
      style,
      themes: [occ],
      name: "소개 페이지",
      note: "사진 1장 + 제목·글귀·발행 정보",
      left: (g) => make(g, occ),
      right: () => emptyRight(),
    })
  )
);
export function findIntroDesign(id: string): InnerDesign | undefined {
  return INTRO_DESIGNS.find((d) => d.id === id);
}
