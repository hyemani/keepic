"use client";

// 장면 3 · 집에 도착 — 완성된 앨범이 구불구불 길을 따라 집까지 가요.
//
//   진행도 p (0 → 1)
//   0.03 ~ 0.88  앨범이 길(ROUTE)을 따라 이동. 멀어질수록 작아지고, 걸을 때처럼 살짝 흔들려요
//   0.88 ~ 0.96  도착! 하트가 톡 떠오르고 집이 살짝 부풀어요
//   0.90 ~ 1     "앨범 만들기 시작하기" 버튼이 통통 숨 쉬어요
// 앨범의 위치는 SVG 길에서 getPointAtLength로 읽어요(스크롤을 멈추면 그 자리에 멈춰요, 되감기도 돼요).
import { useEffect, useRef } from "react";
import { Layer, LayerArt, sizeStyle } from "./Layer";
import { layerSpec, ROUTE } from "./layers";
import { SceneText, StartButton } from "./SceneText";
import { ease, prefersReducedMotion, subscribe } from "./scrollBus";

const T = { start: 0.03, end: 0.88, heartEnd: 0.96 };
const tr = (x: number, y: number, rot: number, sc: number) =>
  `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(-50%,-50%) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;

export default function Scene3Home() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const routeEl = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = root.current;
    const bx = box.current;
    const path = routeEl.current;
    if (!el || !bx || !path) return;
    const album = bx.querySelector<HTMLElement>('[data-part="album"]')!;
    const heart = bx.querySelector<HTMLElement>('[data-part="heart"]')!;
    const house = bx.querySelector<HTMLElement>('[data-part="house"]')!;
    const total = path.getTotalLength();
    const start = path.getPointAtLength(0);
    const reduced = prefersReducedMotion();
    let size = bx.clientWidth || 1;
    let lastP = reduced ? 1 : 0;
    let lastLive = "";
    let lastArrived = "";

    const apply = (p: number) => {
      const u = size / 100;
      const t = ease.clamp01((p - T.start) / (T.end - T.start));
      const L = total * t;
      const pt = path.getPointAtLength(L);
      const pa = path.getPointAtLength(Math.max(0, L - 1.2));
      const pb = path.getPointAtLength(Math.min(total, L + 1.2));
      const ang = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI; // 길 방향
      const tilt = Math.max(-10, Math.min(10, Math.sin((ang * Math.PI) / 180) * 9)) + Math.sin(t * 34) * 3.5 * (t < 1 ? 1 : 0);
      const sc = ROUTE.scaleFrom + (ROUTE.scaleTo - ROUTE.scaleFrom) * t;
      const bounce = t > 0 && t < 1 ? Math.abs(Math.sin(t * 40)) * 1.1 : 0; // 통통 걷는 느낌
      album.style.transform = tr((pt.x - start.x) * u, (pt.y - start.y - bounce) * u, tilt, sc);

      const h = ease.clamp01((p - T.end) / (T.heartEnd - T.end));
      const pop = h < 0.5 ? ease.out(h / 0.5) * 1.25 : 1.25 - 0.25 * ease.out((h - 0.5) / 0.5);
      heart.style.opacity = h > 0 ? "1" : "0";
      heart.style.transform = tr(0, -5 * ease.out(h) * u, 0, h > 0 ? pop : 0.01);
      const hb = Math.sin(h * Math.PI);
      house.style.transform = tr(0, 0, 0, 1 + 0.045 * hb);
      const arrived = p >= 0.9 ? "1" : "0";
      if (arrived !== lastArrived) { lastArrived = arrived; el.dataset.arrived = arrived; }
      lastP = p;
    };

    const ro = new ResizeObserver(() => {
      size = bx.clientWidth || size;
      apply(lastP);
    });
    ro.observe(bx);
    el.dataset.ready = "1";

    let io: IntersectionObserver | null = null;
    if (!reduced) {
      el.dataset.arm = "1";
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { el.dataset.in = "1"; io?.disconnect(); }
      }, { threshold: 0.45 });
      io.observe(el.firstElementChild as Element);
    }

    let unsub = () => {};
    if (reduced) apply(1);
    else {
      unsub = subscribe(el, "track", ({ p, live }) => {
        const l = live ? "1" : "0";
        if (l !== lastLive) { lastLive = l; el.dataset.live = l; }
        apply(p);
      });
    }
    return () => { unsub(); ro.disconnect(); io?.disconnect(); };
  }, []);

  const a = layerSpec("s3-album");
  const hh = layerSpec("s3-heart");
  return (
    <section ref={root} className="st-scene st-track st-s3" data-scene="3" aria-labelledby="st-h3">
      <div className="st-stage">
        <Layer id="s3-sun" />
        <Layer id="s3-cloud-1" />
        <Layer id="s3-cloud-2" />
        <Layer id="s3-hill-back" />
        <Layer id="s3-hill-front" />
        <SceneText eyebrow="셋 · 도착" title="집에 도착!" titleId="st-h3" sub="내 손에서 완성되는 나만의 포토북">
          <div className="st-actions">
            <StartButton label="앨범 만들기 시작하기" />
          </div>
        </SceneText>
        <div className="st-art">
          <div ref={box} className="st-artbox">
            <Layer id="s3-path" />
            <Layer id="s3-tree-1" />
            <Layer id="s3-tree-2" />
            <Layer id="s3-bush" />
            <div data-part="house" className="st-part st-house" style={{ left: `${layerSpec("s3-house").cx}%`, top: `${layerSpec("s3-house").cy}%`, ...sizeStyle("s3-house"), zIndex: 3 }}>
              <LayerArt id="s3-house" />
            </div>
            <div data-part="album" className="st-part" style={{ left: `${a.cx}%`, top: `${a.cy}%`, ...sizeStyle("s3-album"), zIndex: a.z }}>
              <LayerArt id="s3-album" />
            </div>
            <div data-part="heart" className="st-part" style={{ left: `${hh.cx}%`, top: `${hh.cy}%`, ...sizeStyle("s3-heart"), zIndex: hh.z, opacity: 0, transform: "translate(-50%,-50%) scale(0.01)" }}>
              <LayerArt id="s3-heart" />
            </div>
            {/* 앨범이 따라갈 길(눈에 안 보이는 선). 길 그림을 바꿔도 이 선은 그대로 써요. */}
            <svg className="st-route" aria-hidden="true" focusable="false" viewBox="0 0 100 100">
              <path ref={routeEl} d={ROUTE.d} fill="none" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
