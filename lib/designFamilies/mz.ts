// 스타일 5(요청 순서상 네 번째 신규) — MZ: 블랙 + 오프화이트 + 애시드 라임 한 가지 포인트, 화면을 꽉 채우는 굵은 제목,
//   필름 띠·포토부스 띠·폴라로이드 틀, 날짜 스탬프 라벨, 스티커 폭탄(번개·선글라스·티켓·스마일), 영문 캡션('FILM ROLL 01', 'DAILY LOG', 'NO.01').
//   큰 제목 = 블랙한산스(Black Han Sans) / 라벨·스탬프 = 도현(Do Hyeon) / 작은 캡션 = 프리텐다드 Bold(Pretendard).
//   세 서체 모두 app/layout.tsx·public/fonts에서 이미 쓰는 서체(OFL)라 새로 추가한 서체는 없어요.
import { DESIGN_BACK_Z, solid, toolkit, type CoverDesignDef, type InnerDesignDef } from "../designKit";

const FONT = {
  black: "'Black Han Sans', sans-serif",
  dh: "'Do Hyeon', sans-serif",
  sans: "Pretendard, sans-serif",
} as const;
export const MZ_FONTS: string[] = [FONT.black, FONT.dh, FONT.sans];

const C = {
  black: "#111111",
  off: "#F2F0EA",
  lime: "#CCFF00",
  white: "#FFFFFF",
  gray: "#8D8D86",
} as const;

const STK = {
  bolt: "/stickers/season/party-sticker-08.svg",
  shades: "/stickers/season/party-sticker-03.svg",
  ticket: "/stickers/season/party-sticker-02.svg",
  smile: "/stickers/season/party-sticker-01.svg",
  eyeHeart: "/stickers/season/party-sticker-05.svg",
  pizza: "/stickers/season/party-sticker-09.svg",
  disco: "/stickers/party/party-10.png",
  camera: "/stickers/props/prop-sticker-01.svg",
  tapePink: "/stickers/tape/tape-sticker-01.png",
  tapeYellow: "/stickers/tape/tape-sticker-05.png",
  star: "/stickers/star.svg",
  sparkle: "/stickers/sparkle.svg",
} as const;

