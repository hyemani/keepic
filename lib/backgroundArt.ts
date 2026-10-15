// 내지·표지 배경 "그래픽 / 패턴 / 텍스처" 중 코드로 그리는 무늬들이에요(전부 직접 그린 원본 — 외부 이미지·에셋 없음).
//
// 화면 미리보기·왼쪽 패널 썸네일·인쇄 PDF가 "이 함수 하나"를 같이 써서 항상 같은 결과가 나와요.
// 모든 크기는 mm 기준이고(mmToPxFn으로 px로 바꿔요), 무늬 위상은 "펼침면(span) 왼쪽 위"를 기준으로
// 잡아서 왼쪽·오른쪽 낱장이 가운데에서 어긋나지 않아요. 무작위 배치는 id에서 만든 씨앗(seed)으로 정해서
// 화면과 인쇄(해상도가 달라도)가 똑같은 모양이에요. 호출하는 쪽(drawBackgroundPatternOnCanvas)이
// 이미 (x,y,w,h)로 클립하고 첫 번째 색(c0)으로 바탕을 칠한 뒤 불러요.

import { COVER_SPINE_BAND_OVERHANG_MM } from "./coverSpine";
export type ArtPreset = { id: string; kind: string; colors: [string, string]; spacingMm?: number };
type Rect = { x: number; y: number; w: number; h: number; spineW?: number }; // spineW: 표지 펼침면일 때 책등 폭(px) — splitSpine만 읽어요

