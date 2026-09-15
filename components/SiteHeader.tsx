"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CartBadge from "./CartBadge";

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
    <header className="bg-white">
      {/* 첫째 줄: 로고(화면 정중앙) + 오른쪽 계정 메뉴 — 스크롤하면 이 줄은 같이 올라가요 */}
      <div className="relative mx-auto flex max-w-7xl items-center justify-end px-6 py-4 sm:px-10">
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </Link>

        {/* PC 우측: 주문 조회 / 장바구니 / 제작 신청 (작고 간결하게) */}
        <div className="hidden items-center gap-5 text-sm sm:flex">
          <Link href="/order-lookup" className="text-[var(--color-charcoal)]/70 hover:text-[var(--color-sky)]">
            주문 조회
          </Link>
          <CartBadge className="text-[var(--color-charcoal)]/70 hover:text-[var(--color-sky)]" />
          <Link
            href="/order"
            className="rounded-full border border-[var(--color-sky)] px-4 py-1.5 text-[var(--color-sky)] transition hover:bg-[var(--color-sky)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]"
          >
            만들기 시작
          </Link>
        </div>

        {/* 모바일: 왼쪽 메뉴 아이콘 / 오른쪽 장바구니 (로고는 absolute로 가운데 고정) */}
        <div className="flex w-full items-center justify-between sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="전체 메뉴 열기"
            className="flex items-center text-[var(--color-charcoal)]/70"
          >
            <span className="text-xl leading-none">≡</span>
          </button>
          <CartBadge className="text-[var(--color-charcoal)]/70" />
        </div>
      </div>

      {/* 둘째 줄: 상품 메뉴 — 스크롤하면 이 줄만 상단에 고정돼요 */}
      <nav className="sticky top-0 z-40 hidden border-t border-[var(--color-hairline)] bg-white sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-6 py-3 text-[15px] sm:px-10">
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
          <Link
            href="/cases"
            className={
              isActive("/cases") ? "text-[var(--color-sky)]" : "hover:text-[var(--color-sky)]"
            }
          >
            디자인 예시
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
        </div>
      </nav>

      {/* 모바일 전체 메뉴 오버레이: 주문 조회·제작 신청도 이 안에서 찾을 수 있어요 */}
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
              <Link href="/cases" onClick={() => setMenuOpen(false)}>디자인 예시</Link>
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
                href="/cart"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-[var(--color-hairline)] py-3.5 text-center text-sm font-medium"
              >
                장바구니
              </Link>
              <Link
                href="/order-lookup"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-[var(--color-hairline)] py-3.5 text-center text-sm font-medium"
              >
                주문 조회
              </Link>
              <Link
                href="/order"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-[var(--color-sky)] py-3.5 text-center text-sm font-medium text-white"
              >
                만들기 시작
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
