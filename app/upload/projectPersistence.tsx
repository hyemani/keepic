"use client";

// 편집기 "작업 저장·불러오기" — 자동 저장(편집이 2초 멈추면), 저장 버튼/Ctrl·Cmd+S, 다시 열기(복원)를
// 한 곳에 모은 훅과 상단바 UI예요. page.tsx가 너무 커져서 별도 파일로 뺐어요.
//
// 저장 위치는 이 브라우저의 IndexedDB예요(lib/projectStore.ts 설명 참고).
// 순서 보장: 저장은 한 줄(큐)로만 실행하고, 각 저장은 "그 시작 시점의 최신 편집 내용"을 읽어요.
// 그래서 예전 내용이 나중에 끝나서 새 내용을 덮어쓰는 일이 없어요.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PROJECT_SCHEMA_VERSION,
  newProjectId,
  projectStore,
} from "@/lib/projectStore";
import { makeThumbnail, packDoc, prefetchBlobUrls, unpackDoc } from "@/lib/projectDoc";

export { PROJECT_SCHEMA_VERSION };

export type PersistedDoc = {
  schemaVersion: number;
  snapshot: Record<string, unknown>; // 실행취소용 스냅샷과 같은 항목(문서를 이루는 모든 상태)
  photos: unknown[]; // 사진 라이브러리(교체돼서 남은 예전 사진 포함)
  introPublishDate?: string;
  introMakerName?: string;
  requestNote?: string;
};

export type SavePhase = "idle" | "dirty" | "saving" | "saved" | "error";
export type LoadPhase = "idle" | "loading" | "ready" | "missing" | "error";

type Options = {
  enabled: boolean;
  productName: string;
  searchParams: { get(name: string): string | null };
  getChangeKey: () => string;
  getDoc: () => PersistedDoc;
  getAutoName: () => string;
  getThumbnailUrl: () => string | undefined;
  applyDoc: (doc: PersistedDoc) => void;
};

