// 54차: 표지 제목 "기본 그림자"를 한 곳에서 정해요(편집 화면·미리보기·PDF가 같은 값을 써요).
// 사용자가 직접 고른 그림자(coverTitleShadowColor)는 여기서 다루지 않아요 — 그대로 쓰고 절대 안 바꿔요.
//  · 옛 방식 앨범(wrapVersion < 2): 예전 값 그대로(인쇄만 깔았어요: 흐림 0.4em, 검정 45%) — 저장된 앨범 모양을 안 바꿔요.
//  · 새 방식: 뒤에 판(배경색)이 있으면 그림자가 필요 없어요(판이 대비를 맡아요). 판이 없을 때만 아주 약한 그림자(글자가 굵어 보이지 않게 작고 옅게).
export const LEGACY_DEFAULT_SHADOW = { blurEm: 0.4, alpha: 0.45 } as const;
export const V2_DEFAULT_SHADOW = { blurEm: 0.3, alpha: 0.3 } as const;

export type DefaultShadow = { blurEm: number; alpha: number };

export function coverTitleDefaultShadow(a: { wrapVersion: number; hasUserShadow: boolean; hasPlate: boolean }): DefaultShadow | null {
  if (a.hasUserShadow) return null;
  if (a.wrapVersion < 2) return LEGACY_DEFAULT_SHADOW;
  if (a.hasPlate) return null;
  return V2_DEFAULT_SHADOW;
}

export function coverTitleDefaultShadowCss(s: DefaultShadow | null): string | null {
  return s ? `0 0 ${s.blurEm}em rgba(0,0,0,${s.alpha})` : null;
}
