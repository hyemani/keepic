"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase } from "@/lib/supabase";
import { calcShippingFee } from "@/lib/shippingConfig";
import { DIASEC_SHIPPING_NOTICE, isDiasecDeskSizeId, isDiasecWallSizeId } from "@/lib/diasecFrameModels";
import { removeManyFromCart } from "@/lib/cart";

type DraftOrderItem = {
  productName: string;
  sizeId: string;
  sizeLabel: string;
  sizeDetail: string;
  quantity: string;
  unitPrice?: number;
  templateId: string | null;
  photos: Record<string, unknown>[];
  // 장바구니에서 넘어온 항목이면 담겨있던 장바구니 항목 id예요. 주문이 끝나면 이 id로
  // 장바구니에서만 지워요. (주문 테이블에는 저장하지 않아요.)
  cartItemId?: string;
};

declare global {
  interface Window {
    daum: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [roadAddress, setRoadAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [depositorName, setDepositorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<DraftOrderItem[] | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("keepic_draft_order");
    if (!raw) {
      alert("먼저 상품을 선택하고 사진을 올려주세요.");
      router.push("/order");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      // 예전 버전(상품 1개짜리 객체)으로 남아있는 값도 함께 처리해줘요.
      const asArray: DraftOrderItem[] = Array.isArray(parsed) ? parsed : [parsed];
      if (asArray.length === 0) {
        alert("먼저 상품을 선택하고 사진을 올려주세요.");
        router.push("/order");
        return;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing draft order from sessionStorage into React state on first mount
      setItems(asArray);
    } catch (err) {
      console.error(err);
      router.push("/order");
    }
  }, [router]);

  function handleAddressSearch() {
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        setZipCode(data.zonecode);
        setRoadAddress(data.roadAddress);
      },
    }).open();
  }

  const goodsAmount =
    items?.reduce((sum, item) => sum + (item.unitPrice ?? 0) * Number(item.quantity), 0) ?? 0;
  const shippingFee = calcShippingFee(
    (items ?? []).map((item) => ({
      productName: item.productName,
      sizeId: item.sizeId,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice ?? 0,
    }))
  ).totalFee;
  const hasDiasecItem = (items ?? []).some(
    (item) => isDiasecDeskSizeId(item.sizeId) || isDiasecWallSizeId(item.sizeId)
  );
  const finalTotal = goodsAmount + shippingFee;
  // 화면에 보이는 가격은 부가세 포함 금액이라, 최종금액을 기준으로 공급가액·부가세를 역산해요.
  const supplyAmount = Math.round(finalTotal / 1.1);
  const vatAmount = finalTotal - supplyAmount;

  async function handleSubmit() {
    if (!items || items.length === 0) return;

    setIsSubmitting(true);

    const rows = items.map((item, index) => ({
      recipient_name: name,
      phone: phone,
      zip_code: zipCode,
      road_address: roadAddress,
      address_detail: addressDetail,
      depositor_name: depositorName,
      product_name: item.productName,
      size: item.sizeLabel,
      quantity: Number(item.quantity),
      template_id: item.templateId,
      // 여러 상품을 한 번에 주문할 때는, 함께 접수된 다른 상품을 메모로 남겨서
      // 나중에 주문 목록에서 같이 온 건이라는 걸 알아볼 수 있게 해요.
      photos:
        items.length > 1
          ? [
              ...item.photos,
              {
                url: "",
                caption: "",
                note: `[묶음주문 ${index + 1}/${items.length}] 함께 주문한 상품: ${items
                  .map((i) => i.productName)
                  .join(", ")}`,
              },
            ]
          : item.photos,
      // 배송비는 묶음 전체 기준으로 한 번만 계산되니, 중복 집계되지 않도록 첫 번째 상품에만 담아요.
      shipping_fee: index === 0 ? shippingFee : 0,
    }));

    const { error } = await supabase.from("orders").insert(rows);

    setIsSubmitting(false);

    if (error) {
      alert("주문 접수 중 문제가 발생했어요. 다시 시도해주세요.");
      console.error(error);
      return;
    }

    const cartItemIds = items
      .map((item) => item.cartItemId)
      .filter((id): id is string => !!id);
    if (cartItemIds.length > 0) {
      removeManyFromCart(cartItemIds);
    }

    sessionStorage.removeItem("keepic_draft_order");
    router.push("/complete");
  }

  const isFormValid =
    name.trim() !== "" &&
    phone.trim() !== "" &&
    roadAddress.trim() !== "" &&
    depositorName.trim() !== "" &&
    items !== null;

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <Script
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
      />

      <header className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-8 sm:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-hairline)]/30 hover:text-[var(--color-charcoal)]"
        >
          ←
        </button>
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      <section className="mx-auto max-w-lg px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          어디로 보내드릴까요?
        </h1>

        {items && items.length > 0 && (
          <div className="mt-6 rounded-2xl border border-[var(--color-hairline)] bg-white p-5 text-sm">
            <div className="flex flex-col gap-4">
              {items.map((item, index) => {
                const realPhotoCount = item.photos.filter(
                  (p) => typeof p.url === "string" && p.url
                ).length;
                const noteEntry = item.photos.find(
                  (p) => typeof p.note === "string" && p.note
                ) as { note: string } | undefined;

                return (
                  <div
                    key={index}
                    className={index > 0 ? "border-t border-[var(--color-hairline)] pt-4" : ""}
                  >
                    <p className="font-medium">
                      {item.productName} · {item.sizeLabel} · {item.quantity}개
                    </p>
                    {realPhotoCount > 0 && (
                      <p className="mt-1 text-[var(--color-charcoal)]/60">
                        사진 {realPhotoCount}장
                      </p>
                    )}
                    {noteEntry && (
                      <p className="mt-1 break-keep text-[var(--color-charcoal)]/60">
                        요청사항 · {noteEntry.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {goodsAmount > 0 && (
              <>
                <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--color-hairline)] pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[var(--color-charcoal)]/60">상품 금액</p>
                    <p>{goodsAmount.toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[var(--color-charcoal)]/60">배송비</p>
                    <p>
                      {shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}
                    </p>
                  </div>
                  {hasDiasecItem && (
                    <p className="break-keep text-xs text-[var(--color-charcoal)]/50">
                      {DIASEC_SHIPPING_NOTICE}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex flex-col gap-1.5 border-t border-[var(--color-hairline)] pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[var(--color-charcoal)]/60">공급가액</p>
                    <p>{supplyAmount.toLocaleString()}원</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[var(--color-charcoal)]/60">부가세</p>
                    <p>{vatAmount.toLocaleString()}원</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
                  <p className="font-medium">결제예정금액</p>
                  <p className="text-base font-semibold">
                    {finalTotal.toLocaleString()}원
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-6">
          <div>
            <label className="text-sm font-medium">받는 분 성함</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">배송 주소</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={zipCode}
                readOnly
                placeholder="우편번호"
                className="w-28 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-ivory)] px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleAddressSearch}
                className="rounded-lg border border-[var(--color-hairline)] px-4 py-3 text-sm font-medium hover:border-[var(--color-sky)]"
              >
                주소 검색
              </button>
            </div>
            <input
              type="text"
              value={roadAddress}
              readOnly
              placeholder="도로명주소가 여기에 표시돼요"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-[var(--color-ivory)] px-4 py-3 text-sm outline-none"
            />
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="상세주소 (동, 호수 등)"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
          <h2 className="text-lg font-semibold">입금 안내</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]/70 break-keep">
            아래 계좌로 입금해주시면, 확인 후 제작을 시작해요.
          </p>

          <div className="mt-4 rounded-xl bg-[var(--color-ivory)] px-4 py-4 text-sm">
            <p>
              <span className="text-[var(--color-charcoal)]/60">은행</span>{" "}
              <span className="font-medium">카카오뱅크</span>
            </p>
            <p className="mt-1">
              <span className="text-[var(--color-charcoal)]/60">계좌번호</span>{" "}
              <span className="font-medium">3333-37-8953247</span>
            </p>
            <p className="mt-1">
              <span className="text-[var(--color-charcoal)]/60">예금주</span>{" "}
              <span className="font-medium">한혜민(에이치엠38(HM38) 크리에이티브 스튜디오)</span>
            </p>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium">입금하신 분 성함</label>
            <input
              type="text"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="실제 입금하시는 분 성함"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className={`mt-10 rounded-full px-8 py-4 text-sm font-medium text-white transition ${
            isFormValid && !isSubmitting
              ? "bg-[var(--color-sky)] hover:opacity-90"
              : "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
          }`}
        >
          {isSubmitting ? "접수 중..." : "주문 완료하기"}
        </button>
      </section>
    </main>
  );
}
