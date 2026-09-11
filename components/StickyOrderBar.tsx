import Link from "next/link";

export default function StickyOrderBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:hidden">
      <Link
        href="/order"
        className="block w-full rounded-full bg-[var(--color-sky)] py-3.5 text-center text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(45,55,72,0.35)] transition hover:opacity-90"
      >
        포토북 제작 신청
      </Link>
    </div>
  );
}
