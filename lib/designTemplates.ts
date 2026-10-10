// 디자인 템플릿(2026-10, 혜민님 요청: "예시 이미지처럼 텍스트도 이쁜 서체로 구성해서 템플릿을 만들어두고 싶어", "깔끔한 미니멀, 감성 필기체,
// 키즈 앨범 전부 각각 넣어줘야해 요즘 젊은 느낌의 MZ 느낌도") —
// 사진 칸(빈 프레임)·예쁜 글상자(서체·크기·색 포함)·스티커·배경을 한 세트로 묶어 둔 "페이지 디자인"이에요.
// 레이아웃 템플릿(lib/photoLayoutTemplates.ts)이 사진 칸 위치만 정하는 것과 달리, 이 템플릿은 글까지 같이 깔아줘요.
//
// 스타일(= 디자인 가족) 5종, 각각 표지 1 + 내지 펼침면 6(오프닝·큰 사진+캡션·두 장+글귀·세 장 스트립+날짜·콜라주·마무리):
//   포근한 기억(warm-memory, 이 파일) · 미니멀(lib/designFamilies/minimal.ts) · 감성 필기체(handwriting.ts) · 키즈 앨범(kids.ts) · MZ(mz.ts)
// 판 크기 → 안전영역 좌표 변환·타입·글상자/스티커/사진 틀 도우미는 lib/designKit.ts에 있고, 이 파일이 그대로 다시 내보내요.
// 쓰는 서체는 전부 app/layout.tsx(구글 폰트, OFL)·public/fonts에서 이미 불러오는 것이라 새로 추가한 서체는 없어요.
import type { ImageBoxDef, TextBoxDef } from "./albumTemplates";
import type { BackgroundSpec } from "./backgroundSpec";
import { textBoxPtToFontScale } from "./textBoxFontSize";
import {
  DESIGN_ID_PREFIX,
  coverDesignGeo,
  innerDesignGeo,
  innerSideGeo,
  solid,
  toolkit as kitToolkit,
  type CoverDesign,
  type CoverDesignDef,
  type DesignGeo,
  type DesignPageLayout,
  type DesignThemeId,
  type DesignSticker,
  type DesignText,
  type InnerDesign,
  type InnerDesignDef,
} from "./designKit";
import { MINIMAL_COVER, MINIMAL_FONTS, MINIMAL_INNER } from "./designFamilies/minimal";
import { HANDWRITING_COVER, HANDWRITING_FONTS, HANDWRITING_INNER } from "./designFamilies/handwriting";
import { KIDS_COVER, KIDS_FONTS, KIDS_INNER } from "./designFamilies/kids";
import { MZ_COVER, MZ_FONTS, MZ_INNER } from "./designFamilies/mz";
import { OCCASION_COVER, OCCASION_FONTS, OCCASION_INNER } from "./designFamilies/occasion";

export * from "./designKit";
export * from "./designIntro";
import { findIntroDesign } from "./designIntro";

export type DesignStyleInfo = { id: string; name: string; short: string };
// 패널 칩 순서 = 이 배열 순서예요. short는 좁은 칩에 쓰는 이름이에요.
export const DESIGN_STYLES: DesignStyleInfo[] = [
  { id: "warm-memory", name: "포근한 기억", short: "포근한 기억" },
  { id: "minimal", name: "미니멀", short: "미니멀" },
  { id: "handwriting", name: "감성 필기체", short: "감성 필기체" },
  { id: "kids", name: "키즈 앨범", short: "키즈" },
  { id: "mz", name: "MZ", short: "MZ" },
];
export function designStyleName(id: string): string {
  return DESIGN_STYLES.find((s) => s.id === id)?.name ?? id;
}

// 이 파일의 기본 글자색(포근한 기억 디자인이 색을 안 적은 글상자에 쓰던 값 그대로)
const toolkit = (g: DesignGeo) => kitToolkit(g, "#4A4036");

