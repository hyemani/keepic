"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { projectStore, type ProjectMeta } from "@/lib/projectStore";

type Item = ProjectMeta & { thumb: Blob | null; thumbUrl: string | null };

function formatDateTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MyWorksPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const reload = useCallback(async () => {
    try {
      const list = await projectStore.list();
      setItems((prev) => {
        prev?.forEach((i) => i.thumbUrl && URL.revokeObjectURL(i.thumbUrl));
        return list.map((m) => ({ ...m, thumbUrl: m.thumb ? URL.createObjectURL(m.thumb) : null }));
      });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "작업 목록을 불러오지 못했어요.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- IndexedDB(브라우저 저장소)는 마운트 뒤에만 읽을 수 있어요
    void reload();
  }, [reload]);

  async function handleDelete(item: Item) {
    if (!window.confirm(`"${item.name}" 작업을 삭제할까요?\n이 브라우저에 저장된 작업과 사진이 지워지고 되돌릴 수 없어요.`)) return;
    try {
      await projectStore.remove(item.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했어요.");
    }
  }

  async function commitRename(item: Item) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === item.name) return;
    try {
      await projectStore.rename(item.id, name);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "이름을 바꾸지 못했어요.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">내 작업</h1>
        <p className="mt-3 break-keep text-sm text-[var(--color-charcoal)]/70">
          편집기에서 저장한 작업이에요. 지금은 이 컴퓨터의 이 브라우저에만 저장돼요(다른 기기·브라우저에서는
          보이지 않고, 브라우저의 사이트 데이터를 지우면 함께 지워져요).
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {items === null ? (
          <p className="mt-10 text-sm text-[var(--color-charcoal)]/60">불러오는 중…</p>
        ) : items.length === 0 ? (
          <div className="mt-10 border border-dashed border-[var(--color-hairline)] bg-white/60 p-8 text-center text-sm">
            <p>저장된 작업이 아직 없어요.</p>
            <Link href="/order" className="mt-4 inline-block bg-[var(--color-charcoal)] px-4 py-2 text-xs text-white">
              만들기 시작
            </Link>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="works-list">
            {items.map((item) => {
              const href = `/upload?project=${encodeURIComponent(item.id)}${item.search ? `&${item.search}` : ""}`;
              return (
                <li key={item.id} data-testid="work-item" className="flex flex-col border border-[var(--color-hairline)] bg-white">
                  <Link href={href} className="block aspect-[4/3] w-full overflow-hidden bg-[var(--color-ivory)]">
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt={`${item.name} 표지`} className="h-full w-full object-contain" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs text-[var(--color-charcoal)]/40">
                        미리보기 없음
                      </span>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    {renamingId === item.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => void commitRename(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRename(item);
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="border border-[var(--color-hairline)] px-2 py-1 text-sm"
                        aria-label="작업 이름"
                      />
                    ) : (
                      <p className="truncate text-sm font-medium" data-testid="work-name">
                        {item.name}
                      </p>
                    )}
                    <p className="text-xs text-[var(--color-charcoal)]/60">
                      {item.productName} · 사진 {item.photoCount}장
                    </p>
                    <p className="text-xs text-[var(--color-charcoal)]/60" data-testid="work-time">
                      마지막 저장 {formatDateTime(item.updatedAt)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Link href={href} className="bg-[var(--color-charcoal)] px-3 py-1.5 text-xs text-white">
                        열기
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(item.id);
                          setRenameValue(item.name);
                        }}
                        className="border border-[var(--color-hairline)] px-3 py-1.5 text-xs"
                      >
                        이름 바꾸기
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="border border-[var(--color-hairline)] px-3 py-1.5 text-xs text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
