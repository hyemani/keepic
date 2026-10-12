// 테마 "커플" 새 디자인 — 포근한 기억 3종(D+1000·반지·기념일) + 감성 필기체 3종(러브레터·첫 데이트·Forever Us) + 표지 2종(필기체·포근한 기억).
// 서체·스티커·배경은 기존 스타일 파일과 같은 것만 써요. 모든 자리는 접히는 선 20mm 안쪽을 지켜요.
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { solid, toolkit as kitToolkit, type CoverDesignDef, type DesignGeo, type InnerDesignDef } from "../designKit";

const WM = { serif: "'Gowun Batang', serif", hand: "'Gaegu', cursive", sans: "'Gowun Dodum', sans-serif" } as const;
const HW = { pen: "'Nanum Pen Script', cursive", hand: "'Gaegu', cursive", dokdo: "'East Sea Dokdo', cursive" } as const;

const C = {
  ivory: "#FBF7EE",
  blush: "#FBEDEA",
  blushDeep: "#F3D5D2",
  rose: "#C97B84",
  roseDeep: "#A85A65",
  ink: "#4A4036",
  mute: "#8B7F70",
  dusty: "#D9A5A5",
  cream: "#F8F0DF",
  kraftDeep: "#CDB48A",
  brown: "#5B4632",
  pencil: "#85735F",
  red: "#C65A45",
} as const;
const CREAM_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-cream" };
const KRAFT_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-kraft" };
const PRINT: Partial<ImageBoxDef> = { borderWidthPx: 11, borderColor: "#FFFFFF" };
const tilt = (deg: number): Partial<ImageBoxDef> => ({ ...PRINT, rotation: deg });
const SOFT = { borderRadiusPct: 1.2 } as const;
const ARCH = { frameShape: "arch" as const };
const ROUND = { borderRadiusPct: 50 } as const;
const withRing = (color: string): Partial<ImageBoxDef> => ({ ...ROUND, borderWidthPx: 5, borderColor: color });

const STK = {
  heart: "/stickers/icon/icon-heart-02.svg",
  heartRed: "/stickers/icon/icon-heart-01.svg",
  rings: "/stickers/wedding/wedding-01.png",
  tapeKraft: "/stickers/tape/tape-sticker-03.png",
  tapeStar: "/stickers/tape/tape-sticker-05.png",
  tapePink: "/stickers/tape/tape-sticker-01.png",
  rose: "/stickers/plant/flower-sticker-04.png",
  iLoveYou: "/stickers/love/hw-i-love-you.png",
  foreverUs: "/stickers/phrase/phrase-en-02.png",
  ourStory: "/stickers/phrase/phrase-en-04.png",
  sparkle: "/stickers/sparkle.svg",
} as const;
const RINGS_ASPECT = 900 / 750;
const FOREVER_ASPECT = 900 / 360;
const OURSTORY_ASPECT = 900 / 450;

const toolkit = (g: DesignGeo) => kitToolkit(g, C.ink);
const WMM = { style: "warm-memory", themes: ["couple" as const] };
const HWM = { style: "handwriting", themes: ["couple" as const] };

