// 테마 "여행" 새 디자인 — 미니멀 3종(TRAVEL LOG·일정표·탑승권) + 감성 필기체 2종(여행 일기·여행 지도) + MZ 2종(필름 롤·여권 스탬프) + 표지 2종(미니멀·MZ).
// 서체·스티커·배경은 기존 스타일 파일과 같은 것만 써요. 모든 자리는 접히는 선 20mm 안쪽을 지켜요.
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { DESIGN_BACK_Z, solid, toolkit as kitToolkit, type CoverDesignDef, type DesignGeo, type InnerDesignDef } from "../designKit";

const MN = { serif: "'Nanum Myeongjo', serif", sans: "Pretendard, sans-serif", latin: "'Julius Sans One', sans-serif" } as const;
const HW = { pen: "'Nanum Pen Script', cursive", hand: "'Gaegu', cursive", dokdo: "'East Sea Dokdo', cursive" } as const;
const MZF = { black: "'Black Han Sans', sans-serif", dh: "'Do Hyeon', sans-serif", sans: "Pretendard, sans-serif" } as const;

const C = {
  paper: "#FAF9F6",
  white: "#FFFFFF",
  ink: "#1D1D1F",
  gray: "#76766F",
  rule: "#CFCDC5",
  sheet: "#F1F0EB",
  cream: "#F8F0DF",
  kraftDeep: "#CDB48A",
  brown: "#5B4632",
  pencil: "#85735F",
  red: "#C65A45",
  black: "#111111",
  off: "#F2F0EA",
  lime: "#CCFF00",
  mzGray: "#8D8D86",
} as const;
const LINE = 0.0014;
const CREAM_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-cream" };
const KRAFT_PAPER: BackgroundSpec = { kind: "texture", presetId: "t-paper-kraft" };
const PRINT: Partial<ImageBoxDef> = { borderWidthPx: 11, borderColor: "#FFFFFF" };
const tilt = (deg: number): Partial<ImageBoxDef> => ({ ...PRINT, rotation: deg });

const STK = {
  tapeKraft: "/stickers/tape/tape-sticker-03.png",
  tapeStar: "/stickers/tape/tape-sticker-05.png",
  tapeBlue: "/stickers/tape/tape-sticker-02.png",
  tapePink: "/stickers/tape/tape-sticker-01.png",
  letsTravel: "/stickers/travel/hw-lets-travel-again.png",
  suitcase: "/stickers/goods/goods-10.png",
  pin: "/stickers/icon/icon-location.svg",
  heart: "/stickers/icon/icon-heart-02.svg",
  sparkle: "/stickers/sparkle.svg",
  star: "/stickers/star.svg",
  bolt: "/stickers/season/party-sticker-08.svg",
  shades: "/stickers/season/party-sticker-03.svg",
  ticket: "/stickers/season/party-sticker-02.svg",
  smile: "/stickers/season/party-sticker-01.svg",
} as const;
const SUITCASE_ASPECT = 900 / 872;

const toolkit = (g: DesignGeo) => kitToolkit(g, C.ink);
const MM = { style: "minimal", themes: ["travel" as const] };
const HM = { style: "handwriting", themes: ["travel" as const] };
const ZM = { style: "mz", themes: ["travel" as const] };

