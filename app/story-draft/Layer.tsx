import type { CSSProperties } from "react";
import { layerSpec, ROUTE, type LayerId } from "./layers";
import Placeholder, { PathPlaceholder } from "./placeholders";

/** 그림 한 장의 "속"만 그려요: src가 있으면 진짜 그림(<img>), 없으면 임시 도형. */
export function LayerArt({ id }: { id: LayerId }) {
  const spec = layerSpec(id);
  if (spec.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="st-img" src={spec.src} alt="" draggable={false} decoding="async" />;
  }
  if (spec.ph.kind === "path") return <PathPlaceholder d={ROUTE.d} />;
  return <Placeholder ph={spec.ph} />;
}

/** 크기만 정해 주는 스타일(위치는 장면 코드가 정해요: 날아다니는 카드·앨범 등). */
export function sizeStyle(id: LayerId): CSSProperties {
  const s = layerSpec(id);
  return { width: `${s.w}%`, aspectRatio: String(s.ar) };
}

/**
 * 제자리에 놓이는 레이어(구름·별·언덕·카드·캐릭터 등).
 * 바깥 div = 위치·스크롤 시차(parallax), 안쪽 div = 가만히 있을 때 움직임(idle).
 */
export function Layer({ id }: { id: LayerId }) {
  const s = layerSpec(id);
  const { idle, fill, maxPx } = s;
  const rot = s.rot ?? 0;
  const idleSec = s.idleSec ?? 4;
  const idleDelay = s.idleDelay ?? 0;

  const style: Record<string, string | number> = {
    zIndex: s.z,
    "--k": (1 - s.depth).toFixed(3),
  };
  if (fill) {
    style.left = 0;
    style.width = "100%";
    style.height = `${fill.h}%`;
    style[fill.edge] = 0;
  } else {
    style.left = `${s.cx}%`;
    style.top = `${s.cy}%`;
    style.width = `${s.w}%`;
    style.aspectRatio = String(s.ar);
    if (maxPx) style.maxWidth = `${maxPx}px`;
    style["--rot"] = `${rot}deg`;
  }
  const innerStyle: Record<string, string | number> = {};
  if (idle) {
    innerStyle["--dur"] = `${idleSec}s`;
    innerStyle["--dly"] = `${idleDelay}s`;
  }

  return (
    <div
      className={`st-layer ${fill ? "st-layer-fill" : "st-layer-free"}`}
      data-layer={id}
      style={style as CSSProperties}
    >
      <div className={idle ? `st-idle st-idle-${idle}` : "st-fit"} style={innerStyle as CSSProperties}>
        <LayerArt id={id} />
      </div>
    </div>
  );
}
