import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const products = [
  {
    name: "액자",
    description: "사진 한 장, 벽에 걸어두는 순간",
    price: "19,000원부터",
    swatch: "bg-[var(--color-sky)]/20",
    href: "/options?product=액자",
    ready: true,
  },
  {
    name: "포토북",
    description: "여러 장의 사진을 한 권의 책으로",
    price: "29,000원부터",
    swatch: "bg-[var(--color-charcoal)]/10",
    href: "/options?product=포토북",
    ready: true,
  },
  {
    name: "나만의 굿즈",
    description: "머그컵, 폰케이스 같은 사진 소품",
    price: "준비 중",
    swatch: "bg-[var(--color-sky)]/30",
    href: "/goods",
    ready: false,
  },
];

export default function OrderPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          어떤 걸 만들어볼까요?
        </h1>
        <p className="mt-3 text-[var(--color-charcoal)]/70 break-keep">
          사진을 어떻게 남기고 싶은지 골라주세요.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="flex flex-col rounded-2xl border border-[var(--color-hairline)] p-6"
            >
              <div className={`aspect-square rounded-xl ${product.swatch}`} />
              <h2 className="mt-6 text-xl font-semibold">{product.name}</h2>
              <p className="mt-2 text-sm text-[var(--color-charcoal)]/70">
                {product.description}
              </p>
              <p className="mt-4 text-sm font-medium">{product.price}</p>
              <Link
                href={product.href}
                className="mt-6 rounded-full bg-[var(--color-sky)] py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                {product.ready ? "선택하기" : "둘러보기"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}