const FONT = {
  serif: "'Gowun Batang', serif",
  hand: "'Gaegu', cursive",
  pen: "'Nanum Pen Script', cursive",
  sans: "'Gowun Dodum', sans-serif",
} as const;

const C = {
  ivory: "#FBF7EE",
  paper: "#F4EEDF",
  sage: "#B9C9AE",
  sageLight: "#E3EADB",
  sageDeep: "#6B8466",
  butter: "#F4DFA0",
  butterLight: "#FBF0CD",
  ink: "#4A4036",
  mute: "#8B7F70",
} as const;

const STK = {
  sunflower: "/stickers/plant/flower-sticker-05.png",
  tapeKraft: "/stickers/tape/tape-sticker-03.png",
  tapeStar: "/stickers/tape/tape-sticker-05.png",
  note: "/stickers/tape/tape-sticker-08.png",
} as const;

const SOFT = { borderRadiusPct: 1.2 } as const; // 사진 모서리를 살짝 둥글게
const ARCH = { frameShape: "arch" as const };
const ROUND = { borderRadiusPct: 50 } as const;
const withRing = (color: string): Partial<ImageBoxDef> => ({ ...ROUND, borderWidthPx: 5, borderColor: color });

// =====================================================================
// 내지: 펼침면 6종 (왼쪽 낱장 + 오른쪽 낱장 = 한 디자인, 한쪽 낱장에만 따로 적용도 돼요)
// =====================================================================
const WM_INNER: InnerDesignDef[] = [
  {
    // 1) 챕터 오프닝: 왼쪽 큰 사진 + 오른쪽 세로글(두 줄) 제목 페이지
    id: "wm-opening",
    name: "오프닝",
    note: "큰 사진 1장 + 세로글 제목",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0, 1, 0.8], SOFT)],
        texts: [
          t.text({ t: "2026.10.04", f: [0, 0.865, 0.4, 0.05], font: FONT.sans, pt: 11, color: C.mute, ls: 0.12 }),
          t.text({ t: "그날의 햇살과 웃음", f: [0, 0.915, 0.8, 0.085], font: FONT.hand, pt: 20.5, color: C.sageDeep }),
        ],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.02, 32, -2)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.sageLight),
        slots: [],
        texts: [
          // 세로글: 한 줄(한 칸)에 글자 하나씩 줄바꿈 → 오른쪽 줄부터 읽어요(두 상자 = 두 줄).
          t.text({ t: "함\n께\n걸\n어\n온", f: [0.66, 0.07, 0.12, 0.42], font: FONT.serif, pt: 26.5, align: "center", lh: 1.42 }),
          t.text({ t: "모\n든\n날\n들", f: [0.47, 0.07, 0.12, 0.42], font: FONT.serif, pt: 26.5, align: "center", lh: 1.42 }),
          t.text({ t: "OUR STORY", f: [0, 0.68, 0.7, 0.05], font: FONT.sans, pt: 11, color: C.sageDeep, ls: 0.3 }),
          t.text({ t: "우리의 이야기", f: [0, 0.74, 0.9, 0.14], font: FONT.serif, pt: 37, lh: 1.2 }),
          t.text({ t: "첫 장을 열며", f: [0, 0.89, 0.6, 0.08], font: FONT.hand, pt: 19, color: C.mute }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.88, 0.9, 30, 8)],
      };
    },
  },
  {
    // 2) 큰 사진 1장 + 캡션
    id: "wm-photo-caption",
    name: "큰 사진 + 캡션",
    note: "사진 1장 + 제목·설명글",
    left: (g) => {
      const t = toolkit(g);
      return { bg: solid(C.ivory), slots: [t.slot([0, 0, 1, 1], SOFT)], texts: [], stickers: [t.sticker(STK.tapeStar, 0.12, 0.02, 32, -8)] };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [],
        texts: [
          t.text({ t: "오늘의 한 장", f: [0.04, 0.04, 0.8, 0.09], font: FONT.hand, pt: 24, color: C.sageDeep }),
          t.text({ t: "햇살이 머문 오후", f: [0.04, 0.13, 0.92, 0.12], font: FONT.serif, pt: 31, lh: 1.2 }),
          t.text({
            t: "아무 말 없이 걸어도 좋았던 길.\n바람이 지나가고 우리 웃음이 남았다.\n이 사진을 볼 때마다\n그날의 온기가 다시 돌아온다.",
            f: [0.04, 0.3, 0.84, 0.3],
            font: FONT.sans,
            pt: 12.5,
            lh: 1.85,
            color: C.ink,
          }),
          t.text({ t: "2026.10.04", f: [0.04, 0.92, 0.5, 0.06], font: FONT.sans, pt: 11, color: C.mute, ls: 0.12, va: "bottom" }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.9, 0.88, 26, -6)],
      };
    },
  },
  {
    // 3) 사진 2장 + 짧은 글귀
    id: "wm-two-quote",
    name: "두 장 + 글귀",
    note: "사진 2장 + 짧은 글귀",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.02, 1, 0.76], SOFT)],
        texts: [t.text({ t: "2026.10.04", f: [0, 0.86, 0.5, 0.06], font: FONT.sans, pt: 11, color: C.mute, ls: 0.12 })],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.02, 1, 0.76], SOFT)],
        texts: [
          t.text({
            t: "서로를 바라보던 시간이\n가장 오래 남는 장면이 된다",
            f: [0, 0.84, 1, 0.14],
            font: FONT.serif,
            pt: 15.5,
            align: "center",
            lh: 1.75,
            color: C.ink,
          }),
        ],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.02, 34, 3)],
      };
    },
  },
  {
    // 4) 사진 3장 스트립 + 날짜 + 캡션
    id: "wm-strip-date",
    name: "세 장 스트립 + 날짜",
    note: "사진 3장 + 큰 날짜·캡션",
    left: (g) => {
      const t = toolkit(g);
      const w = 0.31;
      const gap = (1 - w * 3) / 2;
      return {
        bg: solid(C.ivory),
        slots: [0, 1, 2].map((i) => t.slot([i * (w + gap), 0, w, 0.78], SOFT)),
        texts: [t.text({ t: "봄에서 가을까지", f: [0, 0.86, 0.8, 0.1], font: FONT.hand, pt: 21.5, color: C.sageDeep })],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.butterLight),
        slots: [],
        texts: [
          t.text({ t: "2026", f: [0, 0.2, 1, 0.1], font: FONT.hand, pt: 29, color: C.sageDeep, align: "center" }),
          t.text({ t: "10.04", f: [0, 0.3, 1, 0.22], font: FONT.serif, pt: 65, align: "center", lh: 1.1 }),
          t.text({
            t: "세 번의 계절을 지나\n우리는 같은 자리에 다시 섰다.",
            f: [0.08, 0.58, 0.84, 0.16],
            font: FONT.sans,
            pt: 12.5,
            align: "center",
            lh: 1.85,
          }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.06, 40, 0)],
      };
    },
  },
  {
    // 5) 콜라주(사진 5장) + 손글씨 라벨
    id: "wm-collage",
    name: "콜라주 + 손글씨",
    note: "사진 5장 + 손글씨 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [
          t.slot([0, 0, 0.63, 0.56], SOFT),
          t.slot([0.67, 0, 0.33, 0.265], SOFT),
          t.slot([0.67, 0.295, 0.33, 0.265], SOFT),
        ],
        texts: [
          t.text({ t: "오늘의 기록", f: [0, 0.62, 0.9, 0.13], font: FONT.hand, pt: 36, color: C.sageDeep, lh: 1.2 }),
          t.text({ t: "2026.10.04", f: [0, 0.78, 0.5, 0.06], font: FONT.sans, pt: 11, color: C.mute, ls: 0.12 }),
        ],
        stickers: [t.sticker(STK.tapeKraft, 0.31, 0.015, 30, -4)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.04, 0.48, 0.6], SOFT), t.slot([0.52, 0.14, 0.48, 0.5], SOFT)],
        texts: [
          t.text({
            t: "웃음이 많았던 하루,\n사진마다 이야기가 있어요.",
            f: [0, 0.72, 0.9, 0.16],
            font: FONT.serif,
            pt: 15.5,
            lh: 1.7,
          }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.9, 0.88, 28, 10)],
      };
    },
  },
  {
    // 6) 마무리: Thank you + 사진 1장
    id: "wm-closing",
    name: "마무리 · Thank you",
    note: "사진 1장 + 감사 인사·끝",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [],
        texts: [
          t.text({ t: "Thank you", f: [0, 0.22, 1, 0.2], font: FONT.pen, pt: 74.5, align: "center", color: C.sageDeep, lh: 1.1 }),
          t.text({ t: "고마운 순간들", f: [0, 0.45, 1, 0.1], font: FONT.serif, pt: 24, align: "center" }),
          t.text({
            t: "함께한 모든 날이\n오래도록 따뜻하게 남기를.",
            f: [0.1, 0.58, 0.8, 0.14],
            font: FONT.sans,
            pt: 12.5,
            align: "center",
            lh: 1.85,
            color: C.mute,
          }),
          t.text({ t: "끝", f: [0, 0.84, 1, 0.1], font: FONT.hand, pt: 21.5, align: "center", color: C.sageDeep }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.5, 0.06, 30, -6)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: { kind: "solid", color: C.butterLight },
        slots: [t.slot([0.06, 0.07, 0.88, 0.76], SOFT)],
        texts: [t.text({ t: "2026.10.04", f: [0.06, 0.9, 0.88, 0.06], font: FONT.sans, pt: 11, color: C.mute, ls: 0.12, align: "center" })],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.07, 36, 2)],
      };
    },
  },
];

