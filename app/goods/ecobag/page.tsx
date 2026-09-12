"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  ecobagShapes,
  ecobagFabrics,
  ecobagAddons,
  ECOBAG_BASE_PRICE,
  EcobagShapeId,
  EcobagFabricId,
  EcobagAddonId,
} from "@/lib/ecobagModels";
import { caseColorPresets, CaseColor } from "@/lib/phoneCaseModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "에코백";

// 큰 이미지 1개 + 작은 예시 이미지 4개. 가로형/세로형 사진이 서로 달라서
// 형태를 바꾸면 그 형태의 예시 사진으로 다시 보여줘요.
const galleryImagesByShape: Record<EcobagShapeId, string[]> = {
  horizontal: [
    "/goods/ecobag/gallery-2.jpg",
    "/goods/ecobag/gallery-1.jpg",
    "/goods/ecobag/gallery-3.jpg",
    "/goods/ecobag/gallery-4.jpg",
    "/goods/ecobag/gallery-5.jpg",
  ],
  vertical: [
    "/goods/ecobag/gallery-v-2.jpg",
    "/goods/ecobag/gallery-v-1.jpg",
    "/goods/ecobag/gallery-v-3.jpg",
    "/goods/ecobag/gallery-v-4.jpg",
    "/goods/ecobag/gallery-v-5.jpg",
  ],
};

// 상세페이지처럼 구매하기 아래에 순서대로 보여줄 제품 설명 이미지예요.
const detailImages = [
  "/goods/ecobag/detail-1.jpg",
  "/goods/ecobag/detail-2.jpg",
  "/goods/ecobag/detail-3.jpg",
  "/goods/ecobag/detail-4.jpg",
  "/goods/ecobag/detail-5.jpg",
  "/goods/ecobag/detail-6.jpg",
];

