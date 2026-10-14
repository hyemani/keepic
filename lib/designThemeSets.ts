// 앨범 테마 세트(2026-10 20차, 혜민님 요청: "테마 하나 누르면 선택한 테마로 내지도 전부 바뀔 수 있으면 좋겠어요").
// 한 세트 = 행사(가족·여행·커플·생일) × 스타일(포근한 기억·미니멀·감성 필기체·키즈·MZ)의 어울리는 묶음:
//   표지 디자인 1개 + 내지 역할별 디자인 후보 목록(오프닝 · 사진+캡션 · 두 장+글귀 · 스트립+날짜 · 콜라주 · 마무리).
// 세트는 손으로 적지 않고 "보이는(숨기지 않은) 디자인"에서 만들어요 → 디자인이 바뀌면 세트도 같이 따라가요.
// 후보 순서: 같은 스타일 안에서 고른 행사에 어울리는 디자인(대표 테마가 그 행사인 것 먼저) → 그다음 같은 스타일의 다른 행사 디자인(대체용).
// 이 파일은 "어떤 디자인을 쓸지"만 정해요(순수 계산). 실제 적용·사진 보존은 app/upload/page.tsx의 applyAlbumDesignTheme이 해요.
import {
  DESIGN_THEMES,
  VISIBLE_COVER_DESIGNS,
  VISIBLE_INNER_DESIGNS,
  designStyleName,
  innerDesignGeo,
  type CoverDesign,
  type DesignThemeId,
  type InnerDesign,
} from "./designTemplates";
import { assignQueueGlobally } from "./albumRefillPlan";
import { assignPhotosToSlots, bestFitAverage, visibleFraction } from "./photoSlotFit";

export type InnerRole = "opening" | "photo" | "two" | "strip" | "collage" | "closing";
export const MIDDLE_ROLES: InnerRole[] = ["photo", "two", "strip", "collage"];

// 디자인 id → 역할(내지 51종 중 숨기지 않은 것). 목록에 없는 디자인은 세트에 안 들어가요(단독 한 페이지 적용은 그대로 돼요).
const ROLE_OF: Record<string, InnerRole> = {
  "wm-opening": "opening", "mn-opening": "opening", "hw-opening": "opening", "kd-opening": "opening", "mz-opening": "opening",
  "wm-couple-dday": "opening", "kd-birthday-age": "opening", "mz-birthday-age": "opening",
  "wm-photo-caption": "photo", "hw-photo-caption": "photo", "kd-photo-caption": "photo", "mz-photo-caption": "photo", "mn-photo-caption": "photo",
  "mn-travel-log": "photo", "wm-family-portrait": "photo", "hw-travel-diary": "photo", "hw-couple-letter": "photo", "wm-family-letter": "photo",
  "mn-travel-itinerary": "photo",
  "wm-two-quote": "two", "mn-two-quote": "two", "hw-two-quote": "two", "kd-two-quote": "two", "mz-two-quote": "two",
  "mn-travel-ticket": "two", "hw-couple-polaroids": "two", "kd-birthday-cake": "two", "mz-travel-film": "two",
  "wm-strip-date": "strip", "mn-strip-date": "strip", "hw-strip-date": "strip", "kd-strip-date": "strip", "mz-strip-date": "strip",
  "kd-birthday-years": "strip", "wm-couple-anniv": "strip", "kd-family-members": "strip",
  "wm-collage": "collage", "mn-collage": "collage", "hw-collage": "collage", "kd-collage": "collage", "mz-collage": "collage",
  "wm-family-picnic": "collage", "kd-family-picnic": "collage", "hw-travel-map": "collage", "mz-travel-stamp": "collage",
  "kd-birthday-party": "collage", "mz-birthday-party": "collage",
  "wm-closing": "closing", "mn-closing": "closing", "hw-closing": "closing", "kd-closing": "closing", "mz-closing": "closing",
};
export const ALL_ROLES: InnerRole[] = ["opening", "photo", "two", "strip", "collage", "closing"];
export function innerRoleOf(designId: string): InnerRole | undefined {
  return ROLE_OF[designId];
}

const STYLE_FLAVOR: Record<string, string> = {
  "warm-memory": "포근한 기억",
  minimal: "미니멀",
  handwriting: "감성 필기체",
  kids: "키즈",
  mz: "MZ 트렌디",
};

export type AlbumThemeSet = {
  id: string; // `${occasion}-${style}`
  name: string; // "여행 · MZ 트렌디"
  occasion: DesignThemeId;
  style: string;
  coverId: string;
  roles: Record<InnerRole, string[]>; // 역할별 내지 디자인 후보(앞이 우선)
  flavor: string; // 스타일 이름만("MZ 트렌디") — "전체" 탭 카드 이름
  lookKey: string; // 표지+스타일이 같으면 같은 겉모습 → "전체" 탭에서는 한 번만 보여줘요
  occasions: DesignThemeId[]; // 같은 겉모습이 어울리는 행사 전부
};