export const MZ_INNER: InnerDesignDef[] = [
  {
    // 1) 오프닝: 블랙 면 큰 사진 + 라임 면 큼직한 번호
    id: "mz-opening",
    name: "오프닝",
    note: "큰 사진 1장 + 라임 면 NO.01",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0, 0, 1, 0.74])],
        texts: [
          t.text({ t: "NO.01", f: [0, 0, 0.2, 0.07], font: FONT.black, pt: 17, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.04 }),
          t.text({ t: "DAILY LOG", f: [0, 0.77, 1, 0.16], font: FONT.black, pt: 64, color: C.white, lh: 1.05 }),
          t.text({ t: "2026.10.04  SAT", f: [0, 0.94, 0.6, 0.05], font: FONT.dh, pt: 13, color: C.lime, ls: 0.12 }),
        ],
        stickers: [t.sticker(STK.smile, 0.9, 0.72, 40, 10), t.sticker(STK.sparkle, 0.7, 0.8, 18, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.lime),
        slots: [],
        texts: [
          t.text({ t: "FILM ROLL 01", f: [0, 0, 0.7, 0.045], font: FONT.sans, pt: 10, color: C.black, bold: true, ls: 0.3 }),
          t.text({ t: "01", f: [0, 0.07, 1, 0.42], font: FONT.black, pt: 236, color: C.black, lh: 0.95 }),
          t.rule([0, 0.62, 1, 0.005], C.black),
          t.text({ t: "오늘도 기록 중", f: [0, 0.65, 1, 0.1], font: FONT.black, pt: 30, color: C.black }),
          t.text({ t: "아무렇지 않은 하루도\n찍어두면 오늘의 레전드", f: [0, 0.78, 0.9, 0.14], font: FONT.sans, pt: 12, color: C.black, bold: true, lh: 1.7 }),
        ],
        stickers: [t.sticker(STK.bolt, 0.88, 0.86, 46, 12), t.sticker(STK.star, 0.9, 0.08, 26, 10)],
      };
    },
  },
  {
    // 2) 폴라로이드 큰 사진 + 블랙 면 캡션
    id: "mz-photo-caption",
    name: "폴라로이드 + 캡션",
    note: "기울인 폴라로이드 1장 + 큰 캡션",
    left: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.47, 0.72, 3);
      return {
        bg: solid(C.off),
        slots: [fr.slot],
        texts: [],
        stickers: [fr.sticker, t.sticker(STK.tapePink, 0.2, 0.04, 36, -28), t.sticker(STK.shades, 0.88, 0.9, 46, 14), t.sticker(STK.sparkle, 0.1, 0.9, 22, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [],
        texts: [
          t.text({ t: "오늘의\n장면", f: [0, 0.08, 1, 0.4], font: FONT.black, pt: 84, color: C.white, lh: 1.0 }),
          t.text({ t: "지금 이 순간 저장 완료", f: [0, 0.52, 1, 0.05], font: FONT.sans, pt: 13, color: C.lime, bold: true }),
          t.text({ t: "2026.10.04", f: [0, 0.62, 0.46, 0.075], font: FONT.dh, pt: 18, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.08 }),
          t.text({ t: "#일상  #기록  #오늘도_무사히", f: [0, 0.74, 1, 0.05], font: FONT.sans, pt: 11, color: C.gray, bold: true }),
        ],
        stickers: [t.sticker(STK.bolt, 0.84, 0.82, 56, -10), t.sticker(STK.star, 0.9, 0.1, 28, 12)],
      };
    },
  },
  {
    // 3) 사진 2장 + 한마디: 위·아래로 어긋난 비대칭 배치
    id: "mz-two-quote",
    name: "두 장 + 한마디",
    note: "어긋난 사진 2장 + 형광 한마디",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0, 0.03, 0.76, 0.52])],
        texts: [
          t.text({ t: "찍는 순간", f: [0, 0.6, 1, 0.13], font: FONT.black, pt: 50, color: C.white, lh: 1.05 }),
          t.text({ t: "추억이 된다", f: [0, 0.75, 0.74, 0.13], font: FONT.black, pt: 50, color: C.black, bg: C.lime, hug: true, lh: 1.05 }),
          t.text({ t: "NO.02", f: [0, 0.92, 0.3, 0.05], font: FONT.dh, pt: 13, color: C.lime, ls: 0.12 }),
        ],
        stickers: [t.sticker(STK.eyeHeart, 0.88, 0.62, 44, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0.24, 0.12, 0.76, 0.62])],
        texts: [
          t.text({ t: "2026.10.04  /  SEOUL", f: [0.24, 0.78, 0.76, 0.05], font: FONT.dh, pt: 13, color: C.black, ls: 0.12 }),
          t.text({ t: "FRAME 02", f: [0.24, 0.04, 0.4, 0.045], font: FONT.sans, pt: 10, color: C.black, bold: true, ls: 0.3 }),
        ],
        stickers: [t.sticker(STK.disco, 0.12, 0.86, 50, -8), t.sticker(STK.star, 0.9, 0.9, 28, 10)],
      };
    },
  },
  {
    // 4) 포토부스 띠 3장 + 큰 날짜
    id: "mz-strip-date",
    name: "포토부스 + 날짜",
    note: "세로 포토부스 띠(사진 3장) + 큰 날짜",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0.34, 0.03, 0.32, 0.3]), t.slot([0.34, 0.35, 0.32, 0.3]), t.slot([0.34, 0.67, 0.32, 0.3])],
        texts: [
          t.rule([0.3, 0, 0.4, 1], C.black, 1.5, DESIGN_BACK_Z),
          t.text({ t: "PHOTO\nBOOTH", f: [0, 0.03, 0.28, 0.2], font: FONT.black, pt: 28, color: C.black, lh: 1.05 }),
          t.text({ t: "4 CUTS\n1 DAY", f: [0.72, 0.84, 0.28, 0.12], font: FONT.dh, pt: 13, color: C.black, lh: 1.4, ls: 0.1, align: "right", va: "bottom" }),
        ],
        stickers: [t.sticker(STK.bolt, 0.12, 0.7, 44, -12), t.sticker(STK.smile, 0.9, 0.12, 40, 12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [],
        texts: [
          t.text({ t: "2026", f: [0, 0.1, 1, 0.07], font: FONT.dh, pt: 28, color: C.white, ls: 0.3 }),
          t.text({ t: "10.04", f: [0, 0.18, 1, 0.3], font: FONT.black, pt: 138, color: C.lime, lh: 1.0 }),
          t.text({ t: "FILM ROLL 01", f: [0, 0.55, 1, 0.06], font: FONT.dh, pt: 22, color: C.white, ls: 0.3 }),
          t.text({ t: "아침  ·  낮  ·  밤\n하루가 네 컷으로 끝났다", f: [0, 0.66, 0.9, 0.14], font: FONT.sans, pt: 12, color: C.gray, bold: true, lh: 1.8 }),
        ],
        stickers: [t.sticker(STK.ticket, 0.8, 0.9, 52, -8), t.sticker(STK.sparkle, 0.9, 0.16, 24, 0)],
      };
    },
  },
  {
    // 5) 콜라주(사진 5장) + 피드 라벨
    id: "mz-collage",
    name: "콜라주 + 피드",
    note: "사진 5장 + MY FEED 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0, 0, 0.6, 0.5]), t.slot([0.64, 0, 0.36, 0.24]), t.slot([0.64, 0.26, 0.36, 0.24])],
        texts: [
          t.text({ t: "MY FEED", f: [0, 0.54, 1, 0.14], font: FONT.black, pt: 58, color: C.black, lh: 1.05 }),
          t.text({ t: "DAILY UPDATE", f: [0, 0.72, 0.48, 0.07], font: FONT.dh, pt: 16, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.1 }),
          t.text({ t: "2026.10.04", f: [0, 0.82, 0.5, 0.05], font: FONT.sans, pt: 10, color: C.black, bold: true, ls: 0.2 }),
        ],
        stickers: [t.sticker(STK.shades, 0.84, 0.74, 52, -10), t.sticker(STK.star, 0.64, 0.5, 26, 12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0, 0, 0.5, 0.62]), t.slot([0.54, 0.22, 0.46, 0.4])],
        texts: [
          t.text({ t: "오늘도\n업데이트 완료", f: [0, 0.68, 1, 0.22], font: FONT.black, pt: 34, color: C.white, lh: 1.15 }),
          t.text({ t: "NO.05", f: [0.54, 0.04, 0.3, 0.05], font: FONT.dh, pt: 13, color: C.lime, ls: 0.12 }),
        ],
        stickers: [t.sticker(STK.pizza, 0.88, 0.86, 44, 12), t.sticker(STK.bolt, 0.74, 0.74, 36, -10)],
      };
    },
  },
  {
    // 6) 마무리: THE END + 사진 1장
    id: "mz-closing",
    name: "마무리 · THE END",
    note: "사진 1장 + THE END·다음 롤 예고",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [],
        texts: [
          t.text({ t: "THE\nEND", f: [0, 0.1, 1, 0.52], font: FONT.black, pt: 126, color: C.lime, lh: 0.92 }),
          t.text({ t: "다음 롤에서 만나요", f: [0, 0.68, 1, 0.07], font: FONT.dh, pt: 26, color: C.white }),
          t.text({ t: "FILM ROLL 01  —  36 / 36", f: [0, 0.94, 0.8, 0.045], font: FONT.sans, pt: 10, color: C.gray, bold: true, ls: 0.2 }),
        ],
        stickers: [t.sticker(STK.smile, 0.86, 0.82, 46, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0.06, 0.07, 0.88, 0.72])],
        texts: [t.text({ t: "2026.10.04", f: [0.06, 0.84, 0.4, 0.07], font: FONT.dh, pt: 17, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.08 })],
        stickers: [t.sticker(STK.shades, 0.84, 0.88, 50, -12), t.sticker(STK.tapePink, 0.5, 0.06, 38, 4)],
      };
    },
  },
];

