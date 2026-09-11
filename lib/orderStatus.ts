// 주문 상태 관련 공통 설정
// 관리자 화면과 손님용 주문 조회 화면에서 같이 사용해요.
// 여기서 한 곳만 고치면 두 화면에 모두 반영돼요.

export type OrderStatus =
  | "pending_payment"
  | "in_production"
  | "shipped"
  | "cancelled";

export const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "입금대기",
  in_production: "제작중",
  shipped: "배송완료",
  cancelled: "취소됨",
};

export const statusColors: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-700",
  in_production: "bg-[var(--color-sky)]/15 text-[var(--color-sky)]",
  shipped: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-[var(--color-charcoal)]/10 text-[var(--color-charcoal)]/50",
};

// 취소가 아닌, 정상적으로 진행되는 주문의 단계 순서 (진행 상태 표시용)
export const progressSteps: { id: OrderStatus; label: string }[] = [
  { id: "pending_payment", label: "입금대기" },
  { id: "in_production", label: "제작중" },
  { id: "shipped", label: "배송완료" },
];

// 시안(디자인 확인용 이미지) 상태
export type ProofStatus =
  | "none"
  | "pending_review"
  | "approved"
  | "revision_requested";

export const proofStatusLabels: Record<ProofStatus, string> = {
  none: "아직 시안 없음",
  pending_review: "손님 확인 대기중",
  approved: "손님이 확인함",
  revision_requested: "수정 요청됨",
};
