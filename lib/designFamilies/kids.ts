// 스타일 4 — 키즈 앨범(성장일기): 하늘·버터·블러시·민트 파스텔 + 구름/체크 배경, 둥근 사진 칸(구름·원·하트·꽃잎), 동글동글 서체와 귀여운 동물 스티커.
//   제목 = 주아(Jua, 둥근 굵은체) / 손글씨 = 개구(Gaegu) / 본문 = 고운돋움(Gowun Dodum).
//   세 서체 모두 app/layout.tsx에서 이미 불러오는 서체(OFL)라 새로 추가한 서체는 없어요.
import type { BackgroundSpec } from "../backgroundSpec";
import type { ImageBoxDef } from "../albumTemplates";
import { solid, toolkit, type CoverDesignDef, type InnerDesignDef } from "../designKit";

const FONT = {
  jua: "'Jua', sans-serif",
  hand: "'Gaegu', cursive",
  soft: "'Gowun Dodum', sans-serif",
} as const;
export const KIDS_FONTS: string[] = [FONT.jua, FONT.hand, FONT.soft];

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
  ink: "#4A5568",
  spine: "#BFE0F5",
} as const;

const CLOUDS_SKY: BackgroundSpec = { kind: "graphic", presetId: "g4-clouds-sky" };
const CLOUDS_BLUSH: BackgroundSpec = { kind: "graphic", presetId: "g4-clouds-blush" };
const GING_BUTTER: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-butter" };
const GING_SKY: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-sky" };
const GING_PINK: BackgroundSpec = { kind: "pattern", presetId: "p5-ging-pink" };

const A = (n: number) => `/stickers/animal/animal-sticker-${String(n).padStart(2, "0")}.png`;
const STK = {
  bunny: A(2),
  bear: A(9),
  chick: A(13),
  penguin: A(11),
  fox: A(8),
  pig: A(10),
  lamb: A(17),
  balloons: "/stickers/party/party-02.png",
  bunting: "/stickers/party/party-05.png",
  cupcake: "/stickers/party/party-09.png",
  ribbonPink: "/stickers/ribbon/ribbon-sticker-01.png",
  ribbonBlue: "/stickers/ribbon/ribbon-sticker-02.png",
  medal: "/stickers/badge/medal-01.png",
  heartYellow: "/stickers/icon/icon-heart-07.svg",
  heartPink: "/stickers/icon/icon-heart-02.svg",
  heartBlue: "/stickers/icon/icon-heart-06.svg",
  star: "/stickers/star.svg",
  sparkle: "/stickers/sparkle.svg",
  growWell: "/stickers/baby/hw-grow-well-1.png",
  loveBaby: "/stickers/baby/hw-love-our-baby.png",
  best: "/stickers/baby/hw-our-child-best-2.png",
} as const;

const CLOUD: Partial<ImageBoxDef> = { frameShape: "cloud" };
const HEART: Partial<ImageBoxDef> = { frameShape: "heart" };
const PETAL: Partial<ImageBoxDef> = { frameShape: "flowerPetal" };
const SCALLOP: Partial<ImageBoxDef> = { frameShape: "scallopedCircle" };
const BEAR: Partial<ImageBoxDef> = { frameShape: "bear" };
const CIRCLE: Partial<ImageBoxDef> = { borderRadiusPct: 50, borderWidthPx: 7, borderColor: "#FFFFFF" };
const CARD: Partial<ImageBoxDef> = { borderRadiusPct: 10, borderWidthPx: 7, borderColor: "#FFFFFF" };

