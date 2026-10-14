// 앨범 테마 목록·미리보기에 쓰는 "장면" 고르기(순수 계산, 화면 그리기는 app/upload/designTemplatePanel.tsx가 해요).
//  - 목록 카드 = 이 테마를 적용하면 앞표지에 깔리는 디자인(applyCoverDesignTemplate가 쓰는 cd.front + 제목과 같은 데이터)
//  - 눈 아이콘 미리보기 = 실제 계획(planAlbumInner)의 내지 펼침면(왼쪽+오른쪽) 3~4장
import { coverDesignGeo, coverTitleAsText, type CoverDesign, type DesignScene } from "./designTemplates";
import { innerRoleOf } from "./designThemeSets";

// 목록 카드 칸의 가로:세로(앞표지가 카드 안에서 작아 보이지 않게 내지 펼침면 카드의 2:1보다 조금 더 높게 — 이 목록 안의 모든 카드는 같은 크기예요).
export const THEME_CARD_STAGE_RATIO = 1.6;

// 앞표지 한 장만 카드 칸 가운데에 놓은 장면. 칸 크기는 앞표지 높이로 정해져서 모든 테마가 같은 크기·같은 비율이에요.
export function coverFrontCardScene(d: CoverDesign, panelMm: number, bleedMm: number): DesignScene {
  const gf = coverDesignGeo("front", panelMm, bleedMm);
  const front = d.front(gf);
  front.texts = [coverTitleAsText(d, gf), ...front.texts];
  const wMm = Math.max(gf.W, gf.H * THEME_CARD_STAGE_RATIO);
  const hMm = Math.max(gf.H, gf.W / THEME_CARD_STAGE_RATIO);
  return { wMm, hMm, cardEdge: true, parts: [{ xMm: (wMm - gf.W) / 2, yMm: (hMm - gf.H) / 2, wMm: gf.W, hMm: gf.H, layout: front }] };
}

// 계획(펼침면별 내지 디자인 id)에서 보여줄 대표 펼침면 번호 최대 4개(오름차순). 항상 같은 입력 → 같은 결과.
//  1) 마지막 펼침면(마무리)  2) 첫 내용 펼침면  3) 콜라주 펼침면(있으면, 가운데에 가까운 것)  4) 나머지는 서로 다른 디자인을 고르게
// 표지 쪽 첫 펼침면(0번, 왼쪽이 인쇄되지 않아요)은 펼침면이 1개뿐일 때만 보여줘요.
export function pickPreviewSpreads(plan: string[], max = 4): number[] {
  const n = plan.length;
  if (n <= 1) return [0];
  const cand: number[] = [];
  for (let i = 1; i < n; i++) cand.push(i);
  if (cand.length <= max) return cand;
  const picked: number[] = [];
  const seen = new Set<string>();
  const take = (i: number | undefined, allowDup = false) => {
    if (i === undefined || picked.includes(i) || picked.length >= max) return;
    if (!allowDup && seen.has(plan[i])) return;
    picked.push(i);
    seen.add(plan[i]);
  };
  take(n - 1, true);
  take(1, true);
  const mid = (n - 1) / 2;
  const collage = cand
    .filter((i) => i < n - 1 && innerRoleOf(plan[i]) === "collage")
    .sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b)[0];
  take(collage);
  // 남는 자리: 후보를 고르게 훑으며 아직 안 나온 디자인 먼저, 그래도 모자라면 중복 허용
  const step = (cand.length - 1) / Math.max(1, max - 1);
  for (let k = 0; k < max; k++) take(cand[Math.round(k * step)]);
  for (const i of cand) take(i);
  for (const i of cand) take(i, true);
  return picked.sort((a, b) => a - b);
}
