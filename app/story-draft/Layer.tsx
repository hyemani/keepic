import type { CSSProperties } from "react";
import { ART, artSrc, layerSpec, type ArtName, type LayerId } from "./layers";

/**
 * 그림 한 장(<img>). 가로·세로 크기를 미리 적어 두어서 그림이 늦게 와도 화면이 밀리지 않아요.
 * eager = 첫 화면에 바로 보이는 그림 / priority = 가장 먼저 받아야 하는 그림(첫 화면 배경).
 * 나머지는 loading="lazy": 아래 장면 그림은 스크롤이 가까워질 때 받아요.
 */
export function StoryImg({ name, alt = "", eager = false, priority = false }: { name: ArtName; alt?: string; eager?: boolean; priority?: boolean }) {
  const m = ART[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="st-img"
      src={artSrc(name)}
      width={m.w}
      height={m.h}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
    />
  );
}

/** 장면 배경(통그림). 큰 그림이 오기 전에는 대표 색 + 아주 작은 흐린 미리보기가 보여요. */
export function StoryBg({ name, priority = false, className = "" }: { name: ArtName; priority?: boolean; className?: string }) {
  const m = ART[name];
  const style: CSSProperties = { backgroundColor: m.color, backgroundImage: m.lqip ? `url("${m.lqip}")` : undefined };
  return (
    <div className={`st-bg ${className}`} style={style} aria-hidden="true">
      <StoryImg name={name} eager={priority} priority={priority} />
    </div>
  );
}

/** 그림 한 장의 "속"만 그려요. 이름표(label)가 있으면 낭독기가 읽고, 없으면 장식이라 숨겨요. */
export function LayerArt({ id, eager = false }: { id: LayerId; eager?: boolean }) {
  const spec = layerSpec(id);
  return <StoryImg name={spec.art} alt={spec.label ?? ""} eager={eager} />;
}

/** 크기만 정해 주는 스타일(위치는 장면 코드가 정해요: 날아다니는 사진·앨범 등). */
export function sizeStyle(id: LayerId): CSSProperties {
  const s = layerSpec(id);
  const m = ART[s.art];
  const style: CSSProperties = { width: `${s.w}%`, aspectRatio: `${m.w} / ${m.h}` };
  if (s.maxPx) style.maxWidth = `${s.maxPx}px`;
  return style;
}

/**
 * 제자리에 놓이는 레이어(구름·별·사진·카메라 등).
 * 바깥 div = 위치·스크롤 시차(parallax), 안쪽 div = 가만히 있을 때 움직임(idle).
 */
export function Layer({ id, eager = false }: { id: LayerId; eager?: boolean }) {
  const s = layerSpec(id);
  const { idle, maxPx } = s;
  const m = ART[s.art];
  const style: Record<string, string | number> = {
    zIndex: s.z,
    "--k": (1 - s.depth).toFixed(3),
    left: `${s.cx}%`,
    top: `${s.cy}%`,
    width: `${s.w}%`,
    aspectRatio: `${m.w} / ${m.h}`,
    "--rot": `${s.rot ?? 0}deg`,
  };
  if (maxPx) style.maxWidth = `${maxPx}px`;
  if (s.opacity !== undefined) style.opacity = s.opacity;
  if (s.land) {
    style["--lx"] = `${s.land.cx}%`;
    style["--ly"] = `${s.land.cy}%`;
    style["--lw"] = `${s.land.w ?? s.w}%`;
  }
  const innerStyle: Record<string, string | number> = {};
  if (idle) {
    innerStyle["--dur"] = `${s.idleSec ?? 4}s`;
    innerStyle["--dly"] = `${s.idleDelay ?? 0}s`;
  }
  return (
    <div className={s.land ? "st-layer st-layer-free st-has-land" : "st-layer st-layer-free"} data-layer={id} style={style as CSSProperties} aria-hidden={s.label ? undefined : true}>
      <div className={idle ? `st-idle st-idle-${idle}` : "st-fit"} style={innerStyle as CSSProperties}>
        <LayerArt id={id} eager={eager} />
      </div>
    </div>
  );
}