export const MZ_COVER: CoverDesignDef = {
  id: "mz-cover",
  name: "MZ",
  note: "블랙 + 필름 띠 사진 + 라임 DAILY LOG + 책등·뒤표지 NEXT ROLL",
  front: (g) => {
    const t = toolkit(g);
    const fr = t.framed("film", 0.5, 0.4, 0.94, -3);
    return {
      bg: solid(C.black),
      slots: [fr.slot],
      texts: [
        t.text({ t: "NO.01", f: [0, 0, 0.2, 0.065], font: FONT.black, pt: 16, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.04 }),
        t.text({ t: "2026.10.04", f: [0.62, 0, 0.38, 0.065], font: FONT.dh, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.1 }),
        t.text({ t: "FILM ROLL 01", f: [0, 0.93, 1, 0.045], font: FONT.dh, pt: 14, color: C.white, align: "center", ls: 0.36 }),
      ],
      stickers: [fr.sticker, t.sticker(STK.bolt, 0.9, 0.74, 42, 12), t.sticker(STK.smile, 0.08, 0.72, 38, -12)],
    };
  },
  back: (g) => {
    const t = toolkit(g);
    const fr = t.framed("polaroid", 0.5, 0.62, 0.32, 4);
    return {
      bg: solid(C.off),
      slots: [fr.slot],
      texts: [
        t.text({ t: "SEE YOU\nNEXT ROLL", f: [0, 0.06, 1, 0.28], font: FONT.black, pt: 50, color: C.black, align: "center", lh: 1.05 }),
        t.text({ t: "ROLL 02  COMING SOON", f: [0.2, 0.37, 0.6, 0.065], font: FONT.dh, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.14 }),
      ],
      stickers: [fr.sticker, t.sticker(STK.shades, 0.14, 0.2, 44, -12), t.sticker(STK.star, 0.9, 0.3, 26, 10)],
    };
  },
  spine: { bg: solid(C.black), titleFontFamily: FONT.black, titleColor: C.lime },
  backLogo: (g) => {
    const t = toolkit(g);
    const r = t.r([0, 0.95, 1, 0]);
    return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 36 };
  },
  title: (g) => {
    const t = toolkit(g);
    const f = t.r([0, 0.76, 1, 0.15]);
    return {
      text: "DAILY LOG",
      xPct: f.xPct,
      yPct: f.yPct,
      widthPct: f.widthPct,
      fontFamily: FONT.black,
      pt: 80 * g.k,
      color: C.lime,
      lineHeight: 1.05,
      letterSpacing: 0.01,
    };
  },
};
