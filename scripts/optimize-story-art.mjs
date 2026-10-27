#!/usr/bin/env node
// 키픽 스토리 일러스트 최적화 스크립트
//
// 하는 일: 혜민님이 만든 큰 PNG(장당 1~2MB)를 웹에 올리기 좋은 WebP(장당 수십 KB)로 바꿔서
//          public/story/layers/ 에 저장해요. 원본 PNG는 프로젝트에 복사하지 않아요.
//  1) 파일 이름 끝의 번호(예: "...-14.png" 의 14)로 어떤 조각인지 찾아요 → 한글 이름 때문에 생기는 문제를 피해요
//  2) 물체 조각은 둘레의 투명한 여백을 잘라내고(트림), 화면에서 쓰는 크기의 약 2배로 줄여요
//  3) 거의 투명한 얼룩(알파 10 이하)은 완전 투명으로 깨끗이 정리해요
//  4) WebP로 저장하고, 가로·세로 크기를 app/story-draft/art-manifest.json 에 적어 둬요
//     (배경은 흐릿한 미리보기 색 + 아주 작은 미리보기 그림도 함께 적어요 → 큰 그림이 오기 전에 빈 화면이 안 보여요)
//
// 사용법 (프로젝트 폴더에서):
//   node scripts/optimize-story-art.mjs "<원본 PNG 폴더>"            ← 30장 전부
//   node scripts/optimize-story-art.mjs "<원본 폴더>" --only 14,20     ← 번호 14, 20번만 다시
//   node scripts/optimize-story-art.mjs --list                         ← 번호와 이름 표만 보기
// 새 파일(재출력본)을 받았다면 같은 번호로 끝나는 PNG를 폴더에 넣고 같은 명령을 다시 실행하면 돼요.

import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/story/layers");
const MANIFEST = path.join(ROOT, "app/story-draft/art-manifest.json");

// n: 원본 파일 끝 번호 / name: 웹 파일 이름(영문 소문자·하이픈) / w: 저장할 가로(px, 트림 뒤) / q: 화질
// 배경(bg-*)은 투명 없는 통그림이라 가로 1600px, 나머지는 실제 화면 크기의 2배쯤으로 정했어요.
export const ART = [
  { n: 1, name: "bg-cobalt-space", kind: "bg", w: 1600, q: 74, ko: "코발트 우주와 보랏빛 구름(장면1 배경)" },
  { n: 7, name: "bg-purple-space", kind: "bg", w: 1600, q: 74, ko: "보랏빛 우주 종이컷(장면2 배경)" },
  { n: 4, name: "bg-delivery-road", kind: "bg", w: 1600, q: 76, ko: "인디고 우주를 가르는 크림빛 길(장면3 배경)" },
  { n: 2, name: "cloud-cobalt", w: 560, ko: "몽글몽글 코발트 구름" },
  { n: 3, name: "cloud-lavender", w: 560, ko: "몽글한 라벤더 구름" },
  { n: 5, name: "star-pink", w: 200, ko: "통통한 핫핑크 별" },
  { n: 20, name: "star-cream", w: 200, ko: "포동포동한 크림 별" },
  { n: 6, name: "sparkle-cream", w: 140, ko: "크림빛 네 꼭짓점 반짝이" },
  { n: 10, name: "moon-crescent", w: 420, ko: "별가루 초승달" },
  { n: 11, name: "planet-ringed", w: 420, ko: "라벤더 고리의 코발트 행성" },
  { n: 9, name: "planet-pink", w: 360, ko: "핑크 크레이터 라벤더 행성" },
  { n: 8, name: "shooting-star", w: 560, ko: "크림빛 슈팅스타와 세 줄 리본" },
  { n: 14, name: "milky-way", w: 760, ko: "꿈결 같은 은하수 별궤적" },
  { n: 13, name: "photo-friends", w: 400, ko: "두 친구의 푸른 하늘 폴라로이드" },
  { n: 12, name: "photo-puppy", w: 400, ko: "라벤더 속 강아지 폴라로이드" },
  { n: 16, name: "photo-sea", w: 400, ko: "코발트 바다와 분홍 해 폴라로이드" },
  { n: 15, name: "album-open", w: 720, ko: "보랏빛 열린 사진 앨범" },
  { n: 17, name: "album-closed", w: 520, ko: "별 하나 품은 보라색 포토앨범(닫힘)" },
  { n: 19, name: "frame-puppy", w: 360, ko: "라벤더 액자 속 하얀 강아지" },
  { n: 18, name: "frame-friends", w: 360, ko: "세워진 코발트 액자 속 두 친구" },
  { n: 21, name: "goods-mug", w: 340, ko: "보랏빛 달 머그컵" },
  { n: 22, name: "goods-glass", w: 320, ko: "보랏빛 별 장식 유리잔" },
  { n: 23, name: "goods-tote", w: 360, ko: "라벤더 행성 토트백" },
  { n: 24, name: "goods-calendar", w: 360, ko: "코발트 삼각 받침 데스크 캘린더" },
  { n: 25, name: "goods-poster", w: 340, ko: "보랏빛 행성 패브릭 포스터" },
  { n: 26, name: "box-parcel", w: 400, ko: "보라 테이프 별표 택배 상자" },
  { n: 27, name: "house", w: 480, ko: "보랏빛 지붕의 작은 집" },
  { n: 29, name: "girl-photobook", w: 360, ko: "보랏빛 포토북을 든 소녀" },
  { n: 28, name: "camera", w: 380, ko: "코발트 카메라와 라벤더 렌즈" },
  { n: 30, name: "heart-pink", w: 240, ko: "크림 하이라이트 핑크 하트" },
];

