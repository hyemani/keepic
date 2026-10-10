// 테마 "생일" 새 디자인 — 키즈 4종(오늘은 3살·촛불 소원·파티·해마다 쑥쑥) + MZ 3종(D-DAY·나이 숫자·PARTY MODE) + 표지 2종(키즈·MZ).
// 서체·스티커·배경은 기존 스타일 파일과 같은 것만 써요. 모든 자리는 접히는 선 20mm 안쪽을 지켜요.
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { solid, toolkit as kitToolkit, type CoverDesignDef, type DesignGeo, type InnerDesignDef } from "../designKit";

const KD = { jua: "'Jua', sans-serif", hand: "'Gaegu', cursive", soft: "'Gowun Dodum', sans-serif" } as const;
const MZF = { black: "'Black Han Sans', sans-serif", dh: "'Do Hyeon', sans-serif", sans: "Pretendard, sans-serif" } as const;

const C = {
  cream: "#FFFCF3",
  sky: "#DCEFFB",
  skyDeep: "#4E9ED8",
  butter: "#FFF3C4",
  butterDeep: "#F2B93B",
  blush: "#FFE3E8",
  pink: "#EE7E97",
  mint: "#D6F2E6",
  mintDeep: "#3FAE8A",
  kInk: "#4A5568",
  black: "#111111",
  off: "#F2F0EA",
  lime: "#CCFF00",
  white: "#FFFFFF",
  mzGray: "#8D8D86",
} as const;
const CLOUDS_SKY: BackgroundSpec = { kind: "graphic", presetId: "g4-clouds-sky" };
const CLOUDS_BLUSH: BackgroundSpec = { kind: "graphic", presetId: "g4-clouds-blush" };
const GING_BUTTER: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-butter" };
const GING_SKY: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-sky" };
const GING_PINK: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-pink" };
const CLOUD: Partial<ImageBoxDef> = { frameShape: "cloud" };
const HEART: Partial<ImageBoxDef> = { frameShape: "heart" };
const SCALLOP: Partial<ImageBoxDef> = { frameShape: "scallopedCircle" };
const CIRCLE: Partial<ImageBoxDef> = { borderRadiusPct: 50, borderWidthPx: 7, borderColor: "#FFFFFF" };
const CARD: Partial<ImageBoxDef> = { borderRadiusPct: 10, borderWidthPx: 7, borderColor: "#FFFFFF" };

const A = (n: number) => `/stickers/animal/animal-sticker-${String(n).padStart(2, "0")}.png`;
const STK = {
  bunny: A(2),
  bear: A(9),
  chick: A(13),
  penguin: A(11),
  balloons: "/stickers/party/party-02.png",
  balloon: "/stickers/party/party-01.png",
  popper: "/stickers/party/party-03.png",
  hat: "/stickers/party/party-04.png",
  bunting: "/stickers/party/party-05.png",
  gift: "/stickers/party/party-06.png",
  cupcake: "/stickers/party/party-09.png",
  disco: "/stickers/party/party-10.png",
  fireworks: "/stickers/party/party-fireworks-02.png",
  happyBirthday: "/stickers/birthday/hw2-happy-birthday.png",
  makeAWish: "/stickers/phrase/phrase-en-06.png",
  star: "/stickers/star.svg",
  sparkle: "/stickers/sparkle.svg",
  bolt: "/stickers/season/party-sticker-08.svg",
  shades: "/stickers/season/party-sticker-03.svg",
  smile: "/stickers/season/party-sticker-01.svg",
  ticket: "/stickers/season/party-sticker-02.svg",
  pizza: "/stickers/season/party-sticker-09.svg",
  tapePink: "/stickers/tape/tape-sticker-01.png",
} as const;
const WISH_ASPECT = 900 / 450;

const toolkit = (g: DesignGeo) => kitToolkit(g, C.kInk);
const KM = { style: "kids", themes: ["birthday" as const] };
const ZM = { style: "mz", themes: ["birthday" as const] };

