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
const fitPenalty = (rank: number) => (rank === 0 ? 0 : rank === 1 ? 0.8 : rank === 1.5 ? 1.2 : 6);

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
      const pool = (VISIBLE_INNER_DESIGNS as InnerDesign[]).filter((d) => d.style === style && ROLE_OF[d.id]);
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
const slotCache = new Map<string, { left: number; right: number }>();
function sideSlots(id: string, designs: InnerDesign[]): { left: number; right: number } {
  let v = slotCache.get(id);
  if (!v) {
    const d = designs.find((x) => x.id === id);
    const g = innerDesignGeo(260);
    v = d ? { left: d.left(g).slots.length, right: d.right(g).slots.length } : { left: 0, right: 0 };
    slotCache.set(id, v);
  }
  return v;
}
// 비용: 사진이 남으면(칸 부족) 한 장당 3, 칸이 남으면(빈 칸) 한 칸당 1. 이미 쓴 디자인은 +0.6씩(같은 디자인 반복 줄이기).
// 행사 어울림 벌점: 대표 테마가 아닌데 행사에 속하면 +0.8, 행사와 무관한 디자인(대체용)이면 +4 — 사진 수가 조금 안 맞아도 같은 행사 디자인이 먼저 뽑히게 해요.
function costOf(id: string, input: SpreadPlanInput, used: Map<string, number>, designs: InnerDesign[], occasion: DesignThemeId): number {
  const s = sideSlots(id, designs);
  const slots = (input.printedLeft ? s.left : 0) + s.right;
  const lack = Math.max(0, input.photos - slots);
  const spare = input.photos > 0 ? Math.max(0, slots - input.photos) : 0;
  const d = designs.find((x) => x.id === id);
  return lack * 3 + spare + (used.get(id) ?? 0) * 0.6 + fitPenalty(d ? rankFor(occasion, d) : 2);
}

// 한 앨범의 펼침면마다 어떤 내지 디자인을 쓸지 정해요.
// 첫 인쇄 펼침면 = 오프닝, 마지막 = 마무리(펼침면이 1개면 오프닝만), 가운데는 사진+캡션 → 두 장+글귀 → 스트립 → 콜라주 순으로 돌아요.
// 가운데 펼침면은 사진 수에 가장 잘 맞는 디자인을 고르고, 그 역할 후보가 너무 안 맞으면(빈 칸 3개 이상/사진이 남음) 다음 역할에서 찾아요.
export function planAlbumInner(set: AlbumThemeSet, spreads: SpreadPlanInput[], designs: InnerDesign[] = VISIBLE_INNER_DESIGNS): string[] {
  const used = new Map<string, number>();
  const plan: string[] = [];
  const n = spreads.length;
  let mid = 0;
  const pick = (cands: string[], input: SpreadPlanInput) => {
    let best = cands[0];
    let bc = Infinity;
    for (const id of cands) {
      const c = costOf(id, input, used, designs, set.occasion);
      if (c < bc - 1e-9) {
        bc = c;
        best = id;
      }
    }
    return { id: best, cost: bc };
  };
  const all = (role: InnerRole) => set.roles[role].length > 0;
  spreads.forEach((input, i) => {
    let chosen: string | undefined;
    if (i === 0) {
      chosen = pick(set.roles.opening, input).id;
    } else if (i === n - 1) {
      chosen = pick(set.roles.closing.length ? set.roles.closing : set.roles.opening, input).id;
    } else {
      const start = mid % MIDDLE_ROLES.length;
      let fallback: { id: string; cost: number; k: number } | undefined;
      let pickedK = -1;
      for (let k = 0; k < MIDDLE_ROLES.length; k++) {
        const role = MIDDLE_ROLES[(start + k) % MIDDLE_ROLES.length];
        if (!all(role)) continue;
        const r = pick(set.roles[role], input);
        const d = designs.find((x) => x.id === r.id);
        const spareOnly = input.photos > 0 ? r.cost - (used.get(r.id) ?? 0) * 0.6 - fitPenalty(d ? rankFor(set.occasion, d) : 2) : 0;
        if (spareOnly <= 2) {
          chosen = r.id;
          pickedK = k;
          break;
        }
        if (!fallback || r.cost < fallback.cost) fallback = { ...r, k };
      }
      if (!chosen && fallback) {
        chosen = fallback.id;
        pickedK = fallback.k;
      }
      // 다음 가운데 펼침면은 방금 고른 역할 "다음"부터 돌아요(맞는 역할이 없어 건너뛰어도 같은 디자인이 연달아 나오지 않게).
      mid = pickedK >= 0 ? start + pickedK + 1 : mid + 1;
      chosen = chosen ?? set.roles.photo[0];
    }
    plan.push(chosen!);
    used.set(chosen!, (used.get(chosen!) ?? 0) + 1);
  });
  return plan;
}
