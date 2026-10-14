// (40차) 디자인을 입힌 뒤 안내 문구. 사진 목록에 사진이 남았는데(returned) 빈 칸도 남았다면(emptyLeft),
// 38차부터 "보이는 비율 55% 미만 칸에는 자동으로 안 넣기" 때문이에요 — 그 이유와 할 일을 차분한 한 문장으로 알려줘요.
// 사진을 크게 잘라서까지 억지로 채우지는 않아요(직접 넣거나 자르기를 조정하는 건 원래 되는 동작이에요).
export const REFILL_ASPECT_NOTICE = "사진 비율이 맞지 않아 자동으로 넣지 않았어요. 빈 칸에 직접 넣거나 자르기를 조정해 주세요";

export function designPhotoNotice(moved: number, returned: number, emptyLeft = 0): string | null {
  if (returned > 0 && emptyLeft > 0) return moved > 0 ? `사진 ${moved}장은 빈 칸에 채웠어요. ${REFILL_ASPECT_NOTICE}` : REFILL_ASPECT_NOTICE;
  if (moved > 0 && returned > 0) return `사진 ${moved}장은 다른 쪽의 빈 칸에 채우고, ${returned}장은 사진 목록으로 돌려보냈어요`;
  if (moved > 0) return `사진 ${moved}장을 다른 쪽의 빈 칸에 채웠어요`;
  if (returned > 0) return `사진 ${returned}장을 사진 목록으로 돌려보냈어요`;
  return null;
}