// ---------- 작은 도우미 ----------
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function mixHex(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash2(x: number, y: number, seed: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
// 가로·세로가 n칸마다 되풀이되는 값 잡음(이음매 없는 타일용), 0~1
function periodicNoise(u: number, v: number, n: number, seed: number): number {
  const fx = u * n;
  const fy = v * n;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const tx = fx - ix;
  const ty = fy - iy;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const g = (a: number, b: number) => hash2(((a % n) + n) % n, ((b % n) + n) % n, seed);
  const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
  const b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
  return a + (b - a) * sy;
}

// ---------- 텍스처 타일(120mm마다 되풀이, 이음매 없음) ----------
const TILE_MM = 120;
const tileCache = new Map<string, HTMLCanvasElement>();

function makeTile(kind: "paper" | "linen" | "grain", id: string, colors: [string, string], ppm: number): HTMLCanvasElement {
  const key = `${kind}|${id}|${colors.join(",")}|${ppm.toFixed(3)}`;
  const hit = tileCache.get(key);
  if (hit) return hit;
  const size = Math.max(48, Math.min(2400, Math.round(TILE_MM * ppm)));
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(size, size);
  const d = img.data;
  const seed = seedOf(id);
  const dark = hexToRgb(colors[1]);
  const light: [number, number, number] = [255, 255, 255];
  const threadMm = kind === "linen" ? 1.2 : 0;
  const nThreads = Math.round(TILE_MM / (threadMm || 1));
  for (let ty = 0; ty < size; ty++) {
    const v = ty / size;
    for (let tx = 0; tx < size; tx++) {
      const u = tx / size;
      let val: number;
      if (kind === "linen") {
        const fu = u * nThreads;
        const fv = v * nThreads;
        const i = Math.floor(fu);
        const j = Math.floor(fv);
        const au = fu - i;
        const av = fv - j;
        const over = (i + j) & 1;
        // 실 하나의 둥근 단면: 가운데가 밝고 가장자리가 어두워요. 위/아래로 교차하는 실은 방향이 달라요.
        const prof = over ? Math.sin(Math.PI * av) : Math.sin(Math.PI * au);
        const thread = (over ? hash2(j, 7, seed) : hash2(i, 13, seed)) - 0.5;
        val = 0.5 + (prof - 0.6) * 0.45 + thread * 0.25;
        val += (periodicNoise(u, v, 480, seed + 3) - 0.5) * 0.25;
      } else if (kind === "grain") {
        val = periodicNoise(u, v, 600, seed) * 0.6 + periodicNoise(u, v, 240, seed + 5) * 0.4;
      } else {
        val =
          periodicNoise(u, v, 600, seed) * 0.45 +
          periodicNoise(u, v, 240, seed + 1) * 0.3 +
          periodicNoise(u, v, 40, seed + 2) * 0.25;
      }
      const o = (ty * size + tx) * 4;
      if (val > 0.5) {
        d[o] = light[0];
        d[o + 1] = light[1];
        d[o + 2] = light[2];
        d[o + 3] = Math.min(255, (val - 0.5) * 2 * 150);
      } else {
        d[o] = dark[0];
        d[o + 1] = dark[1];
        d[o + 2] = dark[2];
        d[o + 3] = Math.min(255, (0.5 - val) * 2 * 110);
      }
    }
  }
  g.putImageData(img, 0, 0);
  if (kind === "paper") {
    // 종이 섬유: 짧고 가는 곡선(타일 가장자리를 넘어가면 반대편에서도 이어서 그려요)
    const rnd = mulberry32(seed ^ 0x9e3779b9);
    const count = Math.round(TILE_MM * 2.2);
    for (let n = 0; n < count; n++) {
      const x0 = rnd() * size;
      const y0 = rnd() * size;
      const len = (3 + rnd() * 6) * ppm;
      const ang = rnd() * Math.PI * 2;
      const bend = (rnd() - 0.5) * 1.2;
      const lightFiber = rnd() < 0.5;
      g.strokeStyle = lightFiber ? "rgba(255,255,255,0.28)" : rgba(colors[1], 0.22);
      g.lineWidth = Math.max(0.6, 0.12 * ppm);
      for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
        g.beginPath();
        g.moveTo(x0 + dx, y0 + dy);
        g.quadraticCurveTo(
          x0 + dx + Math.cos(ang + bend) * len * 0.5,
          y0 + dy + Math.sin(ang + bend) * len * 0.5,
          x0 + dx + Math.cos(ang) * len,
          y0 + dy + Math.sin(ang) * len
        );
        g.stroke();
      }
    }
  }
  tileCache.set(key, cv);
  return cv;
}

function fillTexture(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, r: Rect, alpha = 1) {
  const pat = ctx.createPattern(tile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pat;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// ---------- 그래픽 ----------
function cloudPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number) {
  const h = w * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + h / 2, cy + h / 2);
  ctx.arc(cx - w / 2 + h / 2, cy, h / 2, Math.PI / 2, Math.PI * 1.5);
  ctx.arc(cx - w * 0.2, cy - h * 0.38, h * 0.52, Math.PI * 0.95, Math.PI * 1.95);
  ctx.arc(cx + w * 0.12, cy - h * 0.5, h * 0.66, Math.PI * 1.05, Math.PI * 2.05);
  ctx.arc(cx + w / 2 - h / 2, cy, h / 2, Math.PI * 1.5, Math.PI / 2);
  ctx.closePath();
}


// ---- 2026-13 새 구름·아치(옛 id의 그림은 그대로 두고 새 kind만 써요) ----
// 부드러운 작은 구름 한 송이(밑이 둥근 캡슐 + 위로 봉긋한 두 덩이를 한 번에 채워서 겹침 얼룩이 없어요). u = 구름 폭.
function softCloudPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, u: number) {
  const k = (v: number) => v * u;
  ctx.beginPath();
  ctx.moveTo(cx - k(0.35), cy - k(0.05));
  ctx.lineTo(cx + k(0.35), cy - k(0.05));
  ctx.arc(cx + k(0.35), cy + k(0.1), k(0.15), -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx - k(0.35), cy + k(0.25));
  ctx.arc(cx - k(0.35), cy + k(0.1), k(0.15), Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.moveTo(cx - k(0.17) + k(0.2), cy - k(0.02));
  ctx.arc(cx - k(0.17), cy - k(0.02), k(0.2), 0, Math.PI * 2);
  ctx.moveTo(cx + k(0.1) + k(0.27), cy - k(0.08));
  ctx.arc(cx + k(0.1), cy - k(0.08), k(0.27), 0, Math.PI * 2);
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, centre: string) {
  ctx.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = centre;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -len * 0.34, len, 0);
  ctx.quadraticCurveTo(len * 0.45, len * 0.34, 0, 0);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = Math.max(0.5, len * 0.025);
  ctx.beginPath();
  ctx.moveTo(len * 0.06, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

function drawVine(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  angle: number,
  lengthPx: number,
  curve: number,
  leafPx: number,
  colorA: string,
  colorB: string,
  rnd: () => number
) {
  const steps = Math.max(4, Math.round(lengthPx / (leafPx * 0.9)));
  let x = sx;
  let y = sy;
  let a = angle;
  ctx.strokeStyle = colorB;
  ctx.lineWidth = Math.max(1, leafPx * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  const pts: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const step = lengthPx / steps;
    a += curve;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    ctx.lineTo(x, y);
    pts.push([x, y, a]);
  }
  ctx.stroke();
  pts.forEach(([px, py, pa], i) => {
    const s = leafPx * (1 - (i / steps) * 0.45) * (0.85 + rnd() * 0.3);
    drawLeaf(ctx, px, py, s, pa - 0.75, i % 2 ? colorA : colorB);
    drawLeaf(ctx, px, py, s * 0.9, pa + 0.75, i % 2 ? colorB : colorA);
  });
}

// 도련(재단선 바깥 여분) 크기를 펼침면(span) 모양으로 짐작해요: 내지 펼침(가로:세로 2:1)·내지 낱장(1:1)은 5mm,
// 그 외(표지 전체·표지 한 면)는 하드커버 날개 도련 20mm로 넉넉히 봐요. 장식은 재단선 안쪽에 두려는 거라
// 화면·썸네일·인쇄 모두 같은 span을 받으니 같은 결과가 나와요.
function inferBleedMm(span: Rect): number {
  const ratio = span.w / span.h;
  if (Math.abs(ratio - 2) < 0.03 || Math.abs(ratio - 1) < 0.005) return 5;
  return 20;
}

// 모서리 장식(가는 선 식물 그림·가는 호). 펼침면(span)의 바깥 모서리에 붙이고, 안쪽으로 낱장 폭의 15% 안에서만 그려서
// 사진 영역으로 들어가지 않아요. 모든 크기는 mm 기준(선 굵기 0.4~0.5mm, 잎 길이 3~6mm)이라 화면·썸네일·인쇄가 같아요.
function drawCornerOrnaments(
  ctx: CanvasRenderingContext2D,
  kind: "vine" | "arc",
  allFour: boolean,
  span: Rect,
  ppm: number,
  color: string
) {
  const mm = (v: number) => v * ppm;
  // 가로로 긴 펼침면(내지 두 쪽, 표지 전체)이면 낱장 폭은 절반으로 봐요.
  const bleed = mm(inferBleedMm(span));
  const trimW = span.w - bleed * 2;
  const trimH = span.h - bleed * 2;
  const pageW = trimW / (span.w > span.h * 1.3 ? 2 : 1);
  const R = Math.min(mm(30), pageW * 0.15, trimH * 0.15);
  const corners: [number, number][] = allFour
    ? [[1, 1], [-1, 1], [-1, -1], [1, -1]]
    : [[1, 1], [-1, -1]];
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [sx, sy] of corners) {
    ctx.save();
    ctx.translate(sx === 1 ? span.x + bleed : span.x + span.w - bleed, sy === 1 ? span.y + bleed : span.y + span.h - bleed);
    ctx.scale(sx, sy);
    if (kind === "arc") {
      ctx.lineWidth = Math.max(0.8, mm(0.4));
      for (const f of [0.55, 0.85]) {
        ctx.beginPath();
        ctx.arc(0, 0, R * f, 0, Math.PI / 2);
        ctx.stroke();
      }
    } else {
      // 줄기: 모서리를 감싸는 완만한 곡선(재단선에서 12mm 안쪽에서 시작·끝(잎이 바깥으로 나와도 재단선에서 5mm 이상 안쪽))
      const q = mm(12);
      const a = { x: q, y: R * 0.92 };
      const c = { x: q + R * 0.04, y: q + R * 0.04 };
      const b = { x: R * 0.92, y: q };
      const at = (t: number) => ({
        x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
        y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y,
      });
      const tan = (t: number) =>
        Math.atan2(2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y), 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x));
      ctx.lineWidth = Math.max(0.8, mm(0.5));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      ctx.stroke();
      // 잎 5장(작게): 줄기 양옆에 번갈아, 가운데가 가장 크고 끝으로 갈수록 작아져요
      const ts = [0.14, 0.31, 0.5, 0.69, 0.86];
      const sizes = [0.19, 0.23, 0.25, 0.22, 0.18];
      ctx.lineWidth = Math.max(0.7, mm(0.4));
      ts.forEach((t, i) => {
        const pt = at(t);
        const ang = tan(t) + (i % 2 ? -1 : 1) * 0.85;
        const len = R * sizes[i] * 1.0;
        ctx.save();
        ctx.translate(pt.x, pt.y);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -len * 0.3, len, 0);
        ctx.quadraticCurveTo(len * 0.5, len * 0.3, 0, 0);
        ctx.moveTo(len * 0.1, 0);
        ctx.lineTo(len * 0.7, 0);
        ctx.stroke();
        ctx.restore();
      });
    }
    ctx.restore();
  }
}