export const AUTOSAVE_DELAY_MS = 2000;

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function useProjectPersistence(opts: Options) {
  const optsRef = useRef(opts);
  // ?project= 가 있으면 처음부터 "불러오는 중"으로 시작해서, 빈 편집기가 잠깐 비쳐 보이지 않게 해요.
  const [loadPhase, setLoadPhase] = useState<LoadPhase>(() =>
    !opts.enabled ? "idle" : opts.searchParams.get("project") ? "loading" : "ready"
  );
  const [loadMessage, setLoadMessage] = useState("");
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const projectIdRef = useRef<string | null>(null);
  const loadPhaseRef = useRef<LoadPhase>(
    !opts.enabled ? "idle" : opts.searchParams.get("project") ? "loading" : "ready"
  );
  const savedKeyRef = useRef<string | null>(null);
  const baselineReadyRef = useRef(false);
  const lastSeenKeyRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const savingCountRef = useRef(0);
  const lastThumbIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  // 항상 가장 최근 렌더의 값을 쓰도록 맨 처음에 갱신해요(아래 효과들보다 먼저 선언).
  useEffect(() => {
    optsRef.current = opts;
  });

  const setLoad = (p: LoadPhase) => {
    loadPhaseRef.current = p;
    setLoadPhase(p);
  };

  // ---- 저장 한 번 ----
  const doSave = useCallback(async (force: boolean): Promise<boolean> => {
    const o = optsRef.current;
    const id = projectIdRef.current;
    if (!o.enabled || !id || loadPhaseRef.current !== "ready") return false;
    // 큐에서 내 차례가 됐을 때의 "가장 최신" 내용을 읽어요.
    const key = o.getChangeKey();
    if (!force && key === savedKeyRef.current) return true;
    savingCountRef.current += 1;
    if (mountedRef.current) {
      setPhase("saving");
      setErrorMessage("");
    }
    try {
      const doc = o.getDoc();
      const packed = await packDoc(doc);
      const thumbUrl = o.getThumbnailUrl();
      const thumbId = thumbUrl ? packed.urlToBlobId.get(thumbUrl) ?? thumbUrl : null;
      const thumb =
        thumbUrl && thumbId !== lastThumbIdRef.current ? await makeThumbnail(thumbUrl) : null;
      const search = new URLSearchParams(window.location.search);
      search.delete("project");
      const meta = await projectStore.save({
        id,
        autoName: o.getAutoName(),
        search: search.toString(),
        productName: o.productName,
        photoCount: Array.isArray(doc.photos) ? doc.photos.length : 0,
        docJson: packed.json,
        blobs: packed.blobs,
        thumb,
      });
      if (thumb || !thumbUrl) lastThumbIdRef.current = thumbId;
      if (packed.unresolved.length > 0) {
        console.warn("[Keepic] 원본을 찾지 못한 사진 주소가 있어요:", packed.unresolved.length);
      }
      savedKeyRef.current = key;
      if (mountedRef.current) {
        setSavedAt(meta.updatedAt);
        // 저장하는 동안 또 편집했다면 아직 "변경됨"이에요(자동 저장이 이어서 실행돼요).
        setPhase(optsRef.current.getChangeKey() === key ? "saved" : "dirty");
      }
      return true;
    } catch (e) {
      console.error("[Keepic] 저장 실패", e);
      if (mountedRef.current) {
        setErrorMessage(e instanceof Error ? e.message : String(e));
        setPhase("error");
      }
      return false;
    } finally {
      savingCountRef.current -= 1;
    }
  }, []);

  const runSave = useCallback(
    (force: boolean) => {
      const p = queueRef.current.then(() => doSave(force));
      queueRef.current = p.catch(() => undefined);
      return p;
    },
    [doSave]
  );

  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return runSave(true);
  }, [runSave]);

  // ---- 시작: 새 프로젝트 id 만들기 또는 저장된 작업 불러오기 ----
  useEffect(() => {
    if (!opts.enabled || startedRef.current) return;
    startedRef.current = true;
    const existing = opts.searchParams.get("project");
    if (!existing) {
      const id = newProjectId();
      projectIdRef.current = id;
      const url = new URL(window.location.href);
      url.searchParams.set("project", id);
      window.history.replaceState(window.history.state, "", url.toString());
      return;
    }
    projectIdRef.current = existing;
    let cancelled = false;
    (async () => {
      try {
        const found = await projectStore.load(existing);
        if (cancelled) return;
        if (!found) {
          setLoadMessage("이 브라우저에는 저장된 작업이 없어요. (다른 브라우저·기기에서 저장했거나, 삭제된 작업일 수 있어요)");
          setLoad("missing");
          return;
        }
        if (found.record.schemaVersion > PROJECT_SCHEMA_VERSION) {
          setLoadMessage("더 새로운 버전에서 저장된 작업이라 이 화면에서는 열 수 없어요.");
          setLoad("error");
          return;
        }
        // 주소에 상품 옵션이 빠져 있으면(예: project만 적힌 주소) 저장해 둔 옵션으로 다시 열어요.
        if (!opts.searchParams.get("product") && found.record.search) {
          window.location.replace(`/upload?project=${encodeURIComponent(existing)}&${found.record.search}`);
          return;
        }
        const { doc, missing } = unpackDoc(found.record.docJson, found.blobs);
        if (missing > 0) console.warn("[Keepic] 저장소에서 찾지 못한 사진:", missing);
        optsRef.current.applyDoc(doc as PersistedDoc);
        setSavedAt(found.record.updatedAt);
        setPhase("saved");
        setLoad("ready");
      } catch (e) {
        console.error("[Keepic] 작업 불러오기 실패", e);
        if (cancelled) return;
        setLoadMessage(e instanceof Error ? e.message : "작업을 불러오지 못했어요.");
        setLoad("error");
      }
    })();
    return () => {
      cancelled = true;
      startedRef.current = false; // StrictMode 재실행 때 다시 시작할 수 있게
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled]);

  const markClean = () => {
    if (savingCountRef.current === 0) setPhase((p) => (p === "dirty" ? "saved" : p));
  };
  const markDirty = () => {
    if (savingCountRef.current === 0) setPhase("dirty");
  };

  // ---- 변경 감지 → 2초 뒤 자동 저장 ----
  useEffect(() => {
    const o = optsRef.current;
    if (!o.enabled || loadPhaseRef.current !== "ready") return;
    const key = o.getChangeKey();
    if (!baselineReadyRef.current) {
      // 처음 "준비됨" 상태의 내용(불러온 작업이면 복원된 내용)을 기준으로 삼아요.
      baselineReadyRef.current = true;
      savedKeyRef.current = key;
      lastSeenKeyRef.current = key;
      return;
    }
    // 렌더마다 도는 효과라서, "새로 바뀐 내용"일 때만 반응해요(저장 실패 표시가 매 렌더 덮이지 않게).
    if (key === lastSeenKeyRef.current) return;
    lastSeenKeyRef.current = key;
    if (key === savedKeyRef.current) {
      // 바꿨다가 저장된 상태로 되돌린 경우(예: 실행취소) — 더 저장할 게 없어요.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        markClean();
      }
      return;
    }
    prefetchBlobUrls(key);
    markDirty();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSave(false);
    }, AUTOSAVE_DELAY_MS);
  });

  // ---- Ctrl/Cmd+S ----
  useEffect(() => {
    if (!opts.enabled) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts.enabled, saveNow]);

  // ---- 창을 닫거나 숨길 때 저장 못 한 내용이 있으면 마지막으로 시도(브라우저가 허락하는 범위에서) ----
  useEffect(() => {
    if (!opts.enabled) return;
    function flush() {
      const o = optsRef.current;
      if (loadPhaseRef.current !== "ready") return;
      if (o.getChangeKey() !== savedKeyRef.current) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        void runSave(false);
      }
    }
    function onVis() {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [opts.enabled, runSave]);

  // ---- 화면을 떠날 때(앱 안에서 다른 페이지로 이동) 남은 변경 저장 ----
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      const o = optsRef.current;
      if (o.enabled && loadPhaseRef.current === "ready" && o.getChangeKey() !== savedKeyRef.current) {
        void runSave(false);
      }
    };
  }, [runSave]);

  return { loadPhase, loadMessage, phase, savedAt, errorMessage, saveNow };
}

