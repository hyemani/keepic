"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function SiteHeader({
  // true면 포토북/액자/나만의 굿즈 페이지처럼 대표 이미지 위에 헤더가 투명하게
  // 겹쳐 있다가, 스크롤하면 흰 배경으로 부드럽게 바뀌는 방식으로 동작해요.
  // 다른 페이지는 지금처럼 항상 흰 배경 고정 헤더로 그대로 있어요.
  overlayHero = false,
  // 상단 그라데이션 색을 기본 흰색 대신 대표 이미지 색과 맞추고 싶을 때
  // "r,g,b" 형태로 넘겨요(예: "84,60,184"). 안 넘기면 기존 흰색 그대로예요.
  heroTintRgb,
}: {
  overlayHero?: boolean;
  heroTintRgb?: string;
} = {}) {
  const pathname = usePathname();
  const [guideOpen, setGuideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    if (!overlayHero) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayHero]);

  const headerClassName = overlayHero
    ? `fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--color-hairline)] bg-white/95 backdrop-blur-sm"
          : "border-b border-transparent bg-transparent"
      }`
    : "relative bg-white";

  // 색이 있는 대표 이미지(heroTintRgb) 위에서 스크롤하기 전이면 로고·메뉴 글씨를
  // 모두 흰색으로, 스크롤해서 흰 배경 헤더가 되면 원래 색(검정 로고·차콜 글씨)으로 바꿔요.
  const lightHeader = Boolean(heroTintRgb) && !scrolled;
  const headerLogoSrc = lightHeader ? "/logo-white.png" : "/logo.svg";

  // 메뉴 글씨 공통 스타일: PC 16px, 중간 굵기 — 배경 사진 위에서도 잘 읽히도록.
  const navLinkBase = lightHeader
    ? "font-medium text-white hover:text-white/80"
    : "font-medium text-[var(--color-charcoal)] hover:text-[var(--color-sky)]";
  const navLinkActive = lightHeader
    ? "text-white underline underline-offset-4 decoration-2"
    : "text-[var(--color-sky)] underline underline-offset-4 decoration-2";
  const accountLinkClass = lightHeader
    ? "font-medium text-white hover:text-white/80"
    : "font-medium text-[var(--color-charcoal)] hover:text-[var(--color-sky)]";
  const orderButtonClass = lightHeader
    ? "rounded-full border border-white px-4 py-1.5 text-white transition hover:bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] hover:border-transparent hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    : "rounded-full border border-[var(--color-sky)] px-4 py-1.5 text-[var(--color-sky)] transition hover:bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sky)]";
  const mobileIconClass = lightHeader
    ? "font-medium text-white"
    : "font-medium text-[var(--color-charcoal)]";
  const guideButtonClass = lightHeader
    ? "flex items-center gap-1 font-medium text-white hover:text-white/80"
    : "flex items-center gap-1 font-medium text-[var(--color-charcoal)] hover:text-[var(--color-sky)]";

  return (
    <header className={headerClassName}>
      {/* 이미지 위에 겹칠 때만: 로고·메뉴 영역에 은은한 반투명 흰색 그라데이션을 깔아요.
          네모 박스 느낌이 나지 않도록 아래로 갈수록 자연스럽게 투명해지고,
          스크롤해서 완전한 흰 배경이 되면 이 그라데이션은 사라져요. */}
      {overlayHero && (
        <div
          aria-hidden
          style={
            heroTintRgb
              ? {
                  background: `linear-gradient(to bottom, rgba(${heroTintRgb},0.85), rgba(${heroTintRgb},0.35), transparent)`,
                }
              : undefined
          }
          className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-44 transition-opacity duration-300 sm:h-56 ${
            heroTintRgb ? "" : "bg-gradient-to-b from-white/85 via-white/35 to-transparent"
          } ${scrolled ? "opacity-0" : "opacity-100"}`}
        />
      )}

      {/* 첫째 줄: 로고(화면 정중앙) + 오른쪽 계정 메뉴 — 스크롤하면 이 줄은 같이 올라가요 */}
      <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-end px-6 py-4 sm:px-10">
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          {/* 대표 이미지 색이 있는 페이지(예: 홈)에서 스크롤하기 전에는 흰색 로고,
              흰 배경 헤더가 되면 원래 검정 로고로 자연스럽게 바뀌어요. */}
          <img
            src={headerLogoSrc}
            alt="Keepic"
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        {/* PC 우측: 주문 조회 / 장바구니 / 제작 신청 (작고 간결하게) */}
        <div className="hidden items-center gap-5 text-sm sm:flex">
          <Link href="/order-lookup" className={accountLinkClass}>
            주문 조회
          </Link>
          <CartBadge className={accountLinkClass} />
          <Link href="/order" className={orderButtonClass}>
            만들기 시작
          </Link>
        </div>

        {/* 모바일: 왼쪽 메뉴 아이콘 / 오른쪽 장바구니 (로고는 absolute로 가운데 고정) */}
        <div className="flex w-full items-center justify-between sm:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="전체 메뉴 열기"
            className={`flex items-center ${mobileIconClass}`}
          >
            <span className="text-xl leading-none">≡</span>
          </button>
          <CartBadge className={mobileIconClass} />
        </div>
      </div>

      {/* 둘째 줄: 상품 메뉴 — 스크롤하면 이 줄만 상단에 고정돼요 */}
      <nav
        className={
          overlayHero
            ? `relative z-10 hidden border-t sm:block ${
                scrolled
                  ? "border-[var(--color-hairline)] bg-white"
                  : "border-transparent bg-transparent"
              }`
            : "sticky top-0 z-40 hidden border-t border-[var(--color-hairline)] bg-white sm:block"
        }
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 px-6 py-3 text-base sm:px-10">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isActive(link.href) ? navLinkActive : navLinkBase}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/cases"
            className={isActive("/cases") ? navLinkActive : navLinkBase}
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
              className={guideButtonClass}
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

      {/* 모바일 전체 메뉴: 화면 전체를 덮지 않고, 왼쪽에서 화면의 약 3분의 1만큼만
          슬라이드로 열려요. 뒤쪽은 반투명하게 어둡게 깔려서 원래 있던 이미지가
          살짝 비쳐 보여요. 열림/닫힘 애니메이션이 자연스럽도록 항상 DOM에 있고,
          transform/opacity로만 보였다 숨었다 해요. */}
      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-[70] bg-black/40 transition-opacity duration-300 sm:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        aria-hidden={!menuOpen}
        className={`fixed inset-y-0 left-0 z-[71] w-1/3 min-w-[180px] max-w-[320px] overflow-y-auto bg-[var(--color-ivory)] shadow-[8px_0_30px_-10px_rgba(45,55,72,0.35)] transition-transform duration-300 ease-out sm:hidden ${
          menuOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <img src="/logo.svg" alt="Keepic" className="h-6 w-auto" />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="전체 메뉴 닫기"
              className="text-xl leading-none text-[var(--color-charcoal)]/70"
            >
              ×
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-5 break-keep text-base font-medium">
            <Link href="/photobook" onClick={() => setMenuOpen(false)}>포토북</Link>
            <Link href="/frames" onClick={() => setMenuOpen(false)}>액자</Link>
            <Link href="/goods" onClick={() => setMenuOpen(false)}>나만의 굿즈</Link>
            <Link href="/cases" onClick={() => setMenuOpen(false)}>디자인 예시</Link>
            <div className="mt-2 border-t border-[var(--color-hairline)] pt-5">
              <p className="text-xs text-[var(--color-charcoal)]/50">이용 안내</p>
              <div className="mt-3 flex flex-col gap-4">
                <Link href="/guide" onClick={() => setMenuOpen(false)}>제작 과정</Link>
                <Link href="/faq" onClick={() => setMenuOpen(false)}>자주 묻는 질문</Link>
                <a href={KAKAO_URL} target="_blank" rel="noopener noreferrer">
                  문의하기
                </a>
              </div>
            </div>
          </nav>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              href="/cart"
              onClick={() => setMenuOpen(false)}
              className="rounded-full border border-[var(--color-hairline)] py-3 text-center text-xs font-medium"
            >
              장바구니
            </Link>
            <Link
              href="/order-lookup"
              onClick={() => setMenuOpen(false)}
              className="rounded-full border border-[var(--color-hairline)] py-3 text-center text-xs font-medium"
            >
              주문 조회
            </Link>
            <Link
              href="/order"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] py-3 text-center text-xs font-medium text-white"
            >
              만들기 시작
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
