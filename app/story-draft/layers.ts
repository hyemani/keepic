// ─────────────────────────────────────────────────────────────────────────────
// 키픽 스토리 시안 — "레이어 목록표"(manifest)
//
// 이 파일 하나가 스토리 화면의 모든 그림 조각(레이어)을 관리해요.
// 지금은 src가 null → 코드로 그린 "임시 도형(placeholder)"이 나와요.
// 일러스트레이터에서 내보낸 파일을 public/story/layers/ 에 넣고, 해당 줄의
//   src: null   →   src: "/story/layers/cloud-1.svg"
// 로 바꾸기만 하면 그 조각만 진짜 그림으로 바뀌어요. (자세한 방법은 README.md)
//
// 위치·크기 읽는 법
//  - space "stage": 화면 전체(가로 100% × 세로 100%) 기준 / "art": 가운데 정사각형 그림 영역 기준.
//  - cx, cy: 그림의 "가운데 점" 위치(%). 왼쪽 위가 0,0 — 오른쪽 아래가 100,100.
//  - w: 그림 가로 크기(%). 세로는 ar(가로÷세로 비율)로 자동 계산돼요. 실제 그림 비율에 맞게 ar도 고쳐 주세요.
//  - depth: 스크롤할 때 움직이는 속도. 1 = 화면과 똑같이(기본), 작을수록 멀리 있는 것처럼 느리게, 클수록 가까이 있는 것처럼 빠르게.
//  - z: 겹치는 순서(클수록 앞).  idle: 가만히 있을 때 움직임(drift 둥실 흐름 / bob 위아래 / twinkle 반짝 / hop 폴짝).
//  - fill: 가로 화면 끝까지 꽉 채우는 조각(언덕 등). edge 쪽에 붙고 높이는 화면 높이의 h%.
// ─────────────────────────────────────────────────────────────────────────────

export type PlaceholderKind =
  | "cloud" | "star" | "moon" | "sun" | "hill" | "card" | "char"
  | "cover" | "pageLeft" | "pageRight" | "shadow" | "albumClosed"
  | "house" | "tree" | "bush" | "path" | "heart" | "spark";

export type LayerSpec = {
  /** null = 임시 도형. "/story/layers/이름.svg" (또는 .png)로 바꾸면 진짜 그림으로 교체돼요. */
  src: string | null;
  space: "stage" | "art";
  cx: number;
  cy: number;
  w: number;
  /** 가로÷세로 비율 */
  ar: number;
  depth: number;
  z: number;
  rot?: number;
  idle?: "drift" | "bob" | "twinkle" | "hop";
  /** 한 번 움직이는 데 걸리는 시간(초) */
  idleSec?: number;
  /** 시작 어긋남(초). 모든 조각이 한꺼번에 같은 박자로 움직이지 않게 해줘요. */
  idleDelay?: number;
  /** 큰 화면에서 이 크기(px)보다 커지지 않게 */
  maxPx?: number;
  fill?: { edge: "bottom" | "top"; h: number };
  /** 임시 도형 모양과 색 */
  ph: { kind: PlaceholderKind; tint?: string; tint2?: string };
  /** 일러스트레이터 내보내기 안내용 설명(README에 같은 표가 있어요) */
  note: string;
};

const S = "stage" as const;
const A = "art" as const;

