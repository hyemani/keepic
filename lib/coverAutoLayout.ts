// "AI 맞춤 레이아웃"의 표지 고르기(2026-10, 45차). 내지 자동 배치(lib/albumRefillPlan 등)와 별개로 "표지답게 마무리된 구성"만 후보로 두고,
// 올린 사진 수·가로/세로 모양·표지 종류(소프트/하드)·책 크기로 점수를 매겨 하나를 골라요. 같은 입력이면 항상 같은 결과예요(무작위 없음).
//
// 규칙 요약
//  1) 후보는 모두 "안전 영역"(책등 쪽 = 접힘 안전 20mm + 숨 쉴 자리 8mm = 28mm, 바깥쪽 = 재단선에서 15mm) 안에서만 그려요 → 책등에 붙는 후보가 없어요.
//     (lib/designKit.ts coverDesignGeo가 표지 디자인과 같은 안전 영역을 줘요)
//  2) 사진을 표지 전체에 꽉 채우는 후보는 없어요 — 사진 + 제목 자리 + 여백이 있는 "마무리된" 구성만 있어요(제목은 사진 아래/위에 따로 자리가 있어요).
//  3) 점수 = 칸에 사진이 꽉 채워 들어갈 때 "보이는 비율"(lib/photoSlotFit.ts visibleFraction)의 평균
//        − 0.25 (어느 사진이든 보이는 비율이 0.55 미만이면) + 표지 종류 가산점(소프트: 가로 구성 +0.03, 하드: 액자형 +0.03)
//     2장 구성은 사진이 4장 이상 올라왔고 두 장 모두 0.62 이상 보이며, 1장 구성의 최고 점수보다 0.12 이상 앞설 때만 골라져요
//        (표지에 사진을 두 장 쓰면 내지에 쓸 사진이 한 장 줄어서, 확실히 더 잘 맞을 때만 써요).
//     동점이면 후보 순서(앞선 것)가 이겨요.
//  4) 책등을 가로지르는 사진은 만들 수 없어요(앞·뒤표지는 서로 다른 칸이라서). 대신 "책등 이음"은 배경(좌우 분할 + 책등 이음띠, lib/coverSpine.ts)이 맡아요.
//  5) 뒤표지는 보조 면이에요 — 사진 없이 키픽 로고만 두고, 앞표지가 주인공이에요.
import { coverDesignGeo } from "./designKit";
import { clearanceFor, type CoverElementRole } from "./coverSpine";
import { assignPhotosToSlots, slotAspectOf, visibleFraction } from "./photoSlotFit";

export type AutoCoverCandidateId = "hero-wide" | "hero-portrait" | "hero-frame" | "hero-band" | "title-top" | "split-cols" | "split-stagger";

export type AutoCoverSlot = { xPct: number; yPct: number; widthPct: number; heightPct: number; photoIndex: number };
export type AutoCoverPlan = {
  id: AutoCoverCandidateId;
  /** 앞표지에 쓰는 사진 수(읽는 순서 앞에서부터). 나머지는 내지로 가요. */
  photoCount: number;
  slots: AutoCoverSlot[];
  title: { xPct: number; yPct: number; widthPct: number; pt: number; color: string };
  /** 책등 이음띠가 있는 좌우 분할(true)인지, 단색 종이색(false)인지 */
  bridge: boolean;
  score: number;
  visible: number[]; // 칸마다 사진이 보이는 비율
  ranking: { id: AutoCoverCandidateId; score: number }[];
};

export type AutoCoverInput = {
  photoAspects: readonly (number | null)[]; // 이번에 올린 사진들(읽는 순서)의 가로/세로 비, 모르면 null
  panelMm: number;
  bleedMm: number;
  cover: "soft" | "hard";
};

export const AUTO_COVER_MIN_VISIBLE = 0.55;
const TWO_PHOTO_MIN_BATCH = 4;
const TWO_PHOTO_MIN_VISIBLE = 0.62;
const TWO_PHOTO_MARGIN = 0.12;
const TITLE_COLOR = "#1F2937";

