// 62차: "폴라로이드(틀 스티커 + 그 구멍 안의 사진 칸)"를 하나의 물건처럼 다루기 위한 순수 계산 모음이에요.
//
// 저장된 앨범 데이터는 절대 안 바꿔요 — 틀(스티커 이미지박스)과 사진 칸(사진 이미지박스)은 예전 그대로 따로 저장돼 있고,
// 이 파일은 "지금 화면에서 어떤 사진 칸이 어떤 틀의 구멍 안에 있는가"를 매번 계산해서 짝을 찾아줘요(저장 없음).
// 짝 찾기: ① 디자인이 붙여 둔 표시(사진 칸 designSlot ∈ 틀 forSlots)가 있고 위치도 맞으면 그 짝,
//          ② 표시가 없으면(예전 저장본·직접 넣은 틀) 사진 칸 중심이 틀의 구멍(틀 안쪽 좌표) 안에 있고, 각도·크기가 구멍과 거의 같은 칸.
// 좌표 단위는 모두 박스와 같은 % (x·너비는 영역 폭 기준, y·높이는 영역 높이 기준)이고, 영역의 실제 가로·세로(mm)를 알아야
// 회전을 정확히 계산할 수 있어서 docMm 을 받아요(없으면 가로세로 같다고 봐요).
import { isStickerImageBox, type ImageBoxDef } from "./albumTemplates";
import { PHOTO_FRAMES } from "./designKit";

type Geo = Pick<ImageBoxDef, "xPct" | "yPct" | "widthPct" | "heightPct"> & { rotation?: number };
export type DocMm = { w: number; h: number };

const FRAME_BY_URL: ReadonlyMap<string, (typeof PHOTO_FRAMES)[keyof typeof PHOTO_FRAMES]> = new Map(
  Object.values(PHOTO_FRAMES).map((f) => [f.url, f])
);