// 후보 정렬: 고른 행사가 대표 테마인 것 → 행사에 속하는 것 → 같은 스타일의 나머지. (원래 순서는 유지)
// 스타일마다 기본으로 있는 6종(오프닝·사진+캡션·두 장+글귀·스트립·콜라주·마무리)은 어느 행사에도 무난해서 "범용"이에요(행사 전용 디자인보다 앞).
const GENERIC_ID = /^(wm|mn|hw|kd|mz)-(opening|photo-caption|two-quote|strip-date|collage|closing)$/;
function rankFor(occasion: DesignThemeId, d: { id?: string; themes: DesignThemeId[] }): number {
  if (d.themes[0] === occasion) return 0;
  if (d.themes.includes(occasion)) return 1;
  if (d.id && GENERIC_ID.test(d.id)) return 1.5;
  return 2;
}
const fitPenalty = (rank: number) => (rank === 0 ? 0 : rank === 1 ? 0.6 : rank === 1.5 ? 1 : 2.5);

function buildSets(): AlbumThemeSet[] {
  const out: AlbumThemeSet[] = [];
  for (const occ of DESIGN_THEMES) {
    // 스타일마다 이 행사에 가장 어울리는 표지 하나(대표 테마가 이 행사인 표지 먼저)
    const covers = [...(VISIBLE_COVER_DESIGNS as CoverDesign[])]
      .map((c, i) => ({ c, i }))
      .filter((x) => x.c.themes.includes(occ.id))
      .sort((a, b) => rankFor(occ.id, a.c) - rankFor(occ.id, b.c) || a.i - b.i)
      .map((x) => x.c);
    for (const cover of covers) {
      const style = cover.style;
      if (out.some((s) => s.occasion === occ.id && s.style === style)) continue;
      // 생일 전용 디자인("HAPPY BIRTHDAY" 같은 글이 들어 있는 것)은 다른 행사 세트의 대체 후보로도 넣지 않아요.
      const pool = (VISIBLE_INNER_DESIGNS as InnerDesign[]).filter(
        (d) => d.style === style && ROLE_OF[d.id] && !(occ.id !== "birthday" && d.themes.length === 1 && d.themes[0] === "birthday")
      );
      const roles = {} as Record<InnerRole, string[]>;
      for (const role of ALL_ROLES) {
        roles[role] = pool
          .map((d, i) => ({ d, i }))
          .filter((x) => ROLE_OF[x.d.id] === role)
          .sort((a, b) => rankFor(occ.id, a.d) - rankFor(occ.id, b.d) || a.i - b.i)
          .map((x) => x.d.id);
      }
      out.push({
        id: `${occ.id}-${style}`,
        name: `${occ.name} · ${STYLE_FLAVOR[style] ?? designStyleName(style)}`,
        occasion: occ.id,
        style,
        coverId: cover.id,
        roles,
        flavor: STYLE_FLAVOR[style] ?? designStyleName(style),
        lookKey: `${cover.id}|${style}`,
        occasions: [],
      });
    }
  }
  for (const s of out) s.occasions = out.filter((o) => o.lookKey === s.lookKey).map((o) => o.occasion);
  return out;
}
export const ALBUM_THEME_SETS: AlbumThemeSet[] = buildSets();
// 패널 목록: 행사 탭을 골랐으면 그 행사 세트 전부, "전체"면 겉모습이 같은 세트는 한 번만(처음 나오는 행사 기준).
export function albumThemeSetsFor(occasion: string): AlbumThemeSet[] {
  if (occasion !== "all") return ALBUM_THEME_SETS.filter((s) => s.occasion === occasion);
  const seen = new Set<string>();
  return ALBUM_THEME_SETS.filter((s) => (seen.has(s.lookKey) ? false : (seen.add(s.lookKey), true)));
}
export function findAlbumThemeSet(id: string | undefined | null): AlbumThemeSet | undefined {
  return id ? ALBUM_THEME_SETS.find((s) => s.id === id) : undefined;
}