function drawGraphic(ctx: CanvasRenderingContext2D, p: ArtPreset, r: Rect, span: Rect, ppm: number) {
  const [c0, c1] = p.colors;
  const rnd = mulberry32(seedOf(p.id));
  const mm = (v: number) => v * ppm;
  const sw = span.w;
  const sh = span.h;
  const ox = span.x;
  const oy = span.y;
  switch (p.kind) {
    case "clouds": {
      const cell = mm(95);
      const cols = Math.ceil(sw / cell) + 1;
      const rows = Math.ceil(sh / cell) + 1;
      ctx.fillStyle = rgba(c1, 0.92);
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const a = rnd();
          const b = rnd();
          const c = rnd();
          const d = rnd();
          if (d < 0.22) continue;
          const w = mm(48 + a * 38);
          cloudPath(ctx, ox + (i + 0.2 + b * 0.6) * cell + (j % 2) * cell * 0.35, oy + (j + 0.25 + c * 0.5) * cell, w);
          ctx.fill();
        }
      }
      break;
    }
    case "cloudsSoft": {
      // 작은 구름이 엇갈린 줄(홀수 줄은 반 칸 밀림)로 빈틈없이 고르게 반복돼요. 하늘·블러시는 바탕색만 달라요.
      const pitchX = mm(30);
      const pitchY = mm(17);
      const j0 = Math.floor((r.y - oy) / pitchY) - 1;
      const j1 = Math.ceil((r.y + r.h - oy) / pitchY) + 1;
      const i0 = Math.floor((r.x - ox) / pitchX) - 2;
      const i1 = Math.ceil((r.x + r.w - ox) / pitchX) + 1;
      ctx.fillStyle = rgba(c1, 0.92);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const u = mm(15 + hash2(i, j, 7) * 6);
          const cx = ox + (i + 0.5 + ((j & 1) ? 0.5 : 0)) * pitchX;
          const cy = oy + (j + 0.5) * pitchY;
          if (cx + u < r.x || cx - u > r.x + r.w || cy + u < r.y || cy - u > r.y + r.h) continue;
          softCloudPath(ctx, cx, cy, u);
          ctx.fill();
        }
      }
      break;
    }
    case "archesLow": {
      // 낮고 얇은 아치가 한 줄로 이어지는 하단 장식. 선은 바탕과 비슷한 옅은 색, 속은 아주 옅게만 칠해요.
      const R = mm(8);
      const leg = mm(2.5);
      const bleed = mm(inferBleedMm(span));
      const topLegY = oy + sh - bleed - leg;
      const bottomY = oy + sh + 1;
      const line = mixHex(c0, c1, 0.7);
      const tint = mixHex(c0, c1, 0.13);
      const i0 = Math.floor((r.x - ox) / (R * 2)) - 1;
      const i1 = Math.ceil((r.x + r.w - ox) / (R * 2)) + 1;
      if (topLegY - R > r.y + r.h) break;
      ctx.beginPath();
      ctx.moveTo(ox + i0 * R * 2, bottomY);
      for (let i = i0; i < i1; i++) {
        const x = ox + i * R * 2;
        ctx.lineTo(x, topLegY);
        ctx.arc(x + R, topLegY, R, Math.PI, Math.PI * 2);
      }
      ctx.lineTo(ox + i1 * R * 2, bottomY);
      ctx.closePath();
      ctx.fillStyle = tint;
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.lineWidth = Math.max(0.8, mm(0.55));
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const x = ox + i * R * 2;
        ctx.moveTo(x, bottomY);
        ctx.lineTo(x, topLegY);
        if (i < i1) ctx.arc(x + R, topLegY, R, Math.PI, Math.PI * 2);
      }
      ctx.stroke();
      break;
    }
    case "meadow": {
      const hill1 = mixHex(c1, "#ffffff", 0.0);
      const hill2 = mixHex(c1, "#2f5d2a", 0.22);
      const base1 = oy + sh * 0.84;
      const base2 = oy + sh * 0.91;
      const hill = (base: number, amp: number, wave: number, ph: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(ox, oy + sh);
        for (let x = 0; x <= sw; x += mm(2)) {
          ctx.lineTo(ox + x, base + Math.sin((x / mm(wave)) * Math.PI * 2 + ph) * mm(amp));
        }
        ctx.lineTo(ox + sw, oy + sh);
        ctx.closePath();
        ctx.fill();
      };
      hill(base1, 4.5, 140, 0.6, hill1);
      hill(base2, 3.5, 95, 2.1, hill2);
      const petals = ["#ffffff", "#f6a6b2", "#f9d56e", "#c9a7e8", "#ffb27a"];
      let x = mm(8);
      while (x < sw) {
        const fy = base1 + Math.sin((x / mm(140)) * Math.PI * 2 + 0.6) * mm(4.5) - mm(1 + rnd() * 5);
        const rr = mm(3.2 + rnd() * 2.6);
        ctx.strokeStyle = mixHex(c1, "#2f5d2a", 0.5);
        ctx.lineWidth = Math.max(1, mm(0.45));
        ctx.beginPath();
        ctx.moveTo(ox + x, fy + mm(2 + rnd() * 3) + rr);
        ctx.lineTo(ox + x, fy);
        ctx.stroke();
        drawFlower(ctx, ox + x, fy, rr, petals[Math.floor(rnd() * petals.length)], "#fbe38a");
        x += mm(11 + rnd() * 24);
      }
      break;
    }
    case "leaves": {
      const leafA = c1;
      const leafB = mixHex(c1, "#1f4d2c", 0.35);
      const L = mm(Math.min(sw / mm(1), sh / mm(1)) * 0.7);
      const leaf = mm(15);
      // 왼쪽 위 모서리에서 아래·오른쪽으로 두 가지, 오른쪽 아래 모서리에서 위·왼쪽으로 두 가지
      drawVine(ctx, ox - mm(2), oy + mm(10), 0.3, L, 0.012, leaf, leafA, leafB, rnd);
      drawVine(ctx, ox + mm(10), oy - mm(2), 1.25, L * 0.8, -0.012, leaf * 0.9, leafA, leafB, rnd);
      drawVine(ctx, ox + sw + mm(2), oy + sh - mm(10), Math.PI + 0.3, L, 0.012, leaf, leafA, leafB, rnd);
      drawVine(ctx, ox + sw - mm(10), oy + sh + mm(2), Math.PI + 1.25, L * 0.8, -0.012, leaf * 0.9, leafA, leafB, rnd);
      break;
    }
    case "wave": {
      const wave = (base: number, amp: number, len: number, ph: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(ox, oy + sh);
        for (let x = 0; x <= sw; x += mm(1.5)) {
          ctx.lineTo(ox + x, base + Math.sin((x / mm(len)) * Math.PI * 2 + ph) * mm(amp));
        }
        ctx.lineTo(ox + sw, oy + sh);
        ctx.closePath();
        ctx.fill();
      };
      wave(oy + sh * 0.82, 6, 120, 0.4, rgba(c1, 0.45));
      wave(oy + sh * 0.88, 5, 85, 2.2, rgba(c1, 0.75));
      wave(oy + sh * 0.94, 3.5, 60, 4.0, c1);
      break;
    }
    case "blockBottom": {
      ctx.fillStyle = c1;
      ctx.fillRect(ox, oy + sh * 0.72, sw, sh * 0.28 + 1);
      break;
    }
    case "blockSplit": {
      ctx.fillStyle = c1;
      ctx.fillRect(ox + sw * 0.5, oy, sw * 0.5 + 1, sh);
      ctx.fillStyle = mixHex(c1, "#ffffff", 0.45);
      ctx.beginPath();
      ctx.arc(ox + sw * 0.5, oy + sh * 0.5, Math.min(sw, sh) * 0.17, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "arches": {
      const aw = mm(46);
      const n = Math.ceil(sw / aw) + 1;
      const tints = [0, 0.38, 0.7];
      for (let i = -1; i < n; i++) {
        const cx = ox + i * aw * 0.86 + aw * 0.5;
        const baseY = oy + sh + mm(2);
        for (let t = 0; t < tints.length; t++) {
          const rr = (aw / 2) * (1 - t * 0.26);
          ctx.fillStyle = mixHex(c1, "#ffffff", tints[t]);
          ctx.beginPath();
          ctx.moveTo(cx - rr, baseY);
          ctx.lineTo(cx - rr, baseY - mm(18) - (aw / 2 - rr) * 0.6);
          ctx.arc(cx, baseY - mm(18) - (aw / 2 - rr) * 0.6, rr, Math.PI, 0);
          ctx.lineTo(cx + rr, baseY);
          ctx.closePath();
          ctx.fill();
        }
      }
      break;
    }
    // ---- 2026-12 차분한 새 그래픽(사진이 주인공): 얇은 선·색면·작은 모서리 장식. 옛 id의 그림은 그대로 두고 새 id만 써요 ----
    case "cornerVine":
      drawCornerOrnaments(ctx, "vine", false, span, ppm, c1);
      break;
    case "cornerVine4":
      drawCornerOrnaments(ctx, "vine", true, span, ppm, c1);
      break;
    case "cornerArc":
      drawCornerOrnaments(ctx, "arc", false, span, ppm, c1);
      break;
    case "thinFrame": {
      const inset = mm(inferBleedMm(span) + 6);
      ctx.strokeStyle = c1;
      ctx.lineWidth = Math.max(0.8, mm(0.4));
      ctx.strokeRect(ox + inset, oy + inset, sw - inset * 2, sh - inset * 2);
      break;
    }
    case "rules": {
      const bleed = mm(inferBleedMm(span));
      const inset = bleed + mm(8);
      ctx.strokeStyle = c1;
      ctx.lineWidth = Math.max(0.8, mm(0.35));
      for (const yy of [oy + inset, oy + sh - inset]) {
        ctx.beginPath();
        ctx.moveTo(ox + inset, yy);
        ctx.lineTo(ox + sw - inset, yy);
        ctx.stroke();
      }
      break;
    }
    case "splitPlain": {
      ctx.fillStyle = c1;
      ctx.fillRect(ox + sw * 0.5, oy, sw * 0.5 + 1, sh);
      break;
    }
    case "splitSpine": {
      // 좌우 분할 + 책등 이음띠(45차, 표지 전용): 색이 바뀌는 자리를 책등 가운데에서 "띠" 안으로 옮겨요.
      // 띠 = 책등 폭 + 양옆 COVER_SPINE_BAND_OVERHANG_MM(5mm)씩, 오른쪽 색을 살짝 진하게 한 한 가지 색이라 책등 글자가 색 경계에 걸리지 않고,
      // 뒤·앞표지가 한 장짜리 표지로 이어져 보여요. 책등 폭을 모르는 곳(내지·작은 썸네일)에서는 띠 없이 좌우 분할만 그려요.
      ctx.fillStyle = c1;
      ctx.fillRect(ox + sw * 0.5, oy, sw * 0.5 + 1, sh);
      const spW = span.spineW ?? 0;
      if (spW > 0) {
        const half = spW / 2 + mm(COVER_SPINE_BAND_OVERHANG_MM);
        ctx.fillStyle = mixHex(c1, "#000000", 0.09);
        ctx.fillRect(ox + sw * 0.5 - half, oy, half * 2, sh);
      }
      break;
    }
    default:
      break;
  }
}

