"use client";

// 장면 2 · 사진이 우리 물건이 돼요 — 스크롤하는 만큼만 진행되는 장면이에요(되감기도 돼요, 멈추면 그 자리에 멈춰요).
//
//   진행도 p (0 → 1)
//   0.00 ~ 0.12  닫혀 있던 앨범이 펼쳐져요(닫힌 그림 → 펼친 그림으로 스르륵 바뀌어요)
//   0.10 ~ 0.72  사진 3장이 하나씩 "별빛 궤도"를 따라 돌다가 앨범 속지 자리로 내려앉아요(0.2 간격, 각 0.22 동안)
//   0.74 ~ 0.82  앨범이 다시 닫혀요(사진도 함께 접혀 들어가요)
//   0.82 ~ 0.86  살짝 폴짝 — 앨범 완성!
//   0.83 ~ 1.00  앨범에서 액자 → 머그컵 → 에코백 → 캘린더가 "하나씩" 차례로 나와서 자리를 잡아요(이미 나온 것은 그대로 남아요)
//               앨범이 제일 크고, 액자가 그다음, 굿즈 셋은 작은 포인트예요.
//
// 모든 좌표는 정사각형 그림 영역을 0~100으로 본 값이에요(layers.ts와 같은 단위).
import { useEffect, useRef } from "react";
import { Layer, LayerArt, StoryBg, StoryImg, sizeStyle } from "./Layer";
import { layerSpec, type LayerId } from "./layers";
import { SceneText } from "./SceneText";
import { ease, prefersReducedMotion, subscribe } from "./scrollBus";

// 별빛 궤도(타원)의 모양. 가운데 점과 가로·세로 반지름, 기울기(도)
const RING = { cx: 50, cy: 28, rx: 40, ry: 11, tilt: -8 };
const ringPt = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const th = (RING.tilt * Math.PI) / 180;
  const ex = RING.rx * Math.cos(a);
  const ey = RING.ry * Math.sin(a);
  return { x: RING.cx + ex * Math.cos(th) - ey * Math.sin(th), y: RING.cy + ex * Math.sin(th) + ey * Math.cos(th), front: Math.sin(a) };
};
// 궤도 위의 반짝이(장식) 위치(각도)
const RING_SPARKS = [20, 75, 125, 215, 305];

