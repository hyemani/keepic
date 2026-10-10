// 스타일 3 — 감성 필기체: 크림·크라프트 종이 바탕 + 갈색 연필/빨간 펜 느낌 손글씨, 마스킹테이프·폴라로이드 틀, 살짝 기울인 사진(다이어리·스크랩북 느낌).
//   큰 제목 = 나눔펜(Nanum Pen Script) / 일기 본문·캡션 = 개구(Gaegu) / 날짜 포인트 = 동해독도(East Sea Dokdo).
//   세 서체 모두 app/layout.tsx에서 이미 불러오는 서체(OFL)라 새로 추가한 서체는 없어요.
//   사진 기울기는 사진 박스의 rotation(화면·인쇄 둘 다 반영)을 써요. 같은 디자인을 다시 적용하면 기울기도 디자인 값으로 다시 맞춰져요.
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { solid, toolkit, type CoverDesignDef, type InnerDesignDef } from "../designKit";

const FONT = {
  pen: "'Nanum Pen Script', cursive",
  hand: "'Gaegu', cursive",
  dokdo: "'East Sea Dokdo', cursive",
} as const;
export const HANDWRITING_FONTS: string[] = [FONT.pen, FONT.hand, FONT.dokdo];

const C = {
  cream: "#F8F0DF",
  kraft: "#E4D0AC",
  kraftDeep: "#CDB48A",
  brown: "#5B4632",
  pencil: "#85735F",
  red: "#C65A45",
  blue: "#4C6C8C",
} as const;

const CREAM_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-cream" };
const KRAFT_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-kraft" };

const STK = {
  tapeKraft: "/stickers/tape/tape-sticker-03.png",
  tapeStar: "/stickers/tape/tape-sticker-05.png",
  tapePink: "/stickers/tape/tape-sticker-01.png",
  tapeBlue: "/stickers/tape/tape-sticker-02.png",
  tapeLilac: "/stickers/tape/tape-sticker-04.png",
  noteLined: "/stickers/tape/tape-sticker-17.png",
  heart: "/stickers/icon/icon-heart-02.svg",
  tulip: "/stickers/plant/flower-sticker-01.png",
  rose: "/stickers/plant/flower-sticker-04.png",
  daisy: "/stickers/plant/flower-sticker-06.png",
  sparkle: "/stickers/sparkle.svg",
} as const;

// 사진 테두리(흰 인화지 느낌)
const PRINT: Partial<ImageBoxDef> = { borderWidthPx: 11, borderColor: "#FFFFFF" };
const tilt = (deg: number): Partial<ImageBoxDef> => ({ ...PRINT, rotation: deg });

