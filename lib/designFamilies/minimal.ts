// 스타일 2 — 미니멀(깔끔한 모노톤): 오프화이트 바탕 + 차콜 글자 + 헤어라인, 여백을 넉넉하게, 격자에 맞춘 사각 사진 칸, 스티커 없음.
//   제목 = 나눔명조(Nanum Myeongjo, 세리프) / 본문·캡션 = 프리텐다드(Pretendard, 얇은 느낌의 산세리프) / 영문 라벨 = Julius Sans One(가는 대문자).
//   세 서체 모두 app/layout.tsx에서 이미 불러오는 서체라 새로 추가한 서체는 없어요.
import { solid, toolkit, type CoverDesignDef, type InnerDesignDef } from "../designKit";

const FONT = {
  serif: "'Nanum Myeongjo', serif",
  sans: "Pretendard, sans-serif",
  latin: "'Julius Sans One', sans-serif",
} as const;
export const MINIMAL_FONTS: string[] = [FONT.serif, FONT.sans, FONT.latin];

const C = {
  paper: "#FAF9F6",
  white: "#FFFFFF",
  ink: "#1D1D1F",
  gray: "#76766F",
  light: "#B9B7AF",
  rule: "#CFCDC5",
  sheet: "#F1F0EB",
} as const;

const LINE = 0.0014; // 헤어라인 두께(안전영역 비율, 220mm 기준 약 0.3mm)