function OptionsForm({
  shape,
  setShape,
  fabric,
  setFabric,
  addonIds,
  toggleAddon,
  strapColor,
  setStrapColor,
  labelColor,
  setLabelColor,
  quantity,
  setQuantity,
  requestNote,
  setRequestNote,
}: {
  shape: EcobagShapeId;
  setShape: (s: EcobagShapeId) => void;
  fabric: EcobagFabricId;
  setFabric: (f: EcobagFabricId) => void;
  addonIds: EcobagAddonId[];
  toggleAddon: (id: EcobagAddonId) => void;
  strapColor: CaseColor;
  setStrapColor: (c: CaseColor) => void;
  labelColor: CaseColor;
  setLabelColor: (c: CaseColor) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">형태</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ecobagShapes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShape(s.id)}
              className={`border px-4 py-3 text-center transition ${
                shape === s.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">{s.detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">원단</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {ecobagFabrics.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFabric(f.id)}
              className={`border px-4 py-3 text-center transition ${
                fabric === f.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{f.label}</p>
              <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">후가공 선택</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          필요한 옵션을 골라주세요. 고른 만큼 금액이 추가돼요. (선택)
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {ecobagAddons.map((a) => {
            const checked = addonIds.includes(a.id);
            return (
              <div key={a.id}>
                <button
                  type="button"
                  onClick={() => toggleAddon(a.id)}
                  className={`flex w-full items-center justify-between border px-4 py-3 text-left transition ${
                    checked
                      ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                      : "border-[var(--color-hairline)]"
                  }`}
                >
                  <span>
                    <span className="text-sm font-medium">{a.label}</span>
                    <span className="mt-0.5 block break-keep text-xs text-[var(--color-charcoal)]/60">
                      {a.desc}
                    </span>
                  </span>
                  <span className="ml-3 whitespace-nowrap text-sm font-medium text-[var(--color-sky)]">
                    +{a.price.toLocaleString()}원
                  </span>
                </button>

                {checked && a.id === "strap" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border border-dashed border-[var(--color-hairline)] px-3 py-3">
                    <span className="mr-1 text-xs text-[var(--color-charcoal)]/50">끈 색상</span>
                    {caseColorPresets.slice(0, 14).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onClick={() => setStrapColor(c)}
                        className={`h-6 w-6 rounded-full border transition ${
                          strapColor.id === c.id
                            ? "ring-2 ring-[var(--color-sky)] ring-offset-1"
                            : "border-[var(--color-hairline)]"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="ml-1 text-xs text-[var(--color-charcoal)]/60">
                      선택 · {strapColor.label}
                    </span>
                  </div>
                )}

                {checked && a.id === "label" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border border-dashed border-[var(--color-hairline)] px-3 py-3">
                    <span className="mr-1 text-xs text-[var(--color-charcoal)]/50">라벨 색상</span>
                    {caseColorPresets.slice(0, 14).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        title={c.label}
                        aria-label={c.label}
                        onClick={() => setLabelColor(c)}
                        className={`h-6 w-6 rounded-full border transition ${
                          labelColor.id === c.id
                            ? "ring-2 ring-[var(--color-sky)] ring-offset-1"
                            : "border-[var(--color-hairline)]"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="ml-1 text-xs text-[var(--color-charcoal)]/60">
                      선택 · {labelColor.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">요청사항</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          에코백에 대해 남기고 싶은 요청사항이 있다면 자유롭게 적어주세요. (선택)
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

const productDescription = [
  "여행 혹은 일상에서 가볍고 편안하게 사용하기 좋은 에코백이에요.",
  "좋아하는 사진과 문구를 보내주시면 디자이너가 배치부터 디자인까지 작업해드려요.",
  "끈 커스텀을 선택하지 않으면 기본 화이트 원단 끈으로 제작돼요.",
  "인체에 무해한 OEKO-TEX 인증 원단과 잉크로 제작해요.",
];

export default function EcobagPage() {
  const [shape, setShape] = useState<EcobagShapeId>("horizontal");
  const [orderedImages, setOrderedImages] = useState<string[]>(
    galleryImagesByShape.horizontal
  );
  const [fabric, setFabric] = useState<EcobagFabricId>("cotton10");
  const [addonIds, setAddonIds] = useState<EcobagAddonId[]>([]);
  const [strapColor, setStrapColor] = useState<CaseColor>(caseColorPresets[0]);
  const [labelColor, setLabelColor] = useState<CaseColor>(caseColorPresets[0]);
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [requestNote, setRequestNote] = useState("");

  function toggleAddon(id: EcobagAddonId) {
    setAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }

  // 형태(가로형/세로형)를 바꾸면 큰 이미지 자리를 그 형태의 예시 사진 첫 장으로 되돌려줘요.
  useEffect(() => {
    setOrderedImages(galleryImagesByShape[shape]);
  }, [shape]);

  function handleSelectImage(index: number) {
    setOrderedImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }

  const selectedShape = ecobagShapes.find((s) => s.id === shape)!;
  const selectedFabric = ecobagFabrics.find((f) => f.id === fabric)!;
  const addonsTotal = ecobagAddons
    .filter((a) => addonIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const unitPrice = ECOBAG_BASE_PRICE + addonsTotal;
  const totalPrice = unitPrice * quantity;

  // 사이즈 아이디는 형태 × 원단 × 후가공 on/off 조합으로, lib/productConfig.ts의
  // 자동 생성 목록과 그대로 맞아야 해요. (끈/라벨의 자유 색상은 섞지 않아요.)
  const sizeId = useMemo(() => {
    const flags = ["strap", "label", "pocket", "magnet"].filter((id) =>
      addonIds.includes(id as EcobagAddonId)
    );
    const addonKey = flags.length ? flags.join("-") : "none";
    return `${shape}-${fabric}-${addonKey}`;
  }, [shape, fabric, addonIds]);

  // 본체 색상, 끈/라벨 커스텀 색상처럼 자유롭게 고르는 항목은 폰케이스 배경색상과 같은 방식으로
  // 고객이 다음 단계에서 고치지 못하는 자동 메모(colorNote)로 함께 전달해요.
  const colorNoteLines = [
    addonIds.includes("strap") ? `끈 색상 · ${strapColor.label} (${strapColor.hex})` : "",
    addonIds.includes("label") ? `라벨 색상 · ${labelColor.label} (${labelColor.hex})` : "",
  ].filter(Boolean);
  const colorNote = colorNoteLines.join(" / ");

  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}&unitPrice=${unitPrice}&note=${encodeURIComponent(
    requestNote
  )}&colorNote=${encodeURIComponent(colorNote)}`;

  function handleAddToCart() {
    const sizeLabelForCart = `${selectedShape.label} · ${selectedFabric.label}`;
    addToCart({
      productName: PRODUCT_NAME,
      sizeId,
      sizeLabel: sizeLabelForCart,
      unitPrice,
      quantity,
    });
    setCartNotice(true);
    setTimeout(() => setCartNotice(false), 2000);
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
                src={orderedImages[0] ?? galleryImagesByShape[shape][0]}
                alt="사진을 담은 Keepic 에코백"
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

            {/* 모바일: 이미지 바로 아래에 이름·가격·형태·설명을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">Keepic 커스텀 코튼 에코백</h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({unitPrice.toLocaleString()}원 × {quantity}개)
                </span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {ecobagShapes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={`border px-3 py-2.5 text-xs font-medium transition ${
                      shape === s.id
                        ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                        : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {productDescription.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < productDescription.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {productDescription.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < productDescription.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-3xl font-semibold">Keepic 커스텀 코튼 에코백</h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({unitPrice.toLocaleString()}원 × {quantity}개)
                </span>
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                shape={shape}
                setShape={setShape}
                fabric={fabric}
                setFabric={setFabric}
                addonIds={addonIds}
                toggleAddon={toggleAddon}
                strapColor={strapColor}
                setStrapColor={setStrapColor}
                labelColor={labelColor}
                setLabelColor={setLabelColor}
                quantity={quantity}
                setQuantity={setQuantity}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
              />

              <div className="mt-10 flex items-center justify-between border-t border-[var(--color-hairline)] pt-6">
                <span className="text-sm font-medium text-[var(--color-charcoal)]/70">
                  청구금액
                </span>
                <div className="text-right">
                  <span className="mr-2 text-sm text-[var(--color-charcoal)]/50">
                    개당 {unitPrice.toLocaleString()}원
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
                다음 단계에서 에코백에 담을 사진을 올려주세요. 5만원 이상 구매 시 배송비가 무료예요.
              </p>
            </div>
          </div>
        </div>

        {/* 상세페이지: 구매하기 아래에 제품 설명 이미지를 순서대로 보여줘요 */}
        <div className="mt-20 border-t border-[var(--color-hairline)] pt-16">
          <div className="mx-auto flex max-w-xl flex-col gap-6">
            {detailImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`Keepic 에코백 상세 설명 ${i + 1}`}
                className="w-full"
              />
            ))}
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
                shape={shape}
                setShape={setShape}
                fabric={fabric}
                setFabric={setFabric}
                addonIds={addonIds}
                toggleAddon={toggleAddon}
                strapColor={strapColor}
                setStrapColor={setStrapColor}
                labelColor={labelColor}
                setLabelColor={setLabelColor}
                quantity={quantity}
                setQuantity={setQuantity}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
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