// ---------- 패턴(작은 반복) ----------
function drawRepeat(ctx: CanvasRenderingContext2D, p: ArtPreset, r: Rect, span: Rect, ppm: number) {
  const [, c1] = p.colors;
  const mm = (v: number) => v * ppm;
  const defaults: Record<string, number> = { checks: 8, gingham: 8, diamonds: 10, zigzag: 8, stars: 14, hearts: 14, scallops: 10, dotsFine: 6, pinstripes: 6, windowpane: 12, tattersall: 16, harlequin: 10, bands: 8 };
  const s = mm(p.spacingMm ?? defaults[p.kind] ?? 8);
  const ox = span.x;
  const oy = span.y;
  const i0 = Math.floor((r.x - ox) / s) - 1;
  const i1 = Math.ceil((r.x + r.w - ox) / s) + 1;
  // 줄 간격이 s보다 촘촘한 무늬(다이아몬드 0.5s, 별·하트 0.75s)는 줄 번호 범위를 그만큼 넓혀요.
  const rowStep = p.kind === "diamonds" ? 0.5 : p.kind === "stars" || p.kind === "hearts" ? 0.75 : p.kind === "dotsFine" ? 0.866 : 1;
  const j0 = Math.floor((r.y - oy) / (s * rowStep)) - 1;
  const j1 = Math.ceil((r.y + r.h - oy) / (s * rowStep)) + 1;
  ctx.fillStyle = c1;
  ctx.strokeStyle = c1;
  switch (p.kind) {
    case "checks": {
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++)
          if (((i + j) & 1) === 0) ctx.fillRect(ox + i * s, oy + j * s, s + 0.5, s + 0.5);
      break;
    }
    case "gingham": {
      ctx.fillStyle = rgba(c1, 0.4);
      for (let j = j0; j <= j1; j += 1) if ((j & 1) === 0) ctx.fillRect(r.x - s, oy + j * s, r.w + 2 * s, s + 0.5);
      for (let i = i0; i <= i1; i += 1) if ((i & 1) === 0) ctx.fillRect(ox + i * s, r.y - s, s + 0.5, r.h + 2 * s);
      break;
    }
    case "diamonds": {
      const hs = s * 0.36;
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const cx = ox + (i + ((j & 1) ? 0.5 : 0)) * s;
          const cy = oy + j * s * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy - hs);
          ctx.lineTo(cx + hs * 0.7, cy);
          ctx.lineTo(cx, cy + hs);
          ctx.lineTo(cx - hs * 0.7, cy);
          ctx.closePath();
          ctx.fill();
        }
      break;
    }
    case "zigzag": {
      ctx.lineWidth = Math.max(1, s * 0.11);
      ctx.lineJoin = "miter";
      for (let j = j0; j <= j1; j++) {
        ctx.beginPath();
        for (let i = i0 * 2; i <= i1 * 2; i++) {
          const x = ox + (i * s) / 2;
          const y = oy + j * s + ((i & 1) ? s * 0.3 : 0);
          if (i === i0 * 2) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }
    case "stars": {
      const R = s * 0.22;
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const cx = ox + (i + ((j & 1) ? 0.5 : 0)) * s;
          const cy = oy + j * s * 0.75;
          ctx.beginPath();
          for (let k = 0; k < 10; k++) {
            const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
            const rr = k % 2 ? R * 0.45 : R;
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr;
            if (k === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
      break;
    }
    case "hearts": {
      const R = s * 0.2;
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const cx = ox + (i + ((j & 1) ? 0.5 : 0)) * s;
          const cy = oy + j * s * 0.75;
          ctx.beginPath();
          ctx.moveTo(cx, cy + R * 0.9);
          ctx.bezierCurveTo(cx - R * 1.9, cy - R * 0.1, cx - R * 0.9, cy - R * 1.5, cx, cy - R * 0.45);
          ctx.bezierCurveTo(cx + R * 0.9, cy - R * 1.5, cx + R * 1.9, cy - R * 0.1, cx, cy + R * 0.9);
          ctx.fill();
        }
      break;
    }
    case "scallops": {
      ctx.lineWidth = Math.max(1, s * 0.06);
      const rr = s / 2;
      for (let j = j0 * 2; j <= j1 * 2; j++)
        for (let i = i0; i <= i1; i++) {
          const cx = ox + (i + ((j & 1) ? 0.5 : 0)) * s;
          const cy = oy + (j * s) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, Math.PI, 0);
          ctx.stroke();
        }
      break;
    }
    // ---- 2026-12 차분한 새 패턴: 아주 작은 점, 얇은 세로 줄(옛 id의 그림은 그대로) ----
    case "dotsFine": {
      const R = Math.max(mm(0.45), s * 0.08);
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const cx = ox + (i + ((j & 1) ? 0.5 : 0)) * s;
          const cy = oy + j * s * 0.866;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case "pinstripes": {
      const lw = Math.max(mm(0.3), s * 0.05);
      for (let i = i0; i <= i1; i++) ctx.fillRect(ox + i * s - lw / 2, r.y - 1, lw, r.h + 2);
      break;
    }
    // ---- 2026-14 체크 계열 새 패턴(옛 id의 그림은 그대로). 선 굵기는 인쇄 안전을 위해 0.35mm 아래로 안 내려가요 ----
    case "windowpane": {
      // 가는 격자(창살) 체크: 가로·세로 선이 s마다 한 줄씩.
      const lw = Math.max(mm(0.35), s * 0.03);
      for (let i = i0; i <= i1; i++) ctx.fillRect(ox + i * s - lw / 2, r.y - 1, lw, r.h + 2);
      for (let j = j0; j <= j1; j++) ctx.fillRect(r.x - 1, oy + j * s - lw / 2, r.w + 2, lw);
      break;
    }
    case "tattersall": {
      // 태터솔 체크: s마다 가는 "두 줄", 그 사이(s/2)에 옅은 한 줄씩(가로·세로 모두).
      const lw = Math.max(mm(0.35), s * 0.03);
      const gap = Math.max(mm(0.8), s * 0.06);
      for (let i = i0; i <= i1; i++) {
        const x = ox + i * s;
        ctx.fillRect(x - gap / 2 - lw / 2, r.y - 1, lw, r.h + 2);
        ctx.fillRect(x + gap / 2 - lw / 2, r.y - 1, lw, r.h + 2);
      }
      for (let j = j0; j <= j1; j++) {
        const y = oy + j * s;
        ctx.fillRect(r.x - 1, y - gap / 2 - lw / 2, r.w + 2, lw);
        ctx.fillRect(r.x - 1, y + gap / 2 - lw / 2, r.w + 2, lw);
      }
      ctx.fillStyle = rgba(c1, 0.5);
      for (let i = i0; i <= i1; i++) ctx.fillRect(ox + (i + 0.5) * s - lw / 2, r.y - 1, lw, r.h + 2);
      for (let j = j0; j <= j1; j++) ctx.fillRect(r.x - 1, oy + (j + 0.5) * s - lw / 2, r.w + 2, lw);
      break;
    }
    case "harlequin": {
      // 다이아 체크: 체크를 45도 돌린 모양(한 칸의 변 길이가 s).
      const k = Math.SQRT1_2;
      const cs = [
        [r.x - ox, r.y - oy],
        [r.x + r.w - ox, r.y - oy],
        [r.x - ox, r.y + r.h - oy],
        [r.x + r.w - ox, r.y + r.h - oy],
      ];
      const us = cs.map(([dx, dy]) => (dx + dy) * k);
      const vs = cs.map(([dx, dy]) => (dy - dx) * k);
      const a0 = Math.floor(Math.min(...us) / s) - 1;
      const a1 = Math.ceil(Math.max(...us) / s) + 1;
      const b0 = Math.floor(Math.min(...vs) / s) - 1;
      const b1 = Math.ceil(Math.max(...vs) / s) + 1;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(Math.PI / 4);
      for (let b = b0; b <= b1; b++)
        for (let a = a0; a <= a1; a++)
          if (((a + b) & 1) === 0) ctx.fillRect(a * s, b * s, s + 0.5, s + 0.5);
      ctx.restore();
      break;
    }
    case "bands": {
      // 부드러운 세로 줄무늬: 폭 s/2의 줄이 s마다.
      for (let i = i0; i <= i1; i++) ctx.fillRect(ox + i * s, r.y - 1, s * 0.5, r.h + 2);
      break;
    }
    default:
      break;
  }
}

// ---------- 텍스처 ----------
function drawTexture(ctx: CanvasRenderingContext2D, p: ArtPreset, r: Rect, span: Rect, ppm: number) {
  const [c0, c1] = p.colors;
  const mm = (v: number) => v * ppm;
  if (p.kind === "paper") {
    fillTexture(ctx, makeTile("paper", p.id, p.colors, ppm), r);
  } else if (p.kind === "linen") {
    fillTexture(ctx, makeTile("linen", p.id, p.colors, ppm), r);
  } else if (p.kind === "watercolor") {
    const rnd = mulberry32(seedOf(p.id));
    const area = (span.w / ppm) * (span.h / ppm);
    const n = Math.max(10, Math.round(area / 2600));
    for (let k = 0; k < n; k++) {
      const cx = span.x + rnd() * span.w;
      const cy = span.y + rnd() * span.h;
      const rad = mm(30 + rnd() * 80);
      const squash = 0.55 + rnd() * 0.45;
      const rot = rnd() * Math.PI;
      const t = 0.2 + rnd() * 0.8;
      const col = mixHex(c0, c1, t);
      const a = 0.1 + rnd() * 0.16;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      // 가장자리까지 부드럽게 옅어지는 번짐(둥근 테두리 없이)
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.45, rgba(col, a * 0.85));
      g.addColorStop(0.8, rgba(col, a * 0.35));
      g.addColorStop(1, rgba(col, 0));
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, squash);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    fillTexture(ctx, makeTile("paper", p.id + "-grain", [c0, mixHex(c0, "#000000", 0.35)], ppm), r, 0.55);
  } else if (p.kind === "grain") {
    fillTexture(ctx, makeTile("grain", p.id, p.colors, ppm), r);
  }
}