type Frac = [number, number, number, number]; // 안전 영역 대비 x,y,w,h (0~1)
type Candidate = {
  id: AutoCoverCandidateId;
  slots: Frac[];
  title: { y: number; h: number };
  bridge: boolean;
  framed: boolean; // 액자형(사방 여백이 큰 구성) — 하드커버 가산
  wide: boolean; // 가로 구성 — 소프트커버 가산
  // 사진 칸의 책등 쪽 여백 규칙(46차, lib/coverSpine.ts): 주인공 사진 한 장 = photo-hero(28mm), 두 장 구성 = photo-structure(22mm). 제목 자리는 항상 글 규칙(28mm)이에요.
  role: CoverElementRole;
};

// 후보 순서 = 동점일 때 우선순위. 제목 자리(title.y/h)는 사진과 겹치지 않아요.
const CANDIDATES: Candidate[] = [
  { id: "hero-wide", slots: [[0, 0.05, 1, 0.74]], title: { y: 0.83, h: 0.14 }, bridge: false, framed: false, wide: true, role: "photo-hero" },
  { id: "hero-frame", slots: [[0.07, 0.05, 0.86, 0.75]], title: { y: 0.85, h: 0.12 }, bridge: true, framed: true, wide: false, role: "photo-hero" },
  { id: "hero-portrait", slots: [[0.17, 0.04, 0.66, 0.76]], title: { y: 0.85, h: 0.12 }, bridge: true, framed: true, wide: false, role: "photo-hero" },
  { id: "hero-band", slots: [[0, 0.22, 1, 0.46]], title: { y: 0.74, h: 0.16 }, bridge: false, framed: false, wide: true, role: "photo-hero" },
  { id: "title-top", slots: [[0.1, 0.26, 0.8, 0.68]], title: { y: 0.07, h: 0.15 }, bridge: true, framed: true, wide: false, role: "photo-hero" },
  { id: "split-cols", slots: [[0, 0.05, 0.48, 0.72], [0.52, 0.05, 0.48, 0.72]], title: { y: 0.84, h: 0.13 }, bridge: true, framed: true, wide: false, role: "photo-structure" },
  { id: "split-stagger", slots: [[0, 0.04, 0.62, 0.36], [0.38, 0.44, 0.62, 0.36]], title: { y: 0.87, h: 0.11 }, bridge: false, framed: false, wide: true, role: "photo-structure" },
];

export const AUTO_COVER_CANDIDATE_IDS: AutoCoverCandidateId[] = CANDIDATES.map((c) => c.id);

