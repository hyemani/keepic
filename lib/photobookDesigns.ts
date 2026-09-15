// 포토북 "표지 디자인" 목록이에요. 현재는 사진집 커버 이미지(참고용 목업)만 있고
// 실제 편집기(/template)에는 이 디자인들이 선택지로 연결돼 있지 않아요.
// (편집기에서 실제로 고를 수 있는 건 사진 배치 템플릿 2컷/4컷 같은 것뿐이에요.)
// 그래서 이 목록은 "어떤 느낌으로 만들 수 있는지 보여주는 디자인 갤러리" 역할이고,
// 카드를 누르면 실제 주문 옵션 선택 화면(/options)으로 연결돼요.
//
// 디자인명은 표지 이미지에 실제로 인쇄된 문구를 그대로 옮겨온 거예요.
// 분류(가족/여행/커플/아기)는 사진 속 인물 구성을 보고 임의로 나눈 것이라,
// 혜민님이 보시기에 다른 분류가 맞다면 언제든 바꿔주세요.

export type PhotobookDesignCategory = "family" | "travel" | "couple" | "baby";

export const designCategoryLabels: Record<PhotobookDesignCategory, string> = {
  family: "가족",
  travel: "여행",
  couple: "커플",
  baby: "아기",
};

// 화면에 보여줄 탭 순서예요. (반려동물 전용 디자인은 아직 없어서 탭에서 뺐어요)
export const designCategoryOrder: PhotobookDesignCategory[] = [
  "family",
  "travel",
  "couple",
  "baby",
];

export type PhotobookDesign = {
  id: string;
  name: string;
  category: PhotobookDesignCategory;
  image: string;
  alt: string;
};

export const photobookDesigns: PhotobookDesign[] = [
  // 가족
  { id: "family-archive", name: "Family Archive", category: "family", image: "/photobook/covers/travel-6.png", alt: "가족 사진이 담긴 Family Archive 표지" },
  { id: "our-happy-day", name: "Our Happy Day", category: "family", image: "/photobook/covers/travel-10.png", alt: "가족과 반려견 사진이 담긴 Our Happy Day 표지" },

  // 여행
  { id: "seaside-log", name: "Seaside Log", category: "travel", image: "/photobook/covers/travel-2.png", alt: "바다 여행 사진이 담긴 Seaside Log 표지" },
  { id: "seaside-notes", name: "Seaside Notes", category: "travel", image: "/photobook/covers/travel-3.png", alt: "바다 여행 사진이 담긴 Seaside Notes 표지" },
  { id: "sea-journal", name: "Sea Journal", category: "travel", image: "/photobook/covers/travel-4.png", alt: "바다 여행 사진이 담긴 Sea Journal 표지" },
  { id: "wander-light", name: "Wander Light", category: "travel", image: "/photobook/covers/travel-7.png", alt: "여행 골목 사진이 담긴 Wander Light 표지" },
  { id: "ticket-to-days", name: "Ticket to Days", category: "travel", image: "/photobook/covers/travel-8.png", alt: "비행기 여행 사진이 담긴 Ticket to Days 표지" },
  { id: "blue-coast-diary", name: "Blue Coast Diary", category: "travel", image: "/photobook/covers/travel-12.png", alt: "해안 마을 사진이 담긴 Blue Coast Diary 표지" },

  // 커플
  { id: "together-days", name: "Together Days", category: "couple", image: "/photobook/covers/travel-1.png", alt: "커플 사진이 담긴 Together Days 표지" },
  { id: "evening-us", name: "Evening Us", category: "couple", image: "/photobook/covers/travel-5.png", alt: "노을 속 커플 사진이 담긴 Evening Us 표지" },
  { id: "our-slow-days", name: "Our Slow Days", category: "couple", image: "/photobook/covers/travel-9.png", alt: "커플 사진이 담긴 Our Slow Days 표지" },
  { id: "golden-us", name: "Golden Us", category: "couple", image: "/photobook/covers/travel-11.png", alt: "노을 속 커플 사진이 담긴 Golden Us 표지" },

  // 아기
  { id: "little-daybook", name: "Little Daybook", category: "baby", image: "/photobook/covers/baby-1.png", alt: "아기 사진이 담긴 Little Daybook 표지" },
  { id: "little-wonder", name: "Little Wonder", category: "baby", image: "/photobook/covers/baby-2.png", alt: "아기 사진이 담긴 Little Wonder 표지" },
  { id: "family-daybook", name: "Family Daybook", category: "baby", image: "/photobook/covers/baby-3.png", alt: "아기 사진이 담긴 Family Daybook 표지" },
  { id: "little-hello", name: "Little Hello", category: "baby", image: "/photobook/covers/baby-4.png", alt: "아기 사진이 담긴 Little Hello 표지" },
  { id: "little-moments", name: "Little Moments", category: "baby", image: "/photobook/covers/baby-5.png", alt: "아기 사진이 담긴 Little Moments 표지" },
  { id: "tiny-joy", name: "Tiny Joy", category: "baby", image: "/photobook/covers/baby-6.png", alt: "아기 사진이 담긴 Tiny Joy 표지" },
];
