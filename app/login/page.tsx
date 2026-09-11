"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage("이메일 또는 비밀번호가 올바르지 않아요.");
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-ivory)] px-6 text-[var(--color-charcoal)]">
      <img src="/logo.svg" alt="Keepic" className="h-8 w-auto" />

      <div className="mt-10 w-full max-w-sm">
        <h1 className="text-2xl font-semibold">관리자 로그인</h1>

        <div className="mt-8 flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
          />
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm text-red-500">{errorMessage}</p>
        )}

        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-full bg-[var(--color-sky)] py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          로그인
        </button>
      </div>
    </main>
  );
}