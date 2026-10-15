// 테마 "가족" 새 디자인 — 포근한 기억 4종(우리 가족 이야기·가족사진·소풍·편지) + 키즈 2종(가족 소개·소풍) + 표지 2종.
// 서체·스티커·배경은 기존 스타일 파일과 같은 것만 써요(새 에셋 없음). 모든 자리는 접히는 선 20mm 안쪽을 지켜요(designKit의 FOLD_SAFE_MM).
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { solid, toolkit as kitToolkit, type CoverDesignDef, type DesignGeo, type InnerDesignDef } from "../designKit";

const toolkit = (g: DesignGeo) => kitToolkit(g, "#4A4036");

const WM = {
  serif: "'Gowun Batang', serif",
  hand: "'Gaegu', cursive",
  sans: "'Gowun Dodum', sans-serif",
} as const;
const KD = { jua: "'Jua', sans-serif", hand: "'Gaegu', cursive", soft: "'Gowun Dodum', sans-serif" } as const;

const C = {
  ivory: "#FBF7EE",
  paper: "#F4EEDF",
  sage: "#B9C9AE",
  sageLight: "#E3EADB",
  sageDeep: "#6B8466",
  butterLight: "#FBF0CD",
  ink: "#4A4036",
  mute: "#8B7F70",
  // 키즈
  sky: "#DCEFFB",
  skyDeep: "#4E9ED8",
  butter: "#FFF3C4",
  blush: "#FFE3E8",
  pink: "#EE7E97",
  mint: "#D6F2E6",
  mintDeep: "#3FAE8A",
  kInk: "#4A5568",
} as const;

const A = (n: number) => `/stickers/animal/animal-sticker-${String(n).padStart(2, "0")}.png`;
const STK = {
  sunflower: "/stickers/plant/flower-sticker-05.png",
  daisy: "/stickers/plant/flower-sticker-06.png",
  rose: "/stickers/plant/flower-sticker-04.png",
  tapeKraft: "/stickers/tape/tape-sticker-03.png",
  tapeStar: "/stickers/tape/tape-sticker-05.png",
  heart: "/stickers/icon/icon-heart-02.svg",
  heartYellow: "/stickers/icon/icon-heart-07.svg",
  bunny: A(2),
  bear: A(9),
  chick: A(13),
  penguin: A(11),
  pig: A(10),
  lamb: A(17),
  balloons: "/stickers/party/party-02.png",
  bunting: "/stickers/party/party-05.png",
  sparkle: "/stickers/sparkle.svg",
  star: "/stickers/star.svg",
} as const;

const SOFT = { borderRadiusPct: 1.2 } as const;
const ARCH = { frameShape: "arch" as const };
const ROUND = { borderRadiusPct: 50 } as const;
const withRing = (color: string): Partial<ImageBoxDef> => ({ ...ROUND, borderWidthPx: 5, borderColor: color });
const CIRCLE: Partial<ImageBoxDef> = { borderRadiusPct: 50, borderWidthPx: 7, borderColor: "#FFFFFF" };
const CARD: Partial<ImageBoxDef> = { borderRadiusPct: 10, borderWidthPx: 7, borderColor: "#FFFFFF" };
const CLOUD: Partial<ImageBoxDef> = { frameShape: "cloud" };
const CLOUDS_SKY: BackgroundSpec = { kind: "graphic", presetId: "g4-clouds-sky" };
const GING_BUTTER: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-butter" };
const GING_SKY: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-sky" };
const CHECK_SAGE: BackgroundSpec = { kind: "pattern", presetId: "p2-check-sage" };
const TRAY: Partial<ImageBoxDef> = { borderRadiusPct: 1.2, borderWidthPx: 9, borderColor: "#FFFFFF" };

const META = { style: "warm-memory", themes: ["family" as const] };
const KMETA = { style: "kids", themes: ["family" as const] };

