"use client";

// 장면 3 · 집에 도착 — 별 표시 택배 상자(= 완성된 포토북)가 은하수 길을 따라 작은 집까지 가요.
//
//   진행도 p (0 → 1)
//   0.03 ~ 0.88  택배 상자가 길(ROUTE)을 따라 이동. 멀어질수록 작아지고, 걸을 때처럼 살짝 흔들려요
//   0.88 ~ 0.96  도착! 하트가 톡 떠오르고, 집이 살짝 부풀고, 포토북을 든 소녀가 나타나요
//   0.90 ~ 1     "지금 시작하기" 버튼(장면 1과 같은 납작한 분홍 버튼)
// 상자의 위치는 SVG 길에서 getPointAtLength로 읽어요(스크롤을 멈추면 그 자리에 멈춰요, 되감기도 돼요).
// 길 배경 그림(3:2)과 같은 크기의 상자(.st-roadbox) 안에 모든 조각을 놓아서, 화면 비율이 달라도 길과 정확히 겹쳐요.
import { useEffect, useRef } from "react";
import { Layer, LayerArt, StoryBg, sizeStyle } from "./Layer";
import { ART, layerSpec, ROUTE, type LayerId } from "./layers";
import { SceneText, StartButton } from "./SceneText";
import { ease, prefersReducedMotion, subscribe } from "./scrollBus";

