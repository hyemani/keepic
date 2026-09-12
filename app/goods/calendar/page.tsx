"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  calendarShapes,
  ringColors,
  standColors,
  CalendarShapeId,
  RingColorId,
  StandColorId,
  CALENDAR_BASE_PRICE,
} from "@/lib/calendarModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "캘린더";

const YEAR_OPTIONS = [2025, 2026, 2027];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function OptionsForm({
  shape,
  setShape,
  ringColor,
  setRingColor,
  standColor,
  setStandColor,
  startYear,
  setStartYear,
  startMonth,
  setStartMonth,
  orderTitle,
  setOrderTitle,
  quantity,
  setQuantity,
}: {
  shape: CalendarShapeId;
  setShape: (s: CalendarShapeId) => void;
  ringColor: RingColorId;
  setRingColor: (c: RingColorId) => void;
  standColor: StandColorId;
  setStandColor: (c: StandColorId) => void;
  startYear: number;
  setStartYear: (y: number) => void;
  startMonth: number;
  setStartMonth: (m: number) => void;
  orderTitle: string;
  setOrderTitle: (v: string) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">모양</h2>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {calendarShapes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShape(s.id)}
              className={`border px-3 py-3 text-center text-sm font-medium transition ${
                shape === s.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/50">
          {calendarShapes.find((s) => s.id === shape)?.detail}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">용지</h2>
        <div className="mt-3 border border-[var(--color-hairline)] bg-white px-4 py-4 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
          <p>랑데뷰울트라화이트 · 240g</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">모양 선택</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          디자인 이미지는 추후 첨부 예정이에요. (1:1 사이즈)
        </p>
        <button
          type="button"
          disabled
          className="mt-3 w-full cursor-not-allowed border border-dashed border-[var(--color-sky)]/50 px-4 py-3 text-sm font-medium text-[var(--color-sky)]/60"
        >
          + 모양 선택 (준비중)
        </button>
      </div>

      <div>
        <h2 className="text-sm font-medium">후가공 선택</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          필요한 옵션을 골라주세요.
        </p>

        <p className="mt-4 text-xs font-medium text-[var(--color-charcoal)]/70">
          트윈링 컬러
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {ringColors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setRingColor(c.id)}
              className={`border px-2 py-2.5 text-xs font-medium transition ${
                ringColor === c.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-[var(--color-charcoal)]/70">
          삼각대 색상
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {standColors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setStandColor(c.id)}
              className={`border px-2 py-2.5 text-xs font-medium transition ${
                standColor === c.id
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
        <h2 className="text-sm font-medium">시작 년도/월</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          선택하신 달부터 12달 캘린더가 제공돼요.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
            className="border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            value={startMonth}
            onChange={(e) => setStartMonth(Number(e.target.value))}
            className="border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium">주문제목</h2>
        <input
          type="text"
          value={orderTitle}
          onChange={(e) => setOrderTitle(e.target.value)}
          placeholder="예) 2026년 우리집 캘린더"
          className="mt-3 w-full border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
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

export default function CalendarPage() {
  const [shape, setShape] = useState<CalendarShapeId>("wide");
  const [ringColor, setRingColor] = useState<RingColorId>("black");
  const [standColor, setStandColor] = useState<StandColorId>("ivory");
  const [startYear, setStartYear] = useState(2026);
  const [startMonth, setStartMonth] = useState(1);
  const [orderTitle, setOrderTitle] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);

  const selectedShape = calendarShapes.find((s) => s.id === shape)!;
  const unitPrice = CALENDAR_BASE_PRICE;
  const totalPrice = unitPrice * quantity;

  const sizeId = useMemo(
    () => `${shape}-${ringColor}-${standColor}`,
    [shape, ringColor, standColor]
  );
  const sizeLabel = `${selectedShape.label} · ${
    ringColors.find((c) => c.id === ringColor)?.label
  } · ${standColors.find((c) => c.id === standColor)?.label}`;

  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}&unitPrice=${unitPrice}&note=${encodeURIComponent(
    `${orderTitle} / 시작 ${startYear}년 ${startMonth}월`
  )}`;

  function handleAddToCart() {
    addToCart({
      productName: PRODUCT_NAME,
      sizeId,
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
          {/* 이미지: 아직 실제 사진이 없어서 1:1 자리만 잡아뒀어요 */}
          <div>
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 border border-dashed border-[var(--color-hairline)] bg-[var(--color-hairline)]/10 text-[var(--color-charcoal)]/40">
              <span className="text-sm">이미지 준비중</span>
              <span className="text-xs">1:1 사이즈</span>
            </div>

            {/* 모바일: 이미지 바로 아래에 이름·가격·모양·설명을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">디자인 탁상용 캘린더</h1>
              <p className="mt-3 text-2xl font-semibold">
                {unitPrice > 0 ? (
                  <>
                    {totalPrice.toLocaleString()}원
                    <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                      ({unitPrice.toLocaleString()}원 × {quantity}개)
                    </span>
                  </>
                ) : (
                  <span className="text-base font-normal text-[var(--color-charcoal)]/50">
                    가격 준비중
                  </span>
                )}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {calendarShapes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={`border px-2 py-2.5 text-xs font-medium transition ${
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
                트윙링 제본 탁상용 캘린더예요. 모양·트윈링 컬러·삼각대 색상을 골라
                나만의 캘린더를 만들어보세요.
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                트윙링 제본 탁상용 캘린더예요. 모양·트윈링 컬러·삼각대 색상을 골라
                나만의 캘린더를 만들어보세요.
              </p>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-3xl font-semibold">디자인 탁상용 캘린더</h1>
              <p className="mt-3 text-2xl font-semibold">
                {unitPrice > 0 ? (
                  <>
                    {totalPrice.toLocaleString()}원
                    <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                      ({unitPrice.toLocaleString()}원 × {quantity}개)
                    </span>
                  </>
                ) : (
                  <span className="text-base font-normal text-[var(--color-charcoal)]/50">
                    가격 준비중
                  </span>
                )}
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <OptionsForm
                shape={shape}
                setShape={setShape}
                ringColor={ringColor}
                setRingColor={setRingColor}
                standColor={standColor}
                setStandColor={setStandColor}
                startYear={startYear}
                setStartYear={setStartYear}
                startMonth={startMonth}
                setStartMonth={setStartMonth}
                orderTitle={orderTitle}
                setOrderTitle={setOrderTitle}
                quantity={quantity}
                setQuantity={setQuantity}
              />

              <div className="mt-10 flex items-center justify-between border-t border-[var(--color-hairline)] pt-6">
                <span className="text-sm font-medium text-[var(--color-charcoal)]/70">
                  청구금액
                </span>
                <div className="text-right">
                  {unitPrice > 0 ? (
                    <>
                      <span className="mr-2 text-sm text-[var(--color-charcoal)]/50">
                        개당 {unitPrice.toLocaleString()}원
                      </span>
                      <span className="text-xl font-semibold">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-charcoal)]/50">
                      가격 준비중
                    </span>
                  )}
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
                아직 준비중인 상품이에요. 이미지와 가격이 확정되는 대로 바로 주문하실 수 있게 열어드릴게요.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* 모바일 전용: 하단 고정 바 → 탭하면 옵션 선택 팝업이 아래에서 열림 */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-[var(--color-hairline)] bg-white px-6 py-4 sm:hidden">
        <div>
          <p className="text-lg font-semibold">
            {unitPrice > 0 ? `${totalPrice.toLocaleString()}원` : "가격 준비중"}
          </p>
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
                ringColor={ringColor}
                setRingColor={setRingColor}
                standColor={standColor}
                setStandColor={setStandColor}
                startYear={startYear}
                setStartYear={setStartYear}
                startMonth={startMonth}
                setStartMonth={setStartMonth}
                orderTitle={orderTitle}
                setOrderTitle={setOrderTitle}
                quantity={quantity}
                setQuantity={setQuantity}
              />
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--color-hairline)] pt-5">
              <p className="text-lg font-semibold">
                {unitPrice > 0 ? `${totalPrice.toLocaleString()}원` : "가격 준비중"}
              </p>
              <Link
                href={nextUrl}
                className="bg-[var(--color-sky)] px-8 py-4 text-center text-sm font-medium text-white transition hover:opacity-90"
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