export const FAMILY_INNER: InnerDesignDef[] = [
  {
    ...META,
    id: "wm-family-story",
    name: "우리 가족 이야기",
    note: "큰 사진 1장 + 제목 + 동그란 사진 1장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0, 1, 0.72], SOFT)],
        texts: [
          t.text({ t: "FAMILY ALBUM", f: [0, 0.775, 0.6, 0.05], font: WM.sans, pt: 10, color: C.mute, ls: 0.3 }),
          t.text({ t: "엄마 · 아빠 · 나 · 동생", f: [0, 0.84, 1, 0.085], font: WM.hand, pt: 24, color: C.sageDeep }),
        ],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.02, 32, -2)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.sageLight),
        slots: [t.slot([0.58, 0.58, 0.42, 0.4], withRing(C.ivory))],
        texts: [
          t.text({ t: "우리 가족\n이야기", f: [0, 0.07, 1, 0.21], font: WM.serif, pt: 42, lh: 1.2 }),
          t.rule([0, 0.31, 0.3, 0.0012], C.sageDeep),
          t.text({ t: "같은 식탁, 같은 웃음.\n평범한 하루가 우리에게는\n가장 큰 선물이에요.", f: [0, 0.35, 0.95, 0.17], font: WM.sans, pt: 12.5, lh: 1.9 }),
          t.text({ t: "함께한 지\n3,000일", f: [0, 0.78, 0.5, 0.15], font: WM.hand, pt: 24, color: C.sageDeep, lh: 1.3, va: "bottom" }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.2, 0.66, 30, -6)],
      };
    },
  },
  {
    ...META,
    id: "wm-family-portrait",
    name: "가족사진",
    note: "가운데 큰 사진 1장 + 이름표 붙은 동그란 사진 2장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.butterLight),
        slots: [t.slot([0.16, 0.04, 0.68, 0.7], { ...SOFT, borderWidthPx: 9, borderColor: "#FFFFFF", rotation: -2 })],
        texts: [
          t.text({ t: "가족사진", f: [0, 0.81, 1, 0.1], font: WM.hand, pt: 30, color: C.sageDeep, align: "center" }),
          t.text({ t: "FAMILY PORTRAIT", f: [0, 0.92, 1, 0.05], font: WM.sans, pt: 10.5, color: C.mute, ls: 0.3, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.03, 36, 2), t.sticker(STK.daisy, 0.84, 0.76, 28, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const tag = (x: number, y: number, label: string) =>
        t.text({ t: label, f: [x, y, 0.3, 0.055], font: WM.sans, pt: 10, color: C.ivory, ls: 0.22, align: "center", va: "middle", bg: C.sageDeep, radius: 50 });
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.04, 0.4, 0.4], withRing(C.sageLight)), t.slot([0.6, 0.5, 0.4, 0.4], withRing(C.sageLight))],
        texts: [
          tag(0.05, 0.47, "SPRING"),
          tag(0.65, 0.93, "AUTUMN"),
          t.text({ t: "함께 서 있는 것만으로\n충분한 날", f: [0.46, 0.08, 0.54, 0.2], font: WM.serif, pt: 15, lh: 1.7 }),
          t.rule([0.46, 0.31, 0.16, 0.0012], C.sageDeep),
          t.text({ t: "한 해의\n얼굴들", f: [0, 0.62, 0.5, 0.2], font: WM.hand, pt: 26, color: C.sageDeep, lh: 1.3 }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.46, 0.5, 26, -8)],
      };
    },
  },
  {
    ...META,
    id: "wm-family-picnic",
    name: "소풍 돗자리",
    note: "와이드 사진 1장 + 도시락 칸 사진 3장 + 도시락 메뉴",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CHECK_SAGE,
        slots: [t.slot([0, 0.3, 1, 0.55], TRAY)],
        texts: [
          t.text({ t: "오늘은 소풍 가는 날", f: [0.05, 0.04, 0.9, 0.14], font: WM.hand, pt: 31, color: C.sageDeep, align: "center", va: "middle", bg: C.ivory, radius: 14 }),
          t.text({ t: "돗자리, 도시락, 그리고 웃음소리", f: [0.05, 0.9, 0.9, 0.07], font: WM.sans, pt: 12.5, color: C.ink, align: "center", va: "middle", bg: C.ivory, radius: 50 }),
        ],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.3, 34, 3), t.sticker(STK.daisy, 0.92, 0.84, 30, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const w = 0.46;
      const h = 0.28;
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.04, w, h], SOFT), t.slot([0, 0.36, w, h], SOFT), t.slot([0, 0.68, w, h], SOFT)],
        texts: [
          t.text({ t: "오늘의 도시락", f: [0.54, 0.04, 0.46, 0.09], font: WM.hand, pt: 24, color: C.sageDeep }),
          t.rule([0.54, 0.14, 0.46, 0.0012], C.sageDeep),
          t.text({ t: "· 김밥\n· 샌드위치\n· 과일 한 통\n· 레모네이드", f: [0.54, 0.18, 0.46, 0.3], font: WM.sans, pt: 13, color: C.ink, lh: 1.95 }),
          t.text({ t: "바람이 좋은 날", f: [0.54, 0.7, 0.46, 0.08], font: WM.hand, pt: 20, color: C.sageDeep }),
          t.text({ t: "PICNIC DAY\n2026.10.04", f: [0.54, 0.88, 0.46, 0.09], font: WM.sans, pt: 10, color: C.mute, ls: 0.2, lh: 1.7 }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.8, 0.56, 30, -8), t.sticker(STK.tapeStar, 0.23, 0.04, 28, -6)],
      };
    },
  },
  {
    ...META,
    id: "wm-family-letter",
    name: "가족에게 쓰는 편지",
    note: "사진 2장 + 손으로 쓴 편지글",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0, 0.52, 0.72, 0.44], SOFT), t.slot([0.52, 0.04, 0.48, 0.38], SOFT)],
        texts: [t.text({ t: "우리 집\n식탁 풍경", f: [0, 0.06, 0.5, 0.2], font: WM.hand, pt: 22, color: C.sageDeep, lh: 1.35 })],
        stickers: [t.sticker(STK.tapeStar, 0.3, 0.52, 30, -4), t.sticker(STK.sunflower, 0.86, 0.9, 26, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [],
        texts: [
          t.text({ t: "To. 우리 가족에게", f: [0, 0.06, 1, 0.1], font: WM.hand, pt: 28, color: C.sageDeep }),
          t.text({
            t: "바쁜 날에도 저녁이면 모여 앉아\n오늘 있었던 일을 나눠 주는 시간이 좋아요.\n\n서툰 말투도, 시끌벅적한 웃음도\n전부 제가 제일 좋아하는 소리예요.\n\n앞으로도 오래오래 같이 살아요.",
            f: [0, 0.2, 0.96, 0.52],
            font: WM.sans,
            pt: 12.5,
            lh: 1.9,
          }),
          t.text({ t: "From. 첫째 올림", f: [0, 0.82, 0.96, 0.08], font: WM.hand, pt: 22, color: C.sageDeep, align: "right" }),
        ],
        stickers: [t.sticker(STK.heart, 0.12, 0.92, 20, -10)],
      };
    },
  },
  {
    ...KMETA,
    id: "kd-family-members",
    name: "우리 가족을 소개해요",
    note: "이름표 붙은 가족 카드 4장(엄마·아빠·나·동생) + 단체 사진 1장",
    left: (g) => {
      const t = toolkit(g);
      const pill = (x: number, y: number, label: string, bg: string) =>
        t.text({ t: label, f: [x, y, 0.22, 0.075], font: KD.jua, pt: 17, color: "#FFFFFF", align: "center", va: "middle", bg, radius: 50 });
      return {
        bg: GING_BUTTER,
        // 사진 칸 순서: 단체 사진이 맨 앞이라 사진이 1장만 있어도 단체 사진부터 채워져요.
        slots: [t.slot([0, 0.6, 1, 0.34], { ...CARD, borderRadiusPct: 5 }), t.slot([0.05, 0.14, 0.38, 0.3], CARD), t.slot([0.57, 0.14, 0.38, 0.3], CARD)],
        texts: [
          t.text({ t: "우리 가족 소개", f: [0, 0.01, 1, 0.1], font: KD.jua, pt: 32, color: C.skyDeep, align: "center" }),
          pill(0.13, 0.41, "엄마", C.pink),
          pill(0.65, 0.41, "아빠", C.skyDeep),
        ],
        stickers: [t.sticker(STK.chick, 0.5, 0.3, 30, 6), t.sticker(STK.tapeStar, 0.5, 0.6, 30, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const pill = (x: number, y: number, label: string, bg: string) =>
        t.text({ t: label, f: [x, y, 0.3, 0.075], font: KD.jua, pt: 19, color: "#FFFFFF", align: "center", va: "middle", bg, radius: 50 });
      return {
        bg: solid(C.sky),
        slots: [t.slot([0.02, 0.5, 0.45, 0.4], CARD), t.slot([0.53, 0.5, 0.45, 0.4], CARD)],
        texts: [
          t.text({ t: "우리는\n네 식구예요", f: [0, 0.1, 1, 0.22], font: KD.jua, pt: 34, color: C.skyDeep, align: "center", lh: 1.25 }),
          t.text({ t: "오늘도 북적북적 즐거워요", f: [0, 0.35, 1, 0.07], font: KD.hand, pt: 21, color: C.kInk, align: "center" }),
          pill(0.09, 0.87, "나", C.mintDeep),
          pill(0.6, 0.87, "동생", C.pink),
        ],
        stickers: [t.sticker(STK.bear, 0.1, 0.06, 32, -10), t.sticker(STK.bunny, 0.9, 0.06, 32, 10)],
      };
    },
  },
  {
    ...KMETA,
    id: "kd-family-picnic",
    name: "신나는 소풍",
    note: "와이드 사진 1장 + 풍선 동그라미 사진 3장 + 소풍 제목",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_SKY,
        slots: [t.slot([0, 0.52, 1, 0.44], CARD)],
        texts: [
          t.text({ t: "신나는 소풍 날", f: [0, 0.27, 1, 0.11], font: KD.jua, pt: 40, color: C.skyDeep, align: "center" }),
          t.text({ t: "김밥 · 과일 · 술래잡기", f: [0, 0.4, 1, 0.07], font: KD.hand, pt: 24, color: C.kInk, align: "center" }),
        ],
        stickers: [t.sticker(STK.bunting, 0.5, 0.0, 100, 0), t.sticker(STK.pig, 0.1, 0.52, 34, -8), t.sticker(STK.lamb, 0.9, 0.52, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const d = 0.3;
      return {
        bg: solid("#FFFCF3"),
        slots: [t.slot([0.68, 0.03, d, d], CIRCLE), t.slot([0.68, 0.36, d, d], CIRCLE), t.slot([0.68, 0.69, d, d], CIRCLE)],
        texts: [
          t.text({ t: "오늘의\n하이라이트", f: [0, 0.06, 0.64, 0.2], font: KD.jua, pt: 28, color: C.pink, lh: 1.25 }),
          t.text({ t: "가장 크게 웃은 순간을\n여기에 붙여요", f: [0, 0.3, 0.64, 0.12], font: KD.soft, pt: 13, color: C.kInk, lh: 1.6 }),
        ],
        stickers: [t.sticker(STK.balloons, 0.3, 0.62, 54, -4), t.sticker(STK.chick, 0.3, 0.9, 44, 8), t.sticker(STK.sparkle, 0.62, 0.22, 22, 0)],
      };
    },
  },
];

export const FAMILY_COVERS: CoverDesignDef[] = [
  {
    ...META,
    id: "wm-family-cover",
    name: "우리 가족 이야기",
    note: "아치 사진 + 우리 가족 이야기 + 세이지 책등·뒤표지 글귀",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.14, 0.04, 0.72, 0.58], ARCH)],
        texts: [
          t.text({ t: "FAMILY ALBUM", f: [0, 0.84, 1, 0.045], font: WM.sans, pt: 10.5, color: C.mute, ls: 0.34, align: "center" }),
          t.text({ t: "2026.10.04", f: [0, 0.915, 1, 0.055], font: WM.hand, pt: 20, color: C.sageDeep, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.04, 40, -3), t.sticker(STK.sunflower, 0.13, 0.62, 30, -10), t.sticker(STK.daisy, 0.88, 0.6, 28, 10)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.ivory),
        slots: [t.slot([0.3, 0.08, 0.4, 0.4], ROUND)],
        texts: [
          t.text({ t: "함께라서\n따뜻한 날들", f: [0, 0.55, 1, 0.2], font: WM.hand, pt: 30, color: C.ink, align: "center", lh: 1.5 }),
          t.text({ t: "우리 가족 이야기 · 2026", f: [0, 0.8, 1, 0.05], font: WM.sans, pt: 11, color: C.mute, ls: 0.2, align: "center" }),
        ],
        stickers: [t.sticker(STK.sunflower, 0.12, 0.9, 26, 8)],
      };
    },
    spine: { bg: solid(C.sage), titleFontFamily: WM.serif, titleColor: C.ink },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.93, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 42 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.68, 1, 0.14]);
      return { text: "우리 가족 이야기", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: WM.serif, pt: 44 * g.k, color: C.ink, lineHeight: 1.2, letterSpacing: 0.02 };
    },
  },
  {
    ...KMETA,
    id: "kd-family-cover",
    name: "우리 가족 앨범",
    note: "구름 사진 + 동물 가족 + 하늘색 책등·노랑 체크 뒤표지",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_SKY,
        slots: [t.slot([0.08, 0.18, 0.84, 0.42], CLOUD)],
        texts: [t.text({ t: "엄마 · 아빠 · 나 · 동생", f: [0.12, 0.83, 0.76, 0.075], font: KD.jua, pt: 16, color: C.kInk, align: "center", va: "middle", bg: C.butter, radius: 50 })],
        stickers: [t.sticker(STK.bunting, 0.5, 0.0, 72, 0), t.sticker(STK.bear, 0.14, 0.56, 40, -8), t.sticker(STK.bunny, 0.86, 0.56, 38, 8), t.sticker(STK.balloons, 0.9, 0.14, 40, 8)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_BUTTER,
        slots: [t.slot([0.3, 0.08, 0.4, 0.4], CIRCLE)],
        texts: [
          t.text({ t: "오늘도 함께라서 행복해!", f: [0, 0.54, 1, 0.1], font: KD.jua, pt: 28, color: C.pink, align: "center" }),
          t.text({ t: "우리 가족의 웃음 기록", f: [0, 0.66, 1, 0.06], font: KD.soft, pt: 16, color: C.kInk, align: "center" }),
        ],
        stickers: [t.sticker(STK.chick, 0.17, 0.82, 38, -6), t.sticker(STK.penguin, 0.83, 0.82, 38, 6)],
      };
    },
    spine: { bg: solid("#BFE0F5"), titleFontFamily: KD.jua, titleColor: "#2B638D" }, // 46차: 대비 4.08 → 4.64
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.95, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 40 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.68, 1, 0.11]);
      return { text: "우리 가족 앨범", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: KD.jua, pt: 42 * g.k, color: C.skyDeep, lineHeight: 1.15, letterSpacing: 0.01 };
    },
  },
];
