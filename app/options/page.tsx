"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { productConfig, ProductName } from "@/lib/productConfig";
import { photobookTypes, PhotobookSizeId } from "@/lib/photobookTypes";

function OptionsPageContent() {
  const searchParams = useSearchParams();
  const productName = (searchParams.get("product") ?? "포토북") as ProductName;
  const config = productConfig[productName];

  const [selectedSize, setSelectedSize] = useState<string>(config.sizes[1].id);
  const [quantity, setQuantity] = useState(1);
  const [selectedType, setSelectedType] = useState<string>(
    photobookTypes[0]?.id ?? ""
  );

  const isPhotobook = productName === "포토북";
  const selectedTypeObj = photobookTypes.find((t) => t.id === selectedType);
  const canProceed = !isPhotobook || selectedTypeObj?.isPurchasable === true;

  const nextUrl =
    config.maxPhotos > 1
      ? `/template?product=${encodeURIComponent(
          productName
        )}&size=${selectedSize}&quantity=${quantity}`
      : `/upload?product=${encodeURIComponent(
          productName
        )}&size=${selectedSize}&quantity=${quantity}`;

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      <section className="mx-auto max-w-2xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm text-[var(--color-charcoal)]/60">{productName}</p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          옵션을 선택해주세요
        </h1>

        {isPhotobook && (
          <>
            <h2 className="mt-12 text-lg font-semibold">종류</h2>
            <div className="mt-4 flex flex-col gap-3">
              {photobookTypes.map((type) => {
                const price = type.prices[selectedSize as PhotobookSizeId];
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-4 text-left transition ${
                      selectedType === type.id
                        ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                        : "border-[var(--color-hairline)]"
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        {type.name}
                        {!type.isPurchasable && (
                          <span className="ml-2 rounded-full bg-[var(--color-charcoal)]/10 px-2 py-0.5 text-xs font-normal text-[var(--color-charcoal)]/60">
                            준비 중
                          </span>
                        )}
                      </p>
                      {type.isTestPrice && (
                        <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">
                          (테스트 가격이에요, 실제 판매가가 아니에요)
                        </p>
                      )}
                    </div>
                    <p className="font-medium">{price.toLocaleString()}원</p>
                  </button>
                );
              })}
            </div>
            {!canProceed && (
              <p className="mt-4 text-sm text-[var(--color-charcoal)]/60">
                선택하신 종류는 아직 가격이 확정되지 않아 주문할 수 없어요. 가격이
                확정되면 주문 가능하게 열릴 예정이에요.
              </p>
            )}
          </>
        )}

        <h2 className="mt-12 text-lg font-semibold">사이즈</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {config.sizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setSelectedSize(size.id)}
              className={`rounded-xl border px-4 py-4 text-center transition ${
                selectedSize === size.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="font-medium">{size.label}</p>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
                {size.detail}
              </p>
            </button>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold">수량</h2>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-medium">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((prev) => prev + 1)}
            className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
          >
            +
          </button>
        </div>

        {canProceed ? (
          <Link
            href={nextUrl}
            className="mt-12 inline-block rounded-full bg-[var(--color-charcoal)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
          >
            다음
          </Link>
        ) : (
          <button
            disabled
            className="mt-12 inline-block cursor-not-allowed rounded-full bg-[var(--color-hairline)] px-8 py-4 text-sm font-medium text-white/70"
          >
            다음
          </button>
        )}
      </section>
    </main>
  );
}

export default function OptionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory)]" />}>
      <OptionsPageContent />
    </Suspense>
  );
}
