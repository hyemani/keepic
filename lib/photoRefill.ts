// 디자인을 입힌 뒤 "칸이 모자라 밀려난 사진"을 다른 펼침면의 빈 사진 칸에 채우는 계산이에요(2026-10 34차, 순수 계산).
// 규칙: 책 순서(첫 펼침면 → 마지막 펼침면), 한 펼침면 안에서는 칸 순서(= 디자인의 첫 칸·대표 칸부터)대로, 밀려난 사진은 읽는 순서 앞쪽에서 칸 모양에 잘 맞는 것부터 채워요(35차).
// 원래 펼침면의 사진은 이미 자기 자리에 있어서(applyLayoutTemplate) 이 계산은 "빈 칸으로 남을 자리"에만 사진을 넣어요 → 사진이 있던 칸은 절대 안 바뀌어요.
// 옮겨 오는 사진은 확대·이동(자르기)·뒤집기·직접 돌린 각도·필터를 그대로 들고 오고, 칸의 자리·모양(틀·테두리·디자인 기울기)만 새 칸 것을 써요.
// 채우고도 남는 사진만 leftover로 돌려줘요(호출한 쪽이 사진 목록으로 돌려보내요). 인쇄 안 되는 면의 칸에는 안 넣어요(lib/emptyPhotoSlots.ts와 같은 기준).
import type { ImageBoxDef, SpreadDef } from "./albumTemplates";
import { emptyPhotoBoxesOnSpread } from "./emptyPhotoSlots";
import { assignQueueGlobally } from "./albumRefillPlan";
import { photoAspectOfBox, slotAspectOf } from "./photoSlotFit";

// 빈 칸(empty)에 사진 박스(photo)의 사진·자르기 값을 넣은 새 박스
export function fillSlotWithPhoto(empty: ImageBoxDef, photo: ImageBoxDef): ImageBoxDef {
  // 직접 돌린 각도는 지키고, 디자인이 준 기울기(designRotation과 같은 값)는 새 칸의 기울기로 바꿔요(applyLayoutTemplate와 같은 규칙).
  const userRotated = photo.rotation !== undefined && photo.rotation !== 0 && photo.rotation !== photo.designRotation;
  return {
    ...photo,
    id: empty.id,
    xPct: empty.xPct,
    yPct: empty.yPct,
    widthPct: empty.widthPct,
    heightPct: empty.heightPct,
    layoutTemplateId: empty.layoutTemplateId,
    zOrder: empty.zOrder,
    designSlot: empty.designSlot,
    frameShape: empty.frameShape,
    borderRadiusPct: empty.borderRadiusPct,
    borderWidthPx: empty.borderWidthPx,
    borderColor: empty.borderColor,
    rotation: userRotated ? photo.rotation : empty.rotation,
    designRotation: userRotated ? undefined : empty.designRotation,
  };
}

// (38차) 밀려난 사진을 "책 전체의 빈 칸"에 한꺼번에 짝지어요(lib/albumRefillPlan.ts): 보이는 비율이 55% 미만인 칸에는 넣지 않고(칸이 비거나 사진이 목록에 남아요),
// 가능한 짝 중 많이 넣으면서 잘 맞는 쪽을 골라요. 예전처럼 펼침면 하나씩 앞에서부터 채우던 방식은 뒤쪽 펼침면에서 더 잘 맞는 사진을 놓쳤어요.
// 사진이 있던 칸·사용자가 만든 값은 그대로예요(빈 칸에만 넣어요).
export const REFILL_WINDOW_EXTRA = 2; // (옛 방식 호환용 상수, 지금은 안 써요)

export function refillEmptySlots(
  spreads: readonly SpreadDef[],
  extras: readonly ImageBoxDef[],
  bookCount: number // 앞에서부터 이 개수만큼이 책 본문 펼침면이에요(소개 페이지는 안 채워요)
): { spreads: SpreadDef[]; placed: number; leftover: ImageBoxDef[] } {
  const queue = extras.filter((b) => !!b.url);
  if (queue.length === 0) return { spreads: spreads.slice(), placed: 0, leftover: [] };
  const slots: { spread: number; box: ImageBoxDef }[] = [];
  spreads.forEach((sp, i) => {
    if (i >= bookCount || sp.intro) return;
    for (const e of emptyPhotoBoxesOnSpread(sp, i)) slots.push({ spread: i, box: e });
  });
  const picks = assignQueueGlobally(
    queue.map(photoAspectOfBox),
    slots.map((s) => slotAspectOf(s.box))
  );
  const fillBySpread = new Map<number, Map<string, ImageBoxDef>>();
  const taken = new Set<number>();
  for (const pk of picks) {
    const t = slots[pk.slot];
    const m = fillBySpread.get(t.spread) ?? new Map<string, ImageBoxDef>();
    m.set(t.box.id, fillSlotWithPhoto(t.box, queue[pk.queueIdx]));
    fillBySpread.set(t.spread, m);
    taken.add(pk.queueIdx);
  }
  const out = spreads.map((sp, i) => {
    const fill = fillBySpread.get(i);
    return fill ? { ...sp, imageBoxes: (sp.imageBoxes ?? []).map((b) => fill.get(b.id) ?? b) } : sp;
  });
  return { spreads: out, placed: taken.size, leftover: queue.filter((_, qi) => !taken.has(qi)) };
}
