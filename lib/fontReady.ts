// 글자를 재거나(줄바꿈·판 크기) 캔버스에 그리기 전에, 쓰는 서체(굵기·기울임·실제 글자 조각 포함)가 브라우저에 다 불러와졌는지 확인하고 기다려요(53차).
//
// 웹 폰트(Google Fonts 등)는 화면에 쓰인 만큼만 늦게 불러오고, 한글 서체는 글자 범위(unicode-range)별로 쪼개져 있어서 "그 글자가 실제로 쓰일 때" 비로소 받아요.
// 안 받은 채로 canvas에서 재면 기본 서체 폭으로 재서 줄 수·판 크기가 달라지고(미리보기와 인쇄 줄 수가 어긋나던 원인 후보), 그대로 그리면 PDF에 엉뚱한 서체가 박혀요.
// document.fonts.load(굵기·크기·서체, 글자)는 그 서체의 그 글자 조각까지 받아 주고, 실패·지연되면 timeout 후 그대로 진행해요(영원히 기다리지 않아요).

export type FontNeed = { fontFamily?: string; text?: string; bold?: boolean; italic?: boolean };

export function fontShorthand(it: FontNeed): string {
  return `${it.italic ? "italic " : ""}${it.bold ? "700" : "400"} 20px ${it.fontFamily}`;
}

/** 이미 다 불러와졌는지(동기). 브라우저가 모르는 서체(시스템 서체)는 true예요. */
export function fontsAlreadyLoaded(items: FontNeed[]): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;
  for (const it of items) {
    if (!it.fontFamily || !it.text || !it.text.trim()) continue;
    try {
      if (!document.fonts.check(fontShorthand(it), it.text)) return false;
    } catch {
      /* 잘못된 서체 이름 등은 기다릴 필요 없어요 */
    }
  }
  return true;
}

export type FontReadyResult = { ok: boolean; pending: string[]; ms: number };

/** 서체를 다 불러올 때까지(최대 timeoutMs) 기다려요. ok=false면 시간 안에 못 불러온 서체가 있다는 뜻이에요(그래도 호출한 쪽은 진행해요). */
export async function ensureFontsReady(items: FontNeed[], opts: { timeoutMs?: number } = {}): Promise<FontReadyResult> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  if (typeof document === "undefined" || !document.fonts) return { ok: true, pending: [], ms: 0 };
  const seen = new Set<string>();
  const jobs: Promise<unknown>[] = [];
  const needs: FontNeed[] = [];
  for (const it of items) {
    if (!it.fontFamily || !it.text || !it.text.trim()) continue;
    const key = `${fontShorthand(it)}|${it.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    needs.push(it);
    jobs.push(document.fonts.load(fontShorthand(it), it.text).catch(() => null));
  }
  if (!jobs.length) return { ok: true, pending: [], ms: 0 };
  const timeoutMs = opts.timeoutMs ?? 8000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(jobs).then(() => document.fonts.ready),
    new Promise<void>((res) => {
      timer = setTimeout(res, timeoutMs);
    }),
  ]);
  if (timer) clearTimeout(timer);
  const pending: string[] = [];
  for (const it of needs) {
    try {
      if (!document.fonts.check(fontShorthand(it), it.text as string)) pending.push(String(it.fontFamily));
    } catch {
      /* ignore */
    }
  }
  return { ok: pending.length === 0, pending, ms: Math.round(now() - t0) };
}
