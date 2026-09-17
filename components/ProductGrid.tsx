"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export type ProductGridCategory = "포토북" | "액자" | "나만의 굿즈";

export type ProductGridItem = {
  id: string;
  category: ProductGridCategory;
  name: string;
  desc: string;
  image: string | null;
  // 시작가가 없는 상품(아직 가격 데이터가 없는 일반 액자 등)은 undefined로 두고,
  // 가격 대신 안내 문구(priceNote)를 보여줘요. 임의의 숫자를 넣지 않기 위해서예요.
  priceFrom?: number;
  priceNote?: string;
  href: string;
  // 이미지 위 오른쪽 아래에 작게 붙는 뱃지(예: "NEW")
  badge?: string;
  // 상품명 옆에 붙는 짧은 태그(예: 포토북 커버 종류 "S"/"H")
  tag?: string;
};

const TABS: { label: string; value: ProductGridCategory }[] = [
  { label: "포토북", value: "포토북" },
  { label: "액자", value: "액자" },
  { label: "나만의 굿즈", value: "나만의 굿즈" },
];

export default function ProductGrid({
  items,
  banner,
}: {
  items: ProductGridItem[];
  // 탭과 상품 목록 사이에 끼워 넣을 작은 프로모션 배너
  banner?: ReactNode;
}) {
  const [filter, setFilter] = useState<ProductGridCategory>("포토북");
  const filtered = items.filter((item) => item.category === filter);

  return (
    <div>
      {/* 카테고리 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            aria-current={filter === tab.value}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === tab.value
                ? "border-transparent bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] text-white"
                : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70 hover:border-[var(--color-sky)] hover:text-[var(--color-sky)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {banner && <div className="mt-4">{banner}</div>}

      {/* 지금 보고 있는 카테고리 이름 */}
      <p className="mt-6 text-base font-semibold">{filter}</p>

      {/* 상품 카드 그리드 */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="block overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white transition hover:border-[var(--color-sky)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
          >
            <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-hairline)]/15">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-charcoal)]/40">
                  이미지 준비 중
                </div>
              )}
              {item.badge && (
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                  {item.badge}
                </span>
              )}
            </div>
            <div className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {item.name}
                {item.tag && (
                  <span className="rounded bg-[var(--color-charcoal)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-charcoal)]/70">
                    {item.tag}
                  </span>
                )}
              </p>
              <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
                {item.desc}
              </p>
              {item.priceFrom !== undefined ? (
                <p className="mt-2 text-base font-bold">
                  {item.priceFrom.toLocaleString()}원~
                </p>
              ) : (
                item.priceNote && (
                  <p className="mt-2 text-xs font-medium text-[var(--color-charcoal)]/55">
                    {item.priceNote}
                  </p>
                )
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
