// 스크롤 구독 도우미: 화면 전체에 스크롤 감시자는 딱 1개(passive)만 두고,
// 프레임당 최대 1번(requestAnimationFrame) 각 장면의 진행도(0~1)를 계산해서 알려줘요.
// 읽기(getBoundingClientRect)를 먼저 모아서 하고, 쓰기는 그 뒤에 해서 레이아웃이 여러 번 다시 계산되지 않게 해요.

export type SceneInfo = {
  /** 장면 진행도 0~1 (hero: 화면 위로 올라가며 사라지는 정도, track: 고정된 동안 스크롤한 정도) */
  p: number;
  /** hero 전용: 스크롤한 픽셀(시차 효과용) */
  sy: number;
  /** 화면에 걸쳐 있는지(아니면 상시 움직임을 멈춰요) */
  live: boolean;
};
type Cb = (info: SceneInfo) => void;
type Entry = { el: HTMLElement; mode: "hero" | "track"; cb: Cb };

const entries = new Set<Entry>();
let raf = 0;
let bound = false;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function measure(e: Entry): SceneInfo {
  const r = e.el.getBoundingClientRect();
  const vh = window.innerHeight;
  const live = r.bottom > -150 && r.top < vh + 150;
  if (e.mode === "hero") {
    const sy = Math.min(Math.max(-r.top, 0), r.height);
    return { p: r.height > 0 ? sy / r.height : 0, sy, live };
  }
  const stage = e.el.firstElementChild as HTMLElement | null;
  const span = r.height - (stage ? stage.offsetHeight : vh);
  return { p: span > 0 ? clamp01(-r.top / span) : 0, sy: 0, live };
}

function tick() {
  raf = 0;
  const list = Array.from(entries);
  const infos = list.map(measure); // 읽기 먼저
  list.forEach((e, i) => e.cb(infos[i])); // 쓰기는 나중에
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}
function unbind() {
  if (!bound || entries.size) return;
  bound = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

export function subscribe(el: HTMLElement, mode: "hero" | "track", cb: Cb) {
  const entry: Entry = { el, mode, cb };
  entries.add(entry);
  bind();
  schedule();
  return () => {
    entries.delete(entry);
    unbind();
  };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  clamp01,
};
