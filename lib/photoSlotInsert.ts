// 사진 목록의 사진을 "칸"에 넣거나 바꿀 때 쓰는 순수 계산이에요(2026-10 41차).
// - 칸의 크기·자리·모양·장식·테두리·쌓임 순서 등은 건드리지 않고, 사진 관련 값(주소·원본 크기·확대/이동·뒤집기·90도 회전·필터·보정)만 새 사진 기준 기본값으로 바꿔요.
// - 새 사진은 칸을 꽉 채우고(cover) 가운데에 놓여요. 단, 세로 사진이 칸보다 "가로로 넓은" 칸(위아래가 잘리는 칸)에 들어가면
//   사람 얼굴이 위쪽에 있는 경우가 많아서 보이는 창의 가운데를 사진 높이의 위에서 1/3 지점에 맞춰요(얼굴 인식 없이 규칙만).
// - 손으로 넣는 건 55% 규칙(자동 배치용)에 막히지 않아요. 비율이 크게 달라도 그대로 넣고, 사용자가 바로 자르기·확대로 고칠 수 있어요.
import type { ImageBoxDef } from "./albumTemplates";
import { clampImageBoxInnerOffset } from "./imageBoxGeometry";
import { photoAspectOfBox, SPREAD_ASPECT } from "./photoSlotFit";

export type LibraryPhotoInfo = { url: string; width: number; height: number };

export const FOCAL_Y_FRACTION = 1 / 3; // 세로 사진의 "보이는 창" 가운데가 놓일 높이(위에서부터 비율)

// 세로 사진 + 위아래가 잘리는 칸일 때 innerOffsetYPct(위 -, 아래 +) 기본값. 그 밖에는 0(가운데).
export function defaultFocalOffsetYPct(photoAspect: number | null, slotAspect: number | null): number {
  if (photoAspect === null || slotAspect === null || !(photoAspect > 0) || !(slotAspect > 0)) return 0;
  if (!(photoAspect < 0.98)) return 0; // 세로 사진만
  if (!(slotAspect > photoAspect * 1.02)) return 0; // 위아래가 잘릴 때만
  const boxH = 1;
  const imgH = slotAspect / photoAspect; // 칸 너비 = slotAspect 기준, 사진 높이
  const overflow = imgH - boxH;
  const windowTop = Math.min(overflow, Math.max(0, FOCAL_Y_FRACTION * imgH - boxH / 2));
  const offPx = overflow / 2 - windowTop;
  const pct = (offPx / boxH) * 100;
  return Math.round(clampImageBoxInnerOffset(pct, boxH, imgH) * 100) / 100;
}

// frameAspect = 칸 좌표계 전체의 가로/세로 비(펼침면 2, 표지 한 쪽 ≈ 1)
export function slotPhotoPatch(photo: LibraryPhotoInfo, slot: Pick<ImageBoxDef, "widthPct" | "heightPct">, frameAspect: number = SPREAD_ASPECT): Partial<ImageBoxDef> {
  const width = photo.width || 1;
  const height = photo.height || 1;
  const photoAspect = photoAspectOfBox({ naturalWidth: width, naturalHeight: height, photoRotation: undefined });
  const slotAspect = slot.widthPct > 0 && slot.heightPct > 0 ? (slot.widthPct / slot.heightPct) * frameAspect : null;
  return {
    url: photo.url,
    naturalWidth: width,
    naturalHeight: height,
    innerOffsetXPct: 0,
    innerOffsetYPct: defaultFocalOffsetYPct(photoAspect, slotAspect),
    innerScale: 1,
    flipX: undefined,
    flipY: undefined,
    photoRotation: undefined,
    photoFilter: undefined,
    photoAdjust: undefined,
  };
}

export function applyPhotoToSlot(box: ImageBoxDef, photo: LibraryPhotoInfo, frameAspect: number = SPREAD_ASPECT): ImageBoxDef {
  return { ...box, ...slotPhotoPatch(photo, box, frameAspect) };
}

// 빈 캔버스에 놓을 때: 놓은 점이 새 박스의 가운데가 되도록 하되, 캔버스 안에 머물게 해요.
export function centerBoxAt(dropXPct: number, dropYPct: number, widthPct: number, heightPct: number): { xPct: number; yPct: number } {
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  return {
    xPct: Math.round(clamp(dropXPct - widthPct / 2, 100 - widthPct) * 100) / 100,
    yPct: Math.round(clamp(dropYPct - heightPct / 2, 100 - heightPct) * 100) / 100,
  };
}
