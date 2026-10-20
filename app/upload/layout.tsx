import type { Viewport } from "next";

// 57차(2): 편집기(/upload)에서만 쓰는 화면 설정이에요. 마우스 PC에는 영향이 없어요.
// - maximumScale 1: iPhone Safari가 글자 칸을 누를 때 화면을 확대해 버리는 것(줌 인)과, 캔버스를 두 손가락으로 만질 때 페이지 전체가
//   같이 확대되는 것을 막아요. 사진 확대·축소는 편집기가 직접 처리해요(핀치·+/- 버튼).
// - viewport-fit=cover는 일부러 안 써요: iPhone 가로 화면에서 노치 쪽 안전 영역을 브라우저가 알아서 비워 줘서, 내용이 가려지지 않아요.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
