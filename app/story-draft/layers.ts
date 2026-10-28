// ─────────────────────────────────────────────────────────────────────────────
// 키픽 스토리 시안 — "레이어 목록표"(manifest)
// 컨셉: "추억이 모여 나만의 우주가 되는 곳" (파랑·보라 우주 + 크림색 별)
//
// 이 파일 하나가 스토리 화면의 모든 그림 조각(레이어)을 관리해요.
// art 칸의 이름은 public/story/layers/<이름>.webp 파일이에요 (scripts/optimize-story-art.mjs 가 만들어요).
// 그림을 바꾸고 싶으면: 같은 이름으로 파일만 교체하거나, 이 줄의 art 이름을 다른 조각 이름으로 바꾸면 돼요.
//
// 위치·크기 읽는 법
//  - space "stage": 화면 전체(가로 100% × 세로 100%) 기준 / "art": 가운데 정사각형 그림 영역 기준.
//    (장면 3의 art 는 "길 배경 그림 전체" 기준이에요 — 가로는 그림 가로 100%, 세로는 그림 세로 100%)
//  - cx, cy: 그림의 "가운데 점" 위치(%). 왼쪽 위가 0,0 — 오른쪽 아래가 100,100.
//  - w: 그림 가로 크기(%). 세로 비율은 그림 파일에서 자동으로 읽어요(art-manifest.json).
//  - depth: 스크롤할 때 움직이는 속도. 1 = 화면과 똑같이(기본), 작을수록 멀리 있는 것처럼 느리게, 클수록 가까이 있는 것처럼 빠르게.
//  - z: 겹치는 순서(클수록 앞).  idle: 가만히 있을 때 움직임(drift 둥실 흐름 / bob 위아래 / twinkle 반짝).
//  - label: 화면 낭독기에게 읽어 줄 이름. 없으면 "장식 그림"으로 보고 읽지 않아요.
// ─────────────────────────────────────────────────────────────────────────────
import manifest from "./art-manifest.json";

export type ArtName = keyof typeof manifest;
export const ART = manifest as Record<ArtName, { n: number; w: number; h: number; bytes: number; lqip?: string; color?: string }>;
export const artSrc = (name: ArtName) => `/story/layers/${name}.webp`;

export type LayerSpec = {
  art: ArtName;
  space: "stage" | "art";
  cx: number;
  cy: number;
  w: number;
  depth: number;
  z: number;
  rot?: number;
  idle?: "drift" | "bob" | "twinkle";
  /** 한 번 움직이는 데 걸리는 시간(초) */
  idleSec?: number;
  /** 시작 어긋남(초). 모든 조각이 한꺼번에 같은 박자로 움직이지 않게 해줘요. */
  idleDelay?: number;
  /** 큰 화면에서 이 크기(px)보다 커지지 않게 */
  maxPx?: number;
  /** 흐리게 보이도록 투명도(0~1). 글자 근처 작은 장식을 은은하게 할 때 써요. */
  opacity?: number;
  /** 가로로 넓은 화면(PC·폰 가로)에서만 쓰는 다른 위치·크기. 글자가 왼쪽에 놓이는 화면에서 장식이 글자를 가리지 않게 옮길 때 써요. */
  land?: { cx: number; cy: number; w?: number };
  /** PC·태블릿 가로 화면(글자가 가운데에 모이는 배치)에서만 쓰는 위치·크기. 글자와 겹치지 않게 장식을 가장자리로 옮길 때 써요. */
  wide?: { cx: number; cy: number; w?: number };
  label?: string;
  note: string;
};

const S = "stage" as const;
const A = "art" as const;

