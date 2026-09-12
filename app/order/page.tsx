import { Fragment } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const products = [
  {
    name: "액자",
    description: "사진 한 장, 벽에 걸어두는 순간",
    price: "19,000원부터",
    image: "/order/category-frame.jpg",
    href: "/options?product=액자",
    buttonLabel: "액자 만들기",
  },
  {
    name: "포토북",
    description: "여러 장의 사진을 한 권의 이야기로",
    price: "29,000원부터",
    image: "/order/category-photobook.jpg",
    href: "/options?product=포토북",
    buttonLabel: "포토북 만들기",
  },
  {
    name: "나만의 굿즈",
    description: "좋아하는 사진을 매일 쓰는 물건에\n머그컵 · 폰케이스 · 캘린더 · 패브릭 포스터 외",
    price: null,
    image: "/order/category-goods.jpg",
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
          어떤 추억을 만들까요?
        </h1>
        <p className="mt-3 break-keep text-[var(--color-charcoal)]/70">
          사진 속 순간을 원하는 모습으로 간직해보세요.
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {products.map((product) => (
            <div key={product.name} className="flex flex-col">
              <div className="aspect-square overflow-hidden rounded-xl bg-[var(--color-hairline)]/20">
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
              {product.price && (
                <p className="mt-4 text-sm font-medium">{product.price}</p>
              )}
              <Link
                href={product.href}
                className={`rounded-full bg-[var(--color-sky)] py-3 text-center text-sm font-medium text-white transition hover:opacity-90 ${
                  product.price ? "mt-6" : "mt-4"
                }`}
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