// ---------- 펼침면별 디자인 정하기(순수 계산) ----------
export type SpreadPlanInput = {
  photos: number; // 지금 이 펼침면의 "인쇄되는 면"에 있는 사진 수(스티커·빈 칸 제외)
  printedLeft: boolean; // 첫 펼침면의 왼쪽은 인쇄 안 되는 면이라 false
  // (선택, 2026-10 36차) 이 펼침면에 "원래 있던" 사진들의 가로/세로 비(읽는 순서, 모르면 null). 없으면 사진 모양은 안 따지고 예전과 똑같이 계획해요.
  // 사진이 다른 펼침면으로 나눠 옮겨져 장수가 바뀌어도(balanceSpreadPhotos) 이 목록의 앞쪽 장수만 쓰고, 목록보다 많은 장수는 "모름(중립)"으로 봐요.
  aspects?: (number | null)[];
};
type SlotBox = { xPct: number; yPct: number; widthPct: number; heightPct: number };
const slotGeoCache = new Map<string, { left: SlotBox[]; right: SlotBox[] }>();
function slotGeo(id: string, designs: InnerDesign[]): { left: SlotBox[]; right: SlotBox[] } {
  let v = slotGeoCache.get(id);
  if (!v) {
    const d = designs.find((x) => x.id === id);
    const g = innerDesignGeo(260);
    v = d ? { left: d.left(g).slots, right: d.right(g).slots } : { left: [], right: [] };
    slotGeoCache.set(id, v);
  }
  return v;
}
function sideSlots(id: string, designs: InnerDesign[]): { left: number; right: number } {
  const v = slotGeo(id, designs);
  return { left: v.left.length, right: v.right.length };
}

// "같은 구성" 판정: 같은 스타일에서 왼쪽·오른쪽 사진 칸 수가 같고, 사진 칸이 차지하는 자리가 75% 이상 겹치면 사진 배치가 같은 디자인이에요
// (글·색·스티커만 다른 것). 한 앨범 안에서는 이런 디자인을 두 번 쓰지 않고, 바로 옆 펼침면에도 두지 않아요.
const COMP_N = 24;
const maskCache = new Map<string, Uint8Array>();
function compMask(id: string, designs: InnerDesign[]): Uint8Array {
  const cached = maskCache.get(id);
  if (cached) return cached;
  const m = new Uint8Array(2 * COMP_N * COMP_N);
  {
    const v = slotGeo(id, designs);
    const put = (slots: SlotBox[], off: number) => {
      for (const s of slots)
        for (let y = 0; y < COMP_N; y++)
          for (let x = 0; x < COMP_N; x++) {
            const px = ((x + 0.5) / COMP_N) * 100;
            const py = ((y + 0.5) / COMP_N) * 100;
            if (px >= s.xPct && px <= s.xPct + s.widthPct && py >= s.yPct && py <= s.yPct + s.heightPct) m[y * 2 * COMP_N + off + x] = 1;
          }
    };
    put(v.left, 0);
    put(v.right, COMP_N);
    maskCache.set(id, m);
  }
  return m;
}
export function sameComposition(a: string, b: string, designs: InnerDesign[] = VISIBLE_INNER_DESIGNS): boolean {
  if (a === b) return true;
  const da = designs.find((x) => x.id === a);
  const db = designs.find((x) => x.id === b);
  if (!da || !db || da.style !== db.style) return false;
  const sa = sideSlots(a, designs);
  const sb = sideSlots(b, designs);
  if (sa.left !== sb.left || sa.right !== sb.right) return false;
  const ma = compMask(a, designs);
  const mb = compMask(b, designs);
  let inter = 0;
  let uni = 0;
  for (let i = 0; i < ma.length; i++) {
    if (ma[i] && mb[i]) inter++;
    if (ma[i] || mb[i]) uni++;
  }
  return uni > 0 && inter / uni >= 0.75;
}