/** 이 박스가 "구멍 있는 사진 틀 스티커"(폴라로이드·필름)이면 구멍 위치(틀 대비 0~1)를 돌려줘요. */
export function frameHoleOf(box: Pick<ImageBoxDef, "url" | "kind">): [number, number, number, number] | null {
  if (!isStickerImageBox(box as ImageBoxDef)) return null;
  const f = FRAME_BY_URL.get(box.url);
  return f ? ([...f.hole] as [number, number, number, number]) : null;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const angDiff = (a: number, b: number) => {
  const d = (((a - b) % 360) + 540) % 360 - 180;
  return Math.abs(d);
};

/** 틀 geo 기준으로 사진 칸의 "중심 위치·크기·각도"를 틀 안쪽 좌표(틀 가로·세로 대비 비율)로 나타내요. */
function relativeTo(frame: Geo, photo: Geo, doc: DocMm) {
  const fw = (frame.widthPct / 100) * doc.w;
  const fh = (frame.heightPct / 100) * doc.h;
  const fcx = (frame.xPct / 100) * doc.w + fw / 2;
  const fcy = (frame.yPct / 100) * doc.h + fh / 2;
  const pw = (photo.widthPct / 100) * doc.w;
  const ph = (photo.heightPct / 100) * doc.h;
  const pcx = (photo.xPct / 100) * doc.w + pw / 2;
  const pcy = (photo.yPct / 100) * doc.h + ph / 2;
  const a = rad(frame.rotation ?? 0);
  const dx = pcx - fcx;
  const dy = pcy - fcy;
  // 틀 로컬 좌표(회전을 풀어서)
  const lx = dx * Math.cos(-a) - dy * Math.sin(-a);
  const ly = dx * Math.sin(-a) + dy * Math.cos(-a);
  return { cx: lx / fw, cy: ly / fh, w: pw / fw, h: ph / fh, drot: (photo.rotation ?? 0) - (frame.rotation ?? 0) };
}

/** 사진 칸이 틀의 구멍 안에 들어 있는지(디자인이 만든 짝 모양인지) 판단해요. */
export function photoFitsFrameHole(frame: ImageBoxDef, photo: ImageBoxDef, doc: DocMm): boolean {
  const hole = frameHoleOf(frame);
  if (!hole) return false;
  if (isStickerImageBox(photo)) return false;
  const rel = relativeTo(frame, photo, doc);
  const [hx0, hy0, hx1, hy1] = hole;
  const hcx = (hx0 + hx1) / 2 - 0.5;
  const hcy = (hy0 + hy1) / 2 - 0.5;
  const hw = hx1 - hx0;
  const hh = hy1 - hy0;
  if (Math.abs(rel.cx - hcx) > hw * 0.12 || Math.abs(rel.cy - hcy) > hh * 0.12) return false;
  if (rel.w < hw * 0.8 || rel.w > hw * 1.25 || rel.h < hh * 0.8 || rel.h > hh * 1.25) return false;
  return angDiff(rel.drot, 0) <= 3;
}

/** 틀 스티커의 짝 사진 칸을 찾아요(없으면 undefined). */
export function findFramePhoto(frame: ImageBoxDef, boxes: readonly ImageBoxDef[], doc: DocMm = { w: 1, h: 1 }): ImageBoxDef | undefined {
  if (!frameHoleOf(frame)) return undefined;
  const cands = boxes.filter((b) => b.id !== frame.id && photoFitsFrameHole(frame, b, doc));
  if (cands.length === 0) return undefined;
  const linked = cands.filter((b) => b.designSlot && frame.forSlots?.includes(b.designSlot));
  const pool = linked.length ? linked : cands;
  // 가장 가운데에 가까운 칸
  const hole = frameHoleOf(frame)!;
  const hcx = (hole[0] + hole[2]) / 2 - 0.5;
  const hcy = (hole[1] + hole[3]) / 2 - 0.5;
  let best = pool[0];
  let bd = Infinity;
  for (const b of pool) {
    const r = relativeTo(frame, b, doc);
    const d = Math.hypot(r.cx - hcx, r.cy - hcy);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best;
}

/** 사진 칸이 속한 틀 스티커를 찾아요(없으면 undefined). 틀이 여러 개 겹쳐 있으면 위(zOrder 큰 것)·가까운 것. */
export function findPhotoFrame(photo: ImageBoxDef, boxes: readonly ImageBoxDef[], doc: DocMm = { w: 1, h: 1 }): ImageBoxDef | undefined {
  if (isStickerImageBox(photo)) return undefined;
  for (const f of boxes) {
    if (f.id === photo.id || !frameHoleOf(f)) continue;
    if (findFramePhoto(f, boxes, doc)?.id === photo.id) return f;
  }
  return undefined;
}

/** 틀이 oldFrame → newFrame 으로 움직이면(이동·크기·회전) 사진 칸이 같은 자리에 붙어 따라가도록 새 geo 를 계산해요. */
export function followFrame(oldFrame: Geo, newFrame: Geo, photo: Geo, doc: DocMm = { w: 1, h: 1 }): Pick<ImageBoxDef, "xPct" | "yPct" | "widthPct" | "heightPct" | "rotation"> {
  const rel = relativeTo(oldFrame, photo, doc);
  const fw = (newFrame.widthPct / 100) * doc.w;
  const fh = (newFrame.heightPct / 100) * doc.h;
  const fcx = (newFrame.xPct / 100) * doc.w + fw / 2;
  const fcy = (newFrame.yPct / 100) * doc.h + fh / 2;
  const a = rad(newFrame.rotation ?? 0);
  const lx = rel.cx * fw;
  const ly = rel.cy * fh;
  const pcx = fcx + lx * Math.cos(a) - ly * Math.sin(a);
  const pcy = fcy + lx * Math.sin(a) + ly * Math.cos(a);
  const pw = rel.w * fw;
  const ph = rel.h * fh;
  const rot = (newFrame.rotation ?? 0) + rel.drot;
  return {
    xPct: ((pcx - pw / 2) / doc.w) * 100,
    yPct: ((pcy - ph / 2) / doc.h) * 100,
    widthPct: (pw / doc.w) * 100,
    heightPct: (ph / doc.h) * 100,
    rotation: rot,
  };
}

const GEO_KEYS = ["xPct", "yPct", "widthPct", "heightPct", "rotation"] as const;
export const touchesGeometry = (changes: Partial<ImageBoxDef>) => GEO_KEYS.some((k) => k in changes);

/**
 * boxes 에서 boxId 박스가 바뀐 뒤(next)의 목록을 받아, 그 박스가 폴라로이드 틀이면 짝 사진 칸도 같이 움직인 목록을 돌려줘요.
 * prev = 바뀌기 전 목록(짝 찾기·상대 위치 계산 기준). 틀이 아니거나 짝이 없으면 next 를 그대로 돌려줘요.
 */
export function syncFramePhoto(prev: readonly ImageBoxDef[], next: ImageBoxDef[], boxId: string, doc?: DocMm): ImageBoxDef[] {
  const a = prev.find((b) => b.id === boxId);
  const b = next.find((x) => x.id === boxId);
  if (!a || !b || !frameHoleOf(a)) return next;
  if (!GEO_KEYS.some((k) => (a[k] ?? 0) !== (b[k] ?? 0))) return next;
  const photo = findFramePhoto(a, prev, doc);
  if (!photo) return next;
  const geo = followFrame(a, b, photo, doc);
  return next.map((x) => (x.id === photo.id ? { ...x, ...geo } : x));
}

/** 폴라로이드 한 덩어리의 맨 앞/맨 뒤 보내기 — 틀은 항상 사진 칸 바로 위에 있게 zOrder 를 정해요. 바꿀 것만 돌려줘요. */
export function groupStackUpdates(
  allZ: { id: string; z: number }[],
  frameId: string,
  photoId: string,
  action: "front" | "back"
): { id: string; z: number }[] {
  const others = allZ.filter((o) => o.id !== frameId && o.id !== photoId);
  if (action === "front") {
    const top = others.reduce((m, o) => Math.max(m, o.z), -1);
    return [
      { id: photoId, z: top + 1 },
      { id: frameId, z: top + 2 },
    ];
  }
  return [
    ...others.map((o) => ({ id: o.id, z: o.z + 2 })),
    { id: photoId, z: 0 },
    { id: frameId, z: 1 },
  ];
}
