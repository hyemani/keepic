// 제목 글꼴 후보 6개 — 모두 구글 폰트(SIL Open Font License 1.1, 상업적 이용 무료).
// 한글 글꼴은 용량이 커서 preload: false(미리 받지 않음)로 두고, 이 시안 화면에서만 불러와요.
// (next/font 규칙상 글꼴 호출은 옵션을 직접 적은 const 로 따로 둬야 해요.)
import { Black_Han_Sans, Cute_Font, Dongle, Gaegu, Jua, Single_Day } from "next/font/google";

const jua = Jua({ weight: "400", display: "swap", preload: false });
const cute = Cute_Font({ weight: "400", display: "swap", preload: false });
const dongle = Dongle({ weight: "700", display: "swap", preload: false });
const gaegu = Gaegu({ weight: "700", display: "swap", preload: false });
// Single Day는 한글 전용 글꼴이라 next/font 타입이 preload 옵션을 받지 않아요(받을 글자 조각이 없어 미리 받기도 일어나지 않아요).
const single = Single_Day({ weight: "400", display: "swap" });
const blackhan = Black_Han_Sans({ weight: "400", display: "swap", preload: false });

export const FONT_CANDIDATES = [
  { id: "jua", name: "Jua", ko: "주아", feel: "도톰하고 동글동글한 대표 귀여운 글꼴. 제목·버튼 모두 잘 읽혀요.", scale: 1, weightLabel: "Regular 400", font: jua, page: "Jua" },
  { id: "cute", name: "Cute Font", ko: "귀여운 폰트", feel: "아기자기한 손글씨 느낌이지만 획이 가늘고 글자가 작아 보여서 크게 키워 써야 해요(여기서는 1.3배).", scale: 1.3, weightLabel: "Regular 400", font: cute, page: "Cute+Font" },
  { id: "dongle", name: "Dongle", ko: "동글", feel: "둥글고 가는 편이라 글자가 작아 보여서 크게 키워 써야 해요(여기서는 1.5배).", scale: 1.5, weightLabel: "Bold 700", font: dongle, page: "Dongle" },
  { id: "gaegu", name: "Gaegu", ko: "개구", feel: "연필로 쓴 듯한 손글씨. 부드럽고 친근하지만 도톰한 맛은 덜해요.", scale: 1.05, weightLabel: "Bold 700", font: gaegu, page: "Gaegu" },
  { id: "single", name: "Single Day", ko: "싱글데이", feel: "붓펜으로 쓴 듯 통통 튀는 손글씨. 개성이 강해요.", scale: 1, weightLabel: "Regular 400", font: single, page: "Single+Day" },
  { id: "blackhan", name: "Black Han Sans", ko: "블랙한산스", feel: "아주 굵고 힘 있는 고딕. 귀여움보다는 시원하고 또렷한 캠페인 느낌.", scale: 0.94, weightLabel: "Regular 400", font: blackhan, page: "Black+Han+Sans" },
] as const;
