import { preload } from "react-dom";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Scene1Hero from "./Scene1Hero";
import Scene2Album from "./Scene2Album";
import Scene3Home from "./Scene3Home";
import { STORY_FONT_PRELOADS } from "./fonts";

// 메인 화면 "스크롤 스토리" 시안. 실제 메인(/)은 그대로고, 이 주소(/story-draft)에서만 보여요.
export default function StoryDraftPage() {
  // 첫 화면 배경 그림은 페이지 코드보다 먼저, 가장 높은 우선순위로 받아 둬요(첫 화면이 비어 보이지 않게)
  preload("/story/layers/bg-cobalt-space.webp", { as: "image", fetchPriority: "high" });
  // 첫 화면 글자에 쓰이는 글꼴 파일도 미리 받아 둬요(글꼴은 CORS 모드라 crossOrigin이 꼭 필요해요)
  for (const f of STORY_FONT_PRELOADS) preload(f.href, { as: "font", type: f.type, crossOrigin: "anonymous" });
  return (
    <>
      <SiteHeader />
      <main>
        <Scene1Hero />
        <Scene2Album />
        <Scene3Home />
      </main>
      <SiteFooter />
    </>
  );
}