export const MINIMAL_INNER: InnerDesignDef[] = [
  {
    // 1) 챕터 오프닝: 왼쪽 큰 사진 + 오른쪽 여백 위에 작은 챕터 번호와 제목
    id: "mn-opening",
    name: "오프닝",
    note: "큰 사진 1장 + 챕터 제목",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.8])],
        texts: [
          t.rule([0, 0.835, 1, LINE], C.rule),
          t.text({ t: "AUTUMN 2026", f: [0, 0.86, 0.6, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.32 }),
          t.text({ t: "첫 번째 계절", f: [0, 0.915, 0.7, 0.06], font: FONT.sans, pt: 11, color: C.ink, ls: 0.04 }),
          t.text({ t: "2026.10.04", f: [0.6, 0.86, 0.4, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "right" }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.white),
        slots: [],
        texts: [
          t.text({ t: "CHAPTER 01", f: [0, 0, 0.6, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.text({ t: "우리의\n첫 계절", f: [0, 0.36, 0.9, 0.24], font: FONT.serif, pt: 38, color: C.ink, lh: 1.32 }),
          t.rule([0, 0.66, 0.1, LINE * 1.6], C.ink),
          t.text({ t: "함께 걸은 길, 함께 본 하늘.\n조용히 쌓인 날들의 기록.", f: [0, 0.69, 0.8, 0.12], font: FONT.sans, pt: 11, color: C.gray, lh: 1.9 }),
          t.text({ t: "01", f: [0.7, 0.96, 0.3, 0.04], font: FONT.latin, pt: 9, color: C.light, ls: 0.3, align: "right", va: "bottom" }),
        ],
        stickers: [],
      };
    },
  },
  {
    // 2) 큰 사진 + 캡션
    id: "mn-photo-caption",
    name: "큰 사진 + 캡션",
    note: "사진 1장 + 제목·설명글",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.86])],
        texts: [
          t.text({ t: "NO. 01", f: [0, 0.915, 0.4, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "2026.10.04", f: [0.5, 0.915, 0.5, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "right" }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.white),
        slots: [],
        texts: [
          t.text({ t: "PHOTOGRAPH", f: [0, 0, 0.6, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.text({ t: "오후의 빛", f: [0, 0.6, 0.9, 0.09], font: FONT.serif, pt: 26, color: C.ink, lh: 1.2 }),
          t.rule([0, 0.71, 1, LINE], C.rule),
          t.text({
            t: "아무 말 없이 걸어도 좋았던 길.\n바람이 지나가고, 우리의 웃음이 남았다.\n이 사진을 볼 때마다 그날의 온기가 돌아온다.",
            f: [0, 0.74, 0.9, 0.2],
            font: FONT.sans,
            pt: 11,
            color: C.gray,
            lh: 1.95,
          }),
        ],
        stickers: [],
      };
    },
  },
  {
    // 3) 사진 2장 + 짧은 글귀: 격자에 맞춰 위/아래로 어긋나게
    id: "mn-two-quote",
    name: "두 장 + 글귀",
    note: "사진 2장 + 짧은 글귀",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.6])],
        texts: [
          t.text({ t: "가장 평범한 날이\n가장 오래 남는다", f: [0, 0.68, 0.9, 0.16], font: FONT.serif, pt: 17, color: C.ink, lh: 1.7 }),
          t.text({ t: "— 2026.10.04", f: [0, 0.9, 0.6, 0.05], font: FONT.sans, pt: 9, color: C.gray, ls: 0.12 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0.4, 1, 0.6])],
        texts: [t.text({ t: "02", f: [0, 0, 0.3, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 })],
        stickers: [],
      };
    },
  },
  {
    // 4) 사진 3장 + 큰 날짜
    id: "mn-strip-date",
    name: "세 장 스트립 + 날짜",
    note: "사진 3장 + 큰 날짜·캡션",
    left: (g) => {
      const t = toolkit(g);
      const w = 0.31;
      const gap = (1 - w * 3) / 2;
      return {
        bg: solid(C.paper),
        slots: [0, 1, 2].map((i) => t.slot([i * (w + gap), 0.08, w, 0.56])),
        texts: [
          ...["01", "02", "03"].map((n, i) => t.text({ t: n, f: [i * (w + gap), 0.68, w, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.3 })),
          t.rule([0, 0.76, 1, LINE], C.rule),
          t.text({ t: "봄에서 가을까지", f: [0, 0.8, 0.8, 0.07], font: FONT.serif, pt: 17, color: C.ink }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.white),
        slots: [],
        texts: [
          t.text({ t: "2026", f: [0, 0.2, 0.5, 0.05], font: FONT.latin, pt: 12, color: C.gray, ls: 0.4 }),
          t.text({ t: "10.04", f: [0, 0.27, 1, 0.22], font: FONT.latin, pt: 84, color: C.ink, ls: 0.02, lh: 1.1 }),
          t.rule([0, 0.56, 0.1, LINE * 1.6], C.ink),
          t.text({ t: "세 번의 계절을 지나\n우리는 같은 자리에 다시 섰다.", f: [0, 0.6, 0.9, 0.14], font: FONT.sans, pt: 11, color: C.gray, lh: 1.9 }),
        ],
        stickers: [],
      };
    },
  },
  {
    // 5) 콜라주(사진 5장) + 라벨
    id: "mn-collage",
    name: "콜라주 + 라벨",
    note: "사진 5장 + 영문 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 0.64, 0.58]), t.slot([0.68, 0, 0.32, 0.275]), t.slot([0.68, 0.305, 0.32, 0.275])],
        texts: [
          t.text({ t: "COLLECTION", f: [0, 0.64, 0.9, 0.08], font: FONT.latin, pt: 24, color: C.ink, ls: 0.12, lh: 1.2 }),
          t.rule([0, 0.75, 1, LINE], C.rule),
          t.text({ t: "2026.10.04", f: [0, 0.78, 0.5, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0.36, 0, 0.64, 0.5]), t.slot([0.36, 0.54, 0.3, 0.3])],
        texts: [
          t.text({ t: "사진마다\n이야기가 있어요", f: [0, 0.02, 0.32, 0.14], font: FONT.serif, pt: 13, color: C.ink, lh: 1.7 }),
          t.text({ t: "ARCHIVE — 02", f: [0.7, 0.58, 0.3, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.28, align: "right" }),
        ],
        stickers: [],
      };
    },
  },
  {
    // 6) 마무리: 감사 인사 + 작은 사진 1장
    id: "mn-closing",
    name: "마무리 · Thank you",
    note: "사진 1장 + 감사 인사·끝",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [],
        texts: [
          t.text({ t: "THANK YOU", f: [0, 0.34, 1, 0.12], font: FONT.latin, pt: 40, color: C.ink, ls: 0.14, align: "center", lh: 1.2 }),
          t.rule([0.46, 0.5, 0.08, LINE * 1.6], C.ink),
          t.text({ t: "여기까지 함께해 주셔서\n감사합니다", f: [0.05, 0.54, 0.9, 0.14], font: FONT.serif, pt: 14, color: C.gray, align: "center", lh: 1.85 }),
          t.text({ t: "END", f: [0, 0.94, 1, 0.04], font: FONT.latin, pt: 9, color: C.light, ls: 0.4, align: "center", va: "bottom" }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.white),
        slots: [t.slot([0.2, 0.12, 0.6, 0.64])],
        texts: [
          t.text({ t: "2026.10.04", f: [0.2, 0.82, 0.6, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "center" }),
        ],
        stickers: [],
      };
    },
  },
];

export const MINIMAL_COVER: CoverDesignDef = {
  id: "mn-cover",
  name: "미니멀",
  note: "앞표지 큰 사진 + 헤어라인 제목 + 책등 + 뒤표지 글귀",
  front: (g) => {
    const t = toolkit(g);
    return {
      bg: solid(C.paper),
      slots: [t.slot([0, 0, 1, 0.62])],
      texts: [
        t.rule([0, 0.69, 1, LINE], C.rule),
        t.text({ t: "ALBUM", f: [0, 0.715, 0.5, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.34 }),
        t.text({ t: "2026.10.04", f: [0.5, 0.715, 0.5, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "right" }),
        t.text({ t: "VOL. 01 — 일상의 기록", f: [0, 0.93, 1, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "center" }),
      ],
      stickers: [],
    };
  },
  back: (g) => {
    const t = toolkit(g);
    return {
      bg: solid(C.paper),
      slots: [],
      texts: [
        t.rule([0.46, 0.36, 0.08, LINE * 1.6], C.ink),
        t.text({ t: "기록하는 일은\n오래 사랑하는 방법이다", f: [0.05, 0.41, 0.9, 0.18], font: FONT.serif, pt: 16, color: C.ink, align: "center", lh: 1.8 }),
        t.text({ t: "KEEPIC ALBUM — 2026", f: [0, 0.8, 1, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.3, align: "center" }),
      ],
      stickers: [],
    };
  },
  spine: { bg: solid(C.sheet), titleFontFamily: FONT.serif, titleColor: C.ink },
  backLogo: (g) => {
    const t = toolkit(g);
    const r = t.r([0, 0.93, 1, 0]);
    return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 36 };
  },
  title: (g) => {
    const t = toolkit(g);
    const f = t.r([0, 0.78, 1, 0.11]);
    return {
      text: "조용한 날들",
      xPct: f.xPct,
      yPct: f.yPct,
      widthPct: f.widthPct,
      fontFamily: FONT.serif,
      pt: 34 * g.k,
      color: C.ink,
      lineHeight: 1.2,
      letterSpacing: 0.06,
    };
  },
};
