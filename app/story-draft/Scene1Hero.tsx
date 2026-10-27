"use client";

// 장면 1 · 사진 고르기 — 하늘에 사진 카드가 둥둥 떠 있는 첫 화면.
// 스크롤을 내리면 멀리 있는 조각(뒷산·구름)은 느리게, 가까운 조각(카드)은 빠르게 움직여요(시차 효과).
import { useEffect, useRef } from "react";
import { Layer } from "./Layer";
import type { LayerId } from "./layers";
import { SceneText, StartButton } from "./SceneText";
import { prefersReducedMotion, subscribe } from "./scrollBus";

const STAGE: LayerId[] = [
  "s1-moon", "s1-star-1", "s1-star-2", "s1-star-3", "s1-star-4", "s1-star-5",
  "s1-cloud-1", "s1-cloud-2", "s1-cloud-3", "s1-hill-back", "s1-hill-mid", "s1-hill-front",
];
const ART: LayerId[] = ["s1-card-1", "s1-card-2", "s1-card-3", "s1-card-4", "s1-card-5", "s1-char-1", "s1-char-2"];

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
        {STAGE.map((id) => (
          <Layer key={id} id={id} />
        ))}
        <SceneText eyebrow="하나 · 고르기" title="사진을 고르면" titleId="st-h1" h1 sub="소중한 순간들이 하나둘 모여요">
          <div className="st-actions">
            <StartButton label="사진 고르기" />
          </div>
        </SceneText>
        <div className="st-art">
          <div className="st-artbox">
            {ART.map((id) => (
              <Layer key={id} id={id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
