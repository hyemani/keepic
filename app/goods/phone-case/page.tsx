"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  phoneBrands,
  phoneModelsByBrand,
  caseTypes,
  coatings,
  caseColorPresets,
  PhoneBrandId,
  CaseMaterialId,
  CaseTypeId,
  CoatingId,
  CaseColor,
} from "@/lib/phoneCaseModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "폰케이스";

// 투명 젤하드 케이스(premium) / 하드케이스(standard) 예시 사진이에요.
const galleryImagesByCaseType: Record<CaseTypeId, string[]> = {
  premium: [
    "/goods/phone-case/premium-1.jpg",
    "/goods/phone-case/premium-2.jpg",
    "/goods/phone-case/premium-3.jpg",
    "/goods/phone-case/premium-4.jpg",
    "/goods/phone-case/premium-5.jpg",
  ],
  standard: [
    "/goods/phone-case/standard-blue.jpg",
    "/goods/phone-case/standard-yellow.jpg",
    "/goods/phone-case/standard-teal.jpg",
    "/goods/phone-case/standard-pink.jpg",
    "/goods/phone-case/standard-green.jpg",
  ],
};

function OptionsForm({
  caseType,
  setCaseType,
  brand,
  setBrand,
  material,
  setMaterial,
  coating,
  setCoating,
  caseColor,
  setCaseColor,
  model,
  setModel,
  quantity,
  setQuantity,
}: {
  caseType: CaseTypeId;
  setCaseType: (t: CaseTypeId) => void;
  brand: PhoneBrandId;
  setBrand: (b: PhoneBrandId) => void;
  material: CaseMaterialId;
  setMaterial: (m: CaseMaterialId) => void;
  coating: CoatingId;
  setCoating: (c: CoatingId) => void;
  caseColor: CaseColor;
  setCaseColor: (c: CaseColor) => void;
  model: string;
  setModel: (m: string) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
}) {
  const models = phoneModelsByBrand[brand];
  const selectedCaseType = caseTypes.find((t) => t.id === caseType)!;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">케이스 종류</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {caseTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setCaseType(t.id)}
              className={`border px-4 py-3 text-sm font-medium transition ${
                caseType === t.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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
          {selectedCaseType.materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaterial(m.id)}
              className={`border px-4 py-3 text-center transition ${
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
        <h2 className="text-sm font-medium">코팅</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {coatings.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCoating(c.id)}
              className={`border px-4 py-3 text-sm font-medium transition ${
                coating === c.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {caseType === "standard" && (
        <div>
          <h2 className="text-sm font-medium">배경색상</h2>
          <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
            하드케이스 디자인의 배경으로 쓸 색상을 골라주세요. 원하는 색이 없다면
            직접 선택도 가능해요.
          </p>
          <div className="mt-3 grid grid-cols-6 gap-2.5 sm:grid-cols-9">
            {caseColorPresets.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                onClick={() => setCaseColor(c)}
                className={`aspect-square rounded-full border transition ${
                  caseColor.id === c.id
                    ? "ring-2 ring-[var(--color-sky)] ring-offset-2"
                    : "border-[var(--color-hairline)]"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label
              title="직접 선택"
              className="relative flex aspect-square items-center justify-center rounded-full border border-dashed border-[var(--color-charcoal)]/30 text-sm text-[var(--color-charcoal)]/50"
            >
              +
              <input
                type="color"
                value={caseColor.hex}
                onChange={(e) =>
                  setCaseColor({
                    id: "custom",
                    label: `직접 선택(${e.target.value})`,
                    hex: e.target.value,
                  })
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-charcoal)]/60">
            <span
              className="inline-block h-4 w-4 rounded-full border border-[var(--color-hairline)]"
              style={{ backgroundColor: caseColor.hex }}
            />
            선택한 색상 · {caseColor.label}
          </div>
        </div>
      )}

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
  const [caseType, setCaseTypeState] = useState<CaseTypeId>("premium");
  const [brand, setBrand] = useState<PhoneBrandId>("apple");
  const [material, setMaterial] = useState<CaseMaterialId>("normal");
  const [coating, setCoating] = useState<CoatingId>("matte");
  const [caseColor, setCaseColor] = useState<CaseColor>(caseColorPresets[0]);
  const [model, setModel] = useState(phoneModelsByBrand.apple[0]);
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);

  const selectedCaseType = caseTypes.find((t) => t.id === caseType)!;
  const selectedMaterial =
    selectedCaseType.materials.find((m) => m.id === material) ??
    selectedCaseType.materials[0];
  const totalPrice = selectedMaterial.price * quantity;
  const galleryImages = galleryImagesByCaseType[caseType];

  // 케이스 종류를 바꾸면 그 종류에 있는 자재로 다시 맞춰주고, 예시 사진도 처음부터 보여줘요.
  function setCaseType(next: CaseTypeId) {
    setCaseTypeState(next);
    const nextType = caseTypes.find((t) => t.id === next)!;
    if (!nextType.materials.some((m) => m.id === material)) {
      setMaterial(nextType.materials[0].id);
    }
    setActiveImage(0);
  }

  const selectedBrand = phoneBrands.find((b) => b.id === brand)!;
  const selectedCoating = coatings.find((c) => c.id === coating)!;
  const sizeLabel =
    caseType === "standard"
      ? `${selectedBrand.label} ${model} · ${selectedCaseType.label} · ${selectedMaterial.label} · ${selectedCoating.label} · 배경색상 ${caseColor.label}`
      : `${selectedBrand.label} ${model} · ${selectedCaseType.label} · ${selectedMaterial.label}`;

  function handleAddToCart() {
    addToCart({
      productName: PRODUCT_NAME,
      sizeId,
      sizeLabel,
      unitPrice: selectedMaterial.price,
      quantity,
    });
    setCartNotice(true);
    setTimeout(() => setCartNotice(false), 2000);
  }

  const sizeId = useMemo(() => {
    const base = `${caseType}-${material}-${coating}-${brand}-${model}`;
    return caseType === "standard"
      ? `${base}-${caseColor.hex.replace("#", "")}`
      : base;
  }, [caseType, material, coating, brand, model, caseColor]);
  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}&unitPrice=${selectedMaterial.price}`;

  return (
    <main className="min-h-screen bg-white pb-24 text-[var(--color-charcoal)] sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-14">
          {/* 이미지: 큰 이미지 1개 + 하단 예시 이미지 4개 */}
          <div>
            <div className="aspect-square w-full overflow-hidden bg-[var(--color-hairline)]/20">
              <img
                src={galleryImages[activeImage]}
                alt={selectedCaseType.productLabel}
                className="h-full w-full object-cover"
              />
            </div>

            {/* 모바일: 이미지 바로 아래에 이름·가격·설명을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">
                {selectedCaseType.productLabel}
              </h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({selectedMaterial.price.toLocaleString()}원 × {quantity}개)
                </span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {caseTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCaseType(t.id)}
                    className={`border px-3 py-2.5 text-xs font-medium transition ${
                      caseType === t.id
                        ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                        : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {selectedCaseType.description.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < selectedCaseType.description.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-3">
              {galleryImages.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square overflow-hidden border transition ${
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
                {selectedCaseType.description.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < selectedCaseType.description.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-3xl font-semibold">
                {selectedCaseType.productLabel}
              </h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({selectedMaterial.price.toLocaleString()}원 × {quantity}개)
                </span>
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                caseType={caseType}
                setCaseType={setCaseType}
                brand={brand}
                setBrand={setBrand}
                material={material}
                setMaterial={setMaterial}
                coating={coating}
                setCoating={setCoating}
                caseColor={caseColor}
                setCaseColor={setCaseColor}
                model={model}
                setModel={setModel}
                quantity={quantity}
                setQuantity={setQuantity}
              />

              <div className="mt-10 flex items-center justify-between border-t border-[var(--color-hairline)] pt-6">
                <span className="text-sm font-medium text-[var(--color-charcoal)]/70">
                  청구금액
                </span>
                <div className="text-right">
                  <span className="mr-2 text-sm text-[var(--color-charcoal)]/50">
                    개당 {selectedMaterial.price.toLocaleString()}원
                  </span>
                  <span className="text-xl font-semibold">
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 border border-[var(--color-charcoal)]/30 px-6 py-4 text-sm font-medium transition hover:bg-[var(--color-hairline)]/20"
                >
                  장바구니
                </button>
                <Link
                  href={nextUrl}
                  className="flex-1 bg-[var(--color-sky)] px-6 py-4 text-center text-sm font-medium text-white transition hover:opacity-90"
                >
                  제작 신청하기
                </Link>
              </div>
              {cartNotice && (
                <p className="mt-2 text-right text-xs text-[var(--color-sky)]">
                  장바구니에 담았어요.
                </p>
              )}
              <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
                다음 단계에서 케이스에 담을 사진을 올려주세요. 5만원 이상 구매 시 배송비가 무료예요.
              </p>
            </div>

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
                caseType={caseType}
                setCaseType={setCaseType}
                brand={brand}
                setBrand={setBrand}
                material={material}
                setMaterial={setMaterial}
                coating={coating}
                setCoating={setCoating}
                caseColor={caseColor}
                setCaseColor={setCaseColor}
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
