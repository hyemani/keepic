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
    note: "세로로 붙인 사진 3장 + 계절 메모 + 큰 날짜",
    left: (g) => {
      const t = toolkit(g);
      const note = (y: number, season: string, memo: string, color: string) => [
        t.text({ t: season, f: [0.52, y, 0.48, 0.1], font: FONT.pen, pt: 46, color, lh: 1.0 }),
        t.text({ t: memo, f: [0.52, y + 0.1, 0.48, 0.07], font: FONT.hand, pt: 18, color: C.pencil }),
      ];
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0, 0.02, 0.44, 0.29], tilt(-3)), t.slot([0, 0.35, 0.44, 0.29], tilt(2)), t.slot([0, 0.68, 0.44, 0.29], tilt(-2))],
        texts: [...note(0.08, "봄", "벚꽃 길을 걸었던 날", C.red), ...note(0.41, "여름", "바다 앞에서 한 컷", C.blue), ...note(0.74, "가을", "오늘, 같은 자리에서", C.brown)],
        stickers: [t.sticker(STK.tapePink, 0.1, 0.03, 26, -10), t.sticker(STK.tapeBlue, 0.34, 0.36, 26, 8), t.sticker(STK.tapeStar, 0.1, 0.69, 26, -8)],
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
    // 5) 핀업 스크랩: 왼쪽은 크기가 다른 인화 사진 2장을 크게 기울여 테이프로 붙이고 줄 쳐진 메모지에 손글씨,
    //    오른쪽은 빨랫줄(가는 줄)에 인화 사진 3장을 서로 다른 기울기로 마스킹테이프 집게처럼 걸어 놓은 모양. 폴라로이드 틀은 쓰지 않아요(마무리 장과 구분).
    id: "hw-collage",
    name: "핀업 스크랩",
    note: "걸어 붙인 인화 사진 5장 + 메모지 손글씨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.02, 0.05, 0.62, 0.5], tilt(-4)), t.slot([0.44, 0.5, 0.5, 0.38], tilt(5))],
        texts: [
          t.text({ t: "오늘의\n기록", f: [0.07, 0.715, 0.24, 0.17], font: FONT.pen, pt: 30, color: C.brown, align: "center", lh: 1.05 }),
          t.text({ t: "2026.10.04", f: [0.05, 0.93, 0.3, 0.06], font: FONT.dokdo, pt: 24, color: C.red }),
        ],
        stickers: [
          t.sticker(STK.noteLined, 0.19, 0.76, 72, 0),
          t.sticker(STK.tapePink, 0.32, 0.055, 28, -8),
          t.sticker(STK.tapeBlue, 0.82, 0.52, 26, 10),
          t.sticker(STK.heart, 0.62, 0.93, 20, -10),
        ],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [t.slot([0.05, 0.12, 0.4, 0.34], tilt(-4)), t.slot([0.54, 0.15, 0.4, 0.32], tilt(3)), t.slot([0.06, 0.61, 0.5, 0.33], tilt(-2))],
        texts: [
          t.rule([0, 0.128, 1, 0.0035], C.brown, undefined, 450),
          t.rule([0, 0.617, 1, 0.0035], C.brown, undefined, 450),
          t.text({ t: "웃음이 많았던 하루", f: [0.6, 0.67, 0.4, 0.14], font: FONT.hand, pt: 19, color: C.brown, lh: 1.5 }),
          t.text({ t: "2026.10.04", f: [0.6, 0.82, 0.4, 0.08], font: FONT.dokdo, pt: 26, color: C.red }),
        ],
        stickers: [
          t.sticker(STK.tapeStar, 0.25, 0.115, 26, -6),
          t.sticker(STK.tapeLilac, 0.74, 0.145, 26, 6),
          t.sticker(STK.tapeKraft, 0.31, 0.605, 26, 4),
          t.sticker(STK.daisy, 0.88, 0.56, 30, -6),
          t.sticker(STK.sparkle, 0.9, 0.9, 22, 0),
        ],
      };
    },
  },
  {
    // 6) 스크랩북: 폴라로이드 4장(왼쪽 2·오른쪽 2)을 서로 다른 기울기로 마스킹테이프에 붙이고, 손글씨 한 줄·날짜·스티커를 곁들인 모양.
    //    작별 인사('끝'·고마워)는 맨 마지막 소개 페이지가 말해요. 폴라로이드 틀은 사진 칸 위에 얹히는 스티커라 서로 크게 겹치지 않게 놓았어요.
    id: "hw-closing",
    name: "폴라로이드 마무리",
    note: "폴라로이드 사진 4장 + 손글씨·날짜",
    left: (g) => {
      const t = toolkit(g);
      const a = t.framed("polaroid", 0.27, 0.34, 0.48, -4);
      const b = t.framed("polaroid", 0.74, 0.7, 0.42, 5);
      return {
        bg: KRAFT_PAPER,
        slots: [a.slot, b.slot],
        texts: [
          t.text({ t: "오늘의 기록", f: [0, 0.74, 0.48, 0.12], font: FONT.pen, pt: 44, color: C.brown, lh: 1.0 }),
          t.text({ t: "손으로 꾹 눌러 담았어", f: [0, 0.87, 0.5, 0.06], font: FONT.hand, pt: 17, color: C.red }),
        ],
        stickers: [
          a.sticker,
          b.sticker,
          t.sticker(STK.tapePink, 0.27, 0.055, 28, -8),
          t.sticker(STK.tapeBlue, 0.74, 0.455, 26, 6),
          t.sticker(STK.tulip, 0.8, 0.17, 36, 8),
          t.sticker(STK.heart, 0.62, 0.3, 20, -10),
        ],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const c = t.framed("polaroid", 0.72, 0.33, 0.46, 4);
      const d = t.framed("polaroid", 0.28, 0.7, 0.42, -5);
      return {
        bg: CREAM_PAPER,
        slots: [c.slot, d.slot],
        texts: [
          t.text({ t: "2026.10.04", f: [0.54, 0.7, 0.46, 0.08], font: FONT.dokdo, pt: 32, color: C.red }),
          t.text({ t: "웃음이 많았던 하루", f: [0.54, 0.79, 0.46, 0.06], font: FONT.hand, pt: 19, color: C.pencil }),
        ],
        stickers: [
          c.sticker,
          d.sticker,
          t.sticker(STK.tapeStar, 0.72, 0.055, 30, 6),
          t.sticker(STK.tapeLilac, 0.28, 0.455, 28, -8),
          t.sticker(STK.rose, 0.88, 0.92, 32, 8),
        ],
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
