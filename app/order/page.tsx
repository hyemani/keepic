import Link from "next/link";

const products = [
  {
    name: "액자",
    description: "사진 한 장, 벽에 걸어두는 순간",
    price: "19,000원부터",
    swatch: "bg-[var(--color-sky)]/20",
  },
  {
    name: "포토북",
    description: "여러 장의 사진을 한 권의 책으로",
    price: "29,000원부터",
    swatch: "bg-[var(--color-charcoal)]/10",
  },
  {
    name: "나만의 앨범",
    description: "직접 꾸미는 나만의 사진첩",
    price: "35,000원부터",
    swatch: "bg-[var(--color-sky)]/30",
  },
];

export default function OrderPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
        <nav className="hidden gap-8 text-sm sm:flex">
          <a href="#" className="hover:text-[var(--color-sky)]">만드는 과정</a>
          <a href="#" className="hover:text-[var(--color-sky)]">상품</a>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          어떤 걸 만들어볼까요?
        </h1>
        <p className="mt-3 text-[var(--color-charcoal)]/70">
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
                href={`/options?product=${encodeURIComponent(product.name)}`}
                className="mt-6 rounded-full bg-[var(--color-sky)] py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
              >
                선택하기
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--color-hairline)] px-6 py-8 text-center text-xs text-[var(--color-charcoal)]/50 sm:px-10">
        Operated by HM38° CREATIVE STUDIO
      </footer>
    </main>
  );
}