const args = process.argv.slice(2);
if (args.includes("--list")) {
  for (const a of ART) console.log(String(a.n).padStart(2), a.name.padEnd(18), a.ko);
  process.exit(0);
}
const onlyIdx = args.indexOf("--only");
const onlyArg = onlyIdx >= 0 ? args[onlyIdx + 1] : "";
const srcDir = args.find((a, i) => !a.startsWith("--") && (onlyIdx < 0 || i !== onlyIdx + 1));
if (!srcDir || !fs.existsSync(srcDir)) {
  console.error('원본 PNG 폴더 경로를 알려 주세요.\n예) node scripts/optimize-story-art.mjs "/Users/내이름/Desktop/홈페이지 일러스트소스"');
  process.exit(1);
}
const only = onlyArg ? new Set(onlyArg.split(",").map(Number)) : null;

// 파일 이름은 맥에서 한글이 "풀어쓴 형태"로 저장되는 경우가 있어서, 끝 번호만 보고 찾아요.
const byNum = new Map();
for (const f of fs.readdirSync(srcDir)) {
  const m = f.match(/-(\d+)\.png$/i);
  if (m) byNum.set(Number(m[1]), path.join(srcDir, f));
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
const ALPHA_CLEAN = 10; // 이 값 이하의 거의 투명한 픽셀은 완전 투명으로
const BBOX_ALPHA = 24; // 이 값보다 진한 픽셀이 있는 곳까지만 남기고 나머지 여백은 자르기
const PAD = 0.012; // 잘라낸 뒤 가장자리에 남기는 여유(그림 크기의 1.2%)

let totalIn = 0;
let totalOut = 0;
let count = 0;

for (const a of ART) {
  if (only && !only.has(a.n)) continue;
  const file = byNum.get(a.n);
  if (!file) {
    console.warn(`!! ${a.n}번(${a.ko}) 원본을 못 찾았어요 — 건너뜀`);
    continue;
  }
  const inBytes = fs.statSync(file).size;
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  let box = { l: 0, t: 0, r: W - 1, b: H - 1 };
  if (a.kind !== "bg") {
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4 + 3;
        if (data[i] <= ALPHA_CLEAN) data[i] = 0;
        if (data[i] > BBOX_ALPHA) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) {
      console.warn(`!! ${a.n}번은 완전히 투명해서 건너뜀`);
      continue;
    }
    const px = Math.round(Math.max(W, H) * PAD);
    box = { l: Math.max(0, x0 - px), t: Math.max(0, y0 - px), r: Math.min(W - 1, x1 + px), b: Math.min(H - 1, y1 + px) };
  }
  const cw = box.r - box.l + 1;
  const ch = box.b - box.t + 1;
  const outW = Math.min(a.w, cw);
  let pipe = sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: box.l, top: box.t, width: cw, height: ch });
  if (a.kind === "bg") pipe = pipe.removeAlpha();
  const buf = await pipe
    .resize({ width: outW, kernel: "lanczos3" })
    .webp({ quality: a.q ?? 82, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });
  fs.writeFileSync(path.join(OUT_DIR, `${a.name}.webp`), buf.data);

  const entry = { n: a.n, w: buf.info.width, h: buf.info.height, bytes: buf.data.length };
  if (a.kind !== "bg") entry.trim = { l: +(box.l / W).toFixed(4), t: +(box.t / H).toFixed(4), r: +((W - 1 - box.r) / W).toFixed(4), b: +((H - 1 - box.b) / H).toFixed(4) };
  if (a.kind === "bg") {
    // 흐릿한 미리보기(약 24px)와 대표 색
    const tiny = await sharp(buf.data).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
    entry.lqip = `data:image/webp;base64,${tiny.toString("base64")}`;
    const px1 = await sharp(buf.data).resize(1, 1).raw().toBuffer();
    entry.color = "#" + [...px1.subarray(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("");
  }
  manifest[a.name] = entry;
  totalIn += inBytes;
  totalOut += buf.data.length;
  count++;
  console.log(`${String(a.n).padStart(2)} ${a.name.padEnd(17)} ${`${W}x${H} -> ${entry.w}x${entry.h}`.padEnd(20)} ${String(Math.round(inBytes / 1024)).padStart(5)}KB -> ${(buf.data.length / 1024).toFixed(1).padStart(6)}KB`);
}

const sorted = Object.fromEntries(Object.entries(manifest).sort((x, y) => x[1].n - y[1].n));
fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 1) + "\n");
console.log(`\n합계: ${(totalIn / 1048576).toFixed(1)}MB -> ${(totalOut / 1024).toFixed(0)}KB (${count}장)`);