// =====================================================================
// 표지: 앞표지 + 책등 + 뒤표지 한 세트
// =====================================================================
const WM_COVER: CoverDesignDef[] = [
  {
    id: "wm-cover",
    name: "포근한 기억",
    note: "앞표지 사진 2장 + 책등 + 뒤표지 글귀",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.12, 0.04, 0.76, 0.56], ARCH), t.slot([0.63, 0.37, 0.26, 0.26], withRing(C.ivory))],
        texts: [
          t.text({ t: "함께한 모든 날들", f: [0, 0.795, 1, 0.09], font: FONT.hand, pt: 27.5, color: C.sageDeep, align: "center" }),
          t.text({ t: "2026.10.04", f: [0, 0.915, 1, 0.06], font: FONT.sans, pt: 12, color: C.mute, ls: 0.3, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.04, 40, -3), t.sticker(STK.sunflower, 0.12, 0.62, 30, -10)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.3, 0.08, 0.4, 0.4], ROUND)],
        texts: [
          t.text({ t: "오늘의 웃음이\n내일의 추억이 되도록", f: [0, 0.55, 1, 0.2], font: FONT.hand, pt: 29, color: C.ink, align: "center", lh: 1.55 }),
          t.text({ t: "우리의 이야기 · 2026", f: [0, 0.8, 1, 0.05], font: FONT.sans, pt: 11, color: C.mute, ls: 0.2, align: "center" }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.12, 0.9, 26, 8)],
      };
    },
    spine: { bg: solid(C.sage), titleFontFamily: FONT.serif, titleColor: C.ink },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.93, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 42 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.66, 1, 0.14]);
      return {
        text: "우리의 이야기",
        xPct: f.xPct,
        yPct: f.yPct,
        widthPct: f.widthPct,
        fontFamily: FONT.serif,
        pt: 48 * g.k,
        color: C.ink,
        lineHeight: 1.2,
        letterSpacing: 0.02,
      };
    },
  },
];

