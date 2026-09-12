"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartCount, subscribeToCart } from "@/lib/cart";

export default function CartBadge({ className = "" }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getCartCount());
    return subscribeToCart(() => setCount(getCartCount()));
  }, []);

  return (
    <Link
      href="/cart"
      aria-label="장바구니"
      className={`relative inline-flex items-center ${className}`}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8h12l-1 12H7L6 8Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-sky)] px-1 text-[10px] font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
