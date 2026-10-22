// 64차: 홈 화면 앱(standalone)에는 브라우저 뒤로가기 버튼이 없어서, 화면 안 "←"/"나가기"가 유일한 길이에요.
// 새로고침하거나 앱을 다시 열어 이 화면이 기록의 맨 처음이면 router.back()이 아무 일도 안 해서 갇힐 수 있어서, 그때는 첫 화면으로 보내요.
export function safeBack(router: { back: () => void; push: (href: string) => void }) {
  if (typeof window !== "undefined" && window.history.length <= 1) router.push("/");
  else router.back();
}