export const HANDWRITING_INNER: InnerDesignDef[] = [
  {
    // 1) 오프닝: 왼쪽 폴라로이드 + 오른쪽 손글씨 제목 페이지
    id: "hw-opening",
    name: "오프닝",
    note: "폴라로이드 사진 1장 + 손글씨 제목",
    left: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.47, 0.74, 0);
      return {
        bg: CREAM_PAPER,
        slots: [fr.slot],
        texts: [
          t.text({ t: "그날, 우리", f: [0.15, 0.7, 0.7, 0.1], font: FONT.pen, pt: 44, color: C.brown, align: "center", lh: 1.05 }),
          t.text({ t: "2026.10.04", f: [0.15, 0.81, 0.7, 0.06], font: FONT.hand, pt: 17, color: C.pencil, align: "center", ls: 0.1 }),
        ],
        stickers: [fr.sticker, t.sticker(STK.tapeKraft, 0.5, 0.02, 38, -2), t.sticker(STK.daisy, 0.92, 0.94, 30, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [],
        texts: [
          t.text({ t: "우리의\n소중한 하루", f: [0.04, 0.24, 0.92, 0.34], font: FONT.pen, pt: 74, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "Vol.1 — 2026 가을", f: [0, 0.62, 1, 0.06], font: FONT.hand, pt: 22, color: C.red, align: "center" }),
          t.text({ t: "2026.10.04", f: [0, 0.9, 1, 0.07], font: FONT.dokdo, pt: 30, color: C.pencil, align: "center", va: "bottom" }),
        ],
        stickers: [
          t.sticker(STK.tapeStar, 0.5, 0.05, 42, 3),
          t.sticker(STK.heart, 0.15, 0.8, 22, -12),
          t.sticker(STK.tulip, 0.86, 0.8, 34, 10),
          t.sticker(STK.sparkle, 0.84, 0.16, 18, 0),
        ],
      };
    },
  },
  {
    // 2) 큰 사진 + 일기
    id: "hw-photo-caption",
    name: "큰 사진 + 일기",
    note: "사진 1장 + 손글씨 일기",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.04, 0.05, 0.92, 0.88], tilt(2))],
        texts: [],
        stickers: [t.sticker(STK.tapePink, 0.1, 0.06, 36, -38), t.sticker(STK.tapeBlue, 0.9, 0.94, 36, -38)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [],
        texts: [
          t.text({ t: "10월 4일 토요일  ·  맑음", f: [0.02, 0.04, 0.96, 0.06], font: FONT.hand, pt: 21, color: C.pencil }),
          t.text({ t: "햇살 좋은 날", f: [0.02, 0.12, 0.96, 0.13], font: FONT.pen, pt: 62, color: C.brown, lh: 1.0 }),
          t.text({
            t: "오늘은 아무것도 안 했는데\n이상하게 마음이 꽉 찬 하루.\n따뜻한 햇살, 느린 걸음,\n그리고 너.",
            f: [0.02, 0.32, 0.9, 0.36],
            font: FONT.hand,
            pt: 21,
            color: C.brown,
            lh: 2.0,
          }),
          t.text({ t: "오늘의 한 줄 : 이런 날이 계속되면 좋겠다", f: [0.02, 0.78, 0.8, 0.06], font: FONT.hand, pt: 19, color: C.red }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.6, 0.27, 34, -3), t.sticker(STK.heart, 0.88, 0.62, 22, 10), t.sticker(STK.daisy, 0.14, 0.9, 28, -8)],
      };
    },
  },
  {
    // 3) 사진 2장 + 글귀
    id: "hw-two-quote",
    name: "두 장 + 글귀",
    note: "기울인 사진 2장 + 손글씨 글귀",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.05, 0.07, 0.88, 0.6], tilt(-3))],
        texts: [t.text({ t: "같이 있으면\n시간이 느리게 가", f: [0.02, 0.74, 0.96, 0.22], font: FONT.pen, pt: 48, color: C.brown, lh: 1.05 })],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.06, 36, -3)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.07, 0.15, 0.88, 0.6], tilt(3))],
        texts: [
          t.text({ t: "2026.10.04", f: [0.02, 0.03, 0.5, 0.07], font: FONT.dokdo, pt: 32, color: C.red }),
          t.text({ t: "너랑 있으면 다 좋아", f: [0.02, 0.82, 0.8, 0.07], font: FONT.hand, pt: 24, color: C.pencil }),
        ],
        stickers: [t.sticker(STK.tapeLilac, 0.52, 0.14, 36, 4), t.sticker(STK.heart, 0.88, 0.9, 24, 12)],
      };
    },
  },
  {
    // 4) 사진 3장 + 큰 날짜
    id: "hw-strip-date",
    name: "세 장 스크랩 + 날짜",
    note: "겹쳐 붙인 사진 3장 + 큰 날짜",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.04, 0.05, 0.5, 0.38], tilt(-3)), t.slot([0.47, 0.2, 0.49, 0.36], tilt(3)), t.slot([0.08, 0.57, 0.5, 0.36], tilt(-2))],
        texts: [t.text({ t: "봄에서\n가을까지", f: [0.62, 0.68, 0.36, 0.22], font: FONT.pen, pt: 44, color: C.brown, lh: 1.05 })],
        stickers: [t.sticker(STK.tapeStar, 0.27, 0.06, 28, -10), t.sticker(STK.tapeBlue, 0.72, 0.21, 28, 8), t.sticker(STK.tapePink, 0.33, 0.58, 28, -6)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [],
        texts: [
          t.text({ t: "2026", f: [0, 0.2, 1, 0.08], font: FONT.hand, pt: 32, color: C.pencil, align: "center", ls: 0.15 }),
          t.text({ t: "10.04", f: [0, 0.27, 1, 0.26], font: FONT.dokdo, pt: 128, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "SAT", f: [0, 0.55, 1, 0.06], font: FONT.hand, pt: 26, color: C.red, align: "center", ls: 0.4 }),
          t.text({ t: "세 번의 계절을 지나\n우리는 같은 자리에 다시 섰다.", f: [0.06, 0.66, 0.88, 0.14], font: FONT.hand, pt: 21, color: C.brown, align: "center", lh: 1.85 }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.07, 42, 2), t.sticker(STK.rose, 0.86, 0.88, 32, 8), t.sticker(STK.heart, 0.14, 0.88, 22, -10)],
      };
    },
  },
  {
    // 5) 콜라주(사진 5장) + 손글씨 라벨
    id: "hw-collage",
    name: "스크랩북 콜라주",
    note: "사진 5장 + 손글씨 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.04, 0.04, 0.56, 0.46], tilt(-2)), t.slot([0.58, 0.1, 0.38, 0.3], tilt(3)), t.slot([0.08, 0.56, 0.42, 0.34], tilt(2))],
        texts: [
          t.text({ t: "오늘의 기록", f: [0.52, 0.56, 0.48, 0.14], font: FONT.pen, pt: 56, color: C.brown, lh: 1.0 }),
          t.text({ t: "2026.10.04", f: [0.52, 0.7, 0.48, 0.06], font: FONT.dokdo, pt: 28, color: C.red }),
          t.text({ t: "웃음이 많았던 하루", f: [0.52, 0.78, 0.48, 0.06], font: FONT.hand, pt: 20, color: C.pencil }),
        ],
        stickers: [t.sticker(STK.tapePink, 0.2, 0.05, 30, -8), t.sticker(STK.tapeKraft, 0.78, 0.11, 28, 8), t.sticker(STK.tulip, 0.9, 0.9, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.04, 0.05, 0.48, 0.5], tilt(-3)), t.slot([0.5, 0.3, 0.46, 0.42], tilt(2))],
        texts: [t.text({ t: "사진마다\n이야기가 있어요", f: [0.04, 0.78, 0.7, 0.16], font: FONT.hand, pt: 24, color: C.brown, lh: 1.7 })],
        stickers: [t.sticker(STK.tapeBlue, 0.28, 0.06, 30, 6), t.sticker(STK.tapeLilac, 0.73, 0.31, 28, -8), t.sticker(STK.daisy, 0.88, 0.88, 32, -6)],
      };
    },
  },
  {
    // 6) 마무리: 큰 고마워 + 사진 1장
    id: "hw-closing",
    name: "마무리 · 고마워",
    note: "사진 1장 + 손글씨 감사 인사·끝",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [],
        texts: [
          t.text({ t: "고마워", f: [0, 0.2, 1, 0.3], font: FONT.pen, pt: 132, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "오늘도 안녕", f: [0, 0.52, 1, 0.07], font: FONT.hand, pt: 30, color: C.red, align: "center" }),
          t.text({ t: "함께한 모든 날이\n오래도록 따뜻하게 남기를", f: [0.1, 0.63, 0.8, 0.14], font: FONT.hand, pt: 21, color: C.brown, align: "center", lh: 1.85 }),
          t.text({ t: "끝", f: [0, 0.86, 1, 0.07], font: FONT.dokdo, pt: 34, color: C.pencil, align: "center", va: "bottom" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.04, 42, -2), t.sticker(STK.tulip, 0.16, 0.9, 38, -8), t.sticker(STK.rose, 0.84, 0.9, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.07, 0.07, 0.86, 0.72], tilt(2))],
        texts: [t.text({ t: "2026.10.04  —  마지막 장", f: [0.04, 0.87, 0.92, 0.07], font: FONT.hand, pt: 23, color: C.pencil, align: "center" })],
        stickers: [t.sticker(STK.tapeKraft, 0.5, 0.07, 38, 2), t.sticker(STK.heart, 0.9, 0.9, 22, 10)],
      };
    },
  },
];

