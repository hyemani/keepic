"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  fabricPosterSizes,
  fabricPosterFabrics,
  fabricPosterHangingOptions,
  fabricPosterEdgeOptions,
  fabricPosterDetailImages,
  fabricPosterGalleryImages,
  calcFabricPosterUnitPrice,
  FABRIC_POSTER_DEFAULT_HANGING,
  FABRIC_POSTER_DEFAULT_EDGE,
  FabricPosterSizeId,
  FabricPosterFabricId,
  FabricPosterHangingId,
  FabricPosterEdgeId,
} from "@/lib/fabricPosterModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "패브릭포스터";

function OptionsForm({
  sizeId,
  setSizeId,
  fabricId,
  setFabricId,
  hangingId,
  setHangingId,
  edgeId,
  setEdgeId,
  quantity,
  setQuantity,
  requestNote,
  setRequestNote,
}: {
  sizeId: FabricPosterSizeId;
  setSizeId: (v: FabricPosterSizeId) => void;
  fabricId: FabricPosterFabricId;
  setFabricId: (v: FabricPosterFabricId) => void;
  hangingId: FabricPosterHangingId;
  setHangingId: (v: FabricPosterHangingId) => void;
  edgeId: FabricPosterEdgeId;
  setEdgeId: (v: FabricPosterEdgeId) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
}) {
  const selectedEdge = fabricPosterEdgeOptions.find((e) => e.id === edgeId)!;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">규격(mm)</h2>
        <div className="mt-3 grid grid-cols-1 gap-3">
          {fabricPosterSizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSizeId(s.id)}
              className={`flex items-center justify-between border px-4 py-3 text-left transition ${
                sizeId === s.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-xs text-[var(--color-charcoal)]/60">
                {s.price.toLocaleString()}원
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">원단</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {fabricPosterFabrics.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFabricId(f.id)}
              className={`border px-4 py-3 text-left transition ${
                fabricId === f.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{f.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
                {f.priceDelta === 0
                  ? "추가금 없음"
                  : f.priceDelta > 0
                    ? `+${f.priceDelta.toLocaleString()}원`
                    : `${f.priceDelta.toLocaleString()}원`}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/50">
          {fabricPosterFabrics.find((f) => f.id === fabricId)?.desc}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">행잉 가공</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          원하는 설치 방식에 맞게 가공 옵션을 선택해주세요.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {fabricPosterHangingOptions.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => setHangingId(h.id)}
              className={`overflow-hidden border text-left transition ${
                hangingId === h.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <div className="aspect-square w-full overflow-hidden bg-[var(--color-hairline)]/20">
                <img src={h.image} alt={h.label} className="h-full w-full object-cover" />
              </div>
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{h.label}</p>
                <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
                  +{h.price.toLocaleString()}원
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">테두리 가공 (선택)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {fabricPosterEdgeOptions.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEdgeId(e.id)}
              className={`border px-4 py-3 text-left transition ${
                edgeId === e.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{e.label}</p>
              <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/60">
                {e.price === 0 ? "추가금 없음" : `+${e.price.toLocaleString()}원`}
              </p>
            </button>
          ))}
        </div>
        {selectedEdge.id === "none" && (
          <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/50">
            {selectedEdge.desc}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium">요청사항</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          라벨 위치, 색 보정 등 원하는 사항이 있다면 자유롭게 적어주세요. (선택)
        </p>
        <textarea
          value={requestNote}
          onChange={(e) => setRequestNote(e.target.value)}
          placeholder="예) 라벨은 왼쪽 하단에 달아주세요"
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

export default function FabricPosterPage() {
  const [sizeId, setSizeId] = useState<FabricPosterSizeId>(fabricPosterSizes[0].id);
  const [fabricId, setFabricId] = useState<FabricPosterFabricId>(fabricPosterFabrics[0].id);
  const [hangingId, setHangingId] = useState<FabricPosterHangingId>(FABRIC_POSTER_DEFAULT_HANGING);
  const [edgeId, setEdgeId] = useState<FabricPosterEdgeId>(FABRIC_POSTER_DEFAULT_EDGE);
  const [quantity, setQuantity] = useState(1);
  const [orderedImages, setOrderedImages] = useState<string[]>(fabricPosterGalleryImages);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [requestNote, setRequestNote] = useState("");

  const selectedSize = fabricPosterSizes.find((s) => s.id === sizeId)!;
  const selectedFabric = fabricPosterFabrics.find((f) => f.id === fabricId)!;
  const selectedHanging = fabricPosterHangingOptions.find((h) => h.id === hangingId)!;
  const selectedEdge = fabricPosterEdgeOptions.find((e) => e.id === edgeId)!;

  const unitPrice = useMemo(
    () => calcFabricPosterUnitPrice(sizeId, fabricId, hangingId, edgeId),
    [sizeId, fabricId, hangingId, edgeId]
  );
  const totalPrice = unitPrice * quantity;

  function handleSelectImage(index: number) {
    setOrderedImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }

  const sizeCompositeId = useMemo(
    () => `${sizeId}-${fabricId}-${hangingId}-${edgeId}`,
    [sizeId, fabricId, hangingId, edgeId]
  );
  const sizeLabel = `${selectedSize.label} · ${selectedFabric.label} · ${selectedHanging.label} · ${selectedEdge.label}`;
  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeCompositeId)}&quantity=${quantity}&unitPrice=${unitPrice}&note=${encodeURIComponent(
    requestNote
  )}`;

  function handleAddToCart() {
    addToCart({
      productName: PRODUCT_NAME,
      sizeId: sizeCompositeId,
      sizeLabel,
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
          {/* 이미지: 큰 이미지 1개 + 하단 예시 이미지 4개 (원본 비율 유지, 잘리지 않게) */}
          <div>
            <div className="aspect-square w-full overflow-hidden bg-[var(--color-hairline)]/20">
              <img
                src={orderedImages[0] ?? fabricPosterGalleryImages[0]}
                alt="패브릭 포스터"
                className="h-full w-full object-contain"
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
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>

            {/* 모바일: 이미지 바로 아래에 이름·가격·옵션을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">패브릭 포스터</h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({unitPrice.toLocaleString()}원 × {quantity}개)
                </span>
              </p>
              <p className="mt-4 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                한 장의 사진으로 완성하는 나만의 패브릭 포스터예요. 원하는 규격과
                원단, 설치 방식을 골라 나만의 공간에 걸어보세요.
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                한 장의 사진으로 완성하는 나만의 패브릭 포스터예요. 원하는 규격과
                원단, 설치 방식을 골라 나만의 공간에 걸어보세요.
              </p>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-3xl font-semibold">패브릭 포스터</h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({unitPrice.toLocaleString()}원 × {quantity}개)
                </span>
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                sizeId={sizeId}
                setSizeId={setSizeId}
                fabricId={fabricId}
                setFabricId={setFabricId}
                hangingId={hangingId}
                setHangingId={setHangingId}
                edgeId={edgeId}
                setEdgeId={setEdgeId}
                quantity={quantity}
                setQuantity={setQuantity}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
              />

              {/* 옵션별 추가금 · 합계를 주문 전에 확인할 수 있게 보여줘요 */}
              <div className="mt-8 border border-[var(--color-hairline)] bg-white px-4 py-4 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
                <div className="flex items-center justify-between">
                  <span>규격 기본 판매가 ({selectedSize.label})</span>
                  <span>{selectedSize.price.toLocaleString()}원</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>원단 차액 ({selectedFabric.label})</span>
                  <span>
                    {selectedFabric.priceDelta === 0
                      ? "0원"
                      : selectedFabric.priceDelta > 0
                        ? `+${selectedFabric.priceDelta.toLocaleString()}원`
                        : `${selectedFabric.priceDelta.toLocaleString()}원`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>행잉 가공 ({selectedHanging.label})</span>
                  <span>+{selectedHanging.price.toLocaleString()}원</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>테두리 가공 ({selectedEdge.label})</span>
                  <span>
                    {selectedEdge.price === 0 ? "0원" : `+${selectedEdge.price.toLocaleString()}원`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3 text-sm font-medium text-[var(--color-charcoal)]">
                  <span>1개당 판매가</span>
                  <span>{unitPrice.toLocaleString()}원</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[var(--color-hairline)] pt-6">
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
                다음 단계에서 사진과 요청사항을 다시 확인할 수 있어요. 5만원 이상 구매 시 배송비가 무료예요.
              </p>
            </div>
          </div>
        </div>

        {/* 상세 설명: 원단 · 사이즈 · 가공 · 주문 유의사항 (원본 비율 유지, 잘리지 않게) */}
        <div className="mx-auto mt-20 max-w-2xl">
          {fabricPosterDetailImages.map((src, i) => (
            <img key={i} src={src} alt="" className="w-full" />
          ))}
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
                sizeId={sizeId}
                setSizeId={setSizeId}
                fabricId={fabricId}
                setFabricId={setFabricId}
                hangingId={hangingId}
                setHangingId={setHangingId}
                edgeId={edgeId}
                setEdgeId={setEdgeId}
                quantity={quantity}
                setQuantity={setQuantity}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
              />

              {/* 모바일에서도 옵션명·금액이 잘리지 않게 세로로 나열해요 */}
              <div className="mt-6 border border-[var(--color-hairline)] bg-white px-4 py-4 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="break-keep">규격 기본 판매가</span>
                  <span className="shrink-0">{selectedSize.price.toLocaleString()}원</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="break-keep">원단 차액</span>
                  <span className="shrink-0">
                    {selectedFabric.priceDelta === 0
                      ? "0원"
                      : selectedFabric.priceDelta > 0
                        ? `+${selectedFabric.priceDelta.toLocaleString()}원`
                        : `${selectedFabric.priceDelta.toLocaleString()}원`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="break-keep">행잉 가공</span>
                  <span className="shrink-0">+{selectedHanging.price.toLocaleString()}원</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="break-keep">테두리 가공</span>
                  <span className="shrink-0">
                    {selectedEdge.price === 0 ? "0원" : `+${selectedEdge.price.toLocaleString()}원`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-hairline)] pt-3 text-sm font-medium text-[var(--color-charcoal)]">
                  <span>1개당 판매가</span>
                  <span className="shrink-0">{unitPrice.toLocaleString()}원</span>
                </div>
              </div>
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
