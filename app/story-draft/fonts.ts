// 스토리 시안의 제목 글꼴 — 바꾸고 싶으면 아래 import와 const 두 줄만 다른 글꼴로 바꾸면 돼요.
// (예: Black_Han_Sans 로 바꾸려면 import { Black_Han_Sans } ... / Black_Han_Sans({ weight: "400", ... }))
// 후보 비교는 /fonts-draft 에서 볼 수 있어요. 이 글꼴은 시안 화면에서만 불러와서 실제 사이트 속도에는 영향이 없어요.
import { Jua } from "next/font/google";

export const storyTitleFont = Jua({
  weight: "400",
  display: "swap",
  preload: false, // 한글 글꼴은 용량이 커서 미리 받아 두지 않고, 화면에 쓰이는 글자 조각만 받아요
  variable: "--font-story-title",
  fallback: ["Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
});
