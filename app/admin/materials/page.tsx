"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Material = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuthAndLoadMaterials() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("materials")
        .select("*")
        .order("name", { ascending: true });

      if (!error && data) {
        setMaterials(data);
      }

      setIsLoading(false);
    }

    checkAuthAndLoadMaterials();
  }, [router]);

  async function handleQuantityChange(materialId: string, newQuantity: number) {
    if (newQuantity < 0) return;

    setMaterials((prev) =>
      prev.map((m) => (m.id === materialId ? { ...m, quantity: newQuantity } : m))
    );

    const { error } = await supabase
      .from("materials")
      .update({ quantity: newQuantity })
      .eq("id", materialId);

    if (error) {
      console.error(error);
      alert("수량 변경 중 문제가 발생했어요. 다시 시도해주세요.");
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-ivory)]">
        <p className="text-[var(--color-charcoal)]/60">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        <a
          href="/admin"
          className="text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)]"
        >
          주문 목록으로
        </a>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold">원자재 재고</h1>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
          원자재를 쓰거나 새로 들여올 때마다 수량을 직접 고쳐주세요. 주문이 들어와도
          자동으로 줄어들지 않아요.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-hairline)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-hairline)] bg-white">
              <tr>
                <th className="px-4 py-3 font-medium">원자재</th>
                <th className="px-4 py-3 font-medium">재고 수량</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const isLow = material.quantity <= 5;
                return (
                  <tr
                    key={material.id}
                    className="border-b border-[var(--color-hairline)] last:border-0"
                  >
                    <td className="px-4 py-3">{material.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            handleQuantityChange(material.id, material.quantity - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-lg hover:border-[var(--color-sky)]"
                        >
                          −
                        </button>
                        <span
                          className={`w-10 text-center font-medium ${
                            isLow ? "text-red-500" : ""
                          }`}
                        >
                          {material.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleQuantityChange(material.id, material.quantity + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-hairline)] text-lg hover:border-[var(--color-sky)]"
                        >
                          +
                        </button>
                        <span className="text-[var(--color-charcoal)]/50">
                          {material.unit}
                        </span>
                        {isLow && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                            재고 부족
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
