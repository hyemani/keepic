"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { productConfig, ProductName } from "@/lib/productConfig";
import { getShippingFee, calcDiasecShippingFee } from "@/lib/shippingConfig";
import { DIASEC_PRODUCT_NAME, DIASEC_SHIPPING_NOTICE, diasecFrameSizes, diasecGroups } from "@/lib/diasecFrameModels";
import {
  photobookCovers,
  photobookSizes,
  coverCoatingOptions,
  innerPaperOptions,
  DEFAULT_COVER_COATING,
  DEFAULT_INNER_PAPER,
  BASE_PAGES,
  MAX_PAGES,
  MAX_PAGES_NOTE,
  pageSurchargePerStep,
  productionSpec,
  calcEstimatedSpineWidthMm,
  SPINE_REFERENCE_NOTE,
  SPINE_CALCULATOR_REFERENCE_URL,
  calcPagesLabel,
  calcPhotobookPrice,
  type PhotobookCoverId,
  type PhotobookSizeId,
  type CoverCoatingId,
  type InnerPaperId,
} from "@/lib/photobookPricing";

function PhotobookOptions() {
  const searchParams = useSearchParams();
  const coverParam = searchParams.get("cover");
  const initialCover: PhotobookCoverId = coverParam === "hard" ? "hard" : "soft";
  const [cover, setCover] = useState<PhotobookCoverId>(initialCover);
  const [size, setSize] = useState<PhotobookSizeId>("M");
  const [coverCoating, setCoverCoating] = useState<CoverCoatingId>(DEFAULT_COVER_COATING);
  const [innerPaper, setInnerPaper] = useState<InnerPaperId>(DEFAULT_INNER_PAPER);
  const [pages, setPages] = useState(BASE_PAGES);
  const [quantity, setQuantity] = useState(1);
  const [showSpec, setShowSpec] = useState(false);

  const price = useMemo(
    () => calcPhotobookPrice({ cover, size, pages, coverCoating, innerPaper }),
    [cover, size, pages, coverCoating, innerPaper]
  );
  const selectedPaper = innerPaperOptions.find((o) => o.id === innerPaper)!;
  const spineWidth = useMemo(
    () => calcEstimatedSpineWidthMm(selectedPaper.weightG, pages, cover),
    [selectedPaper, pages, cover]
  );

  const total = price.total * quantity;
  const shippingFee = getShippingFee(total);
  const finalTotal = total + shippingFee;
  const sizeInfo = photobookSizes.find((s) => s.id === size)!;

  return (
    <section className="mx-auto max-w-2xl px-6 pb-32 pt-8 sm:px-10">
      <p className="text-sm text-[var(--color-charcoal)]/60">포토북</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">옵션을 선택해주세요</h1>

      {/* 커버 */}
      <h2 className="mt-12 text-lg font-semibold">커버</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {photobookCovers.map((c) => (
          <button
            key={c.id}
            onClick={() => setCover(c.id)}
            className={`rounded-xl border px-4 py-4 text-center transition ${
              cover === c.id
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                : "border-[var(--color-hairline)]"
            }`}
          >
            <p className="font-medium">{c.name}</p>
          </button>
        ))}
      </div>

      {/* 사이즈 */}
      <h2 className="mt-10 text-lg font-semibold">사이즈</h2>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {photobookSizes.map((s) => (
          <button
            key={s.id}
            onClick={() => setSize(s.id)}
            className={`rounded-xl border px-4 py-4 text-center transition ${
              size === s.id
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                : "border-[var(--color-hairline)]"
            }`}
          >
            <p className="font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">{s.finishedSizeCm}</p>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--color-charcoal)]/40 break-keep">
        완성 규격 기준(임시)이에요. 제작 파일 규격은 제작처 확인 후 별도 안내드려요.
      </p>

      {/* 표지 코팅 */}
      <h2 className="mt-10 text-lg font-semibold">표지 코팅</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {coverCoatingOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setCoverCoating(o.id)}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              coverCoating === o.id
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                : "border-[var(--color-hairline)]"
            }`}
          >
            <p className="font-medium">{o.name}</p>
            <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
              {o.description}
            </p>
          </button>
        ))}
      </div>

      {/* 내지 용지 */}
      <h2 className="mt-10 text-lg font-semibold">내지 용지</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {innerPaperOptions.map((o) => (
          <button
            key={o.id}
            onClick={() => setInnerPaper(o.id)}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              innerPaper === o.id
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                : "border-[var(--color-hairline)]"
            }`}
          >
            <p className="font-medium">{o.name}</p>
            <p className="mt-1 text-xs text-[var(--color-charcoal)]/50">{o.spec}</p>
            <p className="mt-1 break-keep text-xs text-[var(--color-charcoal)]/60">
              {o.description}
            </p>
          </button>
        ))}
      </div>

      {/* 페이지 수 */}
      <h2 className="mt-10 text-lg font-semibold">페이지 수</h2>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => setPages((prev) => Math.max(BASE_PAGES, prev - 2))}
          className="h-10 w-10 shrink-0 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          −
        </button>
        <span className="min-w-[9rem] text-center text-lg font-medium">
          {calcPagesLabel(pages)}
        </span>
        <button
          onClick={() => setPages((prev) => Math.min(MAX_PAGES, prev + 2))}
          className="h-10 w-10 shrink-0 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          +
        </button>
      </div>
      <p className="mt-2 break-keep text-xs text-[var(--color-charcoal)]/40">
        기본 {calcPagesLabel(BASE_PAGES)} 포함, 2페이지 단위로 추가할 수 있어요. (
        {pageSurchargePerStep[size].toLocaleString()}원 / 2페이지 추가) {MAX_PAGES_NOTE}
      </p>

      {/* 레이플랫 제본 안내 */}
      <div className="mt-10 rounded-xl border border-[var(--color-hairline)] bg-white p-5">
        <p className="font-medium">레이플랫 제본 (기본 포함)</p>
        <p className="mt-1.5 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
          {productionSpec.binding}
        </p>
      </div>

      {/* 수량 */}
      <h2 className="mt-10 text-lg font-semibold">수량</h2>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
          className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity((prev) => prev + 1)}
          className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          +
        </button>
      </div>

      {/* 가격 요약 */}
      <div className="mt-10 rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
        <p className="text-sm font-medium text-[var(--color-charcoal)]/60">
          {photobookCovers.find((c) => c.id === cover)?.name} · {sizeInfo.label}(
          {sizeInfo.finishedSizeCm}) · {calcPagesLabel(pages)} · {quantity}권
        </p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-[var(--color-charcoal)]/60">기본 판매가</p>
            <p>{price.basePrice.toLocaleString()}원</p>
          </div>
          {price.pageSurcharge > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-charcoal)]/60">페이지 추가금</p>
              <p>+{price.pageSurcharge.toLocaleString()}원</p>
            </div>
          )}
          {price.coatingSurcharge > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-charcoal)]/60">표지 코팅 추가금</p>
              <p>+{price.coatingSurcharge.toLocaleString()}원</p>
            </div>
          )}
          {price.paperSurcharge > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-charcoal)]/60">내지 용지 추가금</p>
              <p>+{price.paperSurcharge.toLocaleString()}원</p>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
            <p className="text-[var(--color-charcoal)]/60">상품 금액 ({quantity}권)</p>
            <p>{total.toLocaleString()}원</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[var(--color-charcoal)]/60">배송비</p>
            <p>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</p>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3 text-base font-semibold">
            <p>최종 결제금액</p>
            <p>{finalTotal.toLocaleString()}원</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-charcoal)]/40 break-keep">
          편집과 기본 수정 1회가 포함된 임시 판매가예요.
        </p>
      </div>

      {/* 제작 사양 상세 */}
      <button
        type="button"
        onClick={() => setShowSpec((v) => !v)}
        className="mt-6 block text-sm text-[var(--color-charcoal)]/60 underline decoration-[var(--color-hairline)] underline-offset-4"
      >
        {showSpec ? "제작 사양 접기" : "제작 사양 자세히 보기"}
      </button>
      {showSpec && (
        <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-[var(--color-hairline)] bg-white p-5 text-xs leading-relaxed text-[var(--color-charcoal)]/60">
          <p>{productionSpec.softCoverPrint}</p>
          <p>{productionSpec.hardCoverPrint}</p>
          <p>내지 인쇄: 양면 컬러 인쇄 ({productionSpec.innerPrint.replace("내지 인쇄: ", "")})</p>
          {spineWidth.isConfirmed ? (
            <p>책등(세네카) 두께: {spineWidth.estimateMm}mm (레드프린팅 실측 확인값)</p>
          ) : (
            <>
              <p>
                책등(세네카) 두께: 약 {spineWidth.minMm}~{spineWidth.maxMm}mm (참고용 예상치)
              </p>
              <p className="text-[var(--color-charcoal)]/40">
                {SPINE_REFERENCE_NOTE}{" "}
                <a
                  href={SPINE_CALCULATOR_REFERENCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  참고 계산기 열기
                </a>
              </p>
            </>
          )}
        </div>
      )}

      <Link
        href={`/template?product=${encodeURIComponent(
          "포토북"
        )}&size=${size}&quantity=${quantity}&unitPrice=${price.total}&cover=${cover}&coverCoating=${coverCoating}&innerPaper=${innerPaper}&pages=${pages}`}
        className="mt-12 block w-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-8 py-4 text-center text-sm font-medium text-white transition hover:opacity-90 sm:inline-block sm:w-auto"
      >
        사진 선택하기
      </Link>
    </section>
  );
}

