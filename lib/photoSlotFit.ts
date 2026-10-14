// 사진의 가로·세로 모양을 보고 알맞은 칸에 넣는 순수 계산이에요(2026-10 35차).
// 규칙(한 펼침면 안):
//  1) 칸에 사진을 꽉 채워 넣을 때(cover) 사진이 "보이는 비율" = min(사진비/칸비, 칸비/사진비) (1 = 안 잘림, 0.5 = 절반이 잘려 나감).
//  2) 사진 n장은 디자인의 앞 n칸을 채워요(예전과 같아요). 그 n칸 안에서 "보이는 비율의 합"이 가장 큰 짝짓기를 골라요.
//  3) 단, 읽는 순서 첫 사진이 대표 칸(첫 칸)에서 벗어나면 0.10점, 다른 사진이 제자리를 벗어날 때마다 0.002점을 깎아요
//     → 첫 사진은 다른 사진이 "10%p 넘게" 더 잘 맞을 때만 대표 칸을 내줘요. 비슷하면 원래 순서 그대로예요.
//  4) 동점이면 칸 순서가 앞선 칸에 읽는 순서가 앞선 사진이 가요(항상 같은 입력 → 같은 결과).
//  5) 크기를 모르는 사진(원본 크기 1×1로 저장된 사진 등)은 "중립"이에요: 어느 칸에 가도 점수가 같아서 자리를 옮기지 않아요.
// 사용자가 만든 확대·이동·뒤집기·회전·필터는 사진과 함께 가요(여기서 건드리지 않아요) — 바꾸는 건 "어느 칸에 들어가느냐"뿐이에요.
import type { ImageBoxDef } from "./albumTemplates";
import { normalizePhotoQuarterTurn, orientedNaturalSize } from "./imageBoxGeometry";

export const SPREAD_ASPECT = 2; // 펼침면 가로:세로 = 2:1 (쪽 하나는 정사각형, lib/designKit와 같은 가정)
export const NEUTRAL_FIT = 0.7; // 크기를 모르는 사진의 점수(어느 칸이든 같은 값)
export const HERO_MOVE_PENALTY = 0.1;
export const MOVE_PENALTY = 0.002;
const BRUTE_FORCE_MAX = 8; // 이 장수까지는 모든 짝짓기를 따져요(칸 6개 안팎 디자인에 충분). 넘으면 칸 순서대로 욕심내서 골라요.

// 90도 돌림까지 반영한 "화면에 보이는" 사진 가로/세로 비. 모르면 null.
export function photoAspectOfBox(b: Pick<ImageBoxDef, "naturalWidth" | "naturalHeight" | "photoRotation">): number | null {
  const w = b.naturalWidth;
  const h = b.naturalHeight;
  if (!(w > 0) || !(h > 0) || !Number.isFinite(w) || !Number.isFinite(h)) return null;
  if (w === 1 && h === 1) return null; // 크기를 못 읽을 때 채워 넣는 기본값(1×1) = 모름
  const o = orientedNaturalSize(w, h, normalizePhotoQuarterTurn(b.photoRotation));
  return o.w / o.h;
}

// 칸(펼침면 기준 %)의 실제 가로/세로 비. frameAspect = 그 좌표계 전체의 가로/세로 비(펼침면 2, 표지 한 판 ≈ 1).
export function slotAspectOf(slot: { widthPct: number; heightPct: number }, frameAspect: number = SPREAD_ASPECT): number | null {
  if (!(slot.widthPct > 0) || !(slot.heightPct > 0)) return null;
  return (slot.widthPct / slot.heightPct) * frameAspect;
}

// 사진이 칸에 꽉 채워 들어갈 때 보이는 비율(0~1). 둘 중 하나라도 모르면 중립.
export function visibleFraction(photoAspect: number | null, slotAspect: number | null): number {
  if (photoAspect === null || slotAspect === null || !(photoAspect > 0) || !(slotAspect > 0)) return NEUTRAL_FIT;
  const r = photoAspect / slotAspect;
  return r < 1 ? r : 1 / r;
}