export const BIRTHDAY_INNER: InnerDesignDef[] = [
  {
    ...KM,
    id: "kd-birthday-age",
    name: "오늘은 3살!",
    note: "큰 나이 숫자 + 풍선·모자 + 구름 사진",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_BLUSH,
        slots: [],
        texts: [
          t.text({ t: "HAPPY\nBIRTHDAY", f: [0, 0.03, 0.7, 0.2], font: KD.jua, pt: 46, color: C.pink, lh: 1.05 }),
          t.text({ t: "3", f: [0.05, 0.2, 0.6, 0.62], font: KD.jua, pt: 330, color: C.skyDeep, lh: 0.95, align: "center" }),
          t.text({ t: "오늘의 주인공은 바로 나!", f: [0, 0.82, 1, 0.08], font: KD.hand, pt: 28, align: "center" }),
        ],
        stickers: [t.sticker(STK.balloons, 0.84, 0.3, 70, 6), t.sticker(STK.hat, 0.16, 0.74, 40, -10), t.sticker(STK.sparkle, 0.7, 0.62, 22, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_BUTTER,
        slots: [t.slot([0.03, 0.04, 0.94, 0.66], CLOUD)],
        texts: [
          t.text({ t: "축하해, 축하해!", f: [0, 0.75, 1, 0.1], font: KD.jua, pt: 36, color: C.pink, align: "center" }),
          t.text({ t: "2026.10.04  ·  세 번째 생일", f: [0.12, 0.88, 0.76, 0.065], font: KD.jua, pt: 14, color: C.kInk, align: "center", va: "middle", bg: "#FFFFFF", radius: 50 }),
        ],
        stickers: [t.sticker(STK.bear, 0.1, 0.78, 38, -8), t.sticker(STK.cupcake, 0.9, 0.78, 36, 8)],
      };
    },
  },
  {
    ...KM,
    id: "kd-birthday-cake",
    name: "촛불을 후~",
    note: "큰 사진 1장 + 케이크 + Make a wish",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.sky),
        slots: [t.slot([0, 0.03, 1, 0.66], { ...CARD, borderRadiusPct: 6 })],
        texts: [
          t.text({ t: "촛불을 후~", f: [0, 0.75, 1, 0.11], font: KD.jua, pt: 40, color: C.skyDeep, align: "center" }),
          t.text({ t: "소원은 비밀이에요", f: [0, 0.88, 1, 0.07], font: KD.hand, pt: 25, align: "center" }),
        ],
        stickers: [t.sticker(STK.bunting, 0.5, 0.0, 100, 0), t.sticker(STK.cupcake, 0.9, 0.72, 40, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.cream),
        slots: [t.slot([0.02, 0.06, 0.44, 0.44], CIRCLE), t.slot([0.54, 0.06, 0.44, 0.44], CIRCLE)],
        texts: [
          t.text({ t: "소원 하나, 둘, 셋", f: [0, 0.78, 1, 0.09], font: KD.jua, pt: 26, color: C.pink, align: "center" }),
          t.text({ t: "건강하게 쑥쑥 자라기\n오늘도 많이 웃기", f: [0, 0.88, 1, 0.1], font: KD.soft, pt: 12.5, align: "center", lh: 1.6 }),
        ],
        stickers: [t.sticker(STK.makeAWish, 0.5, 0.64, 120, 0, WISH_ASPECT), t.sticker(STK.hat, 0.5, 0.28, 34, 8)],
      };
    },
  },
  {
    ...KM,
    id: "kd-birthday-party",
    name: "신나는 파티",
    note: "사진 4장 + PARTY TIME + 풍선·선물",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_SKY,
        slots: [t.slot([0, 0.09, 0.58, 0.42], CARD), t.slot([0.62, 0.09, 0.38, 0.2], CARD), t.slot([0.62, 0.31, 0.38, 0.2], CARD)],
        texts: [
          t.text({ t: "PARTY TIME!", f: [0, 0.57, 1, 0.12], font: KD.jua, pt: 46, color: C.skyDeep, align: "center" }),
          t.text({ t: "친구들과 함께한 우리 집 생일 파티", f: [0, 0.72, 1, 0.06], font: KD.soft, pt: 12.5, align: "center" }),
        ],
        stickers: [t.sticker(STK.bunting, 0.5, 0.0, 100, 0), t.sticker(STK.gift, 0.12, 0.9, 40, -8), t.sticker(STK.balloons, 0.88, 0.88, 50, 6)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.butter),
        slots: [t.slot([0.08, 0.06, 0.84, 0.62], HEART)],
        texts: [
          t.text({ t: "생일 축하해!", f: [0, 0.74, 1, 0.1], font: KD.jua, pt: 38, color: C.pink, align: "center" }),
          t.text({ t: "2026.10.04", f: [0.3, 0.87, 0.4, 0.065], font: KD.jua, pt: 15, color: C.kInk, align: "center", va: "middle", bg: "#FFFFFF", radius: 50 }),
        ],
        stickers: [t.sticker(STK.popper, 0.12, 0.84, 38, -10), t.sticker(STK.chick, 0.88, 0.88, 36, 8)],
      };
    },
  },
  {
    ...KM,
    id: "kd-birthday-years",
    name: "해마다 쑥쑥",
    note: "해마다 사진 3장(1살·2살·3살) + 케이크 사진",
    left: (g) => {
      const t = toolkit(g);
      const w = 0.31;
      const gap = (1 - w * 3) / 2;
      const xs = [0, w + gap, 2 * (w + gap)];
      return {
        bg: GING_PINK,
        slots: xs.map((x) => t.slot([x, 0.14, w, 0.46], CARD)),
        texts: [
          t.text({ t: "해마다 쑥쑥", f: [0, 0.01, 1, 0.1], font: KD.jua, pt: 32, color: C.pink, align: "center" }),
          ...["1살", "2살", "3살"].map((a, i) => t.text({ t: a, f: [xs[i] + 0.04, 0.63, w - 0.08, 0.065], font: KD.jua, pt: 17, color: "#FFFFFF", align: "center", va: "middle", bg: i === 2 ? C.pink : C.skyDeep, radius: 50 })),
          t.text({ t: "작았던 손이 이만큼 컸어요", f: [0, 0.76, 1, 0.07], font: KD.hand, pt: 26, align: "center" }),
        ],
        stickers: [t.sticker(STK.bunny, 0.12, 0.92, 34, -8), t.sticker(STK.penguin, 0.88, 0.92, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_SKY,
        slots: [t.slot([0.14, 0.05, 0.72, 0.56], SCALLOP)],
        texts: [
          t.text({ t: "Happy 3rd Birthday", f: [0, 0.7, 1, 0.1], font: KD.jua, pt: 30, color: C.skyDeep, align: "center" }),
          t.text({ t: "사랑하는 우리 아가, 생일 축하해", f: [0, 0.82, 1, 0.07], font: KD.soft, pt: 13, align: "center" }),
        ],
        stickers: [t.sticker(STK.cupcake, 0.14, 0.84, 38, -8), t.sticker(STK.balloon, 0.88, 0.82, 38, 6), t.sticker(STK.star, 0.86, 0.08, 22, 10)],
      };
    },
  },
  {
    ...ZM,
    id: "mz-birthday-dday",
    name: "D-DAY",
    note: "블랙 D-DAY 숫자 + 큰 사진 + 라임 라벨",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [],
        texts: [
          t.text({ t: "BIRTHDAY", f: [0, 0.01, 0.5, 0.06], font: MZF.dh, pt: 18, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.12 }),
          t.text({ t: "D-DAY", f: [0, 0.1, 1, 0.2], font: MZF.black, pt: 112, color: C.lime, lh: 1.0 }),
          t.text({ t: "10.04", f: [0, 0.34, 1, 0.3], font: MZF.black, pt: 150, color: C.white, lh: 1.0 }),
          t.text({ t: "오늘은 내가 주인공", f: [0, 0.74, 1, 0.07], font: MZF.dh, pt: 24, color: C.white }),
          t.text({ t: "2026  /  SAT  /  PARTY ON", f: [0, 0.9, 0.9, 0.045], font: MZF.sans, pt: 10, color: C.mzGray, bold: true, ls: 0.2 }),
        ],
        stickers: [t.sticker(STK.hat, 0.86, 0.14, 44, 10), t.sticker(STK.sparkle, 0.9, 0.5, 22, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.off),
        slots: [t.slot([0, 0, 1, 0.7])],
        texts: [
          t.text({ t: "LEVEL UP", f: [0, 0.74, 1, 0.14], font: MZF.black, pt: 58, color: C.black, lh: 1.0 }),
          t.text({ t: "NEW AGE UNLOCKED", f: [0, 0.89, 0.6, 0.065], font: MZF.dh, pt: 15, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.1 }),
        ],
        stickers: [t.sticker(STK.disco, 0.88, 0.76, 50, 6), t.sticker(STK.star, 0.1, 0.64, 24, -10)],
      };
    },
  },
  {
    ...ZM,
    id: "mz-birthday-age",
    name: "나이 숫자 29",
    note: "라임 면 큰 숫자 + 블랙 면 사진 2장",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.lime),
        slots: [],
        texts: [
          t.text({ t: "HAPPY BDAY", f: [0, 0.01, 1, 0.07], font: MZF.dh, pt: 24, color: C.black, ls: 0.14 }),
          t.text({ t: "29", f: [0, 0.1, 1, 0.58], font: MZF.black, pt: 300, color: C.black, lh: 0.95, align: "center" }),
          t.rule([0, 0.74, 1, 0.005], C.black),
          t.text({ t: "스물아홉, 아직 청춘", f: [0, 0.77, 1, 0.09], font: MZF.black, pt: 30, color: C.black }),
          t.text({ t: "다음 레벨까지 365일 남음", f: [0, 0.88, 0.9, 0.06], font: MZF.sans, pt: 11.5, color: C.black, bold: true }),
        ],
        stickers: [t.sticker(STK.shades, 0.86, 0.9, 44, -10), t.sticker(STK.bolt, 0.88, 0.12, 36, 12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0, 0.03, 0.62, 0.52]), t.slot([0.38, 0.4, 0.62, 0.52])],
        texts: [
          t.text({ t: "CHEERS", f: [0, 0.6, 0.36, 0.1], font: MZF.black, pt: 26, color: C.lime, lh: 1.0 }),
          t.text({ t: "NO.29", f: [0, 0.74, 0.3, 0.05], font: MZF.dh, pt: 13, color: C.lime, ls: 0.12 }),
        ],
        stickers: [t.sticker(STK.pizza, 0.14, 0.88, 38, 12), t.sticker(STK.sparkle, 0.9, 0.04, 22, 0)],
      };
    },
  },
  {
    ...ZM,
    id: "mz-birthday-party",
    name: "PARTY MODE",
    note: "폴라로이드 1장 + 어긋난 사진 3장 + 스티커 폭탄",
    left: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.47, 0.7, -3);
      return {
        bg: solid(C.off),
        slots: [fr.slot],
        texts: [t.text({ t: "PARTY MODE : ON", f: [0, 0.94, 0.7, 0.05], font: MZF.dh, pt: 15, ls: 0.14 })],
        stickers: [fr.sticker, t.sticker(STK.tapePink, 0.2, 0.04, 34, -28), t.sticker(STK.disco, 0.88, 0.88, 46, 6), t.sticker(STK.hat, 0.1, 0.88, 34, -12)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.black),
        slots: [t.slot([0, 0.03, 0.48, 0.36]), t.slot([0.52, 0.15, 0.48, 0.36]), t.slot([0.16, 0.56, 0.5, 0.32])],
        texts: [
          t.text({ t: "2026.10.04", f: [0.68, 0.62, 0.32, 0.065], font: MZF.dh, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.08 }),
          t.text({ t: "OPEN BAR", f: [0.68, 0.72, 0.32, 0.06], font: MZF.black, pt: 17, color: C.white }),
        ],
        stickers: [t.sticker(STK.popper, 0.9, 0.9, 40, 12), t.sticker(STK.star, 0.08, 0.46, 24, -10)],
      };
    },
  },
];

