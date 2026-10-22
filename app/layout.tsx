import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Keepic | 사진으로 만드는 나만의 앨범",
  description: "사진을 고르면, 앨범과 액자로 완성해드립니다.",
  applicationName: "키픽",
  // 64차: 홈 화면 앱 설정. 상태 표시줄은 "default"(흰 배경에 검은 글씨, 화면 내용은 그 아래에서 시작)로 둬요 —
  // black-translucent는 상태 표시줄 자리까지 내용이 올라와서 사이트 전체의 맨 위 여백을 따로 만들어야 하고, 흰 배경에서는 시계·배터리 글씨가 안 보여요.
  appleWebApp: { capable: true, title: "키픽", statusBarStyle: "default" },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

// 64차: 홈 화면 앱(iOS "홈 화면에 추가")·사파리 가로 화면에서 노치 옆 안전 영역까지 화면을 꽉 쓰도록 viewport-fit=cover를 켜요.
// 대신 노치·홈 바가 가리는 자리는 globals.css의 body 안쪽 여백(env(safe-area-inset-*))과 편집기 껍데기 여백이 비워 줘요. 마우스 PC·태블릿은 안전 영역이 0이라 그대로예요.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
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
  href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&family=Jua&family=Nanum+Myeongjo&family=Gowun+Batang&family=Gowun+Dodum&family=Gaegu&family=Nanum+Pen+Script&family=Dongle&family=Gamja+Flower&family=East+Sea+Dokdo&family=Black+Han+Sans&family=Cinzel+Decorative&family=Cinzel&family=Castoro&family=Pinyon+Script&family=Amatic+SC&family=Luckiest+Guy&family=Julius+Sans+One&family=Poor+Story&family=Do+Hyeon&family=Gloock&family=Pompiere&family=Boogaloo&family=Henny+Penny&family=Nosifer&family=DM+Serif+Display&family=Bodoni+Moda&display=swap"
/>
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}