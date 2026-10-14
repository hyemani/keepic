// 밀려난 사진을 책 전체의 빈 칸에 한꺼번에 짝지어 주는 순수 계산이에요(2026-10 38차).
// 예전(34~37차)에는 펼침면을 책 순서로 하나씩 보면서 그 펼침면 빈 칸에 줄 앞쪽 사진을 넣었어요(펼침면 안에서만 최적).
// 이제는 "밀려난 사진 전부 × 책 전체 빈 칸 전부"를 한 번에 보고 이렇게 정해요:
//  1) 사진이 칸에 꽉 채워 들어갈 때 보이는 비율(lib/photoSlotFit.ts visibleFraction)이 REFILL_MIN_VISIBLE(0.55) 미만이면 그 칸에는 넣지 않아요
//     (너무 많이 잘리느니 칸을 비우거나 사진을 사진 목록에 두는 쪽이 낫다는 뜻이에요). 모양을 모르는 사진은 "중립"이라 어디든 갈 수 있어요.
//  2) 가능한 짝 중에서 (보이는 비율 − 0.55 + REFILL_PLACE_BONUS)의 합이 가장 큰 짝짓기를 골라요(헝가리안 방법). 보너스(0.5)가 보이는 비율 차이(최대 0.45)보다 커서 "많이 넣기"가 항상 "조금 더 잘 맞기"보다 먼저예요.
//  3) 거의 동점이면 줄 앞쪽 사진이 책 앞쪽 칸으로 가요(읽는 순서와 칸 순서가 비슷하게, 마지막 펼침면에 몰리지 않게).
// 항상 같은 입력 → 같은 결과예요. 사진이 N장, 칸이 M개일 때 O(min² · max)라 100장도 몇 ms예요.
import { visibleFraction } from "./photoSlotFit";

export const REFILL_MIN_VISIBLE = 0.55;
export const REFILL_PLACE_BONUS = 0.5;
const ORDER_WEIGHT = 0.02; // 줄 번호와 칸 번호가 다를수록 깎는 점수(차이 ÷ max(N,M) × 이 값)
const EARLY_WEIGHT = 0.01; // 책 앞쪽 칸을 아주 조금 더 쳐줘요

// 직사각형(행 ≤ 열) 비용표(한 줄로 편 배열, cost[행 * cols + 열])의 최소 비용 배정(행마다 서로 다른 열). 반환: out[행] = 열.
export function hungarianMinFlat(cost: Float64Array, n: number, m: number): number[] {
  if (n === 0) return [];
  const INF = 1e18;
  const u = new Float64Array(n + 1);
  const v = new Float64Array(m + 1);
  const p = new Int32Array(m + 1);
  const way = new Int32Array(m + 1);
  const minv = new Float64Array(m + 1);
  const used = new Uint8Array(m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    minv.fill(INF);
    used.fill(0);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      const row = (i0 - 1) * m;
      const ui = u[i0];
      let delta = INF;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[row + j - 1] - ui - v[j];
        if (cur < minv[j] - 1e-12) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta - 1e-12) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const out = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j] !== 0) out[p[j] - 1] = j - 1;
  return out;
}
export function hungarianMin(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0].length;
  const flat = new Float64Array(n * m);
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) flat[i * m + j] = cost[i][j];
  return hungarianMinFlat(flat, n, m);
}

// 밀려난 사진(줄 순서) × 빈 칸(책 순서)을 한꺼번에 짝지어요. 반환: [{ slot, queueIdx }] (칸 번호 순). 짝이 안 된 사진·칸은 목록에 없어요.
export function assignQueueGlobally(
  queueAspects: readonly (number | null)[],
  slotAspects: readonly (number | null)[],
  minVisible: number = REFILL_MIN_VISIBLE
): { slot: number; queueIdx: number }[] {
  const n = queueAspects.length;
  const m = slotAspects.length;
  if (n === 0 || m === 0) return [];
  const scale = Math.max(n, m);
  // 가치표(못 넣는 짝은 0 = 안 넣음). 행 ≤ 열이 되게 사진이 더 많으면 칸을 행으로 둬요(전치).
  const transpose = n > m;
  const rows = transpose ? m : n;
  const cols = transpose ? n : m;
  const value = new Float64Array(n * m); // value[사진 * m + 칸]
  const cost = new Float64Array(rows * cols);
  for (let q = 0; q < n; q++) {
    for (let s = 0; s < m; s++) {
      const f = visibleFraction(queueAspects[q], slotAspects[s]);
      const val = f < minVisible - 1e-9 ? 0 : Math.max(1e-6, f - minVisible + REFILL_PLACE_BONUS - (ORDER_WEIGHT * Math.abs(q - s)) / scale - (EARLY_WEIGHT * s) / m);
      value[q * m + s] = val;
      if (transpose) cost[s * cols + q] = -val;
      else cost[q * cols + s] = -val;
    }
  }
  const pick = hungarianMinFlat(cost, rows, cols);
  const out: { slot: number; queueIdx: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const c = pick[r];
    if (c < 0) continue;
    const q = transpose ? c : r;
    const s = transpose ? r : c;
    if (value[q * m + s] > 0) out.push({ slot: s, queueIdx: q });
  }
  return out.sort((a, b) => a.slot - b.slot);
}