export const COUPLE_INNER: InnerDesignDef[] = [
  {
    ...WMM,
    id: "wm-couple-dday",
    name: "D+1000 · 우리가 함께한 날",
    note: "아치 사진 1장 + 큰 D+ 숫자 + 동그란 사진",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.blush),
        slots: [t.slot([0.14, 0.03, 0.72, 0.72], ARCH)],
        texts: [
          t.text({ t: "우리가 함께한 지", f: [0, 0.8, 1, 0.08], font: WM.hand, pt: 22, color: C.rose, align: "center" }),
          t.text({ t: "2023.07.14 — 2026.04.10", f: [0, 0.9, 1, 0.05], font: WM.sans, pt: 11, color: C.mute, ls: 0.14, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapePink, 0.5, 0.02, 34, -2)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.3, 0.6, 0.4, 0.4], withRing(C.blushDeep))],
        texts: [
          t.text({ t: "OUR LOVE STORY", f: [0, 0.02, 1, 0.04], font: WM.sans, pt: 10, color: C.rose, ls: 0.34, align: "center" }),
          t.text({ t: "D+1000", f: [0, 0.07, 1, 0.22], font: WM.serif, pt: 80, color: C.roseDeep, align: "center", lh: 1.3, va: "middle" }),
          t.rule([0.4, 0.3, 0.2, 0.0012], C.rose),
          t.text({ t: "처음 만난 그날부터 오늘까지\n매일이 선물이었어요", f: [0, 0.36, 1, 0.14], font: WM.serif, pt: 15, align: "center", lh: 1.8 }),
        ],
        stickers: [t.sticker(STK.heart, 0.18, 0.76, 24, -12), t.sticker(STK.heart, 0.84, 0.9, 18, 12)],
      };
    },
  },
  {
    ...WMM,
    id: "wm-couple-rings",
    name: "반지 · 약속",
    note: "사진 3장 + 반지 스티커 + 글귀",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.02, 1, 0.58], SOFT)],
        texts: [
          t.text({ t: "함께라서 행복해", f: [0.38, 0.7, 0.62, 0.1], font: WM.hand, pt: 28, color: C.rose }),
          t.text({ t: "2026.04.10", f: [0.38, 0.82, 0.62, 0.05], font: WM.sans, pt: 11, color: C.mute, ls: 0.14 }),
        ],
        stickers: [t.sticker(STK.rings, 0.2, 0.8, 50, -6, RINGS_ASPECT), t.sticker(STK.tapePink, 0.5, 0.02, 34, 2)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.blush),
        slots: [t.slot([0, 0.05, 0.48, 0.44], SOFT), t.slot([0.52, 0.05, 0.48, 0.44], SOFT)],
        texts: [
          t.text({ t: "서로의 손을 잡은 순간부터\n우리의 이야기는 시작되었다", f: [0, 0.57, 1, 0.16], font: WM.serif, pt: 16, align: "center", lh: 1.8 }),
          t.text({ t: "— 약속 —", f: [0, 0.78, 1, 0.07], font: WM.hand, pt: 21, color: C.rose, align: "center" }),
        ],
        stickers: [t.sticker(STK.heart, 0.5, 0.92, 22, 0), t.sticker(STK.rose, 0.9, 0.9, 28, 8)],
      };
    },
  },
  {
    ...WMM,
    id: "wm-couple-anniv",
    name: "기념일 타임라인",
    note: "동그란 사진 4장 + 기념일 목록 + 큰 사진",
    left: (g) => {
      const t = toolkit(g);
      const s = 0.19;
      const rows = [
        ["2023.07.14", "첫 만남", "D+0"],
        ["2023.10.22", "100일", "D+100"],
        ["2024.07.14", "1주년", "D+366"],
        ["2025.07.14", "2주년", "D+731"],
      ];
      const ys = [0.16, 0.37, 0.58, 0.79];
      return {
        bg: solid(C.ivory),
        slots: ys.map((y) => t.slot([0, y, s, s], withRing(C.blushDeep))),
        texts: [
          t.text({ t: "우리의 기념일", f: [0, 0.01, 1, 0.1], font: WM.serif, pt: 30, color: C.roseDeep }),
          ...rows.flatMap((r, i) => [
            t.text({ t: r[1], f: [0.25, ys[i] + 0.015, 0.45, 0.07], font: WM.serif, pt: 18 }),
            t.text({ t: r[0], f: [0.25, ys[i] + 0.1, 0.5, 0.05], font: WM.sans, pt: 10.5, color: C.mute, ls: 0.14 }),
            t.text({ t: r[2], f: [0.72, ys[i] + 0.04, 0.28, 0.07], font: WM.hand, pt: 20, color: C.rose, align: "right" }),
          ]),
        ],
        stickers: [t.sticker(STK.heart, 0.9, 0.06, 22, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.blush),
        slots: [t.slot([0, 0.03, 1, 0.66], SOFT)],
        texts: [
          t.text({ t: "함께할 날들은 이제부터", f: [0, 0.76, 1, 0.09], font: WM.serif, pt: 20, align: "center" }),
          t.text({ t: "D+1000  →  D+2000", f: [0, 0.87, 1, 0.07], font: WM.hand, pt: 22, color: C.rose, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.03, 36, 2), t.sticker(STK.heart, 0.9, 0.9, 20, 10)],
      };
    },
  },
  {
    ...HWM,
    id: "hw-couple-letter",
    name: "러브레터",
    note: "손글씨 편지 + 폴라로이드 1장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [],
        texts: [
          t.text({ t: "To. 사랑하는 너에게", f: [0, 0.04, 1, 0.1], font: HW.pen, pt: 42, color: C.brown, lh: 1.0 }),
          t.text({
            t: "처음 만난 날 떨리던 마음이\n아직도 그대로야.\n\n투덜대면서도 묵묵히 들어주는 너,\n내 하루를 제일 먼저 궁금해하는 너.\n\n오늘도 내 옆에 있는 너를 좋아해.",
            f: [0, 0.18, 1, 0.56],
            font: HW.hand,
            pt: 20,
            color: C.brown,
            lh: 1.8,
          }),
          t.text({ t: "From. 너의 사람", f: [0, 0.84, 1, 0.07], font: HW.hand, pt: 22, color: C.red, align: "right" }),
        ],
        stickers: [t.sticker(STK.heartRed, 0.92, 0.07, 20, 12), t.sticker(STK.tapePink, 0.12, 0.98, 30, -4)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.36, 0.62, 3);
      return {
        bg: KRAFT_PAPER,
        slots: [fr.slot],
        texts: [t.text({ t: "2026.04.10", f: [0.1, 0.76, 0.8, 0.07], font: HW.dokdo, pt: 30, color: C.pencil, align: "center" })],
        stickers: [fr.sticker, t.sticker(STK.tapeKraft, 0.5, 0.02, 36, -2), t.sticker(STK.iLoveYou, 0.5, 0.9, 44, -4), t.sticker(STK.heart, 0.9, 0.7, 20, 10)],
      };
    },
  },
  {
    ...HWM,
    id: "hw-couple-polaroids",
    name: "첫 데이트",
    note: "폴라로이드 3장 + 손글씨 기록",
    left: (g) => {
      const t = toolkit(g);
      const a = t.framed("polaroid", 0.3, 0.3, 0.46, -4);
      const b = t.framed("polaroid", 0.7, 0.66, 0.46, 3);
      return {
        bg: CREAM_PAPER,
        slots: [a.slot, b.slot],
        texts: [
          t.text({ t: "우리 첫 데이트", f: [0.5, 0.04, 0.5, 0.13], font: HW.pen, pt: 36, color: C.brown, lh: 1.05, align: "right" }),
          t.text({ t: "2023.07.14", f: [0, 0.82, 0.4, 0.06], font: HW.dokdo, pt: 26, color: C.pencil }),
        ],
        stickers: [a.sticker, b.sticker, t.sticker(STK.tapePink, 0.3, 0.03, 30, -4), t.sticker(STK.heartRed, 0.92, 0.34, 20, 12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.36, 0.6, 2);
      return {
        bg: KRAFT_PAPER,
        slots: [fr.slot],
        texts: [
          t.text({ t: "그날 우리는\n아무 말 없이도 웃고 있었다", f: [0.05, 0.74, 0.9, 0.16], font: HW.hand, pt: 21, color: C.brown, lh: 1.6, align: "center" }),
          t.text({ t: "영화 · 떡볶이 · 한강", f: [0.05, 0.9, 0.9, 0.06], font: HW.hand, pt: 17, color: C.red, align: "center" }),
        ],
        stickers: [fr.sticker, t.sticker(STK.tapeStar, 0.5, 0.02, 34, 2)],
      };
    },
  },
  {
    ...HWM,
    id: "hw-couple-closing",
    name: "Forever Us",
    note: "필기체 글귀 스티커 + 사진 1장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [],
        texts: [
          t.text({ t: "앞으로도 쭉, 우리", f: [0, 0.54, 1, 0.12], font: HW.pen, pt: 46, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "오늘의 우리를 오래 기억할게", f: [0, 0.68, 1, 0.07], font: HW.hand, pt: 21, color: C.pencil, align: "center" }),
        ],
        stickers: [t.sticker(STK.foreverUs, 0.5, 0.3, 150, 0, FOREVER_ASPECT), t.sticker(STK.heartRed, 0.14, 0.12, 22, -12), t.sticker(STK.heart, 0.86, 0.48, 20, 12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [t.slot([0.06, 0.07, 0.88, 0.72], tilt(2))],
        texts: [t.text({ t: "2026.04.10", f: [0.04, 0.87, 0.92, 0.07], font: HW.hand, pt: 21, color: C.pencil, align: "center" })],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.07, 36, 2), t.sticker(STK.heartRed, 0.9, 0.92, 20, 10)],
      };
    },
  },
];

