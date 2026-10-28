"use client";

// 장면 1 · 사진 고르기 — 코발트빛 우주에 사진 카드와 별이 둥둥 떠 있는 첫 화면.
// 스크롤을 내리면 멀리 있는 조각(달·행성·구름)은 느리게, 가까운 조각(사진 카드·카메라)은 빠르게 움직여요(시차 효과).
import { useEffect, useRef } from "react";
import { Layer, StoryBg } from "./Layer";
import type { LayerId } from "./layers";
import { SceneText, StartButton } from "./SceneText";
import { prefersReducedMotion, subscribe } from "./scrollBus";

const STAGE: LayerId[] = [
  "s1-moon", "s1-planet-ringed", "s1-planet-pink", "s1-star-pink", "s1-star-cream",
  "s1-spark-1", "s1-spark-2", "s1-spark-3",
];
const ART: LayerId[] = ["s1-photo-friends", "s1-photo-puppy", "s1-photo-sea", "s1-camera", "s1-star-small"];

export default function Scene1Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    let lastLive = "1";
    return subscribe(el, "hero", ({ sy, live }) => {
      el.style.setProperty("--sy", `${sy.toFixed(1)}px`);
      const l = live ? "1" : "0";
      if (l !== lastLive) {
        lastLive = l;
        el.dataset.live = l;
      }
    });
  }, []);

  return (
    <section ref={root} className="st-scene st-hero" data-scene="1" data-live="1" aria-labelledby="st-h1">
      <div className="st-stage">
        {/* 첫 화면 배경은 가장 먼저(priority) 받아요 */}
        <StoryBg name="bg-cobalt-space" priority />
        {STAGE.map((id) => (
          <Layer key={id} id={id} eager />
        ))}
        <SceneText eyebrow="추억이 모여 나만의 우주가 되는 곳" title="사진을 고르면" titleId="st-h1" h1 accent="사진" sub={["소중한 순간들이", "별처럼 하나둘 떠올라요"]}>
          <div className="st-actions">
            <StartButton label="사진 고르기" />
          </div>
        </SceneText>
        <div className="st-art">
          <div className="st-artbox">
            {ART.map((id) => (
              <Layer key={id} id={id} eager />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
