"use client";

// 57차: 폰·태블릿(손가락 기기)용 떠 있는 확대/축소 묶음. 상단바 "···" 안에 숨어 있던 배율 조절을 캔버스 위로 꺼냈어요.
// [−] [35% = 화면에 맞춤] [+] — 버튼은 모두 44px 이상. 마우스 PC에서는 아예 안 보여요(폭 768px 미만 터치 기기에서만 보여요 — 그 이상은 상단바에 배율 묶음이 이미 있어요).
export function TouchZoomControls({
  percent,
  isFit,
  onZoomOut,
  onZoomIn,
  onFit,
}: {
  percent: number;
  isFit: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
}) {
  const btn =
    "flex h-11 min-w-11 items-center justify-center px-2 text-sm text-[var(--color-charcoal)] transition active:bg-[var(--color-ivory)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-sky)] motion-reduce:transition-none";
  return (
    <div
      data-touch-zoom
      role="group"
      aria-label="화면 확대·축소"
      className="pointer-events-auto absolute bottom-3 right-3 z-40 hidden items-center border border-[var(--color-hairline)] bg-white/95 shadow-lg [@media(pointer:coarse)]:max-md:flex"
    >
      <button type="button" onClick={onZoomOut} aria-label="축소" className={btn}>
        −
      </button>
      <button
        type="button"
        onClick={onFit}
        aria-label={isFit ? "지금 화면에 맞춤 상태예요" : "화면에 맞추기"}
        title="누르면 한 화면에 전체가 보이게 맞춰요"
        className={`${btn} min-w-[64px] text-xs tabular-nums ${isFit ? "text-[var(--color-charcoal)]/60" : "font-medium text-[var(--color-sky)]"}`}
      >
        {isFit ? `맞춤 ${percent}%` : `${percent}%`}
      </button>
      <button type="button" onClick={onZoomIn} aria-label="확대" className={btn}>
        +
      </button>
    </div>
  );
}
