"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  calendarShapes,
  calendarPapers,
  ringColors,
  standColors,
  calendarOrderNotes,
  CalendarShapeId,
  CalendarPaperId,
  RingColorId,
  StandColorId,
  CALENDAR_MIN_PAGES,
  CALENDAR_MAX_PAGES,
  CALENDAR_DEFAULT_PAGES,
} from "@/lib/calendarModels";
import { addToCart } from "@/lib/cart";

const PRODUCT_NAME = "캘린더";

// 모양별 제품 이미지예요. 모양을 바꾸면 아래 갤러리도 그 모양 사진으로 바뀌어요.
const calendarImagesByShape: Record<CalendarShapeId, string[]> = {
  narrow: [
    "/goods/calendar/narrow-1.jpg",
    "/goods/calendar/narrow-2.jpg",
    "/goods/calendar/narrow-3.jpg",
    "/goods/calendar/narrow-4.jpg",
    "/goods/calendar/narrow-5.jpg",
  ],
  small: [
    "/goods/calendar/small-1.jpg",
    "/goods/calendar/small-2.jpg",
    "/goods/calendar/small-3.jpg",
    "/goods/calendar/small-4.jpg",
    "/goods/calendar/small-5.jpg",
  ],
  large: [
    "/goods/calendar/large-1.jpg",
    "/goods/calendar/large-2.jpg",
    "/goods/calendar/large-3.jpg",
    "/goods/calendar/large-4.jpg",
    "/goods/calendar/large-5.jpg",
  ],
  wide: [
    "/goods/calendar/wide-1.jpg",
    "/goods/calendar/wide-2.jpg",
    "/goods/calendar/wide-3.jpg",
    "/goods/calendar/wide-4.jpg",
    "/goods/calendar/wide-5.jpg",
  ],
};

// 모양과 상관없이 이미지 박스는 항상 1:1로 고정해서 보여줘요.
const GALLERY_ASPECT = "aspect-square";

const YEAR_OPTIONS = [2025, 2026, 2027];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const PAGE_OPTIONS = Array.from(
  { length: CALENDAR_MAX_PAGES - CALENDAR_MIN_PAGES + 1 },
  (_, i) => CALENDAR_MIN_PAGES + i
);