// 사진 n장(읽는 순서) ↔ 칸 n개. 반환: out[칸번호] = 그 칸에 들어갈 사진 번호(읽는 순서 번호).
export function assignPhotosToSlots(photoAspects: readonly (number | null)[], slotAspects: readonly (number | null)[]): number[] {
  const n = Math.min(photoAspects.length, slotAspects.length);
  const identity = Array.from({ length: n }, (_, i) => i);
  if (n <= 1) return identity;
  if (photoAspects.slice(0, n).every((a) => a === null)) return identity;
  const fit: number[][] = []; // fit[칸][사진]
  for (let s = 0; s < n; s++) {
    fit.push([]);
    for (let p = 0; p < n; p++) fit[s].push(visibleFraction(photoAspects[p], slotAspects[s]));
  }
  const penalty = (s: number, p: number) => (s === p ? 0 : p === 0 ? HERO_MOVE_PENALTY : MOVE_PENALTY);
  if (n > BRUTE_FORCE_MAX) {
    const left = new Set(identity);
    const out: number[] = [];
    for (let s = 0; s < n; s++) {
      let best = -1;
      let bestScore = -Infinity;
      for (const p of left) {
        const sc = fit[s][p] - penalty(s, p);
        if (sc > bestScore + 1e-9) { bestScore = sc; best = p; }
      }
      left.delete(best);
      out.push(best);
    }
    return out;
  }
  let bestOut = identity.slice();
  let bestScore = -Infinity;
  const cur: number[] = new Array(n);
  const used = new Array<boolean>(n).fill(false);
  const rec = (s: number, acc: number) => {
    if (s === n) {
      // 칸 순서대로 사진 번호를 작은 것부터 시도하므로, 동점(오차 1e-9 안)이면 먼저 찾은 것(사전순으로 앞선 것)을 유지해요.
      if (acc > bestScore + 1e-9) { bestScore = acc; bestOut = cur.slice(); }
      return;
    }
    for (let p = 0; p < n; p++) {
      if (used[p]) continue;
      used[p] = true;
      cur[s] = p;
      rec(s + 1, acc + fit[s][p] - penalty(s, p));
      used[p] = false;
    }
  };
  rec(0, 0);
  return bestOut;
}

// 사진 n장(읽는 순서)을 칸 n개에 위 규칙(assignPhotosToSlots)대로 넣었을 때 "보이는 비율"의 평균(0~1). 앨범 테마 계획(lib/designThemeSets.ts)이
// 디자인을 고를 때 쓰고, 실제 적용도 같은 함수로 배정하니까 계획과 적용이 같은 기준이에요. 사진 크기를 하나도 모르면 null(= 비교할 근거 없음).
export function bestFitAverage(photoAspects: readonly (number | null)[], slotAspects: readonly (number | null)[]): number | null {
  const n = Math.min(photoAspects.length, slotAspects.length);
  if (n === 0 || photoAspects.slice(0, n).every((a) => a === null)) return null;
  const perm = assignPhotosToSlots(photoAspects.slice(0, n), slotAspects.slice(0, n));
  let sum = 0;
  for (let s = 0; s < n; s++) sum += visibleFraction(photoAspects[perm[s]], slotAspects[s]);
  return sum / n;
}

// 빈 칸 채우기용: 줄 선 사진(읽는 순서) 앞쪽 window장 안에서 칸마다 가장 잘 맞는 사진을 골라요.
// 가장 잘 맞는 (칸, 사진) 짝부터 하나씩 확정(동점이면 칸 앞선 쪽 → 줄 앞선 사진). 반환: [{ slot: 빈칸번호, queueIdx }]
export function pickFillers(
  queueAspects: readonly (number | null)[],
  emptyAspects: readonly (number | null)[],
  window: number
): { slot: number; queueIdx: number }[] {
  const k = Math.min(emptyAspects.length, queueAspects.length);
  if (k === 0) return [];
  const w = Math.min(queueAspects.length, Math.max(k, window));
  const slotsLeft = new Set(emptyAspects.map((_, i) => i));
  const photosLeft = new Set(Array.from({ length: w }, (_, i) => i));
  const out: { slot: number; queueIdx: number }[] = [];
  while (out.length < k) {
    let bs = -1;
    let bp = -1;
    let bf = -Infinity;
    for (const s of slotsLeft) {
      for (const p of photosLeft) {
        // 줄 앞쪽 사진을 아주 조금 더 쳐줘요(같은 점수면 앞선 사진, 멀리 있는 사진을 끌어오는 건 이득이 클 때만)
        const f = visibleFraction(queueAspects[p], emptyAspects[s]) - p * 0.002;
        if (f > bf + 1e-9) { bf = f; bs = s; bp = p; }
      }
    }
    slotsLeft.delete(bs);
    photosLeft.delete(bp);
    out.push({ slot: bs, queueIdx: bp });
  }
  return out;
}

// 사진 박스들(읽는 순서)을 칸(slots 순서)에 맞춰 다시 늘어놓아요: 반환 배열의 i번째 = i번째 칸에 들어갈 박스.
// 박스는 그대로(자르기·돌리기·뒤집기·필터 값 포함) 돌려주고 순서만 바꿔요. 박스가 칸보다 적으면 앞 칸부터 채워요.
export function fitBoxesToSlots<T extends Pick<ImageBoxDef, "naturalWidth" | "naturalHeight" | "photoRotation">>(
  boxes: readonly T[],
  slots: readonly { widthPct: number; heightPct: number }[],
  frameAspect: number = SPREAD_ASPECT
): T[] {
  const n = Math.min(boxes.length, slots.length);
  if (n <= 1) return boxes.slice(0, n);
  const perm = assignPhotosToSlots(
    boxes.slice(0, n).map(photoAspectOfBox),
    slots.slice(0, n).map((s) => slotAspectOf(s, frameAspect))
  );
  return perm.map((p) => boxes[p]);
}
