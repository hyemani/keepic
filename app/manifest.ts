import type { MetadataRoute } from "next";

// 64차: "홈 화면에 추가"를 앱처럼 열리게 하는 웹 앱 설명서예요(/manifest.webmanifest).
// - display standalone: 주소창·사파리 도구막대 없이 앱처럼 열려요.
// - orientation any: 가로·세로를 고정하지 않아요(편집은 가로가 편하지만 막지는 않아요).
// - 오프라인 저장(서비스 워커)은 일부러 안 넣었어요 — 저장된 앨범·주문 데이터에 영향 줄 위험이 있어서 이번 범위 밖이에요.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "키픽",
    short_name: "키픽",
    description: "사진을 고르면, 앨범과 액자로 완성해드립니다.",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