export const COUPLE_COVERS: CoverDesignDef[] = [
  {
    ...HWM,
    id: "hw-couple-cover",
    name: "Our Love Story",
    note: "폴라로이드 사진 + 손글씨 제목 + 크라프트 책등·사랑해 뒤표지",
    front: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.35, 0.54, -3);
      return {
        bg: CREAM_PAPER,
        slots: [fr.slot],
        texts: [t.text({ t: "2023.07.14 —  우리의 사랑 이야기", f: [0, 0.9, 1, 0.06], font: HW.hand, pt: 20, color: C.pencil, align: "center" })],
        stickers: [fr.sticker, t.sticker(STK.tapePink, 0.5, 0.03, 40, -3), t.sticker(STK.heartRed, 0.8, 0.6, 24, 12), t.sticker(STK.heart, 0.16, 0.64, 20, -10)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [],
        texts: [
          t.text({ t: "사랑해,\n오늘도 내일도", f: [0.1, 0.37, 0.8, 0.2], font: HW.pen, pt: 42, color: C.brown, align: "center", lh: 1.15 }),
          t.text({ t: "— 2026, 우리", f: [0.1, 0.6, 0.8, 0.06], font: HW.hand, pt: 19, color: C.pencil, align: "center" }),
        ],
        stickers: [t.sticker(STK.ourStory, 0.5, 0.2, 90, 0, OURSTORY_ASPECT), t.sticker(STK.heartRed, 0.78, 0.76, 22, 10)],
      };
    },
    spine: { bg: solid(C.dusty), titleFontFamily: HW.pen, titleColor: C.brown },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.94, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 40 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.73, 1, 0.14]);
      return { text: "Our Love Story", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: HW.pen, pt: 66 * g.k, color: C.brown, lineHeight: 1.05, letterSpacing: 0.01 };
    },
  },
  {
    ...WMM,
    id: "wm-couple-cover",
    name: "OUR LOVE STORY",
    note: "아치 사진 + 반지 스티커 + 세리프 제목 + 블러시 책등·뒤표지",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.blush),
        slots: [t.slot([0.2, 0.04, 0.6, 0.5], ARCH)],
        texts: [
          t.text({ t: "D+1000  ·  2023.07.14", f: [0, 0.86, 1, 0.05], font: WM.sans, pt: 11, color: C.mute, ls: 0.3, align: "center" }),
          t.text({ t: "함께한 모든 날이 사랑이었다", f: [0, 0.925, 1, 0.055], font: WM.hand, pt: 19, color: C.rose, align: "center" }),
        ],
        stickers: [t.sticker(STK.rings, 0.5, 0.57, 38, 0, RINGS_ASPECT), t.sticker(STK.tapePink, 0.5, 0.03, 38, -3), t.sticker(STK.heart, 0.12, 0.2, 22, -10)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.3, 0.08, 0.4, 0.4], withRing(C.blushDeep))],
        texts: [
          t.text({ t: "우리, 오래오래\n함께해요", f: [0, 0.55, 1, 0.2], font: WM.hand, pt: 30, color: C.roseDeep, align: "center", lh: 1.5 }),
          t.text({ t: "OUR LOVE STORY · 2026", f: [0, 0.8, 1, 0.05], font: WM.sans, pt: 10.5, color: C.mute, ls: 0.26, align: "center" }),
        ],
        stickers: [t.sticker(STK.rose, 0.12, 0.9, 26, 8)],
      };
    },
    spine: { bg: solid(C.blushDeep), titleFontFamily: WM.serif, titleColor: C.roseDeep },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.93, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 42 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.7, 1, 0.12]);
      return { text: "OUR LOVE STORY", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: WM.serif, pt: 36 * g.k, color: C.roseDeep, lineHeight: 1.2, letterSpacing: 0.08 };
    },
  },
];
