import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keepic | 글꼴 시안",
  description: "키픽 스토리 화면 제목 글꼴 후보 비교(초안)",
  robots: { index: false, follow: false, nocache: true },
};

export default function FontsDraftLayout({ children }: { children: React.ReactNode }) {
  return children;
}
