"use client";

// 왼쪽 "디자인 템플릿" 패널 화면 부품이에요(내지·표지 공용). 위에서부터
//   1) 종류 탭 2칸(앨범 테마 · 표지 디자인) — 고른 탭의 목록 하나만 보여요(기본 = 앨범 테마). 탭을 바꾸는 것만으로는 아무것도 적용되지 않아요.
//   2) 행사 탭 5칸(전체 · 가족 · 여행 · 커플 · 생일) — 다른 패널과 같은 SegTabs 규격(232px를 5등분, 높이 34px)
//   3) 스타일 보조 선택(전체 · 포근한 기억 · 미니멀 · 감성 필기체 · 키즈 · MZ) — 탭과 좌우 끝이 같은 한 줄 select
//   4) 카드 목록 — 두 탭 모두 같은 카드(같은 너비·이름 자리·색 칩·파란 선택 테두리). 앨범 테마 = 대표 내지 펼침면, 표지 디자인 = 뒷표지·책등·앞표지.
//   5) (내지 화면, 앨범 테마 탭만) 접힌 "이 펼침면만 바꾸기" — 예전의 한 페이지 단위 디자인(기본은 접혀 있어요)
// 썸네일은 손으로 그린 그림이 아니라, 실제로 적용할 때 쓰는 데이터(lib/designTemplates.ts의 layout)를 인쇄 PDF와 같은 그리기 함수
// (drawTextBoxOnCanvas·drawBackgroundSpecOnCanvas·framePerimeterPoints)로 그려요 → 썸네일 모양 = 적용 결과예요.
// 목록이 길어도(내지 30종) 가볍게: 썸네일은 화면에 보일 때(IntersectionObserver)만 처음 그리고, 한 번 그린 건 장면이 바뀔 때만 다시 그려요.
// 이 파일은 그리기만 하고, 실제 적용·사진 보존은 page.tsx의 applyInnerDesignTemplate / applyCoverDesignTemplate이 해요.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DESIGN_PHOTO_Z0, DESIGN_THEMES, designMatches, type DesignScene, type DesignScenePart, type DesignStyleInfo, type DesignThemeId } from "@/lib/designTemplates";
import type { TextBoxDef } from "@/lib/albumTemplates";
import { drawTextBoxOnCanvas } from "@/lib/printCompose";
import { drawBackgroundSpecOnCanvas } from "@/lib/backgroundSpec";
import { framePerimeterPoints } from "@/lib/frameShapes";
import { PANEL_STACK, SegTabs, type SegTabItem } from "./sidePanelShell";
import { ThemePreviewPopover, THEME_PREVIEW_ID, useThemePreview } from "./themePreviewPopover";

// 앨범 테마 카드 한 장(앞표지 미리보기 + 이름 + 색 칩) — 데이터는 page.tsx가 lib/designThemeSets.ts의 세트(표지 디자인 id)와 계획(planAlbumInner)에서 만들어 넘겨줘요.
// 카드 그림 = 이 테마를 적용하면 앞표지가 되는 디자인(applyCoverDesignTemplate가 쓰는 데이터 그대로). 눈 아이콘 미리보기 = 실제 계획의 내지 펼침면(왼쪽+오른쪽).
export type AlbumThemePreviewScene = { scene: DesignScene; sceneKey: string; designId: string; index: number };
export type AlbumThemeItem = {
  id: string;
  name: string;
  chips: string[]; // 표지 배경·책등·제목 색
  scene: DesignScene; // 앞표지(카드 칸 가운데)
  sceneKey: string;
  coverId: string; // 앞표지 디자인 id(적용하면 이 표지가 깔려요)
  designId: string; // 계획의 첫 내용 펼침면 디자인 id
  previewFor: () => AlbumThemePreviewScene[]; // 눈 아이콘 미리보기용: 실제 계획의 펼침면 3~4장(열었을 때만 만들어요)
  selected: boolean;
};
export type AlbumThemeProps = {
  itemsFor: (occasion: string, style: string) => AlbumThemeItem[];
  onApply: (id: string) => void;
};