export const KIDS_INNER: InnerDesignDef[] = [
  {
    // 1) 오프닝: 구름 모양 사진 + D+100 / 제목 페이지
    id: "kd-opening",
    name: "오프닝",
    note: "구름 사진 1장 + D+100 제목",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_SKY,
        slots: [t.slot([0.03, 0.03, 0.94, 0.62], CLOUD)],
        texts: [
          t.text({ t: "D+100", f: [0.02, 0.69, 0.6, 0.15], font: FONT.jua, pt: 66, color: C.skyDeep, lh: 1.05 }),
          t.text({ t: "100일을 축하해!", f: [0.02, 0.85, 0.7, 0.09], font: FONT.hand, pt: 30, color: C.pink }),
        ],
        stickers: [t.sticker(STK.chick, 0.88, 0.8, 42, 8), t.sticker(STK.sparkle, 0.66, 0.74, 20, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_BUTTER,
        slots: [],
        texts: [
          t.text({ t: "VOL. 01", f: [0.34, 0.32, 0.32, 0.07], font: FONT.jua, pt: 17, color: "#FFFFFF", align: "center", va: "middle", bg: C.skyDeep, radius: 50, ls: 0.1 }),
          t.text({ t: "우리 아기\n성장일기", f: [0, 0.43, 1, 0.27], font: FONT.jua, pt: 54, color: C.pink, align: "center", lh: 1.12 }),
          t.text({ t: "오늘도 쑥쑥 자라는 중", f: [0, 0.74, 1, 0.08], font: FONT.hand, pt: 28, color: C.ink, align: "center" }),
        ],
        stickers: [
          t.sticker(STK.bunting, 0.5, 0.0, 130, 0),
          t.sticker(STK.bunny, 0.16, 0.85, 42, -8),
          t.sticker(STK.balloons, 0.86, 0.82, 46, 6),
        ],
      };
    },
  },
  {
    // 2) 큰 사진 1장 + 오늘의 성장 기록
    id: "kd-photo-caption",
    name: "큰 사진 + 성장 기록",
    note: "꽃잎 사진 1장 + 키·몸무게 기록",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_BLUSH,
        slots: [t.slot([0.04, 0.04, 0.92, 0.92], SCALLOP)],
        texts: [],
        stickers: [t.sticker(STK.ribbonPink, 0.12, 0.08, 40, -12), t.sticker(STK.heartYellow, 0.9, 0.9, 24, 10)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.cream),
        slots: [],
        texts: [
          t.text({ t: "오늘의 성장 기록", f: [0.02, 0.04, 0.96, 0.09], font: FONT.jua, pt: 30, color: C.skyDeep }),
          t.text({ t: "키  72.4cm", f: [0.02, 0.2, 0.47, 0.085], font: FONT.jua, pt: 17, color: C.ink, align: "center", va: "middle", bg: C.sky, radius: 50 }),
          t.text({ t: "몸무게  9.1kg", f: [0.51, 0.2, 0.47, 0.085], font: FONT.jua, pt: 17, color: C.ink, align: "center", va: "middle", bg: C.mint, radius: 50 }),
          t.text({ t: "오늘 새로 한 일", f: [0.02, 0.35, 0.96, 0.06], font: FONT.hand, pt: 22, color: C.pink }),
          t.text({
            t: "뒤집기 성공!\n엄마 아빠 박수 짝짝짝",
            f: [0.02, 0.42, 0.96, 0.2],
            font: FONT.hand,
            pt: 27,
            color: C.ink,
            align: "center",
            va: "middle",
            lh: 1.5,
            bg: C.butter,
            radius: 9,
          }),
          t.text({ t: "2026.10.04", f: [0.02, 0.9, 0.5, 0.06], font: FONT.hand, pt: 19, color: C.ink }),
        ],
        stickers: [t.sticker(STK.fox, 0.86, 0.8, 44, -6), t.sticker(STK.star, 0.14, 0.78, 26, -8)],
      };
    },
  },
  {
    // 3) 사진 2장 + 한마디
    id: "kd-two-quote",
    name: "두 장 + 한마디",
    note: "동그란 사진 + 하트 사진 + 한마디",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.sky),
        slots: [t.slot([0.1, 0.04, 0.8, 0.8], CIRCLE)],
        texts: [t.text({ t: "첫 웃음  D+45", f: [0.2, 0.88, 0.6, 0.08], font: FONT.jua, pt: 17, color: C.ink, align: "center", va: "middle", bg: "#FFFFFF", radius: 50 })],
        stickers: [t.sticker(STK.penguin, 0.92, 0.86, 38, 8), t.sticker(STK.sparkle, 0.1, 0.12, 22, 0)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: solid(C.butter),
        slots: [t.slot([0.08, 0.1, 0.84, 0.62], HEART)],
        texts: [t.text({ t: "하루하루 쑥쑥\n자라는 우리 아기", f: [0, 0.76, 1, 0.18], font: FONT.jua, pt: 28, color: C.pink, align: "center", lh: 1.3 })],
        stickers: [t.sticker(STK.bunny, 0.12, 0.86, 40, -8), t.sticker(STK.heartBlue, 0.88, 0.1, 24, 10)],
      };
    },
  },
  {
    // 4) 사진 3장 + 개월 라벨 + D+100
    id: "kd-strip-date",
    name: "세 장 + D+100",
    note: "사진 3장(1·2·3개월) + 큰 D+100",
    left: (g) => {
      const t = toolkit(g);
      const w = 0.31;
      const gap = (1 - w * 3) / 2;
      const cols = [C.sky, C.blush, C.mint];
      return {
        bg: GING_SKY,
        slots: [0, 1, 2].map((i) => t.slot([i * (w + gap), 0.1, w, 0.31], CARD)),
        texts: [
          ...["1개월", "2개월", "3개월"].map((n, i) =>
            t.text({ t: n, f: [i * (w + gap) + 0.03, 0.45, w - 0.06, 0.07], font: FONT.jua, pt: 16, color: C.ink, align: "center", va: "middle", bg: cols[i], radius: 50 })
          ),
          t.text({ t: "쑥쑥 자란 석 달", f: [0, 0.6, 1, 0.1], font: FONT.jua, pt: 30, color: C.skyDeep, align: "center" }),
        ],
        stickers: [t.sticker(STK.bear, 0.17, 0.88, 40, -6), t.sticker(STK.lamb, 0.5, 0.9, 38, 4), t.sticker(STK.pig, 0.83, 0.88, 40, 6)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_BUTTER,
        slots: [],
        texts: [
          t.text({ t: "D+100", f: [0, 0.14, 1, 0.24], font: FONT.jua, pt: 88, color: C.skyDeep, align: "center", lh: 1.05 }),
          t.text({ t: "100일의 기적", f: [0.2, 0.43, 0.6, 0.085], font: FONT.jua, pt: 20, color: "#FFFFFF", align: "center", va: "middle", bg: C.pink, radius: 50 }),
          t.text({ t: "첫 뒤집기 · 첫 웃음 · 첫 이유식\n엄마 아빠도 함께 자란 100일", f: [0.04, 0.58, 0.92, 0.14], font: FONT.hand, pt: 23, color: C.ink, align: "center", lh: 1.6 }),
        ],
        stickers: [t.sticker(STK.medal, 0.5, 0.86, 50, 0), t.sticker(STK.balloons, 0.14, 0.2, 40, -8), t.sticker(STK.ribbonBlue, 0.88, 0.16, 40, 12)],
      };
    },
  },
  {
    // 5) 통통 모양 모음: 키 큰 아치·곰 얼굴·점선 동그라미(왼쪽 3장), 물방울 모양·고양이 얼굴(오른쪽 2장)을 체크 무늬 위에 통통 어긋나게 놓은 모양.
    //    마무리 장(구름·하트·꽃잎)과 모양이 겹치지 않게 아치·동물 얼굴을 써요. 사진 칸 순서: 키 큰 아치가 맨 앞이라 사진이 1장만 남아도 먼저 들어가요.
    id: "kd-collage",
    name: "통통 모양 모음",
    note: "아치·곰·고양이 모양 사진 5장 + 스티커",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_SKY,
        slots: [
          t.slot([0, 0.1, 0.46, 0.78], { frameShape: "arch", borderWidthPx: 7, borderColor: "#FFFFFF" }),
          t.slot([0.54, 0.02, 0.46, 0.46], BEAR),
          t.slot([0.56, 0.54, 0.4, 0.4], { borderRadiusPct: 50, borderWidthPx: 10, borderColor: C.pink, frameBorderPattern: "dot" }),
        ],
        texts: [t.text({ t: "오늘의 나들이", f: [0, 0.91, 0.46, 0.075], font: FONT.jua, pt: 17, color: "#FFFFFF", align: "center", va: "middle", bg: C.skyDeep, radius: 50 })],
        stickers: [t.sticker(STK.sparkle, 0.07, 0.07, 26, -8), t.sticker(STK.heartPink, 0.51, 0.5, 22, 10), t.sticker(STK.chick, 0.5, 0.92, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_PINK,
        slots: [
          t.slot([0.06, 0.02, 0.58, 0.58], { frameShape: "organicScallop", rotation: -5 }),
          t.slot([0.5, 0.5, 0.46, 0.46], { frameShape: "cat", rotation: 6 }),
        ],
        texts: [t.text({ t: "방긋방긋\n웃는 날", f: [0.02, 0.64, 0.44, 0.26], font: FONT.jua, pt: 32, color: C.pink, lh: 1.3 })],
        stickers: [t.sticker(STK.star, 0.84, 0.1, 26, 10), t.sticker(STK.heartYellow, 0.78, 0.34, 24, -8), t.sticker(STK.bunny, 0.4, 0.92, 32, 8)],
      };
    },
  },
  {
    // 6) 모양 사진 모음: 구름·동그라미·하트·꽃잎·물결 원 모양 사진 5장을 통통 튀게 어긋나게 놓고 동물·하트 스티커를 곁들인 모양.
    //    작별 인사(고마워·또 만나요)는 맨 마지막 소개 페이지가 말해요. 구름 사진이 맨 앞 칸이라 사진이 1장만 남아도 큰 칸에 먼저 들어가요.
    id: "kd-closing",
    name: "모양 사진 마무리",
    note: "모양 사진 5장(구름·하트·꽃잎…) + 한마디·날짜",
    left: (g) => {
      const t = toolkit(g);
      return {
        bg: GING_BUTTER,
        slots: [t.slot([0.2, 0.44, 0.8, 0.52], CLOUD), t.slot([0, 0.06, 0.42, 0.42], CIRCLE)],
        texts: [t.text({ t: "오늘의 한 컷!", f: [0.48, 0.1, 0.5, 0.1], font: FONT.jua, pt: 18, color: "#FFFFFF", align: "center", va: "middle", bg: C.pink, radius: 50 })],
        stickers: [t.sticker(STK.bunny, 0.1, 0.84, 38, -8), t.sticker(STK.heartYellow, 0.56, 0.32, 22, -8), t.sticker(STK.star, 0.9, 0.3, 24, 10), t.sticker(STK.penguin, 0.9, 0.93, 34, 8)],
      };
    },
    right: (g) => {
      const t = toolkit(g);
      return {
        bg: CLOUDS_BLUSH,
        slots: [
          t.slot([0.04, 0.3, 0.52, 0.52], { ...HEART, rotation: -6 }),
          t.slot([0.5, 0.04, 0.46, 0.4], { ...PETAL, rotation: 8 }),
          t.slot([0.58, 0.52, 0.38, 0.38], SCALLOP),
        ],
        texts: [t.text({ t: "2026.10.04", f: [0.04, 0.89, 0.4, 0.075], font: FONT.jua, pt: 14, color: C.ink, align: "center", va: "middle", bg: "#FFFFFF", radius: 50 })],
        stickers: [t.sticker(STK.chick, 0.2, 0.13, 36, -6), t.sticker(STK.sparkle, 0.44, 0.22, 22, 0), t.sticker(STK.heartPink, 0.9, 0.95, 22, 10)],
      };
    },
  },
];

