"use client";

// 사진 필터·보정(lib/photoAdjust.ts)의 "화면" 쪽 도우미들이에요 — 화면 미리보기용 축소본 캔버스 만들기·캐시,
// 필터 썸네일, 그리고 박스 안에서 사진을 (보정·반전·90도 회전까지 반영해) 그려주는 BoxPhotoView.
// 인쇄(lib/printCompose.ts)는 같은 픽셀 함수(renderPhotoEditCanvas)를 풀 해상도 원본에 써요.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  isPhotoEditIdentity,
  photoEditKey,
  PHOTO_FILTER_OPTIONS,
  renderPhotoEditCanvas,
  renderPhotoEditOrientedCanvas,
  type PhotoAdjust,
  type PhotoFilter,
  type PhotoFilterId,
} from "@/lib/photoAdjust";
import { normalizePhotoQuarterTurn, type PhotoQuarterTurn } from "@/lib/imageBoxGeometry";

/** 화면 미리보기용 작업 해상도(긴 변 px). 박스가 화면에서 이보다 크게 보이는 일은 드물어요. */
export const PREVIEW_MAX_LONG_PX = 1400;

type WorkingSource = { canvas: HTMLCanvasElement; w: number; h: number };
const workingSourceCache = new Map<string, Promise<WorkingSource>>();

/** url 의 사진을 긴 변 maxLong 이하로 줄인 캔버스(원본보다 키우진 않음)로 — 같은 (url, maxLong) 은 한 번만 만들어요. */
export function getWorkingSource(url: string, maxLong: number): Promise<WorkingSource> {
  const key = `${url}|${maxLong}`;
  const hit = workingSourceCache.get(key);
  if (hit) return hit;
  const p = new Promise<WorkingSource>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const nw = img.naturalWidth || 1;
      const nh = img.naturalHeight || 1;
      const s = Math.min(1, maxLong / Math.max(nw, nh));
      const w = Math.max(1, Math.round(nw * s));
      const h = Math.max(1, Math.round(nh * s));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ canvas, w, h });
    };
    img.onerror = () => {
      workingSourceCache.delete(key);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
  workingSourceCache.set(key, p);
  // 작업 캔버스는 사진 한 장당 최대 ~8MB(1400px) — 오래된 것부터 버려서 메모리를 제한해요.
  if (workingSourceCache.size > 24) {
    const oldest = workingSourceCache.keys().next().value;
    if (oldest !== undefined) workingSourceCache.delete(oldest);
  }
  return p;
}

const editedCache = new Map<string, HTMLCanvasElement>();
function editedCachePut(key: string, canvas: HTMLCanvasElement) {
  editedCache.delete(key);
  editedCache.set(key, canvas);
  if (editedCache.size > 10) {
    const oldest = editedCache.keys().next().value;
    if (oldest !== undefined) editedCache.delete(oldest);
  }
}

/**
 * 보정이 적용된 화면용 캔버스를 돌려줘요(보정이 없거나 아직 계산 중이면 null → 호출부는 원본 img 를 그려요).
 * (사진 url, 보정값) 별로 캐시되고, 슬라이더를 끄는 동안엔 requestAnimationFrame 한 번에 한 번만 계산해요.
 */
