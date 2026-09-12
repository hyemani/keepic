"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  CartItem,
  getCart,
  updateCartQuantity,
  removeFromCart,
  subscribeToCart,
} from "@/lib/cart";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(getCart());
    setHydrated(true);
    return subscribeToCart(() => setItems(getCart()));
  }, []);

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <main className="min-h-screen bg-white text-[var(--color-charcoal)]">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
        <h1 className="mt-2 text-3xl font-semibold">장바구니</h1>

        {!hydrated ? null : items.length === 0 ? (
          <div className="mt-12 border border-dashed border-[var(--color-hairline)] bg-white px-8 py-16 text-center">
            <p className="text-[var(--color-charcoal)]/70">담긴 상품이 없어요.</p>
            <Link
              href="/goods"
              className="mt-4 inline-block text-sm font-medium text-[var(--color-sky)]"
            >
              나만의 굿즈 보러가기 →
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10 divide-y divide-[var(--color-hairline)] border-y border-[var(--color-hairline)]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/60">
                      {item.sizeLabel}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
                      {item.unitPrice.toLocaleString()}원
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 rounded-full border border-[var(--color-hairline)] text-base"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 rounded-full border border-[var(--color-hairline)] text-base"
                      >
                        +
                      </button>
                    </div>

                    <p className="w-24 text-right font-medium">
                      {(item.unitPrice * item.quantity).toLocaleString()}원
                    </p>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-[var(--color-charcoal)]/50 underline"
                    >
                      삭제
                    </button>

                    <Link
                      href={`/upload?product=${encodeURIComponent(
                        item.productName
                      )}&size=${encodeURIComponent(item.sizeId)}&quantity=${item.quantity}`}
                      className="inline-block bg-[var(--color-sky)] px-6 py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
                    >
                      사진 올리고 주문하기
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--color-hairline)] pt-6">
              <span className="text-sm font-medium text-[var(--color-charcoal)]/70">
                전체 합계
              </span>
              <span className="text-2xl font-semibold">{total.toLocaleString()}원</span>
            </div>
            <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
              상품마다 담을 사진이 다르기 때문에, 상품별로 &quot;사진 올리고
              주문하기&quot;를 눌러 하나씩 제작 신청을 완료해주세요. 배송비는 별도예요.
            </p>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
