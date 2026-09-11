"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const KAKAO_URL = "https://pf.kakao.com/_FpGfX";

const primaryLinks = [
  { href: "/photobook", label: "포토북" },
  { href: "/frames", label: "액자" },
  { href: "/goods", label: "나만의 굿즈" },
];

const guideLinks = [
  { href: "/guide", label: "제작 과정" },
  { href: "/faq", label: "자주 묻는 질문" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="relative mx-auto max-w-7xl px-6 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Link href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </Link>

        {/* PC 메뉴 */}
        <nav className="hidden items-center gap-8 text-[15px] sm:flex">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? "text-[var(--color-sky)]"
                  : "hover:text-[var(--color-sky)]"
              }
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cases"
            className={
              isActive("/cases")
                ? "text-[var(--color-sky)]"
                : "hover:text-[var(--color-sky)]"
            }
          >
            디자인 샘플
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setGuideOpen(true)}
            onMouseLeave={() => setGuideOpen(false)}
          >
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1 hover:text-[var(--color-sky)]"
            >
              이용 안내
              <span
                className={`text-[10px] transition-transform ${guideOpen ? "rotate-180" : ""}`}
              >
                ▾
              </span>
            </button>
            {guideOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-40 rounded-xl border border-[var(--color-hairline)] bg-white py-2 shadow-[0_10px_30px_-10px_rgba(45,55,72,0.2)]">
                {guideLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-sm hover:bg-[var(--color-ivory)] hover:text-[var(--color-sky)]"
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href={KAKAO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-sm hover:bg-[var(--color-ivory)] hover:text-[var(--color-sky)]"
                >
                  문의하기
                </a>
              </div>
            )}
          </div>
        </nav>

        {/* PC 우측 */}
        <div className="hidden items-center gap-5 sm:flex">
          <Link href="/order-lookup" className="text-[15px] hover:text-[var(--color-sky)]">
            나의 주문
          </Link>
          <Link
            href="/order"
            className="rounded-full bg-[var(--color-sky)] px-5 py-2.5 text-[15px] font-medium text-white transition hover:opacity-90"
          >
            제작 신청
          </Link>
        </div>

        {/* 모바일: 나의 주문 + 전체 메뉴 */}
        <div className="flex items-center gap-4 sm:hidden">
          <Link href="/order-lookup" className="text-[13px] text-[var(--color-charcoal)]/70">
            나의 주문
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="전체 메뉴 열기"
            className="flex items-center text-[var(--color-charcoal)]/70"
          >
            <span className="text-xl leading-none">≡</span>
          </button>
        </div>
      </div>

      {/* 모바일 전용: 포토북 / 액자 / 나만의 굿즈 균등 배치 */}
      <nav className="-mx-6 mt-5 grid grid-cols-3 border-t border-[var(--color-hairline)] px-4 pt-3 text-center text-[12px] tracking-tight text-[var(--color-charcoal)]/70 sm:hidden">
        {primaryLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href) ? "text-[var(--color-sky)]" : "hover:text-[var(--color-sky)]"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* 모바일 전체 메뉴 오버레이 */}
      {menuOpen && (
        <div className="fixed inset-0 z-[70] bg-[var(--color-ivory)] sm:hidden">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="전체 메뉴 닫기"
                className="text-2xl leading-none text-[var(--color-charcoal)]/70"
              >
                ×
              </button>
            </div>

            <nav className="mt-10 flex flex-col gap-6 text-lg font-medium">
              <Link href="/photobook" onClick={() => setMenuOpen(false)}>포토북</Link>
              <Link href="/frames" onClick={() => setMenuOpen(false)}>액자</Link>
              <Link href="/goods" onClick={() => setMenuOpen(false)}>나만의 굿즈</Link>
              <Link href="/cases" onClick={() => setMenuOpen(false)}>디자인 샘플</Link>
              <div className="mt-2 border-t border-[var(--color-hairline)] pt-6">
                <p className="text-sm text-[var(--color-charcoal)]/50">이용 안내</p>
                <div className="mt-4 flex flex-col gap-5">
                  <Link href="/guide" onClick={() => setMenuOpen(false)}>제작 과정</Link>
                  <Link href="/faq" onClick={() => setMenuOpen(false)}>자주 묻는 질문</Link>
                  <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer">
                    문의하기
                  </a>
                </div>
              </div>
            </nav>

            <div className="mt-10 flex flex-col gap-3">
              <Link
                href="/order-lookup"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-[var(--color-hairline)] py-3.5 text-center text-sm font-medium"
              >
                나의 주문
              </Link>
              <Link
                href="/order"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-[var(--color-sky)] py-3.5 text-center text-sm font-medium text-white"
              >
                제작 신청
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