export const ART_GRAPHIC_KINDS = ["clouds", "cloudsSoft", "archesLow", "meadow", "leaves", "wave", "blockBottom", "blockSplit", "arches", "cornerVine", "cornerVine4", "cornerArc", "thinFrame", "rules", "splitPlain", "splitSpine"];
export const ART_PATTERN_KINDS = ["checks", "gingham", "diamonds", "zigzag", "stars", "hearts", "scallops", "dotsFine", "pinstripes", "windowpane", "tattersall", "harlequin", "bands"];
export const ART_TEXTURE_KINDS = ["paper", "linen", "watercolor", "grain"];

export function isArtKind(kind: string): boolean {
  return ART_GRAPHIC_KINDS.includes(kind) || ART_PATTERN_KINDS.includes(kind) || ART_TEXTURE_KINDS.includes(kind);
}

export function drawBackgroundArt(
  ctx: CanvasRenderingContext2D,
  p: ArtPreset,
  x: number,
  y: number,
  w: number,
  h: number,
  mmToPxFn: (mm: number) => number,
  fullSpan?: Rect
) {
  const ppm = mmToPxFn(1000) / 1000;
  const r: Rect = { x, y, w, h };
  const span = fullSpan ?? r;
  if (ART_GRAPHIC_KINDS.includes(p.kind)) drawGraphic(ctx, p, r, span, ppm);
  else if (ART_PATTERN_KINDS.includes(p.kind)) drawRepeat(ctx, p, r, span, ppm);
  else if (ART_TEXTURE_KINDS.includes(p.kind)) drawTexture(ctx, p, r, span, ppm);
}