export const TRAVEL_INNER: InnerDesignDef[] = [
  {
    ...MM,
    id: "mn-travel-log",
    name: "TRAVEL LOG",
    note: "큰 사진 1장 + 사진 2장 + 장소·날짜 캡션",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.76])],
        texts: [
          t.rule([0, 0.805, 1, LINE], C.rule),
          t.text({ t: "JEJU ISLAND, KOREA", f: [0, 0.83, 0.62, 0.04], font: MN.latin, pt: 9, color: C.gray, ls: 0.32 }),
          t.text({ t: "2026.10.04 — 10.06", f: [0.55, 0.83, 0.45, 0.04], font: MN.sans, pt: 9, color: C.gray, ls: 0.1, align: "right" }),
          t.text({ t: "첫째 날, 바다를 따라", f: [0, 0.895, 0.9, 0.06], font: MN.sans, pt: 12, ls: 0.04 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const col = (x: number, k: string, v: string) => [
        t.text({ t: k, f: [x, 0.6, 0.3, 0.035], font: MN.latin, pt: 8.5, color: C.gray, ls: 0.3 }),
        t.text({ t: v, f: [x, 0.64, 0.3, 0.05], font: MN.sans, pt: 11.5 }),
      ];
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0.05, 0.62, 0.45]), t.slot([0.66, 0.05, 0.34, 0.45])],
        texts: [
          t.text({ t: "TRAVEL LOG — 01", f: [0, 0, 0.7, 0.035], font: MN.latin, pt: 8.5, color: C.gray, ls: 0.32 }),
          t.rule([0, 0.545, 1, LINE], C.rule),
          ...col(0, "WHERE", "제주 애월"),
          ...col(0.35, "WHEN", "10.04 SAT"),
          ...col(0.7, "WITH", "우리 둘"),
          t.text({ t: "바람이 좋았고, 커피가 따뜻했다.\n오래 기억하고 싶은 하루.", f: [0, 0.78, 1, 0.14], font: MN.sans, pt: 12, lh: 1.9 }),
        ],
        stickers: [],
      };
    },
  },
  {
    ...MM,
    id: "mn-travel-itinerary",
    name: "ITINERARY · 일정표",
    note: "시간표 글 + 사진 3장",
    left: (g) => {
      const t = toolkit(g);
      const row = (i: number, time: string, main: string, sub: string) => {
        const y = 0.12 + i * 0.2;
        return [
          t.rule([0, y, 1, LINE], C.rule),
          t.text({ t: time, f: [0, y + 0.025, 0.22, 0.04], font: MN.latin, pt: 10, color: C.gray, ls: 0.2 }),
          t.text({ t: main, f: [0.25, y + 0.02, 0.75, 0.06], font: MN.sans, pt: 13.5 }),
          t.text({ t: sub, f: [0.25, y + 0.085, 0.75, 0.05], font: MN.sans, pt: 10, color: C.gray }),
        ];
      };
      return {
        bg: solid(C.paper),
        slots: [],
        texts: [
          t.text({ t: "ITINERARY", f: [0, 0, 0.7, 0.05], font: MN.latin, pt: 12, ls: 0.4 }),
          t.text({ t: "DAY 1 — 10.04 SAT", f: [0, 0.058, 1, 0.04], font: MN.sans, pt: 10, color: C.gray, ls: 0.1 }),
          ...row(0, "09:30", "김포공항 출발", "제주 도착 · 렌터카 픽업"),
          ...row(1, "12:00", "애월 해안도로 드라이브", "점심은 고기국수"),
          ...row(2, "15:00", "카페 · 노을 산책", "바다가 보이는 창가 자리"),
          ...row(3, "19:00", "숙소 체크인", "저녁은 흑돼지 · 일기 쓰기"),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.5]), t.slot([0, 0.54, 0.48, 0.42]), t.slot([0.52, 0.54, 0.48, 0.42])],
        texts: [t.text({ t: "NO. 02  /  ROUTE", f: [0, 0.965, 0.7, 0.035], font: MN.latin, pt: 8, color: C.gray, ls: 0.3 })],
        stickers: [],
      };
    },
  },
  {
    ...MM,
    id: "mn-travel-ticket",
    name: "BOARDING PASS",
    note: "탑승권 카드 + 사진 2장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.sheet),
        slots: [t.slot([0, 0.02, 1, 0.68])],
        texts: [
          t.text({ t: "DEPARTURE", f: [0, 0.76, 0.6, 0.04], font: MN.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.text({ t: "설레는 마음으로\n출발", f: [0, 0.82, 0.9, 0.14], font: MN.serif, pt: 18, lh: 1.5 }),
        ],
        stickers: [],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      const field = (x: number, k: string, v: string) => [
        t.text({ t: k, f: [x, 0.39, 0.2, 0.03], font: MN.latin, pt: 7.5, color: C.gray, ls: 0.3 }),
        t.text({ t: v, f: [x, 0.425, 0.22, 0.045], font: MN.sans, pt: 11, bold: true }),
      ];
      return {
        bg: solid(C.sheet),
        slots: [t.slot([0, 0.68, 0.48, 0.3]), t.slot([0.52, 0.68, 0.48, 0.3])],
        texts: [
          t.rule([0, 0.04, 1, 0.56], C.white, 1.5, DESIGN_BACK_Z),
          t.text({ t: "BOARDING PASS", f: [0.05, 0.07, 0.6, 0.04], font: MN.latin, pt: 9, color: C.gray, ls: 0.34 }),
          t.text({ t: "ECONOMY", f: [0.6, 0.07, 0.35, 0.04], font: MN.latin, pt: 9, color: C.gray, ls: 0.3, align: "right" }),
          t.text({ t: "GMP", f: [0.05, 0.13, 0.35, 0.14], font: MN.latin, pt: 50, lh: 1.0 }),
          t.text({ t: "CJU", f: [0.6, 0.13, 0.35, 0.14], font: MN.latin, pt: 50, lh: 1.0, align: "right" }),
          t.rule([0.4, 0.2, 0.2, LINE], C.ink),
          t.text({ t: "SEOUL", f: [0.05, 0.285, 0.35, 0.04], font: MN.sans, pt: 9, color: C.gray, ls: 0.2 }),
          t.text({ t: "JEJU", f: [0.6, 0.285, 0.35, 0.04], font: MN.sans, pt: 9, color: C.gray, ls: 0.2, align: "right" }),
          t.rule([0.05, 0.365, 0.9, LINE], C.rule),
          ...field(0.05, "FLIGHT", "KE1203"),
          ...field(0.3, "GATE", "12"),
          ...field(0.5, "SEAT", "14A"),
          ...field(0.7, "DATE", "10.04"),
          t.text({ t: "NO. 0004-1004", f: [0.05, 0.52, 0.6, 0.035], font: MN.latin, pt: 8, color: C.gray, ls: 0.3 }),
        ],
        stickers: [],
      };
    },
  },
  {
    ...HM,
    id: "hw-travel-diary",
    name: "여행 일기",
    note: "폴라로이드 1장 + 손글씨 일기 + 사진 1장",
    left: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.38, 0.6, -3);
      return {
        bg: CREAM_PAPER,
        slots: [fr.slot],
        texts: [
          t.text({ t: "여행 일기", f: [0.1, 0.8, 0.8, 0.12], font: HW.pen, pt: 52, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "2026.10.04", f: [0.1, 0.925, 0.8, 0.05], font: HW.hand, pt: 17, color: C.pencil, align: "center", ls: 0.1 }),
        ],
        stickers: [fr.sticker, t.sticker(STK.tapeKraft, 0.5, 0.02, 36, 2), t.sticker(STK.pin, 0.88, 0.1, 22, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: KRAFT_PAPER,
        slots: [t.slot([0.52, 0.62, 0.46, 0.33], tilt(4))],
        texts: [
          t.text({ t: "10월 4일  맑음", f: [0, 0.04, 1, 0.08], font: HW.hand, pt: 26, color: C.red }),
          t.text({
            t: "새벽 비행기라 졸렸지만\n창밖으로 구름이 보이니 금세 깼다.\n바다 냄새가 나는 순간,\n아 여행 왔구나 싶었다.",
            f: [0, 0.15, 1, 0.34],
            font: HW.hand,
            pt: 19,
            color: C.brown,
            lh: 1.75,
          }),
          t.text({ t: "오늘의 한 줄\n바람이 좋았다!", f: [0, 0.66, 0.46, 0.2], font: HW.pen, pt: 30, color: C.brown, lh: 1.2 }),
        ],
        stickers: [t.sticker(STK.suitcase, 0.1, 0.9, 34, -6, SUITCASE_ASPECT), t.sticker(STK.tapeStar, 0.86, 0.6, 32, 16)],
      };
    },
  },
  {
    ...HM,
    id: "hw-travel-map",
    name: "우리의 여행 지도",
    note: "코스 따라 놓인 사진 3장 + 지도 핀 + 승차권 같은 와이드 사진",
    left: (g) => {
      const t = toolkit(g);
      const w = 0.4;
      const h = 0.26;
      return {
        bg: KRAFT_PAPER,
        slots: [t.slot([0, 0.15, w, h], tilt(-4)), t.slot([0.3, 0.45, w, h], tilt(3)), t.slot([0.56, 0.73, w, h], tilt(-2))],
        texts: [
          t.text({ t: "우리의 여행 지도", f: [0, 0, 1, 0.12], font: HW.pen, pt: 44, color: C.brown, lh: 1.0 }),
          t.text({ t: "1. 서울 출발", f: [0.44, 0.2, 0.56, 0.06], font: HW.hand, pt: 19, color: C.red }),
          t.text({ t: "2. 강릉 바다", f: [0, 0.52, 0.29, 0.06], font: HW.hand, pt: 19, color: C.red, align: "right" }),
          t.text({ t: "3. 부산 야경", f: [0, 0.8, 0.54, 0.06], font: HW.hand, pt: 19, color: C.red, align: "right" }),
          t.text({ t: "· · · ·", f: [0.12, 0.425, 0.4, 0.04], font: HW.hand, pt: 20, color: C.pencil }),
          t.text({ t: "· · · ·", f: [0.42, 0.715, 0.4, 0.04], font: HW.hand, pt: 20, color: C.pencil }),
        ],
        stickers: [t.sticker(STK.pin, 0.03, 0.15, 20, -8), t.sticker(STK.pin, 0.33, 0.45, 20, 8), t.sticker(STK.pin, 0.59, 0.73, 20, -6)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CREAM_PAPER,
        slots: [t.slot([0.02, 0.38, 0.96, 0.56], tilt(-1.5))],
        texts: [
          t.text({ t: "서울 → 강릉 → 부산", f: [0, 0.05, 1, 0.1], font: HW.pen, pt: 36, color: C.brown, align: "center", lh: 1.0 }),
          t.text({ t: "2026.10.04 — 10.06  ·  3일 2박", f: [0, 0.17, 1, 0.06], font: HW.hand, pt: 18, color: C.pencil, align: "center" }),
          t.text({ t: "- - - - - - - - - - - - - - -", f: [0, 0.26, 1, 0.05], font: HW.hand, pt: 18, color: C.pencil, align: "center" }),
        ],
        stickers: [t.sticker(STK.tapeStar, 0.5, 0.38, 38, 2), t.sticker(STK.suitcase, 0.9, 0.2, 40, 8, SUITCASE_ASPECT)],
      };
    },
  },
  {
    ...ZM,
    id: "mz-travel-film",
    name: "FILM ROLL · TRAVEL",
    note: "필름 띠 사진 2장 + 큰 사진 + 장소 라벨",
    left: (g) => {
      const t = toolkit(g);
      const f1 = t.framed("film", 0.3, 0.245, 0.56, -2);
      const f2 = t.framed("film", 0.3, 0.745, 0.56, 2);
      return {
        bg: solid(C.black),
        slots: [f1.slot, f2.slot],
        texts: [
          t.text({ t: "NO.02", f: [0.66, 0.03, 0.2, 0.06], font: MZF.black, pt: 15, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.04 }),
          t.text({ t: "TRAVEL\nROLL", f: [0.62, 0.13, 0.38, 0.2], font: MZF.black, pt: 34, color: C.lime, lh: 1.02 }),
          t.text({ t: "2026.10.04\nJEJU, KR", f: [0.62, 0.38, 0.38, 0.12], font: MZF.dh, pt: 14, color: "#FFFFFF", lh: 1.5, ls: 0.1 }),
        ],
        stickers: [f1.sticker, f2.sticker, t.sticker(STK.bolt, 0.84, 0.76, 40, 12), t.sticker(STK.sparkle, 0.9, 0.58, 20, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0, 0, 1, 0.68])],
        texts: [
          t.text({ t: "LOCATION: JEJU, KR", f: [0, 0.72, 1, 0.05], font: MZF.dh, pt: 14, ls: 0.12 }),
          t.text({ t: "TRAVEL LOG", f: [0, 0.78, 1, 0.13], font: MZF.black, pt: 54, lh: 1.0 }),
          t.text({ t: "36 EXP  ·  ISO 400  ·  DAY 01", f: [0, 0.93, 0.9, 0.04], font: MZF.sans, pt: 9.5, color: C.mzGray, bold: true, ls: 0.2 }),
        ],
        stickers: [t.sticker(STK.smile, 0.9, 0.64, 40, 10), t.sticker(STK.star, 0.1, 0.6, 22, -10)],
      };
    },
  },
  {
    ...ZM,
    id: "mz-travel-stamp",
    name: "PASSPORT · 스탬프",
    note: "탑승권 와이드 사진 + 스탬프 사진 3장 + 비자 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.lime),
        slots: [t.slot([0, 0.15, 1, 0.3], { borderWidthPx: 6, borderColor: C.black }), t.slot([0, 0.62, 0.3, 0.3], { borderWidthPx: 6, borderColor: "#FFFFFF", rotation: -4 }), t.slot([0.36, 0.62, 0.3, 0.3], { borderWidthPx: 6, borderColor: "#FFFFFF", rotation: 3 })],
        texts: [
          t.text({ t: "PASSPORT", f: [0, 0, 1, 0.13], font: MZF.black, pt: 56, color: C.black, lh: 1.0 }),
          t.text({ t: "ICN  →  CJU", f: [0, 0.48, 0.64, 0.08], font: MZF.black, pt: 28, color: C.black, lh: 1.0 }),
          t.text({ t: "GATE 12", f: [0.72, 0.5, 0.28, 0.055], font: MZF.dh, pt: 12, color: C.lime, align: "center", va: "middle", bg: C.black, ls: 0.1 }),
          t.text({ t: "SEAT 14A", f: [0.72, 0.57, 0.28, 0.055], font: MZF.dh, pt: 12, color: C.black, align: "center", va: "middle", bg: "#FFFFFF", ls: 0.1 }),
          t.text({ t: "STAMPS  03 / 06", f: [0.7, 0.74, 0.3, 0.05], font: MZF.sans, pt: 9.5, color: C.black, bold: true, ls: 0.2, align: "right" }),
        ],
        stickers: [t.sticker(STK.ticket, 0.84, 0.86, 54, -10), t.sticker(STK.star, 0.7, 0.66, 24, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0.12, 0.3, 0.76, 0.5], { borderWidthPx: 6, borderColor: C.lime })],
        texts: [
          t.text({ t: "VISA\nAPPROVED", f: [0.12, 0.02, 0.88, 0.24], font: MZF.black, pt: 40, color: C.lime, lh: 1.0 }),
          t.text({ t: "JEJU  ·  2026.10.04", f: [0.12, 0.84, 0.6, 0.05], font: MZF.sans, pt: 10.5, color: C.mzGray, bold: true, ls: 0.16 }),
          ...Array.from({ length: 6 }, (_, i) => t.rule([0.12 + i * 0.1373, 0.935, 0.108, 0.03], i < 3 ? C.lime : "#2B2B2B", 30)),
        ],
        stickers: [t.sticker(STK.bolt, 0.9, 0.84, 38, 12), t.sticker(STK.sparkle, 0.06, 0.46, 22, 0)],
      };
    },
  },
];