function OptionsForm({
  shape,
  setShape,
  paper,
  setPaper,
  ringColor,
  setRingColor,
  standColor,
  setStandColor,
  pageCount,
  setPageCount,
  startYear,
  setStartYear,
  startMonth,
  setStartMonth,
  orderTitle,
  setOrderTitle,
  requestNote,
  setRequestNote,
  quantity,
  setQuantity,
}: {
  shape: CalendarShapeId;
  setShape: (s: CalendarShapeId) => void;
  paper: CalendarPaperId;
  setPaper: (p: CalendarPaperId) => void;
  ringColor: RingColorId;
  setRingColor: (c: RingColorId) => void;
  standColor: StandColorId;
  setStandColor: (c: StandColorId) => void;
  pageCount: number;
  setPageCount: (n: number) => void;
  startYear: number;
  setStartYear: (y: number) => void;
  startMonth: number;
  setStartMonth: (m: number) => void;
  orderTitle: string;
  setOrderTitle: (v: string) => void;
  requestNote: string;
  setRequestNote: (v: string) => void;
  quantity: number;
  setQuantity: (fn: (prev: number) => number) => void;
}) {
  const selectedPaper = calendarPapers.find((p) => p.id === paper)!;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-medium">사이즈</h2>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {calendarShapes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setShape(s.id)}
              className={`relative border px-3 py-3 text-center transition ${
                shape === s.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70"
              }`}
            >
              {s.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[var(--color-sky)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {s.badge}
                </span>
              )}
              <p className="text-sm font-medium">{s.label}</p>
              <p className="mt-0.5 text-[11px] text-[var(--color-charcoal)]/50">
                {s.sizeLabel}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/50">
          {calendarShapes.find((s) => s.id === shape)?.prices[paper].toLocaleString()}원
          부터 시작해요. (선택한 용지 기준)
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">용지</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {calendarPapers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaper(p.id)}
              className={`border px-4 py-3 text-left transition ${
                paper === p.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                  : "border-[var(--color-hairline)]"
              }`}
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-[var(--color-charcoal)]/50">{p.weight}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 break-keep text-xs leading-relaxed text-[var(--color-charcoal)]/50">
          {selectedPaper.desc}
        </p>
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
          삼각 스탠드 색상
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
        <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/50">
          스탠드 하단에 약 20mm의 여유 공간이 있어, 스티커나 라벨을 자유롭게 붙일 수 있어요.
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium">페이지 수</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          최소 13장부터 최대 24장까지 구성할 수 있어요.
        </p>
        <select
          value={pageCount}
          onChange={(e) => setPageCount(Number(e.target.value))}
          className="mt-3 w-full border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
        >
          {PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}장
            </option>
          ))}
        </select>
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
        <h2 className="text-sm font-medium">요청사항</h2>
        <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/50">
          디자인 배치는 Keepic이 직접 작업해요. 원하는 사진 배치나 문구가 있다면
          자유롭게 남겨주세요.
        </p>
        <textarea
          value={requestNote}
          onChange={(e) => setRequestNote(e.target.value)}
          placeholder="예) 1월엔 가족사진, 7월엔 여행 사진으로 넣고 싶어요"
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

      <div>
        <h2 className="text-sm font-medium">사진 업로드 전 확인해주세요</h2>
        <ul className="mt-3 flex flex-col gap-1.5 border border-[var(--color-hairline)] bg-white px-4 py-4 text-xs leading-relaxed text-[var(--color-charcoal)]/70">
          {calendarOrderNotes.map((line, i) => (
            <li key={i}>· {line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [shape, setShape] = useState<CalendarShapeId>("large");
  const [paper, setPaper] = useState<CalendarPaperId>("rendezvous");
  const [ringColor, setRingColor] = useState<RingColorId>("black");
  const [standColor, setStandColor] = useState<StandColorId>("ivory");
  const [pageCount, setPageCount] = useState(CALENDAR_DEFAULT_PAGES);
  const [startYear, setStartYear] = useState(2026);
  const [startMonth, setStartMonth] = useState(1);
  const [orderTitle, setOrderTitle] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState(false);
  const [orderedImages, setOrderedImages] = useState<string[]>(
    calendarImagesByShape.large
  );

  // 모양이 바뀌면 큰 이미지 자리를 그 모양 사진 첫 장으로 되돌려줘요.
  useEffect(() => {
    setOrderedImages(calendarImagesByShape[shape]);
  }, [shape]);

  // 작은 이미지를 누르면 큰 이미지와 자리를 서로 바꿔줘요.
  function handleSelectImage(index: number) {
    setOrderedImages((prev) => {
      const next = [...prev];
      [next[0], next[index]] = [next[index], next[0]];
      return next;
    });
  }

  const selectedShape = calendarShapes.find((s) => s.id === shape)!;
  const unitPrice = selectedShape.prices[paper];
  const totalPrice = unitPrice * quantity;

  const sizeId = useMemo(
    () => `${shape}-${paper}-${ringColor}-${standColor}`,
    [shape, paper, ringColor, standColor]
  );
  const sizeLabel = `${selectedShape.label} · ${
    calendarPapers.find((p) => p.id === paper)?.label
  } · ${ringColors.find((c) => c.id === ringColor)?.label} · ${
    standColors.find((c) => c.id === standColor)?.label
  }`;

  // 주문제목·시작년월·페이지수는 고객이 다음 단계에서 고치지 못하는 자동 메모(colorNote)로
  // 함께 전달하고, 요청사항(note)만 다음 단계에서 자유롭게 다시 고칠 수 있게 해요.
  const colorNote = `${orderTitle} / 시작 ${startYear}년 ${startMonth}월 / ${pageCount}장`;

  const nextUrl = `/upload?product=${encodeURIComponent(
    PRODUCT_NAME
  )}&size=${encodeURIComponent(sizeId)}&quantity=${quantity}&unitPrice=${unitPrice}&note=${encodeURIComponent(
    requestNote
  )}&colorNote=${encodeURIComponent(colorNote)}`;

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
          {/* 이미지: 모양별로 준비된 예시 사진 5장 중 1장을 크게 보여주고, 나머지는
              하단 썸네일로 보여줘요. 네 사이즈를 한꺼번에 보여주기보다 선택한 모양
              사진을 메인으로 걸고, 아래 사이즈 비교 섹션에서 나머지를 비교하도록 구성했어요. */}
          <div>
            <div
              className={`${GALLERY_ASPECT} w-full overflow-hidden bg-[var(--color-hairline)]/20`}
            >
              <img
                src={orderedImages[0] ?? calendarImagesByShape[shape][0]}
                alt={`Keepic 커스텀 탁상 캘린더 · ${selectedShape.label}`}
                className="h-full w-full object-cover"
              />
            </div>

            {orderedImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {orderedImages.slice(1).map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => handleSelectImage(i + 1)}
                    className={`${GALLERY_ASPECT} overflow-hidden border border-[var(--color-hairline)] transition hover:border-[var(--color-sky)]`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* 모바일: 이미지 바로 아래에 이름·가격·사이즈·설명을 바로 보여줘요 */}
            <div className="mt-4 sm:hidden">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-2xl font-semibold">Keepic 커스텀 탁상 캘린더</h1>
              <p className="mt-3 text-2xl font-semibold">
                {totalPrice.toLocaleString()}원
                <span className="ml-2 text-sm font-normal text-[var(--color-charcoal)]/50">
                  ({unitPrice.toLocaleString()}원 × {quantity}개)
                </span>
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
                    {s.badge && (
                      <span className="ml-1 text-[10px] text-[var(--color-sky)]">
                        {s.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p className="mt-4 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                좋아하는 사진으로 만드는 나만의 탁상 캘린더예요. 가족, 아이, 반려동물,
                여행처럼 기억하고 싶은 순간을 매달 꺼내볼 수 있도록 담아보세요.
              </p>
            </div>

            <div className="mt-8 hidden sm:block">
              <p className="break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                좋아하는 사진으로 만드는 나만의 탁상 캘린더예요. 가족, 아이, 반려동물,
                여행처럼 기억하고 싶은 순간을 매달 꺼내볼 수 있도록 담아보세요.
              </p>
            </div>

            {/* 사이즈 비교: 사진 없이도 네 사이즈를 한눈에 비교할 수 있도록 표로 정리했어요 */}
            <div className="mt-10 border-t border-[var(--color-hairline)] pt-8">
              <p className="text-sm font-medium">사이즈 비교</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-hairline)] text-[var(--color-charcoal)]/50">
                      <th className="py-2 pr-3 font-medium">사이즈</th>
                      <th className="py-2 pr-3 font-medium">완성 사이즈</th>
                      <th className="py-2 pr-3 font-medium">
                        {calendarPapers[0].label}
                      </th>
                      <th className="py-2 font-medium">{calendarPapers[1].label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarShapes.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-[var(--color-hairline)]/60"
                      >
                        <td className="py-2.5 pr-3 font-medium">
                          {s.label}
                          {s.badge && (
                            <span className="ml-1.5 bg-[var(--color-sky)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-sky)]">
                              {s.badge}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--color-charcoal)]/70">
                          {s.sizeLabel}
                        </td>
                        <td className="py-2.5 pr-3 text-[var(--color-charcoal)]/70">
                          {s.prices.rendezvous.toLocaleString()}원
                        </td>
                        <td className="py-2.5 text-[var(--color-charcoal)]/70">
                          {s.prices.luster.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 정보 + 옵션 선택 (PC) */}
          <div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[var(--color-sky)]">나만의 굿즈</p>
              <h1 className="mt-2 text-3xl font-semibold">Keepic 커스텀 탁상 캘린더</h1>
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
                paper={paper}
                setPaper={setPaper}
                ringColor={ringColor}
                setRingColor={setRingColor}
                standColor={standColor}
                setStandColor={setStandColor}
                pageCount={pageCount}
                setPageCount={setPageCount}
                startYear={startYear}
                setStartYear={setStartYear}
                startMonth={startMonth}
                setStartMonth={setStartMonth}
                orderTitle={orderTitle}
                setOrderTitle={setOrderTitle}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
                quantity={quantity}
                setQuantity={setQuantity}
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
                shape={shape}
                setShape={setShape}
                paper={paper}
                setPaper={setPaper}
                ringColor={ringColor}
                setRingColor={setRingColor}
                standColor={standColor}
                setStandColor={setStandColor}
                pageCount={pageCount}
                setPageCount={setPageCount}
                startYear={startYear}
                setStartYear={setStartYear}
                startMonth={startMonth}
                setStartMonth={setStartMonth}
                orderTitle={orderTitle}
                setOrderTitle={setOrderTitle}
                requestNote={requestNote}
                setRequestNote={setRequestNote}
                quantity={quantity}
                setQuantity={setQuantity}
              />
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-[var(--color-hairline)] pt-5">
              <p className="text-lg font-semibold">{totalPrice.toLocaleString()}원</p>
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