// 비용(낮을수록 좋아요): 사진이 남으면(칸 부족) 한 장당 6 — 사진을 사진 목록으로 돌려보내는 것보다 같은 디자인을 한 번 더 쓰는 쪽이 낫게,
// 칸이 남으면(빈 칸) 한 칸당 0.7, 이미 쓴 디자인은 한 번 쓸 때마다 +3.5(후보를 전부 한 번씩 쓴 다음에야 다시 써요).
// 행사 어울림 벌점은 0(대표) · 0.6(행사에 속함) · 1(범용) · 2.5(같은 스타일의 다른 행사 디자인) — 반복보다는 대체 디자인이 먼저예요.
const LACK_COST = 6;
const SPARE_COST = 0.7;
const REUSE_COST = 3.5;
// 사진 모양이 칸 모양과 안 맞는 정도(0 = 전부 안 잘림). 이 디자인의 앞 n칸(n = min(사진 수, 칸 수))에 사진 n장을 lib/photoSlotFit.ts의 배정대로 넣었을 때
// 보이는 비율 평균을 1에서 뺀 값이에요. 사진 모양을 하나도 모르면 0(예전과 똑같은 계획). 같은 입력은 같은 값이라 캐시해요.
// 가중치 12 = 사진이 전부 안 잘리는 디자인과 절반이 잘리는 디자인의 차이(0.5)가 6점쯤(= 사진 한 장이 남는 벌점, 같은 디자인 한 번 더 쓰는 벌점 3.5보다 큼)이라는 뜻이에요.
// 14개 세트 × 12/24/36장 × 가로·세로 섞임 8천 장 측정(36차): 0 → 12에서 55% 미만 22.7% → 17.3%, 70% 미만 53.3% → 46.8%, 평균 0.698 → 0.728,
// 이웃 같은 배치 0 그대로, 한 책 안 서로 다른 디자인 7.93 → 7.76개, 같은 디자인 최대 3번 그대로. 20 이상은 칸이 적은 디자인을 골라 사진이 남는 일이 늘어서(사진 목록으로 돌아가는 수 48 → 60+) 12에서 멈췄어요.
export const FIT_WEIGHT = 12;
const fitCache = new Map<string, number>();
function fitDeficit(id: string, input: SpreadPlanInput, designs: InnerDesign[]): number {
  const asp = input.aspects;
  if (!asp || asp.length === 0) return 0;
  const v = slotGeo(id, designs);
  const slots = [...(input.printedLeft ? v.left : []), ...v.right];
  const n = Math.min(input.photos, slots.length);
  if (n === 0) return 0;
  const photos = Array.from({ length: n }, (_, i) => (typeof asp[i] === "number" && asp[i]! > 0 ? asp[i]! : null));
  const key = `${id}|${input.printedLeft ? 1 : 0}|${photos.map((a) => (a === null ? "-" : a.toFixed(3))).join(",")}`;
  const hit = fitCache.get(key);
  if (hit !== undefined) return hit;
  // 칸 모양 = 쪽이 정사각형이라 칸의 가로%/세로%가 곧 가로/세로 비예요
  const avg = bestFitAverage(photos, slots.slice(0, n).map((s) => (s.widthPct > 0 && s.heightPct > 0 ? s.widthPct / s.heightPct : null)));
  const out = avg === null ? 0 : 1 - avg;
  if (fitCache.size > 20000) fitCache.clear();
  fitCache.set(key, out);
  return out;
}
// (37차에 넣었다가 38차에 걷어냈어요) 앞 펼침면들까지의 "칸 − 사진" 누적에 벌점을 주면 24장 책의 빈 칸은 줄었지만(18→3칸), 칸이 적은 디자인을 억지로 골라
// 사진이 55% 미만으로 잘리는 일이 10→16장(69장 중)으로 늘고 서로 다른 디자인 수도 줄었어요. 혜민님 결정: 사진이 자연스러운 게 먼저, 빈 칸 0은 목표가 아니에요.
// 지금은 0(꺼짐)이에요. 사진 모양이 있는 입력은 아래 planAlbumInnerByFit(책 전체 시뮬레이션)이 빈 칸·밀려난 사진·잘림을 한꺼번에 따져서 골라요.
export const SPARE_EXTRA = 0;
function costOf(id: string, input: SpreadPlanInput, used: Map<string, number>, designs: InnerDesign[], occasion: DesignThemeId, fitWeight: number = FIT_WEIGHT, spareExtra: number = 0, slackBefore: number = 0): number {
  const s = sideSlots(id, designs);
  const slots = (input.printedLeft ? s.left : 0) + s.right;
  const lack = Math.max(0, input.photos - slots);
  const spare = input.photos > 0 ? Math.max(0, slots - input.photos) : 0;
  const d = designs.find((x) => x.id === id);
  const slackAfter = slackBefore + slots - input.photos;
  const budget = input.aspects && spareExtra > 0 ? spareExtra * (Math.abs(slackAfter) - Math.abs(slackBefore)) : 0;
  return lack * LACK_COST + spare * SPARE_COST + budget + (used.get(id) ?? 0) * REUSE_COST + fitPenalty(d ? rankFor(occasion, d) : 2) + (fitWeight > 0 ? fitWeight * fitDeficit(id, input, designs) : 0);
}

