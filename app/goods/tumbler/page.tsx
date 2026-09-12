"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { tumblerTypes, TumblerTypeId } from "@/lib/tumblerModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "텀블러";

function OptionsForm({
  typeId,
  setTypeId,
  colorId,
  setColorId,
  quantity,
  setQuantity,
  requestNote,
  setRequestNote,
}: {
  typeId: TumblerTypeId;
  setTypeId: (t: TumblerTypeId) => void;
  colorId: string;
  setColorId: (c: string) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
}) {
  const selectedType = tumblerTypes.find((t) => t.id === typeId)!;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">종류</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {tumblerTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeId(t.id)}
              className={`border px-4 py-3 text-center transition ${
                typeId === t.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
                {t.price.toLocaleString()}원
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">색상</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {selectedType.colors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              className={`border px-4 py-3 text-sm font-medium transition ${
                colorId === c.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">제품 사양</h2>
        <div className="mt-3 border border-[var(--color-hairline)] bg-white px-4 py-4 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
          <p>용량 · {selectedType.capacity}</p>
          <p className="mt-1">소재 · {selectedType.material}</p>
          <p className="mt-1">각인 영역 · {selectedType.engraveArea}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">요청사항</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          텀블러는 사진 대신 각인으로 제작해요. 원하는 문구, 이니셜, 캐릭터 등을
          자유롭게 적어주세요.
        </p>
        <textarea
          value={requestNote}
          onChange={(e) => setRequestNote(e.target.value)}
          placeholder="예) OOO 이니셜 각인 부탁드려요 / 강아지 캐릭터 넣고 싶어요"
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

export default function TumblerPage() {
  const [typeId, setTypeIdState] = useState<TumblerTypeId>("clip-vacuum");
  const [colorId, setColorId] = useState(tumblerTypes[0].colors[0].id);
  const [quantity, setQuantity] = useState(1);
  const [orderedImages, setOrderedImages] = useState<string[]>(
    tumblerTypes[0].colors[0].images
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [requestNote, setRequestNote] = useState("");

  const selectedType = tumblerTypes.find((t) => t.id === typeId)!;
  const selectedColor =
    selectedType.colors.find((c) => c.id === colorId) ?? selectedType.colors[0];
  const totalPrice = selectedType.price * quantity;

  // 종류를 바꾸면 그 종류에 있는 색상으로 다시 맞춰줘요.
  function setTypeId(next: TumblerTypeId) {
    setTypeIdState(next);
    const nextType = tumblerTypes.find((t) => t.id === next)!;
    if (!nextType.colors.some((c) => c.id === colorId)) {
      setColorId(nextType.colors[0].id);
    }
  }

  // 종류·색상이 바뀌면 큰 이미지 자리를 그 예시 사진 첫 장으로 되돌려줘요.
  useEffect(() => {
    setOrderedImages(selectedColor.images);
  }, [selectedColor]);

  // 작은 이미지를 누르면 큰 이미지와 자리를 서로 바꿔줘요.
  function handleSelectImage(index: number) {
    setOrderedImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }

  const sizeId = useMemo(() => `${typeId}-${colorId}`, [typeId, colorId]);
  const sizeLabel = `${selectedType.label} · ${selectedColor.label}`;
  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}&unitPrice=${
    selectedType.price
  }&note=${encodeURIComponent(requestNote)}`;

  function handleAddToCart() {
    addToCart({
      productName: PRODUCT_NAME,
      sizeId,
      sizeLabel,
      unitPrice: selectedType.price,
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
                src={orderedImages[0] ?? selectedColor.images[0]}
                alt={`${selectedType.productLabel} · ${selectedColor.label}`}
                className="h-full w-full object-cover"
              />
            </div>

            {/* 모바일: 이미지 바로 아래에 이름·가격·설명을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">
                {selectedType.productLabel}
              </h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({selectedType.price.toLocaleString()}원 × {quantity}개)
                </span>
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {tumblerTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTypeId(t.id)}
                    className={`border px-3 py-2.5 text-xs font-medium transition ${
                      typeId === t.id
                        ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                        : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <p className="mt-4 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {selectedType.description.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < selectedType.description.length - 1 && <br />}
                  </span>
                ))}
              </p>
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

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {selectedType.description.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < selectedType.description.length - 1 && <br />}
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
                {selectedType.productLabel}
              </h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({selectedType.price.toLocaleString()}원 × {quantity}개)
                </span>
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                typeId={typeId}
                setTypeId={setTypeId}
                colorId={colorId}
                setColorId={setColorId}
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
                    개당 {selectedType.price.toLocaleString()}원
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
                다음 단계에서 요청사항과 참고 사진(선택)을 다시 확인할 수 있어요. 5만원 이상 구매 시 배송비가 무료예요.
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
                typeId={typeId}
                setTypeId={setTypeId}
                colorId={colorId}
                setColorId={setColorId}
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
