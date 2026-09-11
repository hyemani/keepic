import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-hairline)] px-6 py-12 text-[var(--color-charcoal)]/60 sm:px-10">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 text-xs sm:grid-cols-2 sm:gap-10">
        <div>
          <p className="font-medium text-[var(--color-charcoal)]/80">교환 및 환불</p>
          <ul className="mt-3 flex flex-col gap-1.5 break-keep">
            <li>· 제작(편집) 시작 전에는 전액 환불이 가능해요.</li>
            <li>· 사진 편집이 시작된 이후에는 주문 제작 상품 특성상 단순 변심으로 인한 교환·환불이 제한될 수 있어요.</li>
            <li>· 인쇄 불량 등 상품 하자가 있는 경우 확인 후 재제작 또는 환불해드려요.</li>
            <li className="text-[var(--color-charcoal)]/40">· 세부 기준과 처리 기간은 준비 중이며, 확정되는 대로 다시 안내드려요.</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-[var(--color-charcoal)]/80">배송 안내</p>
          <ul className="mt-3 flex flex-col gap-1.5 break-keep">
            <li>· 입금 확인 후 제작이 시작되며, 제작 완료 후 택배로 배송돼요.</li>
            <li>· 배송비는 상품 금액과 별도이며, 정확한 금액은 준비 중이에요.</li>
            <li>· 제작·배송 소요 기간은 상품별로 다르며, 확정되는 대로 각 상품 페이지에 안내드려요.</li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-[var(--color-hairline)] pt-6 text-center text-xs">
        <p>Operated by HM38° CREATIVE STUDIO</p>
        <Link href="/login" className="mt-2 inline-block hover:text-[var(--color-sky)]">
          관리자
        </Link>
      </div>
    </footer>
  );
}