export const TRAVEL_COVERS: CoverDesignDef[] = [
  {
    ...MM,
    id: "mn-travel-cover",
    name: "TRAVEL LOG",
    note: "큰 사진 + TRAVEL LOG 제목 + 좌표 캡션 + 책등·뒤표지",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0, 0, 1, 0.64])],
        texts: [
          t.text({ t: "VOL. 01  ·  2026", f: [0, 0.665, 0.6, 0.04], font: MN.latin, pt: 9, color: C.gray, ls: 0.32 }),
          t.rule([0, 0.93, 1, LINE], C.rule),
          t.text({ t: "33.4996° N  126.5312° E", f: [0, 0.945, 1, 0.04], font: MN.latin, pt: 8.5, color: C.gray, ls: 0.28 }),
        ],
        stickers: [],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.paper),
        slots: [t.slot([0.25, 0.1, 0.5, 0.36])],
        texts: [
          t.text({ t: "어디든, 함께라면", f: [0, 0.56, 1, 0.07], font: MN.serif, pt: 20, align: "center" }),
          t.text({ t: "TRAVEL LOG · SEOUL — JEJU", f: [0, 0.68, 1, 0.04], font: MN.latin, pt: 8.5, color: C.gray, ls: 0.3, align: "center" }),
        ],
        stickers: [],
      };
    },
    spine: { bg: solid(C.sheet), titleFontFamily: MN.serif, titleColor: C.ink },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.94, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 38 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.73, 1, 0.12]);
      return { text: "TRAVEL LOG", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: MN.latin, pt: 40 * g.k, color: C.ink, lineHeight: 1.1, letterSpacing: 0.14 };
    },
  },
  {
    ...ZM,
    id: "mz-travel-cover",
    name: "TRIP ROLL",
    note: "블랙 + 필름 띠 사진 + 라임 TRIP 제목 + 뒤표지 NEXT TRIP",
    front: (g) => {
      const t = toolkit(g);
      const fr = t.framed("film", 0.5, 0.4, 0.92, 3);
      return {
        bg: solid(C.black),
        slots: [fr.slot],
        texts: [
          t.text({ t: "NO.02", f: [0, 0, 0.2, 0.065], font: MZF.black, pt: 16, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.04 }),
          t.text({ t: "2026.10.04", f: [0.62, 0, 0.38, 0.065], font: MZF.dh, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.1 }),
          t.text({ t: "JEJU  —  36 EXP", f: [0, 0.93, 1, 0.045], font: MZF.dh, pt: 14, color: "#FFFFFF", align: "center", ls: 0.3 }),
        ],
        stickers: [fr.sticker, t.sticker(STK.ticket, 0.9, 0.66, 40, 12), t.sticker(STK.smile, 0.08, 0.64, 36, -12)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.62, 0.32, -4);
      return {
        bg: solid(C.off),
        slots: [fr.slot],
        texts: [
          t.text({ t: "NEXT\nTRIP?", f: [0, 0.06, 1, 0.28], font: MZF.black, pt: 52, align: "center", lh: 1.05 }),
          t.text({ t: "BOOKING SOON", f: [0.2, 0.37, 0.6, 0.065], font: MZF.dh, pt: 14, align: "center", va: "middle", bg: C.lime, ls: 0.14 }),
        ],
        stickers: [fr.sticker, t.sticker(STK.shades, 0.14, 0.2, 42, -12), t.sticker(STK.star, 0.9, 0.3, 26, 10)],
      };
    },
    spine: { bg: solid(C.black), titleFontFamily: MZF.black, titleColor: C.lime },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.95, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 36 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.76, 1, 0.15]);
      return { text: "TRIP ROLL", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: MZF.black, pt: 78 * g.k, color: C.lime, lineHeight: 1.05, letterSpacing: 0.01 };
    },
  },
];