export function planAutoCover(input: AutoCoverInput): AutoCoverPlan {
  const g = coverDesignGeo("front", input.panelMm, input.bleedMm);
  const frameAspect = g.W / g.H;
  // 사진 칸은 역할별 책등 쪽 시작선에서(주인공 28mm / 구성 22mm), 제목 자리는 글 규칙(28mm = g.x0)에서 시작해요.
  // 좌우가 균형 잡히도록 바깥쪽 끝도 재단선에서 같은 거리만큼 안쪽이에요(접힘선 쪽 여백 = 재단선 쪽 여백, 46차). 예전엔 바깥쪽이 재단선 15mm라 28mm와 13mm 차이가 났어요.
  const toPanel = (f: Frac, role: CoverElementRole = "text") => {
    const x0 = Math.min(g.x0, clearanceFor(role));
    const sw = g.W - input.bleedMm - x0 - x0;
    return {
      xPct: ((x0 + f[0] * sw) / g.W) * 100,
      yPct: ((g.y0 + f[1] * g.sh) / g.H) * 100,
      widthPct: ((f[2] * sw) / g.W) * 100,
      heightPct: ((f[3] * g.sh) / g.H) * 100,
    };
  };
  const n = input.photoAspects.length;
  const ranking: { id: AutoCoverCandidateId; score: number; cand: Candidate; assign: number[]; visible: number[] }[] = [];
  for (const cand of CANDIDATES) {
    const k = cand.slots.length;
    if (k > n) continue;
    if (k >= 2 && n < TWO_PHOTO_MIN_BATCH) continue;
    const slots = cand.slots.map((f) => toPanel(f, cand.role));
    const slotAsp = slots.map((s) => slotAspectOf(s, frameAspect));
    const assign = assignPhotosToSlots(input.photoAspects.slice(0, k), slotAsp);
    const visible = slots.map((_, s) => visibleFraction(input.photoAspects[assign[s]] ?? null, slotAsp[s]));
    if (k >= 2 && Math.min(...visible) < TWO_PHOTO_MIN_VISIBLE) continue;
    let score = visible.reduce((a, b) => a + b, 0) / k;
    if (Math.min(...visible) < AUTO_COVER_MIN_VISIBLE) score -= 0.25;
    if (input.cover === "hard" && cand.framed) score += 0.03;
    if (input.cover === "soft" && cand.wide) score += 0.03;
    ranking.push({ id: cand.id, score, cand, assign, visible });
  }
  // 2장 구성은 1장 구성 최고 점수보다 충분히 앞설 때만 남겨요.
  const bestSingle = Math.max(-Infinity, ...ranking.filter((r) => r.cand.slots.length === 1).map((r) => r.score));
  for (let i = ranking.length - 1; i >= 0; i--) if (ranking[i].cand.slots.length >= 2 && ranking[i].score < bestSingle + TWO_PHOTO_MARGIN) ranking.splice(i, 1);
  // 사진이 0장이면(호출하는 쪽이 막지만) 안전하게 첫 후보의 빈 칸 구성을 돌려줘요.
  if (ranking.length === 0) {
    const cand = CANDIDATES[0];
    ranking.push({ id: cand.id, score: 0, cand, assign: [0], visible: [NaN] });
  }
  let best = ranking[0];
  for (const r of ranking) if (r.score > best.score + 1e-9) best = r;
  const cand = best.cand;
  const t = toPanel([0, cand.title.y, 1, cand.title.h]);
  return {
    id: cand.id,
    photoCount: cand.slots.length,
    slots: cand.slots.map((f, s) => ({ ...toPanel(f, cand.role), photoIndex: best.assign[s] ?? s })),
    title: { xPct: t.xPct, yPct: t.yPct, widthPct: t.widthPct, pt: Math.round(30 * g.k * 10) / 10, color: TITLE_COLOR },
    bridge: cand.bridge,
    score: best.score,
    visible: best.visible,
    ranking: ranking.map((r) => ({ id: r.id, score: Math.round(r.score * 1000) / 1000 })),
  };
}

/** 후보 하나의 칸·제목 자리를 사진 없이 그대로 돌려줘요(후보 모양 비교·썸네일·검사용). */
export function candidateGeometry(id: AutoCoverCandidateId, panelMm: number, bleedMm: number) {
  const cand = CANDIDATES.find((c) => c.id === id) ?? CANDIDATES[0];
  const g = coverDesignGeo("front", panelMm, bleedMm);
  const at = (f: Frac, role: CoverElementRole) => {
    const x0 = Math.min(g.x0, clearanceFor(role));
    const sw = g.W - bleedMm - x0 - x0;
    return { xPct: ((x0 + f[0] * sw) / g.W) * 100, yPct: ((g.y0 + f[1] * g.sh) / g.H) * 100, widthPct: ((f[2] * sw) / g.W) * 100, heightPct: ((f[3] * g.sh) / g.H) * 100 };
  };
  return { id: cand.id, role: cand.role, bridge: cand.bridge, slots: cand.slots.map((f) => at(f, cand.role)), titleZone: at([0, cand.title.y, 1, cand.title.h], "text") };
}