// 표지 디자인 카드 한 장(뒷표지·책등·앞표지 미리보기 + 이름 + 색 칩) — 앨범 테마 카드와 같은 모양이에요.
export type CoverCardItem = {
  id: string;
  name: string;
  chips: string[]; // 앞표지 배경·책등·제목 색
  style: string;
  themes: DesignThemeId[];
  scene: DesignScene;
  sceneKey: string;
  selected: boolean;
};
export type CoverCardProps = { items: CoverCardItem[]; onApply: (id: string) => void };
// 내지 화면의 "이 펼침면만 바꾸기"(한 페이지 단위 적용) — 접힌 보조 영역
export type SingleSpreadProps = {
  targets: SegTabItem[];
  target: string;
  onTargetChange: (id: string) => void;
  items: DesignListItem[];
  isSelected: (id: string) => boolean;
  onApply: (id: string) => void;
  sceneKeyOf: (id: string) => string;
};
// 소개 페이지 화면의 "디자인" 메뉴 — 소개 페이지 디자인 카드만 보여줘요(앨범 테마·표지·이 펼침면만 바꾸기는 없어요).
export type IntroDesignProps = {
  items: DesignListItem[];
  isSelected: (id: string) => boolean;
  onApply: (id: string) => void;
  sceneKeyOf: (id: string) => string;
};
export type DesignKind = "theme" | "cover";

export type DesignListItem = {
  id: string;
  style: string; // DESIGN_STYLES의 id
  themes: DesignThemeId[]; // 어울리는 테마(첫 번째가 대표 테마)
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
  const drawText = (t: (typeof part.layout.texts)[number], i: number) => {
    const box: TextBoxDef = { ...t, id: `thumb-${i}` };
    drawTextBoxOnCanvas(ctx, box, w, h, x, y);
  };
  // 사진 칸 뒤에 깔리는 색 띠 글상자(zOrder가 사진 칸 시작값보다 작은 것) — 편집·인쇄와 같이 사진보다 먼저 그려요
  part.layout.texts.forEach((t, i) => {
    if (t.zOrder !== undefined && t.zOrder < DESIGN_PHOTO_Z0) drawText(t, i);
  });
  // 사진 칸
  for (const s of part.layout.slots) {
    const sx = x + (s.xPct / 100) * w;
    const sy = y + (s.yPct / 100) * h;
    const sw = (s.widthPct / 100) * w;
    const sh = (s.heightPct / 100) * h;
    ctx.save();
    if (s.patch?.rotation) {
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.rotate((s.patch.rotation * Math.PI) / 180);
      ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
    }
    slotPath(ctx, sx, sy, sw, sh, s.patch?.frameShape, s.patch?.borderRadiusPct ?? 0);
    ctx.fillStyle = "#DCEAF6";
    ctx.fill();
    if (s.patch?.borderWidthPx) {
      ctx.lineWidth = s.patch.borderWidthPx * (ppm / 3.78) * 1.6;
      ctx.strokeStyle = s.patch.borderColor ?? "#ffffff";
      ctx.stroke();
    }
    drawSlotIcon(ctx, sx, sy, sw, sh);
    ctx.restore();
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
    if (t.zOrder !== undefined && t.zOrder < DESIGN_PHOTO_Z0) return;
    drawText(t, i);
  });
  if (part.dim) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function DesignThumb({ scene, sceneKey }: { scene: DesignScene; sceneKey: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  // 화면 근처(300px 안)에 처음 들어왔을 때부터 그려요 — 30장짜리 목록을 한꺼번에 그리지 않아요.
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || seen) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" }
    );
    io.observe(canvas);
    return () => io.disconnect();
  }, [seen]);
  useEffect(() => {
    if (!seen) return;
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
      if (scene.cardEdge) {
        // 연한 표지가 베이지 바닥에 묻히지 않게: 표지 뒤에 부드러운 그림자(왼쪽·오른쪽 여백에 보여요)
        ctx.save();
        ctx.shadowColor = "rgba(50,40,30,0.5)";
        ctx.shadowBlur = Math.round(7 * ppm);
        ctx.fillStyle = "#FFFFFF";
        for (const p of scene.parts) ctx.fillRect(Math.round(p.xMm * ppm), Math.round(p.yMm * ppm), Math.round(p.wMm * ppm), Math.round(p.hMm * ppm));
        ctx.restore();
      }
      for (const part of scene.parts) drawPart(ctx, part, ppm, stickers);
      if (scene.cardEdge) {
        // 표지 가장자리 안쪽에 1px 링(바탕과 구분되는 어두운 선)
        const lw = Math.max(1.5, ppm * 0.45);
        ctx.strokeStyle = "rgba(50,40,30,0.5)";
        ctx.lineWidth = lw;
        for (const p of scene.parts) ctx.strokeRect(Math.round(p.xMm * ppm) + lw / 2, Math.round(p.yMm * ppm) + lw / 2, Math.round(p.wMm * ppm) - lw, Math.round(p.hMm * ppm) - lw);
      }
      if (scene.foldAtMm !== undefined) {
        ctx.fillStyle = "rgba(60,50,40,0.22)";
        ctx.fillRect(Math.round(scene.foldAtMm * ppm) - 1, 0, 2, canvas.height);
      } else {
        // 표지: 책등 경계선
        for (const p of scene.parts) {
          if (p.band) {
            ctx.fillStyle = "rgba(60,50,40,0.28)";
            ctx.fillRect(Math.round(p.xMm * ppm), Math.round(p.yMm * ppm), 1.5, Math.round(p.hMm * ppm));
            ctx.fillRect(Math.round((p.xMm + p.wMm) * ppm) - 1, Math.round(p.yMm * ppm), 1.5, Math.round(p.hMm * ppm));
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
  }, [sceneKey, seen]);
  return <canvas ref={ref} data-design-thumb-canvas data-drawn={seen ? "true" : "false"} className="block h-auto w-full" style={{ aspectRatio: `${scene.wMm} / ${scene.hMm}` }} />;
}

// 행사 탭 5칸(전체 + 가족·여행·커플·생일)
const THEME_TAB_ITEMS: SegTabItem[] = [{ id: "all", label: "전체" }, ...DESIGN_THEMES.map((t) => ({ id: t.id as string, label: t.name }))];
const KIND_TAB_ITEMS: SegTabItem[] = [
  { id: "theme", label: "앨범 테마" },
  { id: "cover", label: "표지 디자인" },
];

// 두 탭이 같이 쓰는 카드 — 너비(패널 폭 100%)·썸네일 자리·이름 자리(왼쪽 아래)·색 칩(오른쪽)·선택 테두리(파란 2px)가 모두 같아요.
function DesignCard({
  name,
  chips,
  trailing,
  scene,
  sceneKey,
  selected,
  onClick,
  attrs,
  title,
  eye,
}: {
  name: string;
  chips?: string[];
  trailing?: string;
  scene: DesignScene;
  sceneKey: string;
  selected: boolean;
  onClick: () => void;
  attrs: Record<string, string | undefined>;
  title?: string;
  eye?: ReactNode;
}) {
  return (
    <div className="relative min-w-0" data-design-card>
      <button
        type="button"
        {...attrs}
        data-selected={selected ? "true" : "false"}
        aria-pressed={selected}
        aria-current={selected ? "true" : undefined}
        title={title}
        onClick={onClick}
        className={`flex w-full min-w-0 flex-col border-2 p-0.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-charcoal)] ${
          selected ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]/60"
        }`}
      >
        <DesignThumb scene={scene} sceneKey={sceneKey} />
        <span data-design-card-name className="flex min-w-0 items-center gap-1 px-0.5 pb-0.5 pt-1">
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--color-charcoal)]">{name}</span>
          {trailing ? <span className="shrink-0 text-[10px] text-[var(--color-charcoal)]/50">{trailing}</span> : null}
          {(chips ?? []).map((c, i) => (
            <span key={i} data-design-chip className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ background: c }} aria-hidden />
          ))}
        </span>
      </button>
      {eye}
    </div>
  );
}