export const HANDWRITING_COVER: CoverDesignDef = {
  id: "hw-cover",
  name: "감성 필기체",
  note: "폴라로이드 사진 + 손글씨 제목 + 크라프트 책등·뒤표지",
  front: (g) => {
    const t = toolkit(g);
    const fr = t.framed("polaroid", 0.5, 0.35, 0.54, -3);
    return {
      bg: CREAM_PAPER,
      slots: [fr.slot],
      texts: [t.text({ t: "2026.10.04  ·  오늘도 소중한 하루", f: [0, 0.9, 1, 0.06], font: FONT.hand, pt: 20, color: C.pencil, align: "center" })],
      stickers: [
        fr.sticker,
        t.sticker(STK.tapeStar, 0.5, 0.03, 40, -3),
        t.sticker(STK.heart, 0.8, 0.6, 22, 12),
        t.sticker(STK.daisy, 0.12, 0.66, 30, -10),
      ],
    };
  },
  back: (g) => {
    const t = toolkit(g);
    return {
      bg: KRAFT_PAPER,
      slots: [],
      texts: [
        t.text({ t: "오늘도 수고했어\n내일도 잘 부탁해", f: [0.1, 0.37, 0.8, 0.2], font: FONT.pen, pt: 38, color: C.brown, align: "center", lh: 1.15 }),
        t.text({ t: "— 2026 가을, 나에게", f: [0.1, 0.6, 0.8, 0.06], font: FONT.hand, pt: 19, color: C.pencil, align: "center" }),
      ],
      stickers: [t.sticker(STK.noteLined, 0.5, 0.45, 150, 0), t.sticker(STK.heart, 0.78, 0.74, 20, 10)],
    };
  },
  spine: { bg: solid(C.kraftDeep), titleFontFamily: FONT.pen, titleColor: C.brown },
  backLogo: (g) => {
    const t = toolkit(g);
    const r = t.r([0, 0.94, 1, 0]);
    return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 40 };
  },
  title: (g) => {
    const t = toolkit(g);
    const f = t.r([0, 0.73, 1, 0.14]);
    return {
      text: "나의 소소한 일기",
      xPct: f.xPct,
      yPct: f.yPct,
      widthPct: f.widthPct,
      fontFamily: FONT.pen,
      pt: 64 * g.k,
      color: C.brown,
      lineHeight: 1.05,
      letterSpacing: 0.01,
    };
  },
};