export const LAYERS = {
  // ───────── 장면 1 · 사진 고르기 (코발트 우주) ─────────
  "s1-moon": { art: "moon-crescent", space: S, cx: 89, cy: 29, w: 15, depth: 0.2, z: 2, idle: "bob", idleSec: 7, maxPx: 130, note: "초승달" },
  "s1-planet-ringed": { art: "planet-ringed", space: S, cx: 9, cy: 46, w: 24, land: { cx: 5, cy: 66, w: 14 }, depth: 0.35, z: 2, idle: "bob", idleSec: 6, idleDelay: -2, maxPx: 170, note: "고리 행성(왼쪽)" },
  "s1-planet-pink": { art: "planet-pink", space: S, cx: 93, cy: 52, w: 15, depth: 0.5, z: 2, idle: "bob", idleSec: 8, idleDelay: -4, maxPx: 110, note: "분홍 행성(오른쪽)" },
  "s1-star-pink": { art: "star-pink", space: S, cx: 7, cy: 24, w: 7, land: { cx: 48, cy: 10 }, wide: { cx: 11, cy: 30 }, depth: 0.25, z: 2, rot: -12, idle: "twinkle", idleSec: 3.2, maxPx: 56, note: "핑크 별" },
  "s1-star-cream": { art: "star-cream", space: S, cx: 72, cy: 38, w: 5, wide: { cx: 95, cy: 50 }, depth: 0.25, z: 2, rot: 14, idle: "twinkle", idleSec: 3.6, idleDelay: -1, maxPx: 42, note: "크림 별" },
  "s1-spark-1": { art: "sparkle-cream", space: S, cx: 12, cy: 9, land: { cx: 54, cy: 8 }, w: 5, wide: { cx: 7, cy: 12 }, depth: 0.25, z: 2, idle: "twinkle", idleSec: 2.6, maxPx: 30, opacity: 0.8, note: "반짝이" },
  "s1-spark-2": { art: "sparkle-cream", space: S, cx: 5, cy: 28, land: { cx: 4, cy: 88 }, w: 4.5, depth: 0.25, z: 2, idle: "twinkle", idleSec: 3.1, idleDelay: -1.1, maxPx: 28, opacity: 0.8, note: "반짝이" },
  "s1-spark-3": { art: "sparkle-cream", space: S, cx: 93, cy: 12, w: 4.5, depth: 0.25, z: 2, idle: "twinkle", idleSec: 2.9, idleDelay: -0.5, maxPx: 28, opacity: 0.8, note: "반짝이" },
  "s1-photo-friends": { art: "photo-friends", space: A, cx: 27, cy: 52, w: 33, wide: { cx: 29, cy: 54, w: 24 }, depth: 1.12, z: 4, rot: -9, idle: "bob", idleSec: 3.8, maxPx: 300, note: "사진 덩어리 · 왼쪽(두 친구)" },
  "s1-photo-puppy": { art: "photo-puppy", space: A, cx: 50, cy: 24, w: 32, wide: { cx: 50, cy: 34, w: 24 }, depth: 1.22, z: 5, rot: 3, idle: "bob", idleSec: 4.4, idleDelay: -1.3, maxPx: 300, note: "사진 덩어리 · 위 가운데(강아지)" },
  "s1-photo-sea": { art: "photo-sea", space: A, cx: 73, cy: 55, w: 31, wide: { cx: 71, cy: 54, w: 24 }, depth: 1.1, z: 4, rot: 9, idle: "bob", idleSec: 4.1, idleDelay: -2.2, maxPx: 300, note: "사진 덩어리 · 오른쪽(바다)" },
  "s1-camera": { art: "camera", space: A, cx: 48, cy: 82, w: 28, wide: { cx: 50, cy: 82, w: 20 }, depth: 1.28, z: 6, rot: -5, idle: "bob", idleSec: 3.4, idleDelay: -0.8, maxPx: 230, note: "사진 덩어리 · 아래 가운데(카메라, 사진 바로 곁)" },
  "s1-star-small": { art: "star-pink", space: A, cx: 71, cy: 4, w: 6, wide: { cx: 66, cy: 8 }, depth: 1.3, z: 5, rot: 10, idle: "twinkle", idleSec: 2.8, idleDelay: -0.6, maxPx: 40, note: "사진 옆 작은 별" },

  // ───────── 장면 2 · 앨범으로 만들어져요 (보랏빛 우주) ─────────
  "s2-planet": { art: "planet-pink", space: S, cx: 91, cy: 9, w: 17, depth: 1, z: 2, idle: "bob", idleSec: 8, maxPx: 110, note: "분홍 행성" },
  "s2-shooting": { art: "shooting-star", space: S, cx: 14, cy: 8, w: 30, wide: { cx: 11, cy: 7, w: 22 }, depth: 1, z: 2, rot: -8, idle: "drift", idleSec: 16, maxPx: 240, opacity: 0.9, note: "슈팅스타" },
  "s2-star-pink": { art: "star-pink", space: S, cx: 8, cy: 92, w: 8, depth: 1, z: 2, rot: -10, idle: "twinkle", idleSec: 3.2, maxPx: 54, note: "핑크 별" },
  "s2-star-cream": { art: "star-cream", space: S, cx: 93, cy: 90, w: 7, depth: 1, z: 2, rot: 12, idle: "twinkle", idleSec: 3.6, idleDelay: -1, maxPx: 46, note: "크림 별" },
  "s2-photo-friends": { art: "photo-friends", space: A, cx: 10.7, cy: 31.6, w: 18, depth: 1, z: 7, rot: -8, idle: "bob", idleSec: 3.6, maxPx: 150, note: "날아가는 사진 1(두 친구) — 시작 자리는 별빛 궤도 위 왼쪽" },
  "s2-photo-puppy": { art: "photo-puppy", space: A, cx: 88.7, cy: 20.6, w: 18, depth: 1, z: 7, rot: 7, idle: "bob", idleSec: 4.1, idleDelay: -1, maxPx: 150, note: "날아가는 사진 2(강아지)" },
  "s2-photo-sea": { art: "photo-sea", space: A, cx: 48.5, cy: 17.1, w: 17, depth: 1, z: 7, rot: -3, idle: "bob", idleSec: 3.8, idleDelay: -2, maxPx: 150, note: "날아가는 사진 3(바다)" },
  "s2-album-closed": { art: "album-closed", space: A, cx: 50, cy: 72, w: 44, depth: 1, z: 4, maxPx: 360, label: "포토앨범", note: "닫힌 앨범(처음과 끝)" },
  "s2-album-open": { art: "album-open", space: A, cx: 50, cy: 71, w: 88, depth: 1, z: 3, maxPx: 720, note: "펼친 앨범" },
  // 상품은 앨범 다음에 "액자 → 머그컵 → 에코백 → 캘린더" 순서로 하나씩 나와요. 앨범이 가장 크고, 액자가 그다음, 굿즈는 작은 포인트예요.
  "s2-goods-frame": { art: "frame-puppy", space: A, cx: 21, cy: 43, w: 26, depth: 1, z: 8, rot: -4, idle: "bob", idleSec: 4.5, idleDelay: -0.9, maxPx: 215, note: "상품 1(액자) — 앨범 다음으로 큼" },
  "s2-goods-mug": { art: "goods-mug", space: A, cx: 83, cy: 56, w: 16, depth: 1, z: 8, idle: "bob", idleSec: 3.9, idleDelay: -0.4, maxPx: 130, note: "굿즈 1(머그컵) — 작은 포인트" },
  "s2-goods-tote": { art: "goods-tote", space: A, cx: 73, cy: 28, w: 13, depth: 1, z: 8, idle: "bob", idleSec: 4.3, idleDelay: -1.4, maxPx: 107, note: "굿즈 2(에코백) — 작은 포인트" },
  "s2-goods-calendar": { art: "goods-calendar", space: A, cx: 47, cy: 25, w: 14, depth: 1, z: 8, idle: "bob", idleSec: 3.7, idleDelay: -2.1, maxPx: 115, note: "굿즈 3(캘린더) — 작은 포인트" },

  // ───────── 장면 3 · 집에 도착 (은하수 배송 길) ─────────
  "s3-moon": { art: "moon-crescent", space: S, cx: 90, cy: 12, w: 15, depth: 1, z: 2, idle: "bob", idleSec: 7, maxPx: 120, opacity: 0.95, note: "초승달" },
  "s3-milky": { art: "milky-way", space: S, cx: 62, cy: 60, w: 62, land: { cx: 70, cy: 27, w: 32 }, wide: { cx: 80, cy: 30, w: 30 }, depth: 1, z: 2, rot: -5, idle: "drift", idleSec: 20, maxPx: 520, opacity: 0.95, note: "은하수 별궤적" },
  "s3-star-cream": { art: "star-cream", space: S, cx: 7, cy: 20, w: 7, land: { cx: 52, cy: 12 }, wide: { cx: 12, cy: 24 }, depth: 1, z: 2, rot: -12, idle: "twinkle", idleSec: 3.4, maxPx: 46, note: "크림 별" },
  "s3-spark-1": { art: "sparkle-cream", space: S, cx: 16, cy: 8, land: { cx: 56, cy: 30 }, w: 5, wide: { cx: 90, cy: 44 }, depth: 1, z: 2, idle: "twinkle", idleSec: 2.7, maxPx: 30, opacity: 0.85, note: "반짝이" },
  "s3-spark-2": { art: "sparkle-cream", space: S, cx: 95, cy: 40, w: 4.5, depth: 1, z: 2, idle: "twinkle", idleSec: 3.1, idleDelay: -1, maxPx: 28, opacity: 0.85, note: "반짝이" },
  "s3-box": { art: "box-parcel", space: A, cx: 0, cy: 0, w: 17, depth: 1, z: 5, maxPx: 240, label: "나만의 추억이 담긴 택배 상자", note: "길을 따라가는 택배 상자(위치는 ROUTE가 정해요)" },
  "s3-house": { art: "house", space: A, cx: 71.2, cy: 63, w: 11, depth: 1, z: 3, maxPx: 200, label: "작은 집", note: "도착할 집(길 끝)" },
  "s3-girl": { art: "girl-photobook", space: A, cx: 77.5, cy: 66.5, w: 5.2, depth: 1, z: 4, maxPx: 80, note: "도착하면 나타나는 소녀" },
  "s3-heart": { art: "heart-pink", space: A, cx: 71.2, cy: 48, w: 5.5, depth: 1, z: 7, maxPx: 56, note: "도착하면 톡 떠오르는 하트" },
} as const satisfies Record<string, LayerSpec>;

export type LayerId = keyof typeof LAYERS;

/**
 * 장면 3에서 택배 상자가 따라가는 길(SVG path).
 * 좌표 단위: 길 배경 그림 전체를 가로 150 × 세로 100으로 본 값이에요(그림 3:2 비율 그대로).
 * 측정 방법: 배경 그림에서 크림색 길을 찾아 가운데 선을 따라 점을 찍고, 그 위에 이 선을 겹쳐 그려
 *           어긋나지 않는지 눈으로 확인했어요(README '길 선 맞추기' 참고).
 * 시작(왼쪽 아래 끝) → 오른쪽으로 굽이쳐 가서 → 안쪽으로 돌아 길 끝(집 자리)에 닿아요.
 */
export const ROUTE = {
  d: "M 17 98 C 22 91, 36 86, 60 82 S 108 78, 120 75 C 131 72.5, 129 69.5, 121 68 C 113 66.5, 108 66, 105.7 64.5",
  viewBox: "0 0 150 100",
  /** 처음 크기 → 도착했을 때 크기(멀어지는 느낌) */
  scaleFrom: 1,
  scaleTo: 0.4,
} as const;

export const layerSpec = (id: LayerId): LayerSpec => LAYERS[id];
