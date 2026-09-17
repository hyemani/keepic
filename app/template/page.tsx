"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  albumTemplates,
  getTemplatePhotoCount,
  AI_AUTO_LAYOUT_TEMPLATE_ID,
  PageTemplateId,
} from "@/lib/albumTemplates";

function MiniPage({ templateId }: { templateId: PageTemplateId }) {
  if (templateId === "full" || templateId === "photoText") {
    return <div className="aspect-square bg-[var(--color-hairline)]" />;
  }
  if (templateId === "duo") {
    return (
      <div className="grid aspect-square grid-cols-2 gap-px bg-white">
        <div className="bg-[var(--color-hairline)]" />
        <div className="bg-[var(--color-hairline)]" />
      </div>
    );
  }
  if (templateId === "trio") {
    return (
      <div className="grid aspect-square grid-rows-2 gap-px bg-white">
        <div className="bg-[var(--color-hairline)]" />
        <div className="grid grid-cols-2 gap-px">
          <div className="bg-[var(--color-hairline)]" />
          <div className="bg-[var(--color-hairline)]" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-px bg-white">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--color-hairline)]" />
      ))}
    </div>
  );
}

function TemplatePageContent() {
  const searchParams = useSearchParams();
  const product = searchParams.get("product") ?? "";
  const size = searchParams.get("size") ?? "";
  const quantity = searchParams.get("quantity") ?? "1";
  // 포토북 옵션 선택 화면에서 넘어온 가격/옵션 정보예요. 그대로 다음 단계(/upload)로 이어서 넘겨줘요.
  const unitPrice = searchParams.get("unitPrice") ?? "";
  const cover = searchParams.get("cover") ?? "";
  const coverCoating = searchParams.get("coverCoating") ?? "";
  const innerPaper = searchParams.get("innerPaper") ?? "";
  const pages = searchParams.get("pages") ?? "";

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 sm:px-10">
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-10">
        <h1 className="text-3xl font-semibold sm:text-4xl">
          디자인을 골라주세요
        </h1>
        <p className="mt-3 text-[var(--color-charcoal)]/70 break-keep">
          10개의 펼침면(20페이지)으로 구성돼요. 사진은 나중에 각 칸에
          맞춰 넣으실 수 있어요.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albumTemplates
            .filter((template) => template.id !== AI_AUTO_LAYOUT_TEMPLATE_ID)
            .map((template) => {
            const isAiAuto = false;
            const photoCount = getTemplatePhotoCount(template);
            const nextUrl = `/upload?product=${encodeURIComponent(
              product
            )}&size=${size}&quantity=${quantity}&template=${template.id}&unitPrice=${unitPrice}&cover=${cover}&coverCoating=${coverCoating}&innerPaper=${innerPaper}&pages=${pages}`;

            return (
              <div
                key={template.id}
                className={`flex flex-col rounded-2xl border p-5 ${
                  isAiAuto
                    ? "border-transparent bg-[var(--color-sky)]/5 ring-1 ring-[var(--color-sky)]/40"
                    : "border-[var(--color-hairline)] bg-white"
                }`}
              >
                <h2 className="flex items-center gap-1.5 text-lg font-semibold">
                  {isAiAuto && <span aria-hidden>✨</span>}
                  {template.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-charcoal)]/60">
                  {template.description}
                </p>

                {isAiAuto ? (
                  <div className="mt-4 flex aspect-[5/2] items-center justify-center rounded-lg bg-white/60 text-xs text-[var(--color-charcoal)]/40">
                    사진을 올리면 자동으로 채워져요
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-5 gap-1">
                    {template.spreads.map((spread, i) => (
                      <div key={i} className="flex gap-px">
                        <div className="w-1/2">
                          <MiniPage templateId={spread.left} />
                        </div>
                        <div className="w-1/2">
                          <MiniPage templateId={spread.right} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-[var(--color-charcoal)]/50">
                  {isAiAuto ? "사진 개수에 맞춰 자동으로 배치돼요" : `필요한 사진: ${photoCount}장`}
                </p>

                <Link
                  href={nextUrl}
                  className="mt-4 rounded-full bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] py-3 text-center text-sm font-medium text-white transition hover:opacity-90"
                >
                  이 디자인으로 선택
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default function TemplatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory)]" />}>
      <TemplatePageContent />
    </Suspense>
  );
}