// 기존 35종(스타일 5 × 표지 1 + 내지 6)에 붙이는 테마예요 — 한 디자인이 여러 테마에 속할 수 있어요(패널 탭 "전체"는 중복 없이 한 번씩만 보여줘요).
const EXISTING_THEMES: Record<string, DesignThemeId[]> = {
  "wm-opening": ["family", "couple"],
  "wm-photo-caption": ["family", "couple", "travel"],
  "wm-two-quote": ["couple", "family"],
  "wm-strip-date": ["travel", "family"],
  "wm-collage": ["family", "travel"],
  "wm-closing": ["family", "couple"],
  "wm-cover": ["family", "couple"],
  "mn-opening": ["travel", "couple"],
  "mn-photo-caption": ["travel", "family"],
  "mn-two-quote": ["couple"],
  "mn-strip-date": ["travel"],
  "mn-collage": ["travel", "family"],
  "mn-closing": ["couple", "family"],
  "mn-cover": ["travel", "couple"],
  "hw-opening": ["couple", "family"],
  "hw-photo-caption": ["couple", "family"],
  "hw-two-quote": ["couple"],
  "hw-strip-date": ["couple", "travel"],
  "hw-collage": ["family", "travel"],
  "hw-closing": ["couple", "family"],
  "hw-cover": ["couple", "family"],
  "kd-opening": ["birthday", "family"],
  "kd-photo-caption": ["family", "birthday"],
  "kd-two-quote": ["family"],
  "kd-strip-date": ["birthday", "family"],
  "kd-collage": ["birthday", "family"],
  "kd-closing": ["family", "birthday"],
  "kd-cover": ["family", "birthday"],
  "mz-opening": ["travel", "birthday"],
  "mz-photo-caption": ["travel", "birthday"],
  "mz-two-quote": ["couple", "travel"],
  "mz-strip-date": ["travel", "birthday"],
  "mz-collage": ["birthday", "travel"],
  "mz-closing": ["travel", "couple"],
  "mz-cover": ["travel", "birthday"],
};
// ---------- 비슷한 디자인 정리 (2026-10 20차, 혜민님 요청: "너무 비슷한 건 하나만 남겨주세요") ----------
// 레이아웃 뼈대(사진 칸 수·위치)·글 자리·스티커·배경·서체를 숫자로 비교하고 썸네일을 눈으로 확인해서, 같은 디자인에 글·색·스티커만 다른 것은
// 대표 하나만 목록에 보여줘요. 숨긴 디자인도 데이터·id는 그대로 남아 있어서(INNER_DESIGNS / COVER_DESIGNS 전체 목록, findInnerDesign / findCoverDesign)
// 예전에 저장한 작업(dt-… id)은 똑같이 열리고, 패널·전체 앨범 적용에서만 빠져요.
export const HIDDEN_DESIGN_IDS: ReadonlySet<string> = new Set([
  // 내지
  "mn-photo-caption", // = mn-opening (사진 1칸 + 오른쪽 글, 구성 거의 같음)
  "hw-couple-closing", // = hw-closing (크라프트 + 폴라로이드 마무리, 문구만 다름)
  "mz-birthday-dday", // = mz-closing (블랙 + 라임 큰 글자 / 오른쪽 사진 + 라임 띠)
  "wm-couple-rings", // = wm-family-portrait (큰 사진 1 + 사진 2 + 글귀, 색·스티커만 다름)
  "wm-family-story", // = wm-opening / wm-couple-dday (큰 사진 + 옆 글 + 동그란 사진 뼈대 같음)
  // 표지
  "mz-travel-cover", // = mz-cover (블랙 + 필름 띠, 제목 글자만 다름)
  "kd-family-cover", // = kd-cover
  "kd-birthday-cover", // = kd-cover
  "hw-couple-cover", // = hw-cover
  "wm-family-cover", // = wm-cover
  "wm-couple-cover", // = wm-cover (아치 사진 + 제목, 색만 다름)
  "mn-travel-cover", // = mn-cover
]);
// 대표로 남긴 디자인이 숨긴 디자인의 테마까지 맡도록 테마 태그를 넓혀요(탭이 얇아지지 않게).
const THEME_OVERRIDES: Record<string, DesignThemeId[]> = {
  "wm-family-portrait": ["family", "couple"],
  "wm-couple-dday": ["couple", "family"],
  "mn-opening": ["travel", "couple", "family"],
  "mz-closing": ["travel", "couple", "birthday"],
  "wm-cover": ["family", "couple", "travel"],
  "mn-cover": ["travel", "couple", "family"],
  "hw-cover": ["couple", "family", "travel"],
  "kd-cover": ["family", "birthday"],
  "mz-cover": ["travel", "birthday", "couple"],
  "mz-birthday-cover": ["birthday"],
};
// 접히는 선 안전 여백: 내지 낱장 디자인은 어느 쪽이 접히는 쪽인지에 맞춰 스티커 한계(stk)를 FOLD_SAFE_MM으로 눌러서 받아요(글·사진 칸은 안전영역이 이미 20mm).
const tagInner = (style: string, defs: InnerDesignDef[]): InnerDesign[] =>
  defs.map((d) => ({
    ...d,
    style: d.style ?? style,
    themes: THEME_OVERRIDES[d.id] ?? d.themes ?? EXISTING_THEMES[d.id] ?? ["family"],
    left: (g: DesignGeo) => d.left(innerSideGeo(g, "left")),
    right: (g: DesignGeo) => d.right(innerSideGeo(g, "right")),
  }));
