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
    // 5) 에디토리얼 그리드: 왼쪽은 세로로 긴 사진 1장 + 아랫선을 맞춘 정사각 사진 1장, 오른쪽은 정사각 사진 3장을 계단식으로 어긋나게 —
    //    헤어라인·작은 번호·큰 여백만 써요. 사진 칸 순서: 세로 사진이 맨 앞이라 사진이 1장만 남아도 큰 칸에 먼저 들어가요.
    id: "mn-collage",
    name: "에디토리얼 그리드",
    note: "세로 사진 + 어긋난 정사각 사진 4장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0.07, 0.5, 0.8]), t.slot([0.62, 0.49, 0.38, 0.38])],
        texts: [
          t.text({ t: "ISSUE 05 — INDEX", f: [0, 0, 0.7, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.rule([0, 0.047, 1, LINE], C.rule),
          t.text({ t: "05", f: [0.58, 0.07, 0.42, 0.18], font: FONT.latin, pt: 54, color: C.ink, lh: 1.1 }),
          t.text({ t: "FRAMES", f: [0.6, 0.25, 0.4, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.text({ t: "빛이 머무는\n자리를 따라", f: [0.6, 0.32, 0.4, 0.12], font: FONT.serif, pt: 12, color: C.ink, lh: 1.7 }),
          t.text({ t: "01", f: [0, 0.9, 0.2, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "2026.10.04", f: [0.12, 0.9, 0.38, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14, align: "right" }),
          t.text({ t: "02", f: [0.62, 0.9, 0.2, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.white),
        slots: [t.slot([0, 0.09, 0.34, 0.34]), t.slot([0.5, 0.3, 0.34, 0.34]), t.slot([0.12, 0.66, 0.26, 0.26])],
        texts: [
          t.text({ t: "FRAMES 03 — 05", f: [0, 0, 0.7, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.rule([0, 0.047, 1, LINE], C.rule),
          t.text({ t: "03", f: [0, 0.455, 0.2, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "04", f: [0.5, 0.665, 0.2, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "05", f: [0.12, 0.935, 0.2, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "조용히 쌓인\n장면들", f: [0.5, 0.78, 0.5, 0.11], font: FONT.serif, pt: 12, color: C.gray, lh: 1.7 }),
        ],
        stickers: [],
      };
    },
  },
  {
    // 6) 갤러리 월: 큰 사진 1장 + 정사각 사진 3장을 같은 눈높이(아래 선)에 맞춰 건 격자 배치, 헤어라인·작은 번호 캡션·넉넉한 여백.
    //    작별 인사('END'·Thank you)는 맨 마지막 소개 페이지가 말해요. 큰 사진이 맨 앞 칸이라 사진이 1장만 남아도 큰 칸에 먼저 들어가요.
    id: "mn-closing",
    name: "갤러리 마무리",
    note: "큰 사진 1장 + 정사각 사진 3장 격자",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0.07, 0.84, 0.55])],
        texts: [
          t.text({ t: "A QUIET MOMENT", f: [0, 0, 0.7, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.rule([0, 0.665, 1, LINE], C.rule),
          t.text({ t: "01", f: [0, 0.7, 0.3, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 }),
          t.text({ t: "조용히 오래 남을 장면", f: [0, 0.755, 0.9, 0.07], font: FONT.serif, pt: 13.5, color: C.ink, lh: 1.5 }),
          t.text({ t: "2026.10.04", f: [0, 0.9, 0.6, 0.04], font: FONT.sans, pt: 9, color: C.gray, ls: 0.14 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const xs = [0, 0.35, 0.7];
      return {
        bg: solid(C.white),
        slots: xs.map((x) => t.slot([x, 0.32, 0.3, 0.3])),
        texts: [
          t.text({ t: "02 — 04", f: [0, 0, 0.7, 0.04], font: FONT.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.rule([0, 0.665, 1, LINE], C.rule),
          ...["02", "03", "04"].map((n, i) => t.text({ t: n, f: [xs[i], 0.7, 0.3, 0.04], font: FONT.latin, pt: 9, color: C.ink, ls: 0.3 })),
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