const T = { start: 0.03, end: 0.88, heartEnd: 0.96 };
const tr = (x: number, y: number, rot: number, sc: number, anchor = "-50%,-50%") =>
  `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) translate(${anchor}) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
const BOX_ANCHOR = "-50%,-88%"; // 상자의 "아랫면 가운데"가 길 위의 점에 닿도록
const HOUSE_ANCHOR = "-50%,-92%";

export default function Scene3Home() {
  const root = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const routeEl = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = root.current;
    const bx = box.current;
    const path = routeEl.current;
    if (!el || !bx || !path) return;
    const parcel = bx.querySelector<HTMLElement>('[data-part="album"]')!;
    const heart = bx.querySelector<HTMLElement>('[data-part="heart"]')!;
    const house = bx.querySelector<HTMLElement>('[data-part="house"]')!;
    const girl = bx.querySelector<HTMLElement>('[data-part="girl"]')!;
    const total = path.getTotalLength();
    const start = path.getPointAtLength(0);
    const reduced = prefersReducedMotion();
    let hpx = bx.clientHeight || 1; // 길 그림 세로(px) = 좌표 100
    let wpx = bx.clientWidth || 1; // 길 그림 가로(px) = 좌표 150
    const stage = bx.parentElement as HTMLElement;
    let lastP = reduced ? 1 : 0;
    let lastLive = "";
    let lastArrived = "";

    const apply = (p: number) => {
      const u = hpx / 100; // 1단위 = 길 그림 세로의 1%
      const t = ease.clamp01((p - T.start) / (T.end - T.start));
      const L = total * t;
      const pt = path.getPointAtLength(L);
      const pa = path.getPointAtLength(Math.max(0, L - 1.2));
      const pb = path.getPointAtLength(Math.min(total, L + 1.2));
      const ang = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI; // 길 방향
      const tilt = Math.max(-8, Math.min(8, Math.sin((ang * Math.PI) / 180) * 7)) + Math.sin(t * 34) * 3 * (t < 1 ? 1 : 0);
      const sc = ROUTE.scaleFrom + (ROUTE.scaleTo - ROUTE.scaleFrom) * t;
      const bounce = t > 0 && t < 1 ? Math.abs(Math.sin(t * 40)) * 0.9 : 0; // 통통 걷는 느낌
      // 상자는 CSS로 길의 시작점(left/top)에 놓여 있으니, 시작점에서 얼마나 움직였는지만 더해요
      // 카메라: 길 그림이 화면보다 넓으면(폰 세로) 상자를 화면 가운데에 두고 그림을 옆으로 밀어요(끝에서는 멈춤)
      const viewW = stage.clientWidth || wpx;
      const pan = wpx > viewW ? Math.min(0, Math.max(viewW - wpx, viewW / 2 - (pt.x / 150) * wpx)) : 0;
      bx.style.transform = `translate3d(${pan.toFixed(1)}px,0,0)`;
      parcel.style.transform = tr((pt.x - start.x) * u, (pt.y - start.y - bounce) * u, tilt, sc, BOX_ANCHOR);

      const h = ease.clamp01((p - T.end) / (T.heartEnd - T.end));
      const pop = h < 0.5 ? ease.out(h / 0.5) * 1.25 : 1.25 - 0.25 * ease.out((h - 0.5) / 0.5);
      heart.style.opacity = h > 0 ? "1" : "0";
      heart.style.transform = tr(0, -4 * ease.out(h) * u, 0, h > 0 ? pop : 0.01);
      house.style.transform = tr(0, 0, 0, 1 + 0.04 * Math.sin(h * Math.PI), HOUSE_ANCHOR);
      girl.style.opacity = String(ease.clamp01(h * 1.6));
      girl.style.transform = tr(0, (1 - ease.out(h)) * 2.5 * u, 0, 0.85 + 0.15 * ease.out(h), "-50%,-96%");
      const arrived = p >= 0.9 ? "1" : "0";
      if (arrived !== lastArrived) { lastArrived = arrived; el.dataset.arrived = arrived; }
      lastP = p;
    };

    const ro = new ResizeObserver(() => {
      hpx = bx.clientHeight || hpx;
      wpx = bx.clientWidth || wpx;
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

  const bg = ART["bg-delivery-road"];
  const startPt = { x: 17, y: 98 }; // ROUTE.d 의 시작점(M 17 98)
  return (
    <section ref={root} className="st-scene st-track st-s3" data-scene="3" aria-labelledby="st-h3">
      <div className="st-stage">
        {/* 길 그림과 그 위에 놓이는 조각들은 같은 상자(roadbox, 3:2) 안에 있어요 */}
        <div ref={box} className="st-roadbox" style={{ aspectRatio: `${bg.w} / ${bg.h}` }}>
          <StoryBg name="bg-delivery-road" className="st-bg-road" />
          <div data-part="house" className="st-part st-house" style={{ ...posStyle("s3-house"), zIndex: 3, transform: tr(0, 0, 0, 1, HOUSE_ANCHOR) }}>
            <LayerArt id="s3-house" />
          </div>
          <div data-part="girl" className="st-part" style={{ ...posStyle("s3-girl"), zIndex: 4, opacity: 0 }} aria-hidden="true">
            <LayerArt id="s3-girl" />
          </div>
          <div
            data-part="album"
            className="st-part"
            style={{ left: `${startPt.x / 1.5}%`, top: `${startPt.y}%`, ...sizeStyle("s3-box"), zIndex: 5, transform: tr(0, 0, 0, 1, BOX_ANCHOR) }}
          >
            <LayerArt id="s3-box" />
          </div>
          <div data-part="heart" className="st-part" aria-hidden="true" style={{ ...posStyle("s3-heart"), zIndex: 7, opacity: 0, transform: "translate(-50%,-50%) scale(0.01)" }}>
            <LayerArt id="s3-heart" />
          </div>
          {/* 상자가 따라갈 길(눈에 안 보이는 선). 길 그림과 같은 비율(150×100)이에요. */}
          <svg className="st-route" aria-hidden="true" focusable="false" viewBox={ROUTE.viewBox} preserveAspectRatio="none">
            <path ref={routeEl} d={ROUTE.d} fill="none" />
          </svg>
        </div>
        <Layer id="s3-moon" />
        <Layer id="s3-milky" />
        <Layer id="s3-star-cream" />
        <Layer id="s3-spark-1" />
        <Layer id="s3-spark-2" />
        <SceneText eyebrow="3단계 · 도착" title="집에 도착!" titleId="st-h3" accent="도착!" sub="내 손에서 완성되는 나만의 추억 굿즈">
          <div className="st-actions">
            <StartButton label="지금 시작하기" />
          </div>
        </SceneText>
      </div>
      {/* 장면 2 → 3 사이를 부드럽게 잇는 구름 가장자리 */}
      <div className="st-edge st-edge-b" aria-hidden="true" />
    </section>
  );
}

// 길 그림 상자 안에서의 위치: left = cx%(가로), top = cy%(세로)
function posStyle(id: LayerId) {
  const s = layerSpec(id);
  return { left: `${s.cx}%`, top: `${s.cy}%`, ...sizeStyle(id) };
}