export function usePhotoEditedCanvas(
  url: string,
  filter: PhotoFilter | undefined,
  adjust: PhotoAdjust | undefined,
  maxLong: number = PREVIEW_MAX_LONG_PX
): HTMLCanvasElement | null {
  const identity = !url || isPhotoEditIdentity(filter, adjust);
  const key = `${url}|${maxLong}|${photoEditKey(filter, adjust)}`;
  const cached = identity ? null : (editedCache.get(key) ?? null);
  const [last, setLast] = useState<{ url: string; canvas: HTMLCanvasElement } | null>(null);
  useEffect(() => {
    if (identity || editedCache.has(key)) return;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      getWorkingSource(url, maxLong)
        .then((ws) => {
          if (cancelled) return;
          const canvas = renderPhotoEditCanvas(ws.canvas, ws.w, ws.h, filter, adjust);
          editedCachePut(key, canvas);
          setLast({ url, canvas });
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [identity, key, url, maxLong, filter, adjust]);
  if (identity) return null;
  // 계산 중에는 같은 사진의 직전 결과를 잠깐 보여줘서 깜빡임을 막아요.
  return cached ?? (last && last.url === url ? last.canvas : null);
}

const thumbCache = new Map<string, string>();

/** 필터 썸네일(실제 선택한 사진을 작게, 각 필터 100%)을 만들어요 — id → dataURL. */
export function usePhotoFilterThumbs(url: string): Partial<Record<PhotoFilterId, string>> {
  const [thumbs, setThumbs] = useState<{ url: string; map: Partial<Record<PhotoFilterId, string>> } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    getWorkingSource(url, 112)
      .then((ws) => {
        if (cancelled) return;
        const map: Partial<Record<PhotoFilterId, string>> = {};
        for (const opt of PHOTO_FILTER_OPTIONS) {
          const ck = `${url}|${opt.id}`;
          let d = thumbCache.get(ck);
          if (!d) {
            const c = renderPhotoEditCanvas(ws.canvas, ws.w, ws.h, { id: opt.id, strength: 100 }, undefined);
            d = c.toDataURL("image/jpeg", 0.82);
            thumbCache.set(ck, d);
            if (thumbCache.size > 120) {
              const oldest = thumbCache.keys().next().value;
              if (oldest !== undefined) thumbCache.delete(oldest);
            }
          }
          map[opt.id] = d;
        }
        setThumbs({ url, map });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  return thumbs && thumbs.url === url ? thumbs.map : {};
}

/**
 * 박스 안의 사진 한 장을 그려요(화면 전용). rect 는 컨테이너 좌표의 "화면에 보이는" cover 사각형이고,
 * 반전(flipX/flipY)·90도 회전은 rect 중심 기준 CSS transform — 인쇄(drawBoxPhoto)와 같은 규칙이에요.
 * 보정(filter/adjust)이 있으면 계산된 캔버스를, 없거나 compare(원본 비교)면 원본 <img> 를 그려요.
 */
export function BoxPhotoView({
  url,
  rect,
  turn,
  flipX,
  flipY,
  filter,
  adjust,
  compareOriginal,
}: {
  url: string;
  rect: { x: number; y: number; width: number; height: number };
  turn: PhotoQuarterTurn;
  flipX?: boolean;
  flipY?: boolean;
  filter?: PhotoFilter;
  adjust?: PhotoAdjust;
  compareOriginal?: boolean;
}) {
  const edited = usePhotoEditedCanvas(url, compareOriginal ? undefined : filter, compareOriginal ? undefined : adjust);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !edited) return;
    c.width = edited.width;
    c.height = edited.height;
    c.getContext("2d")!.drawImage(edited, 0, 0);
  }, [edited]);
  const swap = turn === 90 || turn === 270;
  const dw = swap ? rect.height : rect.width;
  const dh = swap ? rect.width : rect.height;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const transforms: string[] = [];
  if (flipX || flipY) transforms.push(`scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`);
  if (turn) transforms.push(`rotate(${turn}deg)`);
  const style = {
    left: cx - dw / 2,
    top: cy - dh / 2,
    width: dw,
    height: dh,
    transform: transforms.length ? transforms.join(" ") : undefined,
  };
  const cls = "pointer-events-none absolute max-w-none max-h-none select-none";
  return edited ? (
    <canvas ref={ref} data-photo-edited="1" className={cls} style={style} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" draggable={false} className={cls} style={style} />
  );
}

// ---------------------------------------------------------------------------------------------
// 박스가 아닌 곳(하단 페이지 썸네일, 마지막 소개 페이지의 작은 표지 사진)에서 쓰는 "편집 반영" 사진.
// 박스(BoxPhotoView)·인쇄(printCompose)와 같은 편집값(필터·보정·90도 회전·상하/좌우 반전)을 같은 함수
// (lib/photoAdjust.ts)로 계산해서, 큰 편집 화면·미리보기·썸네일·PDF 가 같은 값으로 보이게 해요.

export type PhotoEditValues = {
  photoFilter?: PhotoFilter;
  photoAdjust?: PhotoAdjust;
  flipX?: boolean;
  flipY?: boolean;
  photoRotation?: number;
};

const orientedCache = new Map<string, HTMLCanvasElement | null>();

/**
 * 보정·회전·상하반전이 구워진 화면용 캔버스. 아무 것도 안 바꾸는 값이면 null(→ 호출부는 원본 <img>), 계산 중에도 null.
 * maxLong 은 작업본 긴 변(px) — 썸네일은 작게(≈240), 소개 페이지 사진은 조금 크게(≈700).
 */
export function usePhotoOrientedCanvas(
  url: string,
  filter: PhotoFilter | undefined,
  adjust: PhotoAdjust | undefined,
  rotation: number | undefined,
  flipY: boolean | undefined,
  maxLong: number
): HTMLCanvasElement | null {
  const turn = normalizePhotoQuarterTurn(rotation);
  const fy = !!flipY;
  const identity = !url || (isPhotoEditIdentity(filter, adjust) && turn === 0 && !fy);
  const key = `${url}|${maxLong}|${photoEditKey(filter, adjust)}|${turn}|${fy ? 1 : 0}`;
  const [, bump] = useState(0);
  const hit = identity ? null : (orientedCache.get(key) ?? null);
  useEffect(() => {
    if (identity || orientedCache.has(key)) return;
    let cancelled = false;
    getWorkingSource(url, maxLong)
      .then((ws) => {
        if (cancelled) return;
        const canvas = renderPhotoEditOrientedCanvas(ws.canvas, ws.w, ws.h, filter, adjust, turn, fy);
        orientedCache.set(key, canvas);
        if (orientedCache.size > 60) {
          const oldest = orientedCache.keys().next().value;
          if (oldest !== undefined) orientedCache.delete(oldest);
        }
        bump((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [identity, key, url, maxLong, filter, adjust, turn, fy]);
  return hit;
}

/**
 * 썸네일/미니 사진: 편집값이 없으면 예전과 똑같은 <img>(object-cover), 있으면 편집이 구워진 <canvas>(object-cover).
 * 좌우 반전(flipX)은 CSS scaleX(-1) — 큰 편집 화면과 같은 "화면 기준" 규칙이에요. fit 으로 contain 도 고를 수 있어요.
 */
export function EditedPhotoThumb({
  url,
  edit,
  className,
  style,
  maxLong = 240,
  fit = "cover",
}: {
  url: string;
  edit?: PhotoEditValues | null;
  className?: string;
  style?: React.CSSProperties;
  maxLong?: number;
  fit?: "cover" | "contain";
}) {
  const edited = usePhotoOrientedCanvas(url, edit?.photoFilter, edit?.photoAdjust, edit?.photoRotation, edit?.flipY, maxLong);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || !edited) return;
    c.width = edited.width;
    c.height = edited.height;
    c.getContext("2d")!.drawImage(edited, 0, 0);
  }, [edited]);
  const wantsEdit = !!edit && (!isPhotoEditIdentity(edit.photoFilter, edit.photoAdjust) || normalizePhotoQuarterTurn(edit.photoRotation) !== 0 || !!edit.flipY);
  const st: React.CSSProperties = {
    ...style,
    objectFit: fit,
    transform: [style?.transform, edit?.flipX ? "scaleX(-1)" : ""].filter(Boolean).join(" ") || undefined,
  };
  // 계산 중에는(캔버스 없음) 원본 <img> 를 그대로 보여줘요 — 깜빡임/빈칸 방지(계산이 끝나면 편집본으로 바뀌어요).
  if (wantsEdit && edited) return <canvas ref={ref} data-photo-edited="1" className={className} style={st} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" draggable={false} className={className} style={st} />;
}