// 눈 아이콘 미리보기 안쪽 — 열려 있는 동안에만 펼침면 장면을 만들어요(같은 테마는 다시 열어도 같은 결과: 계획이 결정적이에요).
function PreviewPortal({ item, state, handlers }: { item: AlbumThemeItem; state: Parameters<typeof ThemePreviewPopover>[0]["state"]; handlers: { onPointerEnter: () => void; onPointerLeave: () => void } }) {
  const spreads = item.previewFor();
  const first = spreads[0]?.scene;
  return (
    <ThemePreviewPopover state={state} count={spreads.length} ratio={first ? first.wMm / first.hMm : 2} handlers={handlers} label={`${item.name} 내지 펼침면 미리보기`}>
      {spreads.map((ps) => (
        <div key={ps.index} data-album-theme-popover-spread={ps.designId} className="border border-[var(--color-hairline)]">
          <DesignThumb scene={ps.scene} sceneKey={ps.sceneKey} />
        </div>
      ))}
    </ThemePreviewPopover>
  );
}

export function DesignPanel({
  mode,
  kind,
  onKindChange,
  album,
  cover,
  single,
  intro,
  notice,
  styles,
  styleFilter,
  onStyleFilterChange,
  themeFilter,
  onThemeFilterChange,
}: {
  mode: "inner" | "cover" | "intro";
  kind: DesignKind;
  onKindChange: (k: DesignKind) => void;
  album: AlbumThemeProps;
  cover: CoverCardProps;
  single?: SingleSpreadProps;
  intro?: IntroDesignProps;
  notice?: string | null;
  styles: DesignStyleInfo[];
  styleFilter: string;
  onStyleFilterChange: (id: string) => void;
  themeFilter: string;
  onThemeFilterChange: (id: string) => void;
}) {
  const theme = THEME_TAB_ITEMS.some((t) => t.id === themeFilter) ? themeFilter : "all";
  const style = styles.some((x) => x.id === styleFilter) ? styleFilter : "all";
  const tp = useThemePreview();
  const preview = tp.open;
  const [singleOpen, setSingleOpen] = useState(false);
  const albumItems = kind === "theme" ? album.itemsFor(theme, style) : [];
  // 표지 목록: 고른 행사가 대표 행사인 디자인을 앞에(원래 순서는 그대로 유지)
  const coverItems = cover.items
    .filter((it) => designMatches(it, theme, style))
    .map((it, i) => ({ it, i, primary: theme === "all" || it.themes[0] === theme ? 0 : 1 }))
    .sort((a, b) => a.primary - b.primary || a.i - b.i)
    .map((x) => x.it);
  const singleList = single
    ? single.items
        .filter((it) => designMatches(it, theme, style))
        .map((it, i) => ({ it, i, primary: theme === "all" || it.themes[0] === theme ? 0 : 1 }))
        .sort((a, b) => a.primary - b.primary || a.i - b.i)
        .map((x) => x.it)
    : [];
  const previewItem = preview ? albumItems.find((a) => a.id === preview.id) : undefined;
  const eyeButton = (a: AlbumThemeItem) => (
    <button
      type="button"
      data-album-theme-preview-btn={a.id}
      aria-label={`${a.name} 테마의 내지 펼침면 미리보기`}
      aria-expanded={preview?.id === a.id}
      aria-controls={preview?.id === a.id ? THEME_PREVIEW_ID : undefined}
      {...tp.eyeHandlers(a.id)}
      className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center bg-white/90 text-[var(--color-charcoal)]/70 shadow-sm transition hover:text-[var(--color-charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-charcoal)] lg:flex"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
  const gridCls = "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1";
  const emptyMsg = (what: string) => (
    <p className="px-0.5 py-3 text-center text-[11px] text-[var(--color-charcoal)]/50">이 조건에 맞는 {what}가 아직 없어요.</p>
  );
  if (intro) {
    // 소개 페이지 전용: 모양이 실제로 다른 디자인 카드만(행사 탭·스타일 select 없음 — 행사는 "마무리 문구"로 따로 골라요)
    const list = intro.items;
    return (
      <div className={PANEL_STACK} data-design-panel data-design-mode="intro" data-design-kind-active="intro">
        <section data-intro-design-section role="tabpanel" aria-label="소개 페이지 디자인" className={PANEL_STACK}>
          {list.length > 0 ? (
            <div data-intro-design-list className={gridCls}>
              {list.map((it) => {
                const sel = intro.isSelected(it.id);
                return (
                  <DesignCard
                    key={it.id}
                    name={it.name}
                    scene={it.scene}
                    sceneKey={intro.sceneKeyOf(it.id)}
                    selected={sel}
                    onClick={() => {
                      if (!sel) intro.onApply(it.id);
                    }}
                    attrs={{ "data-intro-design-id": it.id, "data-design-style": it.style, "data-design-themes": it.themes.join(",") }}
                  />
                );
              })}
            </div>
          ) : (
            emptyMsg("디자인")
          )}
        </section>
        {notice ? (
          <p data-design-notice role="status" aria-live="polite" className="pointer-events-none sticky bottom-1 z-10 bg-[var(--color-charcoal)] px-2 py-1.5 text-[11px] text-white shadow-lg">
            {notice}
          </p>
        ) : null}
      </div>
    );
  }
  const count = kind === "theme" ? albumItems.length : coverItems.length;
  return (
    <div className={PANEL_STACK} data-design-panel data-design-mode={mode} data-design-kind-active={kind}>
      <SegTabs ariaLabel="디자인 종류" dataAttr="data-design-kind" items={KIND_TAB_ITEMS} value={kind} onChange={(id) => onKindChange(id === "cover" ? "cover" : "theme")} />
      <SegTabs ariaLabel="디자인 행사" dataAttr="data-design-theme" items={THEME_TAB_ITEMS} value={theme} onChange={onThemeFilterChange} />
      <select
        data-design-style-select
        aria-label="디자인 스타일"
        value={style}
        onChange={(e) => onStyleFilterChange(e.target.value)}
        className="box-border h-8 [@media(pointer:coarse)]:h-11 w-full min-w-0 border border-[var(--color-hairline)] bg-white px-2 text-xs text-[var(--color-charcoal)]"
      >
        <option value="all">스타일: 전체</option>
        {styles.map((x) => (
          <option key={x.id} value={x.id}>
            스타일: {x.name}
          </option>
        ))}
      </select>
      <div className="flex items-baseline justify-end px-0.5 text-[11px] text-[var(--color-charcoal)]/60">
        <span data-design-count>{count}종</span>
      </div>
      {kind === "theme" ? (
        <section data-album-theme-section role="tabpanel" aria-label="앨범 테마" className={PANEL_STACK}>
          {albumItems.length > 0 ? (
            <div data-album-theme-grid className={gridCls}>
              {albumItems.map((a) => (
                <DesignCard
                  key={a.id}
                  name={a.name}
                  chips={a.chips}
                  scene={a.scene}
                  sceneKey={a.sceneKey}
                  selected={a.selected}
                  onClick={() => {
                    if (!a.selected) album.onApply(a.id);
                  }}
                  attrs={{ "data-album-theme-id": a.id, "data-album-theme-design": a.designId, "data-album-theme-cover": a.coverId }}
                  eye={eyeButton(a)}
                />
              ))}
            </div>
          ) : (
            emptyMsg("앨범 테마")
          )}
        </section>
      ) : (
        <section data-cover-design-section role="tabpanel" aria-label="표지 디자인" className={PANEL_STACK}>
          {coverItems.length > 0 ? (
            <div data-design-list className={gridCls}>
              {coverItems.map((c) => (
                <DesignCard
                  key={c.id}
                  name={c.name}
                  chips={c.chips}
                  scene={c.scene}
                  sceneKey={c.sceneKey}
                  selected={c.selected}
                  onClick={() => {
                    if (!c.selected) cover.onApply(c.id);
                  }}
                  attrs={{ "data-design-id": c.id, "data-design-style": c.style, "data-design-themes": c.themes.join(",") }}
                />
              ))}
            </div>
          ) : (
            emptyMsg("표지 디자인")
          )}
        </section>
      )}
      {previewItem && preview && typeof document !== "undefined" ? (
        <PreviewPortal item={previewItem} state={preview} handlers={tp.popoverHandlers} />
      ) : null}
      {single && kind === "theme" ? (
        <section data-single-spread-section className={`${PANEL_STACK} border-t border-[var(--color-hairline)] pt-1.5`}>
          <button
            type="button"
            data-single-spread-toggle
            aria-expanded={singleOpen}
            onClick={() => setSingleOpen((v) => !v)}
            className="flex h-8 [@media(pointer:coarse)]:h-11 w-full items-center justify-between px-0.5 text-left text-[11px] font-medium text-[var(--color-charcoal)]/70 transition hover:text-[var(--color-charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-charcoal)]"
          >
            <span>이 펼침면만 바꾸기</span>
            <span className="flex items-center gap-1 font-normal text-[var(--color-charcoal)]/50">
              {singleList.length}종
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform ${singleOpen ? "rotate-180" : ""}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </button>
          {singleOpen ? (
            <>
              <SegTabs ariaLabel="디자인 적용 대상" dataAttr="data-design-target" items={single.targets} value={single.target} onChange={single.onTargetChange} />
              <div data-single-spread-list className={gridCls}>
                {singleList.length > 0
                  ? singleList.map((it) => (
                      <DesignCard
                        key={it.id}
                        name={it.name}
                        trailing={`사진 ${it.photoCount}장`}
                        scene={it.scene}
                        sceneKey={single.sceneKeyOf(it.id)}
                        selected={single.isSelected(it.id)}
                        onClick={() => single.onApply(it.id)}
                        attrs={{ "data-single-design-id": it.id, "data-design-style": it.style, "data-design-themes": it.themes.join(",") }}
                        title={`${it.name} · ${it.note}`}
                      />
                    ))
                  : emptyMsg("디자인")}
              </div>
            </>
          ) : null}
        </section>
      ) : null}
      {notice ? (
        <p
          data-design-notice
          role="status"
          aria-live="polite"
          className="pointer-events-none sticky bottom-1 z-10 bg-[var(--color-charcoal)] px-2 py-1.5 text-[11px] text-white shadow-lg"
        >
          {notice}
        </p>
      ) : null}
    </div>
  );
}
