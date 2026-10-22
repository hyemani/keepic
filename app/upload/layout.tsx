import type { Viewport } from "next";

// 57차(2): 편집기(/upload)에서만 쓰는 화면 설정이에요. 마우스 PC에는 영향이 없어요.
// - maximumScale 1: iPhone Safari가 글자 칸을 누를 때 화면을 확대해 버리는 것(줌 인)과, 캔버스를 두 손가락으로 만질 때 페이지 전체가
//   같이 확대되는 것을 막아요. 사진 확대·축소는 편집기가 직접 처리해요(핀치·+/- 버튼).
// - 64차: viewport-fit=cover를 써요(사이트 전체 공통). 예전(57차)엔 브라우저가 노치 양쪽 안전 영역을 알아서 비워 줘서 홈 화면 앱에서 오른쪽·위가 하얗게 남았어요.
//   지금은 편집기 껍데기(main[data-editor-shell])가 env(safe-area-inset-*)로 필요한 자리만 비워요(노치 쪽은 비우고 반대쪽은 거의 안 비워요).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  // data-keepic-editor: globals.css가 이 표시를 보고 body 좌우 안전 여백을 빼요(편집기가 직접 비우니까 두 번 비우지 않게).
  return <div data-keepic-editor>{children}</div>;
}
