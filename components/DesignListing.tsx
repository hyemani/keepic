"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  photobookDesigns,
  designCategoryOrder,
  designCategoryLabels,
  type PhotobookDesignCategory,
} from "@/lib/photobookDesigns";
import {
  photobookBasePrice,
  photobookSizes,
  BASE_PAGES,
  BASE_SHEETS,
} from "@/lib/photobookPricing";

type FilterValue = "all" | PhotobookDesignCategory;

// 어떤 표지 디자인을 고르든 가격은 옵션(사이즈·커버 재질 등)에서 정해지고,
// 표지 디자인 자체로는 가격 차이가 없어서 모든 카드가 같은 "시작 가격"을 보여줘요.
const startPrice = photobookBasePrice.soft.S;
const startSize = photobookSizes[0];
const specText = `${startSize.finishedSizeCm} · 기본 ${BASE_PAGES}페이지(${BASE_SHEETS}장)`;

export default function DesignListing() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const set = new Set(photobookDesigns.map((d) => d.category));
    return designCategoryOrder.filter((c) => set.has(c));
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all"
        ? photobookDesigns
        : photobookDesigns.filter((d) => d.category === filter),
    [filter]
  );

  const activeDesign = photobookDesigns.find((d) => d.id === activeId) ?? null;

  const renderTabButton = (value: FilterValue, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
        filter === value
          ? "bg-[var(--color-sky)] text-white"
          : "border border-[var(--color-hairline)] text-[var(--color-charcoal)]/70 hover:border-[var(--color-sky)] hover:text-[var(--color-sky)]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="sm:grid sm:grid-cols-[160px_1fr] sm:gap-10">
      {/* 모바일: 상단 가로 스크롤 분류 탭 / PC: 왼쪽 세로 분류 메뉴 */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mb-0 sm:flex-col sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {renderTabButton("all", "전체")}
        {availableCategories.map((c) => renderTabButton(c, designCategoryLabels[c]))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {filtered.map((design) => (
          <button key={design.id} type="button" onClick={() => setActiveId(design.id)} className="text-left">
            <div className="overflow-hidden rounded-xl bg-[var(--color-hairline)]/15">
              <img
                src={design.image}
                alt={design.alt}
                className="aspect-square w-full object-cover transition hover:opacity-90"
              />
            </div>
            <p className="mt-3 font-medium">{design.name}</p>
            <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
              {startPrice.toLocaleString()}원부터
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/45">{specText}</p>
          </button>
        ))}
      </div>

      {activeDesign && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setActiveId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeDesign.name} 디자인 상세`}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={activeDesign.image}
                alt={activeDesign.alt}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setActiveId(null)}
                aria-label="닫기"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--color-charcoal)] shadow-[0_4px_14px_-4px_rgba(45,55,72,0.35)]"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <p className="text-sm font-medium text-[var(--color-sky)]">
                {designCategoryLabels[activeDesign.category]}
              </p>
              <h3 className="mt-1 text-xl font-semibold">{activeDesign.name}</h3>
              <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
                {startPrice.toLocaleString()}원부터 · {specText}
              </p>
              <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/45">
                실제 표지에는 고객님 사진이 들어가요. 세부 배치와 옵션은 다음 단계에서 골라주세요.
              </p>
              <Link
                href={`/options?product=포토북&design=${activeDesign.id}`}
                className="mt-6 block rounded-full bg-[var(--color-sky)] py-3.5 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                추억을 한 권에 담기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