export const LAYERS = {
  // ───────── 장면 1 · 사진 고르기 (하늘) ─────────
  "s1-moon": { src: null, space: S, cx: 91, cy: 17, w: 10, ar: 1, depth: 0.2, z: 1, idle: "twinkle", idleSec: 5, maxPx: 110, ph: { kind: "moon", tint: "#FFE98A" }, note: "달" },
  "s1-star-1": { src: null, space: S, cx: 8, cy: 12, w: 4.5, ar: 1, depth: 0.25, z: 1, idle: "twinkle", idleSec: 2.6, maxPx: 34, ph: { kind: "star", tint: "#FFE27A" }, note: "별(작게)" },
  "s1-star-2": { src: null, space: S, cx: 30, cy: 22, w: 3.2, ar: 1, depth: 0.25, z: 1, idle: "twinkle", idleSec: 3.1, idleDelay: -1, maxPx: 26, ph: { kind: "star", tint: "#FFFFFF" }, note: "별(아주 작게)" },
  "s1-star-3": { src: null, space: S, cx: 68, cy: 9, w: 4, ar: 1, depth: 0.25, z: 1, idle: "twinkle", idleSec: 2.9, idleDelay: -0.4, maxPx: 30, ph: { kind: "star", tint: "#FFE27A" }, note: "별" },
  "s1-star-4": { src: null, space: S, cx: 93, cy: 34, w: 3.4, ar: 1, depth: 0.25, z: 1, idle: "twinkle", idleSec: 3.4, idleDelay: -2, maxPx: 28, ph: { kind: "star", tint: "#FFFFFF" }, note: "별" },
  "s1-star-5": { src: null, space: S, cx: 6, cy: 38, w: 3.6, ar: 1, depth: 0.25, z: 1, idle: "twinkle", idleSec: 2.7, idleDelay: -1.6, maxPx: 28, ph: { kind: "star", tint: "#FFE27A" }, note: "별" },
  "s1-cloud-1": { src: null, space: S, cx: 62, cy: 36, w: 30, ar: 2, depth: 0.45, z: 2, idle: "drift", idleSec: 18, maxPx: 320, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#EDE6FF" }, note: "구름(위쪽, 글자 뒤는 피해 두기)" },
  "s1-cloud-2": { src: null, space: S, cx: 88, cy: 56, w: 30, ar: 2, depth: 0.55, z: 2, idle: "drift", idleSec: 24, idleDelay: -9, maxPx: 330, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#FFE3F0" }, note: "구름(오른쪽)" },
  "s1-cloud-3": { src: null, space: S, cx: 55, cy: 70, w: 24, ar: 2, depth: 0.7, z: 3, idle: "drift", idleSec: 20, idleDelay: -4, maxPx: 270, ph: { kind: "cloud", tint: "#FFF7FB", tint2: "#FFE3F0" }, note: "구름(가운데 아래, 가까운 것)" },
  "s1-hill-back": { src: null, space: S, cx: 50, cy: 0, w: 100, ar: 3.33, depth: 0.5, z: 4, fill: { edge: "bottom", h: 34 }, ph: { kind: "hill", tint: "#5DBB8F" }, note: "뒷산(가장 멀리, 가로 꽉 채움)" },
  "s1-hill-mid": { src: null, space: S, cx: 50, cy: 0, w: 100, ar: 3.33, depth: 0.75, z: 5, fill: { edge: "bottom", h: 25 }, ph: { kind: "hill", tint: "#8DD7A9" }, note: "중간 언덕" },
  "s1-hill-front": { src: null, space: S, cx: 50, cy: 0, w: 100, ar: 3.33, depth: 1, z: 6, fill: { edge: "bottom", h: 15 }, ph: { kind: "hill", tint: "#CDEFD6" }, note: "앞 언덕(장면 2 배경색과 이어져요)" },
  "s1-card-1": { src: null, space: A, cx: 17, cy: 33, w: 21, ar: 0.8, depth: 1.12, z: 2, rot: -9, idle: "bob", idleSec: 3.6, maxPx: 160, ph: { kind: "card", tint: "#FFD1DC", tint2: "#FF9DB8" }, note: "둥둥 떠 있는 사진 카드 1" },
  "s1-card-2": { src: null, space: A, cx: 50, cy: 19, w: 23, ar: 0.8, depth: 1.2, z: 2, rot: 4, idle: "bob", idleSec: 4.2, idleDelay: -1.3, maxPx: 176, ph: { kind: "card", tint: "#CDE7FF", tint2: "#8CC3FF" }, note: "사진 카드 2" },
  "s1-card-3": { src: null, space: A, cx: 83, cy: 35, w: 21, ar: 0.8, depth: 1.1, z: 2, rot: 10, idle: "bob", idleSec: 3.9, idleDelay: -2.2, maxPx: 160, ph: { kind: "card", tint: "#FFF0B3", tint2: "#FFD24D" }, note: "사진 카드 3" },
  "s1-card-4": { src: null, space: A, cx: 33, cy: 57, w: 19, ar: 0.8, depth: 1.28, z: 3, rot: 6, idle: "bob", idleSec: 3.3, idleDelay: -0.7, maxPx: 142, ph: { kind: "card", tint: "#D9F2D0", tint2: "#7FD08A" }, note: "사진 카드 4" },
  "s1-card-5": { src: null, space: A, cx: 68, cy: 59, w: 19, ar: 0.8, depth: 1.3, z: 3, rot: -7, idle: "bob", idleSec: 4.5, idleDelay: -1.9, maxPx: 142, ph: { kind: "card", tint: "#E5D4FF", tint2: "#B596FF" }, note: "사진 카드 5" },
  "s1-char-1": { src: null, space: A, cx: 14, cy: 85, w: 15, ar: 1, depth: 1, z: 5, idle: "hop", idleSec: 2.4, maxPx: 110, ph: { kind: "char", tint: "#FFC9A8", tint2: "#FF8F6B" }, note: "동글이 친구 1(복숭아색)" },
  "s1-char-2": { src: null, space: A, cx: 88, cy: 87, w: 13, ar: 1, depth: 1, z: 5, idle: "hop", idleSec: 2.8, idleDelay: -1.1, maxPx: 96, ph: { kind: "char", tint: "#BDEBD2", tint2: "#5DBB8F" }, note: "동글이 친구 2(민트색)" },

  // ───────── 장면 2 · 앨범으로 만들어져요 ─────────
  "s2-cloud-1": { src: null, space: S, cx: 10, cy: 12, w: 26, ar: 2, depth: 1, z: 1, idle: "drift", idleSec: 22, maxPx: 300, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#FFF3E2" }, note: "구름(왼쪽 위)" },
  "s2-cloud-2": { src: null, space: S, cx: 92, cy: 30, w: 22, ar: 2, depth: 1, z: 1, idle: "drift", idleSec: 26, idleDelay: -10, maxPx: 260, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#FFF3E2" }, note: "구름(오른쪽)" },
  "s2-shadow": { src: null, space: A, cx: 50, cy: 94, w: 84, ar: 8, depth: 1, z: 1, ph: { kind: "shadow" }, note: "앨범 아래 그림자" },
  "s2-page-right": { src: null, space: A, cx: 68, cy: 68, w: 36, ar: 0.75, depth: 1, z: 3, ph: { kind: "pageRight" }, note: "펼친 앨범의 오른쪽 속지" },
  "s2-page-left": { src: null, space: A, cx: 32, cy: 68, w: 36, ar: 0.75, depth: 1, z: 4, ph: { kind: "pageLeft" }, note: "펼친 앨범의 왼쪽 속지(표지 안쪽 면)" },
  "s2-cover": { src: null, space: A, cx: 68, cy: 68, w: 36, ar: 0.75, depth: 1, z: 6, ph: { kind: "cover", tint: "#7C6BFF", tint2: "#FFD84D" }, note: "앨범 앞표지" },
  "s2-card-1": { src: null, space: A, cx: 16, cy: 24, w: 16, ar: 0.8, depth: 1, z: 7, rot: -8, idle: "bob", idleSec: 3.6, maxPx: 130, ph: { kind: "card", tint: "#FFD1DC", tint2: "#FF9DB8" }, note: "날아가는 사진 1" },
  "s2-card-2": { src: null, space: A, cx: 37, cy: 11, w: 16, ar: 0.8, depth: 1, z: 7, rot: 5, idle: "bob", idleSec: 4.1, idleDelay: -1, maxPx: 130, ph: { kind: "card", tint: "#CDE7FF", tint2: "#8CC3FF" }, note: "날아가는 사진 2" },
  "s2-card-3": { src: null, space: A, cx: 63, cy: 12, w: 16, ar: 0.8, depth: 1, z: 7, rot: -4, idle: "bob", idleSec: 3.8, idleDelay: -2, maxPx: 130, ph: { kind: "card", tint: "#FFF0B3", tint2: "#FFD24D" }, note: "날아가는 사진 3" },
  "s2-card-4": { src: null, space: A, cx: 85, cy: 24, w: 16, ar: 0.8, depth: 1, z: 7, rot: 9, idle: "bob", idleSec: 3.4, idleDelay: -0.5, maxPx: 130, ph: { kind: "card", tint: "#D9F2D0", tint2: "#7FD08A" }, note: "날아가는 사진 4" },
  "s2-card-5": { src: null, space: A, cx: 26, cy: 36, w: 16, ar: 0.8, depth: 1, z: 7, rot: 6, idle: "bob", idleSec: 4.4, idleDelay: -1.6, maxPx: 130, ph: { kind: "card", tint: "#E5D4FF", tint2: "#B596FF" }, note: "날아가는 사진 5" },
  "s2-card-6": { src: null, space: A, cx: 74, cy: 37, w: 16, ar: 0.8, depth: 1, z: 7, rot: -6, idle: "bob", idleSec: 3.9, idleDelay: -2.4, maxPx: 130, ph: { kind: "card", tint: "#FFE0C2", tint2: "#FFB074" }, note: "날아가는 사진 6" },
  "s2-spark-1": { src: null, space: A, cx: 8, cy: 52, w: 5, ar: 1, depth: 1, z: 2, idle: "twinkle", idleSec: 2.4, maxPx: 36, ph: { kind: "spark", tint: "#FFD84D" }, note: "반짝이" },
  "s2-spark-2": { src: null, space: A, cx: 93, cy: 56, w: 4, ar: 1, depth: 1, z: 2, idle: "twinkle", idleSec: 2.9, idleDelay: -1, maxPx: 30, ph: { kind: "spark", tint: "#FF9DB8" }, note: "반짝이" },
  "s2-spark-3": { src: null, space: A, cx: 50, cy: 40, w: 3.4, ar: 1, depth: 1, z: 2, idle: "twinkle", idleSec: 2.6, idleDelay: -0.6, maxPx: 26, ph: { kind: "spark", tint: "#8CC3FF" }, note: "반짝이" },

  // ───────── 장면 3 · 집에 도착 ─────────
  "s3-sun": { src: null, space: S, cx: 88, cy: 30, w: 15, ar: 1, depth: 1, z: 1, idle: "twinkle", idleSec: 6, maxPx: 180, ph: { kind: "sun", tint: "#FFD24D" }, note: "해(노을)" },
  "s3-cloud-1": { src: null, space: S, cx: 14, cy: 14, w: 28, ar: 2, depth: 1, z: 1, idle: "drift", idleSec: 24, maxPx: 320, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#FFE3D6" }, note: "구름" },
  "s3-cloud-2": { src: null, space: S, cx: 60, cy: 8, w: 20, ar: 2, depth: 1, z: 1, idle: "drift", idleSec: 30, idleDelay: -12, maxPx: 230, ph: { kind: "cloud", tint: "#FFFFFF", tint2: "#FFE3D6" }, note: "구름" },
  "s3-hill-back": { src: null, space: S, cx: 50, cy: 0, w: 100, ar: 3.33, depth: 1, z: 2, fill: { edge: "bottom", h: 52 }, ph: { kind: "hill", tint: "#8DD7A9" }, note: "뒷산" },
  "s3-hill-front": { src: null, space: S, cx: 50, cy: 0, w: 100, ar: 3.33, depth: 1, z: 3, fill: { edge: "bottom", h: 34 }, ph: { kind: "hill", tint: "#5DBB8F" }, note: "앞 언덕" },
  "s3-path": { src: null, space: A, cx: 50, cy: 50, w: 100, ar: 1, depth: 1, z: 2, ph: { kind: "path" }, note: "구불구불 길(정사각형 캔버스, 아래 route와 같은 모양)" },
  "s3-house": { src: null, space: A, cx: 76, cy: 25, w: 30, ar: 1, depth: 1, z: 3, maxPx: 260, ph: { kind: "house", tint: "#FF8F6B", tint2: "#FFF3E2" }, note: "집" },
  "s3-tree-1": { src: null, space: A, cx: 12, cy: 52, w: 14, ar: 0.8, depth: 1, z: 3, idle: "bob", idleSec: 5, maxPx: 110, ph: { kind: "tree", tint: "#3FA97A" }, note: "나무(왼쪽)" },
  "s3-tree-2": { src: null, space: A, cx: 92, cy: 66, w: 12, ar: 0.8, depth: 1, z: 3, idle: "bob", idleSec: 5.6, idleDelay: -2, maxPx: 96, ph: { kind: "tree", tint: "#2F9468" }, note: "나무(오른쪽)" },
  "s3-bush": { src: null, space: A, cx: 90, cy: 93, w: 12, ar: 1.4, depth: 1, z: 3, maxPx: 96, ph: { kind: "bush", tint: "#3FA97A" }, note: "덤불" },
  "s3-album": { src: null, space: A, cx: 12, cy: 87, w: 22, ar: 1, depth: 1, z: 8, maxPx: 170, ph: { kind: "albumClosed", tint: "#7C6BFF", tint2: "#FFD84D" }, note: "길을 따라가는 완성된 앨범(닫힌 모양)" },
  "s3-heart": { src: null, space: A, cx: 76, cy: 8, w: 8, ar: 1, depth: 1, z: 9, maxPx: 60, ph: { kind: "heart", tint: "#FF6F9B" }, note: "도착하면 톡 떠오르는 하트" },
} as const satisfies Record<string, LayerSpec>;

export type LayerId = keyof typeof LAYERS;

/**
 * 장면 3에서 앨범이 따라가는 길(SVG path). 가로·세로 0~100 정사각형 좌표예요.
 * s3-path 그림을 직접 그려서 바꾼다면, 앨범이 지나갈 길의 "한 줄 선"(가운데 선)을
 * 같은 모양으로 아래 d에 맞춰 주세요(README의 '길 그림 바꾸기' 참고).
 */
export const ROUTE = {
  d: "M 12 87 C 40 90, 80 86, 72 76 C 64 65, 22 74, 26 62 C 30 51, 84 59, 72 50 C 64 43, 40 52, 56 42 C 64 38, 70 40, 74 37",
  /** 처음 크기 → 도착했을 때 크기(멀어지는 느낌) */
  scaleFrom: 1,
  scaleTo: 0.46,
} as const;

/** 코드에서 레이어 설명을 읽을 때 쓰는 도우미(모든 칸을 같은 모양으로 읽을 수 있게 해줘요). */
export const layerSpec = (id: LayerId): LayerSpec => LAYERS[id];
