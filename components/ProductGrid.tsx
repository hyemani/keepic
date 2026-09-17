"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import Reveal from "./Reveal";

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
  // 이미지 위 오른쪽 아래에 작게 붙는 뱃지(예: "NEW", "Soft cover")
  badge?: string;
  // 뱃지 배경색을 기본 검정 대신 다르게 쓰고 싶을 때(예: 메인 컬러 그라데이션)
  badgeClassName?: string;
  // 상품명 옆에 붙는 짧은 태그
  tag?: string;
};

// 카테고리별 "더보기" 이동 경로 — 헤더 메뉴와 같은 목적지예요.
const CATEGORY_HREF: Record<ProductGridCategory, string> = {
  "포토북": "/photobook",
  "액자": "/frames",
  "나만의 굿즈": "/goods",
};

const CATEGORY_ORDER: ProductGridCategory[] = ["포토북", "액자", "나만의 굿즈"];

function ProductCard({ item }: { item: ProductGridItem }) {
  return (
    <Link
      href={item.href}
      data-card
      className="block w-full snap-start overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-white transition hover:-translate-y-0.5 hover:border-[var(--color-sky)] hover:shadow-[0_10px_24px_-12px_rgba(45,55,72,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
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
          <span
            className={`absolute bottom-0 right-0 px-2 py-1 text-[10px] font-medium text-white ${
              item.badgeClassName ?? "bg-black/70"
            }`}
          >
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
  );
}

// 헤더 메뉴(포토북/액자/나만의 굿즈)와 겹쳐 보이지 않도록, 탭으로 필터링하는
// 대신 카테고리별로 섹션을 나눠서 보여줘요. 각 섹션 제목 옆의 "더보기"가
// 헤더 메뉴와 같은 페이지로 연결돼요.
export default function ProductGrid({
  items,
  banner,
}: {
  items: ProductGridItem[];
  // 맨 위에 끼워 넣을 작은 프로모션 배너
  banner?: ReactNode;
}) {
  return (
    <div>
      {banner && <div className="mb-10">{banner}</div>}

      <div className="flex flex-col gap-12">
        {CATEGORY_ORDER.map((category) => {
          const categoryItems = items.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category}>
              <div className="flex items-end justify-between">
                <p className="text-lg font-semibold">{category}</p>
                <Link
                  href={CATEGORY_HREF[category]}
                  className="text-sm text-[var(--color-charcoal)]/60 transition hover:text-[var(--color-sky)]"
                >
                  더보기 →
                </Link>
              </div>

              <div className="mt-4 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categoryItems.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 4) * 60} className="w-[calc((100%-1rem)/2)] shrink-0 sm:w-[calc((100%-3rem)/4)]">
                    <ProductCard item={item} />
                  </Reveal>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