export const KIDS_COVER: CoverDesignDef = {
  id: "kd-cover",
  name: "키즈 앨범",
  note: "구름 사진 + 우리 아기 성장일기 + 하늘색 책등·민트 뒤표지",
  front: (g) => {
    const t = toolkit(g);
    return {
      bg: CLOUDS_SKY,
      slots: [t.slot([0.08, 0.2, 0.84, 0.4], CLOUD)],
      texts: [t.text({ t: "D+100  ·  첫 걸음을 응원해", f: [0.14, 0.8, 0.72, 0.075], font: FONT.jua, pt: 16, color: C.ink, align: "center", va: "middle", bg: C.butter, radius: 50 })],
      stickers: [
        t.sticker(STK.bunting, 0.5, 0.0, 72, 0),
        t.sticker(STK.bunny, 0.14, 0.6, 40, -8),
        t.sticker(STK.chick, 0.88, 0.58, 36, 8),
        t.sticker(STK.balloons, 0.9, 0.14, 42, 8),
      ],
    };
  },
  back: (g) => {
    const t = toolkit(g);
    return {
      bg: GING_PINK,
      slots: [t.slot([0.3, 0.08, 0.4, 0.4], CIRCLE)],
      texts: [
        t.text({ t: "쑥쑥 자라는 중!", f: [0, 0.54, 1, 0.1], font: FONT.jua, pt: 32, color: C.pink, align: "center" }),
        t.text({ t: "우리 아기의 첫 한 해 이야기", f: [0, 0.66, 1, 0.06], font: FONT.soft, pt: 16, color: C.ink, align: "center" }),
      ],
      stickers: [t.sticker(STK.bear, 0.17, 0.82, 40, -6), t.sticker(STK.penguin, 0.83, 0.82, 40, 6)],
    };
  },
  spine: { bg: solid(C.spine), titleFontFamily: FONT.jua, titleColor: "#2B638D" }, // 46차: 책등 배경(#BFE0F5) 대비 4.08 → 4.64
  backLogo: (g) => {
    const t = toolkit(g);
    const r = t.r([0, 0.95, 1, 0]);
    return { xPct: r.xPct + r.widthPct / 2, yPct: r.yPct, scalePct: 40 };
  },
  title: (g) => {
    const t = toolkit(g);
    const f = t.r([0, 0.66, 1, 0.11]);
    return {
      text: "우리 아기 성장일기",
      xPct: f.xPct,
      yPct: f.yPct,
      widthPct: f.widthPct,
      fontFamily: FONT.jua,
      pt: 40 * g.k,
      color: C.skyDeep,
      lineHeight: 1.15,
      letterSpacing: 0.01,
    };
  },
};
