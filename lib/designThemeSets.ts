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
function costOf(id: string, input: SpreadPlanInput, used: Map<string, number>, designs: InnerDesign[], occasion: DesignThemeId): number {
  const s = sideSlots(id, designs);
  const slots = (input.printedLeft ? s.left : 0) + s.right;
  const lack = Math.max(0, input.photos - slots);
  const spare = input.photos > 0 ? Math.max(0, slots - input.photos) : 0;
  const d = designs.find((x) => x.id === id);
  return lack * LACK_COST + spare * SPARE_COST + (used.get(id) ?? 0) * REUSE_COST + fitPenalty(d ? rankFor(occasion, d) : 2);
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

export function planAlbumInner(set: AlbumThemeSet, spreadsIn: SpreadPlanInput[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS): string[] {
  const spreads = balanceSpreadPhotos(set, spreadsIn, designs);
  const n = spreads.length;
  const plan: string[] = [];
  const pickBest = (cands: string[], input: SpreadPlanInput, used: Map<string, number>) => {
    let best = cands[0];
    let bc = Infinity;
    for (const id of cands) {
      const c = costOf(id, input, used, designs, set.occasion);
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
  spreads.forEach((input, i) => {
    let chosen: string;
    if (i === 0) chosen = openId!;
    else if (i === n - 1) chosen = closeId!;
    else {
      const prev = plan[i - 1];
      let cands = middle.filter((id) => !sameComposition(id, prev, designs));
      if (cands.length === 0) cands = middle.length ? middle : set.roles.photo;
      chosen = pickBest(cands, input, used);
    }
    plan.push(chosen);
    used.set(chosen, (used.get(chosen) ?? 0) + 1);
  });
  return plan;
}
