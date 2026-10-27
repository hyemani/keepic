"use client";

// 장면 2 · 앨범으로 만들어져요 — 스크롤하는 만큼만 진행되는 장면이에요(되감기도 돼요, 멈추면 그 자리에 멈춰요).
//
//   진행도 p (0 → 1)
//   0.00 ~ 0.14  닫혀 있던 앨범이 열려요
//   0.12 ~ 0.83  사진 카드 6장이 하나씩 날아가 속지 자리에 앉아요(0.11 간격, 각 0.16 동안)
//   0.86 ~ 0.97  앨범이 다시 닫혀요(왼쪽 속지의 사진도 함께 접혀요)
//   0.965 ~ 1    살짝 폴짝 — 완성!
//
// 모든 좌표는 정사각형 그림 영역을 0~100으로 본 값이에요(layers.ts와 같은 단위).
import { useEffect, useRef } from "react";
import { Layer, LayerArt, sizeStyle } from "./Layer";
import { layerSpec, type LayerId } from "./layers";
import { SceneText } from "./SceneText";
import { ease, prefersReducedMotion, subscribe } from "./scrollBus";

const CARDS = ["s2-card-1", "s2-card-2", "s2-card-3", "s2-card-4", "s2-card-5", "s2-card-6"] as const satisfies readonly LayerId[];
// 속지에 앉는 자리(가운데 좌표, 앨범이 열렸을 때). 앞의 3장은 왼쪽 속지, 뒤의 3장은 오른쪽 속지.
const SLOTS = [
  { x: 23.5, y: 56.4, r: -4 }, { x: 40.5, y: 56.4, r: 3 }, { x: 32, y: 79.5, r: -2 },
  { x: 59.5, y: 56.4, r: 3 }, { x: 76.5, y: 56.4, r: -3 }, { x: 68, y: 79.5, r: 2 },
];
const LANDED_W = 15; // 속지에 앉았을 때 카드 가로(%) — 날아다닐 때(16)보다 살짝 작아져요
const SPINE = 50; // 앨범 등(책등) 위치
const CLOSED_SHIFT = -18; // 닫혔을 때는 오른쪽 반쪽만 보이니까 가운데로 당겨요
const T = { open: 0.14, cardStart: 0.12, cardGap: 0.11, cardDur: 0.16, closeStart: 0.86, closeEnd: 0.97, hop: 0.965 };
export const REDUCED_P = 0.84; // 동작 줄이기: 펼쳐진 채 사진이 다 채워진 모습으로 멈춰 보여줘요

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const tr = (x: number, y: number, rot: number, sx: number, sy: number) =>
  `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;

export default function Scene2Album() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const bx = box.current;
    if (!el || !bx) return;
    const q = (n: string) => bx.querySelector<HTMLElement>(`[data-part="${n}"]`)!;
    const cover = q("cover"), front = q("cover-front"), back = q("cover-back"), shade = q("cover-shade");
    const pageR = q("page-right"), shadow = q("shadow");
    const cards = CARDS.map((_, i) => q(`card-${i}`));
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
      // 앨범 열림 정도(0 닫힘 ~ 1 펼침)
      const o = ease.inOut(ease.clamp01(p / T.open));
      const c = ease.inOut(ease.clamp01((p - T.closeStart) / (T.closeEnd - T.closeStart)));
      const open = o * (1 - c);
      const phi = open * Math.PI;
      const cosv = Math.cos(phi); // 앞표지 가로 비율: 1 → -1
      const dx = CLOSED_SHIFT * (1 - open);
      const hopT = ease.clamp01((p - T.hop) / (1 - T.hop));
      const dy = -2.4 * Math.sin(hopT * Math.PI);

      // 속지·표지·그림자는 그룹으로 같이 움직여요
      pageR.style.transform = tr(dx * u, dy * u, 0, 1, 1);
      cover.style.transform = tr(dx * u, dy * u, 0, cosv, 1 + 0.035 * Math.sin(phi));
      front.style.opacity = cosv > 0 ? "1" : "0";
      back.style.opacity = cosv > 0 ? "0" : "1";
      shade.style.opacity = (0.28 * Math.sin(phi)).toFixed(3);
      shadow.style.transform = tr(0, 0, 0, lerp(0.46, 1, open), 1);

      let landed = 0;
      cards.forEach((card, i) => {
        const spec = layerSpec(CARDS[i]);
        const slot = SLOTS[i];
        const s0 = T.cardStart + i * T.cardGap;
        const tt = ease.inOut(ease.clamp01((p - s0) / T.cardDur));
        const left = i < 3;
        const f = Math.max(-cosv, 0); // 왼쪽 속지 사진의 가로 비율(접힐 때 납작해져요)
        const tx = left ? SPINE + dx + (slot.x - SPINE) * f : slot.x + dx;
        const ty = slot.y + dy;
        const x = lerp(spec.cx, tx, tt);
        const y = lerp(spec.cy, ty, tt) - Math.sin(tt * Math.PI) * 9;
        const rot = lerp(spec.rot ?? 0, slot.r, tt);
        const sc = lerp(1, LANDED_W / spec.w, tt) * (1 + 0.1 * Math.sin(tt * Math.PI));
        const done = tt >= 0.999;
        if (done) landed++;
        const sx = done && left ? f : 1;
        card.style.transform = tr((x - spec.cx) * u, (y - spec.cy) * u, rot, sc * sx, sc);
        card.style.opacity = done && left && f < 0.04 ? "0" : "1";
        // 겹치는 순서: 날아가는 중 맨 위 / 앉은 왼쪽 사진은 표지 위 / 앉은 오른쪽 사진은 표지 아래(닫힐 때 덮이도록)
        const z = !done ? "9" : left ? "7" : "5";
        if (lastZ[i] !== z) { lastZ[i] = z; card.style.zIndex = z; }
        const flying = tt > 0.001;
        if (lastFly[i] !== flying) { lastFly[i] = flying; card.dataset.flying = flying ? "1" : "0"; }
      });
      const label = p >= 0.975 ? "완성!" : `${landed} / ${cards.length}`;
      if (count && label !== lastCount) { lastCount = label; count.textContent = label; }
      lastP = p;
    };

    const ro = new ResizeObserver(() => {
      size = bx.clientWidth || size;
      apply(lastP);
    });
    ro.observe(bx);
    el.dataset.ready = "1";

    // 제목 글자가 장면에 들어올 때 톡톡 튀어나오게(처음 한 번만). 동작 줄이기 모드에서는 쓰지 않아요.
    let io: IntersectionObserver | null = null;
    if (!reduced) {
      el.dataset.arm = "1";
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { el.dataset.in = "1"; io?.disconnect(); }
      }, { threshold: 0.45 });
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

  const initClosed = { transform: "translate(-100%,-50%)" }; // 서버가 그린 처음 모습: 닫힌 앨범(오른쪽 반쪽만, 가운데로)
  return (
    <section ref={root} className="st-scene st-track st-s2" data-scene="2" aria-labelledby="st-h2">
      <div className="st-stage">
        <Layer id="s2-cloud-1" />
        <Layer id="s2-cloud-2" />
        <SceneText eyebrow="둘 · 만들기" title="앨범으로 만들어져요" titleId="st-h2" sub="한 장 한 장 자리를 찾아가요">
          <p className="st-count" data-count aria-hidden="true">0 / 6</p>
        </SceneText>
        <div className="st-art">
          <div ref={box} className="st-artbox">
            <Layer id="s2-spark-1" />
            <Layer id="s2-spark-2" />
            <Layer id="s2-spark-3" />
            <div data-part="shadow" className="st-part" style={{ ...posStyle("s2-shadow"), zIndex: 1 }}>
              <LayerArt id="s2-shadow" />
            </div>
            <div data-part="page-right" className="st-part" style={{ ...posStyle("s2-page-right"), ...initClosed, zIndex: 3 }}>
              <LayerArt id="s2-page-right" />
            </div>
            <div data-part="cover" className="st-part st-cover" style={{ ...posStyle("s2-cover"), ...initClosed, zIndex: 6 }}>
              <div data-part="cover-front" className="st-face">
                <LayerArt id="s2-cover" />
              </div>
              <div data-part="cover-back" className="st-face st-face-back" style={{ opacity: 0 }}>
                <LayerArt id="s2-page-left" />
              </div>
              <div data-part="cover-shade" className="st-shade" style={{ opacity: 0 }} />
            </div>
            {CARDS.map((id, i) => (
              <div
                key={id}
                data-part={`card-${i}`}
                className="st-part st-card"
                data-flying="0"
                style={{ ...posStyle(id), zIndex: 9, ["--rot" as string]: `${layerSpec(id).rot ?? 0}deg` }}
              >
                <div className="st-idle st-idle-bob" style={{ ["--dur" as string]: `${layerSpec(id).idleSec ?? 4}s`, ["--dly" as string]: `${layerSpec(id).idleDelay ?? 0}s` }}>
                  <LayerArt id={id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function posStyle(id: LayerId) {
  const s = layerSpec(id);
  return { left: `${s.cx}%`, top: `${s.cy}%`, ...sizeStyle(id) };
}