function OtherProductOptions({ productName }: { productName: ProductName }) {
  const config = productConfig[productName];
  const isDiasec = productName === DIASEC_PRODUCT_NAME;
  const searchParams = useSearchParams();

  // 디아섹 아크릴액자는 사이즈가 16개나 돼서 한 화면에 다 보여주면 복잡해요.
  // "거치방식/재질"(3개) → "마감"(2개) → "사이즈" 순으로 단계를 나눠서 골라요.
  // /frames에서 특정 마감 카드를 눌러서 들어온 경우, finish 쿼리로 그 마감이
  // 바로 선택된 상태로 열려요.
  const finishParam = isDiasec ? searchParams.get("finish") : null;
  const groupFromFinish = finishParam
    ? diasecGroups.find((g) => g.finishLabels.includes(finishParam))
    : undefined;
  const [diasecGroupKey, setDiasecGroupKey] = useState(
    groupFromFinish?.key ?? diasecGroups[0].key
  );
  const diasecGroup = diasecGroups.find((g) => g.key === diasecGroupKey) ?? diasecGroups[0];
  const [diasecFinishLabel, setDiasecFinishLabel] = useState(
    (groupFromFinish && finishParam) || diasecGroup.finishLabels[0]
  );
  const diasecSizesForFinish = diasecFrameSizes.filter(
    (s) => s.finishLabel === diasecFinishLabel
  );

  const [selectedSize, setSelectedSize] = useState<string>(
    isDiasec ? diasecSizesForFinish[0]?.id ?? config.sizes[0].id : config.sizes[1].id
  );
  const [quantity, setQuantity] = useState(1);

  const selectedSizeInfo = config.sizes.find((s) => s.id === selectedSize);
  // 판매가가 있는 상품(디아섹 아크릴액자 등)만 unitPrice가 채워져요.
  // 아직 가격이 붙지 않은 상품은 이전과 동일하게 0으로 넘어가요(동작 변화 없음).
  const unitPrice = selectedSizeInfo?.price ?? 0;
  const total = unitPrice * quantity;
  // 디아섹 아크릴액자는 탁상용/벽걸이 구분과 수량에 따라 배송비를 바로 계산해서 보여줘요.
  const diasecDeskQuantity = isDiasec && selectedSizeInfo?.mount === "desk" ? quantity : 0;
  const diasecWallQuantity = isDiasec && selectedSizeInfo?.mount === "wall" ? quantity : 0;
  const shippingFee = isDiasec
    ? calcDiasecShippingFee(diasecDeskQuantity, diasecWallQuantity)
    : getShippingFee(total);

  const nextUrl =
    config.maxPhotos > 1
      ? `/template?product=${encodeURIComponent(
          productName
        )}&size=${selectedSize}&quantity=${quantity}&unitPrice=${unitPrice}`
      : `/upload?product=${encodeURIComponent(
          productName
        )}&size=${selectedSize}&quantity=${quantity}&unitPrice=${unitPrice}`;

  const handleDiasecGroupSelect = (key: string) => {
    setDiasecGroupKey(key);
    const nextGroup = diasecGroups.find((g) => g.key === key);
    if (!nextGroup) return;
    const nextFinish = nextGroup.finishLabels[0];
    setDiasecFinishLabel(nextFinish);
    const firstSize = diasecFrameSizes.find((s) => s.finishLabel === nextFinish);
    if (firstSize) setSelectedSize(firstSize.id);
  };

  const handleDiasecFinishSelect = (label: string) => {
    setDiasecFinishLabel(label);
    const firstSize = diasecFrameSizes.find((s) => s.finishLabel === label);
    if (firstSize) setSelectedSize(firstSize.id);
  };

  return (
    <section className="mx-auto max-w-2xl px-6 pb-24 pt-8 sm:px-10">
      <p className="text-sm text-[var(--color-charcoal)]/60">{productName}</p>
      <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">옵션을 선택해주세요</h1>

      {isDiasec ? (
        <>
          <h2 className="mt-12 text-lg font-semibold">종류</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {diasecGroups.map((group) => (
              <button
                key={group.key}
                onClick={() => handleDiasecGroupSelect(group.key)}
                className={`rounded-xl border px-3 py-4 text-center transition ${
                  diasecGroupKey === group.key
                    ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                    : "border-[var(--color-hairline)]"
                }`}
              >
                <p className="text-sm font-medium">{group.label}</p>
              </button>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-semibold">마감</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {diasecGroup.finishLabels.map((label) => (
              <button
                key={label}
                onClick={() => handleDiasecFinishSelect(label)}
                className={`rounded-xl border px-4 py-4 text-center transition ${
                  diasecFinishLabel === label
                    ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                    : "border-[var(--color-hairline)]"
                }`}
              >
                <p className="text-sm font-medium">{label.replace(diasecGroup.label, "").trim() || label}</p>
              </button>
            ))}
          </div>

          <h2 className="mt-10 text-lg font-semibold">사이즈</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {diasecSizesForFinish.map((size) => (
              <button
                key={size.id}
                onClick={() => setSelectedSize(size.id)}
                className={`rounded-xl border px-4 py-4 text-center transition ${
                  selectedSize === size.id
                    ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10"
                    : "border-[var(--color-hairline)]"
                }`}
              >
                <p className="font-medium">{size.sizeLabel}</p>
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">
                  {size.price.toLocaleString()}원
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-12 text-lg font-semibold">사이즈</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/60">{size.detail}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-10 text-lg font-semibold">수량</h2>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
          className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity((prev) => prev + 1)}
          className="h-10 w-10 rounded-full border border-[var(--color-hairline)] text-lg"
        >
          +
        </button>
      </div>

      {unitPrice > 0 && (
        <div className="mt-10 rounded-2xl border border-[var(--color-hairline)] bg-white p-6">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-charcoal)]/60">판매가</p>
              <p>{unitPrice.toLocaleString()}원</p>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
              <p className="text-[var(--color-charcoal)]/60">상품 금액 ({quantity}개)</p>
              <p className="text-base font-semibold">{total.toLocaleString()}원</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[var(--color-charcoal)]/60">배송비</p>
              <p>{shippingFee === 0 ? "무료" : `${shippingFee.toLocaleString()}원`}</p>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-hairline)] pt-3">
              <p className="text-[var(--color-charcoal)]/60">결제 예정 금액</p>
              <p className="text-base font-semibold">{(total + shippingFee).toLocaleString()}원</p>
            </div>
          </div>
          {isDiasec && (
            <p className="mt-3 break-keep text-xs text-[var(--color-charcoal)]/50">
              {DIASEC_SHIPPING_NOTICE}
            </p>
          )}
        </div>
      )}

      <Link
        href={nextUrl}
        className="mt-12 inline-block rounded-full bg-[var(--color-charcoal)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
      >
        다음
      </Link>
    </section>
  );
}

function OptionsPageContent() {
  const searchParams = useSearchParams();
  const productName = (searchParams.get("product") ?? "포토북") as ProductName;
  const isPhotobook = productName === "포토북";

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      {isPhotobook ? <PhotobookOptions /> : <OtherProductOptions productName={productName} />}
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