// ---- 상단바 UI: [상태 문구] [저장] ----
// 저장 상태 글자·색(상단바 본문과 44차 "더보기" 메뉴가 같이 써요).
export function saveStatusText(phase: SavePhase, savedAt: number | null): { text: string; tone: string } {
  let text = "";
  let tone = "text-[var(--color-charcoal)]/50";
  if (phase === "saving") text = "저장 중…";
  else if (phase === "saved") text = savedAt ? `저장 완료 · ${formatTime(savedAt)}` : "저장 완료";
  else if (phase === "error") {
    text = "저장 실패 · 다시 시도";
    tone = "text-red-600";
  } else if (phase === "dirty") text = "변경됨";
  return { text, tone };
}

export function SaveControls({
  phase,
  savedAt,
  errorMessage,
  onSave,
}: {
  phase: SavePhase;
  savedAt: number | null;
  errorMessage: string;
  onSave: () => void;
}) {
  const { text, tone } = saveStatusText(phase, savedAt);
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {text && (
        <button
          type="button"
          data-testid="save-status"
          aria-live="polite"
          disabled={phase !== "error"}
          onClick={onSave}
          title={phase === "error" ? `${errorMessage || "저장하지 못했어요."} 눌러서 다시 시도해요.` : undefined}
          className={`whitespace-nowrap text-xs max-lg:tabular-nums [@media(pointer:coarse)]:tabular-nums max-md:pointer-events-none max-lg:flex max-lg:h-11 max-lg:items-center [@media(pointer:coarse)]:flex [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:items-center ${tone} ${phase === "error" ? "underline" : "cursor-default"}`}
        >
          <span className="max-md:sr-only phl:sr-only">{text}</span>
          <span aria-hidden="true" className={`hidden h-2.5 w-2.5 rounded-full max-md:block phl:block ${phase === "error" ? "bg-red-600" : phase === "saving" ? "bg-[var(--color-charcoal)]/40" : phase === "dirty" ? "bg-amber-500" : "bg-emerald-600"}`} />
        </button>
      )}
      <button
        type="button"
        data-testid="save-button"
        onClick={onSave}
        disabled={phase === "saving"}
        title="저장 (Ctrl+S / ⌘S)"
        className="flex h-8 min-w-[52px] shrink-0 items-center justify-center border border-[var(--color-charcoal)] bg-white px-2.5 text-xs font-medium text-[var(--color-charcoal)] transition hover:bg-[var(--color-ivory)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)] disabled:cursor-not-allowed disabled:opacity-60 max-lg:h-11 [@media(pointer:coarse)]:h-11 motion-reduce:transition-none"
      >
        저장
      </button>
    </div>
  );
}

// ---- 불러오는 중 / 못 찾음 / 오류 안내(편집 화면 위에 덮어요) ----
export function LoadOverlay({
  phase,
  message,
  startNewHref,
}: {
  phase: LoadPhase;
  message: string;
  startNewHref: string;
}) {
  if (phase !== "loading" && phase !== "missing" && phase !== "error") return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ivory)] p-4">
      <div className="max-w-sm text-center text-sm text-[var(--color-charcoal)]">
        {phase === "loading" ? (
          <p>작업을 불러오는 중이에요…</p>
        ) : (
          <>
            <p className="break-keep">{message}</p>
            <div className="mt-4 flex justify-center gap-2">
              <a href="/my-works" className="border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs">
                내 작업 보기
              </a>
              <a href={startNewHref} className="bg-[var(--color-charcoal)] px-3 py-2 text-xs text-white">
                새 작업으로 시작
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
