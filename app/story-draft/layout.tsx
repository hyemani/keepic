import type { Metadata } from "next";
import "./story.css";

// 시안(초안) 화면이라 검색에 나오지 않게 해요.
export const metadata: Metadata = {
  title: "Keepic | 스토리 시안",
  description: "키픽 메인 화면 스크롤 스토리 시안(초안)",
  robots: { index: false, follow: false, nocache: true },
};

export default function StoryDraftLayout({ children }: { children: React.ReactNode }) {
  return <div className="st-root">{children}</div>;
}
