"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  CartItem,
  getCart,
  updateCartQuantity,
  updateCartItemPhotos,
  removeFromCart,
  subscribeToCart,
} from "@/lib/cart";
import { productConfig, ProductName } from "@/lib/productConfig";
import { GoodsPhoto, calcRequiredMinPx } from "@/lib/photoUtils";
import { uploadGoodsPhotoToStorage, saveCartItemsAndGoToCheckout } from "@/lib/orderDraft";
import { calcShippingFee } from "@/lib/shippingConfig";
import { DIASEC_SHIPPING_NOTICE, isDiasecDeskSizeId, isDiasecWallSizeId } from "@/lib/diasecFrameModels";
import PhotoPickerField from "@/components/PhotoPickerField";

function getItemConfig(item: CartItem) {
  const config = productConfig[item.productName as ProductName] as
    | (typeof productConfig)[ProductName]
    | undefined;
  const sizeInfo = config?.sizes.find((s) => s.id === item.sizeId);
  return {
    minPhotos: config?.minPhotos ?? 1,
    maxPhotos: config?.maxPhotos ?? 1,
    aspect: sizeInfo?.aspect ?? "aspect-square",
    requiredMinPx: calcRequiredMinPx(item.sizeDetail),
  };
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isGoing, setIsGoing] = useState(false);

  useEffect(() => {
    function syncFromStorage(prevSelected?: Set<string>) {
      const cartItems = getCart();
      setItems(cartItems);
      setSelectedIds((prev) => {
        const base = prevSelected ?? prev;
        const cartIds = new Set(cartItems.map((i) => i.id));
        const next = new Set<string>();
        base.forEach((id) => {
          if (cartIds.has(id)) next.add(id);
        });
        cartItems.forEach((item) => {
          // 사진이 없는 항목은 주문할 수 없으니 기본으로 선택하지 않아요.
          if (!base.has(item.id) && item.photos.length > 0) next.add(item.id);
        });
        return next;
      });
    }

    syncFromStorage(new Set());
    setHydrated(true);
    return subscribeToCart(() => syncFromStorage());
  }, []);

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const goodsAmount = selectedItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const shippingCalc = calcShippingFee(
    selectedItems.map((item) => ({
      productName: item.productName,
      sizeId: item.sizeId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }))
  );
  const shippingFee = shippingCalc.totalFee;
  const hasDiasecItem = selectedItems.some(
    (item) => isDiasecDeskSizeId(item.sizeId) || isDiasecWallSizeId(item.sizeId)
  );
  const finalTotal = goodsAmount + shippingFee;
  const supplyAmount = Math.round(finalTotal / 1.1);
  const vatAmount = finalTotal - supplyAmount;

  const allSelectableIds = items.filter((i) => i.photos.length > 0).map((i) => i.id);
  const isAllSelected =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.has(id));

  function toggleSelectAll() {
    setSelectedIds(isAllSelected ? new Set() : new Set(allSelectableIds));
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleItemPhotosChange(itemId: string, newPhotos: GoodsPhoto[]) {
    try {
      const resolved = await Promise.all(
        newPhotos.map(async (p) =>
          p.url.startsWith("blob:") ? { ...p, url: await uploadGoodsPhotoToStorage(p) } : p
        )
      );
      updateCartItemPhotos(itemId, resolved);
    } catch (err) {
      console.error(err);
      alert("사진을 올리는 중 문제가 발생했어요. 다시 시도해주세요.");
    }
  }

  function handleGoToCheckout() {
    if (selectedItems.length === 0) return;
    const missingPhotos = selectedItems.some((item) => item.photos.length === 0);
    if (missingPhotos) {
      alert("사진이 없는 상품이 있어요. 사진을 먼저 넣어주세요.");
      return;
    }
    setIsGoing(true);
    saveCartItemsAndGoToCheckout(router, selectedItems);
  }

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
            <div className="mt-10 flex items-center gap-2 border-b border-[var(--color-hairline)] pb-4">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-[var(--color-sky)]"
              />
              <span className="text-sm text-[var(--color-charcoal)]/70">
                전체 선택 ({selectedItems.length}/{items.length})
              </span>
            </div>

            <div className="divide-y divide-[var(--color-hairline)]">
              {items.map((item) => {
                const { minPhotos, maxPhotos, aspect, requiredMinPx } = getItemConfig(item);
                const isEditing = editingId === item.id;
                const hasPhotos = item.photos.length > 0;

                return (
                  <div key={item.id} className="py-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          disabled={!hasPhotos}
                          onChange={() => toggleSelect(item.id)}
                          className="mt-1 h-4 w-4 accent-[var(--color-sky)] disabled:opacity-30"
                        />
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="mt-1 break-keep text-sm text-[var(--color-charcoal)]/60">
                            {item.sizeLabel}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
                            {item.unitPrice.toLocaleString()}원
                          </p>
                          {item.note && (
                            <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
                              요청사항 · {item.note}
                            </p>
                          )}
                          {!hasPhotos && (
                            <p className="mt-1 text-xs text-red-500">
                              사진이 없어요. 사진을 먼저 넣어주세요.
                            </p>
                          )}

                          {hasPhotos && !isEditing && (
                            <div className="mt-3 flex items-center gap-2">
                              {item.photos.slice(0, 4).map((photo, i) => (
                                <div
                                  key={i}
                                  className="h-12 w-12 overflow-hidden border border-[var(--color-hairline)]"
                                >
                                  <img
                                    src={photo.url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                              {item.photos.length > 4 && (
                                <span className="text-xs text-[var(--color-charcoal)]/50">
                                  +{item.photos.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : item.id)}
                            className="mt-2 text-xs text-[var(--color-charcoal)]/60 underline decoration-[var(--color-hairline)] underline-offset-4"
                          >
                            {isEditing ? "사진 수정 닫기" : "사진 수정하기"}
                          </button>
                        </div>
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
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 border border-[var(--color-hairline)] bg-[var(--color-ivory)]/60 p-4">
                        <PhotoPickerField
                          photos={item.photos}
                          onPhotosChange={(photos) => handleItemPhotosChange(item.id, photos)}
                          minPhotos={minPhotos}
                          maxPhotos={maxPhotos}
                          requiredMinPx={requiredMinPx}
                          aspect={aspect}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-1.5 border-t border-[var(--color-hairline)] pt-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-charcoal)]/60">상품 금액 (선택 {selectedItems.length}개)</span>
                <span>{goodsAmount.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-charcoal)]/60">배송비</span>
                <span>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</span>
              </div>
              {hasDiasecItem && (
                <p className="break-keep text-xs text-[var(--color-charcoal)]/50">
                  {DIASEC_SHIPPING_NOTICE}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--color-hairline)] pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-charcoal)]/60">공급가액</span>
                <span>{supplyAmount.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-charcoal)]/60">부가세</span>
                <span>{vatAmount.toLocaleString()}원</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-4">
              <span className="text-sm font-medium text-[var(--color-charcoal)]/70">
                결제예정금액
              </span>
              <span className="text-2xl font-semibold">{finalTotal.toLocaleString()}원</span>
            </div>

            <button
              type="button"
              onClick={handleGoToCheckout}
              disabled={selectedItems.length === 0 || isGoing}
              className={`mt-6 block w-full rounded-full px-8 py-4 text-center text-sm font-medium text-white transition sm:inline-block sm:w-auto ${
                selectedItems.length === 0 || isGoing
                  ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                  : "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] hover:opacity-90"
              }`}
            >
              선택 상품 주문하기 ({selectedItems.length}개)
            </button>
            <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
              선택하신 상품을 한 번에 주문 접수해요. 배송지·입금자 정보는 다음 화면에서 한 번만
              입력하시면 돼요.
            </p>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
