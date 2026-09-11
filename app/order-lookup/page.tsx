"use client";
import SiteHeader from "@/components/SiteHeader";

import { useState, type ChangeEvent } from "react";
import StickyOrderBar from "@/components/StickyOrderBar";
import { supabase } from "@/lib/supabase";
import {
  OrderStatus,
  statusLabels,
  statusColors,
  progressSteps,
  ProofStatus,
} from "@/lib/orderStatus";

type OrderPhoto = {
  url: string;
  caption?: string;
  [key: string]: unknown;
};

type Order = {
  id: string;
  created_at: string;
  product_name: string | null;
  size: string | null;
  quantity: number | null;
  shipping_fee: number | null;
  status: OrderStatus;
  photos: OrderPhoto[] | null;
  proof_url: string | null;
  proof_status: ProofStatus;
  proof_note: string | null;
};

export default function OrderLookupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [revisionDraftId, setRevisionDraftId] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhotos, setEditPhotos] = useState<OrderPhoto[]>([]);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isSavingPhotos, setIsSavingPhotos] = useState(false);

  async function handleSearch() {
    if (!name.trim() || !phone.trim()) {
      alert("이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, product_name, size, quantity, shipping_fee, status, photos, proof_url, proof_status, proof_note"
      )
      .eq("recipient_name", name.trim())
      .eq("phone", phone.trim())
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    } else {
      setOrders([]);
    }

    setIsLoading(false);
  }

  async function handleCancel(orderId: string) {
    const confirmed = window.confirm("정말 이 주문을 취소하시겠어요?");
    if (!confirmed) return;

    setCancellingId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("status", "pending_payment");

    if (error) {
      console.error(error);
      alert("주문 취소 중 문제가 발생했어요. 다시 시도해주세요.");
    } else {
      setOrders((prev) =>
        prev
          ? prev.map((o) =>
              o.id === orderId ? { ...o, status: "cancelled" as OrderStatus } : o
            )
          : prev
      );
    }

    setCancellingId(null);
  }

  async function handleApproveProof(orderId: string) {
    setRespondingId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({ proof_status: "approved" })
      .eq("id", orderId)
      .eq("proof_status", "pending_review");

    if (error) {
      console.error(error);
      alert("처리 중 문제가 발생했어요. 다시 시도해주세요.");
    } else {
      setOrders((prev) =>
        prev
          ? prev.map((o) =>
              o.id === orderId
                ? { ...o, proof_status: "approved" as ProofStatus }
                : o
            )
          : prev
      );
    }

    setRespondingId(null);
  }

  async function handleRequestRevision(orderId: string) {
    if (!revisionNote.trim()) {
      alert("어떤 부분을 수정하고 싶으신지 적어주세요.");
      return;
    }

    setRespondingId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({ proof_status: "revision_requested", proof_note: revisionNote.trim() })
      .eq("id", orderId)
      .eq("proof_status", "pending_review");

    if (error) {
      console.error(error);
      alert("처리 중 문제가 발생했어요. 다시 시도해주세요.");
    } else {
      setOrders((prev) =>
        prev
          ? prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    proof_status: "revision_requested" as ProofStatus,
                    proof_note: revisionNote.trim(),
                  }
                : o
            )
          : prev
      );
      setRevisionDraftId(null);
      setRevisionNote("");
    }

    setRespondingId(null);
  }

  async function uploadEditPhotoToStorage(file: File): Promise<string> {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("order-photos").upload(path, file);
    if (error) throw error;

    const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  function handleStartEdit(order: Order) {
    setEditingId(order.id);
    setEditPhotos(order.photos ?? []);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditPhotos([]);
  }

  function handleRemoveEditPhoto(index: number) {
    setEditPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsAddingPhoto(true);
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => ({
          url: await uploadEditPhotoToStorage(file),
        }))
      );
      setEditPhotos((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
      alert("사진을 올리는 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setIsAddingPhoto(false);
      event.target.value = "";
    }
  }

  async function handleSaveEdit(orderId: string) {
    setIsSavingPhotos(true);

    const { error } = await supabase
      .from("orders")
      .update({ photos: editPhotos })
      .eq("id", orderId)
      .eq("status", "pending_payment");

    if (error) {
      console.error(error);
      alert("사진 저장 중 문제가 발생했어요. 다시 시도해주세요.");
    } else {
      setOrders((prev) =>
        prev
          ? prev.map((o) => (o.id === orderId ? { ...o, photos: editPhotos } : o))
          : prev
      );
      setEditingId(null);
      setEditPhotos([]);
    }

    setIsSavingPhotos(false);
  }

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-lg px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">주문 조회</h1>
        <p className="mt-3 break-keep text-sm text-[var(--color-charcoal)]/70">
          주문하실 때 입력하신 받는 분 성함과
          <br />
          전화번호를 입력해주세요.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium">받는 분 성함</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>
          <div>
            <label className="text-sm font-medium">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="mt-2 w-full rounded-lg border border-[var(--color-hairline)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="mt-4 rounded-full bg-[var(--color-sky)] px-8 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "조회 중..." : "주문 조회하기"}
          </button>
        </div>

        {hasSearched && !isLoading && (
          <div className="mt-10">
            {orders && orders.length > 0 ? (
              <div className="flex flex-col gap-4">
                {orders.map((order) => {
                  const photos = order.photos ?? [];
                  const currentStepIndex = progressSteps.findIndex(
                    (step) => step.id === order.status
                  );

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[var(--color-hairline)] bg-white p-5 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[var(--color-charcoal)]/50">
                          {new Date(order.created_at).toLocaleString("ko-KR")}
                        </p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </div>

                      <p className="mt-2 font-medium">
                        {order.product_name
                          ? `${order.product_name} · ${order.size ?? ""} · ${order.quantity ?? 1}개`
                          : "-"}
                      </p>
                      <p className="mt-1 text-[var(--color-charcoal)]/60">
                        배송비 {(order.shipping_fee ?? 0).toLocaleString()}원
                      </p>

                      {order.status !== "cancelled" && (
                        <div className="mt-4 flex items-center">
                          {progressSteps.map((step, i) => (
                            <div key={step.id} className="flex flex-1 items-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    i <= currentStepIndex
                                      ? "bg-[var(--color-sky)]"
                                      : "bg-[var(--color-hairline)]"
                                  }`}
                                />
                                <span
                                  className={`text-[11px] ${
                                    i <= currentStepIndex
                                      ? "text-[var(--color-charcoal)]"
                                      : "text-[var(--color-charcoal)]/40"
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                              {i < progressSteps.length - 1 && (
                                <div
                                  className={`mx-1 mb-4 h-px flex-1 ${
                                    i < currentStepIndex
                                      ? "bg-[var(--color-sky)]"
                                      : "bg-[var(--color-hairline)]"
                                  }`}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {order.proof_url && order.proof_status !== "none" && (
                        <div className="mt-4 rounded-xl border border-[var(--color-sky)]/40 bg-[var(--color-sky)]/5 p-4">
                          <p className="text-sm font-medium">
                            {order.proof_status === "pending_review" &&
                              "시안이 도착했어요"}
                            {order.proof_status === "approved" &&
                              "시안을 확인하셨어요"}
                            {order.proof_status === "revision_requested" &&
                              "수정 요청을 보내드렸어요"}
                          </p>
                          <a
                            href={order.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 block max-w-xs overflow-hidden rounded-lg border border-[var(--color-hairline)]"
                          >
                            <img
                              src={order.proof_url}
                              alt="시안"
                              className="w-full object-cover"
                            />
                          </a>

                          {order.proof_status === "pending_review" && (
                            <>
                              {revisionDraftId === order.id ? (
                                <div className="mt-3 flex flex-col gap-2">
                                  <textarea
                                    value={revisionNote}
                                    onChange={(e) => setRevisionNote(e.target.value)}
                                    placeholder="어떤 부분을 수정하고 싶으신지 적어주세요."
                                    rows={3}
                                    className="w-full rounded-lg border border-[var(--color-hairline)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-sky)]"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRequestRevision(order.id)}
                                      disabled={respondingId === order.id}
                                      className="rounded-full bg-[var(--color-charcoal)] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      요청 보내기
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRevisionDraftId(null);
                                        setRevisionNote("");
                                      }}
                                      className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-xs font-medium"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => handleApproveProof(order.id)}
                                    disabled={respondingId === order.id}
                                    className="rounded-full bg-[var(--color-sky)] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    확인했어요
                                  </button>
                                  <button
                                    onClick={() => setRevisionDraftId(order.id)}
                                    disabled={respondingId === order.id}
                                    className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-xs font-medium"
                                  >
                                    수정 요청하기
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {order.proof_status === "revision_requested" &&
                            order.proof_note && (
                              <p className="mt-3 text-xs text-[var(--color-charcoal)]/60">
                                보내신 요청: {order.proof_note}
                              </p>
                            )}
                        </div>
                      )}

                      {editingId === order.id ? (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-[var(--color-charcoal)]/60">
                            사진 수정 중 ({editPhotos.length}장)
                          </p>
                          <div className="mt-2 grid grid-cols-5 gap-1.5">
                            {editPhotos.map((photo, i) => (
                              <div
                                key={i}
                                className="relative aspect-square overflow-hidden rounded-md border border-[var(--color-hairline)]"
                              >
                                <img
                                  src={photo.url}
                                  alt={`사진 ${i + 1}`}
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  onClick={() => handleRemoveEditPhoto(i)}
                                  className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>

                          <label className="mt-3 inline-block cursor-pointer text-xs font-medium text-[var(--color-sky)] hover:underline">
                            {isAddingPhoto ? "올리는 중..." : "+ 사진 추가"}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleAddPhotos}
                              disabled={isAddingPhoto}
                              className="hidden"
                            />
                          </label>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(order.id)}
                              disabled={isSavingPhotos || isAddingPhoto}
                              className="rounded-full bg-[var(--color-sky)] px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isSavingPhotos ? "저장하는 중..." : "저장하기"}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={isSavingPhotos}
                              className="rounded-full border border-[var(--color-hairline)] px-4 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        photos.length > 0 && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-[var(--color-charcoal)]/60">
                                제출한 사진 {photos.length}장
                              </p>
                              {order.status === "pending_payment" && (
                                <button
                                  onClick={() => handleStartEdit(order)}
                                  className="text-xs font-medium text-[var(--color-sky)] hover:underline"
                                >
                                  사진 수정
                                </button>
                              )}
                            </div>
                            <div className="mt-2 grid grid-cols-5 gap-1.5">
                              {photos.slice(0, 10).map((photo, i) => (
                                <div
                                  key={i}
                                  className="aspect-square overflow-hidden rounded-md border border-[var(--color-hairline)]"
                                >
                                  <img
                                    src={photo.url}
                                    alt={`사진 ${i + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}

                      {order.status === "pending_payment" && (
                        <div className="mt-4">
                          <p className="break-keep text-xs text-[var(--color-charcoal)]/60">
                            입금 확인 및 사진·요청사항 접수가 완료되면 시안 작업이
                            시작됩니다.
                          </p>
                          <button
                            onClick={() => handleCancel(order.id)}
                            disabled={cancellingId === order.id}
                            className="mt-2 text-xs font-medium text-red-500 hover:underline disabled:cursor-not-allowed disabled:text-[var(--color-charcoal)]/40"
                          >
                            {cancellingId === order.id ? "취소하는 중..." : "주문 취소"}
                          </button>
                        </div>
                      )}
                      {(order.status === "in_production" ||
                        order.status === "shipped") && (
                        <p className="mt-4 text-xs text-[var(--color-charcoal)]/50">
                          취소가 필요하시면 문의해주세요.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="break-keep text-sm text-[var(--color-charcoal)]/60">
                일치하는 주문이 없어요. 이름과 전화번호를 다시 확인해주세요.
              </p>
            )}
          </div>
        )}
      </section>
      <StickyOrderBar />
    </main>
  );
}
