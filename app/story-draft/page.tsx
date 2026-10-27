import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Scene1Hero from "./Scene1Hero";
import Scene2Album from "./Scene2Album";
import Scene3Home from "./Scene3Home";

// 메인 화면 "스크롤 스토리" 시안. 실제 메인(/)은 그대로고, 이 주소(/story-draft)에서만 보여요.
export default function StoryDraftPage() {
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
