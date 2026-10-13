// 디자인을 입힌 뒤 "칸이 모자라 밀려난 사진"을 다른 펼침면의 빈 사진 칸에 채우는 계산이에요(2026-10 34차, 순수 계산).
// 규칙: 책 순서(첫 펼침면 → 마지막 펼침면), 한 펼침면 안에서는 칸 순서(= 디자인의 첫 칸·대표 칸부터)대로, 밀려난 사진은 읽는 순서 앞쪽에서 칸 모양에 잘 맞는 것부터 채워요(35차).
// 원래 펼침면의 사진은 이미 자기 자리에 있어서(applyLayoutTemplate) 이 계산은 "빈 칸으로 남을 자리"에만 사진을 넣어요 → 사진이 있던 칸은 절대 안 바뀌어요.
// 옮겨 오는 사진은 확대·이동(자르기)·뒤집기·직접 돌린 각도·필터를 그대로 들고 오고, 칸의 자리·모양(틀·테두리·디자인 기울기)만 새 칸 것을 써요.
// 채우고도 남는 사진만 leftover로 돌려줘요(호출한 쪽이 사진 목록으로 돌려보내요). 인쇄 안 되는 면의 칸에는 안 넣어요(lib/emptyPhotoSlots.ts와 같은 기준).
import type { ImageBoxDef, SpreadDef } from "./albumTemplates";
import { emptyPhotoBoxesOnSpread } from "./emptyPhotoSlots";
import { photoAspectOfBox, pickFillers, slotAspectOf } from "./photoSlotFit";

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

// 한 펼침면의 빈 칸에 채울 사진을 줄 앞쪽 (칸 수 + 2)장 안에서 칸 모양에 가장 잘 맞게 골라요(2026-10 35차, lib/photoSlotFit.ts).
// 멀리 있는 사진을 끌어오지 않아 읽는 순서가 크게 흐트러지지 않고, 안 뽑힌 사진은 순서 그대로 다음 펼침면 몫이에요.
export const REFILL_WINDOW_EXTRA = 2;

export function refillEmptySlots(
  spreads: readonly SpreadDef[],
  extras: readonly ImageBoxDef[],
  bookCount: number // 앞에서부터 이 개수만큼이 책 본문 펼침면이에요(소개 페이지는 안 채워요)
): { spreads: SpreadDef[]; placed: number; leftover: ImageBoxDef[] } {
  let remaining = extras.filter((b) => !!b.url);
  let placed = 0;
  const out = spreads.map((sp, i) => {
    if (remaining.length === 0 || i >= bookCount || sp.intro) return sp;
    // 사진이 빈 칸보다 적으면 앞 칸(디자인의 첫 칸)부터만 채워요(예전과 같아요)
    const empties = emptyPhotoBoxesOnSpread(sp, i).slice(0, remaining.length);
    if (empties.length === 0) return sp;
    const picks = pickFillers(
      remaining.map(photoAspectOfBox),
      empties.map((e) => slotAspectOf(e)),
      empties.length + REFILL_WINDOW_EXTRA
    );
    const fill = new Map<string, ImageBoxDef>();
    const taken = new Set<number>();
    for (const pk of picks) {
      fill.set(empties[pk.slot].id, fillSlotWithPhoto(empties[pk.slot], remaining[pk.queueIdx]));
      taken.add(pk.queueIdx);
    }
    remaining = remaining.filter((_, qi) => !taken.has(qi));
    placed += taken.size;
    return { ...sp, imageBoxes: (sp.imageBoxes ?? []).map((b) => fill.get(b.id) ?? b) };
  });
  return { spreads: out, placed, leftover: remaining };
}