const CARDS = [
  // from: 궤도 위 출발 각도 / turn: 앞쪽(90°) 자리까지 돌아가는 각도(음수 = 왼쪽으로 돌기) / slot: 속지에 앉는 자리
  { id: "s2-photo-friends", from: 190, turn: -100, slot: { x: 30, y: 70, r: -4, w: 25 } },
  { id: "s2-photo-puppy", from: 350, turn: 100, slot: { x: 62.5, y: 66, r: 3, w: 22 } },
  { id: "s2-photo-sea", from: 270, turn: -180, slot: { x: 77.5, y: 74, r: -3, w: 20 } },
] as const satisfies readonly { id: LayerId; from: number; turn: number; slot: { x: number; y: number; r: number; w: number } }[];
// 나오는 순서 = 배열 순서. start = 나오기 시작하는 진행도(0~1), 각자 goodsDur 동안 튀어나와요(겹치는 구간은 짧게)
const GOODS = [
  { id: "s2-goods-frame", name: "액자", start: 0.83 },
  { id: "s2-goods-mug", name: "머그컵", start: 0.875 },
  { id: "s2-goods-tote", name: "에코백", start: 0.91 },
  { id: "s2-goods-calendar", name: "캘린더", start: 0.94 },
] as const satisfies readonly { id: LayerId; name: string; start: number }[];
const ALBUM = { x: 50, y: 71.5 }; // 앨범 가운데
const T = { open: 0.12, cardStart: 0.1, cardGap: 0.2, cardDur: 0.22, closeStart: 0.74, closeEnd: 0.82, hop: 0.82, hopEnd: 0.86, goodsDur: 0.06 };
export const REDUCED_P = 1; // 동작 줄이기: 완성된 모습(닫힌 앨범 + 액자·굿즈가 모두 나와 있는 모습)으로 멈춰 보여줘요
const RING_SPLIT = 0.72; // 카드 움직임 중 앞부분(궤도 따라 돌기) 비율, 나머지는 속지로 내려앉기

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const tr = (x: number, y: number, rot: number, sc: number) =>
  `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;

export default function Scene2Album() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const bx = box.current;
    if (!el || !bx) return;
    const q = (n: string) => bx.querySelector<HTMLElement>(`[data-part="${n}"]`)!;
    const closed = q("closed"), open = q("open"), ring = q("ring");
    const cards = CARDS.map((_, i) => q(`card-${i}`));
    const goods = GOODS.map((_, i) => q(`goods-${i}`));
    const count = el.querySelector<HTMLElement>("[data-count]");
    const reduced = prefersReducedMotion();
    let size = bx.clientWidth || 1;
    let lastP = reduced ? REDUCED_P : 0;
    let lastLive = "";
    const lastZ: string[] = [];
    let lastCount = "";
    const lastFly: boolean[] = [];

    const apply = (p: number) => {
      const u = size / 100;
      // 펼침 정도(0 닫힘 ~ 1 펼침)와 닫히는 정도(0 ~ 1)
      const o = ease.inOut(ease.clamp01(p / T.open));
      const c = ease.inOut(ease.clamp01((p - T.closeStart) / (T.closeEnd - T.closeStart)));
      const openAmt = o * (1 - c);
      const hopT = ease.clamp01((p - T.hop) / (T.hopEnd - T.hop));
      const dy = -2.2 * Math.sin(hopT * Math.PI);

      closed.style.opacity = String(1 - ease.clamp01(openAmt * 1.8));
      closed.style.transform = tr(0, dy * u, 0, 1 - 0.06 * openAmt);
      open.style.opacity = String(ease.clamp01(openAmt * 1.8));
      open.style.transform = tr(0, dy * u, 0, 0.9 + 0.1 * openAmt);
      ring.style.opacity = String(0.95 * (1 - c));

      // 사진 카드: 궤도를 따라 돌다가 → 속지로 내려앉기. 닫힐 때는 앨범 안으로 작아지며 사라져요
      const gs = 1 - 0.14 * c;
      let landed = 0;
      cards.forEach((card, i) => {
        const cd = CARDS[i];
        const spec = layerSpec(cd.id);
        const s0 = T.cardStart + i * T.cardGap;
        const tt = ease.clamp01((p - s0) / T.cardDur);
        const r = ease.inOut(ease.clamp01(tt / RING_SPLIT));
        const d = ease.inOut(ease.clamp01((tt - RING_SPLIT) / (1 - RING_SPLIT)));
        const ph = ringPt(cd.from + cd.turn * r);
        const depthSc = 1 + 0.17 * ph.front; // 궤도 앞쪽에 올수록 살짝 커져요(가까워지는 느낌)
        const slotX = ALBUM.x + (cd.slot.x - ALBUM.x) * gs;
        const slotY = ALBUM.y + (cd.slot.y - ALBUM.y) * gs + dy;
        const x = lerp(ph.x, slotX, d);
        const y = lerp(ph.y, slotY, d);
        const rot = lerp((spec.rot ?? 0) + 12 * Math.sin(r * Math.PI), cd.slot.r, d);
        const sc = lerp(depthSc, (cd.slot.w / spec.w) * gs, d) * (1 + 0.08 * Math.sin(tt * Math.PI));
        const done = tt >= 0.999;
        if (done) landed++;
        card.style.transform = tr((x - spec.cx) * u, (y - spec.cy) * u, rot, sc);
        card.style.opacity = done ? String(1 - c) : "1";
        const z = !done ? "9" : "6";
        if (lastZ[i] !== z) { lastZ[i] = z; card.style.zIndex = z; }
        const flying = tt > 0.001;
        if (lastFly[i] !== flying) { lastFly[i] = flying; card.dataset.flying = flying ? "1" : "0"; }
      });

      // 상품: 닫힌 앨범에서 액자 → 머그컵 → 에코백 → 캘린더 순서로 하나씩 튀어나와요(나온 뒤에는 자리에 남아요)
      let gDone = 0;
      goods.forEach((g, i) => {
        const spec = layerSpec(GOODS[i].id);
        const t = ease.out(ease.clamp01((p - GOODS[i].start) / T.goodsDur));
        if (t >= 0.999) gDone++;
        const x = lerp(ALBUM.x, spec.cx, t);
        const y = lerp(ALBUM.y - 6, spec.cy, t) - Math.sin(t * Math.PI) * 6;
        g.style.opacity = String(ease.clamp01(t * 2));
        g.style.transform = tr((x - spec.cx) * u, (y - spec.cy) * u, lerp(-18, 0, t) + (spec.rot ?? 0), lerp(0.2, 1, t));
      });

      // 조용한 안내 글: 사진 n / 3 → 앨범 완성! → 앨범 → 액자 → 머그컵 · 에코백 · 캘린더 (나온 상품이 늘어나는 만큼 이어 붙어요)
      let label: string;
      if (gDone > 0 || p >= GOODS[0].start) {
        const shown = GOODS.filter((_, i) => ease.clamp01((p - GOODS[i].start) / T.goodsDur) > 0.5).map((x) => x.name);
        label = shown.length === 0 ? "앨범 완성!" : shown.length === 1 ? `앨범 → ${shown[0]}` : `앨범 → ${shown[0]} → ${shown.slice(1).join(" · ")}`;
      } else {
        label = p >= T.hop ? "앨범 완성!" : `사진 ${landed} / ${cards.length}`;
      }
      if (count && label !== lastCount) { lastCount = label; count.textContent = label; }
      lastP = p;
    };

    const ro = new ResizeObserver(() => {
      size = bx.clientWidth || size;
      apply(lastP);
    });
    ro.observe(bx);
    el.dataset.ready = "1";

    // 제목 전체가 장면에 들어올 때 한 번 살짝 떠오르게(처음 한 번만, 스크롤 진행도와 무관). 동작 줄이기 모드에서는 쓰지 않아요.
    let io: IntersectionObserver | null = null;
    if (!reduced) {
      el.dataset.arm = "1";
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { el.dataset.in = "1"; io?.disconnect(); }
      }, { threshold: 0.25 });
      io.observe(el.firstElementChild as Element);
    }

    let unsub = () => {};
    if (reduced) apply(REDUCED_P);
    else {
      unsub = subscribe(el, "track", ({ p, live }) => {
        const l = live ? "1" : "0";
        if (l !== lastLive) { lastLive = l; el.dataset.live = l; }
        apply(p);
      });
    }
    return () => { unsub(); ro.disconnect(); io?.disconnect(); };
  }, []);

  const rp = ringPt;
  return (
    <section ref={root} className="st-scene st-track st-s2" data-scene="2" aria-labelledby="st-h2">
      <div className="st-stage">
        <StoryBg name="bg-purple-space" />
        <Layer id="s2-planet" />
        <Layer id="s2-shooting" />
        <Layer id="s2-star-pink" />
        <Layer id="s2-star-cream" />
        <SceneText eyebrow="2단계 · 만들기" title="사진이 우리 물건이 돼요" titleId="st-h2" accent="물건" sub={["앨범부터 액자, 굿즈까지", "한 장씩 자리를 찾아가요"]}>
          <p className="st-note" data-count aria-live="off">사진 0 / 3</p>
        </SceneText>
        <div className="st-art">
          <div ref={box} className="st-artbox">
            {/* 별빛 궤도: 점선 타원 + 반짝이. 사진 카드가 이 길을 따라 돌아요 */}
            <div data-part="ring" className="st-ringwrap" aria-hidden="true">
              <svg className="st-ring" focusable="false" viewBox="0 0 100 100">
                <ellipse cx={RING.cx} cy={RING.cy} rx={RING.rx} ry={RING.ry} transform={`rotate(${RING.tilt} ${RING.cx} ${RING.cy})`} fill="none" className="st-ring-line" />
              </svg>
              {RING_SPARKS.map((deg, i) => {
                const pt = rp(deg);
                return (
                  <div key={deg} className="st-spark" style={{ left: `${pt.x}%`, top: `${pt.y}%`, ["--dur" as string]: `${2.4 + i * 0.35}s`, ["--dly" as string]: `${-i * 0.7}s` }}>
                    <StoryImg name="sparkle-cream" />
                  </div>
                );
              })}
            </div>
            <div data-part="open" className="st-part" aria-hidden="true" style={{ ...posStyle("s2-album-open"), zIndex: 3, opacity: 0 }}>
              <LayerArt id="s2-album-open" />
            </div>
            <div data-part="closed" className="st-part" style={{ ...posStyle("s2-album-closed"), zIndex: 4 }}>
              <LayerArt id="s2-album-closed" />
            </div>
            {CARDS.map(({ id }, i) => (
              <div
                key={id}
                data-part={`card-${i}`}
                className="st-part st-card"
                data-flying="0"
                aria-hidden="true"
                style={{ ...posStyle(id), zIndex: 9, ["--rot" as string]: `${layerSpec(id).rot ?? 0}deg` }}
              >
                <div className="st-idle st-idle-bob" style={{ ["--dur" as string]: `${layerSpec(id).idleSec ?? 4}s`, ["--dly" as string]: `${layerSpec(id).idleDelay ?? 0}s` }}>
                  <LayerArt id={id} />
                </div>
              </div>
            ))}
            {GOODS.map(({ id }, i) => (
              <div key={id} data-part={`goods-${i}`} className="st-part st-goods" aria-hidden="true" style={{ ...posStyle(id), zIndex: 8, opacity: 0, transform: "translate(-50%,-50%) scale(0.2)" }}>
                <div className="st-idle st-idle-bob" style={{ ["--dur" as string]: `${layerSpec(id).idleSec ?? 4}s`, ["--dly" as string]: `${layerSpec(id).idleDelay ?? 0}s` }}>
                  <LayerArt id={id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 장면 1 → 2 사이를 부드럽게 잇는 구름 가장자리(위 장면 아래색이 이 장면 안으로 내려와요) */}
      <div className="st-edge st-edge-a" aria-hidden="true" />
    </section>
  );
}

function posStyle(id: LayerId) {
  const s = layerSpec(id);
  return { left: `${s.cx}%`, top: `${s.cy}%`, ...sizeStyle(id) };
}
