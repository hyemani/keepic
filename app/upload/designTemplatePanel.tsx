"use client";

// 왼쪽 "디자인 템플릿" 패널 화면 부품이에요(내지·표지 공용). 위에서부터
//   1) (내지만) 적용 대상(왼쪽/오른쪽/현재 펼침) 선택
//   2) 디자인 목록 — 큰 썸네일 1열 + 이름·사진 칸 수
// 썸네일은 손으로 그린 그림이 아니라, 실제로 적용할 때 쓰는 데이터(lib/designTemplates.ts의 layout)를 인쇄 PDF와 같은 그리기 함수
// (drawTextBoxOnCanvas·drawBackgroundSpecOnCanvas·framePerimeterPoints)로 그려요 → 썸네일 모양 = 적용 결과예요.
// 이 파일은 그리기만 하고, 실제 적용·사진 보존은 page.tsx의 applyInnerDesignTemplate / applyCoverDesignTemplate이 해요.
import { useEffect, useRef } from "react";
import type { DesignScene, DesignScenePart } from "@/lib/designTemplates";
import type { TextBoxDef } from "@/lib/albumTemplates";
import { drawTextBoxOnCanvas } from "@/lib/printCompose";
import { drawBackgroundSpecOnCanvas } from "@/lib/backgroundSpec";
import { framePerimeterPoints } from "@/lib/frameShapes";
import { NESTED_SCROLL, PANEL_STACK, SegTabs, type SegTabItem } from "./sidePanelShell";

export type DesignListItem = {
  id: string;
  name: string;
  note: string;
  photoCount: number;
  scene: DesignScene;
};

const stickerCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadSticker(url: string): Promise<HTMLImageElement | null> {
  let p = stickerCache.get(url);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    stickerCache.set(url, p);
  }
  return p;
}

// 글자를 그리기 전에 이 글에 쓰는 서체(필요한 글자 조각까지)를 불러와요 — 안 불러온 서체로 캔버스에 그리면 기본 서체로 나와요.
export async function ensureDesignFontsLoaded(scene: DesignScene): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const jobs: Promise<unknown>[] = [];
  for (const part of scene.parts) {
    for (const t of part.layout.texts) {
      jobs.push(document.fonts.load(`${t.bold ? "bold " : ""}20px ${t.fontFamily}`, t.text).catch(() => null));
    }
  }
  await Promise.all(jobs);
}

function slotPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, shape: string | undefined, radiusPct: number) {
  ctx.beginPath();
  const pts = shape && shape !== "rect" ? framePerimeterPoints(shape as never, w / h) : null;
  if (pts && pts.length > 2) {
    pts.forEach((p, i) => {
      const px = x + (p.xPct / 100) * w;
      const py = y + (p.yPct / 100) * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    return;
  }
  const r = Math.min(w, h) * Math.min(50, Math.max(0, radiusPct)) / 100;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 빈 사진 칸 표시: 연한 하늘색 + 작은 그림(산·해) 아이콘 (편집 화면의 빈 프레임과 같은 느낌)
function drawSlotIcon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const s = Math.min(w, h) * 0.26;
  if (s < 6) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.save();
  ctx.strokeStyle = "#8FB1CE";
  ctx.fillStyle = "#8FB1CE";
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.lineJoin = "round";
  ctx.strokeRect(cx - s / 2, cy - s * 0.4, s, s * 0.8);
  ctx.beginPath();
  ctx.moveTo(cx - s / 2, cy + s * 0.4);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.2);
  ctx.lineTo(cx + s * 0.22, cy + s * 0.08);
  ctx.lineTo(cx + s / 2, cy + s * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + s * 0.22, cy - s * 0.17, s * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  part: DesignScenePart,
  ppm: number,
  stickers: Map<string, HTMLImageElement | null>
) {
  const x = part.xMm * ppm;
  const y = part.yMm * ppm;
  const w = part.wMm * ppm;
  const h = part.hMm * ppm;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const bg = part.band ?? part.layout.bg;
  if (bg) drawBackgroundSpecOnCanvas(ctx, bg, x, y, w, h, (mm) => mm * ppm);
  else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
  }
  // 사진 칸
  for (const s of part.layout.slots) {
    const sx = x + (s.xPct / 100) * w;
    const sy = y + (s.yPct / 100) * h;
    const sw = (s.widthPct / 100) * w;
    const sh = (s.heightPct / 100) * h;
    slotPath(ctx, sx, sy, sw, sh, s.patch?.frameShape, s.patch?.borderRadiusPct ?? 0);
    ctx.fillStyle = "#DCEAF6";
    ctx.fill();
    if (s.patch?.borderWidthPx) {
      ctx.lineWidth = s.patch.borderWidthPx * (ppm / 3.78) * 1.6;
      ctx.strokeStyle = s.patch.borderColor ?? "#ffffff";
      ctx.stroke();
    }
    drawSlotIcon(ctx, sx, sy, sw, sh);
  }
  // 스티커
  for (const st of part.layout.stickers) {
    const img = stickers.get(st.url);
    if (!img) continue;
    const sx = x + (st.xPct / 100) * w;
    const sy = y + (st.yPct / 100) * h;
    const sw = (st.widthPct / 100) * w;
    const sh = (st.heightPct / 100) * h;
    ctx.save();
    if (st.rotation) {
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.rotate((st.rotation * Math.PI) / 180);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh);
    }
    ctx.restore();
  }
  // 뒤표지 키픽 로고
  if (part.logo) {
    const lg = stickers.get("/logo.svg");
    if (lg) {
      const lw = w * 0.34 * (part.logo.scalePct / 100);
      const ratio = (lg.naturalHeight || 1) / (lg.naturalWidth || 1);
      const lh = lw * (ratio > 0 && ratio < 2 ? ratio : 0.3);
      ctx.drawImage(lg, x + (part.logo.xPct / 100) * w - lw / 2, y + (part.logo.yPct / 100) * h - lh / 2, lw, lh);
    }
  }
  // 글상자 — 인쇄 PDF와 같은 함수
  part.layout.texts.forEach((t, i) => {
    const box: TextBoxDef = { ...t, id: `thumb-${i}` };
    drawTextBoxOnCanvas(ctx, box, w, h, x, y);
  });
  if (part.dim) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function DesignThumb({ scene, sceneKey }: { scene: DesignScene; sceneKey: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    const canvas = ref.current;
    if (!canvas) return;
    const ppm = Math.min(3.2, 1800 / scene.wMm);
    canvas.width = Math.round(scene.wMm * ppm);
    canvas.height = Math.round(scene.hMm * ppm);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stickerUrls = Array.from(
      new Set([...scene.parts.flatMap((p) => p.layout.stickers.map((s) => s.url)), ...(scene.parts.some((p) => p.logo) ? ["/logo.svg"] : [])])
    );
    const render = (stickers: Map<string, HTMLImageElement | null>) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#F2EFE8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const part of scene.parts) drawPart(ctx, part, ppm, stickers);
      if (scene.foldAtMm !== undefined) {
        ctx.fillStyle = "rgba(60,50,40,0.22)";
        ctx.fillRect(Math.round(scene.foldAtMm * ppm) - 1, 0, 2, canvas.height);
      } else {
        // 표지: 책등 경계선
        for (const p of scene.parts) {
          if (p.band) {
            ctx.fillStyle = "rgba(60,50,40,0.28)";
            ctx.fillRect(Math.round(p.xMm * ppm), 0, 1.5, Math.round(p.hMm * ppm));
            ctx.fillRect(Math.round((p.xMm + p.wMm) * ppm) - 1, 0, 1.5, Math.round(p.hMm * ppm));
          }
        }
      }
    };
    // 1) 서체·스티커를 기다리지 않고 먼저 한 번 그리고, 2) 다 불러온 뒤 다시 그려요(깜빡임 최소).
    render(new Map());
    (async () => {
      const [imgs] = await Promise.all([
        Promise.all(stickerUrls.map(async (u) => [u, await loadSticker(u)] as const)),
        ensureDesignFontsLoaded(scene),
      ]);
      render(new Map(imgs));
    })();
    return () => {
      cancelled = true;
    };
    // sceneKey가 같으면 같은 그림이에요(scene 객체는 렌더마다 새로 만들어져서 의존성으로 쓰지 않아요).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneKey]);
  return <canvas ref={ref} data-design-thumb-canvas className="block h-auto w-full" style={{ aspectRatio: `${scene.wMm} / ${scene.hMm}` }} />;
}

export function DesignPanel({
  mode,
  targets,
  target,
  onTargetChange,
  items,
  isSelected,
  onApply,
  message,
  styleName,
  sceneKeyOf,
}: {
  mode: "inner" | "cover";
  targets?: SegTabItem[];
  target?: string;
  onTargetChange?: (id: string) => void;
  items: DesignListItem[];
  isSelected: (id: string) => boolean;
  onApply: (id: string) => void;
  message?: string | null;
  styleName: string;
  sceneKeyOf: (id: string) => string;
}) {
  return (
    <div className={PANEL_STACK} data-design-panel data-design-mode={mode}>
      {targets && target !== undefined && onTargetChange ? (
        <SegTabs ariaLabel="디자인 적용 대상" dataAttr="data-design-target" items={targets} value={target} onChange={onTargetChange} />
      ) : null}
      <div className="flex items-baseline justify-between px-0.5 text-[11px] text-[var(--color-charcoal)]/60">
        <span className="font-medium text-[var(--color-charcoal)]">디자인 템플릿</span>
        <span>{styleName}</span>
      </div>
      <p className="px-0.5 text-[11px] leading-snug break-keep text-[var(--color-charcoal)]/55">
        {mode === "cover"
          ? "앞표지·책등·뒤표지 디자인을 한 번에 바꿔요. 넣어 둔 사진은 새 칸에 맞춰 그대로 옮겨져요."
          : "사진 칸·글·스티커·배경이 한 번에 깔려요. 넣어 둔 사진은 새 칸에 맞춰 그대로 옮겨져요."}
      </p>
      {message ? (
        <p className="bg-[var(--color-ivory)] px-1.5 py-2 text-[11px] break-keep text-[var(--color-charcoal)]/70" role="status">
          {message}
        </p>
      ) : null}
      <div data-design-list className={`flex flex-col gap-1.5 ${NESTED_SCROLL} max-h-[calc(100vh-15rem)]`}>
        {items.map((it) => {
          const selected = isSelected(it.id);
          return (
            <button
              key={it.id}
              type="button"
              data-design-id={it.id}
              data-selected={selected ? "true" : "false"}
              aria-pressed={selected}
              title={`${it.name} · ${it.note}`}
              onClick={() => onApply(it.id)}
              className={`block border-2 p-0.5 text-left transition ${
                selected
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]/60"
              }`}
            >
              <DesignThumb scene={it.scene} sceneKey={sceneKeyOf(it.id)} />
              <span className="mt-0.5 flex items-baseline justify-between gap-1 px-0.5 pb-0.5 text-[11px] text-[var(--color-charcoal)]/70">
                <span className="truncate font-medium text-[var(--color-charcoal)]">{it.name}</span>
                <span className="shrink-0 text-[10px] text-[var(--color-charcoal)]/50">사진 {it.photoCount}장</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