const tagCover = (style: string, defs: CoverDesignDef[]): CoverDesign[] =>
  defs.map((d) => ({ ...d, style: d.style ?? style, themes: THEME_OVERRIDES[d.id] ?? d.themes ?? EXISTING_THEMES[d.id] ?? ["family"] }));
export const INNER_DESIGNS: InnerDesign[] = [
  ...tagInner("warm-memory", WM_INNER),
  ...tagInner("minimal", MINIMAL_INNER),
  ...tagInner("handwriting", HANDWRITING_INNER),
  ...tagInner("kids", KIDS_INNER),
  ...tagInner("mz", MZ_INNER),
  ...tagInner("warm-memory", OCCASION_INNER), // 테마별 새 디자인(각 정의가 style·themes를 직접 가져요)
];
export const COVER_DESIGNS: CoverDesign[] = [
  ...tagCover("warm-memory", WM_COVER),
  ...tagCover("minimal", [MINIMAL_COVER]),
  ...tagCover("handwriting", [HANDWRITING_COVER]),
  ...tagCover("kids", [KIDS_COVER]),
  ...tagCover("mz", [MZ_COVER]),
  ...tagCover("warm-memory", OCCASION_COVER),
];
// 패널·전체 앨범 적용에 쓰는 "보이는" 목록(숨긴 디자인 제외). 전체 목록은 위 INNER_DESIGNS / COVER_DESIGNS예요.
export const VISIBLE_INNER_DESIGNS: InnerDesign[] = INNER_DESIGNS.filter((d) => !HIDDEN_DESIGN_IDS.has(d.id));
export const VISIBLE_COVER_DESIGNS: CoverDesign[] = COVER_DESIGNS.filter((d) => !HIDDEN_DESIGN_IDS.has(d.id));
// 테마 탭(전체·가족·여행·커플·생일)과 스타일 보조 선택에 쓰는 도우미예요. "all"이면 전부(중복 없이 한 번씩).
export function designMatches(d: { themes: DesignThemeId[]; style: string }, theme: string, style: string): boolean {
  return (theme === "all" || d.themes.includes(theme as DesignThemeId)) && (style === "all" || d.style === style);
}
export const DESIGN_FONT_FAMILIES: string[] = Array.from(
  new Set([FONT.serif, FONT.hand, FONT.pen, FONT.sans, ...MINIMAL_FONTS, ...HANDWRITING_FONTS, ...KIDS_FONTS, ...MZ_FONTS, ...OCCASION_FONTS])
);

