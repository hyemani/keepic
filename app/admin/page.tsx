"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import JSZip from "jszip";
import {
  OrderStatus,
  statusLabels,
  statusColors,
  ProofStatus,
  proofStatusLabels,
} from "@/lib/orderStatus";

type OrderPhoto = {
  url: string;
  caption?: string;
  [key: string]: unknown;
};

type Order = {
  id: string;
  created_at: string;
  recipient_name: string;
  phone: string;
  zip_code: string;
  road_address: string;
  address_detail: string;
  depositor_name: string;
  product_name: string | null;
  size: string | null;
  quantity: number | null;
  template_id: string | null;
  photos: OrderPhoto[] | null;
  status: OrderStatus;
  shipping_fee: number | null;
  proof_url: string | null;
  proof_status: ProofStatus;
  proof_note: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  useEffect(() => {
    async function checkAuthAndLoadOrders() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data);
      }

      setIsLoading(false);
    }

    checkAuthAndLoadOrders();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("상태 변경 중 문제가 발생했어요. 다시 시도해주세요.");
    }
  }

  async function handleDownloadAll(order: Order) {
    if (!order.photos || order.photos.length === 0) return;

    setIsDownloading(true);
    try {
      const zip = new JSZip();

      await Promise.all(
        order.photos.map(async (photo, i) => {
          const res = await fetch(photo.url);
          const blob = await res.blob();
          const ext = photo.url.split(".").pop()?.split("?")[0] || "jpg";
          zip.file(`사진-${i + 1}.${ext}`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${order.recipient_name || "주문"}-사진.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("사진 다운로드 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleUploadProof(order: Order, file: File) {
    setIsUploadingProof(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${order.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("order-proofs")
        .upload(path, file);

      if (uploadError) {
        console.error(uploadError);
        alert("시안 업로드 중 문제가 발생했어요. 다시 시도해주세요.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("order-proofs")
        .getPublicUrl(path);

      const proofUrl = publicUrlData.publicUrl;

      const { error } = await supabase
        .from("orders")
        .update({
          proof_url: proofUrl,
          proof_status: "pending_review",
          proof_note: null,
        })
        .eq("id", order.id);

      if (error) {
        console.error(error);
        alert("시안 저장 중 문제가 발생했어요. 다시 시도해주세요.");
        return;
      }

      const updated = {
        ...order,
        proof_url: proofUrl,
        proof_status: "pending_review" as ProofStatus,
        proof_note: null,
      };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      setSelectedOrder((prev) => (prev && prev.id === order.id ? updated : prev));
    } finally {
      setIsUploadingProof(false);
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
        <div className="flex items-center gap-4">
          <a
            href="/admin/materials"
            className="text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)]"
          >
            원자재 재고
          </a>
          <button
            onClick={handleLogout}
            className="text-sm text-[var(--color-charcoal)]/60 hover:text-[var(--color-sky)]"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold">주문 목록</h1>
        <p className="mt-2 text-sm text-[var(--color-charcoal)]/60">
          총 {orders.length}건의 주문이 있어요.
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--color-hairline)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-hairline)] bg-white">
              <tr>
                <th className="px-4 py-3 font-medium">주문일시</th>
                <th className="px-4 py-3 font-medium">상품</th>
                <th className="px-4 py-3 font-medium">사진</th>
                <th className="px-4 py-3 font-medium">받는 분</th>
                <th className="px-4 py-3 font-medium">전화번호</th>
                <th className="px-4 py-3 font-medium">입금자명</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const photos = order.photos ?? [];
                return (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--color-hairline)] last:border-0"
                  >
                    <td className="px-4 py-3 text-[var(--color-charcoal)]/70">
                      {new Date(order.created_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {order.product_name
                        ? `${order.product_name} · ${order.size ?? ""} · ${order.quantity ?? 1}개`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {photos.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <img
                            src={photos[0].url}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                          {photos.length > 1 && (
                            <span className="text-xs text-[var(--color-charcoal)]/50">
                              +{photos.length - 1}장
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--color-charcoal)]/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{order.recipient_name}</td>
                    <td className="px-4 py-3">{order.phone}</td>
                    <td className="px-4 py-3">{order.depositor_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as OrderStatus)
                        }
                        className={`rounded-full border-0 px-3 py-1 text-xs font-medium outline-none ${statusColors[order.status]}`}
                      >
                        {(Object.keys(statusLabels) as OrderStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs font-medium text-[var(--color-sky)] hover:underline"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">
                  {new Date(selectedOrder.created_at).toLocaleString("ko-KR")}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {selectedOrder.product_name ?? "상품 정보 없음"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-sm text-[var(--color-charcoal)]/50"
              >
                닫기
              </button>
            </div>

            <div className="mt-4">
              <select
                value={selectedOrder.status}
                onChange={(e) =>
                  handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)
                }
                className={`rounded-full border-0 px-3 py-1 text-xs font-medium outline-none ${statusColors[selectedOrder.status]}`}
              >
                {(Object.keys(statusLabels) as OrderStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">사이즈</p>
                <p className="mt-0.5">{selectedOrder.size ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">수량</p>
                <p className="mt-0.5">{selectedOrder.quantity ?? 1}개</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">템플릿</p>
                <p className="mt-0.5">{selectedOrder.template_id ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">사진 수</p>
                <p className="mt-0.5">{selectedOrder.photos?.length ?? 0}장</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-charcoal)]/50">배송비</p>
                <p className="mt-0.5">
                  {(selectedOrder.shipping_fee ?? 0).toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-[var(--color-ivory)] p-4 text-sm">
              <p className="font-medium">{selectedOrder.recipient_name}</p>
              <p className="mt-1 text-[var(--color-charcoal)]/70">{selectedOrder.phone}</p>
              <p className="mt-1 text-[var(--color-charcoal)]/70">
                ({selectedOrder.zip_code}) {selectedOrder.road_address}{" "}
                {selectedOrder.address_detail}
              </p>
              <p className="mt-3 text-[var(--color-charcoal)]/70">
                입금자명: {selectedOrder.depositor_name}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-[var(--color-hairline)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">시안</p>
                <span className="text-xs text-[var(--color-charcoal)]/50">
                  {proofStatusLabels[selectedOrder.proof_status]}
                </span>
              </div>
              {selectedOrder.status === "pending_payment" && (
                <p className="mt-2 text-xs text-[var(--color-charcoal)]/50">
                  입금 확인 후(상태를 &quot;제작중&quot;으로 바꾼 뒤) 시안을 올릴 수 있어요.
                </p>
              )}

              {selectedOrder.proof_url && (
                <a
                  href={selectedOrder.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block max-w-xs overflow-hidden rounded-lg border border-[var(--color-hairline)]"
                >
                  <img
                    src={selectedOrder.proof_url}
                    alt="시안"
                    className="w-full object-cover"
                  />
                </a>
              )}

              {selectedOrder.proof_status === "revision_requested" &&
                selectedOrder.proof_note && (
                  <div className="mt-3 rounded-lg bg-[var(--color-ivory)] p-3 text-sm">
                    <p className="text-xs font-medium text-[var(--color-charcoal)]/60">
                      손님 수정 요청 내용
                    </p>
                    <p className="mt-1">{selectedOrder.proof_note}</p>
                  </div>
                )}

              <label
                className={`mt-4 inline-block rounded-full border px-4 py-2 text-xs font-medium ${
                  selectedOrder.status === "pending_payment"
                    ? "cursor-not-allowed border-[var(--color-hairline)] text-[var(--color-charcoal)]/40"
                    : "cursor-pointer border-[var(--color-hairline)] hover:border-[var(--color-sky)]"
                }`}
              >
                {isUploadingProof
                  ? "업로드 중..."
                  : selectedOrder.proof_url
                    ? "새 시안 올리기"
                    : "시안 올리기"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isUploadingProof || selectedOrder.status === "pending_payment"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadProof(selectedOrder, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {selectedOrder.photos && selectedOrder.photos.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">사진</p>
                  <button
                    onClick={() => handleDownloadAll(selectedOrder)}
                    disabled={isDownloading}
                    className="text-xs font-medium text-[var(--color-sky)] hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-charcoal)]/40"
                  >
                    {isDownloading ? "압축하는 중..." : "전체 다운로드"}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {selectedOrder.photos.map((photo, i) => (
                    <a
                      key={i}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg border border-[var(--color-hairline)]"
                    >
                      <img
                        src={photo.url}
                        alt={`사진 ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
