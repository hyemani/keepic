"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  phoneBrands,
  phoneModelsByBrand,
  caseMaterials,
  PhoneBrandId,
  CaseMaterialId,
} from "@/lib/phoneCaseModels";

const PRODUCT_NAME = "폰케이스";
// 실제 제작 예시 사진이 더 모이면 galleryImages 배열에 추가해주세요. 현재는 1장뿐이라 임시로 반복 배치했어요.
const galleryImages = [
  "/goods/goods-phonecase.jpg",
  "/goods/goods-phonecase.jpg",
  "/goods/goods-phonecase.jpg",
  "/goods/goods-phonecase.jpg",
];

function OptionsForm({
  brand,
  setBrand,
  material,
  setMaterial,
  model,
  setModel,
  quantity,
  setQuantity,
}: {
  brand: PhoneBrandId;
  setBrand: (b: PhoneBrandId) => void;
  material: CaseMaterialId;
  setMaterial: (m: CaseMaterialId) => void;
  model: string;
  setModel: (m: string) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
}) {
  const models = phoneModelsByBrand[brand];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">브랜드</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {phoneBrands.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setBrand(b.id);
                setModel(phoneModelsByBrand[b.id][0]);
              }}
              className={`border px-4 py-3 text-sm font-medium transition ${
                brand === b.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">자재 종류</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {caseMaterials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaterial(m.id)}
              className={`border px-4 py-3 text-left transition ${
                material === m.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{m.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
                {m.price.toLocaleString()}원
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">기종</h2>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mt-3 w-full border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="text-sm font-medium">수량</h2>
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
            className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
          >
            −
          </button>
          <span className="w-8 text-center text-lg font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((prev) => prev + 1)}
            className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhoneCasePage() {
  const [activeImage, setActiveImage] = useState(0);
  const [brand, setBrand] = useState<PhoneBrandId>("apple");
  const [material, setMaterial] = useState<CaseMaterialId>("normal");
  const [model, setModel] = useState(phoneModelsByBrand.apple[0]);
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedMaterial = caseMaterials.find((m) => m.id === material)!;
  const totalPrice = selectedMaterial.price * quantity;

  const sizeId = useMemo(
    () => `${material}-${brand}-${model}`,
    [material, brand, model]
  );
  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}`;

  return (
    <main className="min-h-screen bg-white pb-24 text-[var(--color-charcoal)] sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-14">
          {/* 이미지: 큰 이미지 1개 + 하단 예시 이미지 4개 */}
          <div>
            <div className="aspect-[3/4] w-full overflow-hidden bg-[var(--color-hairline)]/20">
              <img
                src={galleryImages[activeImage]}
                alt="투명 젤하드케이스 프리미엄"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[3/4] overflow-hidden border transition ${
                    activeImage === i
                      ? "border-[var(--color-sky)]"
                      : "border-[var(--color-hairline)]"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                투명한 소재라 인쇄한 사진이 또렷하게 보여요. 카메라 주변과 모서리를
                감싸는 범퍼 디자인으로 충격에도 강해요.
                <br />
                맥세이프케이스는 뒷면에 자석 링이 내장되어 있어 맥세이프 액세서리를
                그대로 사용하실 수 있어요.
              </p>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
              투명 젤하드케이스 프리미엄
            </h1>
            <p className="mt-3 text-2xl font-semibold">
              {totalPrice.toLocaleString()}원
              <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                ({selectedMaterial.price.toLocaleString()}원 × {quantity}개)
              </span>
            </p>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                brand={brand}
                setBrand={setBrand}
                material={material}
                setMaterial={setMaterial}
                model={model}
                setModel={setModel}
                quantity={quantity}
                setQuantity={setQuantity}
              />

              <Link
                href={nextUrl}
                className="mt-10 inline-block bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
              >
                제작 신청하기
              </Link>
              <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
                다음 단계에서 케이스에 담을 사진을 올려주세요. 배송비는 별도예요.
              </p>
            </div>

            {/* 모바일: 설명만 노출, 옵션 선택은 하단 팝업에서 */}
            <p className="mt-6 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70 sm:hidden">
              투명한 소재라 인쇄한 사진이 또렷하게 보여요. 카메라 주변과 모서리를
              감싸는 범퍼 디자인으로 충격에도 강해요.
              <br />
              맥세이프케이스는 뒷면에 자석 링이 내장되어 있어 맥세이프 액세서리를
              그대로 사용하실 수 있어요.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* 모바일 전용: 하단 고정 바 → 탭하면 옵션 선택 팝업이 아래에서 열림 */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-[var(--color-hairline)] bg-white px-6 py-4 sm:hidden">
        <div>
          <p className="text-lg font-semibold">{totalPrice.toLocaleString()}원</p>
          <p className="text-xs text-[var(--color-charcoal)]/50">{quantity}개</p>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="bg-[var(--color-sky)] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          옵션 선택하기
        </button>
      </div>

      {/* 모바일 전용: 옵션 선택 바텀 시트 */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold">옵션 선택</p>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="닫기"
                className="text-2xl leading-none text-[var(--color-charcoal)]/50"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <OptionsForm
                brand={brand}
                setBrand={setBrand}
                material={material}
                setMaterial={setMaterial}
                model={model}
                setModel={setModel}
                quantity={quantity}
                setQuantity={setQuantity}
              />
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--color-hairline)] pt-5">
              <p className="text-lg font-semibold">{totalPrice.toLocaleString()}원</p>
              <Link
                href={nextUrl}
                className="bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
              >
                제작 신청하기
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