export const COVER_PLACEHOLDER_TITLES: string[] = COVER_DESIGNS.map((d) => d.title(coverDesignGeo("front", 250, 5)).text);

export function innerDesignPhotoCount(d: InnerDesign): number {
  const g = innerDesignGeo(260);
  return d.left(g).slots.length + d.right(g).slots.length;
}
export function coverDesignPhotoCount(d: CoverDesign): number {
  const g = coverDesignGeo("front", 250, 5);
  return d.front(g).slots.length + d.back(coverDesignGeo("back", 250, 5)).slots.length;
}

export function findInnerDesign(id: string): InnerDesign | undefined {
  return INNER_DESIGNS.find((d) => d.id === id) ?? findIntroDesign(id);
}
export function findCoverDesign(id: string): CoverDesign | undefined {
  return COVER_DESIGNS.find((d) => d.id === id);
}

// 디자인 템플릿이 만든 글상자/스티커 id 만들기·알아보기
export function designItemId(designId: string, side: string, kind: "t" | "s", n: number): string {
  return `${DESIGN_ID_PREFIX}${designId}~${side}~${kind}${n}`;
}
export function designIdOfItem(id: string): string | null {
  if (!id.startsWith(DESIGN_ID_PREFIX)) return null;
  const rest = id.slice(DESIGN_ID_PREFIX.length);
  const i = rest.indexOf("~");
  return i > 0 ? rest.slice(0, i) : null;
}
export function isDesignItemId(id: string): boolean {
  return designIdOfItem(id) !== null;
}

