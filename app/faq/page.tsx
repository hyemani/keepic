import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import StickyOrderBar from "@/components/StickyOrderBar";
import SiteFooter from "@/components/SiteFooter";

const faqs = [
  {
    q: "휴대폰 사진으로도 제작할 수 있나요?",
    a: "네, 휴대폰 사진으로도 충분히 제작할 수 있어요. 다만 너무 흐릿하거나 작게 잘린 사진은 인쇄 화질이 떨어질 수 있어, 업로드 화면에서 권장 해상도에 못 미치는 사진은 미리 안내해드려요.",
  },
  {
    q: "사진은 몇 장 준비해야 하나요?",
    a: "상품마다 달라요. 포토북은 최소 10장~최대 100장, 액자는 1장이면 충분해요. 정확한 매수는 상품 선택 화면에서 확인하실 수 있어요.",
  },
  {
    q: "사진을 대신 골라주는 선별 서비스도 있나요?",
    a: "아직 준비 중이에요. 지금은 보내주신 사진을 그대로 배치해서 제작해드리고 있어요.",
  },
  {
    q: "사진 순서를 원하는 대로 지정할 수 있나요?",
    a: "아직 준비 중인 기능이에요. 현재는 업로드하신 순서대로 배치되고, 순서 지정 기능은 곧 추가할 예정이에요.",
  },
  {
    q: "표지에 제목이나 이름을 넣을 수 있나요?",
    a: "표지 문구 입력 기능은 준비 중이에요. 지금 꼭 필요하시면 주문 후 저희에게 요청사항으로 남겨주시면 반영해드릴게요.",
  },
  {
    q: "사진 보정도 포함되나요?",
    a: "현재는 보정 없이 보내주신 사진 그대로 배치만 진행하고 있어요. 보정 서비스는 추후 추가할 예정이에요.",
  },
  {
    q: "완성되기 전에 미리 확인할 수 있나요?",
    a: "네, 입금 확인 후 편집이 완료되면 시안(완성 예상 이미지)을 보내드려요. 주문 조회 화면에서 확인하시고, 마음에 안 드는 부분은 수정 요청도 하실 수 있어요.",
  },
  {
    q: "시안은 몇 번까지 수정할 수 있나요?",
    a: "정확한 수정 가능 횟수는 아직 정해지지 않아 추후 안내드릴게요. 지금은 시안 확인 화면에서 자유롭게 수정 요청을 남기실 수 있어요.",
  },
  {
    q: "제작 기간은 얼마나 걸리나요?",
    a: "정확한 제작·배송 기간은 인쇄업체 확정 후 안내드릴게요. 확정되면 이 페이지와 제작 안내 페이지에 반영할게요.",
  },
  {
    q: "재주문도 할 수 있나요?",
    a: "네, 언제든 새로 주문해주시면 돼요. 별도의 회원가입 없이 이름과 전화번호로 주문 조회가 가능해요.",
  },
  {
    q: "업로드한 사진은 언제 삭제되나요?",
    a: "사진 보관·삭제 기준은 아직 정리 중이에요. 확정되면 이 페이지에 안내해드릴게요.",
  },
  {
    q: "제작 사례 페이지의 사진이 제 사진인가요?",
    a: "아니요. 제작 사례 페이지의 이미지는 실제 고객님 사진이 아닌 Keepic이 준비한 디자인 예시예요. 고객님이 보내주신 사진은 동의 없이 사용하지 않아요.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)] pb-20 sm:pb-0">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-24 pt-8 sm:px-10">
        <p className="text-sm font-medium text-[var(--color-sky)]">자주 묻는 질문</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          궁금하신 점을
          <br />
          모아봤어요
        </h1>

        <div className="mt-10 flex flex-col divide-y divide-[var(--color-hairline)] rounded-2xl border border-[var(--color-hairline)] bg-white">
          {faqs.map((item) => (
            <details key={item.q} className="group p-5 open:pb-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium sm:text-base">
                {item.q}
                <span className="shrink-0 text-[var(--color-charcoal)]/40 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 break-keep text-sm leading-relaxed text-[var(--color-charcoal)]/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-10 text-sm text-[var(--color-charcoal)]/60 break-keep">
          더 궁금하신 점이 있으시면 주문 후 요청사항으로 편하게 남겨주세요.
        </p>
      </section>

      <SiteFooter />
      <StickyOrderBar label="추억을 담을 방법 고르기" />
    </main>
  );
}
