import { Fragment } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { photobookBasePrice, photobookSizes, BASE_PAGES } from "@/lib/photobookPricing";

// 포토북 최저가는 실제 가격 설정 파일(사이즈 S · 소프트커버) 값을 그대로 가져와요.
// 숫자를 여기서 임의로 바꾸지 말고, lib/photobookPricing.ts에서 관리해주세요.
const photobookMinPrice = photobookBasePrice.soft.S;
const photobookMinSize = photobookSizes[0];
const photobookPriceNote = `${photobookMinSize.label} 사이즈 · 소프트커버 · 기본 ${BASE_PAGES}페이지 기준`;

const products = [
  {
    name: "포토북",
    description: "여러 장의 사진을 한 권의 이야기로",
    price: `${photobookMinPrice.toLocaleString()}원부터`,
    priceNote: photobookPriceNote,
    image: "/order/category-photobook.jpg",
    href: "/options?product=포토북",
    buttonLabel: "포토북 만들기",
  },
  {
    name: "액자",
    description: "사진 한 장, 벽에 걸어두는 순간",
    // 액자는 아직 사이즈별 실제 판매가가 정해지지 않아서, 가격 문구를 넣지 않았어요.
    // (이전에 있던 "19,000원부터"는 실제 옵션·결제 로직과 연결된 값이 아니었어요.)
    price: null,
    priceNote: null,
    image: "/order/category-frame.jpg",
    href: "/options?product=액자",
    buttonLabel: "액자 만들기",
  },
  {
    name: "나만의 굿즈",
    description: "좋아하는 사진을 매일 쓰는 물건에\n머그컵 · 폰케이스 · 캘린더 · 패브릭 포스터 외",
    price: null,
    priceNote: null,
    // 여러 상품이 섞인 기존 이미지에는 판매하지 않는 키링이 함께 나와 있어서,
    // 우선 실제로 판매 중인 머그컵 사진으로 바꿔뒀어요. 여러 상품을 한 장에 담은
    // 새 대표 사진이 준비되면 다시 바꿔주세요.
    image: "/goods/mug/main-1.jpg",
    href: "/goods",
    buttonLabel: "굿즈 둘러보기",
  },
];

export default function OrderPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          추억을 어떤 모습으로 간직할까요?
        </h1>
        <p className="mt-3 break-keep text-[var(--color-charcoal)]/70">
          포토북, 액자, 굿즈 중 원하는 상품을 골라보세요.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {products.map((product) => (
            <div key={product.name} className="flex h-full flex-col">
              <div className="aspect-square overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-hairline)]/20">
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <h2 className="mt-6 text-xl font-semibold">{product.name}</h2>
              <p className="mt-2 break-keep text-sm text-[var(--color-charcoal)]/70">
                {product.description.split("\n").map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </p>

              {/* 설명·가격 영역 높이를 카드마다 맞춰서, 버튼이 같은 가로선에 놓이도록 해요 */}
              <div className="flex-1">
                {product.price && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">{product.price}</p>
                    {product.priceNote && (
                      <p className="mt-0.5 text-xs text-[var(--color-charcoal)]/55">
                        {product.priceNote}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Link
                href={product.href}
                className="mt-6 rounded-full bg-[var(--color-sky)] py-3 text-center text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
              >
                {product.buttonLabel}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
