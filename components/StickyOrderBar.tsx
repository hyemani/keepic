import Link from "next/link";

export default function StickyOrderBar({
  label = "추억을 담을 방법 고르기",
  href = "/order",
  // PC(sm 이상)에서도 우측 하단에 작은 동그란 버튼으로 계속 떠 있게 할지 여부예요.
  // 기본은 false라서, 이 값을 안 넘기면 지금까지처럼 모바일에서만 하단에 붙어요.
  desktopFloating = false,
}: {
  label?: string;
  href?: string;
  desktopFloating?: boolean;
}) {
  return (
    <>
      {/* 모바일: 화면 폭 전체를 채우는 하단 고정 버튼(기존과 동일) */}
      <div className="fixed inset-x-0 bottom-0 z-50 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:hidden">
        <Link
          href={href}
          className="block w-full rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] py-4 text-center text-base font-medium text-white shadow-[0_10px_25px_-8px_rgba(45,55,72,0.35)] transition hover:opacity-90"
        >
          {label}
        </Link>
      </div>

      {/* PC: 화면을 스크롤해도 우측 하단에 계속 떠 있는 작은 동그란(pill) 버튼 */}
      {desktopFloating && (
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <Link
            href={href}
            className="block whitespace-nowrap rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-6 py-3.5 text-center text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(45,55,72,0.45)] transition hover:opacity-90"
          >
            {label}
          </Link>
        </div>
      )}
    </>
  );
}