// =====================================================================
// 썸네일 장면: 편집기와 같은 데이터(layout)를 mm 위치에 올려놓은 모양이에요. 그리기는 app/upload/designTemplatePanel.tsx가
// 인쇄 PDF와 같은 함수(drawTextBoxOnCanvas·drawBackgroundSpecOnCanvas·framePerimeterPoints)로 해요 — 손으로 그린 가짜 썸네일이 아니에요.
// =====================================================================
export type DesignScenePart = {
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  layout: DesignPageLayout;
  dim?: boolean; // 적용 대상이 아닌 낱장은 흐리게
  band?: BackgroundSpec; // 책등처럼 글·사진 없이 배경만 있는 띠
  logo?: { xPct: number; yPct: number; scalePct: number }; // 뒤표지 키픽 로고
};
export type DesignScene = { wMm: number; hMm: number; parts: DesignScenePart[]; foldAtMm?: number };

export type DesignRange = "left" | "right" | "spread";

export function innerDesignScene(d: InnerDesign, pageWorkMm: number, range: DesignRange, bleedMm = 5): DesignScene {
  const g = innerDesignGeo(pageWorkMm, bleedMm);
  return {
    wMm: pageWorkMm * 2,
    hMm: pageWorkMm,
    foldAtMm: pageWorkMm,
    parts: [
      { xMm: 0, yMm: 0, wMm: pageWorkMm, hMm: pageWorkMm, layout: d.left(g), dim: range === "right" },
      { xMm: pageWorkMm, yMm: 0, wMm: pageWorkMm, hMm: pageWorkMm, layout: d.right(g), dim: range === "left" },
    ],
  };
}

export function coverTitleAsText(d: CoverDesign, g: DesignGeo, text?: string): DesignText {
  const ti = d.title(g);
  return {
    text: text ?? ti.text,
    xPct: ti.xPct,
    yPct: ti.yPct,
    widthPct: ti.widthPct,
    fontFamily: ti.fontFamily,
    fontScale: textBoxPtToFontScale(ti.pt, g.W),
    color: ti.color,
    align: "center",
    bold: false,
    lineHeight: ti.lineHeight,
    letterSpacing: ti.letterSpacing,
  };
}