export const BIRTHDAY_COVERS: CoverDesignDef[] = [
  {
    ...KM,
    id: "kd-birthday-cover",
    name: "HAPPY BIRTHDAY",
    note: "구름 사진 + 풍선·케이크 + 하늘색 책등·핑크 체크 뒤표지",
    front: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_SKY,
        slots: [t.slot([0.08, 0.2, 0.84, 0.4], CLOUD)],
        texts: [t.text({ t: "오늘은 세 번째 생일!", f: [0.14, 0.84, 0.72, 0.075], font: KD.jua, pt: 16, color: C.kInk, align: "center", va: "middle", bg: C.butter, radius: 50 })],
        stickers: [t.sticker(STK.bunting, 0.5, 0.0, 72, 0), t.sticker(STK.hat, 0.14, 0.54, 38, -10), t.sticker(STK.cupcake, 0.88, 0.54, 36, 8), t.sticker(STK.balloons, 0.9, 0.14, 42, 8)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_PINK,
        slots: [t.slot([0.3, 0.08, 0.4, 0.4], CIRCLE)],
        texts: [
          t.text({ t: "축하해, 사랑해!", f: [0, 0.54, 1, 0.1], font: KD.jua, pt: 32, color: C.pink, align: "center" }),
          t.text({ t: "오늘의 주인공에게", f: [0, 0.66, 1, 0.06], font: KD.soft, pt: 16, align: "center" }),
        ],
        stickers: [t.sticker(STK.gift, 0.17, 0.82, 40, -6), t.sticker(STK.bear, 0.83, 0.82, 40, 6)],
      };
    },
    spine: { bg: solid("#BFE0F5"), titleFontFamily: KD.jua, titleColor: "#2F6C99" },
    backLogo: (g) => {
      const t = toolkit(g);
      const r = t.r([0, 0.95, 1, 0]);
      return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 40 };
    },
    title: (g) => {
      const t = toolkit(g);
      const f = t.r([0, 0.69, 1, 0.11]);
      return { text: "HAPPY BIRTHDAY", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: KD.jua, pt: 40 * g.k, color: C.pink, lineHeight: 1.15, letterSpacing: 0.01 };
    },
  },
  {
    ...ZM,
    id: "mz-birthday-cover",
    name: "HAPPY BDAY",
    note: "블랙 + 폴라로이드 + 라임 HAPPY BDAY + 뒤표지 SEE YOU NEXT PARTY",
    front: (g) => {
      const t = toolkit(g);
      const fr = t.framed("polaroid", 0.5, 0.36, 0.5, 3);
      return {
        bg: solid(C.black),
        slots: [fr.slot],
        texts: [
          t.text({ t: "29TH EDITION", f: [0, 0, 0.36, 0.065], font: MZF.black, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.04 }),
          t.text({ t: "2026.10.04", f: [0.62, 0, 0.38, 0.065], font: MZF.dh, pt: 14, color: C.black, align: "center", va: "middle", bg: C.lime, ls: 0.1 }),
          t.text({ t: "PARTY  ON  —  NO.29", f: [0, 0.93, 1, 0.045], font: MZF.dh, pt: 14, color: C.white, align: "center", ls: 0.3 }),
        ],
        stickers: [fr.sticker, t.sticker(STK.disco, 0.9, 0.6, 40, 8), t.sticker(STK.hat, 0.1, 0.58, 34, -12)],
      };
    },
    back: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.lime),
        slots: [],
        texts: [
          t.text({ t: "SEE YOU\nNEXT PARTY", f: [0, 0.16, 1, 0.3], font: MZF.black, pt: 50, color: C.black, align: "center", lh: 1.05 }),
          t.text({ t: "HBD ROLL 29  END", f: [0.2, 0.52, 0.6, 0.065], font: MZF.dh, pt: 14, color: C.lime, align: "center", va: "middle", bg: C.black, ls: 0.14 }),
        ],
        stickers: [t.sticker(STK.shades, 0.16, 0.78, 44, -12), t.sticker(STK.bolt, 0.84, 0.74, 36, 12)],
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
      const f = t.r([0, 0.72, 1, 0.15]);
      return { text: "HAPPY BDAY", xPct: f.xPct, yPct: f.yPct, widthPct: f.widthPct, fontFamily: MZF.black, pt: 70 * g.k, color: C.lime, lineHeight: 1.05, letterSpacing: 0.01 };
    },
  },
];
