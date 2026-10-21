import { useEffect, useRef } from "react";

// 61차: 폰을 가로로 눕히고 글을 칠 때("글쓰기 모드" — 가상 키보드가 올라와 화면이 120~190px밖에 안 남을 때) 캔버스를 쓰는 도구예요.
//  · 글 칸(왼쪽 패널의 "내용" 칸, 또는 캔버스 위 글자 직접 입력)에 포커스가 있으면, 남은 캔버스 자리에 그 글상자가 크게 보이게 확대하고 가운데로 옮겨요.
//  · 키보드가 내려가면 확대 배율(null=맞춤 포함)과 스크롤 위치를 들어가기 전 그대로 되돌려요(저장된 앨범·글상자 데이터는 전혀 안 건드려요 — 화면 배율일 뿐이에요).
//  · "내용" 칸이 패널 맨 위에 오도록 패널 안쪽을 스크롤해요(키보드를 프로그램으로 열지는 않아요 — iOS가 막아요).

type SavedView = { manual: number | null; vps: { el: HTMLElement; sl: number; st: number }[] };

function visibleViewports(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-canvas-viewport]")).filter((e) => e.getBoundingClientRect().width > 0 && e.offsetParent !== null);
}

/** 지금 포커스가 있는 글 칸에 해당하는 캔버스 위 글상자 요소 */
export function findFocusedTextBox(): HTMLElement | null {
  const a = document.activeElement as HTMLElement | null;
  if (!a) return null;
  const sel = "[data-text-box-id],[data-cover-title],[data-spine-title]";
  if (a.isContentEditable) return a.closest<HTMLElement>(sel);
  const id = a.getAttribute("data-text-content-field");
  if (id !== null) {
    const byId = id ? document.querySelector<HTMLElement>(`[data-text-box-id="${id.replace(/"/g, '\\"')}"]`) : null;
    return byId ?? document.querySelector<HTMLElement>("[data-cover-title]") ?? document.querySelector<HTMLElement>("[data-spine-title]");
  }
  return null;
}

export function useKeyboardWriting({
  active,
  zoom,
  getManualPct,
  getActualPct,
  setManualPct,
  zoomMin,
  zoomMax,
}: {
  active: boolean;
  /** true면(폰 가로) 글상자로 캔버스를 확대하고 끝나면 되돌려요. false(폰 세로 시트)는 패널 안 스크롤만 해요. */
  zoom: boolean;
  getManualPct: () => number | null;
  getActualPct: () => number;
  setManualPct: (pct: number | null) => void;
  zoomMin: number;
  zoomMax: number;
}) {
  const api = useRef({ getManualPct, getActualPct, setManualPct, zoomMin, zoomMax });
  useEffect(() => {
    api.current = { getManualPct, getActualPct, setManualPct, zoomMin, zoomMax };
  });

  useEffect(() => {
    if (!active) return;
    const saved: SavedView = { manual: api.current.getManualPct(), vps: visibleViewports().map((el) => ({ el, sl: el.scrollLeft, st: el.scrollTop })) };
    let timers: ReturnType<typeof setTimeout>[] = [];
    let disposed = false;

    const alignPanel = () => {
      const ta = document.activeElement as HTMLElement | null;
      if (!ta || ta.getAttribute("data-text-content-field") === null) return;
      const panel = ta.closest<HTMLElement>("[data-side-panel]");
      if (!panel) return;
      const head = panel.querySelector<HTMLElement>("[data-kb-head]");
      const headH = head && head.offsetParent !== null ? head.getBoundingClientRect().height : 0;
      const delta = ta.getBoundingClientRect().top - (panel.getBoundingClientRect().top + headH + 2);
      if (Math.abs(delta) > 1) panel.scrollTop += delta;
    };

    const zoomToBox = () => {
      if (disposed || !zoom) return;
      const boxEl = findFocusedTextBox();
      if (!boxEl) return;
      const vps = visibleViewports();
      if (vps.length === 0) return;
      const vp = vps.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0];
      const vr = vp.getBoundingClientRect();
      const br = boxEl.getBoundingClientRect();
      if (br.width < 1 || br.height < 1 || vr.width < 40 || vr.height < 40) return;
      const pad = 8;
      const s = Math.min((vr.width - pad * 2) / br.width, (vr.height - pad * 2) / br.height);
      const { zoomMin: lo, zoomMax: hi } = api.current;
      const cur = api.current.getActualPct();
      const target = Math.min(hi, Math.max(lo, Math.round(cur * s * 10) / 10));
      if (Math.abs(target - cur) / Math.max(cur, 1) > 0.03 || api.current.getManualPct() === null) {
        api.current.setManualPct(target);
        return; // 배율이 적용된 다음 번 측정에서 가운데로 옮겨요
      }
      // 가운데로(박스가 뷰포트보다 크면 윗부분이 보이게)
      const cx = br.left + br.width / 2 - (vr.left + vr.width / 2);
      const cy = br.height + pad * 2 > vr.height ? br.top - (vr.top + pad) : br.top + br.height / 2 - (vr.top + vr.height / 2);
      if (Math.abs(cx) > 1) vp.scrollLeft += cx;
      if (Math.abs(cy) > 1) vp.scrollTop += cy;
    };

    const pass = () => {
      timers.forEach(clearTimeout);
      timers = [0, 90, 260, 600, 1100].map((ms) =>
        setTimeout(() => {
          if (disposed) return;
          alignPanel();
          zoomToBox();
        }, ms)
      );
    };
    pass();
    const onFocusIn = () => pass();
    document.addEventListener("focusin", onFocusIn);
    return () => {
      disposed = true;
      document.removeEventListener("focusin", onFocusIn);
      timers.forEach(clearTimeout);
      if (!zoom) return;
      // 키보드가 내려갔으니 들어가기 전 배율·스크롤로 정확히 되돌려요.
      api.current.setManualPct(saved.manual);
      const restore = () => {
        for (const v of saved.vps) {
          if (!v.el.isConnected) continue;
          v.el.scrollLeft = v.sl;
          v.el.scrollTop = v.st;
        }
      };
      [0, 80, 200, 450, 900].forEach((ms) => setTimeout(restore, ms));
    };
  }, [active, zoom]);
}
