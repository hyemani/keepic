// 스토리 시안의 글꼴 안내 — 글꼴 규칙은 story.css 맨 위에 있고, 여기에는 "미리 받아 둘 파일" 목록만 있어요.
//  · 제목(큰 글씨)  : 차이 활짝체 Bold — public/fonts/ChaiHwaljjak-Bold.otf (선언은 app/globals.css 의 "ChaiHwaljjak", 굿즈·편집기 화면과 같은 파일)
//  · 그 밖의 글     : Pretendard 보통(400)·굵게(700) — public/fonts/story/*.woff2
//                     (public/fonts/Pretendard-*.ttf 에서 자주 쓰는 한글 2350자 + 영문·숫자만 골라 담은 가벼운 시안 전용 파일. 파일당 약 170KB)
// 첫 화면에 바로 보이는 글자에 쓰이는 파일만 미리(preload) 받아서, 글꼴이 늦게 와서 글자 모양이 바뀌는 일을 줄여요.
export const STORY_FONT_PRELOADS = [
  { href: "/fonts/ChaiHwaljjak-Bold.otf", type: "font/otf" },
  { href: "/fonts/story/Pretendard-Regular-ksx1001.woff2", type: "font/woff2" },
  { href: "/fonts/story/Pretendard-Bold-ksx1001.woff2", type: "font/woff2" },
] as const;
