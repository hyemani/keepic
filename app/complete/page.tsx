import Link from "next/link";

export default function CompletePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-ivory)] px-6 text-center text-[var(--color-charcoal)]">
      <img src="/logo.svg" alt="Keepic" className="h-8 w-auto" />

      <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-sky)]/15">
        <span className="text-3xl">✓</span>
      </div>

      <h1 className="mt-8 text-3xl font-semibold sm:text-4xl">
        주문이 접수되었어요
      </h1>
      <p className="mt-4 max-w-sm text-[var(--color-charcoal)]/70">
        소중한 순간을 정성껏 만들어 보내드릴게요.
        <br />
        주문 확인 연락을 곧 드릴게요.
      </p>
      <p className="mt-4 max-w-sm text-sm text-[var(--color-charcoal)]/60 break-keep">
        입금 확인 및 사진·요청사항 접수가 완료되면 시안 작업이 시작됩니다.
      </p>

      <Link
        href="/"
        className="mt-10 rounded-full bg-[var(--color-charcoal)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}