export function coverDesignScene(d: CoverDesign, panelMm: number, bleedMm: number, spineMm: number): DesignScene {
  const gb = coverDesignGeo("back", panelMm, bleedMm);
  const gf = coverDesignGeo("front", panelMm, bleedMm);
  const front = d.front(gf);
  front.texts = [coverTitleAsText(d, gf), ...front.texts];
  // 실제 표지 펼침 그대로: 뒷표지 | 책등 | 앞표지 (같은 축척). 카드는 앨범 테마 카드(내지 펼침면, 가로:세로 = 2:1)와 같은 2:1 칸이라
  // 표지 장면을 그 칸 가운데에 놓고 남는 쪽은 바탕색으로 채워요(두 목록의 카드 높이·이름 자리가 같아요).
  const w0 = gb.W + spineMm + gf.W;
  const h0 = gf.H;
  const wMm = Math.max(w0, h0 * 2);
  const hMm = Math.max(h0, w0 / 2);
  const ox = (wMm - w0) / 2;
  const oy = (hMm - h0) / 2;
  return {
    wMm,
    hMm,
    parts: [
      { xMm: ox, yMm: oy, wMm: gb.W, hMm: gb.H, layout: d.back(gb), logo: d.backLogo(gb) },
      { xMm: ox + gb.W, yMm: oy, wMm: spineMm, hMm: gb.H, layout: { slots: [], texts: [], stickers: [] }, band: d.spine.bg },
      { xMm: ox + gb.W + spineMm, yMm: oy, wMm: gf.W, hMm: gf.H, layout: front },
    ],
  };
}

// =====================================================================
// 적용 도우미 (page.tsx가 불러 써요)
// =====================================================================
const AUTO_CAPTION_PREFIX = "autocaption-"; // 레이아웃 템플릿이 자동으로 만드는 빈 캡션 글상자 id 머리글(app/upload/page.tsx와 같아요)

// 이 판의 글상자 목록에 디자인 글상자를 "바꿔 끼워요": 이전 디자인이 만든 글상자·자동 빈 캡션·빈 글상자는 치우고,
// 사용자가 직접 쓴(글이 들어 있는) 글상자는 그대로 둬요. keptUser = 그대로 둔 직접 쓴 글상자 수.
export function mergeDesignTexts(
  existing: TextBoxDef[] | undefined,
  designId: string,
  side: string,
  texts: (DesignText | null)[]
): { boxes: TextBoxDef[]; keptUser: number } {
  const keep = (existing ?? []).filter(
    (b) => !isDesignItemId(b.id) && !b.id.startsWith(AUTO_CAPTION_PREFIX) && b.text.trim().length > 0
  );
  // null 자리는 비워 둬요(소개 페이지의 "만든이"처럼 입력이 없으면 아예 안 만드는 글상자) — 번호(n)는 그대로 유지돼요.
  const fresh: TextBoxDef[] = texts.flatMap((t, n) => (t ? [{ ...t, id: designItemId(designId, side, "t", n) }] : []));
  return { boxes: [...keep, ...fresh], keptUser: keep.length };
}

// 디자인 스티커 → 이미지박스(스티커). mapX는 "판 기준 % → 이미지박스 좌표 %"(내지는 펼침면 기준으로, 표지는 그대로).
// 스티커는 사진 위, 글 아래에 오도록 zOrder 500부터 매겨요(사진은 배열 순번 0~, 글은 1000~가 기본이에요).
export function makeDesignStickerBox(
  st: DesignSticker,
  id: string,
  n: number,
  mapX: (xPct: number, widthPct: number) => { xPct: number; widthPct: number }
): ImageBoxDef {
  const m = mapX(st.xPct, st.widthPct);
  return {
    id,
    url: st.url,
    naturalWidth: Math.round(800 * (st.aspect ?? 1)),
    naturalHeight: 800,
    xPct: m.xPct,
    yPct: st.yPct,
    widthPct: m.widthPct,
    heightPct: st.heightPct,
    innerOffsetXPct: 0,
    innerOffsetYPct: 0,
    innerScale: 1,
    kind: "sticker",
    zOrder: 500 + n,
    ...(st.rotation ? { rotation: st.rotation } : {}),
  };
}

export function sideOfDesignItem(id: string): string | null {
  if (!isDesignItemId(id)) return null;
  return id.split("~")[1] ?? null;
}
