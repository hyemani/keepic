"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// 스크롤하면서 화면에 들어올 때 문구·카드가 아래에서 살짝 올라오며 부드럽게
// 나타나는 효과예요. 화면에 이미 보이는 요소는 애니메이션 없이 바로 보이고,
// 한 번 나타난 뒤에는 스크롤을 위아래로 움직여도 다시 숨지 않아요.
// 기기의 '동작 줄이기(prefers-reduced-motion)' 설정을 켠 사용자에게는
// motion-reduce: 클래스로 애니메이션 없이 바로 보여줘요(자바스크립트 상태 분기 없이
// CSS만으로 처리해서, 렌더링 중 불필요한 상태 변경이 생기지 않도록 했어요).
const MAX_DELAY_MS = 300;

export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cappedDelay = Math.min(delay, MAX_DELAY_MS);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:!opacity-100 motion-reduce:!translate-y-0 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      } ${className}`}
      style={cappedDelay ? { transitionDelay: `${cappedDelay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
