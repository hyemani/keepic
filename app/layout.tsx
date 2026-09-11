import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keepic | 사진으로 만드는 나만의 앨범",
  description: "사진을 고르면, 앨범과 액자로 완성해드립니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Nanum+Myeongjo&family=Gowun+Batang&family=Gowun+Dodum&family=Gaegu&family=Nanum+Pen+Script&family=Dongle&family=Gamja+Flower&family=East+Sea+Dokdo&family=Black+Han+Sans&family=Cinzel+Decorative&family=Cinzel&family=Castoro&family=Pinyon+Script&family=Amatic+SC&family=Luckiest+Guy&family=Julius+Sans+One&family=Poor+Story&family=Do+Hyeon&family=Gloock&family=Pompiere&family=Boogaloo&family=Henny+Penny&family=Nosifer&family=DM+Serif+Display&family=Bodoni+Moda&display=swap"
/>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}