"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { productConfig } from "@/lib/productConfig";
import { GoodsPhoto, calcRequiredMinPx } from "@/lib/photoUtils";
import { saveGoodsDraftAndGoToCheckout, saveGoodsDraftToCart } from "@/lib/orderDraft";
import PhotoPickerField from "@/components/PhotoPickerField";
import { getShippingFee } from "@/lib/shippingConfig";

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
  requestNote,
  setRequestNote,
  photos,
  setPhotos,
  requiredMinPx,
  photoAspect,
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
  requestNote: string;
  setRequestNote: (v: string) => void;
  photos: GoodsPhoto[];
  setPhotos: (photos: GoodsPhoto[]) => void;
  requiredMinPx: number;
  photoAspect: string;
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

      <PhotoPickerField
        photos={photos}
        onPhotosChange={setPhotos}
        minPhotos={1}
        maxPhotos={1}
        requiredMinPx={requiredMinPx}
        aspect={photoAspect}
        hint="케이스에 인쇄할 사진 1장을 선택해주세요."
      />

      <div>
        <h2 className="text-sm font-medium">요청사항</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          케이스에 대해 남기고 싶은 요청사항이 있다면 자유롭게 적어주세요. (선택)
        </p>
        <textarea
          value={requestNote}
          onChange={(e) => setRequestNote(e.target.value)}
          placeholder="예) 사진을 조금 더 크게 배치해주세요"
          rows={4}
          className="mt-3 w-full resize-none border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
        />
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
  const router = useRouter();
  const [photos, setPhotos] = useState<GoodsPhoto[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [orderedImages, setOrderedImages] = useState<string[]>(
    galleryImagesByCaseType.premium
  );
  const [caseType, setCaseTypeState] = useState<CaseTypeId>("premium");
  const [brand, setBrand] = useState<PhoneBrandId>("apple");
  const [material, setMaterial] = useState<CaseMaterialId>("normal");
  const [coating, setCoating] = useState<CoatingId>("matte");
  const [caseColor, setCaseColor] = useState<CaseColor>(caseColorPresets[0]);
  const [model, setModel] = useState(phoneModelsByBrand.apple[0]);
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [requestNote, setRequestNote] = useState("");

  const selectedCaseType = caseTypes.find((t) => t.id === caseType)!;
  const selectedMaterial =
    selectedCaseType.materials.find((m) => m.id === material) ??
    selectedCaseType.materials[0];
  const totalPrice = selectedMaterial.price * quantity;
  const shippingFee = getShippingFee(totalPrice);
  const finalTotal = totalPrice + shippingFee;
  const galleryImages = galleryImagesByCaseType[caseType];

  // 케이스 종류를 바꾸면 그 종류에 있는 자재로 다시 맞춰줘요.
  function setCaseType(next: CaseTypeId) {
    setCaseTypeState(next);
    const nextType = caseTypes.find((t) => t.id === next)!;
    if (!nextType.materials.some((m) => m.id === material)) {
      setMaterial(nextType.materials[0].id);
    }
  }

  // 케이스 종류가 바뀌면 큰 이미지 자리를 그 종류의 예시 사진 첫 장으로 되돌려줘요.
  useEffect(() => {
    setOrderedImages(galleryImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseType]);

  // 작은 이미지를 누르면 큰 이미지와 자리를 서로 바꿔줘요.
  function handleSelectImage(index: number) {
    setOrderedImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }

  const selectedBrand = phoneBrands.find((b) => b.id === brand)!;
  const selectedCoating = coatings.find((c) => c.id === coating)!;
  const sizeLabel =
    caseType === "standard"
      ? `${selectedBrand.label} ${model} · ${selectedCaseType.label} · ${selectedMaterial.label} · ${selectedCoating.label} · 배경색상 ${caseColor.label}`
      : `${selectedBrand.label} ${model} · ${selectedCaseType.label} · ${selectedMaterial.label}`;

  async function handleAddToCart() {
    if (photos.length < 1) {
      alert("케이스에 인쇄할 사진을 선택해주세요.");
      return;
    }
    setIsAddingToCart(true);
    const result = await saveGoodsDraftToCart({
      productName: PRODUCT_NAME,
      sizeId,
      sizeLabel,
      sizeDetail: sizeInfo?.detail ?? "",
      quantity,
      unitPrice: selectedMaterial.price,
      photos,
      note: requestNote,
      colorNote: backgroundColorNote,
    });
    setIsAddingToCart(false);
    if (result.ok) {
      setCartNotice(true);
      setTimeout(() => setCartNotice(false), 2000);
    }
  }

  const sizeId = useMemo(
    () => `${caseType}-${material}-${coating}-${brand}-${model}`,
    [caseType, material, coating, brand, model]
  );
  // 하드케이스일 때는 고른 배경색상을 별도 메모(colorNote)로 함께 넘겨요.
  // (사이즈 아이디는 lib/productConfig.ts의 자동 생성 목록과 그대로 맞아야 해서 색상을 섞지 않고,
  //  고객이 다음 단계에서 요청사항을 고쳐도 배경색상 메모는 따로 안전하게 남아있어요.)
  // 하드케이스일 때는 고른 배경색상을 별도 메모(colorNote)로 함께 넘겨요.
  const backgroundColorNote =
    caseType === "standard" ? `배경색상 · ${caseColor.label} (${caseColor.hex})` : "";
  const sizeInfo = productConfig["폰케이스"].sizes.find((s) => s.id === sizeId);
  const requiredMinPx = calcRequiredMinPx(sizeInfo?.detail ?? "");
  const photoAspect = sizeInfo?.aspect ?? "aspect-[75/163]";

  async function handleSubmit() {
    if (photos.length < 1) {
      alert("케이스에 인쇄할 사진을 선택해주세요.");
      return;
    }
    setIsSaving(true);
    const result = await saveGoodsDraftAndGoToCheckout({
      router,
      productName: PRODUCT_NAME,
      sizeId,
      sizeLabel,
      sizeDetail: sizeInfo?.detail ?? "",
      quantity,
      unitPrice: selectedMaterial.price,
      photos,
      note: requestNote,
      colorNote: backgroundColorNote,
    });
    if (!result.ok) setIsSaving(false);
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-[var(--color-charcoal)] sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8 sm:px-10">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-14">
          {/* 이미지: 큰 이미지 1개 + 하단 예시 이미지 4개 */}
          <div>
            <div className="aspect-square w-full overflow-hidden bg-[var(--color-hairline)]/20">
              <img
                src={orderedImages[0] ?? galleryImages[0]}
                alt={selectedCaseType.productLabel}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-3">
              {orderedImages.slice(1).map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => handleSelectImage(i + 1)}
                  className="aspect-square overflow-hidden border border-[var(--color-hairline)] transition hover:border-[var(--color-sky)]"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
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
                requestNote={requestNote}
                setRequestNote={setRequestNote}
                photos={photos}
                setPhotos={setPhotos}
                requiredMinPx={requiredMinPx}
                photoAspect={photoAspect}
              />

              <div className="mt-10 border-t border-[var(--color-hairline)] pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-charcoal)]/70">
                    상품 금액
                  </span>
                  <span className="text-sm">
                    <span className="mr-2 text-[var(--color-charcoal)]/50">
                      개당 {selectedMaterial.price.toLocaleString()}원
                    </span>
                    {totalPrice.toLocaleString()}원
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-[var(--color-charcoal)]/70">배송비</span>
                  <span className="text-sm">
                    {shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
                  <span className="text-sm font-medium">최종 결제금액</span>
                  <span className="text-xl font-semibold">
                    {finalTotal.toLocaleString()}원
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className={`flex-1 border px-6 py-4 text-sm font-medium transition ${
                    isAddingToCart
                      ? "cursor-not-allowed border-[var(--color-hairline)] text-[var(--color-charcoal)]/40"
                      : "border-[var(--color-charcoal)]/30 hover:bg-[var(--color-hairline)]/20"
                  }`}
                >
                  {isAddingToCart ? "담는 중..." : "장바구니"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`flex-1 px-6 py-4 text-center text-sm font-medium text-white transition ${
                    isSaving
                      ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                      : "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] hover:opacity-90"
                  }`}
                >
                  {isSaving ? "사진 올리는 중..." : "제작 신청하기"}
                </button>
              </div>
              {cartNotice && (
                <p className="mt-2 text-right text-xs text-[var(--color-sky)]">
                  장바구니에 담았어요.
                </p>
              )}
              <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
                5만원 이상 구매 시 배송비가 무료예요.
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
          className="bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
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
                requestNote={requestNote}
                setRequestNote={setRequestNote}
                photos={photos}
                setPhotos={setPhotos}
                requiredMinPx={requiredMinPx}
                photoAspect={photoAspect}
              />
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--color-hairline)] pt-5">
              <div>
                <p className="text-lg font-semibold">{finalTotal.toLocaleString()}원</p>
                <p className="text-[11px] text-[var(--color-charcoal)]/50">
                  상품 {totalPrice.toLocaleString()}원 + 배송비{" "}
                  {shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className={`px-8 py-4 text-sm font-medium text-white transition ${
                  isSaving
                    ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                    : "bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] hover:opacity-90"
                }`}
              >
                {isSaving ? "사진 올리는 중..." : "제작 신청하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