// 한 앨범의 펼침면마다 어떤 내지 디자인을 쓸지 정해요(항상 같은 입력 → 같은 결과).
// 첫 인쇄 펼침면 = 오프닝, 마지막 = 마무리(펼침면이 1개면 오프닝만). 가운데 펼침면은 이 세트의 "가운데용 후보" 전체(사진+캡션·두 장·스트립·콜라주와
// 같은 스타일의 행사 전용 디자인)에서 하나씩 골라요: 사진 수에 맞는 것을 우선하되, 앞에서 쓰지 않은 디자인을 먼저 다 쓰고 나서야 다시 써요.
// 바로 앞 펼침면과 같은 디자인(또는 같은 사진 배치)은 연달아 쓰지 않고, 오프닝·마무리와 같은 배치도 가운데에는 쓰지 않아요.
// ---------- 사진이 한 펼침면에 몰려 있을 때 나눠서 계획하기(2026-10 34차) ----------
// 기본 AI 배치는 앞 펼침면에 1~2장씩 놓고 나머지를 마지막 펼침면에 몰아 쌓아요(예: 36장 → 마지막에 18장).
// 마무리 디자인은 칸이 4~5개뿐이라 14~15장이 사진 목록으로 쫓겨나고, 가운데 펼침면은 칸이 남아 비어 있었어요.
// 그래서 "이 역할의 디자인이 가질 수 있는 가장 많은 칸"(역할별 최대 칸 수)을 넘는 사진은 계획을 세울 때만 다른 펼침면 몫으로 옮겨 세요:
// 책 순서(첫 펼침면부터)로 한 장씩 돌려 가며 칸이 더 들어갈 자리에 나눠 줘요. 안 넘치면 입력이 그대로라 결과가 예전과 똑같아요.
// (실제 사진 옮기기는 app/upload/page.tsx가 이 계획대로 칸을 만든 뒤 lib/photoRefill.ts로 해요 — 원래 펼침면의 사진이 항상 먼저예요.)
export function balanceSpreadPhotos(set: AlbumThemeSet, spreads: SpreadPlanInput[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS): SpreadPlanInput[] {
  const n = spreads.length;
  if (n === 0) return spreads;
  const slotsOf = (id: string, input: SpreadPlanInput) => {
    const s = sideSlots(id, designs);
    return (input.printedLeft ? s.left : 0) + s.right;
  };
  const maxOf = (ids: string[], input: SpreadPlanInput) => ids.reduce((m, id) => Math.max(m, slotsOf(id, input)), 0);
  const GENERIC_BOOKEND = /^(wm|mn|hw|kd|mz)-(opening|closing)$/;
  const middleIds = (["opening", ...MIDDLE_ROLES] as InnerRole[]).flatMap((r) => set.roles[r]).filter((id) => !GENERIC_BOOKEND.test(id));
  const closeIds = set.roles.closing.length ? set.roles.closing : set.roles.opening;
  const cap = spreads.map((input, i) => (i === 0 ? maxOf(set.roles.opening, input) : i === n - 1 ? maxOf(closeIds, input) : maxOf(middleIds, input)));
  const count = spreads.map((s, i) => Math.min(s.photos, cap[i]));
  let pool = spreads.reduce((a, s, i) => a + Math.max(0, s.photos - cap[i]), 0);
  if (pool === 0) return spreads;
  while (pool > 0) {
    let gave = false;
    for (let i = 0; i < n && pool > 0; i++) {
      if (count[i] < cap[i]) {
        count[i]++;
        pool--;
        gave = true;
      }
    }
    if (!gave) break;
  }
  return spreads.map((s, i) => ({ ...s, photos: count[i] }));
}

export function planAlbumInnerLegacy(set: AlbumThemeSet, spreadsIn: SpreadPlanInput[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS, fitWeight: number = FIT_WEIGHT, spareExtra: number = SPARE_EXTRA): string[] {
  const spreads = balanceSpreadPhotos(set, spreadsIn, designs);
  const n = spreads.length;
  const plan: string[] = [];
  const pickBest = (cands: string[], input: SpreadPlanInput, used: Map<string, number>, slack: number = 0) => {
    let best = cands[0];
    let bc = Infinity;
    for (const id of cands) {
      const c = costOf(id, input, used, designs, set.occasion, fitWeight, spareExtra, slack);
      if (c < bc - 1e-9) {
        bc = c;
        best = id;
      }
    }
    return best;
  };
  const none = new Map<string, number>();
  const openId = n > 0 ? pickBest(set.roles.opening, spreads[0], none) : undefined;
  const closeCands = set.roles.closing.length ? set.roles.closing : set.roles.opening;
  const closeId = n > 1 ? pickBest(closeCands, spreads[n - 1], none) : undefined;
  const bookends = [openId, closeId].filter((x): x is string => !!x);
  // 가운데용 후보: 일반 역할 4종 + 행사 전용 오프닝(D-day 등). 범용 오프닝·마무리는 책의 처음·끝에만 써요.
  const GENERIC_BOOKEND = /^(wm|mn|hw|kd|mz)-(opening|closing)$/;
  const middle: string[] = [];
  for (const role of ["opening", ...MIDDLE_ROLES] as InnerRole[]) {
    for (const id of set.roles[role]) {
      if (GENERIC_BOOKEND.test(id) || middle.includes(id) || bookends.includes(id)) continue;
      if (bookends.some((b) => sameComposition(b, id, designs))) continue;
      if (middle.some((m) => sameComposition(m, id, designs))) continue; // 같은 배치는 행사에 더 어울리는(앞선) 하나만
      middle.push(id);
    }
  }
  // 앞쪽 = 이 행사에 더 어울리는 디자인(동점일 때 먼저 뽑혀요)
  const rankOf = (id: string) => {
    const d = designs.find((x) => x.id === id);
    return d ? rankFor(set.occasion, d) : 2;
  };
  middle.sort((a, b) => rankOf(a) - rankOf(b));
  const used = new Map<string, number>();
  let slack = 0; // 앞 펼침면들의 (칸 − 사진) 누적
  spreads.forEach((input, i) => {
    let chosen: string;
    if (i === 0) chosen = openId!;
    else if (i === n - 1) chosen = closeId!;
    else {
      const prev = plan[i - 1];
      let cands = middle.filter((id) => !sameComposition(id, prev, designs));
      if (cands.length === 0) cands = middle.length ? middle : set.roles.photo;
      chosen = pickBest(cands, input, used, slack);
    }
    plan.push(chosen);
    {
      const sd = sideSlots(chosen, designs);
      slack += (input.printedLeft ? sd.left : 0) + sd.right - input.photos;
    }
    used.set(chosen, (used.get(chosen) ?? 0) + 1);
  });
  return plan;
}

// ---------- (38차) 사진 모양을 먼저 보는 책 전체 계획 ----------
// 혜민님 결정(37차 결과를 보고): ① 사진이 자연스러운 게 먼저(많이 잘리게 해서 칸을 채우지 않아요) ② 빈 칸 0은 목표가 아니에요(잘라서 채우느니 여백이 있는 디자인)
// ③ 같은 배치를 연달아 쓰지 않고, 사진이 적어도 서로 다른 구성을 많이 써요 ④ 펼침면 하나가 아니라 책 전체를 보고 정해요.
// 방법: 앱이 디자인을 입히는 과정을 그대로 흉내 내 "이 디자인들로 입히면 책이 어떻게 나올지"를 점수로 매겨요(작을수록 좋아요).
//   · 펼침면의 원래 사진은 그 디자인의 앞 칸들에 lib/photoSlotFit.ts 배정대로 들어가요 → 잘린 만큼 FIT_WEIGHT × (1 − 보이는 비율), 55% 미만이면 lowExtra를 더 얹어요.
//   · 칸이 모자라 넘친 사진은 줄을 서고, 책 전체의 빈 칸에 lib/albumRefillPlan.ts(실제 적용과 같은 함수)로 짝지어져요 → 들어간 사진도 같은 방식으로 점수를 매겨요.
//   · 그래도 빈 칸 한 칸당 PLAN_TUNE.empty, 사진 목록으로 돌아가는 사진 한 장당 PLAN_TUNE.left, 같은 디자인 재사용(PLAN_TUNE.reuse, 4번째부터 reuse4 추가), 행사 어울림 벌점을 더해요.
//   · 우선순위는 "잘림 > 다양함 > 빈 칸"이 되도록 가중치를 잡았어요(숫자 근거는 아래 상수 옆 주석).
// 시작은 예전 계획(planAlbumInnerLegacy)이고, 펼침면 하나씩 다른 후보로 바꾸거나 두 펼침면의 디자인을 맞바꿔 보면서 책 전체 점수가 줄어들 때만 바꿔요(최대 4바퀴, 항상 같은 입력 → 같은 결과).
// 연달아 같은 배치 금지·오프닝/마무리와 같은 배치를 가운데에 쓰지 않기는 후보를 고르는 조건이라 어떤 가중치에서도 지켜져요.
export const PLAN_TUNE = { empty: 3, left: 9, reuse: 4.5, reuse4: 30, lowVisible: 0.55, lowExtra: 30 }; // 측정 스크립트가 값을 바꿔 보려고 객체로 뒀어요(앱은 안 바꿔요)
const MAX_PASSES = 4;
const MAX_EVALS = 1200; // 펼침면이 16개를 넘는 큰 책은 450번으로 줄여요(계산 시간 상한)

type FitSpread = { printedLeft: boolean; photos: (number | null)[]; keys?: string[] };
const aspKey = (a: number | null) => (a === null ? "-" : a.toFixed(3));
const slotAspCache = new Map<string, { v: (number | null)[]; k: string[] }>();
function slotAspectsK(id: string, printedLeft: boolean, designs: InnerDesign[]): { v: (number | null)[]; k: string[] } {
  const key = `${id}|${printedLeft ? 1 : 0}`;
  let e = slotAspCache.get(key);
  if (!e) {
    const g = slotGeo(id, designs);
    const v = [...(printedLeft ? g.left : []), ...g.right].map((s) => (s.widthPct > 0 && s.heightPct > 0 ? s.widthPct / s.heightPct : null));
    e = { v, k: v.map(aspKey) };
    slotAspCache.set(key, e);
  }
  return e;
}
const slotAspects = (id: string, printedLeft: boolean, designs: InnerDesign[]) => slotAspectsK(id, printedLeft, designs).v;
const photoCost = (f: number, fw: number) => fw * (1 - f) + PLAN_TUNE.lowExtra * Math.max(0, PLAN_TUNE.lowVisible - f);
const shownCache = new Map<string, number>();
// 사진 목록의 앞 n장(n = 칸 수와 사진 수 중 작은 쪽)을 디자인의 앞 n칸에 넣었을 때의 잘림 점수 합(사진 모양을 모르는 사진은 0)
function shownCost(id: string, sp: FitSpread, designs: InnerDesign[], fw: number): number {
  const sa = slotAspects(id, sp.printedLeft, designs);
  const n = Math.min(sp.photos.length, sa.length);
  if (n === 0) return 0;
  const ph = sp.photos.slice(0, n);
  if (ph.every((a) => a === null)) return 0;
  const key = `${id}|${sp.printedLeft ? 1 : 0}|${fw}|${PLAN_TUNE.lowExtra}|${PLAN_TUNE.lowVisible}|${ph.map((a) => (a === null ? "-" : a.toFixed(3))).join(",")}`;
  const hit = shownCache.get(key);
  if (hit !== undefined) return hit;
  const perm = assignPhotosToSlots(ph, sa.slice(0, n));
  let c = 0;
  for (let s = 0; s < n; s++) {
    const a = ph[perm[s]];
    if (a !== null && sa[s] !== null) c += photoCost(visibleFraction(a, sa[s]), fw);
  }
  if (shownCache.size > 40000) shownCache.clear();
  shownCache.set(key, c);
  return c;
}
const compCache = new Map<string, boolean>();
function sameCompCached(a: string, b: string, designs: InnerDesign[]): boolean {
  if (a === b) return true;
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  let v = compCache.get(key);
  if (v === undefined) {
    v = sameComposition(a, b, designs);
    compCache.set(key, v);
  }
  return v;
}

const picksCache = new Map<string, { slot: number; queueIdx: number }[]>();
function cachedGlobalPicks(queue: (number | null)[], empties: (number | null)[], qKeys: string[], eKeys: string[]): { slot: number; queueIdx: number }[] {
  if (queue.length === 0 || empties.length === 0) return [];
  const key = `${qKeys.join(",")}#${eKeys.join(",")}`;
  let v = picksCache.get(key);
  if (!v) {
    v = assignQueueGlobally(queue, empties);
    if (picksCache.size > 5000) picksCache.clear();
    picksCache.set(key, v);
  }
  return v;
}

const rankPenaltyCache = new Map<string, number>();
function rankPenaltyOf(set: AlbumThemeSet, id: string, designs: InnerDesign[]): number {
  const key = `${set.occasion}|${id}`;
  let v = rankPenaltyCache.get(key);
  if (v === undefined) {
    const d = designs.find((x) => x.id === id);
    v = fitPenalty(d ? rankFor(set.occasion, d) : 2);
    rankPenaltyCache.set(key, v);
  }
  return v;
}

export type FitPlanScore = { total: number; fit: number; empty: number; left: number; reuse: number };
// 계획 하나의 책 전체 점수(작을수록 좋아요). 실제 적용(디자인 입히기 → 책 전체 빈 칸 채우기)을 순서 그대로 흉내 내요.
export function scoreAlbumPlan(set: AlbumThemeSet, plan: string[], spreads: FitSpread[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS, fw: number = FIT_WEIGHT): FitPlanScore {
  let fit = 0;
  let rank = 0;
  const queue: (number | null)[] = [];
  const qKeys: string[] = [];
  const empties: (number | null)[] = [];
  const eKeys: string[] = [];
  const use = new Map<string, number>();
  plan.forEach((id, i) => {
    const sp = spreads[i];
    const se = slotAspectsK(id, sp.printedLeft, designs);
    const sa = se.v;
    fit += shownCost(id, sp, designs, fw);
    const pk = sp.keys ?? sp.photos.map(aspKey);
    for (let j = sa.length; j < sp.photos.length; j++) {
      queue.push(sp.photos[j]);
      qKeys.push(pk[j]);
    }
    for (let k = sp.photos.length; k < sa.length; k++) {
      empties.push(sa[k]);
      eKeys.push(se.k[k]);
    }
    use.set(id, (use.get(id) ?? 0) + 1);
    rank += rankPenaltyOf(set, id, designs);
  });
  const picks = cachedGlobalPicks(queue, empties, qKeys, eKeys);
  for (const pk of picks) if (queue[pk.queueIdx] !== null && empties[pk.slot] !== null) fit += photoCost(visibleFraction(queue[pk.queueIdx], empties[pk.slot]), fw);
  let reuse = 0;
  for (const c of use.values()) reuse += PLAN_TUNE.reuse * ((c * (c - 1)) / 2) + (c >= 4 ? PLAN_TUNE.reuse4 * (c - 3) : 0);
  const empty = (empties.length - picks.length) * PLAN_TUNE.empty;
  const left = (queue.length - picks.length) * PLAN_TUNE.left;
  return { total: fit + rank + reuse + empty + left, fit, empty, left, reuse };
}

function planAlbumInnerByFit(set: AlbumThemeSet, spreadsIn: SpreadPlanInput[], designs: InnerDesign[], fw: number): string[] {
  const start = planAlbumInnerLegacy(set, spreadsIn, designs, fw, 0);
  const n = start.length;
  if (n < 3) return start;
  const spreads: FitSpread[] = spreadsIn.map((s) => ({
    printedLeft: s.printedLeft,
    photos: Array.from({ length: s.photos }, (_, i) => (s.aspects && typeof s.aspects[i] === "number" && s.aspects[i]! > 0 ? s.aspects[i]! : null)),
  }));
  for (const sp of spreads) sp.keys = sp.photos.map(aspKey);
  const GENERIC_BOOKEND = /^(wm|mn|hw|kd|mz)-(opening|closing)$/;
  const middle: string[] = [];
  for (const role of ["opening", ...MIDDLE_ROLES] as InnerRole[]) {
    for (const id of set.roles[role]) {
      if (GENERIC_BOOKEND.test(id) || middle.includes(id)) continue;
      if (middle.some((m) => sameCompCached(m, id, designs))) continue;
      middle.push(id);
    }
  }
  // 시작 계획이 쓴 디자인은 후보에 꼭 넣어요(오프닝·마무리와 겹치지 않는 것만)
  for (const id of start.slice(1, n - 1)) if (!middle.includes(id)) middle.push(id);
  const openCands = set.roles.opening.length ? set.roles.opening : [start[0]];
  const closeCands = set.roles.closing.length ? set.roles.closing : openCands;
  const okAt = (plan: string[], i: number): boolean => {
    const id = plan[i];
    if (i > 0 && sameCompCached(id, plan[i - 1], designs)) return false;
    if (i < n - 1 && sameCompCached(id, plan[i + 1], designs)) return false;
    if (i > 0 && i < n - 1 && (sameCompCached(id, plan[0], designs) || sameCompCached(id, plan[n - 1], designs))) return false;
    if (i === 0 || i === n - 1) for (let k = 1; k < n - 1; k++) if (sameCompCached(plan[k], id, designs)) return false;
    return true;
  };
  const maxEvals = n > 16 ? 450 : MAX_EVALS;
  let evals = 0;
  const J = (p: string[]) => (evals++, scoreAlbumPlan(set, p, spreads, designs, fw).total);
  let cur = start.slice();
  let curJ = J(cur);
  for (let pass = 0; pass < MAX_PASSES && evals < maxEvals; pass++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      const cands = i === 0 ? openCands : i === n - 1 ? closeCands : middle;
      let bestId = cur[i];
      let bestJ = curJ;
      for (const id of cands) {
        if (id === cur[i]) continue;
        const trial = cur.slice();
        trial[i] = id;
        if (!okAt(trial, i)) continue;
        const j = J(trial);
        if (j < bestJ - 1e-9) {
          bestJ = j;
          bestId = id;
        }
      }
      if (bestId !== cur[i]) {
        cur[i] = bestId;
        curJ = bestJ;
        improved = true;
      }
    }
    for (let a = 1; a < n - 1 && evals < maxEvals; a++)
      for (let b = a + 1; b < n - 1; b++) {
        if (cur[a] === cur[b]) continue;
        const trial = cur.slice();
        trial[a] = cur[b];
        trial[b] = cur[a];
        if (!okAt(trial, a) || !okAt(trial, b)) continue;
        const j = J(trial);
        if (j < curJ - 1e-9) {
          cur = trial;
          curJ = j;
          improved = true;
        }
      }
    if (!improved) break;
  }
  return cur;
}

const planMemo = new Map<string, string[]>();
// 한 앨범의 펼침면마다 어떤 내지 디자인을 쓸지 정해요(항상 같은 입력 → 같은 결과, 카드 미리보기와 적용이 같은 함수를 불러요).
// 사진 모양(aspects)이 하나라도 있으면 책 전체 시뮬레이션 계획(위), 없으면 예전 계획(planAlbumInnerLegacy, 38차 이전과 똑같은 결과)이에요.
export function planAlbumInner(set: AlbumThemeSet, spreadsIn: SpreadPlanInput[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS, fitWeight: number = FIT_WEIGHT): string[] {
  const hasShape = fitWeight > 0 && spreadsIn.some((s) => s.aspects?.some((a) => typeof a === "number" && a > 0));
  if (!hasShape) return planAlbumInnerLegacy(set, spreadsIn, designs, fitWeight, 0);
  const key = `${set.id}|${fitWeight}|${Object.values(PLAN_TUNE).join(",")}|${designs === VISIBLE_INNER_DESIGNS ? "v" : designs.length}|${spreadsIn
    .map((s) => `${s.photos}${s.printedLeft ? "L" : "n"}[${(s.aspects ?? []).slice(0, s.photos).map((a) => (typeof a === "number" ? a.toFixed(3) : "-")).join(",")}]`)
    .join(";")}`;
  const hit = planMemo.get(key);
  if (hit) return hit.slice();
  const out = planAlbumInnerByFit(set, spreadsIn, designs, fitWeight);
  if (planMemo.size > 200) planMemo.clear();
  planMemo.set(key, out);
  return out.slice();
}
