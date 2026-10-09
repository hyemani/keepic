// "가장자리 페이드" — 사진의 가운데는 또렷하게 두고 가장자리로 갈수록 서서히 투명해져서, 사진이 뒤의 배경
// (흰 종이·색 배경·다른 사진)에 스며들게 하는 효과예요. 화면(CSS mask-image)과 인쇄(canvas destination-in)가
// 이 파일의 renderEdgeFadeMask() 하나가 만든 "투명도 마스크"(진짜 알파 채널)를 똑같이 쓰고, 마스크 안에는
// 색이 전혀 없어요(배경색을 덧칠하는 방식이 아니라서 어떤 배경 위에서도 자연스럽게 섞여요).
//
// 규칙(모든 값이 박스 크기 기준 비율이라 화면 확대/축소·인쇄 해상도와 무관해요):
//   · width    = 페이드 폭, 박스 "짧은 변"에 대한 비율(0.02~0.5). 저장값은 비율이에요(px가 아니에요).
//   · strength = 0~100. 100이면 가장자리가 완전히 투명, 0이면 효과 없음(알파 = 1 − 강도 × (1 − 곡선(거리/폭)))
//   · direction: all(전체) = 사진 모양 외곽선까지의 거리, left/right/top/bottom = 그 방향으로 외곽선까지
//     막힘없이 이어진 길이(오목한 구름·톱니 홈에서도 외곽선을 따라가요).
//   · 모양(구름·타원·톱니·하트 등)은 frameOutlinePathD() 가 만든 외곽선을 그대로 써요 → 사진을 자르는 모양과 같아요.
// 이 효과는 "사진"에만 적용돼요. 테두리 띠·무늬·장식 프레임·스티커·글자는 페이드 위에 그대로(변함없이) 그려져요.

export type EdgeFadeDirection = "all" | "left" | "right" | "top" | "bottom";

export type EdgeFade = {
  enabled: boolean;
  width: number; // 박스 짧은 변 대비 비율 0.02~0.5
  strength: number; // 0~100
  direction: EdgeFadeDirection;
};

export const EDGE_FADE_WIDTH_RANGE = { min: 2, max: 50, default: 18 } as const; // UI 단위 %(저장은 /100 비율)
export const EDGE_FADE_STRENGTH_RANGE = { min: 0, max: 100, default: 100 } as const;
export const EDGE_FADE_DIRECTIONS: { id: EdgeFadeDirection; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "left", label: "왼쪽" },
  { id: "right", label: "오른쪽" },
  { id: "top", label: "위" },
  { id: "bottom", label: "아래" },
];

export const DEFAULT_EDGE_FADE: EdgeFade = {
  enabled: false,
  width: EDGE_FADE_WIDTH_RANGE.default / 100,
  strength: EDGE_FADE_STRENGTH_RANGE.default,
  direction: "all",
};

/** 저장된(없거나 일부만 있는) 값을 안전한 값으로 채워요. 없으면(예전 저장본) 꺼짐. */
export function resolveEdgeFade(f?: Partial<EdgeFade> | null): EdgeFade {
  const dir = f?.direction;
  return {
    enabled: !!f?.enabled,
    width: Math.min(0.5, Math.max(0.02, Number.isFinite(f?.width as number) ? (f!.width as number) : DEFAULT_EDGE_FADE.width)),
    strength: Math.min(100, Math.max(0, Number.isFinite(f?.strength as number) ? (f!.strength as number) : DEFAULT_EDGE_FADE.strength)),
    direction: dir === "left" || dir === "right" || dir === "top" || dir === "bottom" ? dir : "all",
  };
}

/** 켜져 있고 실제로 투명해지는 효과(강도>0)가 있을 때만 true — false면 화면·인쇄 모두 예전 그리기 경로 그대로예요. */
export function isEdgeFadeActive(f?: Partial<EdgeFade> | null): boolean {
  if (!f || !f.enabled) return false;
  const r = resolveEdgeFade(f);
  return r.strength > 0;
}

// 1차원 거리 변환(Felzenszwalb) — 제곱 거리, 입력 f[i]=0(특징점) 또는 큰 값.
function dt1d(f: Float32Array, n: number, out: Float32Array, v: Int32Array, z: Float32Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = 0;
    for (;;) {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s <= z[k] && k > 0) k--;
      else break;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const p = v[k];
    out[q] = (q - p) * (q - p) + f[p];
  }
}

function smooth(t: number): number {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * 투명도 마스크를 그려요. outlineD = 사진을 자르는 외곽선(SVG path, 박스 px 좌표 0..boxW × 0..boxH,
 * lib/frameShapes.ts frameOutlinePathD). 돌려주는 캔버스는 (긴 변 maxSide px 이하) 크기이고 RGBA 중
 * 알파만 의미가 있어요(색은 검정). 화면에선 CSS mask-size:100% 100%, 인쇄에선 박스 크기로 늘려서 destination-in.
 */
export function renderEdgeFadeMask(
  outlineD: string,
  boxW: number,
  boxH: number,
  fadeIn: Partial<EdgeFade>,
  maxSide: number
): HTMLCanvasElement {
  const fade = resolveEdgeFade(fadeIn);
  const k = maxSide / Math.max(1, Math.max(boxW, boxH));
  const gw = Math.max(2, Math.round(boxW * k));
  const gh = Math.max(2, Math.round(boxH * k));
  // 1) 모양 안쪽 = 1 인 래스터
  const shape = makeCanvas(gw, gh);
  const sctx = shape.getContext("2d", { willReadFrequently: true })!;
  sctx.setTransform(gw / boxW, 0, 0, gh / boxH, 0, 0);
  sctx.fillStyle = "#000";
  sctx.fill(new Path2D(outlineD));
  const src = sctx.getImageData(0, 0, gw, gh).data;
  const inside = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) inside[i] = src[i * 4 + 3] >= 128 ? 1 : 0;
  // 2) 가장자리까지의 거리(마스크 px)
  const dist = new Float32Array(gw * gh);
  if (fade.direction === "all") {
    // 모양 밖(과 격자 바깥 한 칸)을 특징점으로 하는 유클리드 거리 변환
    const W2 = gw + 2;
    const H2 = gh + 2;
    const INF = 1e12;
    const g = new Float32Array(W2 * H2);
    for (let y = 0; y < H2; y++)
      for (let x = 0; x < W2; x++) {
        const ix = x - 1;
        const iy = y - 1;
        const ins = ix >= 0 && iy >= 0 && ix < gw && iy < gh && inside[iy * gw + ix] === 1;
        g[y * W2 + x] = ins ? INF : 0;
      }
    const n = Math.max(W2, H2);
    const col = new Float32Array(n);
    const colOut = new Float32Array(n);
    const v = new Int32Array(n);
    const z = new Float32Array(n + 1);
    for (let x = 0; x < W2; x++) {
      for (let y = 0; y < H2; y++) col[y] = g[y * W2 + x];
      dt1d(col, H2, colOut, v, z);
      for (let y = 0; y < H2; y++) g[y * W2 + x] = colOut[y];
    }
    for (let y = 0; y < H2; y++) {
      for (let x = 0; x < W2; x++) col[x] = g[y * W2 + x];
      dt1d(col, W2, colOut, v, z);
      for (let x = 0; x < W2; x++) g[y * W2 + x] = colOut[x];
    }
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const d2 = g[(y + 1) * W2 + (x + 1)];
        dist[y * gw + x] = inside[y * gw + x] ? Math.max(0.5, Math.sqrt(d2) - 0.5) : 0;
      }
  } else {
    // 그 방향으로 외곽선(또는 박스 끝)까지 막힘없이 이어진 길이
    if (fade.direction === "left" || fade.direction === "right") {
      for (let y = 0; y < gh; y++) {
        let run = 0;
        if (fade.direction === "left") {
          for (let x = 0; x < gw; x++) {
            run = inside[y * gw + x] ? run + 1 : 0;
            dist[y * gw + x] = run ? run - 0.5 : 0;
          }
        } else {
          for (let x = gw - 1; x >= 0; x--) {
            run = inside[y * gw + x] ? run + 1 : 0;
            dist[y * gw + x] = run ? run - 0.5 : 0;
          }
        }
      }
    } else {
      for (let x = 0; x < gw; x++) {
        let run = 0;
        if (fade.direction === "top") {
          for (let y = 0; y < gh; y++) {
            run = inside[y * gw + x] ? run + 1 : 0;
            dist[y * gw + x] = run ? run - 0.5 : 0;
          }
        } else {
          for (let y = gh - 1; y >= 0; y--) {
            run = inside[y * gw + x] ? run + 1 : 0;
            dist[y * gw + x] = run ? run - 0.5 : 0;
          }
        }
      }
    }
  }
  // 3) 거리 → 알파. 폭 = 박스 짧은 변 × width (마스크 px). 방향이 있을 땐 한 방향 거리라서 같은 폭을 그대로 써요.
  const wpx = Math.max(1, fade.width * Math.min(boxW, boxH) * k);
  const s = fade.strength / 100;
  const out = makeCanvas(gw, gh);
  const octx = out.getContext("2d")!;
  const img = octx.createImageData(gw, gh);
  for (let i = 0; i < gw * gh; i++) {
    const a = 1 - s * (1 - smooth(dist[i] / wpx));
    img.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
  }
  octx.putImageData(img, 0, 0);
  return out;
}

const MASK_URL_CACHE = new Map<string, string>();

/** 화면용: 마스크를 data URL(PNG)로 만들어요(같은 입력은 캐시). 긴 변 maxSide px(기본 320 — 페이드는 부드러워서 충분해요). */
export function edgeFadeMaskUrl(
  outlineD: string,
  boxW: number,
  boxH: number,
  fade: Partial<EdgeFade>,
  maxSide: number = 320
): string {
  const f = resolveEdgeFade(fade);
  const key = `${f.direction}|${f.width.toFixed(4)}|${f.strength.toFixed(1)}|${Math.round(boxW)}x${Math.round(boxH)}|${outlineD.length}|${hashStr(outlineD)}`;
  const hit = MASK_URL_CACHE.get(key);
  if (hit) return hit;
  const url = renderEdgeFadeMask(outlineD, Math.max(1, boxW), Math.max(1, boxH), f, maxSide).toDataURL("image/png");
  if (MASK_URL_CACHE.size > 60) MASK_URL_CACHE.clear();
  MASK_URL_CACHE.set(key, url);
  return url;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
