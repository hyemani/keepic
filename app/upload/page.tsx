"use client";

import { Suspense, useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { productConfig, ProductName } from "@/lib/productConfig";
import { supabase } from "@/lib/supabase";
import {
  albumTemplates,
  pageTemplates,
  PageTemplateId,
  SpreadDef,
  TextBoxDef,
  ImageBoxDef,
  TableBoxDef,
  AI_AUTO_LAYOUT_TEMPLATE_ID,
  generateEmptyFreeformSpreads,
  findAutoPhotoSlotPosition,
  calcRequiredSpreadCount,
  fitSpreadsToCount,
  effectiveZOrder,
  nextTopZOrder,
  computeZOrderUpdates,
  isStickerImageBox,
  StackKind,
  StackOrderAction,
} from "@/lib/albumTemplates";
import {
  photobookCovers,
  coverCoatingOptions,
  innerPaperOptions,
  calcPagesLabel,
  photobookSizes,
  calcEstimatedSpineWidthMm,
  printFileSpec,
} from "@/lib/photobookPricing";
import { buildInnerPrintPdf, buildCoverPrintPdf, GUIDE_SAFETY_MARGIN_MM, SpreadPhotoGroup } from "@/lib/printCompose";
import { textBoxFontScaleToPt, textBoxPtToFontScale } from "@/lib/textBoxFontSize";
import {
  backgroundPatterns,
  backgroundPatternCategories,
  resolveSpreadBackgroundCss,
  patternToCssBackground,
  BackgroundPatternCategory,
} from "@/lib/backgroundPatterns";
// [테스트용] 새 pdf-lib 기반 PDF 생성기예요. ?pdftest=1 일 때만 화면에 테스트 버튼이 보여요.
// 기존 다운로드/발주 흐름(buildInnerPrintPdf)은 이 테스트와 무관하게 그대로 동작해요.
import { buildInnerPrintPdfLib, buildCoverPrintPdfLib, computeSpineLogoLayout } from "@/lib/printPdfLib";
import { mmToPt } from "@/lib/printGeometry";
import { computeImageBoxCoverRect, clampImageBoxInnerOffset } from "@/lib/imageBoxGeometry";
import {
  PhotoLayoutTemplate,
  LayoutApplyRange,
  LayoutSlot,
  slotToSpreadCoords,
  captionSlotFor,
  COVER_LAYOUT_TEMPLATES,
  spreadBrowseTemplates,
  SPREAD_AUTO_TO_HALF,
} from "@/lib/photoLayoutTemplates";

// 책등 제목의 글자 크기를 실제 mm 기준으로 재요(화면 미리보기용). lib/printCompose.ts의
// drawSpineTitleCanvas와 같은 원리예요 — 다만 "300dpi px" 대신 "mm"을 그대로 캔버스
// font-size 숫자로 써요(숫자 단위가 뭐든 비율만 맞으면 결과는 똑같아요). 이렇게 실제
// mm 크기를 구해서 화면에도 %(cqh) 단위로 넣으면, 창 크기가 바뀌어도 항상 책 실물
// 비율 그대로 커지고 작아져요(브라우저 창 크기와는 무관해요).
const SPINE_TEXT_SIDE_PADDING_MM_SCREEN = 1.5; // 혜민님 확인(2026-09-19): 책등 여백 1.5mm(lib/printCompose.ts와 같은 값)
const SPINE_TITLE_MIN_FONT_MM = (12 / 72) * 25.4; // 12pt
const SPINE_TITLE_MAX_FONT_RATIO_SCREEN = 0.55; // 혜민님 확인(2026-09-19): 책등 폭 꽉 채우면 글자가 너무 커 보여서 상한을 둬요(lib/printCompose.ts와 같은 값)
const COVER_TITLE_PT_PRESETS = [12, 18, 24, 30, 36, 48, 60, 72];

// 페이지에 자유롭게 얹을 수 있는 기본 스티커 세트예요. 실제로는 이미지박스와 같은
// 방식(ImageBoxDef)으로 다뤄져서, 스티커도 사진처럼 끌어서 옮기고 크기를 바꿀 수
// 있어요.
// 스티커·손글씨 탭 둘 다 "카테고리 바 + 썸네일 그리드" 구조를 공유해요(아래
// CategoryTabbedGrid 컴포넌트). 카테고리는 화면 곳곳에 흩어 적지 않고 이 배열들로만
// 관리해요 — 나중에 카테고리를 추가/삭제/순서변경할 때 이 배열만 고치면 돼요. "전체"
// (id: "all")는 두 목록 모두에서 항상 첫 번째 항목이고, 고르면 그 세트의 모든 아이템이
// 보여요(2026-09-23, 혜민님 스펙).
type StickerCategoryId =
  | "all"
  | "props"
  | "plant"
  | "animal"
  | "ribbon"
  | "tape"
  | "frame"
  | "icon"
  | "phrase"
  | "lettering"
  | "certificate"
  | "season"
  | "wedding"
  | "party"
  | "badge"
  | "goods";
const STICKER_CATEGORIES: { id: StickerCategoryId; label: string }[] = [
  { id: "props", label: "소품" },
  { id: "plant", label: "꽃·식물" },
  { id: "animal", label: "동물·캐릭터" },
  { id: "ribbon", label: "리본" },
  { id: "tape", label: "테이프·메모" },
  { id: "frame", label: "라벨·프레임" },
  { id: "icon", label: "아이콘" },
  { id: "phrase", label: "문구" },
  { id: "lettering", label: "스티커 글자" },
  { id: "certificate", label: "졸업증·상장" },
  { id: "season", label: "기념일·시즌" },
  { id: "wedding", label: "웨딩소품" },
  { id: "party", label: "파티·폭죽" },
  { id: "badge", label: "왕관·메달" },
  { id: "goods", label: "일상소품" },
];

type HandwritingCategoryId =
  | "all"
  | "daily"
  | "family"
  | "travel"
  | "love"
  | "pet"
  | "baby"
  | "birthday"
  | "graduation"
  | "thanks"
  | "season";
const HANDWRITING_CATEGORIES: { id: HandwritingCategoryId; label: string }[] = [
  { id: "daily", label: "일상" },
  { id: "family", label: "가족" },
  { id: "travel", label: "여행" },
  { id: "love", label: "사랑·커플" },
  { id: "pet", label: "반려동물" },
  { id: "baby", label: "아기·성장" },
  { id: "birthday", label: "생일·기념일" },
  { id: "graduation", label: "졸업·입학" },
  { id: "thanks", label: "감사·축하" },
  { id: "season", label: "계절" },
];

// 스티커·손글씨 아이템이 공유하는 모양이에요. category가 없으면(=지정 안 하면) "전체"
// 카테고리에서만 보이고 다른 개별 카테고리에는 안 걸려요.
type StickerLikeItem = { id: string; url: string; label: string; category?: string };

const STICKERS: StickerLikeItem[] = [
  { id: "heart", url: "/stickers/heart.svg", label: "하트", category: "props" },
  { id: "star", url: "/stickers/star.svg", label: "별", category: "props" },
  { id: "ribbon", url: "/stickers/ribbon.svg", label: "리본", category: "ribbon" },
  { id: "tape", url: "/stickers/tape.svg", label: "마스킹 테이프", category: "tape" },
  { id: "speech-bubble", url: "/stickers/speech-bubble.svg", label: "말풍선", category: "props" },
  { id: "cloud", url: "/stickers/cloud.svg", label: "구름", category: "props" },
  { id: "sparkle", url: "/stickers/sparkle.svg", label: "반짝임", category: "props" },
  { id: "frame", url: "/stickers/frame.svg", label: "프레임", category: "frame" },
  { id: "animal-sticker-01", url: "/stickers/animal/animal-sticker-01.png", label: "동물 스티커 1", category: "animal" },
  { id: "animal-sticker-02", url: "/stickers/animal/animal-sticker-02.png", label: "동물 스티커 2", category: "animal" },
  { id: "animal-sticker-03", url: "/stickers/animal/animal-sticker-03.png", label: "동물 스티커 3", category: "animal" },
  { id: "animal-sticker-04", url: "/stickers/animal/animal-sticker-04.png", label: "동물 스티커 4", category: "animal" },
  { id: "animal-sticker-05", url: "/stickers/animal/animal-sticker-05.png", label: "동물 스티커 5", category: "animal" },
  { id: "animal-sticker-06", url: "/stickers/animal/animal-sticker-06.png", label: "동물 스티커 6", category: "animal" },
  { id: "animal-sticker-07", url: "/stickers/animal/animal-sticker-07.png", label: "동물 스티커 7", category: "animal" },
  { id: "animal-sticker-08", url: "/stickers/animal/animal-sticker-08.png", label: "동물 스티커 8", category: "animal" },
  { id: "animal-sticker-09", url: "/stickers/animal/animal-sticker-09.png", label: "동물 스티커 9", category: "animal" },
  { id: "animal-sticker-10", url: "/stickers/animal/animal-sticker-10.png", label: "동물 스티커 10", category: "animal" },
  { id: "animal-sticker-11", url: "/stickers/animal/animal-sticker-11.png", label: "동물 스티커 11", category: "animal" },
  { id: "animal-sticker-12", url: "/stickers/animal/animal-sticker-12.png", label: "동물 스티커 12", category: "animal" },
  { id: "animal-sticker-13", url: "/stickers/animal/animal-sticker-13.png", label: "동물 스티커 13", category: "animal" },
  { id: "animal-sticker-14", url: "/stickers/animal/animal-sticker-14.png", label: "동물 스티커 14", category: "animal" },
  { id: "animal-sticker-15", url: "/stickers/animal/animal-sticker-15.png", label: "동물 스티커 15", category: "animal" },
  { id: "animal-sticker-16", url: "/stickers/animal/animal-sticker-16.png", label: "동물 스티커 16", category: "animal" },
  { id: "animal-sticker-17", url: "/stickers/animal/animal-sticker-17.png", label: "동물 스티커 17", category: "animal" },
  { id: "animal-sticker-18", url: "/stickers/animal/animal-sticker-18.png", label: "동물 스티커 18", category: "animal" },
  { id: "animal-sticker-19", url: "/stickers/animal/animal-sticker-19.png", label: "동물 스티커 19", category: "animal" },
  { id: "animal-sticker-20", url: "/stickers/animal/animal-sticker-20.png", label: "동물 스티커 20", category: "animal" },
  { id: "character-sticker-01", url: "/stickers/animal/character-sticker-01.svg", label: "캐릭터 스티커 1", category: "animal" },
  { id: "character-sticker-02", url: "/stickers/animal/character-sticker-02.svg", label: "캐릭터 스티커 2", category: "animal" },
  { id: "character-sticker-03", url: "/stickers/animal/character-sticker-03.svg", label: "캐릭터 스티커 3", category: "animal" },
  { id: "character-sticker-04", url: "/stickers/animal/character-sticker-04.svg", label: "캐릭터 스티커 4", category: "animal" },
  { id: "character-sticker-05", url: "/stickers/animal/character-sticker-05.svg", label: "캐릭터 스티커 5", category: "animal" },
  { id: "prop-sticker-01", url: "/stickers/props/prop-sticker-01.svg", label: "소품 스티커 1", category: "props" },
  { id: "prop-sticker-02", url: "/stickers/props/prop-sticker-02.svg", label: "소품 스티커 2", category: "props" },
  { id: "prop-sticker-03", url: "/stickers/props/prop-sticker-03.svg", label: "소품 스티커 3", category: "props" },
  { id: "prop-sticker-04", url: "/stickers/props/prop-sticker-04.svg", label: "소품 스티커 4", category: "props" },
  { id: "prop-sticker-05", url: "/stickers/props/prop-sticker-05.svg", label: "소품 스티커 5", category: "props" },
  { id: "prop-sticker-06", url: "/stickers/props/prop-sticker-06.svg", label: "소품 스티커 6", category: "props" },
  { id: "flower-sticker-01", url: "/stickers/plant/flower-sticker-01.png", label: "꽃 스티커 1", category: "plant" },
  { id: "flower-sticker-02", url: "/stickers/plant/flower-sticker-02.png", label: "꽃 스티커 2", category: "plant" },
  { id: "flower-sticker-03", url: "/stickers/plant/flower-sticker-03.png", label: "꽃 스티커 3", category: "plant" },
  { id: "flower-sticker-04", url: "/stickers/plant/flower-sticker-04.png", label: "꽃 스티커 4", category: "plant" },
  { id: "flower-sticker-05", url: "/stickers/plant/flower-sticker-05.png", label: "꽃 스티커 5", category: "plant" },
  { id: "flower-sticker-06", url: "/stickers/plant/flower-sticker-06.png", label: "꽃 스티커 6", category: "plant" },
  { id: "tulip-sticker-01", url: "/stickers/plant/tulip-sticker-01.svg", label: "튤립 스티커 1", category: "plant" },
  { id: "tulip-sticker-02", url: "/stickers/plant/tulip-sticker-02.svg", label: "튤립 스티커 2", category: "plant" },
  { id: "tulip-sticker-03", url: "/stickers/plant/tulip-sticker-03.svg", label: "튤립 스티커 3", category: "plant" },
  { id: "tulip-sticker-04", url: "/stickers/plant/tulip-sticker-04.svg", label: "튤립 스티커 4", category: "plant" },
  { id: "tulip-sticker-05", url: "/stickers/plant/tulip-sticker-05.svg", label: "튤립 스티커 5", category: "plant" },
  { id: "tulip-sticker-06", url: "/stickers/plant/tulip-sticker-06.svg", label: "튤립 스티커 6", category: "plant" },
  { id: "tulip-sticker-07", url: "/stickers/plant/tulip-sticker-07.svg", label: "튤립 스티커 7", category: "plant" },
  { id: "graduation-sticker-01", url: "/stickers/certificate/graduation-sticker-01.png", label: "졸업 스티커 1", category: "certificate" },
  { id: "graduation-sticker-02", url: "/stickers/certificate/graduation-sticker-02.png", label: "졸업 스티커 2", category: "certificate" },
  { id: "graduation-sticker-03", url: "/stickers/certificate/graduation-sticker-03.png", label: "졸업 스티커 3", category: "certificate" },
  { id: "graduation-sticker-04", url: "/stickers/certificate/graduation-sticker-04.png", label: "졸업 스티커 4", category: "certificate" },
  { id: "graduation-sticker-05", url: "/stickers/certificate/graduation-sticker-05.png", label: "졸업 스티커 5", category: "certificate" },
  { id: "graduation-sticker-06", url: "/stickers/certificate/graduation-sticker-06.png", label: "졸업 스티커 6", category: "certificate" },
  { id: "graduation-sticker-07", url: "/stickers/certificate/graduation-sticker-07.png", label: "졸업 스티커 7", category: "certificate" },
  { id: "graduation-sticker-08", url: "/stickers/certificate/graduation-sticker-08.png", label: "졸업 스티커 8", category: "certificate" },
  { id: "graduation-sticker-09", url: "/stickers/certificate/graduation-sticker-09.png", label: "졸업 스티커 9", category: "certificate" },
  { id: "graduation-sticker-10", url: "/stickers/certificate/graduation-sticker-10.png", label: "졸업 스티커 10", category: "certificate" },
  { id: "icon-camera-01", url: "/stickers/icon/icon-camera-01.svg", label: "카메라 아이콘 1", category: "icon" },
  { id: "icon-camera-02", url: "/stickers/icon/icon-camera-02.svg", label: "카메라 아이콘 2", category: "icon" },
  { id: "icon-gift", url: "/stickers/icon/icon-gift.svg", label: "선물 아이콘", category: "icon" },
  { id: "icon-location", url: "/stickers/icon/icon-location.svg", label: "위치 아이콘", category: "icon" },
  { id: "icon-heart-01", url: "/stickers/icon/icon-heart-01.svg", label: "하트 아이콘 1", category: "icon" },
  { id: "icon-heart-02", url: "/stickers/icon/icon-heart-02.svg", label: "하트 아이콘 2", category: "icon" },
  { id: "icon-heart-03", url: "/stickers/icon/icon-heart-03.svg", label: "하트 아이콘 3", category: "icon" },
  { id: "icon-heart-04", url: "/stickers/icon/icon-heart-04.svg", label: "하트 아이콘 4", category: "icon" },
  { id: "icon-heart-05", url: "/stickers/icon/icon-heart-05.svg", label: "하트 아이콘 5", category: "icon" },
  { id: "icon-heart-06", url: "/stickers/icon/icon-heart-06.svg", label: "하트 아이콘 6", category: "icon" },
  { id: "icon-heart-07", url: "/stickers/icon/icon-heart-07.svg", label: "하트 아이콘 7", category: "icon" },
  { id: "icon-heart-08", url: "/stickers/icon/icon-heart-08.svg", label: "하트 아이콘 8", category: "icon" },
  { id: "frame-01", url: "/stickers/frame/frame-01.svg", label: "프레임 1", category: "frame" },
  { id: "frame-02", url: "/stickers/frame/frame-02.svg", label: "프레임 2", category: "frame" },
  { id: "frame-03", url: "/stickers/frame/frame-03.svg", label: "프레임 3", category: "frame" },
  { id: "frame-04", url: "/stickers/frame/frame-04.svg", label: "프레임 4", category: "frame" },
  { id: "frame-05", url: "/stickers/frame/frame-05.svg", label: "프레임 5", category: "frame" },
  { id: "keepic-logo-01", url: "/stickers/icon/keepic-logo-01.svg", label: "키픽 로고 1", category: "icon" },
  { id: "keepic-logo-02", url: "/stickers/icon/keepic-logo-02.svg", label: "키픽 로고 2", category: "icon" },
  { id: "keepic-logo-03", url: "/stickers/icon/keepic-logo-03.svg", label: "키픽 로고 3", category: "icon" },
  { id: "keepic-logo-04", url: "/stickers/icon/keepic-logo-04.svg", label: "키픽 로고 4", category: "icon" },
  { id: "keepic-logo-05", url: "/stickers/icon/keepic-logo-05.svg", label: "키픽 로고 5", category: "icon" },
  { id: "label-happy", url: "/stickers/frame/label-happy.svg", label: "해피 라벨", category: "frame" },
  { id: "label-memory", url: "/stickers/frame/label-memory.svg", label: "메모리 라벨", category: "frame" },
  { id: "label-special", url: "/stickers/frame/label-special.svg", label: "스페셜 라벨", category: "frame" },
  { id: "label-travel", url: "/stickers/frame/label-travel.svg", label: "트래블 라벨", category: "frame" },
  { id: "party-sticker-01", url: "/stickers/season/party-sticker-01.svg", label: "파티 스티커 1", category: "season" },
  { id: "party-sticker-02", url: "/stickers/season/party-sticker-02.svg", label: "파티 스티커 2", category: "season" },
  { id: "party-sticker-03", url: "/stickers/season/party-sticker-03.svg", label: "파티 스티커 3", category: "season" },
  { id: "party-sticker-04", url: "/stickers/season/party-sticker-04.svg", label: "파티 스티커 4", category: "season" },
  { id: "party-sticker-05", url: "/stickers/season/party-sticker-05.svg", label: "파티 스티커 5", category: "season" },
  { id: "party-sticker-06", url: "/stickers/season/party-sticker-06.svg", label: "파티 스티커 6", category: "season" },
  { id: "party-sticker-07", url: "/stickers/season/party-sticker-07.svg", label: "파티 스티커 7", category: "season" },
  { id: "party-sticker-08", url: "/stickers/season/party-sticker-08.svg", label: "파티 스티커 8", category: "season" },
  { id: "party-sticker-09", url: "/stickers/season/party-sticker-09.svg", label: "파티 스티커 9", category: "season" },
  { id: "ribbon-sticker-01", url: "/stickers/ribbon/ribbon-sticker-01.png", label: "리본 스티커 1", category: "ribbon" },
  { id: "ribbon-sticker-02", url: "/stickers/ribbon/ribbon-sticker-02.png", label: "리본 스티커 2", category: "ribbon" },
  { id: "ribbon-sticker-03", url: "/stickers/ribbon/ribbon-sticker-03.png", label: "리본 스티커 3", category: "ribbon" },
  { id: "ribbon-sticker-04", url: "/stickers/ribbon/ribbon-sticker-04.png", label: "리본 스티커 4", category: "ribbon" },
  { id: "ribbon-sticker-05", url: "/stickers/ribbon/ribbon-sticker-05.png", label: "리본 스티커 5", category: "ribbon" },
  { id: "ribbon-sticker-06", url: "/stickers/ribbon/ribbon-sticker-06.png", label: "리본 스티커 6", category: "ribbon" },
  { id: "tape-sticker-01", url: "/stickers/tape/tape-sticker-01.png", label: "테이프·메모 스티커 1", category: "tape" },
  { id: "tape-sticker-02", url: "/stickers/tape/tape-sticker-02.png", label: "테이프·메모 스티커 2", category: "tape" },
  { id: "tape-sticker-03", url: "/stickers/tape/tape-sticker-03.png", label: "테이프·메모 스티커 3", category: "tape" },
  { id: "tape-sticker-04", url: "/stickers/tape/tape-sticker-04.png", label: "테이프·메모 스티커 4", category: "tape" },
  { id: "tape-sticker-05", url: "/stickers/tape/tape-sticker-05.png", label: "테이프·메모 스티커 5", category: "tape" },
  { id: "tape-sticker-06", url: "/stickers/tape/tape-sticker-06.png", label: "테이프·메모 스티커 6", category: "tape" },
  { id: "tape-sticker-07", url: "/stickers/tape/tape-sticker-07.png", label: "테이프·메모 스티커 7", category: "tape" },
  { id: "tape-sticker-08", url: "/stickers/tape/tape-sticker-08.png", label: "테이프·메모 스티커 8", category: "tape" },
  { id: "tape-sticker-09", url: "/stickers/tape/tape-sticker-09.png", label: "테이프·메모 스티커 9", category: "tape" },
  { id: "tape-sticker-10", url: "/stickers/tape/tape-sticker-10.png", label: "테이프·메모 스티커 10", category: "tape" },
  { id: "tape-sticker-11", url: "/stickers/tape/tape-sticker-11.png", label: "테이프·메모 스티커 11", category: "tape" },
  { id: "tape-sticker-12", url: "/stickers/tape/tape-sticker-12.png", label: "테이프·메모 스티커 12", category: "tape" },
  { id: "tape-sticker-13", url: "/stickers/tape/tape-sticker-13.png", label: "테이프·메모 스티커 13", category: "tape" },
  { id: "tape-sticker-14", url: "/stickers/tape/tape-sticker-14.png", label: "테이프·메모 스티커 14", category: "tape" },
  { id: "tape-sticker-15", url: "/stickers/tape/tape-sticker-15.png", label: "테이프·메모 스티커 15", category: "tape" },
  { id: "tape-sticker-16", url: "/stickers/tape/tape-sticker-16.png", label: "테이프·메모 스티커 16", category: "tape" },
  { id: "tape-sticker-17", url: "/stickers/tape/tape-sticker-17.png", label: "테이프·메모 스티커 17", category: "tape" },
  { id: "tape-sticker-18", url: "/stickers/tape/tape-sticker-18.png", label: "테이프·메모 스티커 18", category: "tape" },
  { id: "tape-sticker-19", url: "/stickers/tape/tape-sticker-19.png", label: "테이프·메모 스티커 19", category: "tape" },
  { id: "tape-sticker-20", url: "/stickers/tape/tape-sticker-20.png", label: "테이프·메모 스티커 20", category: "tape" },
  // 2026-10-05, 혜민님 요청: 영문 문구·웨딩소품·파티소품(폭죽 포함)·왕관·메달·일상소품
  // 스티커 50+9종을 새 카테고리(phrase 확장/wedding/party/badge/goods)로 추가했어요.
  { id: "phrase-en-01", url: "/stickers/phrase/phrase-en-01.png", label: "JUST MARRIED", category: "phrase" },
  { id: "phrase-en-02", url: "/stickers/phrase/phrase-en-02.png", label: "FOREVER US", category: "phrase" },
  { id: "phrase-en-03", url: "/stickers/phrase/phrase-en-03.png", label: "LOVE ALWAYS", category: "phrase" },
  { id: "phrase-en-04", url: "/stickers/phrase/phrase-en-04.png", label: "OUR STORY", category: "phrase" },
  { id: "phrase-en-05", url: "/stickers/phrase/phrase-en-05.png", label: "HAPPY BIRTHDAY", category: "phrase" },
  { id: "phrase-en-06", url: "/stickers/phrase/phrase-en-06.png", label: "MAKE A WISH", category: "phrase" },
  { id: "phrase-en-07", url: "/stickers/phrase/phrase-en-07.png", label: "CHEERS TO 60", category: "phrase" },
  { id: "phrase-en-08", url: "/stickers/phrase/phrase-en-08.png", label: "CELEBRATE YOU", category: "phrase" },
  { id: "phrase-en-09", url: "/stickers/phrase/phrase-en-09.png", label: "BEST DAY EVER", category: "phrase" },
  { id: "phrase-en-10", url: "/stickers/phrase/phrase-en-10.png", label: "MEMORIES FOREVER", category: "phrase" },
  { id: "wedding-01", url: "/stickers/wedding/wedding-01.png", label: "웨딩링", category: "wedding" },
  { id: "wedding-02", url: "/stickers/wedding/wedding-02.png", label: "부케", category: "wedding" },
  { id: "wedding-03", url: "/stickers/wedding/wedding-03.png", label: "웨딩케이크", category: "wedding" },
  { id: "wedding-04", url: "/stickers/wedding/wedding-04.png", label: "베일", category: "wedding" },
  { id: "wedding-05", url: "/stickers/wedding/wedding-05.png", label: "청첩장", category: "wedding" },
  { id: "wedding-06", url: "/stickers/wedding/wedding-06.png", label: "샴페인잔", category: "wedding" },
  { id: "wedding-07", url: "/stickers/wedding/wedding-07.png", label: "새틴리본", category: "wedding" },
  { id: "wedding-08", url: "/stickers/wedding/wedding-08.png", label: "웨딩벨", category: "wedding" },
  { id: "wedding-09", url: "/stickers/wedding/wedding-09.png", label: "러브레터", category: "wedding" },
  { id: "wedding-10", url: "/stickers/wedding/wedding-10.png", label: "플라워아치", category: "wedding" },
  { id: "party-01", url: "/stickers/party/party-01.png", label: "풍선", category: "party" },
  { id: "party-02", url: "/stickers/party/party-02.png", label: "풍선다발", category: "party" },
  { id: "party-03", url: "/stickers/party/party-03.png", label: "파티폭죽", category: "party" },
  { id: "party-04", url: "/stickers/party/party-04.png", label: "파티모자", category: "party" },
  { id: "party-05", url: "/stickers/party/party-05.png", label: "가랜드", category: "party" },
  { id: "party-06", url: "/stickers/party/party-06.png", label: "선물상자", category: "party" },
  { id: "party-07", url: "/stickers/party/party-07.png", label: "리본테이프", category: "party" },
  { id: "party-08", url: "/stickers/party/party-08.png", label: "스파클러", category: "party" },
  { id: "party-09", url: "/stickers/party/party-09.png", label: "컵케이크", category: "party" },
  { id: "party-10", url: "/stickers/party/party-10.png", label: "미러볼", category: "party" },
  { id: "party-fireworks-01", url: "/stickers/party/party-fireworks-01.png", label: "불꽃놀이 1", category: "party" },
  { id: "party-fireworks-02", url: "/stickers/party/party-fireworks-02.png", label: "불꽃놀이 2", category: "party" },
  { id: "party-fireworks-03", url: "/stickers/party/party-fireworks-03.png", label: "불꽃놀이 3", category: "party" },
  { id: "party-fireworks-04", url: "/stickers/party/party-fireworks-04.png", label: "불꽃놀이 4", category: "party" },
  { id: "party-fireworks-05", url: "/stickers/party/party-fireworks-05.png", label: "불꽃놀이 5", category: "party" },
  { id: "party-fireworks-06", url: "/stickers/party/party-fireworks-06.png", label: "불꽃놀이 6", category: "party" },
  { id: "party-fireworks-07", url: "/stickers/party/party-fireworks-07.png", label: "불꽃놀이 7", category: "party" },
  { id: "party-fireworks-08", url: "/stickers/party/party-fireworks-08.png", label: "불꽃놀이 8", category: "party" },
  { id: "party-fireworks-09", url: "/stickers/party/party-fireworks-09.png", label: "불꽃놀이 9", category: "party" },
  { id: "crown-01", url: "/stickers/badge/crown-01.png", label: "펄티아라", category: "badge" },
  { id: "crown-02", url: "/stickers/badge/crown-02.png", label: "클래식왕관", category: "badge" },
  { id: "crown-03", url: "/stickers/badge/crown-03.png", label: "벨벳왕관", category: "badge" },
  { id: "crown-04", url: "/stickers/badge/crown-04.png", label: "스타티아라", category: "badge" },
  { id: "crown-05", url: "/stickers/badge/crown-05.png", label: "미니왕관", category: "badge" },
  { id: "medal-01", url: "/stickers/badge/medal-01.png", label: "골드스타메달", category: "badge" },
  { id: "medal-02", url: "/stickers/badge/medal-02.png", label: "실버월계메달", category: "badge" },
  { id: "medal-03", url: "/stickers/badge/medal-03.png", label: "하트메달", category: "badge" },
  { id: "medal-04", url: "/stickers/badge/medal-04.png", label: "라벤더메달", category: "badge" },
  { id: "medal-05", url: "/stickers/badge/medal-05.png", label: "일등메달", category: "badge" },
  { id: "goods-01", url: "/stickers/goods/goods-01.png", label: "마스킹테이프", category: "goods" },
  { id: "goods-02", url: "/stickers/goods/goods-02.png", label: "찢어진 메모지", category: "goods" },
  { id: "goods-03", url: "/stickers/goods/goods-03.png", label: "골드 종이클립", category: "goods" },
  { id: "goods-04", url: "/stickers/goods/goods-04.png", label: "빈 접착메모", category: "goods" },
  { id: "goods-05", url: "/stickers/goods/goods-05.png", label: "압화 데이지", category: "goods" },
  { id: "goods-06", url: "/stickers/goods/goods-06.png", label: "유칼립투스 가지", category: "goods" },
  { id: "goods-07", url: "/stickers/goods/goods-07.png", label: "빈티지 카메라", category: "goods" },
  { id: "goods-08", url: "/stickers/goods/goods-08.png", label: "따뜻한 커피잔", category: "goods" },
  { id: "goods-09", url: "/stickers/goods/goods-09.png", label: "하트 참장식", category: "goods" },
  { id: "goods-10", url: "/stickers/goods/goods-10.png", label: "여행 캐리어", category: "goods" },
];

// 손글씨 스티커예요(2026-09-24, 혜민님이 공유한 원본 폴더에서 실제 이미지로 채움).
// 데이터 모양은 STICKERS와 똑같아요.
const HANDWRITING_ITEMS: StickerLikeItem[] = [
  { id: "hw-good-day-with-you", url: "/stickers/love/hw-good-day-with-you.png", label: "좋은 날, 더 좋은 너와", category: "love" },
  { id: "hw-precious-memory", url: "/stickers/daily/hw-precious-memory.png", label: "소중한 추억", category: "daily" },
  { id: "hw-always-happy", url: "/stickers/daily/hw-always-happy.png", label: "언제나 행복하길", category: "daily" },
  { id: "hw-lets-travel-again", url: "/stickers/travel/hw-lets-travel-again.png", label: "우리, 또 여행가자", category: "travel" },
  { id: "hw-this-moment-so-good", url: "/stickers/daily/hw-this-moment-so-good.png", label: "지금 이 순간 참, 좋다", category: "daily" },
  { id: "hw-always-thankful", url: "/stickers/thanks/hw-always-thankful.png", label: "늘 고마워", category: "thanks" },
  { id: "hw-i-love-you", url: "/stickers/love/hw-i-love-you.png", label: "사랑해", category: "love" },
  { id: "hw-well-done-today", url: "/stickers/daily/hw-well-done-today.png", label: "오늘도 수고했어", category: "daily" },
  { id: "hw-better-together", url: "/stickers/love/hw-better-together.png", label: "함께라서 더 좋아", category: "love" },
  { id: "hw-our-precious-moment", url: "/stickers/daily/hw-our-precious-moment.png", label: "우리의 소중한 순간", category: "daily" },
  { id: "hw-everyday-is-gift", url: "/stickers/daily/hw-everyday-is-gift.png", label: "매일이 선물", category: "daily" },
  { id: "hw-love-you-so-much", url: "/stickers/love/hw-love-you-so-much.png", label: "많이 많이 사랑해", category: "love" },
  { id: "hw-sparkling-you-1", url: "/stickers/daily/hw-sparkling-you-1.png", label: "반짝반짝 빛나는 너", category: "daily" },
  { id: "hw-our-child-best-1", url: "/stickers/baby/hw-our-child-best-1.png", label: "우리 아이 최고!", category: "baby" },
  { id: "hw-smile-more-days", url: "/stickers/daily/hw-smile-more-days.png", label: "행복하게 웃어줘", category: "daily" },
  { id: "hw-flower-path-1", url: "/stickers/daily/hw-flower-path-1.png", label: "꽃길만 걷자", category: "daily" },
  { id: "hw-love-our-baby", url: "/stickers/baby/hw-love-our-baby.png", label: "우리 아가 사랑해", category: "baby" },
  { id: "hw-grow-well-1", url: "/stickers/baby/hw-grow-well-1.png", label: "쑥쑥 자라라", category: "baby" },
  { id: "hw-many-smiling-days", url: "/stickers/daily/hw-many-smiling-days.png", label: "웃는 날이 많기를", category: "daily" },
  { id: "hw-happy-with-you", url: "/stickers/love/hw-happy-with-you.png", label: "너와 함께라서 행복해", category: "love" },
  { id: "hw-did-well-today", url: "/stickers/daily/hw-did-well-today.png", label: "오늘도 잘했어", category: "daily" },
  { id: "hw-good-job", url: "/stickers/daily/hw-good-job.png", label: "참 잘했어요", category: "daily" },
  { id: "hw-our-child-best-2", url: "/stickers/baby/hw-our-child-best-2.png", label: "우리 아이 최고!", category: "baby" },
  { id: "hw-sparkling-you-2", url: "/stickers/daily/hw-sparkling-you-2.png", label: "반짝반짝 빛나는 너", category: "daily" },
  { id: "hw-congrats-graduation", url: "/stickers/graduation/hw-congrats-graduation.png", label: "졸업을 축하해", category: "graduation" },
  { id: "hw-congrats-completion", url: "/stickers/graduation/hw-congrats-completion.png", label: "수료를 축하해", category: "graduation" },
  { id: "hw-grow-well-2", url: "/stickers/baby/hw-grow-well-2.png", label: "쑥쑥 자라라", category: "baby" },
  // 2026-10-05, 혜민님 요청: handwriting28~47(투명배경 깨짐) 삭제 후, 새로 올려주신
  // 투명 배경 수정판 9장(hw2-*) + 새 한글 손글씨 문구 10장(hw2-kr-*)을 추가했어요.
  { id: "hw2-our-class-best", url: "/stickers/graduation/hw2-our-class-best.png", label: "우리반 최고", category: "graduation" },
  { id: "hw2-congrats-wedding", url: "/stickers/birthday/hw2-congrats-wedding.png", label: "결혼 축하해", category: "birthday" },
  { id: "hw2-our-class-best-star", url: "/stickers/graduation/hw2-our-class-best-star.png", label: "우리반 최고 (별)", category: "graduation" },
  { id: "hw2-beginning-of-two", url: "/stickers/birthday/hw2-beginning-of-two.png", label: "두 사람의 시작", category: "birthday" },
  { id: "hw2-happy-wedding-day", url: "/stickers/birthday/hw2-happy-wedding-day.png", label: "행복한 웨딩데이", category: "birthday" },
  { id: "hw2-congrats-60th", url: "/stickers/birthday/hw2-congrats-60th.png", label: "환갑 축하드려요", category: "birthday" },
  { id: "hw2-stay-healthy-long", url: "/stickers/birthday/hw2-stay-healthy-long.png", label: "오래오래 건강하세요", category: "birthday" },
  { id: "hw2-happy-birthday", url: "/stickers/birthday/hw2-happy-birthday.png", label: "생일 축하해", category: "birthday" },
  { id: "hw2-today-is-your-birthday", url: "/stickers/birthday/hw2-today-is-your-birthday.png", label: "오늘은 당신의 생일", category: "birthday" },
  { id: "hw2-kr-01", url: "/stickers/birthday/hw2-kr-01.png", label: "사랑 가득한 결혼식", category: "birthday" },
  { id: "hw2-kr-02", url: "/stickers/birthday/hw2-kr-02.png", label: "오늘부터 우리", category: "birthday" },
  { id: "hw2-kr-03", url: "/stickers/birthday/hw2-kr-03.png", label: "함께라서 빛나는 날", category: "birthday" },
  { id: "hw2-kr-04", url: "/stickers/birthday/hw2-kr-04.png", label: "백년해로", category: "birthday" },
  { id: "hw2-kr-05", url: "/stickers/birthday/hw2-kr-05.png", label: "환갑을 축하해요", category: "birthday" },
  { id: "hw2-kr-06", url: "/stickers/daily/hw2-kr-06.png", label: "인생은 지금부터", category: "daily" },
  { id: "hw2-kr-07", url: "/stickers/birthday/hw2-kr-07.png", label: "생신 축하드려요", category: "birthday" },
  { id: "hw2-kr-08", url: "/stickers/birthday/hw2-kr-08.png", label: "오래오래 건강하세요", category: "birthday" },
  { id: "hw2-kr-09", url: "/stickers/birthday/hw2-kr-09.png", label: "생일 축하해", category: "birthday" },
  { id: "hw2-kr-10", url: "/stickers/baby/hw2-kr-10.png", label: "태어나줘서 고마워", category: "baby" },
];

// 편집 화면 왼쪽 아이콘 메뉴예요(스프레드 페이지 편집 전용, 2026-09-19). 예전엔 사진 추가·
// 스티커 추가가 캔버스 위에 마우스를 올려야만 보이는 숨은 버튼이었고, 배경 설정은 항상
// 펼쳐진 패널로만 있었는데, 이제 다른 사진책 편집기들처럼 아이콘을 눌러야 해당 메뉴가
// 열리는 구조로 통일해요. "표지변경"(테마 골라서 한 번에 바꾸기)과 "손글씨스티커"는 아직
// 실제 기능이 없어서 "준비 중" 안내만 보여줘요.
type MenuTabIconName = "layout" | "background" | "theme" | "sticker" | "handwriting" | "text" | "photo";

// 왼쪽 아이콘 메뉴(EDIT_TABS·COVER_EDIT_TABS) 전용 아이콘이에요 — LayerIcon과 같은
// 24x24 획(stroke) 스타일로 그려서, 이모티콘 대신 하나의 통일된 아이콘 세트로
// 보이게 해요(2026-09-27, "아이콘도 이모티콘 말고 아이콘으로 만들어서 수정해주세요").
function MenuTabIcon({ name, className }: { name: MenuTabIconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className ?? "h-4 w-4",
  };
  switch (name) {
    case "layout":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="8" height="8" rx="1" />
          <rect x="12.5" y="3.5" width="8" height="8" rx="1" />
          <rect x="3.5" y="12.5" width="8" height="8" rx="1" />
          <rect x="12.5" y="12.5" width="8" height="8" rx="1" />
        </svg>
      );
    case "background":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M4 17l5-5 4 4 3-3 4 4" />
        </svg>
      );
    case "theme":
      return (
        <svg {...common}>
          <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21M5.8 5.8l2.2 2.2M16 16l2.2 2.2M18.2 5.8L16 8M8 16l-2.2 2.2" />
          <circle cx="12" cy="12" r="2.4" />
        </svg>
      );
    case "sticker":
      return (
        <svg {...common}>
          <path d="M12 3.5l2.5 5.2 5.7.7-4.1 4 1 5.7-5.1-2.8-5.1 2.8 1-5.7-4.1-4 5.7-.7L12 3.5z" />
        </svg>
      );
    case "handwriting":
      return (
        <svg {...common}>
          <path d="M4 20l1-4.2L14.6 6.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20z" />
          <path d="M13 7.8l3.2 3.2" />
        </svg>
      );
    case "photo":
      return (
        <svg {...common}>
          <path d="M4 8.2A1.7 1.7 0 0 1 5.7 6.5h1.9l.9-1.6h7l.9 1.6h1.9A1.7 1.7 0 0 1 20 8.2v9.1a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 17.3V8.2z" />
          <circle cx="12" cy="12.5" r="3.2" />
        </svg>
      );
    case "text":
      return (
        <svg {...common}>
          <path d="M5 6.5h14M12 6.5V18" />
        </svg>
      );
    default:
      return null;
  }
}

type EditTabId = "layout" | "background" | "theme" | "sticker" | "handwriting" | "text" | "photo";
// 2026-09-25 브리프(KEEPIC_EDITOR_SWEETBOOK_GAP) 1단계 요청: 표지·내지 메뉴 순서를
// 테마/레이아웃/사진/스티커/손글씨/텍스트/배경으로 통일. "theme" 탭의 라벨이
// "표지변경"으로 돼 있던 건 내지 탭인데 표지를 가리키는 이름이라 실제 내용(테마 준비중
// 안내)과 맞지 않는 오기였음 — "테마"로 수정. 탭 내용(준비 중 안내 문구)은 그대로 둠:
// 아직 구현되지 않은 기능을 구현된 것처럼 보이게 만들지 않기 위함.
const EDIT_TABS: { id: EditTabId; label: string; icon: MenuTabIconName }[] = [
  { id: "theme", label: "테마", icon: "theme" },
  { id: "layout", label: "레이아웃", icon: "layout" },
  // 2026-09-23, 혜민님 요청: 독립된 "사진" 탭(과 별도 "사진 추가" 버튼)을 없애고, 레이아웃
  // 밖에서 사진을 자유롭게 추가·정리하는 기능(사진 보관함 업로드·전체 목록·이 페이지에
  // 사진 추가)을 여기 "꾸미기" 탭으로 합쳤어요 — 표지 편집의 "꾸미기" 탭과 같은 자리예요.
  { id: "photo", label: "사진", icon: "photo" },
  { id: "sticker", label: "스티커", icon: "sticker" },
  // 2026-10-01, 혜민님 요청: "손글씨스티커 패널제목을 손글씨로 수정해주세요"
  { id: "handwriting", label: "손글씨", icon: "handwriting" },
  { id: "text", label: "텍스트", icon: "text" },
  { id: "background", label: "배경", icon: "background" },
];
// "레이아웃" 탭 안에서 셀 개수(사진 몇 장용 템플릿인지)로 골라볼 수 있는 필터예요.
// "auto"는 지금 적용 범위(왼쪽/오른쪽/펼침면)에 있는 실제 사진 개수에 맞는 템플릿만
// 자동으로 보여줘요(기본값) — "전체"를 포함해 혜민님이 다른 개수 템플릿도 미리 보고
// 싶을 때만 직접 골라요.
type LayoutCountFilter = "auto" | "all" | 1 | 2 | 3 | 4 | 5 | "6+";
const LAYOUT_COUNT_FILTERS: { id: LayoutCountFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: 1, label: "1장" },
  { id: 2, label: "2장" },
  { id: 3, label: "3장" },
  { id: 4, label: "4장" },
  { id: 5, label: "5장" },
  { id: "6+", label: "6장+" },
];
// 표지 페이지 전용 아이콘 메뉴예요 — 내지(EDIT_TABS)와 항목이 달라서 따로 둬요
// (2026-09-23, 혜민님 요청으로 표지도 내지처럼 아이콘 메뉴로 재설계).
type CoverEditTabId = "theme" | "layout" | "photo" | "sticker" | "handwriting" | "text" | "background";
const COVER_EDIT_TABS: { id: CoverEditTabId; label: string; icon: MenuTabIconName }[] = [
  // 2026-09-26, 혜민님 요청: 앞표지·뒤표지·책등을 하나씩 따로 안 만지고, 미리 만들어둔
  // "테마"를 골라 한 번에 어울리는 배경(+ 뒤표지 무늬)·제목 서체로 맞출 수 있는 탭이에요.
  // 맨 앞에 둬서 제일 먼저 보이게 했어요 — 테마를 고른 뒤에도 사진·텍스트는 아래 탭에서
  // 그대로 따로 편집할 수 있어요(테마가 사진·텍스트를 지우거나 건드리지 않음).
  { id: "theme", label: "테마", icon: "theme" },
  // 2026-09-24, 혜민님 요청: 표지도 내지처럼 사진 여러 장을 미리 정해둔 배치로 한 번에
  // 넣을 수 있는 "레이아웃" 탭이에요. 앞표지/뒤표지 각각 따로 적용해요(책등은 사진 칸이
  // 없어서 대상에서 빼고, 표지 전체를 가로지르는 파노라마는 별도 기능이라 여기 포함 안 해요).
  { id: "layout", label: "레이아웃", icon: "layout" },
  // 2026-09, "키픽 로고 vs 작은 사진" 뒤표지 모드 전환을 사진 탭에서 여기로 옮겼어요.
  // 2026-09-23, 독립 "사진" 탭을 없애면서 앞표지 "사진 바꾸기"도 이 탭으로 합쳤어요.
  { id: "photo", label: "사진", icon: "photo" },
  // 2026-09-27, 혜민님 재확인: "표지에 스티커패널이 없어졌어요" — 원래도 표지엔 스티커
  // 탭이 없었는데(내지에만 있었음), 표지도 내지처럼 스티커를 붙일 수 있게 새로 추가해요.
  { id: "sticker", label: "스티커", icon: "sticker" },
  // 2026-09-25 브리프 1단계 요청: 내지엔 손글씨 탭이 있는데 표지엔 없었던 걸 맞춤 —
  // 아래 handleAddCoverHandwriting이 실제로 손글씨를 이미지박스로 추가함(가짜 버튼 아님).
  { id: "handwriting", label: "손글씨", icon: "handwriting" },
  // 2026-09, 표지의 "제목"·"텍스트박스" 탭을 내지처럼 "텍스트" 하나로 합쳤어요 —
  // 제목 필드(글자 크기·행간·자간·서체·책등 연결)와 텍스트박스 추가 버튼을 한 곳에서.
  { id: "text", label: "텍스트", icon: "text" },
  { id: "background", label: "배경", icon: "background" },
];

// 표지 "테마" 프리셋에 쓰는 타입이에요 — 실제 배열(COVER_THEMES)은 fontOptions
// 선언 다음에 있어요(테마 기본 서체가 fontOptions를 참조해서, 선언 순서상 그 뒤에
// 와야 해요).
// 2026-09-25, 혜민님 요청(항목5): "테마는 가족 여행 커플 아기 생일 이렇게 5개 메뉴로
// 나눠주세요" — 테마 카테고리 id는 손글씨 카테고리(HANDWRITING_CATEGORIES)와 같은
// 이름을 재사용해서(family/travel/love/baby/birthday) 코드 전체에서 일관되게 맞췄어요.
type CoverThemeCategory = "family" | "travel" | "love" | "baby" | "birthday";
type CoverTheme = {
  id: string;
  label: string;
  category: CoverThemeCategory;
  frontBackgroundColor: string;
  spineBackgroundColor: string;
  backBackgroundColor: string;
  backPatternId?: string;
  titleFontFamily?: string;
};
const THEME_CATEGORIES: { id: CoverThemeCategory; label: string }[] = [
  { id: "family", label: "가족" },
  { id: "travel", label: "여행" },
  { id: "love", label: "커플" },
  { id: "baby", label: "아기" },
  { id: "birthday", label: "생일" },
];
function measureSpineTitleFontSizeMm(
  title: string,
  spineMm: number,
  maxLengthMm: number,
  fontSizePt?: number, // 혜민님이 직접 고른 글자 크기(pt). 비워두면 책등 폭 기준 자동 크기.
  fontFamily: string = "Pretendard, sans-serif"
): { sizeMm: number; textLengthMm: number } {
  if (!title || typeof document === "undefined") return { sizeMm: 0, textLengthMm: 0 };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { sizeMm: 0, textLengthMm: 0 };
  const maxCrossMm = Math.max(1, spineMm - SPINE_TEXT_SIDE_PADDING_MM_SCREEN * 2);
  // 혜민님이 pt로 직접 고른 값(mm로 환산)을 쓰되, 책등 여백(1.5mm)이 줄어들지 않도록
  // maxCrossMm을 넘지 않게 잘라요. 안 골랐으면(자동) 책등 폭의 55%를 시작 크기로 써요.
  const requestedMm = fontSizePt !== undefined ? (fontSizePt * 25.4) / 72 : maxCrossMm * SPINE_TITLE_MAX_FONT_RATIO_SCREEN;
  let size = Math.min(requestedMm, maxCrossMm);
  ctx.font = `bold ${size}px ${fontFamily}`;
  let textLengthMm = ctx.measureText(title).width;
  while (size > SPINE_TITLE_MIN_FONT_MM && textLengthMm > maxLengthMm) {
    size -= 0.05;
    ctx.font = `bold ${size}px ${fontFamily}`;
    textLengthMm = ctx.measureText(title).width;
  }
  if (size < SPINE_TITLE_MIN_FONT_MM) size = SPINE_TITLE_MIN_FONT_MM;
  ctx.font = `bold ${size}px ${fontFamily}`;
  textLengthMm = ctx.measureText(title).width;
  return { sizeMm: size, textLengthMm };
}

type Photo = {
  url: string;
  caption: string;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
  fontFamily: string;
  size: "sm" | "base" | "lg";
  bold: boolean;
  color: string;
  align: "left" | "center" | "right";
  position: "below" | "overlayBottom" | "overlayCenter";
  // 드래그(x, y)는 화면에 보이던 사진칸의 실제 픽셀 크기를 기준으로 저장돼요.
  // 인쇄 파일을 만들 때는 그 화면 크기와 인쇄용 캔버스 크기 비율을 계산해서,
  // 화면에서 본 위치와 똑같은 자리에 사진이 오도록 맞춰줘요.
  containerW: number;
  containerH: number;
  rotation: number; // 0/90/180/270도
  flipX: boolean; // 좌우 반전
};

// 텍스트박스가 어디 있는지(표지 앞면인지, 어느 스프레드의 왼쪽/오른쪽 낱장인지) 가리키는
// 값이에요. 상단 툴바가 지금 고치는 텍스트박스를 찾아가는 데 써요.
type TextBoxRef =
  | { scope: "cover" }
  | { scope: "backCover" }
  | { scope: "spread"; spreadIndex: number; side: "left" | "right" };

// 다중 선택 정렬(align) 종류예요(2026-09 추가) — 가로 3개(left/hcenter/right), 세로
// 3개(top/vmiddle/bottom). 세로 정렬 중 vmiddle·bottom은 박스 높이(heightPct)가 고정된
// 경우에만 계산할 수 있어요(자세한 이유는 computeTextBoxAlignChanges 주석 참고).
type TextBoxAlignMode = "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom";

function textBoxRefsEqual(a: TextBoxRef, b: TextBoxRef): boolean {
  if (a.scope !== b.scope) return false;
  if (a.scope === "spread" && b.scope === "spread") {
    return a.spreadIndex === b.spreadIndex && a.side === b.side;
  }
  return true;
}

function textBoxScopeLabel(ref: TextBoxRef): string {
  if (ref.scope === "cover") return "앞표지 텍스트박스";
  if (ref.scope === "backCover") return "뒤표지 텍스트박스";
  return `내지 ${ref.side === "left" ? "왼쪽" : "오른쪽"} 페이지 텍스트박스`;
}

const captionSizeClass: Record<Photo["size"], string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
};

const alignClass: Record<Photo["align"], string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const fontOptions = [
  { id: "Pretendard, sans-serif", label: "고딕" },
  { id: "'Noto Serif KR', serif", label: "명조" },
  { id: "'Nanum Myeongjo', serif", label: "클래식 명조" },
  { id: "'Gowun Batang', serif", label: "우아한 바탕체" },
  { id: "'Gowun Dodum', sans-serif", label: "둥근 고딕" },
  { id: "'Black Han Sans', sans-serif", label: "굵은 임팩트체" },
  { id: "'Gaegu', cursive", label: "귀여운 손글씨" },
  { id: "'Nanum Pen Script', cursive", label: "감성 손글씨" },
  { id: "'Dongle', sans-serif", label: "동글동글체" },
  { id: "'Gamja Flower', cursive", label: "감자꽃체" },
  { id: "'East Sea Dokdo', cursive", label: "붓글씨체" },
  { id: "'Poor Story', sans-serif", label: "포근한 손글씨" },
  { id: "'Do Hyeon', sans-serif", label: "굵은 포인트체" },
  { id: "'Jua', sans-serif", label: "주아체" },
  { id: "'HsSantoki20', sans-serif", label: "산토끼체" },
  { id: "'KkuBulLim', sans-serif", label: "꾸불림체" },
  { id: "'GriunDujunDujun', sans-serif", label: "두준두준체" },
  { id: "'ChaiHwaljjak', sans-serif", label: "활짝체" },
  { id: "'LeeSeoyoon', sans-serif", label: "이서윤체" },
  { id: "'Cinzel Decorative', serif", label: "Cinzel Decorative" },
  { id: "'Cinzel', serif", label: "Cinzel" },
  { id: "'Castoro', serif", label: "Castoro" },
  { id: "'Pinyon Script', cursive", label: "Pinyon Script" },
  { id: "'Amatic SC', cursive", label: "Amatic SC" },
  { id: "'Luckiest Guy', cursive", label: "Luckiest Guy" },
  { id: "'Julius Sans One', sans-serif", label: "Julius Sans One" },
  { id: "'Gloock', serif", label: "Gloock" },
  { id: "'Pompiere', cursive", label: "Pompiere" },
  { id: "'Boogaloo', cursive", label: "Boogaloo" },
  { id: "'Henny Penny', cursive", label: "Henny Penny" },
  { id: "'Nosifer', cursive", label: "Nosifer" },
  { id: "'DM Serif Display', serif", label: "DM Serif Display" },
  { id: "'Bodoni Moda', serif", label: "Bodoni Moda" },
];

// 표지 "테마" 프리셋 — 앞표지·책등·뒤표지 배경색(+ 뒤표지 무늬)과 제목 서체를 한 세트로
// 묶어둔 거예요. 적용해도 기존에 넣은 사진·텍스트박스는 전혀 건드리지 않고, 배경·서체만
// 바꿔요(레이아웃 템플릿 적용과 같은 "비파괴적" 원칙). 2026-09-26, 혜민님이 스위트북
// 참고 화면을 보여주며 "표지를 테마 형식으로 바꿔달라"고 요청 — 이번 라운드엔 실제 테마
// 2개를 우선 만들고, 더 필요하면 이 배열에 계속 추가하면 돼요.
// 2026-09-25, 혜민님 요청(항목5) — "카테고리 구조부터" 확인해주셔서, 이번 라운드는
// 5개 카테고리 탭 구조를 먼저 만들고 각 칸에 2개씩 테마를 채웠어요(총 10개). 새로
// 그린 무늬 없이 이미 검증된 lib/backgroundPatterns.ts 무늬 id와 fontOptions 서체
// id만 재사용했어요(이 환경에서는 실제 브라우저로 미리보기를 확인할 수 없어서, 이미
// 다른 곳에 쓰이고 있는 값만 고르는 게 더 안전해요). 색감·무늬는 1차 구조이고,
// 더 구별되는 디자인은 다음 라운드에 이 배열에 계속 추가하면 돼요.
const COVER_THEMES: CoverTheme[] = [
  {
    id: "white-simple",
    label: "화이트 심플",
    category: "family",
    frontBackgroundColor: "#ffffff",
    spineBackgroundColor: "#ffffff",
    backBackgroundColor: "#ffffff",
    backPatternId: undefined,
    titleFontFamily: fontOptions[0].id,
  },
  {
    id: "warm-beige",
    label: "포근한 가족",
    category: "family",
    frontBackgroundColor: "#f5efe6",
    spineBackgroundColor: "#e8ddc9",
    backBackgroundColor: "#f5efe6",
    backPatternId: "grain-kraft",
    titleFontFamily: fontOptions[1].id,
  },
  {
    id: "blue-sky",
    label: "블루 스카이",
    category: "travel",
    frontBackgroundColor: "#eaf4fb",
    spineBackgroundColor: "#cfe3f2",
    backBackgroundColor: "#eaf4fb",
    backPatternId: "dots-sky",
    titleFontFamily: fontOptions[0].id,
  },
  {
    id: "navy-sunset",
    label: "네이비 선셋",
    category: "travel",
    frontBackgroundColor: "#e4ecf5",
    spineBackgroundColor: "#c7d6ea",
    backBackgroundColor: "#e4ecf5",
    backPatternId: "gradient-navy-sky",
    titleFontFamily: fontOptions[3].id,
  },
  {
    id: "blush-romance",
    label: "블러쉬 로맨스",
    category: "love",
    frontBackgroundColor: "#fbeae6",
    spineBackgroundColor: "#f6d4ce",
    backBackgroundColor: "#fbeae6",
    backPatternId: "gradient-blush-peach",
    titleFontFamily: fontOptions[2].id,
  },
  {
    id: "rose-mauve",
    label: "로즈 모브",
    category: "love",
    frontBackgroundColor: "#f6e9ee",
    spineBackgroundColor: "#ecd2dc",
    backBackgroundColor: "#f6e9ee",
    backPatternId: "gradient-rose-mauve",
    titleFontFamily: fontOptions[7].id,
  },
  {
    id: "pastel-baby",
    label: "파스텔 베이비",
    category: "baby",
    frontBackgroundColor: "#f7f0f7",
    spineBackgroundColor: "#ecdcec",
    backBackgroundColor: "#f7f0f7",
    backPatternId: "gradient-pastel-multi",
    titleFontFamily: fontOptions[6].id,
  },
  {
    id: "mint-stripe",
    label: "민트 스트라이프",
    category: "baby",
    frontBackgroundColor: "#eef8f4",
    spineBackgroundColor: "#d7eee4",
    backBackgroundColor: "#eef8f4",
    backPatternId: "stripes-mint",
    titleFontFamily: fontOptions[8].id,
  },
  {
    id: "sunset-party",
    label: "선셋 파티",
    category: "birthday",
    frontBackgroundColor: "#fdf0e3",
    spineBackgroundColor: "#fbdcb8",
    backBackgroundColor: "#fdf0e3",
    backPatternId: "gradient-sunset",
    titleFontFamily: fontOptions[12].id,
  },
  {
    id: "blush-stripe",
    label: "블러쉬 스트라이프",
    category: "birthday",
    frontBackgroundColor: "#fdeeee",
    spineBackgroundColor: "#f8d6d6",
    backBackgroundColor: "#fdeeee",
    backPatternId: "stripes-blush",
    titleFontFamily: fontOptions[13].id,
  },
];

const PRINT_DPI = 200;


function parseSizeCm(detail: string) {
  const match = detail.match(/(\d+(\.\d+)?)\s*x\s*(\d+(\.\d+)?)/i);
  if (!match) return { w: 15, h: 15 };
  return { w: parseFloat(match[1]), h: parseFloat(match[3]) };
}

function calcRequiredMinPx(detail: string) {
  const { w, h } = parseSizeCm(detail);
  const shorterCm = Math.min(w, h);
  return Math.round((shorterCm / 2.54) * PRINT_DPI);
}

function isLowRes(photo: Photo, requiredMinPx: number) {
  return Math.min(photo.width, photo.height) < requiredMinPx;
}

// 스프레드별로 사진 배열에서 왼쪽/오른쪽 페이지가 각각 몇 번째 사진들을 쓰는지 계산해요.
// (미리보기 렌더링과 인쇄 파일 생성, 둘 다 같은 계산을 써야 순서가 어긋나지 않아요.)
// 스프레드 1(index 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 항상 고정돼요 —
// 그 칸에는 사진을 배정하지 않고, 사진 1장이 실제 내지 1페이지(스프레드 1 오른쪽)부터
// 채워지도록 건너뛰어요.
function computeSpreadPhotoGroups(customSpreads: SpreadDef[]): SpreadPhotoGroup[] {
  let cursor = 0;
  return customSpreads.map((spread, i) => {
    const leftCount = i === 0 ? 0 : pageTemplates[spread.left].photoCount;
    const rightCount = pageTemplates[spread.right].photoCount;
    const leftIndexes = Array.from({ length: leftCount }, (_, i2) => cursor + i2);
    cursor += leftCount;
    const rightIndexes = Array.from({ length: rightCount }, (_, i2) => cursor + i2);
    cursor += rightCount;
    return { leftIndexes, rightIndexes };
  });
}

// 왼쪽 레일에 보여줄 라벨이에요. "스프레드 N" 대신 실제 내지 페이지 번호로 보여줘요.
// 스프레드 1(index 0)은 왼쪽이 인쇄되지 않는 빈 면이라 오른쪽 페이지 번호(1) 하나만,
// 그 다음부터는 "2-3", "4-5"처럼 두 페이지 범위로 표시해요.
function formatSpreadPageLabel(i: number): string {
  if (i === 0) return "1";
  return `${2 * i}-${2 * i + 1}`;
}

const layoutOptions: { id: PageTemplateId; label: string }[] = [
  { id: "full", label: "사진 1장 (꽉 참)" },
  { id: "fullMargin", label: "사진 1장 (여백)" },
  { id: "duo", label: "2분할" },
  { id: "trio", label: "3분할" },
  { id: "quad", label: "4분할" },
  { id: "photoText", label: "사진+글" },
  { id: "trioText", label: "3장+설명 (여백)" },
  { id: "blank", label: "빈 페이지" },
];

// 내지(스프레드) 배경색 미리 정해둔 팔레트예요. 포토북 인쇄에 무난하게 쓸 수 있는
// 톤 위주로 골랐어요 — 사용자가 직접 색을 고르고 싶으면 옆의 색상 선택 버튼으로 자유롭게
// 고를 수도 있어요.
// "전체 사진 목록" 펼침 패널에서 한 번에 몇 장씩 보여줄지예요. 사진이 많을 때
// 한꺼번에 다 나열하지 않고, 이 수만큼 나눠서 옆으로 넘겨가며 보게 해요.
const PHOTO_GRID_PAGE_SIZE = 8;

// 화면 CSS px ↔ 실제 물리적 mm 환산 기준이에요(브라우저 표준 96dpi 가정: 1인치=96px,
// 1인치=25.4mm). "줌 배율" 표시를 실제 크기 기준 %로 보여주기 위해 씀
// (2026-09-24, 혜민님 요청 — 창을 줄여서 캔버스가 실제로 작아져도 줌 표시는 계속
// "100%"로 남아있던 문제를 고침). 실제 모니터 배율/줌 설정에 따라 오차가 있을 수
// 있지만, "지금 화면에 보이는 크기가 실제 크기 대비 몇 %인지"를 대략적으로라도
// 보여주는 게 0%든 100%든 고정된 숫자보다 훨씬 유용해서 이 근사치를 씀.
const CSS_PX_PER_MM = 96 / 25.4;

// 2026-09-30, 혜민님 요청: "단색 배경 색상부분 컬러차트로 만들어주세요. 예시이미지
// 참고" — 스위트북처럼 한 줄로 죽 나열하던 예전 SPREAD_BACKGROUND_PRESETS(2026-09-27
// 도입, 쨍한 색 위주 12개) 대신, "무채색/부드러운 색상/발랄한 색상/차분한 색상" 4개
// 분류로 묶고 스와치도 더 크게 키운 "컬러차트" 레이아웃으로 바꿨어요. 예전 목록은 이제
// 이 파일 안에서 참조하는 곳이 없어서(두 배경 패널 모두 아래 컬러차트로 갈아탐)
// 통째로 지웠어요.
// 2026-10-04, 혜민님 요청(항목7): "단색 컬러차트보면 4가지 색상의 컬러칩으로 구성...
// 저는 5가지의 컬러칩으로 여러색상 넣고싶습니다... 색상도 너무 없습니다" — 카테고리마다
// 색상 수가 4/8/8/6로 제각각이라(위 ColorChartPicker가 flex-1로 한 줄에 꽉 채우다 보니)
// 줄마다 칩 폭이 들쑥날쑥했어요. 다섯 카테고리 모두 정확히 5개씩으로 맞춰 칩 폭을
// 통일하고, 그동안 없던 "딥 색상"(네이비·버건디·포레스트그린 등 더 진하고 차분한
// 톤) 카테고리를 새로 더해서 전체 색상 종류도 늘렸어요.
const SPREAD_BACKGROUND_CHART: { category: string; colors: { color: string; label: string }[] }[] = [
  {
    category: "무채색",
    colors: [
      { color: "#ffffff", label: "화이트" },
      { color: "#f5f0e8", label: "아이보리" },
      { color: "#d9d9d9", label: "라이트그레이" },
      { color: "#8c8c8c", label: "그레이" },
      { color: "#232323", label: "차콜" },
    ],
  },
  {
    category: "파스텔 색상",
    colors: [
      { color: "#fff4e0", label: "크림" },
      { color: "#ffe1a8", label: "파스텔옐로우" },
      { color: "#ffd6e0", label: "파스텔핑크" },
      { color: "#e3d9f7", label: "파스텔라벤더" },
      { color: "#cfe8ff", label: "파스텔블루" },
    ],
  },
  {
    category: "비비드 색상",
    colors: [
      { color: "#f76c6c", label: "체리레드" },
      { color: "#ff8fab", label: "핫핑크" },
      { color: "#fb8500", label: "오렌지" },
      { color: "#a3e635", label: "라임그린" },
      { color: "#38bdf8", label: "비비드블루" },
    ],
  },
  {
    category: "차분한 색상",
    colors: [
      { color: "#a8b89a", label: "세이지그린" },
      { color: "#8fa8bf", label: "더스티블루" },
      { color: "#b08ea3", label: "모브" },
      { color: "#b5a582", label: "카키" },
      { color: "#c17a5f", label: "테라코타" },
    ],
  },
  {
    category: "딥 색상",
    colors: [
      { color: "#1f2a44", label: "네이비" },
      { color: "#6e2439", label: "버건디" },
      { color: "#1f3d2b", label: "포레스트그린" },
      { color: "#7a5a21", label: "머스타드브라운" },
      { color: "#4a3350", label: "플럼" },
    ],
  },
  // 2026-10-05, 혜민님 요청: "컬러팔레트 만들어줘 폴더에 예시색상 넣어뒀거든 그대로
  // 넣어도 좋아" — Desktop/컬러칩 폴더에 넣어주신 참고 팔레트 12종을 색상 그대로
  // 카테고리로 추가했어요(각 5색, hex 원본 그대로).
  {
    category: "라벤더-틸",
    colors: [
      { color: "#CCABD8", label: "라일락" },
      { color: "#8474A1", label: "더스티퍼플" },
      { color: "#6EC6CA", label: "아쿠아" },
      { color: "#08979D", label: "틸" },
      { color: "#055B5C", label: "딥틸" },
    ],
  },
  {
    category: "청록-올리브",
    colors: [
      { color: "#54C0CC", label: "터콰이즈" },
      { color: "#1F4F59", label: "딥틸그레이" },
      { color: "#7EA00E", label: "올리브그린" },
      { color: "#DCD964", label: "라임옐로우" },
      { color: "#213502", label: "다크올리브" },
    ],
  },
  {
    category: "파스텔 멀티",
    colors: [
      { color: "#86E3CE", label: "민트" },
      { color: "#D0E6A5", label: "라이트라임" },
      { color: "#FFDD94", label: "파스텔옐로우2" },
      { color: "#FA897B", label: "코랄" },
      { color: "#CCABD8", label: "라일락2" },
    ],
  },
  {
    category: "네이비 그라데이션",
    colors: [
      { color: "#001B48", label: "딥네이비" },
      { color: "#02457A", label: "네이비블루" },
      { color: "#018ABE", label: "오션블루" },
      { color: "#97CADB", label: "라이트블루" },
      { color: "#D6EBEE", label: "스카이미스트" },
    ],
  },
  {
    category: "선셋-세이지",
    colors: [
      { color: "#E25845", label: "선셋레드" },
      { color: "#FF8357", label: "코랄오렌지" },
      { color: "#FAC172", label: "골드옐로우" },
      { color: "#B9D5C9", label: "민트세이지" },
      { color: "#ADCB65", label: "올리브라임" },
    ],
  },
  {
    category: "블러시 피치",
    colors: [
      { color: "#F5CEC7", label: "블러시" },
      { color: "#E79796", label: "더스티로즈" },
      { color: "#FFC98B", label: "피치" },
      { color: "#FFB284", label: "애프리콧" },
      { color: "#C6C09C", label: "카키베이지" },
    ],
  },
  {
    category: "선셋 블루",
    colors: [
      { color: "#EFC868", label: "머스타드옐로우" },
      { color: "#F5AA76", label: "살몬" },
      { color: "#DA6C52", label: "테라코타레드" },
      { color: "#CD635B", label: "브릭레드" },
      { color: "#4F7D89", label: "슬레이트블루" },
    ],
  },
  {
    category: "로즈 모브",
    colors: [
      { color: "#E3B292", label: "탠" },
      { color: "#D07C7F", label: "더스티로즈2" },
      { color: "#A86273", label: "모브로즈" },
      { color: "#77626E", label: "플럼그레이" },
      { color: "#7F9680", label: "세이지그린2" },
    ],
  },
  {
    category: "그레이 블루",
    colors: [
      { color: "#EAE5BF", label: "라이트카키" },
      { color: "#DBDADA", label: "라이트그레이2" },
      { color: "#A9B4C4", label: "페리윙클" },
      { color: "#C1C3B6", label: "세이지그레이" },
      { color: "#5D7295", label: "슬레이트네이비" },
    ],
  },
  {
    category: "라임 올리브",
    colors: [
      { color: "#F2AA58", label: "탠지오렌지" },
      { color: "#E3DC9E", label: "크림옐로우" },
      { color: "#A7B368", label: "올리브카키" },
      { color: "#93BF3F", label: "그래스그린" },
      { color: "#6B7F4C", label: "포레스트올리브" },
    ],
  },
  {
    category: "레드 올리브",
    colors: [
      { color: "#BFCA5F", label: "올리브라임2" },
      { color: "#F09439", label: "탠지" },
      { color: "#E83619", label: "버밀리온" },
      { color: "#BB1B21", label: "크림슨" },
      { color: "#72181A", label: "다크마룬" },
    ],
  },
  {
    category: "플럼 슬레이트",
    colors: [
      { color: "#F8CEB9", label: "라이트피치" },
      { color: "#CF819D", label: "로즈모브" },
      { color: "#615A85", label: "딥퍼플" },
      { color: "#7594A5", label: "더스티블루2" },
      { color: "#5B6D76", label: "슬레이트그레이" },
    ],
  },
];

// 위 컬러차트를 배경색 패널 두 곳(내지 스프레드·표지)에서 똑같이 그려요 — 카테고리별
// 줄바꿈 + 라벨, 마지막에 커스텀 색 피커("+"). 스와치를 기존(h-6 w-6)보다 키워서
// (h-8 w-8) 실제 컬러차트처럼 보이게 했어요.
function ColorChartPicker({
  activeColor,
  onPick,
  customValue,
  onCustomChange,
}: {
  // 지금 골라져 있는 색(hex, 소문자 비교) — 일치하는 스와치에 테두리 강조를 줘요.
  activeColor: string;
  onPick: (color: string) => void;
  // 커스텀 색 피커(input type=color)의 현재 값과 변경 핸들러예요.
  customValue: string;
  onCustomChange: (color: string) => void;
}) {
  const activeLower = activeColor.toLowerCase();
  return (
    // 2026-10-01, 혜민님 요청:
    // 1) "색 직접 선택 메뉴는 제일 상단에 가로폭에 맞춰서 배치해주세요" — 맨 위로 옮기고 w-full로.
    // 2) "색상조합을 컬러칩으로 만들어주세요. 낱개의 박스배치말고 가로여백을 없애주세요"
    //    — 카테고리별로 색상들을 gap 없이 붙여서 하나의 이어진 컬러칩 띠로 그림(참고 이미지처럼).
    <div className="flex w-full flex-col gap-2.5">
      <label
        title="색 직접 선택"
        className="relative flex h-9 w-full cursor-pointer items-center gap-1.5 overflow-hidden border border-dashed border-[var(--color-charcoal)]/40 px-2 text-[11px] text-[var(--color-charcoal)]/60"
      >
        <span
          className="h-4 w-4 shrink-0 border border-[var(--color-hairline)]"
          style={{ backgroundColor: customValue }}
        />
        색 직접 선택 +
        <input
          type="color"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      {SPREAD_BACKGROUND_CHART.map((group) => (
        <div key={group.category} className="flex flex-col gap-1">
          <span className="text-[11px] text-[var(--color-charcoal)]/50">{group.category}</span>
          <div className="flex w-full overflow-hidden border border-[var(--color-hairline)]">
            {group.colors.map((preset) => (
              <button
                key={preset.color}
                type="button"
                title={preset.label}
                onClick={() => onPick(preset.color)}
                className={`h-8 flex-1 transition ${
                  activeLower === preset.color.toLowerCase()
                    ? "z-10 outline outline-2 -outline-offset-2 outline-[var(--color-sky)]"
                    : ""
                }`}
                style={{ backgroundColor: preset.color }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CaptionSettingsPopover({
  photo,
  onChange,
  showPosition,
}: {
  photo: Photo;
  onChange: (changes: Partial<Photo>) => void;
  showPosition: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ fontFamily: photo.fontFamily }}
        className=" border border-[var(--color-hairline)] bg-white/90 px-2 py-0.5 text-[11px] "
      >
        Aa
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-2"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-72 overflow-y-auto border border-[var(--color-hairline)] bg-white p-2 "
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">캡션 설정</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-[var(--color-charcoal)]/50"
              >
                닫기
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">서체</p>
            <div className="mt-1 max-h-40 overflow-y-auto border border-[var(--color-hairline)]">
              {fontOptions.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onChange({ fontFamily: f.id })}
                  style={{ fontFamily: f.id }}
                  className={`block w-full px-2 py-1.5 text-left text-sm hover:bg-[var(--color-ivory)] ${
 f.id === photo.fontFamily ? "bg-[var(--color-sky)]/10" : ""
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">크기</p>
            <div className="mt-1 flex gap-1">
              {(["sm", "base", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onChange({ size })}
                  className={`flex-1 border px-2 py-1 text-xs ${
                    photo.size === size ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                  }`}
                >
                  {size === "sm" ? "작게" : size === "base" ? "보통" : "크게"}
                </button>
              ))}
              <button
                onClick={() => onChange({ bold: !photo.bold })}
                className={` border px-2 py-1 text-xs font-bold ${
 photo.bold ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                }`}
              >
                B
              </button>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">정렬</p>
            <div className="mt-1 flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => onChange({ align })}
                  className={`flex-1 border px-2 py-1 text-xs ${
                    photo.align === align ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10" : "border-[var(--color-hairline)]"
                  }`}
                >
                  {align === "left" ? "왼쪽" : align === "center" ? "가운데" : "오른쪽"}
                </button>
              ))}
            </div>

            <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">색상</p>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={photo.color}
                onChange={(e) => onChange({ color: e.target.value })}
                className="h-8 w-12 cursor-pointer border border-[var(--color-hairline)]"
              />
              <span className="text-xs text-[var(--color-charcoal)]/60">{photo.color}</span>
            </div>

            {showPosition && (
              <>
                <p className="mt-3 text-[11px] font-semibold text-[var(--color-charcoal)]/50">위치</p>
                <select
                  value={photo.position}
                  onChange={(e) => onChange({ position: e.target.value as Photo["position"] })}
                  className="mt-1 w-full border border-[var(--color-hairline)] bg-white px-2 py-1 text-xs"
                >
                  <option value="below">사진 아래에</option>
                  <option value="overlayBottom">사진 위 하단</option>
                  <option value="overlayCenter">사진 위 가운데</option>
                </select>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// 작업선(초록)·재단선(마젠타) 미리보기 오버레이예요. 실제 인쇄 파일(lib/printCompose.ts의
// drawGuideOverlay)과 같은 두 겹 구조를 화면에서도 보여줘요. (안전선은 이제 왼쪽·오른쪽
// 페이지를 각각 닫힌 사각형으로 따로 그려요 — PageSafetyBox/BindingGuide 참고. 표지의
// 책등 경계처럼 실제로 잘리는 자리가 아닌 쪽이 있으면 hideEdge로 그 변만 빼고 그려요.)
// 반드시 스프레드(또는 표지) 전체를 감싸는 딱 하나의 요소로만 그려야 점선이 가운데서
// 끊기지 않아요. (페이지마다 따로 그리면 이어지는 자리에서 점선 위상이 어긋나 끊겨 보여요)
// 모든 안내선을 색 대신 검정 하나로 통일하고, 종류는 선 굵기·스타일로만 구분해요
// (도련선=가는 파선, 재단선=굵은 실선, 안전영역=점선, 책등·제본 경계=이중선).
const GUIDE_LINE_COLOR = "#1a1a1a";

function GuideLines({
  trimXPct,
  trimYPct,
  hideEdge,
}: {
  trimXPct: number;
  trimYPct: number;
  // 책등(세네카)처럼 실제로 잘리는 자리가 아닌 쪽은 그쪽 변만 빼고 그려요.
  hideEdge?: "left" | "right";
}) {
  const edgeStyle: CSSProperties =
    hideEdge === "left"
      ? { borderLeftStyle: "none" }
      : hideEdge === "right"
      ? { borderRightStyle: "none" }
      : {};
  return (
    <div className="pointer-events-none absolute inset-0 z-[26]">
      <div
        className="absolute inset-0 border"
        style={{ borderStyle: "dashed", borderColor: GUIDE_LINE_COLOR, ...edgeStyle }}
      />
      <div
        className="absolute border-2"
        style={{
          left: `${trimXPct}%`,
          right: `${trimXPct}%`,
          top: `${trimYPct}%`,
          bottom: `${trimYPct}%`,
          borderStyle: "solid",
          borderColor: GUIDE_LINE_COLOR,
          ...edgeStyle,
        }}
      />
    </div>
  );
}

// 표지 안내선 전용 — 사각형/세로선을 "표지 펼침면 전체를 100%로 보는" 좌표(왼쪽 끝
// left%, 오른쪽 끝 right%, 위 top%, 아래 bottom%)로 그려요. 패널마다 따로 안 그리고,
// 이 좌표만 맞으면 항상 펼침면 전체 기준으로 하나로 이어져 보여요. variant로 선
// 스타일(파선/실선/점선)만 바꿔서, 색은 항상 검정 하나로 통일해요.
function CoverGuideBox({
  left,
  right,
  top,
  bottom,
  variant = "dashed",
}: {
  left: number;
  right: number;
  top: number;
  bottom: number;
  variant?: "dashed" | "solid" | "dotted";
}) {
  return (
    <div
      className={variant === "solid" ? "pointer-events-none absolute z-[26] border-2" : "pointer-events-none absolute z-[26] border"}
      style={{
        left: `${left}%`,
        right: `${100 - right}%`,
        top: `${top}%`,
        bottom: `${100 - bottom}%`,
        borderStyle: variant,
        borderColor: GUIDE_LINE_COLOR,
      }}
    />
  );
}

// 내지 펼침면 가운데의 "제본 경계"예요. 실제로 두 페이지가 만나는 정중앙(50%)에 검정
// 이중선을 하나 긋고(책등 경계와 같은 시각 언어), 그 양옆으로 제본 때문에 주의가
// 필요한 영역을 옅은 음영으로 보여줘요. 화면 전용 안내예요 — 인쇄 PDF에는 들어가지 않아요.
function BindingGuide({ leftPct, rightPct }: { leftPct: number; rightPct: number }) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 z-10 bg-black/5"
      style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
    />
  );
}

// 눈금자 두께(px) — 위쪽(가로 눈금자) 높이와 왼쪽(세로 눈금자) 폭. 왼쪽 위 빈 모서리
// 칸도 이 두 값으로 크기를 맞춰요.
const RULER_THICKNESS_PX = { h: 20, w: 28 };
// 2026-10-04, 혜민님 요청(항목8): "눈금자때문에 책자를 크게볼수없는거라면 과감하게
// 눈금자는 삭제하도록 하겠습니다. 다만, 추후에 다시 쓸수도 있으니 백업해주세요" —
// 실제로 지우는 대신 이 스위치로 꺼요(코드는 그대로 남아있어서, 나중에 true로만
// 되돌리면 바로 다시 켜져요). 꺼져 있으면 아래에서 눈금자용 여백(padding)도 0이 돼서
// 그만큼 책이 더 크게 보여요.
const SHOW_RULER = false;
// 스프레드 박스 자체에 이미 있는 위쪽 여백(className의 "mt-3" = 12px)이에요. 눈금자
// 위쪽 공간(paddingTop)을 잡을 때 이 여백만큼 미리 빼줘야, 눈금자가 실제 캔버스 위쪽
// 가장자리에 딱 붙어요 — 안 그러면 눈금자와 캔버스 사이에 이 여백만큼 빈틈이 생겨서
// 눈금 위치가 재단선과 안 맞아 보여요(2026-09 수정).
const SPREAD_BOX_MARGIN_TOP_PX = 12;

// 일러스트레이터 편집대지처럼, 스프레드(펼침면) 위쪽·왼쪽에 실제 mm 눈금을 보여주는
// 눈금자예요(2026-09 요청). **0mm은 실제로 인쇄되는 면(재단선) 기준이에요** — 도련
// (bleed, 인쇄 후 잘려나가는 여분) 안쪽은 0보다 작은 음수로 표시돼요(일러스트레이터에서
// 아트보드 바깥 여분이 음수 좌표로 보이는 것과 같아요, 2026-09 수정 — 처음엔 도련
// 바깥쪽 끝을 0으로 잡았었는데 "인쇄되는 면 기준으로 잡아달라"는 피드백을 받고 고침).
// zeroOffsetMm(=도련 폭)만큼 안쪽으로 0점을 옮기되, 눈금이 화면에 그려지는 위치(퍼센트)는
// 여전히 GuideLines와 같은 좌표계(guideSpreadWorkMm/guidePageWorkMm, 도련 포함 전체 길이)
// 기준이라 재단선·안전영역과 항상 같은 자리에 맞아떨어져요. 캔버스 확대/축소(canvasZoom)와
// 같은 transform 안에 들어있어서 확대·축소하면 눈금자도 캔버스와 함께 자연스럽게 늘어나요.
// 일러스트레이터 편집대지처럼, 스프레드(펼침면) 위쪽·왼쪽에 실제 mm 눈금을 보여주는
// 눈금자예요(2026-09 요청). **0mm은 실제로 인쇄되는 면(재단선) 기준이에요** — 도련
// (bleed, 인쇄 후 잘려나가는 여분) 안쪽은 0보다 작은 음수로 표시돼요(일러스트레이터에서
// 아트보드 바깥 여분이 음수 좌표로 보이는 것과 같아요, 2026-09 수정 — 처음엔 도련
// 바깥쪽 끝을 0으로 잡았었는데 "인쇄되는 면 기준으로 잡아달라"는 피드백을 받고 고침).
//
// trimTotalMm: 재단선부터 재단선까지 실제로 표시하고 싶은 진짜 길이예요(예: 세로
// 페이지는 250mm, 가로 스프레드는 500mm). 화면에 그려지는 캔버스(totalMm, 도련
// 포함)의 재단 구간 길이(= totalMm - 2*zeroOffsetMm)가 이 값과 정확히 같지 않을 수
// 있어요 — 스프레드는 왼쪽·오른쪽 두 페이지 작업파일(도련 포함)을 나란히 붙인 화면이라,
// 두 파일이 만나는 가운데에 서로 마주보는 도련이 겹쳐서 캔버스 재단 구간이 510mm인데
// 실제 재단 폭은 500mm인 식이에요. 이 차이를 숫자 하나하나를 건너뛰는 대신, 재단
// 구간 전체를 진짜 길이에 맞춰 살짝 눌러서(예: 510mm→500mm, 약 2%) 균일하게
// 늘어나도록 다시 매겨요 — 그러면 0(왼쪽 재단선)·250(정중앙 접힘선)·500(오른쪽
// 재단선)이 전부 정확한 자리에 오고, 눈금 사이 간격이 갑자기 벌어지는 곳도 없어요
// (2026-09 수정 — "255가 가운데 접힘선" 피드백에 따라, "건너뛰기" 방식 대신 이 방식으로
// 교체). trimTotalMm을 생략하면(세로 눈금자처럼 이 차이가 없는 경우) 원래 재단 구간
// 길이를 그대로 써요.
//
// zeroOffsetMm(=도련 폭)만큼 안쪽으로 0점을 옮기되, 눈금이 화면에 그려지는 위치(퍼센트)는
// 여전히 GuideLines와 같은 좌표계(totalMm 기준, 도련 포함 전체 길이)라 재단선·안전영역과
// 항상 같은 자리에 맞아떨어져요. 캔버스 확대/축소(canvasZoom)와 같은 transform 안에
// 들어있어서 확대·축소하면 눈금자도 캔버스와 함께 자연스럽게 늘어나요.
function Ruler({
  orientation,
  totalMm,
  zeroOffsetMm = 0,
  trimTotalMm,
  majorStepMm = 50,
  minorStepMm = 10,
}: {
  orientation: "horizontal" | "vertical";
  totalMm: number;
  zeroOffsetMm?: number;
  trimTotalMm?: number;
  majorStepMm?: number;
  minorStepMm?: number;
}) {
  if (!(totalMm > 0)) return null;
  // 캔버스(도련 포함) 안에서 재단 구간이 차지하는 실제 길이예요.
  const rawTrimSpanMm = totalMm - 2 * zeroOffsetMm;
  // 화면에 보여줄 진짜 재단 길이 — 생략되면 캔버스의 재단 구간 길이를 그대로 써요.
  const displayTrimMm = trimTotalMm ?? rawTrimSpanMm;
  // 라벨(mm) 1개당 실제 캔버스에서 몇 mm를 움직여야 하는지의 배율이에요. 스프레드처럼
  // 캔버스 재단 구간(510)과 진짜 재단 길이(500)가 다를 때만 1이 아니에요.
  const rawPerLabelMm = displayTrimMm > 0 ? rawTrimSpanMm / displayTrimMm : 1;
  function labelToRawMm(labelMm: number): number {
    return zeroOffsetMm + labelMm * rawPerLabelMm;
  }
  const lastLabelMm = Math.floor(displayTrimMm / minorStepMm) * minorStepMm;
  const startLabelMm = Math.ceil(-zeroOffsetMm / rawPerLabelMm / minorStepMm) * minorStepMm;
  const ticks: { labelMm: number; rawMm: number; major: boolean }[] = [];
  for (let labelMm = startLabelMm; labelMm <= lastLabelMm + 0.01; labelMm += minorStepMm) {
    const rounded = Math.round(labelMm);
    ticks.push({ labelMm: rounded, rawMm: labelToRawMm(rounded), major: rounded % majorStepMm === 0 });
  }
  // 끝쪽 재단선도 50mm 눈금과 상관없이 항상 숫자가 찍히게 해요 — 상품 크기가 50의
  // 배수가 아니면 마지막 50mm 눈금이 재단선과 안 맞아 보일 수 있어서, "0"과 똑같이
  // 재단선 위치에는 항상 눈금을 하나 더 그려줘요.
  const farEdgeLabelMm = Math.round(displayTrimMm);
  const hasFarEdgeTick = ticks.some((t) => Math.abs(t.labelMm - farEdgeLabelMm) < 0.5);
  if (!hasFarEdgeTick) {
    ticks.push({ labelMm: farEdgeLabelMm, rawMm: labelToRawMm(farEdgeLabelMm), major: true });
  } else {
    const existing = ticks.find((t) => Math.abs(t.labelMm - farEdgeLabelMm) < 0.5);
    if (existing) existing.major = true;
  }
  ticks.sort((a, b) => a.rawMm - b.rawMm);
  // 2026-09-27, 혜민님 재요청: "눈금자 부분 배경 없애주세요. 회색보이는것도 싫어요" —
  // 2026-09-26에 추가했던 회색 트랙 배경(--color-charcoal 8%)을 다시 없애서, 눈금자
  // 몸통은 배경 없이 눈금·숫자만 보이게 해요(왼쪽 위 빈 모서리 칸도 아래서 같이 없앴어요).
  return (
    <div className={`relative h-full w-full overflow-hidden text-[8px] text-[var(--color-charcoal)]/55`}>
      {ticks.map(({ labelMm, rawMm, major }) =>
        orientation === "horizontal" ? (
          <div
            key={labelMm}
            className="absolute top-0 flex h-full flex-col items-start"
            style={{ left: `${(rawMm / totalMm) * 100}%` }}
          >
            <div className={`w-px bg-[var(--color-charcoal)]/40 ${major ? "h-2.5" : "h-1.5"}`} />
            {major && <span className="ml-0.5 leading-none">{labelMm}</span>}
          </div>
        ) : (
          <div
            key={labelMm}
            // items-center를 쓰면 이 줄(row)의 높이(숫자 텍스트 높이, 8px)만큼 눈금
            // 표시선이 아래로 밀려서(세로로 약 3~4px) 실제 위치(top%)보다 살짝 낮게
            // 그려졌어요 — 재단선과 눈금이 "살짝 안 맞아 보이는" 원인이었어요(2026-09
            // 수정). items-start로 바꿔서 눈금 표시선 자체는 항상 top% 위치에 정확히
            // 고정하고, 숫자 텍스트만 따로 위로 절반 옮겨서(-translate-y-1/2) 눈금
            // 옆에 보기 좋게 배치해요. justify-end + 숫자를 눈금선보다 앞에 둬서,
            // 숫자는 왼쪽에 눈금선은 항상 캔버스 쪽(오른쪽) 가장자리에 붙도록 했어요
            // (2026-09 수정 — "숫자가 왼쪽, 눈금이 오른쪽" 요청).
            className="absolute left-0 flex w-full items-start justify-end gap-0.5 pr-[3px]"
            style={{ top: `${(rawMm / totalMm) * 100}%` }}
          >
            {major && <span className="-translate-y-1/2 leading-none">{labelMm}</span>}
            <div className={`h-px bg-[var(--color-charcoal)]/40 ${major ? "w-2.5" : "w-1.5"}`} />
          </div>
        )
      )}
    </div>
  );
}

// 사진 프레임(칸)을 "원본 전체 보이기(contain, scale 1)" 기준에서 "프레임 꽉 채우기
// (cover)" 기준으로 바꿀 때 필요한 scale 배율을 계산해요. 칸과 사진의 가로세로 비율만
// 있으면 되고, 절대 픽셀 크기는 필요 없어요. (lib/printCompose.ts의 drawPhotoInCell과
// 같은 공식이에요 — 화면과 인쇄 파일이 항상 같은 구도로 나오게 하기 위해서예요.)
function computeFillScale(imgW: number, imgH: number, containerW: number, containerH: number) {
  if (!imgW || !imgH || !containerW || !containerH) return 1;
  const imgRatio = imgW / imgH;
  const cellRatio = containerW / containerH;
  return imgRatio > cellRatio ? imgRatio / cellRatio : cellRatio / imgRatio;
}

function PhotoCell({
  photo,
  requiredMinPx,
  onChange,
  backgroundColor,
  onConvertToImageBox,
}: {
  photo: Photo;
  requiredMinPx: number;
  onChange: (changes: Partial<Photo>) => void;
  // 사진이 프레임을 다 못 채울 때(전체 맞추기 등) 여백에 비치는 색이에요.
  // 지정 안 하면 기존처럼 아이보리색이에요.
  backgroundColor?: string;
  // "사진 1장(꽉 참/여백)" 페이지에서만 전달돼요 — 있으면 "이미지박스로" 버튼이 떠서, 이
  // 사진을 페이지 경계를 자유롭게 넘나들 수 있는 이미지박스로 전환할 수 있어요
  // (2026-09-22 추가, "왼쪽 페이지 사진을 오른쪽으로 넘어가게 할 수 없다"는 요청).
  onConvertToImageBox?: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({
    mouseX: 0,
    mouseY: 0,
    photoX: 0,
    photoY: 0,
    containerW: 0,
    containerH: 0,
  });

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setIsDragging(true);
    const rect = cellRef.current?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      photoX: photo.x,
      photoY: photo.y,
      // 이 사진칸이 화면에서 실제로 몇 px인지 함께 저장해둬요.
      // (나중에 인쇄 파일을 만들 때, 같은 비율로 위치를 옮기기 위해 필요해요.)
      containerW: rect?.width || photo.containerW || 1,
      containerH: rect?.height || photo.containerH || 1,
    };
  }

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      onChange({
        x: dragStart.current.photoX + dx,
        y: dragStart.current.photoY + dy,
        containerW: dragStart.current.containerW,
        containerH: dragStart.current.containerH,
      });
    }

    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // "프레임 채우기" 버튼이 처음부터(드래그를 한 번도 안 해도) 정확히 동작하도록, 칸이 화면에
  // 그려지자마자 실제 픽셀 크기를 한 번 재서 저장해둬요.
  // 새로 추가된 사진(칸 크기를 한 번도 잰 적 없음, containerW/H가 아직 0)은 기본값을
  // "사진 전체 맞추기"(scale 1)가 아니라 "프레임 채우기"로 시작해요. 원본 파일은 그대로 두고
  // 화면에서 보여지는 비율(scale)만 바꾸는 거라 원본 손상은 없어요.
  useEffect(() => {
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect && (rect.width !== photo.containerW || rect.height !== photo.containerH)) {
      const isFirstMeasurement = photo.containerW === 0 && photo.containerH === 0;
      if (isFirstMeasurement) {
        const initialFillScale = computeFillScale(photo.width, photo.height, rect.width, rect.height);
        onChange({ containerW: rect.width, containerH: rect.height, scale: initialFillScale });
      } else {
        onChange({ containerW: rect.width, containerH: rect.height });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillScale = computeFillScale(photo.width, photo.height, photo.containerW, photo.containerH);
  const sliderMax = Math.max(2.5, fillScale);

  function stopThenRun(e: React.MouseEvent, fn: () => void) {
    e.stopPropagation();
    fn();
  }

  return (
    <div
      ref={cellRef}
      className="relative h-full w-full overflow-hidden bg-[var(--color-ivory)]"
      style={backgroundColor ? { background: backgroundColor } : undefined}
    >
      <img
        src={photo.url}
        onMouseDown={handleMouseDown}
        draggable={false}
        style={{
          transform: `translate(${photo.x}px, ${photo.y}px) rotate(${photo.rotation}deg) scale(${
            photo.flipX ? -photo.scale : photo.scale
          }, ${photo.scale})`,
        }}
        className="h-full w-full cursor-grab select-none object-contain active:cursor-grabbing"
        alt=""
      />
      {isLowRes(photo, requiredMinPx) && (
        <span
          title="인쇄 기준 화질이 낮아요"
          className="absolute left-1 top-1 bg-red-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white"
        >
          저해상도
        </span>
      )}

      <div className="absolute inset-x-1 bottom-8 flex items-center justify-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          title="사진 전체 맞추기 (여백이 생길 수 있어요)"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: 1 }))}
          className="flex h-6 items-center justify-center bg-black/60 px-2 text-[10px] text-white"
        >
          전체
        </button>
        <button
          type="button"
          title="프레임 채우기 (여백 없이 채우고, 프레임 밖은 가려져요)"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: fillScale }))}
          className="flex h-6 items-center justify-center bg-black/60 px-2 text-[10px] text-white"
        >
          채우기
        </button>
        {onConvertToImageBox && (
          <button
            type="button"
            title="이 사진을 자유 배치 이미지박스로 전환해요 — 이후 페이지 경계(책 가운데)를
자유롭게 넘나들며 옮기고 크기를 조절할 수 있어요. 전환 후에는 이 자리가 빈 페이지가
되고, 사진은 더블클릭으로 위치를 조정해요."
            onMouseDown={(e) => stopThenRun(e, () => onConvertToImageBox())}
            className="flex h-6 items-center justify-center bg-[var(--color-brand-purple)]/90 px-2 text-[10px] text-white"
          >
            이미지박스로
          </button>
        )}
        <button
          type="button"
          title="축소"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: Math.max(1, photo.scale - 0.1) }))}
          className="flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white"
        >
          −
        </button>
        <button
          type="button"
          title="확대"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ scale: Math.min(sliderMax + 1, photo.scale + 0.1) }))}
          className="flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white"
        >
          +
        </button>
        <button
          type="button"
          title="회전"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ rotation: (photo.rotation + 90) % 360 }))}
          className="flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white"
        >
          ⟳
        </button>
        <button
          type="button"
          title="좌우 반전"
          onMouseDown={(e) => stopThenRun(e, () => onChange({ flipX: !photo.flipX }))}
          className="flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white"
        >
          ⇋
        </button>
        <button
          type="button"
          title="원래대로"
          onMouseDown={(e) =>
            stopThenRun(e, () => onChange({ x: 0, y: 0, scale: 1, rotation: 0, flipX: false }))
          }
          className="flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white"
        >
          ↺
        </button>
      </div>

      <input
        type="range"
        min={1}
        max={sliderMax + 1}
        step={0.05}
        value={photo.scale}
        onChange={(e) => onChange({ scale: Number(e.target.value) })}
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute inset-x-1 bottom-1 opacity-0 transition group-hover:opacity-100"
      />
    </div>
  );
}

function formatKoreanDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// "마지막 소개 페이지"에 들어가는 작은 표지 사진이에요. 앞표지 칸(PhotoCell)과 똑같은
// x/y/scale/rotation/flipX 값을 그대로 쓰되, 이 칸은 훨씬 작아서 드래그로 옮겼던 픽셀
// 거리(x, y)를 그 칸 크기 비율(cellW/containerW)로 다시 환산해요 — 인쇄 파일 쪽
// drawPhotoInCell/embedPhotoCell과 같은 계산이라, 화면과 실제 PDF의 크롭이 항상 같아요.
// 지금 단계는 읽기 전용(표지를 그대로 미러링)이에요 — 이 칸을 따로 드래그/확대할 수는
// 없고, 표지 사진·제목이 바뀌면 자동으로 같이 바뀌어요.
function IntroPhotoMirror({ photo }: { photo: Photo | null }) {
  const cellRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = cellRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setCellSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!photo || !photo.url) {
    return <div ref={cellRef} className="h-full w-full bg-[var(--color-ivory)]" />;
  }

  const fx = photo.containerW > 0 && cellSize.w > 0 ? cellSize.w / photo.containerW : 1;
  const fy = photo.containerH > 0 && cellSize.h > 0 ? cellSize.h / photo.containerH : 1;

  return (
    <div ref={cellRef} className="relative h-full w-full overflow-hidden bg-[var(--color-ivory)]">
      <img
        src={photo.url}
        draggable={false}
        style={{
          transform: `translate(${photo.x * fx}px, ${photo.y * fy}px) rotate(${photo.rotation}deg) scale(${
            photo.flipX ? -photo.scale : photo.scale
          }, ${photo.scale})`,
        }}
        className="pointer-events-none h-full w-full select-none object-contain"
        alt=""
      />
    </div>
  );
}

// "마지막 소개 페이지" 화면 미리보기예요. 왼쪽 아래 영역에 위에서부터 작은 표지 사진 →
// 제목 → 발행일 → 만든이 → 제작 : KEEPIC 순서로 쌓아요. lib/printCompose.ts의
// drawIntroPage(인쇄용)와 같은 순서·배치 의도를 화면에서도 그대로 따라가요.
function IntroPagePreview({
  coverPhoto,
  coverTitle,
  introPublishDate,
  introMakerName,
}: {
  coverPhoto: Photo | null;
  coverTitle: string;
  introPublishDate: string;
  introMakerName: string;
}) {
  return (
    <div className="flex h-full w-full flex-col justify-end gap-2 bg-white p-[8%]">
      <div className="aspect-square w-[34%] overflow-hidden -sm ">
        <IntroPhotoMirror photo={coverPhoto} />
      </div>
      {coverTitle.trim() && (
        <p className="break-keep text-sm font-bold text-[var(--color-charcoal)]">{coverTitle}</p>
      )}
      <div className="text-[11px] leading-relaxed text-[var(--color-charcoal)]/70">
        <p>발행일 : {introPublishDate}</p>
        <p>만든이 : {introMakerName.trim() || "신규 작성자"}</p>
        <p>제작 : KEEPIC</p>
      </div>
      {/* "제작 : KEEPIC" 텍스트 아래에 실제 로고도 함께 넣어요 — lib/printCompose.ts의
          drawIntroPage(인쇄용)와 같은 자리, 같은 의도예요. */}
      <img src="/logo.svg" alt="Keepic" className="h-auto w-[14%] min-w-10 opacity-80" />
    </div>
  );
}

function CaptionField({
  photo,
  onCaptionChange,
  placeholder,
}: {
  photo: Photo;
  onCaptionChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="text"
      value={photo?.caption ?? ""}
      onChange={(e) => onCaptionChange(e.target.value)}
      placeholder={placeholder}
      style={{ color: photo?.color, fontFamily: photo?.fontFamily }}
      className={`w-full bg-transparent outline-none ${captionSizeClass[photo.size]} ${alignClass[photo.align]} ${
 photo.bold ? "font-bold" : "font-normal"
      }`}
    />
  );
}

// 자유 배치 텍스트박스 하나예요. 내지 페이지·표지 앞면 어디서나 같은 컴포넌트를 써요.
// PhotoCell과 같은 방식(mousemove/mouseup을 window에 직접 붙임)으로 드래그해요 — 다만
// 사진은 px 단위로 옮기고, 텍스트박스는 그 페이지(부모 칸) 크기를 100%로 보는 퍼센트로
// 옮겨요. 그래야 화면 크기가 달라져도 항상 같은 자리에 보여요.
// 드래그 중 박스 중심이 페이지 가운데(가로 50%/세로 50%)에 가까워지면 딱 맞춰 붙여주고,
// 일러스트레이터의 "스마트 가이드"처럼 그 순간 가운데 십자선을 보여줘요.
const CENTER_SNAP_THRESHOLD_PCT = 1.6;
// 이모티콘 탭에서 고를 수 있는 기본 이모지 세트예요(자주 쓰는 것 위주로 고른 큐레이션
// — 전체 유니코드 이모지 피커는 이번 기본형 범위 밖이에요, 2026-09-25).
const EMOJI_PICKER_SET = [
  "❤️", "💕", "💛", "💙", "💜", "🧡", "🤍", "🖤",
  "😀", "😁", "😂", "🥰", "😍", "😊", "😉", "😘",
  "🥳", "😎", "🤗", "😢", "😭", "😴", "🤔", "😇",
  "👍", "👏", "🙌", "🙏", "✌️", "🤞", "👋", "💪",
  "⭐", "✨", "🎉", "🎊", "🎈", "🎁", "🌸", "🌷",
  "🌼", "🌻", "🌈", "☀️", "🌙", "⛄", "❄️", "🔥",
  "☕", "🍰", "🍭", "🍓", "🍀", "🐶", "🐱", "🐻",
];


// 텍스트박스 하나예요. 예전엔 박스마다 뜨는 작은 툴바(⠿ 손잡이·폰트·크기·정렬·색·삭제)로
// 옮기고 꾸몄는데, 그 툴바가 박스 위를 가리다 보니 안쪽을 클릭해서 글자를 넣기가 어렵다는
// 피드백을 받았어요. 이제는 박스 자체를 아무 데나 눌러서 바로 끌 수 있고("클릭 vs 드래그"를
// 이동 거리로 구분해요 — 몇 px 이상 움직여야 "드래그"로 보고, 그 전엔 그냥 클릭이라 텍스트
// 커서가 그대로 생겨요), 폰트·크기·정렬 같은 편집 메뉴는 화면 상단의 고정 툴바
// (TextBoxToolbar)로 옮겼어요. 지금 선택된 박스인지(isActive)는 상단 툴바가 어떤 박스를
// 고치고 있는지 보여주는 용도예요.
const TEXT_BOX_DRAG_THRESHOLD_PX = 4;

// 텍스트박스 안 줄바꿈(\n) 개수로 대략적인 줄 수를 세요 — 세로 정렬(가운데/아래)일 때
// textarea 자체 높이를 글자 양만큼만 차지하게 만드는 데 써요.
function textBoxRowCount(text: string): number {
  return Math.max(1, text.split("\n").length);
}

function TextBoxOverlay({
  box,
  onChange,
  isActive,
  isMultiSelected = false,
  onSelect,
  onShiftSelect,
  zIndex,
  onDelete,
  onStackAction,
}: {
  box: TextBoxDef;
  onChange: (changes: Partial<TextBoxDef>) => void;
  isActive: boolean;
  // 다중 선택(정렬/분배 패널, 2026-09 추가)에 포함된 박스인지예요 — isActive(단일 선택,
  // 파란 테두리)와는 구분되는 보라색 테두리로 보여줘요. 여러 개 동시에 켜질 수 있어요.
  isMultiSelected?: boolean;
  onSelect: () => void;
  // Shift를 누른 채 클릭하면 이 박스를 다중 선택 목록에 넣거나 빼요(정렬/분배 패널용,
  // 2026-09 추가) — 일반 클릭(onSelect)과 달리 드래그를 시작하지 않고 딱 선택 상태만
  // 토글해요. 전달 안 하면(레이어가 아직 안 붙었으면) 일반 onSelect로 대체해요.
  onShiftSelect?: () => void;
  // 사진박스·다른 텍스트박스와 섞어서 매긴 쌓임 순서예요(2026-09-25 "레이어" 기능
  // 추가). 이 값을 그대로 CSS zIndex로 써서, 예전처럼 텍스트가 항상 사진 위(z-30
  // 고정)가 아니라 실제 순서대로 보이게 해요 — TextBoxLayer가 effectiveZOrder()로
  // 계산해서 내려줘요.
  zIndex: number;
  // 아래 뜨는 작은 "레이어" 툴바(삭제·앞으로·뒤로·맨앞·맨뒤)용이에요. 없으면(옵션)
  // 툴바를 안 띄워요.
  onDelete?: () => void;
  onStackAction?: (action: StackOrderAction) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  // 8방향(모서리 4개 + 변 4개) 크기 조절 전용 상태예요 — 포토샵/일러스트레이터의 선택
  // 상자처럼, 어느 손잡이를 끌든 그 방향에 맞게 너비·높이·(왼쪽/위쪽 손잡이는) 위치까지
  // 함께 조절돼요.
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    xPct: 0,
    yPct: 0,
    widthPct: 0,
    heightPct: 0,
    cellW: 1,
    cellH: 1,
    dir: "se" as TextBoxResizeDir,
  });

  // preventDefault를 하지 않아요 — 그래야 textarea 안을 클릭했을 때 브라우저가 원래 하던
  // 대로 포커스를 주고 그 자리에 커서를 놓아줘요(타이핑이 바로 가능해요). 대신
  // stopPropagation으로 상위(페이지 바깥 클릭 시 선택 해제하는) 핸들러만 막아요.
  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    // Shift+클릭이면 드래그를 시작하지 않고 다중 선택 토글만 해요(2026-09 추가) — 실수로
    // 박스를 옮기지 않도록, 여기서 바로 return해요.
    if (e.shiftKey && onShiftSelect) {
      onShiftSelect();
      return;
    }
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
    setMouseDownActive(true);
  }

  // 손잡이 8개(모서리 4개=가로·세로 동시, 변 4개=한쪽만) — 왼쪽/위쪽 손잡이를 끌면
  // 반대쪽 끝은 고정된 채 위치(xPct/yPct)와 크기가 함께 바뀌어요(포토샵 자유 변형과
  // 동일한 동작).
  function handleResizeStart(dir: TextBoxResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    const boxRect = boxRef.current?.getBoundingClientRect();
    const cellH = cellRect?.height || 1;
    const currentHeightPct = box.heightPct ?? (boxRect ? (boxRect.height / cellH) * 100 : 10);
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      widthPct: box.widthPct,
      heightPct: currentHeightPct,
      cellW: cellRect?.width || 1,
      cellH,
      dir,
    };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const s = resizeStart.current;
      const dxPct = ((e.clientX - s.mouseX) / s.cellW) * 100;
      const dyPct = ((e.clientY - s.mouseY) / s.cellH) * 100;
      const changes: Partial<TextBoxDef> = {};
      const hasE = s.dir.includes("e");
      const hasW = s.dir.includes("w");
      const hasS = s.dir.includes("s");
      const hasN = s.dir.includes("n");
      if (hasE) {
        changes.widthPct = Math.min(96, Math.max(6, s.widthPct + dxPct));
      } else if (hasW) {
        const nextWidth = Math.min(96, Math.max(6, s.widthPct - dxPct));
        changes.widthPct = nextWidth;
        changes.xPct = s.xPct + (s.widthPct - nextWidth);
      }
      if (hasS) {
        changes.heightPct = Math.min(96, Math.max(4, s.heightPct + dyPct));
      } else if (hasN) {
        const nextHeight = Math.min(96, Math.max(4, s.heightPct - dyPct));
        changes.heightPct = nextHeight;
        changes.yPct = s.yPct + (s.heightPct - nextHeight);
      }
      onChange(changes);
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!mouseDownActive) return;

    function handleMouseMove(e: MouseEvent) {
      const dxPxRaw = e.clientX - dragStart.current.mouseX;
      const dyPxRaw = e.clientY - dragStart.current.mouseY;

      if (!isDragging) {
        // 아직 문턱값을 못 넘었으면(=그냥 클릭일 수도 있으면) 박스를 옮기지 않아요. 이
        // 덕분에 텍스트 안쪽을 클릭해서 커서만 놓는 동작과, 끌어서 옮기는 동작이 둘 다
        // 자연스럽게 가능해요.
        if (Math.hypot(dxPxRaw, dyPxRaw) < TEXT_BOX_DRAG_THRESHOLD_PX) return;
        setIsDragging(true);
        // 드래그가 시작되면 혹시 텍스트에 포커스가 가 있어도 풀어줘요 — 안 그러면 마우스를
        // 움직이는 동안 글자가 드래그-선택(파랗게 반전)돼서 지저분해 보여요.
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      e.preventDefault();

      const parentEl = boxRef.current?.parentElement ?? null;
      const cellRect = parentEl?.getBoundingClientRect() ?? null;
      const dxPct = (dxPxRaw / dragStart.current.cellW) * 100;
      const dyPct = (dyPxRaw / dragStart.current.cellH) * 100;
      let nextX = Math.min(196, Math.max(-100, dragStart.current.xPct + dxPct));
      let nextY = Math.min(96, Math.max(0, dragStart.current.yPct + dyPct));

      // 박스 실제 크기(픽셀)를 페이지 크기 대비 %로 환산해서, "박스의 가운데"가 페이지
      // 가운데(50%)에 오는 자리를 계산해요(왼쪽 위 좌표가 아니라 가운데 기준으로 맞춰야
      // 자연스럽게 붙어요).
      const boxRect = boxRef.current?.getBoundingClientRect();
      const boxWpct = boxRect ? (boxRect.width / dragStart.current.cellW) * 100 : box.widthPct;
      const boxHpct = boxRect ? (boxRect.height / dragStart.current.cellH) * 100 : 0;

      const centerXTarget = 50 - boxWpct / 2;
      const centerYTarget = 50 - boxHpct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;

      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });
      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging, box.widthPct]);

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      // 2026-09-27, 혜민님 요청: "글상자 파란네모가 안으로 들어가보이는데 밖으로
      // 빼주세요" — 일반 border는 박스 테두리 선 자체(레이아웃 안쪽)에 그려져서 안으로
      // 들어가 보였는데, outline은 박스 바깥쪽에 겹치지 않고 그려지니까
      // outline-offset을 줘서 선택 표시를 박스 밖으로 확실히 떼어냈어요.
      // 2026-09-28, 혜민님 요청(스위트북 비교): 실선 대신 점선(marching ants 느낌)으로
      // 바꿔서 "선택 표시"라는 게 더 잘 드러나게 했어요.
      // 2026-10-01, 혜민님 요청: "점선말고 얇은 실선으로 처리해주세요" — 점선(marching
      // ants)을 없애고 얇은 실선(outline-1)으로 통일. 사진박스(ImageBoxOverlay)도 같이 바꿈.
      className={`absolute cursor-move outline outline-1 outline-offset-[6px] transition ${
 isActive
          ? "outline-[var(--color-sky)]"
          : isMultiSelected
          ? "outline-[var(--color-brand-purple)]"
          : "outline-transparent hover:outline-[var(--color-sky)]/40"
      }`}
      style={{
        zIndex,
        left: `${box.xPct}%`,
        top: `${box.yPct}%`,
        width: `${box.widthPct}%`,
        height: box.heightPct !== undefined ? `${box.heightPct}%` : undefined,
        // 2026-09-25, 혜민님 리포트: "텍스트박스 모서리는 박스가 깨져보입니다. 안으로
        // 말려들어간 현상" — 여기 있던 overflow:hidden이 텍스트 줄바꿈 넘침용이었는데,
        // 아래 textarea 자신의 className에도 이미 overflow-hidden이 있어서(텍스트
        // 클리핑은 그걸로 충분) 정작 이 div의 overflow:hidden은 선택 테두리(outline)와
        // 크기 조절 손잡이(둘 다 박스 밖으로 몇 px 튀어나오게 그려짐)까지 박스 경계에서
        // 잘라내고 있었어요. 제거해서 텍스트 클리핑은 그대로 두고 테두리·손잡이만 안
        // 잘리게 함.
        // 박스 높이가 고정돼 있을 때만 세로 정렬(위/가운데/아래)이 실제로 보여요 — 높이가
        // 글자 양에 맞춰 자동으로 늘어나는 박스는 남는 공간이 없어서 항상 위와 같아요.
        display: box.heightPct !== undefined ? "flex" : undefined,
        flexDirection: box.heightPct !== undefined ? "column" : undefined,
        justifyContent:
          box.heightPct !== undefined
            ? box.verticalAlign === "middle"
              ? "center"
              : box.verticalAlign === "bottom"
                ? "flex-end"
                : "flex-start"
            : undefined,
      }}
    >
      {/* 2026-10-05, 혜민님 리포트: "텍스트박스 이동하려고 하면 뒤에 있는 이미지가 움직여요,
          텍스트박스는 선택 누락되고" — 선택된 박스의 파란 테두리(outline)가
          outline-offset-[6px]로 박스 실제 경계보다 6px 바깥에 그려지는데(2026-09-27
          변경), 그 테두리 선 자체는 클릭 영역이 아니어서 사용자가 자연스럽게 테두리
          근처를 잡고 끌면 실제로는 박스 바깥의 다른 요소(뒤에 있는 이미지박스 등)를
          누르게 됐었어요. 테두리가 그려지는 여백만큼(8px, 여유 있게) 투명한 히트 영역을
          덧대서, 그 경계선 위/근처를 눌러도 항상 이 텍스트박스가 반응하도록 함. */}
      <div className="absolute -inset-2" onMouseDown={handleMouseDown} />
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      <textarea
        value={box.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={box.heightPct !== undefined && box.verticalAlign && box.verticalAlign !== "top" ? textBoxRowCount(box.text) : 1}
        placeholder="텍스트 입력"
        style={{
          color: box.color,
          fontFamily: box.fontFamily,
          fontSize: `${0.85 * box.fontScale}rem`,
          textAlign: box.align,
          fontWeight: box.bold ? 700 : 400,
          // 밑줄·기울임(2026-10-02 추가, "문자" 패널 요청).
          textDecoration: box.underline ? "underline" : undefined,
          fontStyle: box.italic ? "italic" : undefined,
          flexShrink: 0,
          // 글자 배경(하이라이트) — 지정 안 하면(undefined) 기존처럼 완전 투명. 가로/세로
          // 여백(backgroundPaddingXPct/YPct)만큼 글자 크기(em) 기준으로 배경이 글자보다
          // 넉넉하게 퍼져요. boxDecorationBreak:clone으로 줄바꿈된 줄마다 각자 배경이
          // 붙어요(형광펜처럼).
          ...(box.backgroundColor
            ? {
                backgroundColor: box.backgroundColor,
                paddingLeft: `${(box.backgroundPaddingXPct ?? 40) / 100}em`,
                paddingRight: `${(box.backgroundPaddingXPct ?? 40) / 100}em`,
                paddingTop: `${(box.backgroundPaddingYPct ?? 25) / 100}em`,
                paddingBottom: `${(box.backgroundPaddingYPct ?? 25) / 100}em`,
                boxDecorationBreak: "clone",
                WebkitBoxDecorationBreak: "clone",
              }
            : {}),
          // lineHeight/letterSpacing이 지정 안 됐으면(undefined) 인라인 스타일을 아예 안
          // 넣어서, 기존처럼 className의 "leading-snug"(1.375)·브라우저 기본 자간이 그대로
          // 적용돼요(2026-09-23 "문자" 패널 통합 전 텍스트박스와 완전히 같은 크기로 보여요).
          ...(box.lineHeight !== undefined ? { lineHeight: box.lineHeight } : {}),
          ...(box.letterSpacing !== undefined ? { letterSpacing: `${box.letterSpacing}em` } : {}),
          // 글자 가로/세로 폭(일러스트레이터 문자 패널의 "가로 폭"/"세로 폭", 2026-09-27
          // 추가) — 둘 다 100이면(기본) transform을 아예 안 넣어요. ⚠️ 화면 전용, 인쇄
          // PDF엔 아직 반영 안 돼요.
          ...((box.scaleXPct ?? 100) !== 100 || (box.scaleYPct ?? 100) !== 100
            ? {
                transform: `scaleX(${(box.scaleXPct ?? 100) / 100}) scaleY(${(box.scaleYPct ?? 100) / 100})`,
                transformOrigin: box.align === "right" ? "top right" : box.align === "center" ? "top center" : "top left",
              }
            : {}),
        }}
        className={`relative w-full cursor-text resize-none border-none bg-transparent leading-snug outline-none ${
 box.heightPct !== undefined
            ? box.verticalAlign && box.verticalAlign !== "top"
              ? "max-h-full overflow-hidden"
              : "h-full overflow-hidden"
            : "overflow-hidden"
        }`}
      />
      {/* 모서리 4개(가로·세로 동시) + 변 4개(한쪽만) 손잡이예요 — 포토샵/일러스트레이터
          선택 상자처럼 어느 방향으로든 자유롭게 크기 조절할 수 있어요. */}
      {isActive && (
        <>
          {TEXT_BOX_RESIZE_HANDLES.map(({ dir, className, cursor, title }) => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              title={title}
              className={`absolute z-40 h-3 w-3 -sm border border-white bg-[var(--color-sky)] ${cursor} ${className}`}
            />
          ))}
          {(onDelete || onStackAction) && (
            <StackOrderToolbar
              // 박스 아래쪽이 페이지 밑바닥에 가까우면(대략 80% 아래) 툴바가 페이지
              // 밖으로 잘려 안 보일 수 있어서, 그때만 위쪽에 띄워요(간단한 규칙 —
              // 실제 화면 좌표를 재는 대신 %로만 대충 판단해요, 2026-09-25).
              flip={box.yPct + (box.heightPct ?? 12) > 80}
              fillsFrame={box.yPct <= 2 && box.yPct + (box.heightPct ?? 12) >= 98}
              onDelete={onDelete}
              onStackAction={onStackAction}
            />
          )}
        </>
      )}
    </div>
  );
}

// 캔버스 위 작은 "레이어" 툴바·다중 정렬 툴바에서 쓰는 선 아이콘 세트예요(2026-09-26,
// 혜민님이 보내주신 참고 이미지의 일러스트레이터 스타일 선 아이콘을 참고해서 만들었어요).
// 전부 24x24 기준 획(stroke)만으로 그린 단순한 아이콘이라, 버튼 크기가 작아도(16~20px)
// 안 뭉개지고 alt 텍스트 없이도(title 툴팁으로 이름은 따로 붙어요) 뜻이 대충 짐작돼요.
type LayerIconName =
  | "delete"
  | "front"
  | "forward"
  | "back"
  | "backward"
  | "fit"
  | "zoomIn"
  | "zoomOut"
  | "rotate"
  | "flip"
  | "opacity"
  | "border"
  | "edit"
  | "alignLeft"
  | "alignHCenter"
  | "alignRight"
  | "alignTop"
  | "alignVCenter"
  | "alignBottom"
  | "textAlignLeft"
  | "textAlignCenter"
  | "textAlignRight"
  | "boxAlignTop"
  | "boxAlignMiddle"
  | "boxAlignBottom"
  | "check"
  | "underline"
  | "italic"
  | "highlight";

function LayerIcon({ name, className }: { name: LayerIconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className ?? "h-3.5 w-3.5",
  };
  switch (name) {
    case "delete":
      return (
        <svg {...common}>
          <path d="M5 7h14" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M6.5 7l.7 11.5A1.5 1.5 0 0 0 8.7 20h6.6a1.5 1.5 0 0 0 1.5-1.5L17.5 7" />
          <path d="M10 11v5M14 11v5" />
        </svg>
      );
    case "front":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="9" height="9" rx="1" opacity="0.4" />
          <rect x="11" y="6" width="9" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    // 2026-09-28(2차), 혜민님 요청("맨뒤/맨앞" 말고 "앞으로/뒤로" 한 칸씩 이동도):
    // computeZOrderUpdates에는 forward/backward 로직이 이미 있었는데 이 툴바에
    // 버튼이 없어서 실제로 쓸 방법이 없었어요 — front/back과 같은 두 사각형 모양에
    // "한 칸만" 이동한다는 뜻으로 작은 화살표를 얹었어요.
    case "forward":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="9" height="9" rx="1" opacity="0.4" />
          <rect x="11" y="6" width="9" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
          <path d="M15.5 3v3.5M14 5l1.5-1.5L17 5" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <rect x="11" y="6" width="9" height="9" rx="1" opacity="0.4" />
          <rect x="4" y="9" width="9" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case "backward":
      return (
        <svg {...common}>
          <rect x="11" y="6" width="9" height="9" rx="1" opacity="0.4" />
          <rect x="4" y="9" width="9" height="9" rx="1" fill="currentColor" fillOpacity="0.15" />
          <path d="M8.5 18v3.5M7 20.5l1.5 1.5L10 20.5" />
        </svg>
      );
    case "fit":
      return (
        <svg {...common}>
          <path d="M9 4H5v4" />
          <path d="M15 4h4v4" />
          <path d="M9 20H5v-4" />
          <path d="M15 20h4v-4" />
        </svg>
      );
    case "zoomIn":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
          <path d="M10.5 8v5M8 10.5h5" />
        </svg>
      );
    case "zoomOut":
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
          <path d="M8 10.5h5" />
        </svg>
      );
    case "rotate":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.7-6" />
          <path d="M20 3.5v5.5h-5.5" />
        </svg>
      );
    case "flip":
      return (
        <svg {...common}>
          <path d="M12 4v16" strokeDasharray="2 2.5" />
          <path d="M7 8l-3 4 3 4" />
          <path d="M17 8l3 4-3 4" />
        </svg>
      );
    case "opacity":
      return (
        <svg {...common}>
          <path d="M12 3c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 9 7 12 3z" />
          <path d="M12 3c3 4 6 7.2 6 10.5a6 6 0 0 1-6 6z" fill="currentColor" fillOpacity="0.3" stroke="none" />
        </svg>
      );
    case "border":
      return (
        <svg {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="1.2" />
          <path d="M4.5 4.5h6" strokeWidth="3.2" />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path d="M15.5 5.5l3 3L8 19l-4 1 1-4z" />
        </svg>
      );
    case "alignLeft":
      return (
        <svg {...common}>
          <path d="M4 3v18" />
          <path d="M8 7h12M8 12h8M8 17h10" />
        </svg>
      );
    case "alignHCenter":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M6 7h12M8.5 12h7M7 17h10" />
        </svg>
      );
    case "alignRight":
      return (
        <svg {...common}>
          <path d="M20 3v18" />
          <path d="M4 7h12M8 12h8M6 17h10" />
        </svg>
      );
    case "alignTop":
      return (
        <svg {...common}>
          <path d="M3 4h18" />
          <path d="M7 8v12M12 8v8M17 8v10" />
        </svg>
      );
    case "alignVCenter":
      return (
        <svg {...common}>
          <path d="M3 12h18" />
          <path d="M7 6v12M12 8.5v7M17 7v10" />
        </svg>
      );
    case "alignBottom":
      return (
        <svg {...common}>
          <path d="M3 20h18" />
          <path d="M7 4v12M12 9v8M17 6v10" />
        </svg>
      );
    // 2026-09-27, 혜민님 요청: 텍스트 가로 정렬 버튼은 (위 alignLeft 등, 박스 여러 개를
    // 나란히 맞추는 아이콘과 헷갈리지 않도록) 글줄 아이콘으로 따로 만들었어요 — 일러스트
    // 레이터 "단락" 패널의 왼쪽/가운데/오른쪽 정렬 아이콘과 같은 느낌.
    case "check":
      return (
        <svg {...common}>
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      );
    case "boxAlignTop":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="1.2" />
          <path d="M7.5 8.5h9" />
        </svg>
      );
    case "boxAlignMiddle":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="1.2" />
          <path d="M7.5 12h9" />
        </svg>
      );
    case "boxAlignBottom":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="16" rx="1.2" />
          <path d="M7.5 15.5h9" />
        </svg>
      );
    case "textAlignLeft":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 11h10" />
          <path d="M4 16h13" />
        </svg>
      );
    case "textAlignCenter":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M7 11h10" />
          <path d="M5.5 16h13" />
        </svg>
      );
    case "textAlignRight":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M10 11h10" />
          <path d="M7 16h13" />
        </svg>
      );
    // 2026-10-02, 혜민님 요청: 텍스트 밑줄·기울임·배경 아이콘.
    case "underline":
      return (
        <svg {...common}>
          <path d="M6 4v7a6 6 0 0 0 12 0V4" />
          <path d="M5 20h14" />
        </svg>
      );
    case "italic":
      return (
        <svg {...common}>
          <path d="M11 4h6" />
          <path d="M7 20h6" />
          <path d="M14 4l-4 16" />
        </svg>
      );
    case "highlight":
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="7" rx="1" fill="currentColor" fillOpacity="0.2" />
          <path d="M6 6h12" />
        </svg>
      );
  }
}

// 사진박스(사진/스티커)·텍스트박스 공용 "레이어" 작은 떠있는 툴바예요(2026-09-25 추가,
// 2026-09-26 아이콘 세트로 교체 + 사진박스 전용 기능 추가 — 혜민님이 보내주신 참고
// 이미지 기준). mediaKind로 어떤 버튼을 보여줄지 갈려요 — 텍스트박스는 예전처럼
// 삭제·맨앞·맨뒤 3개만, 사진박스(사진)는 맞춤·확대·축소·회전·좌우반전·투명도·테두리·
// 편집까지 전부, 스티커는 그중 사진 위치 조정 관련(맞춤·편집)만 빼요(스티커는 잘라내기
// 없이 이동+크기조절만 하니까). 박스 자신의 위치 기준(부모가 이미
// xPct/yPct/widthPct/heightPct로 자리잡은 박스 div) 바로 아래(또는 위)에 CSS로만
// 붙어서, 실제 화면 좌표를 따로 재지 않아도 항상 그 박스 가까이에 보여요.
function StackOrderToolbar({
  flip,
  fillsFrame,
  mediaKind = "text",
  onDelete,
  onStackAction,
  onFit,
  onZoomIn,
  onZoomOut,
  onRotate,
  rotation,
  onRotationChange,
  onFlip,
  editActive,
  onToggleEdit,
  opacity,
  onOpacityChange,
  borderWidthPx,
  borderColor,
  borderRadiusPct,
  onBorderChange,
}: {
  flip: boolean;
  // 박스가 대지를 위아래로 꽉 채운 경우(2026-09-27 추가) — 박스 바깥에 뗄 자리가
  // 없어서 조상 overflow-hidden에 잘리니, 박스 안쪽 위 가장자리에 겹쳐서 띄워요.
  fillsFrame?: boolean;
  mediaKind?: "text" | "photo" | "sticker";
  onDelete?: () => void;
  onStackAction?: (action: StackOrderAction) => void;
  onFit?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRotate?: () => void;
  // 2026-10-06, 혜민님 요청: "미세한 회전조절" — 기존 onRotate(90도씩 즉시회전)와
  // 별개로, 슬라이더·숫자입력으로 임의 각도를 바로 지정하는 정밀 회전 컨트롤이에요.
  rotation?: number;
  onRotationChange?: (deg: number) => void;
  onFlip?: () => void;
  editActive?: boolean;
  onToggleEdit?: () => void;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  borderWidthPx?: number;
  borderColor?: string;
  borderRadiusPct?: number;
  onBorderChange?: (widthPx: number, color: string, radiusPct: number) => void;
}) {
  // "투명도"·"테두리" 아이콘을 누르면 그 아래 작은 조절판이 열려요 — 다시 누르면
  // 닫혀요(2026-09-26 신규 기능이라 바깥 클릭 감지 같은 복잡한 처리는 넣지 않고, 아이콘
  // 재클릭이나 박스 선택 해제로 닫히는 가장 단순한 방식으로 했어요).
  const [openPanel, setOpenPanel] = useState<"opacity" | "border" | "rotation" | null>(null);

  const buttons: { key: string; title: string; icon: LayerIconName; onClick: () => void; danger?: boolean }[] = [];
  if (onDelete) buttons.push({ key: "delete", title: "삭제", icon: "delete", onClick: onDelete, danger: true });
  if (onStackAction) {
    // 2026-09-28(2차): "맨 앞으로/맨 뒤로"만 있고 한 칸씩 옮기는 "앞으로/뒤로"가 없어서
    // 여러 개가 겹쳤을 때 원하는 순서를 세밀하게 맞추기 어려웠어요 — 4개 다 추가.
    buttons.push(
      { key: "back", title: "맨 뒤로", icon: "back", onClick: () => onStackAction("back") },
      { key: "backward", title: "뒤로(한 칸)", icon: "backward", onClick: () => onStackAction("backward") },
      { key: "forward", title: "앞으로(한 칸)", icon: "forward", onClick: () => onStackAction("forward") },
      { key: "front", title: "맨 앞으로", icon: "front", onClick: () => onStackAction("front") }
    );
  }
  if (mediaKind !== "text") {
    if (onFit) buttons.push({ key: "fit", title: "맞춤(사진 위치 초기화)", icon: "fit", onClick: onFit });
    if (onZoomIn) buttons.push({ key: "zoomIn", title: "확대", icon: "zoomIn", onClick: onZoomIn });
    if (onZoomOut) buttons.push({ key: "zoomOut", title: "축소", icon: "zoomOut", onClick: onZoomOut });
    if (onRotate) buttons.push({ key: "rotate", title: "회전", icon: "rotate", onClick: onRotate });
    if (onFlip) buttons.push({ key: "flip", title: "좌우 반전", icon: "flip", onClick: onFlip });
  }

  return (
    <div
      // 캔버스의 드래그·선택 로직(onMouseDown)이 부모 박스에 달려있어서, 여기서 누른
      // 마우스 이벤트가 위로 새서 박스가 같이 끌리지 않도록 막아요.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 z-50 flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap bg-[var(--color-charcoal)] px-1 py-1 text-white "
      style={fillsFrame ? { top: 6 } : flip ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }}
    >
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          title={b.title}
          onClick={b.onClick}
          className={`flex h-6 w-6 items-center justify-center text-xs transition hover:bg-white/20 ${
 b.danger ? "text-red-300" : ""
          }`}
        >
          <LayerIcon name={b.icon} />
        </button>
      ))}
      {mediaKind !== "text" && onOpacityChange && (
        <div className="relative">
          <button
            type="button"
            title="투명도"
            onClick={() => setOpenPanel((v) => (v === "opacity" ? null : "opacity"))}
            className={`flex h-6 w-6 items-center justify-center text-xs transition hover:bg-white/20 ${
 openPanel === "opacity" ? "bg-white/20" : ""
            }`}
          >
            <LayerIcon name="opacity" />
          </button>
          {openPanel === "opacity" && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-1/2 top-full z-50 mt-1.5 w-32 -translate-x-1/2 border border-[var(--color-hairline)] bg-white p-2 text-[var(--color-charcoal)] "
            >
              <p className="mb-1 text-[10px] text-[var(--color-charcoal)]/60">투명도 {Math.round((opacity ?? 1) * 100)}%</p>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={Math.round((opacity ?? 1) * 100)}
                onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
      {mediaKind !== "text" && onBorderChange && (
        <div className="relative">
          <button
            type="button"
            title="테두리"
            onClick={() => setOpenPanel((v) => (v === "border" ? null : "border"))}
            className={`flex h-6 w-6 items-center justify-center text-xs transition hover:bg-white/20 ${
 openPanel === "border" ? "bg-white/20" : ""
            }`}
          >
            <LayerIcon name="border" />
          </button>
          {openPanel === "border" && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-1/2 top-full z-50 mt-1.5 w-36 -translate-x-1/2 border border-[var(--color-hairline)] bg-white p-2 text-[var(--color-charcoal)] "
            >
              <p className="mb-1 text-[10px] text-[var(--color-charcoal)]/60">테두리 두께 {borderWidthPx ?? 0}px</p>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={borderWidthPx ?? 0}
                  onChange={(e) => onBorderChange(Number(e.target.value), borderColor ?? "#ffffff", borderRadiusPct ?? 0)}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={borderColor ?? "#ffffff"}
                  onChange={(e) => onBorderChange(borderWidthPx ?? 0, e.target.value, borderRadiusPct ?? 0)}
                  className="h-5 w-6 shrink-0 cursor-pointer border-none bg-transparent p-0"
                />
              </div>
              <p className="mb-1 mt-2 text-[10px] text-[var(--color-charcoal)]/60">
                모서리 둥글게 {borderRadiusPct ?? 0}% {(borderRadiusPct ?? 0) >= 50 ? "(원)" : ""}
              </p>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={borderRadiusPct ?? 0}
                onChange={(e) => onBorderChange(borderWidthPx ?? 0, borderColor ?? "#ffffff", Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
      {mediaKind !== "text" && onRotationChange && (
        <div className="relative">
          <button
            type="button"
            title="정밀 회전"
            onClick={() => setOpenPanel((v) => (v === "rotation" ? null : "rotation"))}
            className={`flex h-6 w-6 items-center justify-center text-xs transition hover:bg-white/20 ${
 openPanel === "rotation" ? "bg-white/20" : ""
            }`}
          >
            <LayerIcon name="rotate" />
          </button>
          {openPanel === "rotation" && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute left-1/2 top-full z-50 mt-1.5 w-40 -translate-x-1/2 border border-[var(--color-hairline)] bg-white p-2 text-[var(--color-charcoal)] "
            >
              {/* 2026-10-06, 혜민님 요청: "미세한 회전조절이 안되더라고요, 회전툴도
                  추가해주세요" — 기존 90도 단위 회전 버튼과 별개로, 슬라이더(1도
                  단위)·숫자 직접 입력 둘 다로 정밀하게 각도를 맞출 수 있어요. */}
              <p className="mb-1 text-[10px] text-[var(--color-charcoal)]/60">회전 {Math.round(rotation ?? 0)}°</p>
              <input
                type="range"
                min={0}
                max={359}
                step={1}
                value={Math.round(rotation ?? 0)}
                onChange={(e) => onRotationChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1.5 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={359}
                  value={Math.round(rotation ?? 0)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) onRotationChange(((v % 360) + 360) % 360);
                  }}
                  className="w-16 border border-[var(--color-hairline)] px-1.5 py-1 text-xs outline-none focus:border-[var(--color-sky)]"
                />
                <span className="text-[11px] text-[var(--color-charcoal)]/50">도</span>
                <button
                  type="button"
                  onClick={() => onRotationChange(0)}
                  className="ml-auto text-[11px] text-[var(--color-charcoal)]/50 underline underline-offset-4"
                >
                  초기화
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {mediaKind === "photo" && onToggleEdit && (
        <button
          type="button"
          title="편집(사진 위치 조정)"
          onClick={onToggleEdit}
          className={`flex h-6 w-6 items-center justify-center text-xs transition hover:bg-white/20 ${
 editActive ? "bg-[var(--color-brand-purple)]" : ""
          }`}
        >
          <LayerIcon name="edit" />
        </button>
      )}
    </div>
  );
}

// 텍스트박스 크기 조절 손잡이 방향 코드예요. 나침반 방향처럼 n(위)/s(아래)/e(오른쪽)/
// w(왼쪽)와 그 조합(모서리) 8개를 써요.
// 사진박스 2개 이상 다중 선택(Shift+클릭)했을 때 캔버스 위에 뜨는 작은 정렬 아이콘
// 툴바예요(2026-09-26, 혜민님이 보내주신 일러스트레이터 정렬 패널 참고 이미지 기준) —
// 선택된 박스들의 바운딩 박스 오른쪽 위 모서리에 붙어요. 좌측/가운데/우측(가로)·
// 위/가운데/아래(세로) 6개 아이콘만 있어요(균등 분배는 이번 라운드엔 안 넣었어요 —
// 텍스트박스 쪽 MultiTextAlignPanel처럼 3개 이상일 때만 의미가 있는 기능이라 범위를
// 좁혔어요).
function MultiAlignFloatingToolbar({
  bounds,
  onAlign,
  disabledModes,
}: {
  bounds: { left: number; top: number; right: number; bottom: number };
  onAlign: (mode: TextBoxAlignMode) => void;
  disabledModes?: TextBoxAlignMode[];
}) {
  const modes: { mode: TextBoxAlignMode; icon: LayerIconName; title: string }[] = [
    { mode: "left", icon: "alignLeft", title: "왼쪽 정렬" },
    { mode: "hcenter", icon: "alignHCenter", title: "가운데 정렬(가로)" },
    { mode: "right", icon: "alignRight", title: "오른쪽 정렬" },
    { mode: "top", icon: "alignTop", title: "위 정렬" },
    { mode: "vmiddle", icon: "alignVCenter", title: "가운데 정렬(세로)" },
    { mode: "bottom", icon: "alignBottom", title: "아래 정렬" },
  ];
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="absolute z-50 grid grid-cols-3 gap-0.5 bg-[var(--color-charcoal)] p-1 text-white shadow-lg"
      style={{ left: `${bounds.right}%`, top: `${bounds.top}%`, transform: "translate(2px, -100%) translateY(-6px)" }}
    >
      {modes.map((m) => {
        const disabled = disabledModes?.includes(m.mode) ?? false;
        return (
          <button
            key={m.mode}
            type="button"
            title={disabled ? `${m.title}(높이가 자동인 텍스트박스가 있어 비활성화)` : m.title}
            disabled={disabled}
            onClick={() => onAlign(m.mode)}
            className="flex h-6 w-6 items-center justify-center transition hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <LayerIcon name={m.icon} />
          </button>
        );
      })}
    </div>
  );
}

type TextBoxResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const TEXT_BOX_RESIZE_HANDLES: { dir: TextBoxResizeDir; className: string; cursor: string; title: string }[] = [
  { dir: "n", className: "left-1/2 -top-1.5 -translate-x-1/2", cursor: "cursor-ns-resize", title: "위로 끌어서 크기 조절" },
  { dir: "s", className: "left-1/2 -bottom-1.5 -translate-x-1/2", cursor: "cursor-ns-resize", title: "아래로 끌어서 크기 조절" },
  { dir: "w", className: "top-1/2 -left-1.5 -translate-y-1/2", cursor: "cursor-ew-resize", title: "왼쪽으로 끌어서 크기 조절" },
  { dir: "e", className: "top-1/2 -right-1.5 -translate-y-1/2", cursor: "cursor-ew-resize", title: "오른쪽으로 끌어서 크기 조절" },
  { dir: "nw", className: "-left-1.5 -top-1.5", cursor: "cursor-nwse-resize", title: "끌어서 크기 조절" },
  { dir: "ne", className: "-right-1.5 -top-1.5", cursor: "cursor-nesw-resize", title: "끌어서 크기 조절" },
  { dir: "sw", className: "-left-1.5 -bottom-1.5", cursor: "cursor-nesw-resize", title: "끌어서 크기 조절" },
  { dir: "se", className: "-right-1.5 -bottom-1.5", cursor: "cursor-nwse-resize", title: "끌어서 크기 조절" },
];

// "표만들기" 서브탭 내용이에요(기본형, 2026-09-25) — 행·열 수를 스테퍼로 고른 뒤
// "표 추가"를 누르면 그 크기의 빈 표가 캔버스 가운데 즈음에 생겨요. 셀 병합이나
// 셀별 스타일은 없고(기본형 범위), 칸을 클릭해서 바로 타이핑으로 채워요.
// TablePanelControls의 행·열 스테퍼예요 — 렌더 중에 컴포넌트를 새로 선언하면 매번
// state가 초기화되는 문제(react-hooks/static-components)가 있어서 모듈 스코프로 뺐어요.
function TablePanelStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-charcoal)]/70">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="flex h-7 w-7 items-center justify-center border border-[var(--color-hairline)] text-sm text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
        >
          −
        </button>
        <span className="w-6 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(20, value + 1))}
          className="flex h-7 w-7 items-center justify-center border border-[var(--color-hairline)] text-sm text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
        >
          ＋
        </button>
      </div>
    </div>
  );
}

function TablePanelControls({ onAdd }: { onAdd: (rows: number, cols: number) => void }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-hairline)] pb-2">
      <TablePanelStepper label="행(가로줄)" value={rows} onChange={setRows} />
      <TablePanelStepper label="열(세로줄)" value={cols} onChange={setCols} />
      <button
        type="button"
        onClick={() => onAdd(rows, cols)}
        className="rounded-md bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-xs font-medium text-white shadow-sm shadow-[var(--color-brand-purple)]/20 transition hover:opacity-90"
      >
        + 표 추가
      </button>
      <p className="text-[11px] leading-relaxed text-[var(--color-charcoal)]/50 break-keep">
        칸을 클릭하고 바로 입력하면 돼요. 표 전체는 테두리를 끌어서 옮기거나 모서리로
        크기를 조절할 수 있어요(셀 병합·셀별 색은 아직 지원하지 않아요).
      </p>
    </div>
  );
}

// "이모티콘" 서브탭 내용이에요(기본형, 2026-09-25 — 혜민님이 고른 "이모지 문자로
// 삽입" 방식) — 눌러서 바로 캔버스에 추가해요. 인쇄 PDF에서 보이는 모양은
// 서버(인쇄 파일을 만드는 브라우저)에 설치된 폰트에 따라 화면과 살짝 다를 수 있어요.
function EmojiPanelGrid({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--color-hairline)] pb-2">
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_PICKER_SET.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            title="캔버스에 추가"
            className="flex h-7 w-7 items-center justify-center text-lg transition hover:bg-[var(--color-ivory)]"
          >
            {emoji}
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--color-charcoal)]/50 break-keep">
        누르면 캔버스 가운데 즈음에 큼직하게 추가돼요 — 이후엔 텍스트박스와 똑같이
        끌어서 옮기거나 크기를 조절할 수 있어요.
      </p>
    </div>
  );
}

// 지금 선택된 텍스트박스 하나를 고치는 툴바예요. 박스마다 따로 뜨던 작은 팝업 툴바
// 대신 하나만 두고 폰트·크기·정렬·굵게·색·삭제를 여기서 한 번에 다뤄요. 예전엔 페이지
// 맨 위(편집 화면 바깥)에 고정돼 있었는데, 2026-09-22부터 편집 화면 안으로 옮겼어요
// ("텍스트박스는 상단에 따로 넣지 말고 편집기 안에 전부 넣어달라"는 요청). 선택된
// 박스가 없으면 안내 문구만 보여줘요.
function TextBoxToolbar({
  box,
  onChange,
  onDelete,
  pageWidthMm,
}: {
  box: TextBoxDef | null;
  onChange: (changes: Partial<TextBoxDef>) => void;
  onDelete: () => void;
  // 지금 고르고 있는 게 앞표지/뒤표지/내지 중 어떤 텍스트박스인지 — 혼동하지 않도록
  // 항상 보여줘요(2026-09-23 요청).
  scopeLabel?: string;
  // 이 텍스트박스가 속한 칸(앞표지/뒤표지 칸 또는 내지 낱장)의 실제 폭(mm)이에요 —
  // "글자 크기(pt)" 입력이 fontScale을 실제 인쇄 pt로 보여주고 되돌리는 데 필요해요
  // (lib/textBoxFontSize.ts, 2026-09-23 "문자" 패널 통합). 칸마다 폭이 달라서 꼭 그
  // 칸에 맞는 값을 넘겨줘야 pt 숫자가 실제 인쇄 결과와 맞아요.
  pageWidthMm: number;
}) {
  // 2026-10-02, 혜민님 요청("텍스트 크기 조절 안되는 버그", "글자크기·행간·자간·
  // 가로폭·세로폭 박스선택하면 직접 선택해서 숫자 수정할수있게") — 원인: 이 다섯
  // 입력이 매 렌더마다 box의 실제 값(특히 pt는 fontScale로 왕복 변환 + 범위 클램프
  // 까지 거친 값)을 그대로 controlled value로 보여주고 있어서, 타이핑 중간에
  // 클램프/반올림된 값이 즉시 입력칸에 되돌아와 찍히는 바람에 숫자를 이어 칠 수가
  // 없었어요(예: "60"을 치려고 "6"만 입력해도 그 순간 클램프된 값으로 덮어써짐).
  // 그래서 이 다섯 입력은 "지금 입력 중인 글자"를 로컬 상태로 따로 들고 있다가,
  // 다른 텍스트박스로 전환될 때(box.id가 바뀔 때)만 box의 실제 값으로 다시
  // 맞추고, 입력을 마치고 포커스를 벗어날 때(onBlur)도 한 번 정리해요 — 타이핑
  // 도중에는 절대 강제로 덮어쓰지 않아요.
  const [ptDraft, setPtDraft] = useState("");
  const [lineHeightDraft, setLineHeightDraft] = useState("");
  const [letterSpacingDraft, setLetterSpacingDraft] = useState("");
  const [scaleXDraft, setScaleXDraft] = useState("");
  const [scaleYDraft, setScaleYDraft] = useState("");
  const lastSyncedBoxIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!box) {
      lastSyncedBoxIdRef.current = undefined;
      return;
    }
    if (lastSyncedBoxIdRef.current === box.id) return;
    lastSyncedBoxIdRef.current = box.id;
    setPtDraft(String(textBoxFontScaleToPt(box.fontScale, pageWidthMm)));
    setLineHeightDraft(String(box.lineHeight ?? 1.375));
    setLetterSpacingDraft(String(box.letterSpacing ?? 0));
    setScaleXDraft(String(box.scaleXPct ?? 100));
    setScaleYDraft(String(box.scaleYPct ?? 100));
  }, [box, pageWidthMm]);

  if (!box) return null;

  return (
    // onMouseDown을 여기서 막아야, 이 패널 안의 select·버튼·color input을 누를 때
    // 그 mousedown이 상위(캔버스 빈 곳 클릭 시 선택 해제하는 핸들러)까지 올라가서
    // 패널이 열리자마자 바로 닫혀버리는 문제가 안 생겨요(2026-09-23 버그 수정).
    // 카드 안에 또 카드가 들어간 느낌을 없애려고 테두리·그림자·둥근 배경은 빼고,
    // 아래쪽 구분선 하나로만 다른 내용과 나눴어요.
    <div
      className="mb-4 flex flex-col gap-2 border-b border-[var(--color-hairline)] pb-4"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 2026-10-04, 혜민님 요청(항목11): "내지 왼쪽 페이지 텍스트박스 제목 삭제하고
          서체로 문구 바꿔주세요" — "내지 왼쪽 페이지 텍스트박스" 같은 위치 설명 제목을
          없애고, 그 자리엔(표지 제목 입력칸의 "타이틀" 라벨과 같은 패턴으로) 바로 아래
          서체 선택 박스를 가리키는 "서체" 라벨만 남겨요. 삭제 버튼은 오른쪽 위에 그대로
          둬요. scopeLabel prop 자체는 지우지 않았어요(호출하는 쪽 3곳— 표지/뒤표지/내지
          — 이 다르게 넘겨주고 있는데, 당장은 화면에 안 쓰지만 나중에 다시 필요할 수
          있어서 prop만 남겨둠). */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="text-sm text-red-500 underline underline-offset-2 hover:text-red-600"
        >
          삭제
        </button>
      </div>
      {/* 2026-10-02, 혜민님 요청: "글자서체 오른쪽에 화살표를 조금 안쪽으로 넣기" —
          브라우저 기본 select 화살표를 없애고(appearance-none) 직접 그린 화살표를
          테두리에서 살짝 떨어진 안쪽(right-2.5)에 둠. */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
          서체
        </label>
      <div className="relative">
        <select
          value={box.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full appearance-none border border-[var(--color-hairline)] bg-white py-1.5 pl-2 pr-7 text-base"
          style={{ fontFamily: box.fontFamily }}
        >
          {fontOptions.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-charcoal)]/50"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
          글자 크기(pt)
        </label>
        {/* 2026-10-02, 혜민님 요청: "pt 안내문구 삭제하고 B 색상표 글자크기 오른쪽에
            배치" — 안내문구를 빼고 굵게(B)·글자색을 이 입력 오른쪽에 나란히 둠. */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={400}
            step={0.5}
            value={ptDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setPtDraft(raw);
              const pt = Number(raw);
              if (!Number.isFinite(pt) || pt <= 0) return;
              onChange({ fontScale: textBoxPtToFontScale(pt, pageWidthMm) });
            }}
            onBlur={() => setPtDraft(String(textBoxFontScaleToPt(box.fontScale, pageWidthMm)))}
            className="w-0 flex-1 border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
          />
          <button
            type="button"
            title="굵게"
            onClick={() => onChange({ bold: !box.bold })}
            className={`flex h-7 w-7 shrink-0 items-center justify-center border text-sm font-bold ${
              box.bold
                ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                : "border-[var(--color-hairline)]"
            }`}
          >
            B
          </button>
          {/* 2026-09-27, 혜민님 요청: "박스안에 박스가 있는 이런 부분을 좀 신경써주세요"
              — 브라우저 기본 color input이 스와치 주위에 자체 여백을 둬서 "작은 박스 안에
              더 작은 박스"처럼 보였어요. 네이티브 여백/테두리를 없애서 색이 버튼 전체를
              꽉 채우도록 고쳤어요. */}
          <input
            type="color"
            value={box.color}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-7 w-7 shrink-0 cursor-pointer appearance-none border border-[var(--color-hairline)] bg-transparent p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:p-0 [&::-webkit-color-swatch-wrapper]:p-0"
            title="글자 색"
          />
        </div>
      </div>
      {/* 2026-10-02, 혜민님 요청: "텍스트에 밑줄, 기울기, 배경 넣는기능 추가" — 왼쪽
          패널에 아이콘 버튼 3개로 추가. 배경을 켜면 색상표와 가로/세로 여백(%) 조절이
          바로 아래에 나타남(가로/세로 크기를 조절할 수 있어야 한다는 요청). ⚠️ 화면
          미리보기 전용은 아니고 인쇄 PDF(lib/printCompose.ts)에도 같이 반영돼요. */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="밑줄"
          onClick={() => onChange({ underline: !box.underline })}
          className={`flex h-7 w-7 items-center justify-center border ${
            box.underline
              ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
              : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
          }`}
        >
          <LayerIcon name="underline" className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="기울임"
          onClick={() => onChange({ italic: !box.italic })}
          className={`flex h-7 w-7 items-center justify-center border ${
            box.italic
              ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
              : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
          }`}
        >
          <LayerIcon name="italic" className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="배경"
          onClick={() => onChange({ backgroundColor: box.backgroundColor ? undefined : "#fff59d" })}
          className={`flex h-7 w-7 items-center justify-center border ${
            box.backgroundColor
              ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
              : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
          }`}
        >
          <LayerIcon name="highlight" className="h-4 w-4" />
        </button>
        {box.backgroundColor && (
          <input
            type="color"
            value={box.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="h-7 w-7 shrink-0 cursor-pointer appearance-none border border-[var(--color-hairline)] bg-transparent p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:p-0 [&::-webkit-color-swatch-wrapper]:p-0"
            title="배경 색"
          />
        )}
      </div>
      {box.backgroundColor && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
              배경 가로 여백(%)
            </label>
            <input
              type="number"
              min={0}
              max={150}
              step={5}
              value={box.backgroundPaddingXPct ?? 40}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                onChange({ backgroundPaddingXPct: Math.max(0, Math.min(150, v)) });
              }}
              className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
              배경 세로 여백(%)
            </label>
            <input
              type="number"
              min={0}
              max={150}
              step={5}
              value={box.backgroundPaddingYPct ?? 25}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isFinite(v)) return;
                onChange({ backgroundPaddingYPct: Math.max(0, Math.min(150, v)) });
              }}
              className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
            />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
            행간(줄 간격)
          </label>
          <input
            type="number"
            min={0.8}
            max={2.5}
            step={0.05}
            value={lineHeightDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setLineHeightDraft(raw);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              onChange({ lineHeight: Math.max(0.8, Math.min(2.5, v)) });
            }}
            onBlur={() => setLineHeightDraft(String(box.lineHeight ?? 1.375))}
            className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
            자간
          </label>
          <input
            type="number"
            min={-0.1}
            max={0.5}
            step={0.01}
            value={letterSpacingDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setLetterSpacingDraft(raw);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              onChange({ letterSpacing: Math.max(-0.1, Math.min(0.5, v)) });
            }}
            onBlur={() => setLetterSpacingDraft(String(box.letterSpacing ?? 0))}
            className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
          />
        </div>
      </div>
      {/* 2026-09-27, 혜민님 요청: "가로폭, 세로폭 조절이 가능한 패널이여야해요"(일러스트
          레이터 문자 패널 참고) — 글자를 가로/세로로 눌러 늘이는 비율(%)이에요. ⚠️ 화면
          미리보기 전용, 인쇄 PDF엔 아직 반영 안 돼요(이미지박스 회전과 같은 상태). */}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
            가로 폭(%)
          </label>
          <input
            type="number"
            min={50}
            max={200}
            step={1}
            value={scaleXDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setScaleXDraft(raw);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              onChange({ scaleXPct: Math.max(50, Math.min(200, v)) });
            }}
            onBlur={() => setScaleXDraft(String(box.scaleXPct ?? 100))}
            className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-charcoal)]/70">
            세로 폭(%)
          </label>
          <input
            type="number"
            min={50}
            max={200}
            step={1}
            value={scaleYDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setScaleYDraft(raw);
              const v = Number(raw);
              if (!Number.isFinite(v)) return;
              onChange({ scaleYPct: Math.max(50, Math.min(200, v)) });
            }}
            onBlur={() => setScaleYDraft(String(box.scaleYPct ?? 100))}
            className="w-full border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-base outline-none focus:border-[var(--color-sky)]"
          />
        </div>
      </div>
      {/* 2026-09-27, 혜민님 요청: "가운데정렬, 가운데 라고만 버튼이 되어있으니 어떤것을
          의미하는지 확인이 어렵습니다. 텍스트 가운데 정렬이면 텍스트 관련된 아이콘으로
          박스영역이면 박스영역 관련된 아이콘으로" — 텍스트 문단 정렬(가로)은 글줄
          아이콘(textAlign*)으로, 박스 안 세로 위치(박스 영역 개념)는 기존 사각형
          정렬 아이콘(align top/vCenter/bottom)으로 구분해서 각각 3개씩 명시적인
          버튼으로 바꿨어요(순환식 토글 대신 지금 상태가 바로 눌린 채로 보임).
          "박스안에 박스" 느낌을 줄이려고 바깥 테두리 없이 버튼끼리만 나란히 뒀어요. */}
      <div>
        <p className="mb-1 text-[11px] font-medium text-[var(--color-charcoal)]/70">문단 정렬</p>
        <div className="flex gap-1">
          {(
            [
              { id: "left" as const, icon: "textAlignLeft" as const, title: "왼쪽 정렬" },
              { id: "center" as const, icon: "textAlignCenter" as const, title: "가운데 정렬" },
              { id: "right" as const, icon: "textAlignRight" as const, title: "오른쪽 정렬" },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.title}
              onClick={() => onChange({ align: opt.id })}
              className={`flex h-7 flex-1 items-center justify-center border transition ${
                box.align === opt.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
              }`}
            >
              <LayerIcon name={opt.icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium text-[var(--color-charcoal)]/70">박스영역 정렬</p>
        <div className="flex gap-1">
          {(
            [
              { id: "top" as const, icon: "boxAlignTop" as const, title: "위" },
              { id: "middle" as const, icon: "boxAlignMiddle" as const, title: "가운데" },
              { id: "bottom" as const, icon: "boxAlignBottom" as const, title: "아래" },
            ]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              title={opt.title}
              onClick={() => onChange({ verticalAlign: opt.id })}
              className={`flex h-7 flex-1 items-center justify-center border transition ${
                (box.verticalAlign ?? "top") === opt.id
                  ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                  : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
              }`}
            >
              <LayerIcon name={opt.icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 텍스트박스 다중 선택(Shift+클릭, 2026-09 추가)일 때 보여주는 정렬(align)/분배
// (distribute) 패널이에요. 기준점은 항상 "지금 선택된 박스들의 바운딩 박스"예요(가장
// 간단하고 예측하기 쉬운 기준이라, 페이지/캔버스 기준이나 "첫 선택 박스" 기준 같은
// 추가 옵션은 이번 라운드에서 더하지 않았어요). canVerticalAlign이 false면(선택된 박스
// 중 높이가 자동인 것이 있으면) 세로 가운데·아래 정렬과 세로 분배 버튼을 비활성화해요 —
// 실제 렌더링 높이를 알 수 없는 상태에서 계산하면 위치가 어긋날 수 있어서예요.
function MultiTextAlignPanel({
  count,
  canVerticalAlign,
  onAlign,
  onDistribute,
  onClear,
}: {
  count: number;
  canVerticalAlign: boolean;
  onAlign: (mode: TextBoxAlignMode) => void;
  onDistribute: (axis: "horizontal" | "vertical") => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-[var(--color-brand-purple)]">텍스트박스 {count}개 선택됨</p>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-[var(--color-charcoal)]/50 underline underline-offset-4"
        >
          선택 해제
        </button>
      </div>
      <div>
        <p className="mb-1 text-[11px] text-[var(--color-charcoal)]/60">가로 정렬 (선택 영역 기준)</p>
        <div className="flex gap-1">
          {(
            [
              ["left", "왼쪽"],
              ["hcenter", "가운데"],
              ["right", "오른쪽"],
            ] as [TextBoxAlignMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onAlign(mode)}
              className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[11px] text-[var(--color-charcoal)]/60">
          세로 정렬 (선택 영역 기준)
          {!canVerticalAlign && " — 높이가 고정 안 된 박스가 있어 가운데·아래는 비활성화"}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onAlign("top")}
            className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs"
          >
            위
          </button>
          <button
            type="button"
            disabled={!canVerticalAlign}
            onClick={() => onAlign("vmiddle")}
            className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs disabled:opacity-30"
          >
            가운데
          </button>
          <button
            type="button"
            disabled={!canVerticalAlign}
            onClick={() => onAlign("bottom")}
            className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs disabled:opacity-30"
          >
            아래
          </button>
        </div>
      </div>
      {count >= 3 && (
        <div>
          <p className="mb-1 text-[11px] text-[var(--color-charcoal)]/60">균등 분배 (3개 이상일 때만)</p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onDistribute("horizontal")}
              className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs"
            >
              가로 분배
            </button>
            <button
              type="button"
              disabled={!canVerticalAlign}
              onClick={() => onDistribute("vertical")}
              className="flex-1 border border-[var(--color-hairline)] py-1.5 text-xs disabled:opacity-30"
            >
              세로 분배
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 한 페이지(또는 표지 앞면) 안의 텍스트박스들 + "+ 텍스트 추가" 버튼을 함께 그려요.
// renderPage()가 그리는 사진 레이아웃 위에 얹는 투명한 오버레이라서, 어떤 사진 템플릿을
// 쓰든 상관없이 항상 같은 방식으로 붙어요.
function TextBoxLayer({
  boxes,
  onAdd,
  onChange,
  onDelete,
  onStackAction,
  activeBoxId,
  onSelect,
  onShiftSelect,
  multiSelectedBoxIds,
  showAddButton = true,
}: {
  boxes: TextBoxDef[];
  onAdd: () => void;
  onChange: (boxId: string, changes: Partial<TextBoxDef>) => void;
  // 캔버스에 뜨는 "레이어" 작은 툴바(2026-09-25 추가)의 삭제·앞뒤 순서 버튼용이에요.
  // 안 넘기면(옵션) 툴바가 아예 안 떠요(정렬/분배 패널 같은 다중 선택 화면 등).
  onDelete?: (boxId: string) => void;
  onStackAction?: (boxId: string, action: StackOrderAction) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
  // Shift+클릭으로 다중 선택 목록에 넣고 빼는 콜백이에요(정렬/분배 패널용, 2026-09
  // 추가). 안 넘기면(옵션) Shift+클릭도 그냥 일반 선택으로 동작해요.
  onShiftSelect?: (boxId: string) => void;
  // 지금 다중 선택에 들어있는 박스 id들이에요 — 여기 있는 박스는 보라색 테두리로
  // 표시돼요(isActive와는 별개예요). 없으면 아무도 다중 선택 표시 안 함.
  multiSelectedBoxIds?: string[];
  // 내지 스프레드는 왼쪽 아이콘 메뉴("텍스트" 탭)에 이미 글상자 추가 버튼이 있어서, 캔버스
  // 위에 떠 있던 이 검은 버튼은 중복이라 꺼요(2026-09-19, 혜민님 요청). 표지·뒤표지는
  // 아직 그 메뉴가 없어서 그대로 둬요.
  showAddButton?: boolean;
}) {
  return (
    <>
      {boxes.map((box, index) => (
        <TextBoxOverlay
          key={box.id}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          isActive={box.id === activeBoxId}
          isMultiSelected={(multiSelectedBoxIds ?? []).includes(box.id)}
          onSelect={() => onSelect(box.id)}
          onShiftSelect={onShiftSelect ? () => onShiftSelect(box.id) : undefined}
          zIndex={effectiveZOrder("text", box.zOrder, index)}
          onDelete={onDelete ? () => onDelete(box.id) : undefined}
          onStackAction={onStackAction ? (action) => onStackAction(box.id, action) : undefined}
        />
      ))}
      {showAddButton && (
        <button
          type="button"
          onClick={onAdd}
          className="absolute right-1 top-1 z-20 bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
        >
          + 텍스트 추가
        </button>
      )}
    </>
  );
}

function clampPct(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

// 이미지박스 크기를 조절할 때 손잡이가 이 거리(화면 px) 안으로 들어오는 안내선에
// 자동으로 달라붙어요(포토샵·일러스트레이터의 스마트 가이드 스냅과 같은 개념). 확대
// 배율과 무관하게 항상 같은 느낌으로 걸리도록 %가 아니라 px 기준 거리예요.
const IMAGE_BOX_SNAP_THRESHOLD_PX = 6;

// valuePct(0~100, 스프레드 전체 기준)에 가장 가까운 안내선이 SNAP 거리 안에 있으면 그
// 안내선 값으로 딱 맞춰줘요. cellPx는 그 축의 실제 화면 픽셀 크기(가로는 스프레드
// 폭, 세로는 페이지 높이)예요 — 이걸 알아야 "화면 px 몇 개 안"이라는 느낌을 %로 바꿀 수
// 있어요.
function snapToGuides(valuePct: number, guides: number[], cellPx: number): number {
  const thresholdPct = cellPx > 0 ? (IMAGE_BOX_SNAP_THRESHOLD_PX / cellPx) * 100 : 0;
  let best = valuePct;
  let bestDist = thresholdPct;
  for (const g of guides) {
    const dist = Math.abs(valuePct - g);
    if (dist < bestDist) {
      bestDist = dist;
      best = g;
    }
  }
  return best;
}

// 자유 배치 이미지박스 하나예요 — 텍스트박스와 같은 방식으로 끌어서 옮기고, 손잡이로
// 크기를 조절해요. 2026-09-18부터 가로·세로를 각각 따로 조절할 수 있게 됐고(원본 비율에
// 안 묶여요), 박스 안에서 사진 자체의 위치·확대(innerOffsetXPct/innerOffsetYPct/
// innerScale)도 "사진 위치 조정" 모드로 따로 옮길 수 있어요 — 박스(틀)는 항상 사진으로
// 빈틈없이 채워지고(object-fit: cover와 같은 방식), 그 안에서 어느 부분이 보일지만
// 옮기는 거예요. 화면과 인쇄 파일이 같은 계산(computeImageBoxCoverRect,
// lib/imageBoxGeometry.ts)을 공유해서 항상 일치해요.
// xPct·widthPct 등은 "스프레드 전체 폭"을 100%로 보는 좌표라서, 페이지 가운데(경계)를
// 자유롭게 넘나들며 배치할 수 있어요.
// 크기 조절 손잡이는 포토샵·일러스트레이터와 같은 단축키를 지원해요(2026-09-22,
// 혜민님 요청): Shift = 모서리 손잡이에서 정사각형으로, Alt(Option) = 반대쪽 고정이 아니라
// 중심을 고정한 채 양쪽이 같이 늘어남, Shift+Alt = 중심 고정 + 정사각형. 그리고 손잡이가
// 재단선·안전영역·펼침면 중앙(제본/책등 경계)에 가까워지면 자동으로 달라붙어요.
// 왼쪽 "사진" 편집 메뉴에서도 이 박스의 사진 위치 조정(축소/확대/좌우반전/초기화/완료)을
// 그대로 조작할 수 있도록, 부모(ImageBoxLayer → 상위 페이지)가 ref로 직접 호출할 수 있는
// 동작 목록이에요(2026-09-22 추가). 캔버스 안 작은 툴바랑 똑같은 함수를 그대로 호출해서
// 항상 같은 결과가 나와요.
type ImageBoxOverlayHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetPhotoPosition: () => void;
  toggleFlip: () => void;
  exitPhotoEditMode: () => void;
  // 왼쪽 "사진" 편집 메뉴에서도 "스프레드 전체 채우기"를 쓸 수 있도록(2026-09 요청 —
  // 캔버스 위 버튼만으로는 왼쪽 패널에서 찾을 수 없다는 피드백을 받아서 추가).
  fillSpread: () => void;
};

const ImageBoxOverlay = forwardRef<
  ImageBoxOverlayHandle,
  {
    box: ImageBoxDef;
    onChange: (changes: Partial<ImageBoxDef>) => void;
    onDelete: () => void;
    isActive: boolean;
    // 다중 선택(정렬 툴바용, 2026-09-26 추가)에 포함된 박스인지예요 — isActive(단일
    // 선택, 하늘색 테두리)와 구분되는 보라색 테두리로 보여줘요.
    isMultiSelected?: boolean;
    onSelect: () => void;
    // Shift+클릭이면 다중 선택 목록에 넣거나 빼요(정렬 툴바용, 2026-09-26 추가) —
    // TextBoxOverlay의 onShiftSelect와 같은 패턴이에요.
    onShiftSelect?: () => void;
    // Alt(옵션)를 누른 채 드래그를 시작하면 호출돼요(일러스트레이터 Alt-드래그 복사,
    // 2026-09-28 재작업 — 기존 Ctrl/Cmd+Alt+D 단축키가 "적용이 안 된다"는 혜민님
    // 피드백을 받아서, 단축키 대신 드래그 자체로 복사되는 방식으로 바꿨어요). 지금
    // 위치에 그대로 남는 사본을 부모가 새 id로 만들고, 이 박스(같은 id)는 그대로 계속
    // 드래그돼요 — 그래서 "원본은 남고 복사본이 떨어져 나가는" 것처럼 보여요.
    onAltDragDuplicate?: () => void;
    guidesX: number[];
    guidesY: number[];
    // 사진 위치 조정 모드(더블클릭으로 들어가는 모드)에 들어가거나 나올 때마다 부모에게
    // 알려줘요 — 왼쪽 "사진" 메뉴에 조작 버튼을 보여줄지 말지 결정하는 데 씀.
    onPhotoEditModeChange?: (active: boolean) => void;
    // 텍스트박스와 섞어서 매긴 쌓임 순서예요(TextBoxOverlay의 zIndex와 같은 개념,
    // 2026-09-25 "레이어" 기능 추가) — ImageBoxLayer가 effectiveZOrder()로 계산해서
    // 내려줘요.
    zIndex: number;
    onStackAction?: (action: StackOrderAction) => void;
  }
>(function ImageBoxOverlay(
  {
    box,
    onChange,
    onDelete,
    isActive,
    isMultiSelected = false,
    onSelect,
    onShiftSelect,
    onAltDragDuplicate,
    guidesX,
    guidesY,
    onPhotoEditModeChange,
    zIndex,
    onStackAction,
  },
  ref
) {
  // 사진이 아니라 스티커(손글씨스티커 포함)인 박스예요 — crop/offset(사진 위치 조정)
  // 없이 이동+비율유지 크기조절만 가능하게 다르게 다뤄요(2026-09-24, "스티커는
  // 이미지박스(crop) 적용은 안 하는 게 좋겠다"는 요청 반영).
  const isSticker = isStickerImageBox(box);
  // 모서리 둥글기를 %로 계산해요 — 0%는 사각형, 50%는 CSS border-radius:50%와 같은
  // 값이라 정사각형 박스면 정원, 직사각형이면 타원이 자연스럽게 나와요(2026-09-28,
  // "둥글게를 최대치로 하면 원이 되도록").
  const cssRadius = box.borderRadiusPct ? `${box.borderRadiusPct}%` : undefined;
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // 박스 안에서 사진 위치/확대를 조정하는 모드예요. 예전엔 별도 "사진 위치" 버튼을
  // 눌러야 했는데, 2026-09-22부터 포토샵/일러스트레이터처럼 "내용물(사진)을 한 번 더
  // 클릭(더블클릭)하면 들어가는" 방식으로 바꿨어요 — 박스 자체를 조절할 땐 항상 박스
  // 모드, 사진 위치를 만지고 싶을 때만 더블클릭으로 들어가요.
  const [photoEditMode, setPhotoEditMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [boxSizePx, setBoxSizePx] = useState({ w: 1, h: 1 });
  // 박스를 끌 때 스프레드 가로 중앙(책등)·페이지 세로 중앙에 딱 붙는 느낌을 주는 안내선이에요
  // (텍스트박스에 이미 있던 것과 같은 방식, 2026-09-23 이미지박스에도 추가).
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1, axisLockX: false });
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    xPct: 0,
    yPct: 0,
    widthPct: 0,
    heightPct: 0,
    cellW: 1,
    cellH: 1,
    dir: "se" as TextBoxResizeDir,
  });
  const panStart = useRef({ mouseX: 0, mouseY: 0, offsetX: 0, offsetY: 0 });
  // 빈 프레임(url이 없는 이미지박스)을 눌렀을 때 파일 선택창을 열기 위한 숨김 입력이에요
  // (2026-09-23 추가 — "사진이 없어도 레이아웃을 적용하고, 빈 프레임에 나중에 사진을
  // 넣을 수 있어야 한다"는 요청).
  const emptyFrameFileInputRef = useRef<HTMLInputElement>(null);

  function handleFillEmptyFrame(file: File) {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      onChange({
        url,
        naturalWidth: img.naturalWidth || 1,
        naturalHeight: img.naturalHeight || 1,
        innerOffsetXPct: 0,
        innerOffsetYPct: 0,
        innerScale: 1,
      });
    };
    img.src = url;
  }

  // 박스가 실제로 화면에 몇 px로 그려지는지 재요 — 사진이 박스를 항상 꽉 채우도록
  // 계산(computeImageBoxCoverRect)하려면 박스의 실제 픽셀 크기가 필요해요.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) setBoxSizePx({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Esc를 누르면 사진 위치 조정 모드에서 박스 모드로 돌아가요.
  useEffect(() => {
    if (!photoEditMode) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPhotoEditMode(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoEditMode]);

  // 부모(왼쪽 "사진" 편집 메뉴)에게 지금 이 박스가 사진 위치 조정 모드인지 알려줘요.
  useEffect(() => {
    onPhotoEditModeChange?.(photoEditMode);
  }, [photoEditMode, onPhotoEditModeChange]);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Shift+클릭이면 드래그를 시작하지 않고 다중 선택 토글만 해요(2026-09-26 추가,
    // TextBoxOverlay와 같은 방식) — 실수로 박스를 옮기지 않도록 여기서 바로 return해요.
    if (e.shiftKey && onShiftSelect) {
      onShiftSelect();
      return;
    }
    // 다른 박스를 만지다가 이 박스를 "새로" 선택하는 거라면(이전엔 비활성 상태였다면),
    // 예전에 이 박스가 사진 위치 조정 모드였더라도 무시하고 항상 박스 모드로 시작해요 —
    // 그래야 다른 박스를 편집하고 돌아와서 무심코 클릭했을 때 갑자기 사진이 움직이는
    // 일이 없어요(리액트 렌더 중 setState를 피하려고 effect 대신 여기서 직접 처리해요).
    const wasActive = isActive;
    onSelect();
    if (photoEditMode && wasActive) {
      panStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        offsetX: box.innerOffsetXPct ?? 0,
        offsetY: box.innerOffsetYPct ?? 0,
      };
      setIsPanning(true);
      return;
    }
    // 스테일 상태 정리: 이전에 이 박스가 사진 위치 조정 모드였는데 비활성 상태를 거쳐
    // 다시 선택된 거라면, 박스 모드로 확실히 되돌려요.
    if (photoEditMode) setPhotoEditMode(false);
    // Alt-드래그 복사(2026-09-28): 지금 위치에 사본을 하나 남겨두고, 이 박스는 그대로
    // 평소처럼 드래그를 시작해요(onChange가 바뀔 필요 없이 그대로 이 박스 id를
    // 움직이니 훨씬 단순해요) — 결과적으로 원본이 제자리에 남고 든 손 쪽(드래그되는
    // 쪽)이 복사본처럼 떨어져 나가요.
    if (e.altKey && onAltDragDuplicate) {
      onAltDragDuplicate();
    }
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
      // Ctrl+Alt+Shift+드래그(2026-09-30, 혜민님 요청 "복사후 좌우대칭으로만 이동")는
      // 복사(Alt만 있어도 복사되니 위 onAltDragDuplicate가 이미 처리)와 별개로, 드래그가
      // 세로로는 움직이지 않고 가로로만 움직이게 잠가요.
      axisLockX: e.ctrlKey && e.altKey && e.shiftKey,
    };
    setMouseDownActive(true);
  }

  // 사진(또는 스티커)을 더블클릭하면 "박스 조절 모드"에서 "사진 위치 조정 모드"로
  // 들어가요(포토샵에서 스마트오브젝트를 더블클릭해서 들어가는 것과 비슷해요). 다시
  // 더블클릭하거나 Esc를 누르면 박스 모드로 돌아가요.
  function handleDoubleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    // 스티커는 "사진 위치 조정 모드"(잘라내기/이동/확대) 자체가 없어요 — 선택만 하고
    // 끝나요(이동은 일반 드래그로, 크기는 모서리 손잡이로).
    if (isSticker) return;
    // 빈 프레임(사진 없음)은 옮길 사진 자체가 없어서 "사진 위치 조정 모드"에 들어갈
    // 이유가 없어요 — 대신 파일 선택창을 열어요.
    if (!box.url) {
      emptyFrameFileInputRef.current?.click();
      return;
    }
    setPhotoEditMode((v) => !v);
  }

  useEffect(() => {
    if (!mouseDownActive) return;
    function handleMouseMove(e: MouseEvent) {
      const dxPxRaw = e.clientX - dragStart.current.mouseX;
      const dyPxRaw = e.clientY - dragStart.current.mouseY;
      if (!isDragging) {
        if (Math.hypot(dxPxRaw, dyPxRaw) < TEXT_BOX_DRAG_THRESHOLD_PX) return;
        setIsDragging(true);
      }
      const dxPct = (dxPxRaw / dragStart.current.cellW) * 100;
      const dyPct = dragStart.current.axisLockX ? 0 : (dyPxRaw / dragStart.current.cellH) * 100;
      let nextX = Math.min(100 - 4, Math.max(0, dragStart.current.xPct + dxPct));
      let nextY = Math.min(100 - 4, Math.max(0, dragStart.current.yPct + dyPct));

      // 가운데 정렬 스냅: 박스의 가로 중심이 스프레드 정중앙(책등, 50%)에, 세로 중심이
      // 페이지 세로 정중앙(50%)에 가까워지면 자동으로 딱 맞춰요(텍스트박스와 같은 방식,
      // 2026-09-23 요청). 가로로만 이동하는 잠금(axisLockX) 중에는 세로 스냅은 하지 않아요.
      const cellRect = boxRef.current?.parentElement?.getBoundingClientRect() ?? null;
      const centerXTarget = 50 - box.widthPct / 2;
      const centerYTarget = 50 - box.heightPct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = !dragStart.current.axisLockX && Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;
      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });

      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging, box.widthPct, box.heightPct]);

  // "사진 위치 조정" 모드에서 박스를 끌면 박스(틀)가 아니라 그 안의 사진만 옮겨요 —
  // 사진이 박스를 벗어나 빈 여백이 생기지 않도록 매번 clampImageBoxInnerOffset으로
  // 범위를 잘라요.
  useEffect(() => {
    if (!isPanning) return;
    function handleMouseMove(e: MouseEvent) {
      const rect = computeImageBoxCoverRect(
        boxSizePx.w,
        boxSizePx.h,
        box.naturalWidth,
        box.naturalHeight,
        0,
        0,
        box.innerScale ?? 1
      );
      const dxPct = ((e.clientX - panStart.current.mouseX) / boxSizePx.w) * 100;
      const dyPct = ((e.clientY - panStart.current.mouseY) / boxSizePx.h) * 100;
      const nextOffsetX = clampImageBoxInnerOffset(panStart.current.offsetX + dxPct, boxSizePx.w, rect.width);
      const nextOffsetY = clampImageBoxInnerOffset(panStart.current.offsetY + dyPct, boxSizePx.h, rect.height);
      onChange({ innerOffsetXPct: nextOffsetX, innerOffsetYPct: nextOffsetY });
    }
    function handleMouseUp() {
      setIsPanning(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning, boxSizePx, box.naturalWidth, box.naturalHeight, box.innerScale]);

  // 모서리 4개(가로·세로 동시) + 변 4개(한쪽만), 텍스트박스와 똑같은 8방향 손잡이예요
  // ("포토샵처럼 박스 조절이 가능해야 한다"는 요청, 2026-09-22). 왼쪽/위쪽 손잡이는
  // 반대쪽 끝이 고정된 채 위치(xPct/yPct)와 크기가 함께 바뀌어요. 박스 크기를 조절하면
  // 사진은 항상 "박스를 꽉 채우는(cover)" 기준을 유지한 채(빈 여백이 생기지 않아요)
  // 확대/위치(innerScale·innerOffset)를 그대로 적용한 결과가 다시 계산돼요 — 그래서
  // 박스만 조절해도 늘 비율이 맞고 안 비는 틀이 생기지 않아요.
  function handleResizeStart(dir: TextBoxResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      widthPct: box.widthPct,
      heightPct: box.heightPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
      dir,
    };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const s = resizeStart.current;
      const dxPct = ((e.clientX - s.mouseX) / s.cellW) * 100;
      const dyPct = ((e.clientY - s.mouseY) / s.cellH) * 100;
      const hasE = s.dir.includes("e");
      const hasW = s.dir.includes("w");
      const hasS = s.dir.includes("s");
      const hasN = s.dir.includes("n");
      const isCorner = (hasE || hasW) && (hasN || hasS);

      // "커지는 방향 = 양수"로 통일한 순수 이동량이에요(w/n 손잡이는 부호를 뒤집어요).
      let widthDeltaPct = hasE ? dxPct : hasW ? -dxPct : 0;
      let heightDeltaPct = hasS ? dyPct : hasN ? -dyPct : 0;

      // Shift: 모서리 손잡이에서 정사각형으로 — 가로·세로 칸 크기(cellW/cellH)가 서로
      // 다를 수 있어서 %가 아니라 실제 화면 px 기준으로 맞춰야 진짜 정사각형이 돼요.
      // 두 축 중 더 많이 움직인 쪽을 기준으로 나머지 축을 맞춰요.
      //
      // 스티커(isSticker)는 Shift를 안 눌러도 "항상" 비율을 지켜요 — 다만 정사각형이
      // 아니라 스티커 원본 비율(naturalWidth/naturalHeight)로요(2026-09-24, "스티커는
      // 크기조절만, 잘리지 않게"). 가로 이동량을 기준으로 세로를 원본 비율에 맞게
      // 다시 계산해요(모서리 손잡이에서만 — 변 손잡이는 애초에 렌더링에서 제외해요).
      if (isSticker && isCorner) {
        const naturalRatio =
          box.naturalWidth > 0 && box.naturalHeight > 0 ? box.naturalWidth / box.naturalHeight : s.widthPct / (s.heightPct || 1);
        const currentWidthPx = (s.widthPct / 100) * s.cellW;
        const widthDeltaPx = (widthDeltaPct / 100) * s.cellW;
        const nextWidthPx = Math.max(1, currentWidthPx + widthDeltaPx);
        const nextHeightPx = nextWidthPx / naturalRatio;
        const currentHeightPx = (s.heightPct / 100) * s.cellH;
        widthDeltaPct = ((nextWidthPx - currentWidthPx) / s.cellW) * 100;
        heightDeltaPct = ((nextHeightPx - currentHeightPx) / s.cellH) * 100;
      } else if (e.shiftKey && isCorner) {
        const widthDeltaPx = (widthDeltaPct / 100) * s.cellW;
        const heightDeltaPx = (heightDeltaPct / 100) * s.cellH;
        const magnitudePx = Math.max(Math.abs(widthDeltaPx), Math.abs(heightDeltaPx));
        const signedWidthPx = (widthDeltaPx < 0 ? -1 : 1) * magnitudePx;
        const signedHeightPx = (heightDeltaPx < 0 ? -1 : 1) * magnitudePx;
        widthDeltaPct = (signedWidthPx / s.cellW) * 100;
        heightDeltaPct = (signedHeightPx / s.cellH) * 100;
      }

      let widthPct = s.widthPct;
      let heightPct = s.heightPct;
      let xPct = s.xPct;
      let yPct = s.yPct;

      if (e.altKey) {
        // Alt(Option): 반대쪽 손잡이가 고정되는 게 아니라, 박스 중심을 고정한 채 양쪽이
        // 같이 늘어나요(포토샵의 Alt 드래그와 동일). 중심이 스프레드 밖으로 나가지 않게,
        // 중심에서 양쪽 끝(0%/100%)까지 중 더 좁은 쪽을 기준으로 최대 크기를 잡아요 —
        // 그래야 늘어난 박스가 스프레드 밖으로 삐져나가지 않아요.
        if (hasE || hasW) {
          const centerX = s.xPct + s.widthPct / 2;
          const maxWidth = Math.max(6, 2 * Math.min(centerX, 100 - centerX));
          widthPct = clampPct(6, maxWidth, s.widthPct + 2 * widthDeltaPct);
          xPct = centerX - widthPct / 2;
        }
        if (hasS || hasN) {
          const centerY = s.yPct + s.heightPct / 2;
          const maxHeight = Math.max(4, 2 * Math.min(centerY, 100 - centerY));
          heightPct = clampPct(4, maxHeight, s.heightPct + 2 * heightDeltaPct);
          yPct = centerY - heightPct / 2;
        }
      } else {
        // 고정된 반대쪽 끝(반대쪽 손잡이)을 기준으로 최대 크기를 잡아서, 박스가 스프레드
        // 가장자리(0%/100%)에 정확히 딱 맞을 수 있게 해요(예전엔 96%까지만 늘어나서
        // 스프레드 전체를 꽉 채울 수 없었던 문제를 고침, 2026-09 요청).
        if (hasE) {
          widthPct = clampPct(6, Math.max(6, 100 - s.xPct), s.widthPct + widthDeltaPct);
        } else if (hasW) {
          const rightEdge = s.xPct + s.widthPct;
          widthPct = clampPct(6, Math.max(6, rightEdge), s.widthPct + widthDeltaPct);
          xPct = rightEdge - widthPct;
        }
        if (hasS) {
          heightPct = clampPct(4, Math.max(4, 100 - s.yPct), s.heightPct + heightDeltaPct);
        } else if (hasN) {
          const bottomEdge = s.yPct + s.heightPct;
          heightPct = clampPct(4, Math.max(4, bottomEdge), s.heightPct + heightDeltaPct);
          yPct = bottomEdge - heightPct;
        }
      }

      // 재단선·안전영역·펼침면 중앙(책등/제본 경계) 같은 안내선에 가까우면 그 손잡이가
      // 움직이는 쪽 변(왼쪽/오른쪽/위/아래)만 딱 맞춰요 — 고정된 반대쪽 변은 건드리지 않아요.
      if (hasE) {
        const snappedRight = snapToGuides(xPct + widthPct, guidesX, s.cellW);
        widthPct = Math.max(6, snappedRight - xPct);
      } else if (hasW) {
        const snappedLeft = snapToGuides(xPct, guidesX, s.cellW);
        widthPct = Math.max(6, xPct + widthPct - snappedLeft);
        xPct = snappedLeft;
      }
      if (hasS) {
        const snappedBottom = snapToGuides(yPct + heightPct, guidesY, s.cellH);
        heightPct = Math.max(4, snappedBottom - yPct);
      } else if (hasN) {
        const snappedTop = snapToGuides(yPct, guidesY, s.cellH);
        heightPct = Math.max(4, yPct + heightPct - snappedTop);
        yPct = snappedTop;
      }

      // 마지막 안전장치: 어떤 경로로 계산되든 박스가 스프레드(0~100%) 밖으로 나가지
      // 않도록 한 번 더 확실히 막아요.
      const safeXPct = Math.min(Math.max(0, xPct), 100 - widthPct);
      const safeYPct = Math.min(Math.max(0, yPct), 100 - heightPct);
      onChange({ widthPct, heightPct, xPct: safeXPct, yPct: safeYPct });
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, guidesX, guidesY]);

  function handleZoom(delta: number) {
    const nextScale = Math.min(3, Math.max(1, (box.innerScale ?? 1) + delta));
    const rect = computeImageBoxCoverRect(boxSizePx.w, boxSizePx.h, box.naturalWidth, box.naturalHeight, 0, 0, nextScale);
    const nextOffsetX = clampImageBoxInnerOffset(box.innerOffsetXPct ?? 0, boxSizePx.w, rect.width);
    const nextOffsetY = clampImageBoxInnerOffset(box.innerOffsetYPct ?? 0, boxSizePx.h, rect.height);
    onChange({ innerScale: nextScale, innerOffsetXPct: nextOffsetX, innerOffsetYPct: nextOffsetY });
  }

  function handleResetPhotoPosition() {
    onChange({ innerOffsetXPct: 0, innerOffsetYPct: 0, innerScale: 1 });
  }

  // 스티커는 사진처럼 안(crop) 확대가 아니라 박스(틀) 자체를 원본 비율 그대로 키우고
  // 줄여요(모서리 손잡이로 조절하는 것과 같은 결과 — 2026-09-26 "편집툴 확대/축소"
  // 요청을 스티커에도 적용하면서, 스티커는 사진과 다른 방식이 필요해서 따로 만들었어요).
  // 가운데를 기준으로 커지고 작아지게 xPct/yPct도 같이 옮겨요.
  function handleStickerScale(factor: number) {
    const nextWidthPct = Math.max(3, Math.min(90, box.widthPct * factor));
    const nextHeightPct = Math.max(3, Math.min(90, box.heightPct * factor));
    const centerX = box.xPct + box.widthPct / 2;
    const centerY = box.yPct + box.heightPct / 2;
    onChange({
      widthPct: nextWidthPct,
      heightPct: nextHeightPct,
      xPct: centerX - nextWidthPct / 2,
      yPct: centerY - nextHeightPct / 2,
    });
  }

  // 회전(2026-09-26 "편집툴에 회전 버튼 추가" 요청) — 누를 때마다 시계방향 90도씩
  // 돌아가요(예전 표지 사진의 회전 버튼과 같은 방식). 지금은 화면 미리보기에서만
  // 돌아가 보여요 — 인쇄 파일 반영은 ImageBoxDef.rotation 주석 참고(다음 라운드).
  function handleRotate() {
    onChange({ rotation: ((box.rotation ?? 0) + 90) % 360 });
  }

  // 박스를 스프레드(펼침면) 전체에 한 번에 꽉 채워요 — 사진 한 장으로 양쪽 페이지를
  // 가득 채우고 싶을 때 매번 손잡이로 정확히 맞추지 않아도 되게(2026-09 요청).
  function handleFillSpread() {
    onChange({ xPct: 0, yPct: 0, widthPct: 100, heightPct: 100 });
  }

  // 왼쪽 "사진" 편집 메뉴의 버튼들이 캔버스 안 작은 툴바와 똑같은 동작을 하도록 노출해요.
  useImperativeHandle(ref, () => ({
    zoomIn: () => handleZoom(0.1),
    zoomOut: () => handleZoom(-0.1),
    resetPhotoPosition: handleResetPhotoPosition,
    toggleFlip: () => onChange({ flipX: !box.flipX }),
    exitPhotoEditMode: () => setPhotoEditMode(false),
    fillSpread: handleFillSpread,
  }));

  const coverRect = computeImageBoxCoverRect(
    boxSizePx.w,
    boxSizePx.h,
    box.naturalWidth,
    box.naturalHeight,
    box.innerOffsetXPct ?? 0,
    box.innerOffsetYPct ?? 0,
    box.innerScale ?? 1
  );

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      // 2026-09-28, 혜민님 요청(스위트북 비교, "점선이 위로 보여야"): 예전엔 일반
      // border라 박스 테두리 선 자체(사진 안쪽 가장자리)에 그려져서 사진에 가려진
      // 것처럼 보일 수 있었어요 — 글상자와 같은 outline+offset+점선 방식으로 바꿔서
      // 사진 바깥으로 확실히 떠 보이게 했어요(사진 위치 조정 모드는 보라색 실선 그대로,
      // 그 모드는 "선택"이 아니라 "지금 사진 안쪽을 만지는 중"이라는 다른 의미라서
      // 점선으로 안 바꿨어요).
      // 2026-09-28(2차) 혜민님 재지적("이미지박스 바깥으로 점선이 보이는 이상한 현상"):
      // outline-offset(4px)을 줬더니 점선이 사진 가장자리에서 붕 떠 보여서 오히려
      // 버그처럼 보였음 — 스위트북 참고 스크린샷을 보면 점선이 사진 가장자리에
      // 딱 붙어 있고(오프셋 없음), 손잡이만 그 위에 살짝 걸쳐 있음. 텍스트박스는
      // 자기 테두리가 원래 안 보여서 밖으로 떼어내는 게 의미가 있었지만, 사진은
      // 사진 자체가 뚜렷한 가장자리라 그대로 붙여야 함 — outline 대신 다시 박스
      // 자신의 border로 되돌리되 점선(border-dashed)으로.
      // 2026-09-30, 혜민님 재지적: "도련선에 점선과 이미지 사이에 하얀 공백이 보입니다"
      // — 원인을 찾아보니 위에서 쓰던 border(2px)가 box-sizing: border-box라 실제 사진을
      // 채우는 안쪽 div(absolute inset-0)를 그만큼 안으로 밀어넣어서, 투명한
      // border-transparent 영역이 사진과 점선 사이에 흰 배경이 비치는 좁은 틈으로
      // 보였던 거예요. 글상자(TextBoxOverlay)에서 이미 border 대신 outline으로 바꿔서
      // 같은 문제를 해결해둔 방식을 사진박스에도 그대로 적용해요 — outline은 박스
      // 모델(레이아웃 크기)에 전혀 영향을 안 줘서 사진이 박스를 항상 끝까지 꽉
      // 채우고, 점선은 그 위에 딱 겹쳐서(offset 0) 그려져요.
      // 2026-10-01, 혜민님 요청: "점선말고 얇은 실선으로 처리해주세요"
      className={`absolute outline outline-1 outline-offset-0 transition ${
        isActive && photoEditMode ? "cursor-grab" : "cursor-move"
      } ${
        isActive && photoEditMode
          ? "outline-[var(--color-brand-purple)]"
          : isActive
            ? "outline-[var(--color-sky)]"
            : isMultiSelected
              ? "outline-[var(--color-brand-purple)]"
              : "outline-transparent hover:outline-[var(--color-sky)]/40"
      }`}
      style={{
        zIndex,
        left: `${box.xPct}%`,
        top: `${box.yPct}%`,
        width: `${box.widthPct}%`,
        height: `${box.heightPct}%`,
        // 회전·투명도·테두리(2026-09-26 "편집툴" 확장 요청으로 추가) — 회전은 화면
        // 미리보기 전용이에요(ImageBoxDef.rotation 주석 참고). 테두리는 기존 선택
        // 표시용 className의 border(선택 시 하늘색/보라색 테두리)와 겹치지 않도록
        // border 대신 안쪽 box-shadow로 그려요.
        transform: box.rotation ? `rotate(${box.rotation}deg)` : undefined,
        opacity: box.opacity ?? 1,
        borderRadius: cssRadius,
      }}
    >
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      {box.url ? (
        isSticker ? (
          // 스티커는 사진처럼 박스를 "꽉 채우도록 잘라내는(cover)" 계산을 아예 안 써요
          // — 박스 크기 자체를 이동+모서리 손잡이로 항상 원본 비율대로만 조절하니까,
          // object-fit: contain으로 그리면 어떤 경우에도(옛 데이터로 비율이 살짝
          // 어긋나 있어도) 스티커가 잘리지 않고 항상 통째로 보여요(2026-09-24,
          // "잘리는 부분이 생기지 않도록 이미지박스 적용은 안 하는 게 좋겠다" 요청).
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ borderRadius: cssRadius }}
          >
            <img
              src={box.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              style={{ transform: box.flipX ? "scaleX(-1)" : undefined }}
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ borderRadius: cssRadius }}
          >
            <img
              src={box.url}
              alt=""
              draggable={false}
              // max-w-none/max-h-none: Tailwind 기본 스타일(img { max-width: 100% })이
              // 없으면, 사진이 박스보다 크게(cover 계산 결과) 커져야 할 때도 브라우저가
              // 폭을 박스 크기로 강제로 줄여버려서(높이는 style로 고정) 사진이 박스를
              // 다 못 채우고 한쪽에 빈 공간이 생겨요 — 특히 책등 쪽에서 보였던 문제의
              // 진짜 원인이에요(2026-09).
              className="pointer-events-none absolute max-w-none max-h-none select-none"
              style={{
                left: coverRect.x,
                top: coverRect.y,
                width: coverRect.width,
                height: coverRect.height,
                transform: box.flipX ? "scaleX(-1)" : undefined,
              }}
            />
          </div>
        )
      ) : null}
      {box.url && box.borderWidthPx ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: cssRadius,
            boxShadow: `inset 0 0 0 ${box.borderWidthPx}px ${box.borderColor ?? "#ffffff"}`,
          }}
        />
      ) : null}
      {!box.url && (
        // 빈 프레임(레이아웃은 적용됐지만 아직 사진이 없는 칸)이에요 — 누르면(또는
        // 더블클릭하면) 파일을 골라 채울 수 있어요. 미리보기·PDF에는 안 그려져요.
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
            emptyFrameFileInputRef.current?.click();
          }}
          // 2026-09-23, 혜민님 요청: 빈 프레임이 "점선 + 사진 추가"보다 눈에 띄도록
          // 브랜드색(--color-sky) 옅은 배경 + 가운데 큰 "PHOTO" 표시로 바꿨어요.
          // url이 여전히 빈 문자열이라 인쇄(printCompose.ts drawPage)에는 그대로
          // 안 그려져요 — 화면 스타일만 바뀐 거예요.
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden border border-dashed border-[var(--color-sky)]/40 bg-[var(--color-sky)]/10 text-[var(--color-sky)] transition hover:border-[var(--color-sky)] hover:bg-[var(--color-sky)]/15"
        >
          {/* 2026-09-24, 혜민님 요청: "+ 사진 추가" 보조문구는 불필요해서 뺐어요 —
              "PHOTO" 글자 하나만 남기고, 클릭하면 파일 선택창이 바로 열리는 동작은
              그대로예요. */}
          <span className="text-[13px] font-semibold tracking-[0.15em]">PHOTO</span>
        </button>
      )}
      <input
        ref={emptyFrameFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFillEmptyFrame(file);
          e.target.value = "";
        }}
      />
      {isActive && !photoEditMode && (
        <>
          {/* 2026-10-01, 혜민님 요청: "이미지나 스티커박스 오른쪽 상단에 빨간 네모
              없애주세요" — 이 자리에 있던 빨간 삭제(✕) 버튼을 제거함. 삭제 기능은
              아래 StackOrderToolbar(레이어 툴바)에 이미 같은 기능의 삭제 버튼이 있어서
              중복이었음. */}
          {/* 스티커는 모서리(대각선) 손잡이만 보여줘요 — 위/아래/좌/우 변 손잡이는
              한쪽 축만 늘려서 비율이 깨지는 조작이라, 애초에 크기조절을 "비율유지"로만
              허용하는 스티커에는 의미가 없어서 렌더링 자체를 제외해요(2026-09-24). */}
          {TEXT_BOX_RESIZE_HANDLES.filter((h) => !isSticker || h.dir.length === 2).map(({ dir, className, cursor, title }) => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              title={title}
              className={`absolute z-40 h-3.5 w-3.5 -sm border border-white bg-[var(--color-sky)] ${cursor} ${className}`}
            />
          ))}
          {/* 더블클릭 안내는 사진 전용 기능(사진 위치 조정)이라 스티커에는 안 보여줘요
              (2026-09-24). "스프레드 전체 채우기" 버튼은 혜민님 요청으로 제거함
              (2026-09-24, "필요 없습니다. 삭제해주세요"). */}
          {!isSticker && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute -bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap"
            >
              <span className=" bg-[var(--color-charcoal)]/80 px-2 py-0.5 text-[10px] text-white">
                더블클릭하면 안의 사진 위치를 옮길 수 있어요
              </span>
              {box.url && (
                <button
                  type="button"
                  title="이미지 교체하기"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    emptyFrameFileInputRef.current?.click();
                  }}
                  className="flex h-5 w-5 items-center justify-center border border-white bg-[var(--color-charcoal)]/80 text-white"
                >
                  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 8a6 6 0 0 1 10.2-4.3M14 8a6 6 0 0 1-10.2 4.3" />
                    <path d="M12 1v3h-3M4 15v-3h3" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </>
      )}
      {isActive && photoEditMode && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -bottom-9 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 border border-[var(--color-hairline)] bg-white px-1.5 py-1 "
        >
          <span className="px-1 text-[10px] font-medium text-[var(--color-brand-purple)]">사진 위치 조정 중</span>
          <button
            type="button"
            title="축소"
            onClick={() => handleZoom(-0.1)}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
          >
            <LayerIcon name="zoomOut" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="확대"
            onClick={() => handleZoom(0.1)}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
          >
            <LayerIcon name="zoomIn" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="좌우 반전"
            onClick={() => onChange({ flipX: !box.flipX })}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
          >
            <LayerIcon name="flip" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="사진 위치 초기화"
            onClick={handleResetPhotoPosition}
            className="flex h-6 w-6 items-center justify-center bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
          >
            <LayerIcon name="fit" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="박스 조절 모드로 돌아가기(완료)"
            onClick={() => setPhotoEditMode(false)}
            className="ml-0.5 flex h-6 w-6 items-center justify-center bg-[var(--color-charcoal)] text-white"
          >
            <LayerIcon name="check" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* 더블클릭으로 "사진 위치 조정 중" 모드에 들어가면 바로 아래에 확대/축소·반전·
          초기화·완료 전용 바가 따로 떠요(이 아래) — 이 레이어 툴바에도 같은 기능(맞춤·
          확대·축소·반전)이 들어있어서, 둘 다 띄우면 서로 겹쳐 보였어요("사진 한번더
          클릭하면 패널이 겹치는 현상", 2026-09-27). 사진 위치 조정 중엔 이 레이어
          툴바를 잠깐 숨기고, 전용 바 하나만 보여줘요 — 삭제·앞뒤 순서 등은 "완료"로
          조정 모드를 마친 뒤에 다시 쓸 수 있어요. */}
      {isActive && !photoEditMode && (onDelete || onStackAction) && (
        <StackOrderToolbar
          // 텍스트박스와 같은 규칙 — 박스 아래쪽이 페이지 밑바닥에 가까우면 위쪽에
          // 띄워요.
          flip={box.yPct + box.heightPct > 80}
          fillsFrame={box.yPct <= 2 && box.yPct + box.heightPct >= 98}
          mediaKind={isSticker ? "sticker" : "photo"}
          onDelete={onDelete}
          onStackAction={onStackAction}
          // "맞춤"(사진 위치 초기화)·"편집"(사진 위치 조정 모드 토글)은 크롭 개념이 없는
          // 스티커에는 안 보여요(mediaKind==="sticker"면 StackOrderToolbar가 알아서
          // 뺌) — 그래서 스티커일 땐 undefined를 넘겨도 안전해요.
          onFit={isSticker ? undefined : handleResetPhotoPosition}
          onZoomIn={() => (isSticker ? handleStickerScale(1.1) : handleZoom(0.1))}
          onZoomOut={() => (isSticker ? handleStickerScale(0.9) : handleZoom(-0.1))}
          onRotate={handleRotate}
          rotation={box.rotation ?? 0}
          onRotationChange={(deg) => onChange({ rotation: deg })}
          onFlip={() => onChange({ flipX: !box.flipX })}
          editActive={photoEditMode}
          onToggleEdit={isSticker ? undefined : () => setPhotoEditMode((v) => !v)}
          opacity={box.opacity ?? 1}
          onOpacityChange={(v) => onChange({ opacity: v })}
          borderWidthPx={box.borderWidthPx ?? 0}
          borderColor={box.borderColor ?? "#ffffff"}
          borderRadiusPct={box.borderRadiusPct ?? 0}
          onBorderChange={(widthPx, color, radiusPct) =>
            onChange({ borderWidthPx: widthPx, borderColor: color, borderRadiusPct: radiusPct })
          }
        />
      )}
    </div>
  );
});

// 한 스프레드(펼침면) 전체의 이미지박스들 + "+ 사진 추가" 버튼을 함께 그려요. 텍스트박스와
// 달리 왼쪽/오른쪽 낱장이 아니라 스프레드 전체 컨테이너 위에 얹어서, 박스가 페이지 경계를
// 자유롭게 넘나들 수 있게 해요.
function ImageBoxLayer({
  boxes,
  onChange,
  onDelete,
  onStackAction,
  activeBoxId,
  onSelect,
  onShiftSelect,
  onAltDuplicate,
  multiSelectedBoxIds,
  guidesX,
  guidesY,
  onPhotoEditModeChange,
  registerBoxRef,
}: {
  boxes: ImageBoxDef[];
  onChange: (boxId: string, changes: Partial<ImageBoxDef>) => void;
  onDelete: (boxId: string) => void;
  // 캔버스에 뜨는 "레이어" 작은 툴바(2026-09-25 추가)의 앞뒤 순서 버튼용이에요. 안
  // 넘기면(옵션) 그 4개 버튼은 안 떠요(삭제 버튼은 onDelete만 있어도 떠요).
  onStackAction?: (boxId: string, action: StackOrderAction) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
  // Shift+클릭 다중 선택(정렬 툴바용, 2026-09-26 추가) — TextBoxLayer와 같은 패턴이에요.
  onShiftSelect?: (boxId: string) => void;
  // Alt-드래그 복사(2026-09-28) — 드래그가 시작된 박스의 "드래그 시작 시점" 데이터를
  // 그대로 넘겨줘서, 상위가 그 내용 그대로 새 id로 복사본을 만들어 제자리에 남겨요.
  onAltDuplicate?: (box: ImageBoxDef) => void;
  // 지금 다중 선택에 들어있는 박스 id들이에요 — 여기 있는 박스는 보라색 테두리로 보여요.
  multiSelectedBoxIds?: string[];
  // 크기 조절 손잡이가 달라붙을 안내선 위치예요(스프레드 전체를 0~100으로 보는 %,
  // 재단선·안전영역·펼침면 중앙 등) — 상위 컴포넌트가 계산해서 내려줘요.
  guidesX: number[];
  guidesY: number[];
  // 박스가 사진 위치 조정 모드로 들어가거나 나올 때 상위에 알려줘요(왼쪽 "사진" 메뉴에
  // 조작 버튼을 보여줄지 결정하는 데 씀, 2026-09-22 추가).
  onPhotoEditModeChange?: (active: boolean) => void;
  // 상위가 각 박스의 사진 위치 조정 동작(확대/축소/반전/초기화/완료)을 ref로 직접 호출할
  // 수 있도록 박스 id별 핸들을 등록해요.
  registerBoxRef?: (boxId: string, handle: ImageBoxOverlayHandle | null) => void;
}) {
  // 사진 추가·스티커 추가 버튼은 2026-09-19부터 캔버스 위 숨은 버튼이 아니라 왼쪽
  // 아이콘 메뉴("사진"/"스티커" 탭)로 옮겨졌어요 — 이 레이어는 이제 박스 렌더링만 해요.
  return (
    <>
      {boxes.map((box, index) => (
        <ImageBoxOverlay
          key={box.id}
          ref={(instance) => registerBoxRef?.(box.id, instance)}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          onDelete={() => onDelete(box.id)}
          isActive={box.id === activeBoxId}
          isMultiSelected={(multiSelectedBoxIds ?? []).includes(box.id)}
          onSelect={() => onSelect(box.id)}
          onShiftSelect={onShiftSelect ? () => onShiftSelect(box.id) : undefined}
          onAltDragDuplicate={onAltDuplicate ? () => onAltDuplicate(box) : undefined}
          onPhotoEditModeChange={box.id === activeBoxId ? onPhotoEditModeChange : undefined}
          guidesX={guidesX}
          guidesY={guidesY}
          zIndex={effectiveZOrder("image", box.zOrder, index)}
          onStackAction={onStackAction ? (action) => onStackAction(box.id, action) : undefined}
        />
      ))}
    </>
  );
}

// 표(테이블) 박스 하나를 그려요 — TextBoxOverlay·ImageBoxOverlay와 같은 드래그/크기조절
// 패턴이에요(스프레드 전체를 100%로 보는 좌표, 이미지박스와 같은 좌표계). "기본형"
// 범위라 셀 병합·셀별 스타일은 없고, 행×열 격자 + 셀 클릭 후 바로 타이핑해서 채우는
// 것만 지원해요. 드래그는 격자선(칸과 칸 사이 여백)이나 박스 테두리 근처를 잡아서
// 옮기고, 칸 안(textarea)을 클릭하면 커서가 그 자리에 놓여요 — TextBoxOverlay와 똑같이
// "먼저 stopPropagation만 하고 preventDefault는 안 해서" 클릭은 그대로 포커스로
// 이어지고, 실제로 마우스를 끌 때만(문턱값 초과) 박스가 움직이게 나눴어요.
function TableBoxOverlay({
  box,
  onChange,
  onDelete,
  isActive,
  onSelect,
  zIndex,
}: {
  box: TableBoxDef;
  onChange: (changes: Partial<TableBoxDef>) => void;
  onDelete: () => void;
  isActive: boolean;
  onSelect: () => void;
  zIndex: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [mouseDownActive, setMouseDownActive] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });
  const resizeStart = useRef({
    mouseX: 0,
    mouseY: 0,
    xPct: 0,
    yPct: 0,
    widthPct: 0,
    heightPct: 0,
    cellW: 1,
    cellH: 1,
    dir: "se" as TextBoxResizeDir,
  });

  function handleMouseDown(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
    setMouseDownActive(true);
  }

  function handleResizeStart(dir: TextBoxResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct: box.xPct,
      yPct: box.yPct,
      widthPct: box.widthPct,
      heightPct: box.heightPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
      dir,
    };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!mouseDownActive) return;
    function handleMouseMove(e: MouseEvent) {
      const dxPxRaw = e.clientX - dragStart.current.mouseX;
      const dyPxRaw = e.clientY - dragStart.current.mouseY;
      if (!isDragging) {
        if (Math.hypot(dxPxRaw, dyPxRaw) < TEXT_BOX_DRAG_THRESHOLD_PX) return;
        setIsDragging(true);
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      e.preventDefault();
      const dxPct = (dxPxRaw / dragStart.current.cellW) * 100;
      const dyPct = (dyPxRaw / dragStart.current.cellH) * 100;
      const nextX = clampPct(0, 100 - box.widthPct, dragStart.current.xPct + dxPct);
      const nextY = clampPct(0, 100 - box.heightPct, dragStart.current.yPct + dyPct);
      onChange({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setMouseDownActive(false);
      setIsDragging(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseDownActive, isDragging, box.widthPct, box.heightPct]);

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const s = resizeStart.current;
      const dxPct = ((e.clientX - s.mouseX) / s.cellW) * 100;
      const dyPct = ((e.clientY - s.mouseY) / s.cellH) * 100;
      const hasE = s.dir.includes("e");
      const hasW = s.dir.includes("w");
      const hasS = s.dir.includes("s");
      const hasN = s.dir.includes("n");
      let widthPct = s.widthPct;
      let heightPct = s.heightPct;
      let xPct = s.xPct;
      let yPct = s.yPct;
      if (hasE) {
        widthPct = clampPct(10, Math.max(10, 100 - s.xPct), s.widthPct + dxPct);
      } else if (hasW) {
        const rightEdge = s.xPct + s.widthPct;
        widthPct = clampPct(10, Math.max(10, rightEdge), s.widthPct - dxPct);
        xPct = rightEdge - widthPct;
      }
      if (hasS) {
        heightPct = clampPct(8, Math.max(8, 100 - s.yPct), s.heightPct + dyPct);
      } else if (hasN) {
        const bottomEdge = s.yPct + s.heightPct;
        heightPct = clampPct(8, Math.max(8, bottomEdge), s.heightPct - dyPct);
        yPct = bottomEdge - heightPct;
      }
      onChange({ widthPct, heightPct, xPct, yPct });
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  function handleCellChange(row: number, col: number, value: string) {
    const next = box.cells.slice();
    next[row * box.cols + col] = value;
    onChange({ cells: next });
  }

  return (
    <div
      ref={boxRef}
      onMouseDown={handleMouseDown}
      className={`absolute cursor-move outline outline-1 outline-offset-[6px] transition ${
        isActive ? "outline-[var(--color-sky)]" : "outline-transparent hover:outline-[var(--color-sky)]/40"
      }`}
      style={{
        zIndex,
        left: `${box.xPct}%`,
        top: `${box.yPct}%`,
        width: `${box.widthPct}%`,
        height: `${box.heightPct}%`,
        display: "grid",
        gridTemplateColumns: `repeat(${box.cols}, 1fr)`,
        gridTemplateRows: `repeat(${box.rows}, 1fr)`,
        backgroundColor: "#ffffff",
      }}
    >
      {Array.from({ length: box.rows * box.cols }).map((_, idx) => {
        const row = Math.floor(idx / box.cols);
        const col = idx % box.cols;
        return (
          <textarea
            key={idx}
            value={box.cells[idx] ?? ""}
            onChange={(e) => handleCellChange(row, col, e.target.value)}
            placeholder=""
            style={{
              fontSize: `${0.78 * (box.fontScale ?? 1)}rem`,
              borderColor: box.borderColor ?? "#94A3B8",
            }}
            className="relative h-full w-full resize-none border bg-transparent p-1 text-center leading-snug text-[#1F2937] outline-none"
          />
        );
      })}
      {isActive && (
        <>
          {TEXT_BOX_RESIZE_HANDLES.filter((h) => h.dir.length === 2).map(({ dir, className, cursor, title }) => (
            <div
              key={dir}
              onMouseDown={(e) => handleResizeStart(dir, e)}
              title={title}
              className={`absolute z-40 h-3 w-3 -sm border border-white bg-[var(--color-sky)] ${cursor} ${className}`}
            />
          ))}
          {onDelete && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              title="표 삭제"
              className="absolute -right-2 -top-2 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-charcoal)] text-xs text-white shadow"
            >
              ✕
            </button>
          )}
        </>
      )}
    </div>
  );
}

// 한 스프레드(펼침면) 전체의 표박스들을 함께 그려요 — ImageBoxLayer와 같은 방식으로
// 스프레드 전체 컨테이너 위에 얹어서, 박스가 페이지 경계를 자유롭게 넘나들 수 있어요.
function TableBoxLayer({
  boxes,
  onChange,
  onDelete,
  activeBoxId,
  onSelect,
}: {
  boxes: TableBoxDef[];
  onChange: (boxId: string, changes: Partial<TableBoxDef>) => void;
  onDelete: (boxId: string) => void;
  activeBoxId: string | null;
  onSelect: (boxId: string) => void;
}) {
  return (
    <>
      {boxes.map((box, index) => (
        <TableBoxOverlay
          key={box.id}
          box={box}
          onChange={(c) => onChange(box.id, c)}
          onDelete={() => onDelete(box.id)}
          isActive={box.id === activeBoxId}
          onSelect={() => onSelect(box.id)}
          zIndex={9000 + index}
        />
      ))}
    </>
  );
}

// 표지 제목이에요. 예전엔 하단에 고정된 텍스트였는데, 이제 텍스트박스처럼 끌어서 원하는
// 자리로 옮길 수 있어요(가운데로 가져가면 딱 붙는 안내선도 함께 떠요).
function CoverTitleOverlay({
  title,
  xPct,
  yPct,
  widthPct,
  fontSizeCqh,
  lineHeightEm,
  letterSpacingEm,
  fontFamily,
  align,
  onMove,
}: {
  title: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  fontSizeCqh: number; // 실제 pt 크기를 컨테이너 높이 대비 %(cqh)로 환산한 값 — 창 크기와 무관하게 항상 같은 실물 크기로 보여요.
  lineHeightEm: number;
  letterSpacingEm: number;
  fontFamily: string;
  // 2026-10-05, 혜민님 요청: 내지 텍스트박스처럼 문단 정렬(좌/가운데/우)을 고를 수 있게.
  align: "left" | "center" | "right";
  onMove: (changes: { xPct: number; yPct: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [snapGuide, setSnapGuide] = useState<{ v: boolean; h: boolean; rect: DOMRect | null }>({
    v: false,
    h: false,
    rect: null,
  });
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, xPct: 0, yPct: 0, cellW: 1, cellH: 1 });

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    setIsDragging(true);
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      xPct,
      yPct,
      cellW: cellRect?.width || 1,
      cellH: cellRect?.height || 1,
    };
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) {
      const parentEl = boxRef.current?.parentElement ?? null;
      const cellRect = parentEl?.getBoundingClientRect() ?? null;
      const dxPct = ((e.clientX - dragStart.current.mouseX) / dragStart.current.cellW) * 100;
      const dyPct = ((e.clientY - dragStart.current.mouseY) / dragStart.current.cellH) * 100;
      let nextX = Math.min(98, Math.max(0, dragStart.current.xPct + dxPct));
      let nextY = Math.min(98, Math.max(0, dragStart.current.yPct + dyPct));

      const boxRect = boxRef.current?.getBoundingClientRect();
      const boxWpct = boxRect ? (boxRect.width / dragStart.current.cellW) * 100 : widthPct;
      const boxHpct = boxRect ? (boxRect.height / dragStart.current.cellH) * 100 : 0;
      const centerXTarget = 50 - boxWpct / 2;
      const centerYTarget = 50 - boxHpct / 2;
      const snapV = Math.abs(nextX - centerXTarget) < CENTER_SNAP_THRESHOLD_PCT;
      const snapH = Math.abs(nextY - centerYTarget) < CENTER_SNAP_THRESHOLD_PCT;
      if (snapV) nextX = centerXTarget;
      if (snapH) nextY = centerYTarget;

      setSnapGuide({ v: snapV, h: snapH, rect: cellRect });
      onMove({ xPct: nextX, yPct: nextY });
    }
    function handleMouseUp() {
      setIsDragging(false);
      setSnapGuide({ v: false, h: false, rect: null });
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, widthPct]);

  if (!title.trim()) return null;

  return (
    <div
      ref={boxRef}
      className="group/ct absolute z-28"
      style={{ left: `${xPct}%`, top: `${yPct}%`, width: `${widthPct}%` }}
    >
      {snapGuide.rect && (snapGuide.v || snapGuide.h) && (
        <>
          {snapGuide.v && (
            <div
              className="pointer-events-none fixed z-40 w-px bg-[var(--color-sky)]"
              style={{
                left: snapGuide.rect.left + snapGuide.rect.width / 2,
                top: snapGuide.rect.top,
                height: snapGuide.rect.height,
              }}
            />
          )}
          {snapGuide.h && (
            <div
              className="pointer-events-none fixed z-40 h-px bg-[var(--color-sky)]"
              style={{
                top: snapGuide.rect.top + snapGuide.rect.height / 2,
                left: snapGuide.rect.left,
                width: snapGuide.rect.width,
              }}
            />
          )}
        </>
      )}
      <button
        type="button"
        title="끌어서 이동"
        onMouseDown={handleDragStart}
        className="absolute -top-7 left-1/2 flex h-6 w-6 -translate-x-1/2 cursor-grab items-center justify-center bg-black/60 text-[11px] text-white opacity-0 transition active:cursor-grabbing group-hover/ct:opacity-100"
      >
        ⠿
      </button>
      <p
        className="pointer-events-none whitespace-pre-wrap font-semibold text-white drop-"
        style={{
          fontSize: `${fontSizeCqh}cqh`,
          lineHeight: lineHeightEm,
          letterSpacing: `${letterSpacingEm}em`,
          fontFamily,
          textAlign: align,
        }}
      >
        {title}
      </p>
    </div>
  );
}

// 책등 텍스트박스예요. 책등 폭 자체가 아주 좁아서 가로로 조절할 일이 없어요 — 항상 책등
// 패널 폭 전체(왼쪽 0%~오른쪽 100%)를 그대로 쓰고, 세로 위치·높이만 끌어서 바꿔요.
// 일러스트레이터 텍스트박스 도구처럼 파란 테두리 박스로 보이고, 아래쪽 손잡이로 세로
// 크기를 조절해요.
function SpineTitleOverlay({
  title,
  emptyLabel,
  yPct,
  heightPct,
  fontSizeCqh,
  fontFamily,
  onMove,
  onResize,
}: {
  title: string;
  emptyLabel: string;
  yPct: number;
  heightPct: number;
  fontSizeCqh: number; // 실제 mm 크기를 컨테이너 높이 대비 %(cqh)로 환산한 값 — 창 크기와 무관하게 항상 같은 실물 비율로 보여요.
  fontFamily: string;
  onMove: (yPct: number) => void;
  onResize: (heightPct: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseY: 0, yPct: 0, cellH: 1 });
  const resizeStart = useRef({ mouseY: 0, heightPct: 0, cellH: 1 });

  function handleDragStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    dragStart.current = { mouseY: e.clientY, yPct, cellH: cellRect?.height || 1 };
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) {
      const dyPct = ((e.clientY - dragStart.current.mouseY) / dragStart.current.cellH) * 100;
      const nextY = Math.min(90, Math.max(0, dragStart.current.yPct + dyPct));
      onMove(nextY);
    }
    function handleMouseUp() {
      setIsDragging(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const cellRect = boxRef.current?.parentElement?.getBoundingClientRect();
    resizeStart.current = { mouseY: e.clientY, heightPct, cellH: cellRect?.height || 1 };
    setIsResizing(true);
  }

  useEffect(() => {
    if (!isResizing) return;
    function handleMouseMove(e: MouseEvent) {
      const dyPct = ((e.clientY - resizeStart.current.mouseY) / resizeStart.current.cellH) * 100;
      const nextHeight = Math.min(90, Math.max(8, resizeStart.current.heightPct + dyPct));
      onResize(nextHeight);
    }
    function handleMouseUp() {
      setIsResizing(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const active = isDragging || isResizing;

  return (
    <div
      ref={boxRef}
      onMouseDown={handleDragStart}
      className={`group/st absolute left-0 z-20 flex w-full cursor-move items-center justify-center overflow-hidden border px-0.5 transition ${
 active ? "border-[var(--color-sky)]" : "border-transparent hover:border-[var(--color-sky)]/50"
      }`}
      style={{ top: `${yPct}%`, height: `${heightPct}%` }}
    >
      {title.trim() ? (
        // 키픽 로고와 같은 방향(90도)으로 한 줄로 눕혀서 보여줘요 — 글자를 하나씩 세로로
        // 쌓지 않아요. font-size는 cqh(컨테이너 높이 기준 %)라서 창 크기가 바뀌어도 항상
        // 책 실물 크기 그대로 커지고 작아져요(고정 px이 아니에요).
        <span
          className="whitespace-nowrap font-bold text-[var(--color-charcoal)]"
          style={{ fontSize: `${fontSizeCqh}cqh`, lineHeight: 1, transform: "rotate(90deg)", fontFamily }}
        >
          {title}
        </span>
      ) : (
        <span
          className="text-[11px] text-[var(--color-charcoal)]/40"
          style={{ writingMode: "vertical-lr", textOrientation: "upright" }}
        >
          {emptyLabel}
        </span>
      )}
      <div
        onMouseDown={handleResizeStart}
        title="끌어서 세로 크기 조절"
        className="absolute -bottom-1.5 left-1/2 z-40 h-3 w-3 -translate-x-1/2 cursor-ns-resize -sm border border-white bg-[var(--color-sky)] opacity-0 transition group-hover/st:opacity-100"
      />
    </div>
  );
}

function renderPage(
  templateId: PageTemplateId,
  photos: Photo[],
  photoIndexes: number[],
  onPhotoChange: (index: number, changes: Partial<Photo>) => void,
  onCaptionChange: (photoIndex: number, value: string) => void,
  requiredMinPx: number,
  // 이 페이지가 속한 스프레드의 배경색(hex)이에요. 지정 안 하면 기존 색 그대로예요.
  backgroundColor?: string,
  // "사진 1장(꽉 참/여백)" 페이지에서만 쓰여요 — 이 사진을 자유 배치 이미지박스로
  // 전환하는 버튼을 눌렀을 때 호출돼요(2026-09-22 추가).
  onConvertToImageBox?: () => void
) {
  const bgStyle = backgroundColor ? { background: backgroundColor } : undefined;

  if (templateId === "blank") {
    return <div className="aspect-square bg-white" style={bgStyle} />;
  }

  // 이 페이지의 사진이 이미 자유 배치 이미지박스로 전환된 상태예요 — 사진은 더 이상 여기
  // 없고(spread.imageBoxes 안에서 따로 그려져요), 빈 배경만 보여줘요.
  if (templateId === "freeform") {
    return <div className="aspect-square" style={bgStyle} />;
  }

  if (templateId === "full") {
    return (
      <div className="aspect-square overflow-hidden" style={bgStyle}>
        {photos[0] && (
          <PhotoCell
            photo={photos[0]}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(photoIndexes[0], c)}
            backgroundColor={backgroundColor}
            onConvertToImageBox={onConvertToImageBox}
          />
        )}
      </div>
    );
  }

  if (templateId === "fullMargin") {
    return (
      <div className="aspect-square overflow-hidden bg-white p-10" style={bgStyle}>
        <div className="h-full w-full overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
              backgroundColor={backgroundColor}
              onConvertToImageBox={onConvertToImageBox}
            />
          )}
        </div>
      </div>
    );
  }

  if (templateId === "duo") {
    return (
      <div className="grid aspect-square grid-cols-2 gap-1" style={bgStyle}>
        {[0, 1].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                backgroundColor={backgroundColor}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (templateId === "trio") {
    return (
      <div className="grid aspect-square grid-rows-2 gap-1" style={bgStyle}>
        <div className="overflow-hidden">
          {photos[0] && (
            <PhotoCell
              photo={photos[0]}
              requiredMinPx={requiredMinPx}
              onChange={(c) => onPhotoChange(photoIndexes[0], c)}
              backgroundColor={backgroundColor}
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {[1, 2].map((i) => (
            <div key={i} className="overflow-hidden">
              {photos[i] && (
                <PhotoCell
                  photo={photos[i]}
                  requiredMinPx={requiredMinPx / 2}
                  onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                  backgroundColor={backgroundColor}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (templateId === "trioText") {
    return (
      <div className="grid aspect-square grid-cols-3 items-center gap-2 bg-white p-1.5" style={bgStyle}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="relative aspect-square overflow-hidden">
              {photos[i] && (
                <PhotoCell
                  photo={photos[i]}
                  requiredMinPx={requiredMinPx / 3}
                  onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                  backgroundColor={backgroundColor}
                />
              )}
              {photos[i] && (
                <div className="absolute right-1 top-1 z-10">
                  <CaptionSettingsPopover
                    photo={photos[i]}
                    onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                    showPosition={false}
                  />
                </div>
              )}
            </div>
            {photos[i] && (
              <CaptionField
                photo={photos[i]}
                onCaptionChange={(v) => onCaptionChange(photoIndexes[i], v)}
                placeholder="설명"
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  if (templateId === "quad") {
    return (
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1" style={bgStyle}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="overflow-hidden">
            {photos[i] && (
              <PhotoCell
                photo={photos[i]}
                requiredMinPx={requiredMinPx / 2}
                onChange={(c) => onPhotoChange(photoIndexes[i], c)}
                backgroundColor={backgroundColor}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  const photo = photos[0];
  const realIndex = photoIndexes[0];

  if (!photo) return <div className="aspect-square bg-[var(--color-ivory)]" style={bgStyle} />;

  if (photo.position === "below") {
    return (
      <div className="flex aspect-square flex-col bg-[var(--color-ivory)]" style={bgStyle}>
        <div className="relative flex-1 overflow-hidden">
          <PhotoCell
            photo={photo}
            requiredMinPx={requiredMinPx}
            onChange={(c) => onPhotoChange(realIndex, c)}
            backgroundColor={backgroundColor}
          />
          <div className="absolute right-1 top-1 z-10">
            <CaptionSettingsPopover
              photo={photo}
              onChange={(c) => onPhotoChange(realIndex, c)}
              showPosition={true}
            />
          </div>
        </div>
        <div className="p-2">
          <CaptionField
            photo={photo}
            onCaptionChange={(v) => onCaptionChange(realIndex, v)}
            placeholder="이 사진에 짧은 설명을 적어주세요"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square overflow-hidden bg-[var(--color-ivory)]" style={bgStyle}>
      <PhotoCell
        photo={photo}
        requiredMinPx={requiredMinPx}
        onChange={(c) => onPhotoChange(realIndex, c)}
        backgroundColor={backgroundColor}
      />
      <div className="absolute right-1 top-1 z-10">
        <CaptionSettingsPopover
          photo={photo}
          onChange={(c) => onPhotoChange(realIndex, c)}
          showPosition={true}
        />
      </div>
      <div
        className={`pointer-events-none absolute inset-x-0 px-2 ${
 photo.position === "overlayCenter" ? "top-1/2 -translate-y-1/2" : "bottom-3"
        }`}
      >
        <div className="pointer-events-auto">
          <CaptionField
            photo={photo}
            onCaptionChange={(v) => onCaptionChange(realIndex, v)}
            placeholder="설명을 적어주세요"
          />
        </div>
      </div>
    </div>
  );
}

// 편집 캔버스(표지/소개 페이지/스프레드)를 실제 사용 가능한 화면 크기에 맞춰 보여주는
// 공용 "무대"예요. 2026-09 화면 배치 개편 — 예전엔 캔버스가 그냥 남는 가로 폭을 꽉 채우고
// 세로는 그 폭에 비례해서 자동으로 정해지는 방식이라, 모니터가 넓을수록 세로가 커져서
// 화면 아래로 잘려 보이는 문제가 있었어요. 이제 이 컴포넌트가 실제로 화면에 남는 가로·세로
// 공간을 재서, 어느 방향으로도 잘리지 않게 "화면에 맞추기" 크기(zoom=1 기준)를 계산해요.
// 인쇄 규격(mm)·오브젝트 좌표(%)는 이 계산과 완전히 분리되어 있어요 — 여기서 바뀌는 건
// 딱 하나, 화면에 보여지는 크기(px)뿐이고, 안에 있는 사진·텍스트박스는 항상 그대로예요.
function CanvasStage({
  aspect,
  zoom,
  fitToken,
  className,
  children,
  widthMm,
  onActualSizePercentChange,
  overlay,
}: {
  aspect: number;
  zoom: number;
  // "화면에 맞추기" 버튼을 누른 횟수예요 — 이 값이 바뀔 때만 맞춤 크기를 다시 계산해요.
  // 생략하면 최초 진입 시 1번만 맞추고 그 뒤로는 전혀 다시 계산하지 않아요.
  fitToken?: number;
  className?: string;
  children: React.ReactNode;
  // 지금 그리는 내용의 실제 폭(mm) — "줌 배율" 표시를 실제 크기 기준 %로 보여주는 데
  // 씀(2026-09-24 신규). 생략하면 실제 크기 계산 없이 화면맞춤 배율만 보고돼요.
  widthMm?: number;
  onActualSizePercentChange?: (percent: number | null) => void;
  // 캔버스 위에 절대 위치로 띄울 내용(좌우 페이지 이동 화살표 등, 2026-09-26 추가) —
  // 스크롤되는 viewportRef가 아니라 그 바깥의 measureRef(스크롤 없는 캔버스 전체 영역)
  // 기준으로 떠서, 왼쪽 속성 패널까지 넘어가지 않고 캔버스 영역 안에만 있어요. 두 번째
  // 인자(containerW)는 measureRef 자체의 실제 폭이에요 — 책이 컨테이너를 거의 꽉 채울
  // 때 화살표가 책 바로 바깥이 아니라 컨테이너(=편집기) 경계 안쪽에 멈추도록, 화살표
  // 쪽에서 이 값으로 위치를 한 번 더 잘라내는 데 써요(2026-10-04, "화살표가 편집기
  // 밖으로 나갔다" 수정).
  overlay?: (displayW: number, containerW: number) => React.ReactNode;
}) {
  // measureRef(스크롤 없는 바깥 래퍼)로 크기를 재요 — viewportRef(overflow-auto가 걸린
  // 안쪽 div) 자신을 관찰하면, 그 div에 세로/가로 스크롤바가 생기는 순간
  // clientWidth/clientHeight가 스크롤바 두께만큼 줄어들고, 그러면 baseFit이 다시 작게
  // 계산되어 스크롤바가 사라지고, 다시 커지고 스크롤바가 또 생기는 식으로 무한
  // 진동(ResizeObserver 피드백 루프)이 생겨요 — 혜민님이 "페이지창을 키웠더니 화면이
  // 덜덜 떨리는 현상"으로 보고하신 원인(2026-09-24). 스크롤바가 생겨도 크기가 안
  // 바뀌는 바깥 래퍼를 관찰 대상으로 삼아서 이 루프 자체를 없앴어요.
  const measureRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 눈금자·여백 등 캔버스 바깥 자잘한 요소들을 위한 여유 공간이에요. 정확히 딱 맞추기보다,
  // 약간 여유를 둬서 어떤 경우에도 스크롤 없이 전체가 보이도록 해요.
  // 2026-09-30, 혜민님 요청("페이지창을 키워도 책자에 맞춰서 조정될수있도록 해주세요.
  // 여백을 최대한 없앨겁니다") — 28px는 눈금자·화살표 여유치고 과했어서, 책이 창을
  // 최대한 꽉 채우도록 줄였어요. 화살표(overlay)는 measureRef 기준으로 따로 떠서
  // 이 값과 무관하게 안 잘리니, 더 줄여도 안전해요.
  const SAFETY_PX = 10;

  // "화면에 맞추기" 기준 크기(zoom=1일 때의 크기)예요.
  //
  // 2026-09-24: 혜민님이 "배율이 항상 100%로 적용되어있는데 실제 사이즈에 맞춰서
  // 컴퓨터창이 작아지면 작아진 비율에 맞게 줄여주세요 / 편집창 좌우 잘림현상이 그대로
  // 유지된것이 확인됩니다"로 요청 — 창(뷰포트) 크기가 바뀔 때마다 이 기준 크기를 다시
  // 계산해서, 창이 좁아지면 편집 캔버스가 자동으로 줄어들어 좌우가 잘리지 않고 항상 전체
  // 폭이 보이도록 되돌렸어요. (2026-09-23엔 정반대로 "뷰포트가 바뀔 때마다 재계산되면
  // 사용자가 정한 배율과 무관하게 책이 저절로 커지거나 작아진다"는 이유로 최초 1회만
  // 계산하도록 바꿨던 적이 있어요 — 이번 요청은 그 판단을 다시 뒤집는 거라 혜민님께
  // 명시적으로 보고해요.) fitToken은 "화면에 맞추기" 버튼을 눌렀을 때 값이 바뀌는데,
  // 이제 뷰포트 크기 변화만으로도 항상 재계산되니 그 버튼과 사실상 같은 효과를 내지만,
  // prop 자체는 그대로 두고 의존성 배열에 남겨서(호출부를 안 건드리려고) 버튼을 눌러도
  // 여전히 정상 동작해요. 실제 인쇄 좌표(%)는 이 값과 전혀 무관해요 — 화면에 몇 px로
  // 그려지는지만 바뀔 뿐, 원본 좌표 데이터는 손대지 않아요.
  // useEffect+setState 대신 useMemo로 순수 계산해요 — box(뷰포트 크기)나 aspect가
  // 바뀔 때마다 렌더링 중에 바로 다시 계산되는 파생값이라, 이펙트 안에서 매번 setState를
  // 부르는(리액트 훅 린트가 "연쇄 렌더 위험"으로 지적하는) 패턴을 안 써도 돼요. fitToken은
  // "화면에 맞추기" 버튼을 눌렀을 때만 바뀌던 예전 트리거였는데, 이제 뷰포트 크기 변화만
  // 으로도 항상 최신 값으로 다시 계산되니 실질적으로 더 이상 필요 없어요(호출부 3곳을
  // 안 건드리려고 prop 자체는 그대로 남겨뒀어요).
  const baseFit = useMemo(() => {
    if (box.w <= 0 || box.h <= 0) return null;
    const availW = Math.max(0, box.w - SAFETY_PX * 2);
    const availH = Math.max(0, box.h - SAFETY_PX * 2);
    let fitW = availW;
    let fitH = availW / aspect;
    if (fitH > availH && availH > 0) {
      fitH = availH;
      fitW = availH * aspect;
    }
    if (fitW <= 0 || fitH <= 0) return null;
    return { w: fitW, h: fitH };
    // fitToken은 계산에 안 쓰이지만(이제 뷰포트 크기 변화만으로 항상 최신으로
    // 재계산돼요) 의존성에 남겨둬요 — "화면에 맞추기" 버튼을 눌렀을 때도(같은 크기라도)
    // 이 메모가 확실히 다시 평가되도록 보장하는 안전장치예요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, aspect, fitToken]);

  const ready = !!baseFit;
  const displayW = baseFit ? baseFit.w * zoom : 0;

  // 실제 크기(mm) 대비 화면에 지금 몇 %로 보이는지 상위로 알려줘요 — 창을 좁혀서
  // baseFit이 작아지면(줌은 그대로 1이어도) 이 퍼센트는 같이 줄어들어요(2026-09-24).
  // 2026-10-05, 혜민님 요청: "98%가 되면 책자가 흔들리듯이 움직이는 오류" — displayW가
  // 소수점 아래에서 아주 미세하게(0.0001px 단위) 바뀔 때마다 이 값을 그대로
  // onActualSizePercentChange(부모의 actualSizePercent state)로 올려보내고 있었어요.
  // 화면에는 Math.round()로 반올림해서 보여주니 숫자 자체는 "98%"로 안 바뀐 것처럼
  // 보이지만, 부모 state는 미세하게 계속 바뀌어 매 프레임 리렌더가 일어났고, 그
  // 리렌더가 다시 레이아웃을 흔들어 ResizeObserver를 다시 건드리는 식으로 아주 작은
  // 되먹임 루프가 생길 수 있었어요(특정 줌 배율에서만 이 루프가 눈에 보이는 진동으로
  // 커진 것으로 보여요). 화면에 보이는 반올림 값이 실제로 달라질 때만 state를
  // 갱신하도록 소수 첫째자리로 반올림 후 비교해서 불필요한 갱신을 걸러냈어요.
  const lastReportedPercentRef = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (!onActualSizePercentChange) return;
    if (!widthMm || widthMm <= 0 || !displayW) {
      if (lastReportedPercentRef.current !== null) {
        lastReportedPercentRef.current = null;
        onActualSizePercentChange(null);
      }
      return;
    }
    const actualPx = widthMm * CSS_PX_PER_MM;
    const rounded = Math.round(((displayW / actualPx) * 100) * 10) / 10;
    if (lastReportedPercentRef.current !== rounded) {
      lastReportedPercentRef.current = rounded;
      onActualSizePercentChange(rounded);
    }
  }, [displayW, widthMm, onActualSizePercentChange]);

  return (
    <div ref={measureRef} className={`relative flex min-h-0 min-w-0 flex-1 ${className ?? ""}`}>
      {/* 2026-09-24 items-start -> items-center: 책 비율(aspect)이 컨테이너 비율과
          다르면 항상 위/아래 또는 좌/우 중 한쪽에 여백이 남는데(레터박싱, 스위트북도
          마찬가지), items-start였을 때는 그 여백이 전부 "아래쪽"에만 몰려서 옅은
          배경색+흰 여백이 두드러져 보였어요(혜민님, "하단에 옅은 하늘색의 배경이
          보이고 그밑에 하얀 여백까지"). 위아래로 똑같이 나눠 중앙 정렬하면 여백이
          절반씩 갈라져 훨씬 덜 눈에 띄고, 페이지 이동 화살표(top-1/2로 이 래퍼
          기준 세로 중앙에 떠요)도 책의 실제 세로 중앙과 다시 맞아떨어져요(혜민님,
          "화살표가 너무 아래에 치우쳐있고"). baseFit이 항상 availW/availH 안에 딱
          맞게 계산하니 실제로 넘칠 일은 없어서 overflow-auto는 안전망일 뿐이에요. */}
      <div
        ref={viewportRef}
        className="flex h-full w-full items-center justify-center overflow-auto"
      >
        <div
          className="shrink-0"
          style={ready ? { width: `${displayW}px` } : { opacity: 0 }}
        >
          {children}
        </div>
      </div>
      {overlay ? overlay(displayW, box.w) : null}
    </div>
  );
}

// 스티커 탭·손글씨 탭이 똑같이 쓰는 "카테고리 가로 스크롤 바 + 4열 썸네일 그리드"
// 구조예요(2026-09-23) — 두 탭에서 JSX를 따로 두 번 쓰지 않도록 공용 컴포넌트로
// 뽑았어요. 카테고리 바는 화살표 버튼 없이 가로 스크롤(overflow-x-auto)만으로
// 넘겨요(트랙패드/마우스 휠로 이동). 선택된 카테고리에 아이템이 하나도 없으면(=아직
// 채우지 않은 카테고리) 빈 썸네일이나 눌리지 않는 버튼을 보여주는 대신, 조용한 안내
// 문구만 보여줘요.
function CategoryTabbedGrid({
  categories,
  items,
  activeCategoryId,
  onSelectCategory,
  onItemClick,
  emptyMessage,
}: {
  categories: { id: string; label: string }[];
  items: { id: string; url: string; label: string; category?: string }[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  onItemClick: (item: { id: string; url: string; label: string; category?: string }) => void;
  emptyMessage: string;
}) {
  // 2026-09-25, 혜민님 요청: "전체 메뉴는 없애주세요, 메뉴를 텍스트 메뉴처럼
  // 통일해주세요" — "전체" 항목을 없앴으니 하나의 실제 카테고리만 필터링하면 돼요
  // (예전 "전체 탭 = categories[0]" 특수 취급 로직도 함께 정리).
  const visibleItems = items.filter((item) => item.category === activeCategoryId);

  return (
    <div className="flex flex-col gap-2">
      {/* 2026-09-25, 혜민님 요청: "보라색·파란색 상단 메뉴는 통일감도없고 크기도
          제각각이라 텍스트메뉴처럼 맞춰주세요" — 색상을 텍스트 서브탭(글쓰기/표만들기/
          이모티콘)과 같은 톤(선택: 차콜+흰 글자, 비선택: 아이보리)으로 통일. */}
      <div className="flex overflow-x-auto pb-1 text-[11px]" style={{ scrollbarWidth: "thin" }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`shrink-0 border-r border-white/40 px-2 py-1.5 font-medium transition last:border-r-0 ${
              activeCategoryId === cat.id
                ? "bg-[var(--color-charcoal)] text-white"
                : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {visibleItems.length === 0 ? (
        <div className=" bg-[var(--color-ivory)]/60 p-1.5 text-[11px] text-[var(--color-charcoal)]/60 break-keep">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onItemClick(item)}
              className="flex h-10 w-10 items-center justify-center border border-transparent p-1 transition hover:border-[var(--color-hairline)] hover:bg-[var(--color-ivory)]"
            >
              <img src={item.url} alt={item.label} className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productName = (searchParams.get("product") ?? "포토북") as ProductName;
  const sizeId = searchParams.get("size") ?? "";
  const quantity = searchParams.get("quantity") ?? "1";
  const templateId = searchParams.get("template") ?? "";
  const unitPrice = Number(searchParams.get("unitPrice") ?? "0");
  // 포토북 옵션 선택 화면에서 넘어온 값이에요. 주문 내역(사이즈 라벨)에 함께 담아줘요.
  const photobookCover = searchParams.get("cover") ?? "";
  const photobookCoverCoating = searchParams.get("coverCoating") ?? "";
  const photobookInnerPaper = searchParams.get("innerPaper") ?? "";
  const photobookPages = searchParams.get("pages") ?? "";
  // 하드케이스 배경색상처럼 자동으로 붙는 메모는 고객이 고치지 못하게 별도로 갖고 있어요.
  const colorNote = searchParams.get("colorNote") ?? "";
  const hasNoteFeature =
    productName === "텀블러" ||
    productName === "폰케이스" ||
    productName === "에코백" ||
    productName === "머그" ||
    productName === "캘린더" ||
    productName === "패브릭포스터";

  const config = productConfig[productName];
  const selectedSizeInfo = config.sizes.find((s) => s.id === sizeId) ?? config.sizes[1];
  const template = albumTemplates.find((t) => t.id === templateId);
  const requiredMinPx = calcRequiredMinPx(selectedSizeInfo.detail);

  // 포토북은 사이즈 외에 커버·코팅·용지·페이지 수까지 정해야 해서,
  // 주문 내역에 표시/저장되는 라벨에 그 선택 내용을 함께 담아줘요.
  const isPhotobook = productName === "포토북";
  const photobookOptionParts = isPhotobook
    ? [
        photobookCovers.find((c) => c.id === photobookCover)?.name,
        coverCoatingOptions.find((o) => o.id === photobookCoverCoating)?.name,
        innerPaperOptions.find((o) => o.id === photobookInnerPaper)?.name,
        photobookPages ? calcPagesLabel(Number(photobookPages)) : undefined,
      ].filter((v): v is string => !!v)
    : [];
  const displaySizeLabel = [selectedSizeInfo.label, ...photobookOptionParts].join(" · ");
  const displaySizeDetail = [selectedSizeInfo.detail, ...photobookOptionParts].join(" · ");

  // 옵션 단계에서 고른 내지 페이지 수예요(기본 20p). 표지 책등 폭 계산뿐 아니라,
  // 편집기 스프레드 개수도 이 값에 정확히 맞춰요(스프레드 1개 = 2페이지).
  const pages = photobookPages ? Number(photobookPages) : 20;
  const requiredSpreadCount = calcRequiredSpreadCount(pages);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const isAiAuto = isPhotobook && templateId === AI_AUTO_LAYOUT_TEMPLATE_ID;
  const [customSpreads, setCustomSpreads] = useState<SpreadDef[]>(() =>
    template
      ? template.id === AI_AUTO_LAYOUT_TEMPLATE_ID
        ? generateEmptyFreeformSpreads(requiredSpreadCount)
        : fitSpreadsToCount(template.spreads, requiredSpreadCount)
      : []
  );

  // "AI 맞춤 레이아웃"은 2026-09-24부터 칸(분할) 배정을 아예 안 해요 — 사진을 올리면
  // (handleFileSelect) 그 즉시 findAutoPhotoSlotPosition()이 정해주는 자리에 자유 배치
  // 이미지박스로 바로 들어가고, 그 뒤로는 편집메뉴에서 위치·크기를 자유롭게 조절해요
  // (박스 자리를 뒤에서 다시 계산해서 덮어쓰지 않아요 — 그래야 한 번 옮긴 사진이
  // 나중에 사진을 더 추가해도 그대로 유지돼요). "다음 사진이 몇 번째 자리에 들어갈지"는
  // 별도 state로 따로 세지 않고, 그때그때 photos.length를 기준으로 계산해요
  // (handleFileSelect의 autoPhotoBaseSlot 참고) — 화면 전환 중에 상태가 어긋날 일이 없게요.
  const [isSaving, setIsSaving] = useState(false);
  // [테스트용] 새 pdf-lib PDF 생성기 테스트 버튼 상태예요. (?pdftest=1 일 때만 노출)
  const isPdfLibTestMode = searchParams.get("pdftest") === "1";
  const [pdfLibTestState, setPdfLibTestState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; info: string } | { status: "error"; message: string }
  >({ status: "idle" });
  const [coverPdfLibTestState, setCoverPdfLibTestState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; info: string } | { status: "error"; message: string }
  >({ status: "idle" });
  // [테스트용] 책등 제목 위/아래 위치 (-1~1, 0이 정중앙). 혜민님이 화면에서 조정 가능하게 해달라고
  // 요청한 값이에요. 로고는 이 값과 무관하게 항상 책등 아래쪽 고정 위치에 들어가요.
  const [coverSpineTitleOffset, setCoverSpineTitleOffset] = useState(0);
  // 이전 단계에서 남긴 요청사항이에요. 이 페이지에서 바로 고칠 수 있어요.
  const [requestNote, setRequestNote] = useState(searchParams.get("note") ?? "");
  // 포토북 표지(앞표지 사진 + 제목)예요. 표지 종류(소프트/하드)는 이전 단계에서 이미
  // 골랐고, 여기서는 표지에 들어갈 사진과 제목만 정해요.
  const [coverPhoto, setCoverPhoto] = useState<Photo | null>(null);
  const [coverTitle, setCoverTitle] = useState("");
  // 책등(세네카) 제목은 따로 없어요 — 앞표지 제목을 그대로 책등에도 써요(혜민님 확인,
  // 2026-09: 표지 제목이 곧 책등 제목이라 입력칸을 두 개 둘 필요가 없음).
  // 표지 제목 글자 크기(pt, 실제 인쇄 크기 그대로) · 행간 · 자간이에요. 화면에서
  // pt 단위로 직접 지정하고, 실제 인쇄 파일에도 그대로 반영돼요.
  const [coverTitleFontSizePt, setCoverTitleFontSizePt] = useState(36);
  const [coverTitleLineHeightEm, setCoverTitleLineHeightEm] = useState(1.2);
  const [coverTitleLetterSpacingEm, setCoverTitleLetterSpacingEm] = useState(0);
  const [coverTitleAlign, setCoverTitleAlign] = useState<"left" | "center" | "right">("center");
  // 2026-10-02, 혜민님 요청(항목9): "텍스트 내지에있던 옵션값과 동일하게 수정해주세요"
  // — 내지 TextBoxToolbar에 적용했던 것과 같은 "입력 중엔 임시 문자열(draft)만 바뀌고,
  // 유효한 값일 때만 실제 값에 반영" 패턴이에요. 매 렌더마다 실제 값을 그대로 value에
  // 꽂으면 타이핑 중간에 값이 계속 강제로 되돌아가 여러 자리 숫자를 못 치는 버그가
  // 생겨요(내지에서 이미 겪었던 문제와 동일). 문서를 불러올 때(loadPhotobookState
  // 근처)도 같이 동기화해요.
  const [coverTitlePtDraft, setCoverTitlePtDraft] = useState("36");
  const [coverTitleLineHeightDraft, setCoverTitleLineHeightDraft] = useState("1.2");
  const [coverTitleLetterSpacingDraft, setCoverTitleLetterSpacingDraft] = useState("0");
  // 표지 제목 위치예요(앞표지 칸 전체를 100%로 보는 퍼센트). 기존엔 하단에 고정이었는데,
  // 이제 텍스트박스처럼 끌어서 옮길 수 있어요 — 기본값은 예전 고정 위치(하단 중앙)와
  // 비슷한 자리예요.
  const [coverTitleXPct, setCoverTitleXPct] = useState(8);
  const [coverTitleYPct, setCoverTitleYPct] = useState(84);
  const coverTitleWidthPct = 84;
  // 책등 텍스트박스예요. 가로폭은 책등 폭에 항상 맞춰지도록 고정이고(따로 조절 안 해요),
  // 세로 위치·높이만 화면에서 끌어서 바꿀 수 있어요(일러스트레이터 텍스트박스처럼요).
  const [spineTitleYPct, setSpineTitleYPct] = useState<number | null>(null); // null = 아직 직접 옮기지 않음 → 기본값(위에서 25mm)을 화면에서 계산해서 보여줘요
  const [spineTitleHeightPct, setSpineTitleHeightPct] = useState(50); // 12pt 최소 크기가 여유있게 들어가도록 기본 높이를 늘렸어요(로고 자리와는 안 겹쳐요).
  // 책등 제목 크기(pt)·서체 — 표지 제목과 별도로 고를 수 있어요. 비워두면(null) 책등
  // 폭에 맞춰 자동으로 크기를 정해요.
  const [spineTitleFontSizePt, setSpineTitleFontSizePt] = useState<number | null>(null);
  const [spineTitleFontSizePtDraft, setSpineTitleFontSizePtDraft] = useState("");
  const [spineTitleFontFamily, setSpineTitleFontFamily] = useState(fontOptions[0].id);
  // 표지 제목 서체예요. 캡션 서체 선택지(fontOptions)와 같은 목록을 그대로 써요.
  const [coverTitleFontFamily, setCoverTitleFontFamily] = useState(fontOptions[0].id);
  // 표지 제목⇄책등 제목 서체 연결 스위치예요(2026-09-25, 혜민님 요청). 기본 켜짐 — 켜진
  // 동안은 둘 중 어느 쪽 서체를 바꿔도 같이 바뀌어요(아래 handleCoverTitleFontFamilyChange/
  // handleSpineTitleFontFamilyChange 참고). 크기·위치·회전은 서로 영향 안 받고 각자 값
  // 그대로 유지돼요. 불러온 프로젝트에서 두 서체가 이미 다르더라도, 이 스위치가 켜져
  // 있다고 해서 불러오자마자 강제로 맞추진 않아요 — 실제 동기화는 누군가 서체를
  // 바꾸는 시점에만 일어나요.
  const [titleFontLinked, setTitleFontLinked] = useState(true);
  // 뒤표지 키픽 로고예요(2026-09, 예전 backCoverMode "logo"/"photo" 배타적 토글을
  // 대체 — 이제 로고와 사진은 서로 독립된 "꾸미기" 캔버스 객체라 함께 있을 수 있어요).
  // null이면 로고가 없는 거고, 값이 있으면 그 위치(중심 기준 %)·크기(스프레드 기준
  // scalePct, 100=예전 고정 크기)를 가리켜요. 새 프로젝트는 예전과 같은 화면이 되도록
  // 기본값을 "가운데, 예전 고정 크기와 같은 크기"로 시작해요.
  const [backCoverLogo, setBackCoverLogo] = useState<{ xPct: number; yPct: number; scalePct: number } | null>({
    xPct: 50,
    yPct: 50,
    scalePct: 100,
  });
  // 지금 뒤표지 로고가 선택된 상태인지예요(캔버스에서 클릭해 고르면 true — 내지
  // activeImageBox·표지 activeCoverImageBox와 같은 역할, 로고는 ImageBoxDef가 아니라서
  // 별도의 boolean으로 관리해요).
  const [backCoverLogoSelected, setBackCoverLogoSelected] = useState(false);
  // 뒤표지 로고를 캔버스에서 선택하면 왼쪽 패널이 자동으로 "꾸미기" 탭으로 전환되고,
  // 다른 선택(텍스트박스·표지 사진박스)은 해제돼요(selectImageBox·selectTextBox와 같은 패턴).
  function selectBackCoverLogo() {
    setActiveTextBox(null);
    setActiveCoverImageBox(null);
    setBackCoverLogoSelected(true);
    setActiveCoverEditTab("photo");
  }
  const [backCoverPhoto, setBackCoverPhoto] = useState<Photo | null>(null);
  const [backCoverBackgroundColor, setBackCoverBackgroundColor] = useState<string | undefined>(undefined);
  // 뒤표지도 내지처럼 그래픽·패턴·텍스처 배경과 자유 배치 텍스트박스를 넣을 수 있어요.
  const [coverPatternId, setCoverPatternId] = useState<string | undefined>(undefined);
  const [backCoverTextBoxes, setBackCoverTextBoxes] = useState<TextBoxDef[]>([]);
  // 책등·앞표지 배경색이에요. 뒤표지와 마찬가지로 지정 안 하면 기존 기본색(책등은 아이보리,
  // 앞표지는 흰색) 그대로예요. 세 곳 모두 따로 고를 수도, 아래 "배경색" 팔레트에서 한 번에
  // 세트로 맞출 수도 있어요.
  const [coverSpineBackgroundColor, setCoverSpineBackgroundColor] = useState<string | undefined>(undefined);
  const [coverFrontBackgroundColor, setCoverFrontBackgroundColor] = useState<string | undefined>(undefined);
  // 표지 앞면에 자유롭게 배치하는 텍스트박스예요(제목과는 별개예요).
  const [coverTextBoxes, setCoverTextBoxes] = useState<TextBoxDef[]>([]);
  // 표지 "레이아웃" 탭(2026-09-24 추가)에서 여러 장짜리 템플릿을 적용하면 쓰는 사진
  // 배열이에요. 내지의 imageBoxes와 완전히 같은 구조(ImageBoxDef)라서 빈 프레임·
  // "+사진 추가"·"사진만 빼기"/"프레임 삭제" 구분이 그대로 재사용돼요. 비어있으면
  // (레이아웃을 아직 안 썼으면) 기존처럼 coverPhoto/backCoverPhoto 사진 1장 방식을 그대로
  // 써요 — 레이아웃을 처음 적용하는 순간 그 사진이 새 배열의 첫 칸으로 이어받아져요.
  const [coverImageBoxes, setCoverImageBoxes] = useState<ImageBoxDef[]>([]);
  const [backCoverImageBoxes, setBackCoverImageBoxes] = useState<ImageBoxDef[]>([]);
  // 표지 앞면/뒤면에 자유 배치한 표(테이블) 박스예요(기본형, 2026-09-25 "표 만들기" 요청).
  const [coverTableBoxes, setCoverTableBoxes] = useState<TableBoxDef[]>([]);
  const [backCoverTableBoxes, setBackCoverTableBoxes] = useState<TableBoxDef[]>([]);
  const [activeTableBox, setActiveTableBox] = useState<{ scope: "cover" | "backCover" | "spread"; spreadIndex?: number; boxId: string } | null>(null);
  // "텍스트" 패널 상단 서브탭(글쓰기/표만들기/이모티콘, 2026-09-25 추가) — 내지·표지 모두 공유해요(패널이 한 번에 하나만 보여서 공유해도 안 섞여요).
  const [textPanelSubTab, setTextPanelSubTab] = useState<"write" | "table" | "emoji">("write");
  // 표지 레이아웃 탭에서 지금 선택된 사진박스예요(캔버스에서 클릭해 고른 박스의 편집
  // 버튼들을 보여주는 데 씀 — 내지의 activeImageBox와 같은 역할).
  const [activeCoverImageBox, setActiveCoverImageBox] = useState<{
    target: "front" | "back";
    boxId: string;
  } | null>(null);
  // 내지 imageBoxPhotoEditActive와 같은 역할이에요 — 표지 사진박스가 사진 위치 조정
  // 모드(더블클릭)인지를 가리켜서, 왼쪽 "꾸미기" 패널에 조작 버튼을 보여줄지 결정해요.
  const [coverImageBoxPhotoEditActive, setCoverImageBoxPhotoEditActive] = useState(false);
  // 왼쪽 패널 버튼이 실제 표지 사진박스의 확대/축소/반전/초기화/완료·꽉 채우기 동작을
  // 그대로 호출할 수 있도록, 박스 id → 핸들 맵을 들고 있어요(내지 imageBoxHandlesRef와 동일).
  const coverImageBoxHandlesRef = useRef<Map<string, ImageBoxOverlayHandle>>(new Map());
  // 표지 이미지박스를 캔버스에서 선택하면 왼쪽 패널이 자동으로 "꾸미기" 탭으로
  // 전환돼서 바로 그 사진의 속성을 고칠 수 있게 해요(selectImageBox·selectTextBox와
  // 같은 패턴, 2026-09).
  function selectCoverImageBox(target: "front" | "back", boxId: string, knownBox?: ImageBoxDef) {
    setActiveTextBox(null);
    setCoverImageBoxPhotoEditActive(false);
    setActiveCoverImageBox({ target, boxId });
    setBackCoverLogoSelected(false);
    // 2026-10-02, 혜민님 요청: "앞표지 뒤표지 메뉴 삭제, 스프레드 기준으로" — 레이아웃·
    // 스티커 패널의 수동 "적용 대상" 토글을 없앤 대신, 캔버스에서 어느 쪽 사진박스를
    // 선택하든 그 즉시 그 쪽이 "지금 작업 중인 쪽"이 되도록 자동으로 맞춰요.
    setCoverLayoutApplyTarget(target);
    // 내지 selectImageBox와 같은 수정이에요(2026-09-24엔 내지만 고쳤었어요) — 스티커는
    // "사진" 탭에 편집할 속성이 없어서, 표지 스티커를 선택해도 왼쪽 패널을 "사진" 탭으로
    // 옮기지 않아요. "여전히 스티커를 만질 때 사진툴로 이동한다"는 재확인(2026-09-27)
    // 이후 보니, 내지만 고치고 표지(앞/뒤표지) 쪽은 그대로 빠져 있었던 게 원인이었어요.
    // knownBox: 내지 selectImageBox와 같은 이유로 추가했어요(2026-09-27) — 방금 만든
    // 새 스티커를 곧바로 선택할 때는 setState 직후라 coverImageBoxes/backCoverImageBoxes
    // state가 아직 갱신 전이라, 호출부가 이미 들고 있는 박스 객체를 직접 넘겨받아요.
    const boxes = target === "front" ? coverImageBoxes : backCoverImageBoxes;
    const box = knownBox ?? boxes.find((b) => b.id === boxId);
    if (!box || !isStickerImageBox(box)) {
      setActiveCoverEditTab("photo");
    }
  }
  const [isGeneratingPrintFiles, setIsGeneratingPrintFiles] = useState(false);
  // "마지막 소개 페이지"(발행 정보)예요. 발행일은 최초 생성 시 한국 날짜로 한 번만
  // 정하고(아래 useEffect), 그 뒤로는 다시 열거나 PDF를 저장해도 자동으로 바뀌지
  // 않아요 — 혜민님/사용자가 직접 고치기 전까지는요. 만든이는 비어 있으면 인쇄 시
  // "신규 작성자"를 기본값으로 써요.
  const [introPublishDate, setIntroPublishDate] = useState("");
  const [introMakerName, setIntroMakerName] = useState("");

  // "마지막 소개 페이지"의 발행일 기본값도 마운트된 뒤(브라우저에서만) 한 번만 오늘
  // 날짜로 채워요. 이미 값이 있으면(다시 방문 등) 그대로 둬서, 사용자가 고친 값이나
  // 예전에 정해진 최초 생성일이 자동으로 바뀌지 않게 해요.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntroPublishDate((prev) => (prev ? prev : formatKoreanDate(new Date())));
  }, []);

  // 앞표지 제목을 입력하면 책등 제목도 자동으로 같이 채워요. 단, 사용자가 책등 제목을
  function handleCoverTitleChange(value: string) {
    setCoverTitle(value);
  }
  // 지금 화면 오른쪽 큰 미리보기에 어떤 페이지를 보여줄지예요.
  // "cover"면 표지(뒤표지-세네카-앞표지)를, 숫자면 그 번째 스프레드를 보여줘요.
  const [selectedPageKey, setSelectedPageKey] = useState<"cover" | "intro" | number>(
    isPhotobook ? "cover" : 0
  );
  // 하단 페이지 목록의 이전·다음 이동, 페이지 번호 표시용 — 표지 → 스프레드들 → 소개
  // 페이지 순서예요(포토북이 아니면 표지·소개 페이지가 없어서 스프레드만 있어요).
  const pageOrder = useMemo<("cover" | "intro" | number)[]>(() => {
    const spreadKeys = customSpreads.map((_, i) => i);
    return isPhotobook ? (["cover", ...spreadKeys, "intro"] as ("cover" | "intro" | number)[]) : spreadKeys;
  }, [isPhotobook, customSpreads]);
  // "전체 사진 목록" 펼침 패널의 현재 페이지(0부터 시작, PHOTO_GRID_PAGE_SIZE장씩)예요.
  const [photoGridPage, setPhotoGridPage] = useState(0);
  // 내지 배경 꾸미기 탭(단색/그래픽/패턴/텍스처) — 모든 스프레드가 같은 탭을 공유해요.
  const [backgroundTab, setBackgroundTab] = useState<"solid" | BackgroundPatternCategory>("solid");
  // 스티커·손글씨 탭에서 지금 선택된 카테고리예요(각 탭 독립, 기본값 "전체").
  const [stickerCategoryTab, setStickerCategoryTab] = useState<string>("props");
  const [handwritingCategoryTab, setHandwritingCategoryTab] = useState<string>("daily");
  // 2026-09-25, 혜민님 요청(항목5): 표지 "테마" 탭도 가족/여행/커플/아기/생일 5개
  // 카테고리로 나눠서 골라 볼 수 있게 했어요.
  const [themeCategoryTab, setThemeCategoryTab] = useState<CoverThemeCategory>("family");
  // 2026-09-25, 혜민님 요청: "사진 프레임 변경 버튼을 만들어주세요(말 그대로 사진
  // 프레임 변경하는거예요)" — 캔버스에서 사진박스를 선택했을 때 뜨는
  // StackOrderToolbar의 테두리 두께·색·모서리 둥글게 조절판과 똑같은 기능을,
  // 왼쪽 "사진" 탭 안에서도 바로 열어볼 수 있게 했어요(값을 바꾸면
  // handleCoverImageBoxChange로 같은 상태를 그대로 갱신해요 — 새로 만든 별도
  // 기능이 아니라 기존 기능을 패널에서도 쓸 수 있게 한 것).
  const [coverPhotoFramePanelOpen, setCoverPhotoFramePanelOpen] = useState(false);
  // "미리보기"(보기만) / "편집"(실제 수정 가능) 두 화면을 분리해요. 페이지를 새로 고를
  // 때마다 항상 미리보기부터 보여주고, 미리보기 위에 마우스를 올리면 "편집하기"가 뜨고
  // 그걸 눌러야 편집 화면으로 들어가요. (useEffect 대신 렌더 중 비교 — React가 권장하는
  // "prop이 바뀌면 상태 리셋" 패턴이에요, 불필요한 리렌더를 한 번 줄여줘요)
  const [editorModeState, setEditorModeState] = useState<{
    forPageKey: typeof selectedPageKey;
    mode: "preview" | "edit";
  }>({ forPageKey: selectedPageKey, mode: "preview" });
  // 렌더 중에 selectedPageKey가 바뀐 걸 감지해서 같은 렌더에서 바로 미리보기로
  // 되돌려요(리렌더 한 번을 줄이는, ref 변형 없이 안전한 방식이에요).
  const editorMode = editorModeState.forPageKey === selectedPageKey ? editorModeState.mode : "preview";
  function setEditorMode(mode: "preview" | "edit") {
    setEditorModeState({ forPageKey: selectedPageKey, mode });
  }
  // 편집 화면 왼쪽 아이콘 메뉴(레이아웃/배경/표지변경/스티커/손글씨스티커/텍스트/꾸미기) — 어떤
  // 탭이 열려 있는지예요. 페이지를 새로 고르면 항상 "레이아웃" 탭부터 보여줘요(2026-09-23,
  // 독립 "사진" 탭 제거하면서 기본 탭도 바꿨어요).
  // 2026-10-02, 혜민님 요청: "미리보기에서 편집하기를 눌렀을 때 레이아웃이 선택되는
  // 오류 확인됩니다. 처음에는 접혀있는 상태로 동작되게 해주세요" — 기본값이 항상
  // "layout"이라 편집 모드에 들어가자마자 레이아웃 탭이 자동으로 열려 있었음.
  // null(아무 탭도 안 고른 상태)을 표현할 수 있게 바꾸고, 편집하기를 누를 때마다
  // null로 되돌림(아래 편집하기 버튼 onClick 참고).
  const [activeEditTab, setActiveEditTab] = useState<EditTabId | null>(null);
  // "텍스트" 탭의 "+ 글상자 추가" 버튼이 왼쪽/오른쪽 페이지 중 어디에 넣을지 기억해두는
  // 작은 토글이에요(2026-09-27, 버튼 두 개를 하나로 합치면서 추가).
  // "레이아웃" 탭 상태 — 적용 범위(왼쪽/오른쪽/펼침면 전체)와 개수 필터, 그리고 사진
  // 개수가 안 맞아 적용을 막았을 때 보여줄 안내 문구예요.
  const [layoutCountFilter, setLayoutCountFilter] = useState<LayoutCountFilter>("all");
  const [layoutApplyMessage, setLayoutApplyMessage] = useState<string | null>(null);
  // 템플릿 칸보다 사진이 많을 때 "어떤 사진을 쓸지" 고르는 팝업의 상태예요(2026-09-23
  // 추가). candidates는 팝업에 보여줄 사진들(저장된 순서 그대로), selectedIds는 지금
  // 체크한 것들 — 정확히 template.slots.length개를 골라야 "적용" 버튼이 활성화돼요.
  // 취소하면(팝업을 닫으면) 아무것도 안 바뀌어요.
  const [pendingLayoutApply, setPendingLayoutApply] = useState<{
    spreadIndex: number;
    range: LayoutApplyRange;
    template: PhotoLayoutTemplate;
    candidates: ImageBoxDef[];
  } | null>(null);
  const [pendingLayoutApplySelectedIds, setPendingLayoutApplySelectedIds] = useState<string[]>([]);
  // 2026-09-27, 혜민님 요청: "기본적으로 펼침면으로 레이아웃을 보여주세요 ... 적용할때는
  // 왼쪽페이지에 적용할건지 양쪽페이지 적용할건지 오른쪽페이지만 적용할건지 ... 묻는형식으로
  // 해주세요." — 레이아웃 패널은 이제 항상 스프레드(펼침면) 미리보기로 보여주고(원래
  // half 전용이던 템플릿도 좌우로 자동 복제해서 스프레드 형태로 보여줌,
  // spreadBrowseTemplates()), 썸네일을 클릭하면 이 팝업이 떠서 왼쪽/양쪽/오른쪽 중
  // 어디에 적용할지 물어봐요.
  const [layoutRangePicker, setLayoutRangePicker] = useState<{
    spreadIndex: number;
    template: PhotoLayoutTemplate;
    allowLeft: boolean;
  } | null>(null);
  // 표지 레이아웃 탭용 — 위 pendingLayoutApply/layoutApplyMessage와 같은 역할인데
  // 표지(앞표지/뒤표지)에 적용할 때만 써요(2026-09-24 추가). 적용 대상(앞표지/뒤표지)은
  // 내지의 "적용 범위"에 대응하는 값이에요.
  const [coverLayoutApplyTarget, setCoverLayoutApplyTarget] = useState<"front" | "back">("front");
  const [coverLayoutApplyMessage, setCoverLayoutApplyMessage] = useState<string | null>(null);
  const [pendingCoverLayoutApply, setPendingCoverLayoutApply] = useState<{
    target: "front" | "back";
    template: PhotoLayoutTemplate;
    candidates: ImageBoxDef[];
  } | null>(null);
  const [pendingCoverLayoutApplySelectedIds, setPendingCoverLayoutApplySelectedIds] = useState<string[]>([]);
  const [activeCoverEditTab, setActiveCoverEditTab] = useState<CoverEditTabId | null>(null);
  // 좁은 화면에서 왼쪽 속성 패널을 접어 캔버스를 더 넓게 볼 수 있게 하는 순수 레이아웃
  // 상태예요 — 줌/맞춤(canvasZoom·canvasFitToken)과는 완전히 무관해서, 이 토글을
  // 눌러도 지금 보고 있는 확대 비율·위치는 그대로 유지돼요.
  // 편집 화면에서 재단선·안전선을 겹쳐 보여줄지 여부예요. (내지 스프레드에만 적용돼요)
  // 예전엔 체크박스로 각각 켜고 끌 수 있었는데, 2026-09-19부터 항상 보이도록 고정하고
  // (체크박스 UI는 없앴어요) 대신 "인쇄 미리보기"를 켜면 전부 숨기고 재단선 안쪽만 종이
  // 처럼 확대해서 보여줘요.
  const showGuidelines = true;
  const showInnerSafetyGuide = true;
  const showInnerBindingGuide = true;
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  // 표지 편집 화면 전용 안내선 켜기/끄기예요(뒤표지·책등·앞표지를 하나의 펼침면으로 보고
  // 계산해요 — 도련선/재단선은 펼침면 전체 기준, 안전영역은 뒤표지·책등·앞표지 각각 기준,
  // 책등 경계는 접힘 위치 전용 안내선이에요). 네 가지를 따로 켜고 끌 수 있어요.

  // 2026-10-04, 혜민님 요청: "표지메뉴는 내지와 다르게 이미지 선택후 이미지박스와
  // 패널창이 안뜨고 예전에 하단에 기재된 바만 생김. 내지와 동일하게 수정해주세요" —
  // 예전엔 표지 첫 사진을 coverPhoto/backCoverPhoto(절대좌표 드래그 전용 Photo 타입,
  // PhotoCell로 그려짐)로만 저장해서 내지 자유배치 이미지박스(ImageBoxOverlay)의
  // 가운데 스냅·테두리/모서리 패널이 전혀 적용되지 않았어요. 이제 표지 사진을 고르는
  // 순간 coverImageBoxes/backCoverImageBoxes에도 패널을 꽉 채우는 박스로 함께
  // 만들어서, 캔버스에서는 항상 내지와 똑같은 ImageBoxLayer/ImageBoxOverlay로
  // 그려지게 해요(스냅·리사이즈·테두리·둥근모서리 전부 동일). coverPhoto/backCoverPhoto
  // 값 자체는 지우지 않고 그대로 함께 갱신해요 — "마지막 소개 페이지" 미리보기·인쇄
  // (IntroPhotoMirror 화면, lib/printCompose.ts의 drawIntroPage)가 아직 이 Photo
  // 타입(x/y/scale 절대좌표)을 그대로 쓰고 있어서예요.
  function applyCoverPhotoAsImageBox(
    target: "front" | "back",
    url: string,
    naturalWidth: number,
    naturalHeight: number
  ) {
    const setBoxes = target === "front" ? setCoverImageBoxes : setBackCoverImageBoxes;
    setBoxes((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: crypto.randomUUID(),
            url,
            naturalWidth,
            naturalHeight,
            xPct: 0,
            yPct: 0,
            widthPct: 100,
            heightPct: 100,
            innerOffsetXPct: 0,
            innerOffsetYPct: 0,
            innerScale: 1,
          },
        ];
      }
      // 이미 박스가 있으면(레이아웃 탭에서 이미 만들어졌거나, "표지 사진 바꾸기"로 다시
      // 고르는 경우) 맨 앞 칸의 사진만 바꾸고 위치·크기는 그대로 둬요.
      return prev.map((b, i) =>
        i === 0
          ? { ...b, url, naturalWidth, naturalHeight, innerOffsetXPct: 0, innerOffsetYPct: 0, innerScale: 1 }
          : b
      );
    });
  }

  async function handleCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setCoverPhoto({
        url,
        caption: "",
        x: 0,
        y: 0,
        scale: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fontFamily: fontOptions[0].id,
        size: "base",
        bold: false,
        color: "#2B2B2B",
        align: "center",
        position: "below",
        containerW: 0,
        containerH: 0,
        rotation: 0,
        flipX: false,
      });
      applyCoverPhotoAsImageBox("front", url, img.naturalWidth, img.naturalHeight);
    };
    img.src = url;
  }

  // 뒤표지에 "사진" 모드일 때 넣을 작은 이미지를 골라요. (표지 앞면 사진과는 별개예요)
  async function handleBackCoverFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setBackCoverPhoto({
        url,
        caption: "",
        x: 0,
        y: 0,
        scale: 1,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fontFamily: fontOptions[0].id,
        size: "base",
        bold: false,
        color: "#2B2B2B",
        align: "center",
        position: "below",
        containerW: 0,
        containerH: 0,
        rotation: 0,
        flipX: false,
      });
      applyCoverPhotoAsImageBox("back", url, img.naturalWidth, img.naturalHeight);
    };
    img.src = url;
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    // "AI 맞춤 레이아웃"에서 이번에 새로 올리는 사진들이 자유 배치 이미지박스로 들어갈
    // 자리를 정하는 기준이에요. 별도 카운터 state 대신 photos.length를 그대로 써요 —
    // 사진 목록은 항상 뒤에 이어붙이는 방식(prev => [...prev, ...newPhotos])이라, "지금
    // 몇 번째 사진부터 새로 추가되는지"가 곧 지금 이 순간의 photos.length예요.
    const autoPhotoBaseSlot = photos.length;

    const newPhotosPromises = Array.from(files).map((file) => {
      return new Promise<Photo>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          resolve({
            url,
            caption: "",
            x: 0,
            y: 0,
            scale: 1,
            width: img.naturalWidth,
            height: img.naturalHeight,
            fontFamily: fontOptions[0].id,
            size: "sm",
            bold: false,
            color: "#2B2B2B",
            align: "left",
            position: "below",
            containerW: 0,
            containerH: 0,
            rotation: 0,
            flipX: false,
          });
        };
        img.src = url;
      });
    });

    const newPhotos = await Promise.all(newPhotosPromises);
    setPhotos((prev) => [...prev, ...newPhotos]);

    // 표지 사진을 아직 안 골랐으면, 처음 올린 사진을 표지 앞면에 자동으로 배치해요.
    // (직접 고른 표지 사진이 있으면 건드리지 않고, "표지 사진 바꾸기"로 언제든 바꿀 수 있어요.)
    // 2026-10-04: 자동 배치도 applyCoverPhotoAsImageBox로 같이 이어받아서, 처음부터
    // 내지와 똑같은 이미지박스(스냅·테두리 패널)로 시작해요.
    if (!coverPhoto && coverImageBoxes.length === 0) {
      const first = newPhotos[0];
      if (first) {
        setCoverPhoto({ ...first, caption: "", size: "base", align: "center", position: "below" });
        applyCoverPhotoAsImageBox("front", first.url, first.width, first.height);
      }
    }

    // "AI 맞춤 레이아웃"이면 방금 올린 사진들을 곧바로 자유 배치 이미지박스로 넣어요
    // (분할 메뉴 없이, 편집메뉴에서 바로 위치·크기를 조절할 수 있게). 이미 놓인 다른
    // 박스들은 건드리지 않고, 다음 빈 자리부터 순서대로 채워요.
    if (isAiAuto) {
      setCustomSpreads((prevSpreads) => {
        let spreads = prevSpreads;
        newPhotos.forEach((p, k) => {
          const slot = autoPhotoBaseSlot + k;
          const pos = findAutoPhotoSlotPosition(slot, requiredSpreadCount);
          const box: ImageBoxDef = {
            id: crypto.randomUUID(),
            url: p.url,
            naturalWidth: p.width || 1,
            naturalHeight: p.height || 1,
            xPct: pos.overflow ? 25 + ((slot * 7) % 30) : pos.side === "left" ? 0 : 50,
            yPct: pos.overflow ? 25 + ((slot * 11) % 30) : 0,
            widthPct: pos.overflow ? 40 : 50,
            heightPct: pos.overflow ? 40 : 100,
            innerOffsetXPct: 0,
            innerOffsetYPct: 0,
            innerScale: 1,
          };
          spreads = spreads.map((s2, i) =>
            i === pos.spreadIndex
              ? {
                  ...s2,
                  imageBoxes: [...(s2.imageBoxes ?? []), box],
                  imageBoxOrder: [...getSpreadImageBoxOrder(s2), box.id],
                }
              : s2
          );
        });
        return spreads;
      });
    }
  }

  function handleCaptionChange(photoIndex: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => (i === photoIndex ? { ...p, caption: value } : p)));
  }

  function handlePhotoTransform(index: number, changes: Partial<Photo>) {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function handleRemovePhoto(index: number) {
    // "AI 맞춤 레이아웃"에서는 사진이 곧 자유 배치 이미지박스라서, 목록에서 지우면
    // 스프레드에 놓인 그 박스도 같이 지워요(url로 짝을 찾아요 — 사진마다 고유해요).
    if (isAiAuto) {
      const removedUrl = photos[index]?.url;
      if (removedUrl) {
        setCustomSpreads((prev) =>
          prev.map((s) => {
            const removedIds = (s.imageBoxes ?? []).filter((b) => b.url === removedUrl).map((b) => b.id);
            if (removedIds.length === 0) return s;
            const removedIdSet = new Set(removedIds);
            return {
              ...s,
              imageBoxes: (s.imageBoxes ?? []).filter((b) => !removedIdSet.has(b.id)),
              imageBoxOrder: getSpreadImageBoxOrder(s).filter((id) => !removedIdSet.has(id)),
            };
          })
        );
      }
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleChangeLayout(
    spreadIndex: number,
    side: "left" | "right",
    newId: PageTemplateId
  ) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [side]: newId } : s))
    );
  }

  // 스프레드(왼쪽+오른쪽 펼침면) 배경색을 바꿔요. color가 undefined면 기본값(흰색)으로 되돌려요.
  // 단색 배경을 골라요. 그래픽·패턴·텍스처(backgroundPattern)와는 하나만 고를 수 있어서,
  // 단색을 고르면 그쪽은 자동으로 해제돼요.
  function handleChangeBackground(spreadIndex: number, color: string | undefined) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => {
        if (i !== spreadIndex) return s;
        const next = { ...s };
        if (color) {
          next.backgroundColor = color;
        } else {
          delete next.backgroundColor;
        }
        delete next.backgroundPattern;
        return next;
      })
    );
  }

  // 그래픽·패턴·텍스처 배경을 골라요. 단색 배경(backgroundColor)과는 하나만 고를 수
  // 있어서, 패턴을 고르면 단색은 자동으로 해제돼요. patternId가 undefined면 해제예요.
  function handleChangePattern(spreadIndex: number, patternId: string | undefined) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => {
        if (i !== spreadIndex) return s;
        const next = { ...s };
        if (patternId) {
          next.backgroundPattern = patternId;
        } else {
          delete next.backgroundPattern;
        }
        delete next.backgroundColor;
        return next;
      })
    );
  }

  // 새 텍스트박스 하나를 기본값으로 만들어요. 2026-09-27, 혜민님 요청: "글상자
  // 추가할때 기본 설정이 가로폭이 길고 텍스트가 상단에 위치되어있었는데 적당한
  // 직사각형 크기에 글상자 왼쪽 상단에 텍스트 입력 창이 있었으면 합니다" — 가로로
  // 넓게 퍼진 박스(폭 70%, 높이 자동) 대신 적당한 직사각형(폭 45%, 높이 28% 고정)으로,
  // 정렬도 가운데가 아니라 왼쪽 위로 바꿨어요.
  function makeTextBox(): TextBoxDef {
    return {
      id: crypto.randomUUID(),
      text: "",
      xPct: 27,
      yPct: 30,
      widthPct: 46,
      heightPct: 28,
      fontFamily: fontOptions[0].id,
      fontScale: 1,
      color: "#1a1a1a",
      align: "left",
      verticalAlign: "top",
      bold: false,
    };
  }

  // "사진 아래 문구 공간" 계열 레이아웃 템플릿(hasCaptionSpace)을 적용할 때 자동으로
  // 만들어주는 캡션 텍스트박스예요. id를 이 접두어로 시작하게 해서(2026-09-24 추가),
  // 같은 자리에 이미 자동 생성된 캡션 박스가 있으면 재적용 시 또 만들지 않고 건너뛸 수
  // 있게 해요(사용자가 이미 입력한 문구를 덮어쓰지 않으려고, 재적용 때 이 id를 가진
  // 박스가 있으면 그대로 둬요 — 위치/텍스트 둘 다 안 건드림). 스프레드 인덱스가 바뀌어도
  // (스프레드 추가/삭제로 순서가 밀려도) 항상 같은 접두어라서 판별이 흔들리지 않아요.
  const AUTO_CAPTION_ID_PREFIX = "autocaption-";
  function hasAutoCaptionBox(boxes: TextBoxDef[] | undefined): boolean {
    return (boxes ?? []).some((b) => b.id.startsWith(AUTO_CAPTION_ID_PREFIX));
  }
  // captionSlotFor()가 계산한 캡션 영역(그 페이지/표지면 자신을 0~100으로 보는 좌표 —
  // 사진 슬롯과 완전히 같은 좌표계라서 변환 없이 그대로 xPct/yPct/widthPct/heightPct에
  // 넣어요)에 맞춰 빈 텍스트박스를 하나 만들어요. 기본 서체/정렬은 makeTextBox()와
  // 비슷하되, 문구 공간 안에서 가운데 정렬(가로·세로 모두)로 둬서 바로 보기 좋게 했어요.
  function makeCaptionTextBox(slot: LayoutSlot): TextBoxDef {
    return {
      id: `${AUTO_CAPTION_ID_PREFIX}${crypto.randomUUID()}`,
      text: "",
      xPct: slot.xPct,
      yPct: slot.yPct,
      widthPct: slot.widthPct,
      heightPct: slot.heightPct,
      fontFamily: fontOptions[0].id,
      fontScale: 1,
      color: "#1a1a1a",
      align: "center",
      verticalAlign: "middle",
      bold: false,
    };
  }

  // 내지 페이지(스프레드 하나의 왼쪽/오른쪽 낱장)에 텍스트박스를 추가·수정·삭제해요.
  function handleAddTextBox(spreadIndex: number, side: "left" | "right") {
    const box = makeTextBox();
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [key]: [...(s[key] ?? []), box] } : s))
    );
    selectTextBox({ scope: "spread", spreadIndex, side }, box.id);
  }

  function handleTextBoxChange(
    spreadIndex: number,
    side: "left" | "right",
    boxId: string,
    changes: Partial<TextBoxDef>
  ) {
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, [key]: (s[key] ?? []).map((b) => (b.id === boxId ? { ...b, ...changes } : b)) }
          : s
      )
    );
  }

  function handleDeleteTextBox(spreadIndex: number, side: "left" | "right", boxId: string) {
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [key]: (s[key] ?? []).filter((b) => b.id !== boxId) } : s))
    );
  }

  // 표지 앞면 텍스트박스예요. 스프레드가 아니라서 별도 state(coverTextBoxes)로 따로 관리해요.
  function handleAddCoverTextBox() {
    const box = makeTextBox();
    setCoverTextBoxes((prev) => [...prev, box]);
    selectTextBox({ scope: "cover" }, box.id);
  }

  function handleCoverTextBoxChange(boxId: string, changes: Partial<TextBoxDef>) {
    setCoverTextBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteCoverTextBox(boxId: string) {
    setCoverTextBoxes((prev) => prev.filter((b) => b.id !== boxId));
  }

  // 뒤표지 텍스트박스예요. 표지 앞면(coverTextBoxes)과 같은 방식으로, 별도 state로
  // 관리해요.
  function handleAddBackCoverTextBox() {
    const box = makeTextBox();
    setBackCoverTextBoxes((prev) => [...prev, box]);
    selectTextBox({ scope: "backCover" }, box.id);
  }

  function handleBackCoverTextBoxChange(boxId: string, changes: Partial<TextBoxDef>) {
    setBackCoverTextBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteBackCoverTextBox(boxId: string) {
    setBackCoverTextBoxes((prev) => prev.filter((b) => b.id !== boxId));
  }

  // 새 표(테이블) 박스를 기본값으로 만들어요(기본형, 2026-09-25 "표 만들기" 요청) —
  // rows×cols 격자에 빈 셀 문자열을 채워서 시작해요.
  function makeTableBox(rows: number, cols: number): TableBoxDef {
    const safeRows = Math.max(1, Math.min(20, rows));
    const safeCols = Math.max(1, Math.min(20, cols));
    return {
      id: crypto.randomUUID(),
      xPct: 20,
      yPct: 30,
      widthPct: 60,
      heightPct: 30,
      rows: safeRows,
      cols: safeCols,
      cells: Array(safeRows * safeCols).fill(""),
      fontScale: 1,
      borderColor: "#94A3B8",
    };
  }

  // 내지 페이지(스프레드)에 표를 추가·수정·삭제해요. imageBoxes와 같이 스프레드 전체가
  // 공유하는 배열(spread.tableBoxes)이에요 — 페이지 경계를 자유롭게 넘나들 수 있어요.
  function handleAddTableBox(spreadIndex: number, rows: number, cols: number) {
    const box = makeTableBox(rows, cols);
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, tableBoxes: [...(s.tableBoxes ?? []), box] } : s))
    );
    setActiveTableBox({ scope: "spread", spreadIndex, boxId: box.id });
  }

  function handleTableBoxChange(spreadIndex: number, boxId: string, changes: Partial<TableBoxDef>) {
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, tableBoxes: (s.tableBoxes ?? []).map((b) => (b.id === boxId ? { ...b, ...changes } : b)) }
          : s
      )
    );
  }

  function handleDeleteTableBox(spreadIndex: number, boxId: string) {
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, tableBoxes: (s.tableBoxes ?? []).filter((b) => b.id !== boxId) } : s))
    );
    setActiveTableBox((prev) => (prev?.boxId === boxId ? null : prev));
  }

  // 표지 앞면 표(테이블) 박스예요. coverTextBoxes와 같은 방식으로 별도 state로 관리해요.
  function handleAddCoverTableBox(rows: number, cols: number) {
    const box = makeTableBox(rows, cols);
    setCoverTableBoxes((prev) => [...prev, box]);
    setActiveTableBox({ scope: "cover", boxId: box.id });
  }

  function handleCoverTableBoxChange(boxId: string, changes: Partial<TableBoxDef>) {
    setCoverTableBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteCoverTableBox(boxId: string) {
    setCoverTableBoxes((prev) => prev.filter((b) => b.id !== boxId));
    setActiveTableBox((prev) => (prev?.boxId === boxId ? null : prev));
  }

  // 뒤표지 표(테이블) 박스예요.
  function handleAddBackCoverTableBox(rows: number, cols: number) {
    const box = makeTableBox(rows, cols);
    setBackCoverTableBoxes((prev) => [...prev, box]);
    setActiveTableBox({ scope: "backCover", boxId: box.id });
  }

  function handleBackCoverTableBoxChange(boxId: string, changes: Partial<TableBoxDef>) {
    setBackCoverTableBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }

  function handleDeleteBackCoverTableBox(boxId: string) {
    setBackCoverTableBoxes((prev) => prev.filter((b) => b.id !== boxId));
    setActiveTableBox((prev) => (prev?.boxId === boxId ? null : prev));
  }

  // 이모티콘은 별도 데이터 구조 없이, 기존 텍스트박스 구조(TextBoxDef)를 그대로
  // 재사용해요(혜민님이 고른 "이모지 문자로 삽입" 방식) — text 자리에 이모지 한
  // 글자를 크게(fontScale 3) 넣고 가운데 정렬해서 만들어요. 화면·실행취소·저장/불러오기·
  // 인쇄까지 기존 텍스트박스 기능을 100% 그대로 타요. ⚠️ 인쇄 PDF에서 이모지가 보이는
  // 모양은 서버(인쇄 파일을 만드는 브라우저)에 설치된 폰트가 그 이모지를 지원하는지에
  // 따라 화면과 살짝 다르게 나올 수 있어요.
  function makeEmojiTextBox(emoji: string): TextBoxDef {
    return {
      id: crypto.randomUUID(),
      text: emoji,
      xPct: 40,
      yPct: 40,
      widthPct: 20,
      heightPct: 20,
      fontFamily: fontOptions[0].id,
      fontScale: 3,
      color: "#1a1a1a",
      align: "center",
      verticalAlign: "middle",
      bold: false,
    };
  }

  function handleAddEmojiTextBox(spreadIndex: number, side: "left" | "right", emoji: string) {
    const box = makeEmojiTextBox(emoji);
    const key = side === "left" ? "textBoxesLeft" : "textBoxesRight";
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, [key]: [...(s[key] ?? []), box] } : s))
    );
    selectTextBox({ scope: "spread", spreadIndex, side }, box.id);
  }

  function handleAddCoverEmojiTextBox(target: "front" | "back", emoji: string) {
    const box = makeEmojiTextBox(emoji);
    if (target === "front") {
      setCoverTextBoxes((prev) => [...prev, box]);
      selectTextBox({ scope: "cover" }, box.id);
    } else {
      setBackCoverTextBoxes((prev) => [...prev, box]);
      selectTextBox({ scope: "backCover" }, box.id);
    }
  }


  // 지금 선택된 텍스트박스가 어디(표지 앞면·뒤표지인지, 어느 스프레드의 왼쪽/오른쪽
  // 낱장인지) 있는지 가리켜요. 상단 툴바(TextBoxToolbar)가 이 값 하나만 보고 어떤
  // 텍스트박스를 고치는지 알 수 있게 해요.
  const [activeTextBox, setActiveTextBox] = useState<{ ref: TextBoxRef; boxId: string } | null>(null);

  // 다중 선택(정렬/분배 패널, 2026-09 추가)에 들어있는 텍스트박스들이에요. 반드시 같은
  // TextBoxRef(같은 표지 앞면/뒤표지/같은 스프레드의 같은 쪽 낱장) 안에서만 묶여요 —
  // 좌표계가 다른 텍스트박스끼리(예: 왼쪽 페이지와 오른쪽 페이지) 정렬을 시도하면 결과가
  // 어긋날 수 있어서, 아예 이 타입 자체가 "한 ref, 여러 boxId" 구조로 섞이는 걸
  // 막아요(다른 ref의 박스를 Shift+클릭하면 그 ref로 다중 선택이 새로 시작돼요 — 아래
  // toggleTextBoxMultiSelect 참고). 이미지박스는 아직 다중 선택 대상이 아니에요(내지
  // 자유배치 이미지박스는 스프레드 전체(0~100%) 기준인데, 텍스트박스는 그 페이지 자신
  // (0~100%) 기준이라 두 좌표계가 섞이면 위치가 어긋나요 — 2026-09 이번 라운드에서는
  // 텍스트박스만 지원해요).
  const [multiTextSelection, setMultiTextSelection] = useState<{ ref: TextBoxRef; boxIds: string[] } | null>(
    null
  );

  // 텍스트박스를 캔버스에서 선택하면 왼쪽 패널이 자동으로 "텍스트" 탭으로 전환돼서
  // 바로 속성을 고칠 수 있게 해요(2026-09, 표지 제목·텍스트박스 메뉴 통합). setState를
  // 이펙트 안에서 동기 호출하면 렌더가 연쇄될 수 있어서, 선택이 실제로 바뀌는
  // 이벤트 핸들러 쪽에서 직접 호출하는 방식(selectTextBox)으로 처리해요.
  function selectTextBox(ref: TextBoxRef, boxId: string) {
    setMultiTextSelection(null);
    setMultiImageSelection(null);
    setActiveImageBox(null);
    setActiveTextBox({ ref, boxId });
    setBackCoverLogoSelected(false);
    if (ref.scope === "cover" || ref.scope === "backCover") {
      setActiveCoverEditTab("text");
      // 2026-10-05, 혜민님 요청: 앞/뒤표지 텍스트박스 추가 버튼을 "글상자 추가" 하나로
      // 합치면서, 사진박스처럼 텍스트박스를 선택해도 "지금 작업 중인 쪽"이 자동으로
      // 갱신되게 함(selectCoverImageBox와 같은 패턴).
      setCoverLayoutApplyTarget(ref.scope === "backCover" ? "back" : "front");
    } else if (ref.scope === "spread") {
      setActiveEditTab("text");
    }
  }

  // Shift+클릭으로 텍스트박스를 다중 선택 목록에 넣거나 빼요(정렬/분배 패널용,
  // 2026-09 추가). 다른 ref(다른 표지면/다른 스프레드·쪽)의 박스를 Shift+클릭하면
  // 기존 다중 선택은 버리고 그 ref로 새로 시작해요 — 서로 다른 좌표계를 한 선택 안에
  // 섞지 않기 위해서예요(위 multiTextSelection 주석 참고). 단일 선택(activeTextBox)은
  // 다중 선택 중엔 패널이 헷갈리지 않도록 비워둬요.
  function toggleTextBoxMultiSelect(ref: TextBoxRef, boxId: string) {
    setActiveTextBox(null);
    setBackCoverLogoSelected(false);
    setActiveCoverImageBox(null);
    setActiveImageBox(null);
    // 같은 스프레드의 사진박스 다중 선택은 그대로 둬요(사진+텍스트 혼합 다중 선택,
    // 2026-09-28 추가) — 다른 스프레드/표지 쪽이면(좌표계가 달라서) 새로 시작해요.
    setMultiImageSelection((prev) =>
      prev && ref.scope === "spread" && prev.spreadIndex === ref.spreadIndex ? prev : null
    );
    if (ref.scope === "cover" || ref.scope === "backCover") {
      setActiveCoverEditTab("text");
    } else if (ref.scope === "spread") {
      setActiveEditTab("text");
    }
    setMultiTextSelection((prev) => {
      if (!prev || !textBoxRefsEqual(prev.ref, ref)) {
        return { ref, boxIds: [boxId] };
      }
      const exists = prev.boxIds.includes(boxId);
      const boxIds = exists ? prev.boxIds.filter((id) => id !== boxId) : [...prev.boxIds, boxId];
      return boxIds.length > 0 ? { ref, boxIds } : null;
    });
  }

  function getTextBoxesForRef(ref: TextBoxRef): TextBoxDef[] {
    if (ref.scope === "cover") return coverTextBoxes;
    if (ref.scope === "backCover") return backCoverTextBoxes;
    const spread = customSpreads[ref.spreadIndex];
    if (!spread) return [];
    return (ref.side === "left" ? spread.textBoxesLeft : spread.textBoxesRight) ?? [];
  }

  function updateTextBoxByRef(ref: TextBoxRef, boxId: string, changes: Partial<TextBoxDef>) {
    if (ref.scope === "cover") handleCoverTextBoxChange(boxId, changes);
    else if (ref.scope === "backCover") handleBackCoverTextBoxChange(boxId, changes);
    else handleTextBoxChange(ref.spreadIndex, ref.side, boxId, changes);
  }

  function deleteTextBoxByRef(ref: TextBoxRef, boxId: string) {
    if (ref.scope === "cover") handleDeleteCoverTextBox(boxId);
    else if (ref.scope === "backCover") handleDeleteBackCoverTextBox(boxId);
    else handleDeleteTextBox(ref.spreadIndex, ref.side, boxId);
    setActiveTextBox(null);
  }

  // 지금 다중 선택된 텍스트박스들의 실제 데이터(TextBoxDef)예요 — multiTextSelection은
  // ref+id만 들고 있어서, 정렬 계산에 필요한 xPct/widthPct 등은 여기서 매번 다시 찾아요.
  function multiTextSelectedBoxes(): TextBoxDef[] {
    if (!multiTextSelection) return [];
    const all = getTextBoxesForRef(multiTextSelection.ref);
    return multiTextSelection.boxIds
      .map((id) => all.find((b) => b.id === id))
      .filter((b): b is TextBoxDef => !!b);
  }

  // 다중 선택된 텍스트박스들에 계산한 변경사항(changesById)을 한 번의 setState 호출로
  // 적용해요 — applyLayoutTemplate과 같은 패턴이에요(여러 박스를 한꺼번에 바꾸는 한
  // 번의 상태 변경 = 실행취소 스택엔 한 단계만 쌓여요, buildHistorySnapshot이 매 렌더
  // 끝에 한 번만 스냅샷을 찍고 그 전후 차이를 실행취소 한 단계로 묶기 때문이에요 —
  // 박스마다 따로 setState를 호출해도 React 18에서는 한 이벤트 핸들러 안이면 어차피
  // 한 번에 커밋되긴 하지만, applyLayoutTemplate과 똑같이 "박스 배열 하나를 한 번에
  // 통째로 바꾸는" 방식으로 맞춰서 실행취소가 확실히 한 단계로 묶이게 했어요).
  function applyTextBoxAlignment(changesById: Map<string, Partial<TextBoxDef>>) {
    if (!multiTextSelection || changesById.size === 0) return;
    const ref = multiTextSelection.ref;
    if (ref.scope === "cover") {
      setCoverTextBoxes((prev) =>
        prev.map((b) => (changesById.has(b.id) ? { ...b, ...changesById.get(b.id)! } : b))
      );
    } else if (ref.scope === "backCover") {
      setBackCoverTextBoxes((prev) =>
        prev.map((b) => (changesById.has(b.id) ? { ...b, ...changesById.get(b.id)! } : b))
      );
    } else {
      const key = ref.side === "left" ? "textBoxesLeft" : "textBoxesRight";
      setCustomSpreads((prev) =>
        prev.map((s, i) =>
          i === ref.spreadIndex
            ? {
                ...s,
                [key]: (s[key] ?? []).map((b) =>
                  changesById.has(b.id) ? { ...b, ...changesById.get(b.id)! } : b
                ),
              }
            : s
        )
      );
    }
  }

  // 다중 선택 정렬(align) — "선택한 박스들의 바운딩 박스"를 기준으로 맞춰요(가장 왼쪽
  // 끝·오른쪽 끝·위쪽 끝·아래쪽 끝을 계산해서 거기 맞춤). 가로(left/hcenter/right)는
  // xPct·widthPct만 쓰니까 항상 계산할 수 있어요. 세로(top/vmiddle/bottom) 중
  // top은 yPct만 있으면 되지만, vmiddle·bottom은 박스의 실제 높이(heightPct)가 있어야
  // 계산할 수 있어요 — heightPct가 없는 박스(글자 양에 맞춰 자동으로 늘어나는 박스,
  // TextBoxDef.heightPct가 optional인 이유예요)는 화면에 실제로 렌더링해봐야 높이를 알 수
  // 있어서, 여기 데이터만으로는 정확한 위치를 계산할 수 없어요. 그래서 vmiddle·bottom은
  // 선택된 박스 전부가 heightPct를 갖고 있을 때만 패널에서 활성화돼요(MultiTextAlignPanel의
  // canVerticalAlign) — 잘못된 값으로 텍스트박스를 화면 밖으로 밀어내거나 겹치게 만들
  // 위험을 피하려고 일부러 막아뒀어요.
  function computeTextBoxAlignChanges(
    boxes: TextBoxDef[],
    mode: TextBoxAlignMode
  ): Map<string, Partial<TextBoxDef>> {
    const changes = new Map<string, Partial<TextBoxDef>>();
    if (boxes.length < 2) return changes;
    if (mode === "left" || mode === "hcenter" || mode === "right") {
      const lefts = boxes.map((b) => b.xPct);
      const rights = boxes.map((b) => b.xPct + b.widthPct);
      const minLeft = Math.min(...lefts);
      const maxRight = Math.max(...rights);
      const centerX = (minLeft + maxRight) / 2;
      boxes.forEach((b) => {
        const xPct = mode === "left" ? minLeft : mode === "right" ? maxRight - b.widthPct : centerX - b.widthPct / 2;
        changes.set(b.id, { xPct });
      });
      return changes;
    }
    const tops = boxes.map((b) => b.yPct);
    const minTop = Math.min(...tops);
    if (mode === "top") {
      boxes.forEach((b) => changes.set(b.id, { yPct: minTop }));
      return changes;
    }
    if (boxes.some((b) => b.heightPct === undefined)) return changes; // 안전장치 — UI에서도 막지만 이중 확인
    const bottoms = boxes.map((b) => b.yPct + (b.heightPct as number));
    const maxBottom = Math.max(...bottoms);
    const centerY = (minTop + maxBottom) / 2;
    boxes.forEach((b) => {
      const h = b.heightPct as number;
      const yPct = mode === "bottom" ? maxBottom - h : centerY - h / 2;
      changes.set(b.id, { yPct });
    });
    return changes;
  }

  // 다중 선택 분배(distribute) — 3개 이상 선택했을 때만 의미가 있어요(2개는 "간격"이라는
  // 개념 자체가 없어요). 제일 왼쪽(또는 위쪽) 박스와 제일 오른쪽(또는 아래쪽) 박스는
  // 그 자리 그대로 두고, 그 사이 박스들 간격이 전부 같아지도록 다시 배치해요(일러스트
  // 레이터 "가로 간격 분배"와 같은 방식). 세로 분배는 align과 같은 이유로 heightPct가
  // 없는 박스가 섞여 있으면 계산하지 않아요.
  function computeTextBoxDistributeChanges(
    boxes: TextBoxDef[],
    axis: "horizontal" | "vertical"
  ): Map<string, Partial<TextBoxDef>> {
    const changes = new Map<string, Partial<TextBoxDef>>();
    if (boxes.length < 3) return changes;
    if (axis === "horizontal") {
      const sorted = [...boxes].sort((a, b) => a.xPct - b.xPct);
      const spanLeft = sorted[0].xPct;
      const last = sorted[sorted.length - 1];
      const spanRight = last.xPct + last.widthPct;
      const sumWidths = sorted.reduce((sum, b) => sum + b.widthPct, 0);
      const gap = (spanRight - spanLeft - sumWidths) / (sorted.length - 1);
      let cursor = spanLeft;
      sorted.forEach((b) => {
        changes.set(b.id, { xPct: cursor });
        cursor += b.widthPct + gap;
      });
      return changes;
    }
    if (boxes.some((b) => b.heightPct === undefined)) return changes;
    const sorted = [...boxes].sort((a, b) => a.yPct - b.yPct);
    const spanTop = sorted[0].yPct;
    const last = sorted[sorted.length - 1];
    const spanBottom = last.yPct + (last.heightPct as number);
    const sumHeights = sorted.reduce((sum, b) => sum + (b.heightPct as number), 0);
    const gap = (spanBottom - spanTop - sumHeights) / (sorted.length - 1);
    let cursor = spanTop;
    sorted.forEach((b) => {
      changes.set(b.id, { yPct: cursor });
      cursor += (b.heightPct as number) + gap;
    });
    return changes;
  }

  function alignMultiTextBoxes(mode: TextBoxAlignMode) {
    applyTextBoxAlignment(computeTextBoxAlignChanges(multiTextSelectedBoxes(), mode));
  }

  function distributeMultiTextBoxes(axis: "horizontal" | "vertical") {
    applyTextBoxAlignment(computeTextBoxDistributeChanges(multiTextSelectedBoxes(), axis));
  }

  const activeTextBoxDef: TextBoxDef | null = activeTextBox
    ? getTextBoxesForRef(activeTextBox.ref).find((b) => b.id === activeTextBox.boxId) ?? null
    : null;

  // ---- 자유 배치 이미지박스(스프레드 전체 기준) ----
  // 지금 선택된 이미지박스가 어느 스프레드에 있는지 가리켜요.
  const [activeImageBox, setActiveImageBox] = useState<{ spreadIndex: number; boxId: string } | null>(null);
  // 이미지박스 다중 선택(Shift+클릭, 2026-09-26 추가 — 텍스트박스의 multiTextSelection과
  // 같은 패턴이에요). 사진박스는 텍스트박스와 달리 처음부터 "스프레드 전체"를 공유하는
  // 좌표계라서(왼쪽/오른쪽 낱장을 안 나눠요), ref 대신 spreadIndex 하나만 있으면 돼요 —
  // 다른 스프레드의 박스를 Shift+클릭하면 새 스프레드로 다중 선택이 새로 시작돼요. 이번
  // 라운드는 내지 스프레드 안의 사진박스만 지원해요(표지 칸의 사진박스는 다음에).
  const [multiImageSelection, setMultiImageSelection] = useState<{ spreadIndex: number; boxIds: string[] } | null>(
    null
  );
  // 이미지박스를 캔버스에서 선택하면 왼쪽 패널이 자동으로 "꾸미기" 탭으로 전환돼서
  // 바로 그 사진의 속성을 고칠 수 있게 해요(2026-09, selectTextBox와 같은 패턴).
  // 확대/축소·스크롤 위치(canvasZoom/canvasFitToken)는 건드리지 않고 탭만 바꿔요.
  function selectImageBox(spreadIndex: number, boxId: string, knownBox?: ImageBoxDef) {
    setActiveTextBox(null);
    setMultiImageSelection(null);
    setMultiTextSelection(null);
    setImageBoxPhotoEditActive(false);
    setActiveImageBox({ spreadIndex, boxId });
    // 스티커(손글씨스티커 포함)는 "사진" 탭에 편집할 속성(꽉 채우기/변형mm/사진 위치
    // 조정)이 아예 없어서, 선택해도 왼쪽 패널을 "사진" 탭으로 옮기지 않아요 — 혜민님이
    // "스티커 선택했을때 사진 메뉴로 이동하는 오류"로 보고하신 버그 수정(2026-09-24).
    // 캔버스에서 스티커를 클릭하면 지금 열려있는 탭(보통 스티커/손글씨스티커) 그대로
    // 둔 채로 이동·크기조절만 가능한 선택 상태가 돼요.
    // knownBox: 방금 만든 박스를 곧바로 선택할 때(예: handleAddImageBoxFromUrl)는
    // setCustomSpreads의 상태 반영이 아직 안 된 시점이라 customSpreads에서 못 찾아서
    // (undefined) 스티커여도 무조건 "사진" 탭으로 튀는 버그가 있었어요("스티커를
    // 선택해서 책자 위에 올라가면 사진 패널이 선택됩니다", 2026-09-27) — 호출하는 쪽이
    // 이미 만든 박스를 알고 있으면 이걸로 직접 넘겨서 이 상태 지연 문제를 피해요.
    const box = knownBox ?? customSpreads[spreadIndex]?.imageBoxes?.find((b) => b.id === boxId);
    if (!box || !isStickerImageBox(box)) {
      setActiveEditTab("photo");
    }
  }

  // 사진박스 복사(Ctrl/Cmd+Alt+D=제자리 복사, Ctrl/Cmd+Alt+Shift+D=같은 선상(x축)
  // 복사, 2026-09-28 추가 — 일러스트레이터 Alt-드래그 복사를 단축키로 옮긴 거예요).
  function handleDuplicateActiveImageBox(axisOnly: boolean) {
    if (!activeImageBox) return;
    const spreadIndex = activeImageBox.spreadIndex;
    const box = customSpreads[spreadIndex]?.imageBoxes?.find((b) => b.id === activeImageBox.boxId);
    if (!box) return;
    const newBox: ImageBoxDef = {
      ...box,
      id: crypto.randomUUID(),
      xPct: Math.min(96 - box.widthPct, box.xPct + 4),
      yPct: axisOnly ? box.yPct : Math.min(96 - box.heightPct, box.yPct + 4),
    };
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, imageBoxes: [...(s.imageBoxes ?? []), newBox] } : s))
    );
    selectImageBox(spreadIndex, newBox.id, newBox);
  }

  // Shift+클릭으로 이미지박스를 다중 선택 목록에 넣거나 빼요(정렬 툴바용,
  // 2026-09-26 추가) — toggleTextBoxMultiSelect와 같은 패턴이에요.
  function toggleImageBoxMultiSelect(spreadIndex: number, boxId: string) {
    setActiveImageBox(null);
    setActiveTextBox(null);
    // 같은 스프레드의 텍스트박스 다중 선택은 그대로 둬요(사진+텍스트 혼합 다중 선택,
    // 2026-09-28 추가).
    setMultiTextSelection((prev) =>
      prev && prev.ref.scope === "spread" && prev.ref.spreadIndex === spreadIndex ? prev : null
    );
    setImageBoxPhotoEditActive(false);
    setMultiImageSelection((prev) => {
      if (!prev || prev.spreadIndex !== spreadIndex) {
        return { spreadIndex, boxIds: [boxId] };
      }
      const exists = prev.boxIds.includes(boxId);
      const boxIds = exists ? prev.boxIds.filter((id) => id !== boxId) : [...prev.boxIds, boxId];
      return boxIds.length > 0 ? { spreadIndex, boxIds } : null;
    });
  }

  // 지금 다중 선택된 이미지박스들의 실제 데이터예요(정렬 계산용).
  function multiSelectedImageBoxes(): ImageBoxDef[] {
    if (!multiImageSelection) return [];
    const all = customSpreads[multiImageSelection.spreadIndex]?.imageBoxes ?? [];
    return multiImageSelection.boxIds
      .map((id) => all.find((b) => b.id === id))
      .filter((b): b is ImageBoxDef => !!b);
  }

  // 다중 선택된 이미지박스들에 계산한 변경사항을 한 번에 적용해요(applyTextBoxAlignment와
  // 같은 패턴 — 실행취소가 한 단계로 묶여요).
  function applyImageBoxAlignment(changesById: Map<string, Partial<ImageBoxDef>>) {
    if (!multiImageSelection || changesById.size === 0) return;
    const spreadIndex = multiImageSelection.spreadIndex;
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? {
              ...s,
              imageBoxes: (s.imageBoxes ?? []).map((b) =>
                changesById.has(b.id) ? { ...b, ...changesById.get(b.id)! } : b
              ),
            }
          : s
      )
    );
  }

  // 이미지박스 정렬(align) — computeTextBoxAlignChanges와 같은 계산이지만, 이미지박스는
  // heightPct가 항상 있어서(선택사항인 텍스트박스와 달리) 세로 정렬도 항상 계산할 수
  // 있어요 — 그래서 guard 없이 더 단순해요.
  function computeImageBoxAlignChanges(
    boxes: ImageBoxDef[],
    mode: TextBoxAlignMode
  ): Map<string, Partial<ImageBoxDef>> {
    const changes = new Map<string, Partial<ImageBoxDef>>();
    if (boxes.length < 2) return changes;
    if (mode === "left" || mode === "hcenter" || mode === "right") {
      const lefts = boxes.map((b) => b.xPct);
      const rights = boxes.map((b) => b.xPct + b.widthPct);
      const minLeft = Math.min(...lefts);
      const maxRight = Math.max(...rights);
      const centerX = (minLeft + maxRight) / 2;
      boxes.forEach((b) => {
        const xPct = mode === "left" ? minLeft : mode === "right" ? maxRight - b.widthPct : centerX - b.widthPct / 2;
        changes.set(b.id, { xPct });
      });
      return changes;
    }
    const tops = boxes.map((b) => b.yPct);
    const bottoms = boxes.map((b) => b.yPct + b.heightPct);
    const minTop = Math.min(...tops);
    const maxBottom = Math.max(...bottoms);
    const centerY = (minTop + maxBottom) / 2;
    boxes.forEach((b) => {
      const yPct = mode === "top" ? minTop : mode === "bottom" ? maxBottom - b.heightPct : centerY - b.heightPct / 2;
      changes.set(b.id, { yPct });
    });
    return changes;
  }

  function alignMultiImageBoxes(mode: TextBoxAlignMode) {
    applyImageBoxAlignment(computeImageBoxAlignChanges(multiSelectedImageBoxes(), mode));
  }

  // 다중 선택된 이미지박스들의 바운딩 박스예요(스프레드 전체 0~100% 기준) — 캔버스 위
  // 정렬 툴바를 이 자리 근처(오른쪽 위)에 띄우는 데 써요.
  function multiImageSelectionBounds(): { left: number; top: number; right: number; bottom: number } | null {
    const boxes = multiSelectedImageBoxes();
    if (boxes.length < 2) return null;
    const left = Math.min(...boxes.map((b) => b.xPct));
    const top = Math.min(...boxes.map((b) => b.yPct));
    const right = Math.max(...boxes.map((b) => b.xPct + b.widthPct));
    const bottom = Math.max(...boxes.map((b) => b.yPct + b.heightPct));
    return { left, top, right, bottom };
  }

  // 사진박스 다중 선택 + 텍스트박스 다중 선택이 "같은 스프레드"에서 동시에 있을 때가
  // 혼합(사진+텍스트) 다중 선택이에요(2026-09-28 추가 — toggleImageBoxMultiSelect/
  // toggleTextBoxMultiSelect가 이제 서로를 지우지 않고 같은 스프레드면 유지해요).
  function spreadMultiSelectionKind(spreadIndex: number): "none" | "image" | "text" | "mixed" {
    const imgCount = multiImageSelection?.spreadIndex === spreadIndex ? multiImageSelection.boxIds.length : 0;
    const txtCount =
      multiTextSelection?.ref.scope === "spread" && multiTextSelection.ref.spreadIndex === spreadIndex
        ? multiTextSelection.boxIds.length
        : 0;
    if (imgCount > 0 && txtCount > 0) return "mixed";
    if (imgCount >= 2) return "image";
    if (txtCount >= 2) return "text";
    return "none";
  }

  // 텍스트박스의 페이지 기준(0~100%, 왼쪽/오른쪽 낱장 폭) 좌표를 사진박스와 같은
  // 스프레드 전체 기준(0~100%) 좌표로 바꿔요 — 혼합 다중 선택의 공통 바운딩 박스·정렬
  // 계산에 써요.
  function textBoxSpreadRect(
    box: TextBoxDef,
    side: "left" | "right"
  ): { left: number; top: number; right: number; bottom: number } {
    const left = side === "left" ? box.xPct * 0.5 : 50 + box.xPct * 0.5;
    const width = box.widthPct * 0.5;
    const top = box.yPct;
    const bottom = box.yPct + (box.heightPct ?? 0);
    return { left, top, right: left + width, bottom };
  }

  // 혼합(사진+텍스트) 다중 선택의 공통 바운딩 박스예요(스프레드 전체 0~100% 기준).
  function combinedMultiSelectionBounds(
    spreadIndex: number
  ): { left: number; top: number; right: number; bottom: number } | null {
    if (spreadMultiSelectionKind(spreadIndex) !== "mixed") return null;
    const imgBoxes = multiSelectedImageBoxes();
    const side = (multiTextSelection!.ref as { side: "left" | "right" }).side;
    const txtBoxes = multiTextSelectedBoxes();
    const rects = [
      ...imgBoxes.map((b) => ({ left: b.xPct, top: b.yPct, right: b.xPct + b.widthPct, bottom: b.yPct + b.heightPct })),
      ...txtBoxes.map((b) => textBoxSpreadRect(b, side)),
    ];
    if (rects.length === 0) return null;
    return {
      left: Math.min(...rects.map((r) => r.left)),
      top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  }

  // 혼합(사진+텍스트) 다중 선택 정렬 — 공통 바운딩 박스를 기준으로 사진박스는
  // computeImageBoxAlignChanges와 같은 계산을, 텍스트박스는 좌표를 스프레드 전체
  // 기준으로 바꿔서 같은 계산을 한 뒤 다시 페이지 기준으로 되돌려요. 텍스트박스의
  // 세로(vmiddle/bottom) 정렬은 computeTextBoxAlignChanges와 같은 이유로 heightPct가
  // 있는 박스만 적용돼요(2026-09-28 추가).
  function alignCombinedSelection(spreadIndex: number, mode: TextBoxAlignMode) {
    const bounds = combinedMultiSelectionBounds(spreadIndex);
    if (!bounds) return;
    const side = (multiTextSelection!.ref as { side: "left" | "right" }).side;
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;

    const imgChanges = new Map<string, Partial<ImageBoxDef>>();
    multiSelectedImageBoxes().forEach((b) => {
      if (mode === "left" || mode === "hcenter" || mode === "right") {
        const xPct = mode === "left" ? bounds.left : mode === "right" ? bounds.right - b.widthPct : centerX - b.widthPct / 2;
        imgChanges.set(b.id, { xPct });
      } else {
        const yPct = mode === "top" ? bounds.top : mode === "bottom" ? bounds.bottom - b.heightPct : centerY - b.heightPct / 2;
        imgChanges.set(b.id, { yPct });
      }
    });

    const txtChanges = new Map<string, Partial<TextBoxDef>>();
    multiTextSelectedBoxes().forEach((b) => {
      const widthSpread = b.widthPct * 0.5;
      if (mode === "left" || mode === "hcenter" || mode === "right") {
        const xSpread =
          mode === "left" ? bounds.left : mode === "right" ? bounds.right - widthSpread : centerX - widthSpread / 2;
        const xPct = side === "left" ? xSpread / 0.5 : (xSpread - 50) / 0.5;
        txtChanges.set(b.id, { xPct });
      } else if (mode === "top") {
        txtChanges.set(b.id, { yPct: bounds.top });
      } else if (b.heightPct !== undefined) {
        const yPct = mode === "bottom" ? bounds.bottom - b.heightPct : centerY - b.heightPct / 2;
        txtChanges.set(b.id, { yPct });
      }
    });

    applyImageBoxAlignment(imgChanges);
    applyTextBoxAlignment(txtChanges);
  }
  // 지금 "선택된" 이미지박스가 사진 위치 조정 모드(더블클릭으로 들어가는 모드)인지예요.
  // 왼쪽 "사진" 편집 메뉴에 조작 버튼(확대/축소/반전/초기화/완료)을 보여줄지 결정하는 데
  // 써요(2026-09-22 추가) — 박스를 새로 선택할 때마다 항상 false로 시작해요(더블클릭
  // 해야만 다시 true가 됨, ImageBoxOverlay와 동일한 "항상 박스 모드로 시작" 규칙).
  const [imageBoxPhotoEditActive, setImageBoxPhotoEditActive] = useState(false);
  // 왼쪽 메뉴 버튼이 실제 박스 컴포넌트의 확대/축소/반전/초기화/완료 동작을 그대로
  // 호출할 수 있도록, 박스 id → 핸들 맵을 들고 있어요.
  const imageBoxHandlesRef = useRef<Map<string, ImageBoxOverlayHandle>>(new Map());

  // 사진 파일이든 스티커든 결국 "이미지박스 하나 추가"라 로직을 공유해요 — url과
  // 기본 크기(widthPct)만 다르게 넘겨요.
  function handleAddImageBoxFromUrl(spreadIndex: number, url: string, widthPct: number, kind?: "photo" | "sticker") {
    const img = new window.Image();
    img.onload = () => {
      // 스프레드 전체 폭이 페이지(정사각형) 두 배라서, 가로 %와 세로 %의 실제 축척이
      // 2:1이에요 — 새 이미지박스도 처음부터 원본 비율 그대로 보이도록 계산해요.
      // naturalWidth/naturalHeight를 못 읽어오는 경우(예: width/height 속성이 없는
      // SVG 등)에 0으로 나눠서 NaN이 되는 걸 막아요 — NaN이 되면 박스가 화면에 아예
      // 안 보이거나 편집기 전체가 멈추는 문제로 이어질 수 있어서, 이럴 땐 정사각형
      // (1:1)으로 안전하게 대체해요.
      const naturalWidth = img.naturalWidth || 1;
      const naturalHeight = img.naturalHeight || naturalWidth;
      const heightPct = 2 * widthPct * (naturalHeight / naturalWidth);
      // 스프레드 1(spreadIndex === 0)은 왼쪽 면이 인쇄 안 되는 표지 안쪽 면이라, 오른쪽
      // 페이지(1페이지) 안쪽에만 들어오도록 기본 위치를 오른쪽 절반(50~100%)으로 옮겨요.
      // 다른 스프레드는 기존처럼 펼침면 정중앙에 걸치도록 둬요.
      const xPct = spreadIndex === 0 ? Math.max(50, 100 - widthPct - 7) : 32;
      const yPct = 25;
      // 새로 만들 때는 박스(틀) 크기 자체가 이미 사진 비율과 정확히 일치하도록 계산했으니
      // (heightPct 계산식 참고), 확대/위치는 기본값(꽉 채움, 이동 없음)으로 시작해요 —
      // 이후 박스 크기를 자유롭게 조절해도 사진은 항상 박스를 빈틈없이 꽉 채워요
      // ("이미지를 불러올 때 꽉 채워지는 비율이 기본", 2026-09-22 확인).
      const spreadForZ = customSpreads[spreadIndex];
      const box: ImageBoxDef = {
        id: crypto.randomUUID(),
        url,
        naturalWidth,
        naturalHeight,
        xPct,
        yPct,
        widthPct,
        heightPct,
        innerOffsetXPct: 0,
        innerOffsetYPct: 0,
        innerScale: 1,
        kind,
        zOrder: nextTopZOrder(
          spreadForZ?.imageBoxes ?? [],
          [...(spreadForZ?.textBoxesLeft ?? []), ...(spreadForZ?.textBoxesRight ?? [])]
        ),
      };
      setCustomSpreads((prev) =>
        prev.map((s, i) =>
          i === spreadIndex
            ? {
                ...s,
                imageBoxes: [...(s.imageBoxes ?? []), box],
                imageBoxOrder: [...getSpreadImageBoxOrder(s), box.id],
              }
            : s
        )
      );
      selectImageBox(spreadIndex, box.id, box);
    };
    img.src = url;
  }

  function handleAddImageBox(spreadIndex: number, file: File) {
    const url = URL.createObjectURL(file);
    handleAddImageBoxFromUrl(spreadIndex, url, 36);
  }

  // "사진 1장(꽉 참/여백)" 페이지의 사진을 자유 배치 이미지박스로 전환해요(2026-09-22
  // 추가). 그 페이지 템플릿을 사진을 자동 배정받지 않는 "freeform"으로 바꾸고, 사진을
  // 원래 있던 자리(그 페이지 절반 영역)에 꼭 맞는 이미지박스로 새로 만들어요 — 그 뒤엔
  // 이미지박스이므로 자유롭게 끌어서 페이지 경계(책 가운데)를 넘나들 수 있어요. 원래
  // 사진은 전체 사진 목록(photos)에서도 함께 빼요 — 그래야 순서대로 자동 배정되는 다른
  // 페이지들의 사진이 밀리지 않고 그대로 유지돼요(이 페이지가 "사진 0장" 취급되면서
  // 정확히 사진 1장·자리 1칸이 함께 빠지는 셈이라 계산이 맞아떨어져요).
  function handleConvertPhotoToImageBox(spreadIndex: number, side: "left" | "right", realIndex: number) {
    const photo = photos[realIndex];
    if (!photo) return;
    const boxId = crypto.randomUUID();
    const box: ImageBoxDef = {
      id: boxId,
      url: photo.url,
      naturalWidth: photo.width || 1,
      naturalHeight: photo.height || 1,
      // 스프레드 전체 폭 기준 좌표라서, 원래 있던 자리(왼쪽 페이지=0~50%, 오른쪽
      // 페이지=50~100%)를 그대로 채우도록 잡아요 — 전환 직후엔 화면상 변화가 없고, 그
      // 다음부터 자유롭게 옮기고 크기를 바꿀 수 있어요.
      xPct: side === "left" ? 0 : 50,
      yPct: 0,
      widthPct: 50,
      heightPct: 100,
      innerOffsetXPct: 0,
      innerOffsetYPct: 0,
      innerScale: 1,
    };
    const key = side === "left" ? "left" : "right";
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? {
              ...s,
              [key]: "freeform",
              imageBoxes: [...(s.imageBoxes ?? []), box],
              imageBoxOrder: [...getSpreadImageBoxOrder(s), box.id],
            }
          : s
      )
    );
    handleRemovePhoto(realIndex);
    selectImageBox(spreadIndex, boxId, box);
  }

  function handleAddSticker(spreadIndex: number, stickerUrl: string) {
    handleAddImageBoxFromUrl(spreadIndex, stickerUrl, 14, "sticker");
  }

  // 표지(앞/뒤)에 스티커를 이미지박스로 추가해요 — 내지 handleAddImageBoxFromUrl과 같은
  // 패턴이되, 대상 배열이 coverImageBoxes/backCoverImageBoxes로 갈라져요(2026-09-27,
  // "표지에 스티커패널이 없어졌어요" 요청으로 새로 추가). 레이아웃 탭에서 이미 사진을
  // 여러 장 배치 중이 아니어도(=배열이 비어 기존 coverPhoto/backCoverPhoto 1장 방식이어도)
  // 스티커는 항상 이 배열에 더해요 — 스티커는 원래도 "여러 장 배치" 개념과 무관해요.
  function handleAddCoverImageBoxFromUrl(target: "front" | "back", url: string, widthPct: number, kind?: "photo" | "sticker") {
    const img = new window.Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth || 1;
      const naturalHeight = img.naturalHeight || naturalWidth;
      // 표지 앞/뒤 패널은 스프레드와 달리 세로:가로가 거의 1:1이라(정사각형 판형), 내지처럼
      // 2배 축척 보정을 하지 않고 패널 기준 %를 그대로 써요.
      const heightPct = widthPct * (naturalHeight / naturalWidth);
      const xPct = Math.max(0, (100 - widthPct) / 2);
      const yPct = 25;
      const box: ImageBoxDef = {
        id: crypto.randomUUID(),
        url,
        naturalWidth,
        naturalHeight,
        xPct,
        yPct,
        widthPct,
        heightPct,
        innerOffsetXPct: 0,
        innerOffsetYPct: 0,
        innerScale: 1,
        kind,
      };
      if (target === "front") {
        setCoverImageBoxes((prev) => [...prev, box]);
      } else {
        setBackCoverImageBoxes((prev) => [...prev, box]);
      }
      selectCoverImageBox(target, box.id, box);
    };
    img.src = url;
  }

  function handleAddCoverSticker(target: "front" | "back", stickerUrl: string) {
    handleAddCoverImageBoxFromUrl(target, stickerUrl, 14, "sticker");
  }

  // 2026-09-25 브리프 1단계 요청: 표지에도 손글씨 탭을 추가 — 내지 handleAddHandwriting과
  // 동일하게 handleAddCoverImageBoxFromUrl을 kind: "sticker"로 그대로 재사용해요(실제로
  // 캔버스에 이미지박스가 추가되는 진짜 기능이에요 — 눌러도 아무 일 없는 가짜 버튼이 아님).
  function handleAddCoverHandwriting(target: "front" | "back", handwritingUrl: string) {
    handleAddCoverImageBoxFromUrl(target, handwritingUrl, 14, "sticker");
  }

  // 2026-09-25, 혜민님 요청(항목1): "사진 올리기 버튼이 사라졌어요" — 레이아웃 탭에서
  // 사진을 2장 이상 배치한 뒤에는(coverImageBoxes.length > 1) "사진" 탭의 + 사진 추가
  // 버튼이 통째로 사라져서 더 이상 추가할 방법이 없었어요. handleAddCoverImageBoxFromUrl을
  // 그대로 재사용해서(스티커·손글씨와 같은 방식), 이미 여러 장 배치된 상태에서도 새 사진
  // 박스를 계속 더할 수 있게 했어요.
  function handleAddCoverPhotoBoxFromFile(target: "front" | "back", event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    handleAddCoverImageBoxFromUrl(target, url, 36, "photo");
    event.target.value = "";
  }

  // 손글씨 스티커도 스티커와 똑같이 이미지박스로 추가해요(kind: "sticker"도 동일하게
  // 붙여서 — 이동+비율유지 크기조절만 되는 스티커 전용 편집 방식이 그대로 적용돼요,
  // 2026-09-24).
  function handleAddHandwriting(spreadIndex: number, handwritingUrl: string) {
    handleAddImageBoxFromUrl(spreadIndex, handwritingUrl, 14, "sticker");
  }

  function handleImageBoxChange(spreadIndex: number, boxId: string, changes: Partial<ImageBoxDef>) {
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? { ...s, imageBoxes: (s.imageBoxes ?? []).map((b) => (b.id === boxId ? { ...b, ...changes } : b)) }
          : s
      )
    );
  }

  // Alt-드래그 복사(2026-09-28): 드래그가 막 시작된 박스의 "드래그 시작 시점" 데이터
  // 그대로 새 id를 붙여 같은 자리에 하나 더 추가해요 — 드래그 중인 원래 id는 그대로
  // 계속 움직이니, 결과적으로 이 사본이 제자리에 남아요.
  function handleAltDuplicateImageBox(spreadIndex: number, box: ImageBoxDef) {
    const newBox: ImageBoxDef = { ...box, id: crypto.randomUUID() };
    setCustomSpreads((prev) =>
      prev.map((s, i) => (i === spreadIndex ? { ...s, imageBoxes: [...(s.imageBoxes ?? []), newBox] } : s))
    );
  }

  // 이미지박스가 스프레드에서 "왼쪽 페이지"인지 "오른쪽 페이지"인지 — 박스 가로 중심
  // 좌표(스프레드 0~100 기준) 50%를 기준으로 나눠요. 레이아웃 템플릿 적용 범위 계산과
  // "이 스프레드에 사진이 몇 장 있는지" 세는 데 같이 써요.
  function imageBoxSide(box: ImageBoxDef): "left" | "right" {
    return box.xPct + box.widthPct / 2 < 50 ? "left" : "right";
  }

  // 레이아웃 템플릿을 적용할 범위(왼쪽/오른쪽/펼침면 전체)에 지금 놓여 있는 이미지박스만
  // 골라내요.
  function imageBoxesInRange(boxes: ImageBoxDef[], range: LayoutApplyRange): ImageBoxDef[] {
    if (range === "spread") return boxes;
    return boxes.filter((b) => imageBoxSide(b) === range);
  }

  // 처음 템플릿을 적용할 때(또는 아직 순서가 저장 안 돼 있을 때) "왼쪽→오른쪽, 위→아래"
  // 읽는 순서로 슬롯을 배정하는 데 쓰는 기본 정렬이에요. 이후엔 이 정렬 결과가 아니라
  // spread.imageBoxOrder에 저장된 순서를 그대로 재사용해요(아래 getSpreadImageBoxOrder).
  function sortImageBoxesReadingOrder(boxes: ImageBoxDef[]): ImageBoxDef[] {
    return [...boxes].sort((a, b) => {
      const rowA = Math.round((a.yPct + a.heightPct / 2) / 8);
      const rowB = Math.round((b.yPct + b.heightPct / 2) / 8);
      if (rowA !== rowB) return rowA - rowB;
      return a.xPct - b.xPct;
    });
  }

  // 스프레드의 "저장된 읽는 순서"(imageBoxOrder)를 돌려줘요. 아직 한 번도 저장된 적
  // 없는 스프레드(과거 데이터, 또는 아직 레이아웃 템플릿을 적용한 적 없는 스프레드)는
  // 읽는 순서로 한 번 계산해서 그 결과를 써요(최초 부트스트랩). 저장된 순서가 있지만
  // 그 뒤 사진이 추가/삭제돼서 목록과 안 맞을 수도 있으니, 지금 실제 있는 박스만
  // 걸러내고, 순서 목록에 없는(새로 생긴) 박스는 읽는 순서로 보정해서 끝에 붙여요.
  function getSpreadImageBoxOrder(spread: SpreadDef): string[] {
    const boxes = spread.imageBoxes ?? [];
    const boxIds = new Set(boxes.map((b) => b.id));
    const saved = (spread.imageBoxOrder ?? []).filter((id) => boxIds.has(id));
    const savedSet = new Set(saved);
    const missing = boxes.filter((b) => !savedSet.has(b.id));
    const missingOrdered = sortImageBoxesReadingOrder(missing).map((b) => b.id);
    return [...saved, ...missingOrdered];
  }

  // 레이아웃 템플릿을 적용해요 — 선택한 범위(왼쪽/오른쪽/펼침면)에 있는 이미지박스들의
  // 위치·크기만 템플릿이 정한 자리로 옮기고, 그 사진 자체(url·회전·반전·박스 안 사진
  // 위치)와 반대쪽 범위의 박스, 텍스트·스티커·배경은 전혀 안 건드려요. 슬롯 배정 순서는
  // 매번 새로 계산하지 않고 스프레드에 저장된 imageBoxOrder를 그대로 재사용해서, 비대칭
  // 배치나 수동 드래그 뒤에 템플릿을 바꿔도 사진 순서가 흐트러지지 않아요.
  //
  // 2026-09-23: "사진 수가 템플릿 칸 수와 정확히 같아야만 적용 가능"하던 예전 조건을
  // 폐기했어요 — 이제 사진이 0장이어도, 칸보다 적어도, 많아도 항상 적용할 수 있어요.
  // 칸보다 사진이 적으면 있는 사진부터 순서대로 채우고 나머지 칸은 "빈 프레임"(url이
  // 빈 문자열인 이미지박스)으로 만들어서 나중에 사진을 채울 수 있게 해요. 칸보다
  // 사진이 많으면 일단 앞쪽 칸부터 순서대로 채우고 남는 사진은 그대로 남겨둬요 — "어떤
  // 사진을 쓸지 고르는 선택 UI"는 아직 없어서, 사진을 지우지 않는 안전한 기본값으로
  // 남겨두는 중간 단계예요(다음에 선택 UI를 추가할 예정).
  // 칸보다 사진이 많을 때는 곧바로 적용하지 않고, 먼저 "어떤 사진을 쓸지 고르는" 선택
  // 팝업을 띄워요(2026-09-23 추가) — 이 팝업에서 고른 사진들의 id를 순서대로
  // `selectedIds`에 담아 넘기면, 그 사진들만 템플릿 칸에 들어가고 나머지는 그대로
  // 남아요. `selectedIds`를 안 넘기면(칸보다 사진이 같거나 적을 때) 기존처럼 저장된
  // 순서 그대로 앞에서부터 채워요.

  // 내지 스프레드 기준 안전영역(%) — 화면 안내선(imageBoxGuidesX/Y)과 같은 공식을
  // 여기서도 다시 계산해요(그쪽은 JSX 렌더 블록 안에서만 쓰이는 지역 상수라 이 함수에서
  // 바로 참조할 수 없어서, 같은 소스(selectedSizeInfo/photobookSizes)로 따로 계산).
  function computeSpreadSafetyPct(): { xPct: number; yPct: number } {
    const guideSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const guideWorkMatch = (guideSizeInfo?.productionFileSizeMm ?? "").match(/(\d+(\.\d+)?)/);
    const guidePageWorkMm = guideWorkMatch ? parseFloat(guideWorkMatch[1]) : 310;
    const guideSpreadWorkMm = guidePageWorkMm * 2;
    const bleedMm = 5;
    return {
      xPct: ((bleedMm + GUIDE_SAFETY_MARGIN_MM) / guideSpreadWorkMm) * 100,
      yPct: ((bleedMm + GUIDE_SAFETY_MARGIN_MM) / guidePageWorkMm) * 100,
    };
  }

  // 표지 앞/뒤판 기준 안전영역(%) — 표지 이미지박스 좌표는 스프레드 전체가 아니라 그
  // 판(앞표지 또는 뒤표지) 자기 자신을 0~100으로 보는 좌표계라서, 판 자신의 실제
  // mm 폭 기준으로 따로 계산해요(coverSafetyXPct처럼 표지 전체 폭 기준으로 계산하면
  // 판 폭이 아니라 표지 전체 폭을 나눈 값이 돼서 훨씬 작게 나와요).
  function computeCoverPanelSafetyPct(): { xPct: number; yPct: number } {
    const coverIsHardLocal = photobookCover === "hard";
    const coverSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const coverTrimMatch = (coverSizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const coverTrimCm = coverTrimMatch ? parseFloat(coverTrimMatch[1]) : 30;
    const coverInnerTrimMm = coverTrimCm * 10;
    const coverPanelMmLocal = coverIsHardLocal
      ? coverInnerTrimMm + printFileSpec.hardCoverPanelOverhangMm * 2
      : coverInnerTrimMm;
    const coverBleedMmLocal = coverIsHardLocal ? printFileSpec.hardCoverWrapBleedMm : printFileSpec.softCoverBleedMm;
    const panelWidthMm = coverPanelMmLocal + coverBleedMmLocal;
    const panelHeightMm = coverPanelMmLocal + coverBleedMmLocal * 2;
    // 2026-10-04, 혜민님 요청(항목13): "안전여백 기준이 20mm로 되어있다면 선도 안전여백과
    // 동일하게 맞춰주세요. 이미지는 20mm로 되어있고 선은 15mm로 되어있으니 일치하지
    // 않습니다" — 화면에 그려지는 파란 점선 안전선(coverSafetyXPct/YPct, 아래
    // renderPage 근처)은 "도련(bleed) + 15mm"(=재단선에서 안쪽으로 15mm)로 계산되는데,
    // 정작 사진 슬롯을 안쪽으로 당기는 이 함수는 도련을 더하지 않고 15mm만 썼어요 —
    // panelWidthMm/panelHeightMm는 도련을 포함한 판 전체 폭이 0%~100%라서, 도련을 안
    // 더하면 재단선 기준으로는 (15mm - 도련)만큼만 당겨져서 화면 안전선보다 사진이
    // 재단선에 더 가깝게 놓일 수 있었어요. 안전선과 똑같이 "도련 + 15mm"로 맞춰요.
    return {
      xPct: panelWidthMm > 0 ? ((coverBleedMmLocal + GUIDE_SAFETY_MARGIN_MM) / panelWidthMm) * 100 : 0,
      yPct: panelHeightMm > 0 ? ((coverBleedMmLocal + GUIDE_SAFETY_MARGIN_MM) / panelHeightMm) * 100 : 0,
    };
  }

  // 슬롯의 네 변 중 트림(재단) 가장자리(0%/100%)에 닿아 있던 변만 안전영역 안쪽으로
  // 당겨요 — min/max 클램프라 이미 안전영역보다 안쪽인 변(게터 있는 템플릿)은 안 건드려요.
  function clampSlotToSpreadSafety(
    xPct: number,
    yPct: number,
    widthPct: number,
    heightPct: number,
    safety: { xPct: number; yPct: number }
  ) {
    // 트림(재단) 가장자리에 실제로 닿아 있던 변만 골라서 안전영역 안쪽으로 당겨요.
    // 문턱값 비교(예: xPct < safety.xPct면 무조건 당기기)로 하면, 이미 자기 여백을
    // 가진 템플릿(gridWithGutter 등)의 여백이 안전영역보다 살짝 좁을 때도 함께
    // 당겨져서 "여백 있는 페이지까지 기준선에 딱 맞춰진다"는 문제가 생겨요 — 그런
    // 템플릿은 자기 여백을 그대로 두는 게 맞아요(혜민님 2026-09-27 재확인).
    const EDGE_EPS = 0.5; // %
    const touchesLeft = xPct <= EDGE_EPS;
    const touchesRight = xPct + widthPct >= 100 - EDGE_EPS;
    const touchesTop = yPct <= EDGE_EPS;
    const touchesBottom = yPct + heightPct >= 100 - EDGE_EPS;
    let left = touchesLeft ? Math.max(xPct, safety.xPct) : xPct;
    let right = touchesRight ? Math.min(xPct + widthPct, 100 - safety.xPct) : xPct + widthPct;
    const top = touchesTop ? Math.max(yPct, safety.yPct) : yPct;
    const bottom = touchesBottom ? Math.min(yPct + heightPct, 100 - safety.yPct) : yPct + heightPct;
    // 2026-10-02, 혜민님 요청: "안전영역이 가운데 기준으로 잡혀있지않음 접히는부분값도
    // 동일하게 15mm로 맞춰주어야함" — 접힘부(스프레드 정중앙, 50%)에 닿아 있던 변도
    // 바깥쪽 가장자리와 똑같이 안전영역만큼 당겨요(예전엔 SPREAD_GUTTER_PCT=0이라
    // 접힘부는 전혀 안 당겼었음). 왼쪽 낱장의 오른쪽(접힘부 쪽) 변, 오른쪽 낱장의
    // 왼쪽(접힘부 쪽) 변만 대상 — 이미 자기 게터가 있어서 50%에 안 닿아 있는 템플릿은
    // (기존 로직처럼) 그대로 둬요.
    const touchesFoldFromLeftPage = right >= 50 - EDGE_EPS && right <= 50 + EDGE_EPS;
    const touchesFoldFromRightPage = left >= 50 - EDGE_EPS && left <= 50 + EDGE_EPS;
    if (touchesFoldFromLeftPage) right = Math.min(right, 50 - safety.xPct);
    if (touchesFoldFromRightPage) left = Math.max(left, 50 + safety.xPct);
    return {
      xPct: left,
      yPct: top,
      widthPct: Math.max(1, right - left),
      heightPct: Math.max(1, bottom - top),
    };
  }

  // 표지 판(앞/뒤) 전용 버전 — 책등 쪽 경계는 안전영역 대상이 아니라서(혜민님 확인:
  // "책등은 별도 안전영역 여백을 두지 않는다") 그쪽 변은 그대로 두고, 진짜 바깥쪽
  // (트림) 가장자리 쪽 변만 당겨요. side="front"면 오른쪽이 바깥쪽, "back"이면 왼쪽이
  // 바깥쪽이에요(coverFrontPct/coverBackPct 렌더링 순서 기준).
  function clampSlotToCoverSafety(
    xPct: number,
    yPct: number,
    widthPct: number,
    heightPct: number,
    safety: { xPct: number; yPct: number },
    side: "front" | "back"
  ) {
    // 내지 clampSlotToSpreadSafety와 같은 이유로, 실제로 트림 가장자리에 닿아 있던
    // 변만 당겨요(2026-09-27 재확인) — 이미 여백이 있는 템플릿은 그대로 둬요.
    const EDGE_EPS = 0.5; // %
    let left = xPct;
    let right = xPct + widthPct;
    if (side === "front") {
      if (right >= 100 - EDGE_EPS) right = Math.min(right, 100 - safety.xPct);
    } else {
      if (left <= EDGE_EPS) left = Math.max(left, safety.xPct);
    }
    const touchesTop = yPct <= EDGE_EPS;
    const touchesBottom = yPct + heightPct >= 100 - EDGE_EPS;
    const top = touchesTop ? Math.max(yPct, safety.yPct) : yPct;
    const bottom = touchesBottom ? Math.min(yPct + heightPct, 100 - safety.yPct) : yPct + heightPct;
    return {
      xPct: left,
      yPct: top,
      widthPct: Math.max(1, right - left),
      heightPct: Math.max(1, bottom - top),
    };
  }

  function applyLayoutTemplate(
    spreadIndex: number,
    range: LayoutApplyRange,
    template: PhotoLayoutTemplate,
    selectedIds?: string[]
  ) {
    const spread = customSpreads[spreadIndex];
    if (!spread) return;
    // 2026-09-27 재확인: "레이아웃을 바꿀때마다 겹치는 오류 확인됩니다. 레이아웃을
    // 바꾸면 선택한 레이아웃 자체가 바뀌어야합니다. 추가되는게 아니고요." — 이 면이
    // 아직 옛날 방식 그리드(spread.left/right, 사진이 여러 장인 템플릿)로 사진을
    // 보여주고 있을 때 "레이아웃" 탭(자유배치 imageBoxes)을 처음 적용하면, 옛 그리드
    // 사진은 화면에 그대로 남아 있고 그 위에 새 imageBoxes(빈 칸)가 "추가"로 겹쳐
    // 보였던 게 원인이에요(1장짜리 "사진 전체" 템플릿만 변환 버튼이 있었고, 여러 장
    // 짜리 그리드는 변환 경로가 아예 없었어요). 적용 범위에 해당하는 면이 아직
    // freeform이 아니면, 그 면의 옛 그리드 사진들을 먼저 imageBoxes로 옮기고 그 면을
    // freeform으로 바꿔서 옛 그리드를 없애요 — handleConvertPhotoToImageBox(1장 전용)와
    // 같은 방식을 여러 장에 맞게 넓힌 거예요.
    const sidesToConvert: ("left" | "right")[] = range === "spread" ? ["left", "right"] : [range];
    const legacyBoxes: ImageBoxDef[] = [];
    const legacyRemovedPhotoIndexes = new Set<number>();
    const freeformSides: ("left" | "right")[] = [];
    for (const side of sidesToConvert) {
      if (side === "left" && spreadIndex === 0) continue; // 표지 뒷면(빈 면)은 대상 아님
      const templateId = spread[side];
      if (templateId === "freeform" || templateId === "blank") continue;
      const group = computeSpreadPhotoGroups(customSpreads)[spreadIndex];
      const idxs = side === "left" ? group.leftIndexes : group.rightIndexes;
      const sidePhotos = idxs.map((idx) => ({ idx, photo: photos[idx] })).filter((e): e is { idx: number; photo: Photo } => !!e.photo);
      if (sidePhotos.length > 0) {
        sidePhotos.forEach(({ idx, photo }) => {
          legacyBoxes.push({
            id: crypto.randomUUID(),
            url: photo.url,
            naturalWidth: photo.width || 1,
            naturalHeight: photo.height || 1,
            xPct: side === "left" ? 0 : 50,
            yPct: 0,
            widthPct: 50,
            heightPct: 100,
            innerOffsetXPct: 0,
            innerOffsetYPct: 0,
            innerScale: 1,
          });
          legacyRemovedPhotoIndexes.add(idx);
        });
      }
      freeformSides.push(side);
    }
    const spreadForOrder: SpreadDef = legacyBoxes.length
      ? { ...spread, imageBoxes: [...(spread.imageBoxes ?? []), ...legacyBoxes] }
      : spread;
    // 2026-09-27, 혜민님 요청: "스티커도 이미지로 인식되는거같습니다 ... 스티커는
    // 레이아웃 배치할떄 들어가지 않도록요" — 레이아웃 템플릿은 사진(스티커가 아닌
    // 이미지박스)만 대상으로 하고, 스티커는 지금 있는 자리 그대로 손 안 대요.
    const allBoxesRaw = spreadForOrder.imageBoxes ?? [];
    const stickerBoxes = allBoxesRaw.filter((b) => isStickerImageBox(b));
    const allBoxes = allBoxesRaw.filter((b) => !isStickerImageBox(b));
    const inRange = imageBoxesInRange(allBoxes, range);
    const outOfRange = allBoxes.filter((b) => !inRange.includes(b));
    const fullOrder = getSpreadImageBoxOrder(spreadForOrder);
    const inRangeById = new Map(inRange.map((b) => [b.id, b] as const));
    const orderedExisting = fullOrder.filter((id) => inRangeById.has(id)).map((id) => inRangeById.get(id)!);

    const usable = selectedIds
      ? selectedIds.map((id) => inRangeById.get(id)).filter((b): b is ImageBoxDef => !!b)
      : orderedExisting.slice(0, template.slots.length);
    const extraBoxes = selectedIds
      ? orderedExisting.filter((b) => !selectedIds.includes(b.id))
      : orderedExisting.slice(template.slots.length);
    const spreadSafetyPct = computeSpreadSafetyPct();
    const placed = template.slots.map((slot, idx) => {
      const raw = slotToSpreadCoords(slot, range);
      // 슬롯이 스프레드 바깥쪽(재단) 가장자리에 닿아 있으면 안전영역 안쪽으로 당겨요
      // (2026-09-27, "안전영역에 맞물리게 작업해주세요"). 게터로 이미 안쪽에 있던
      // 슬롯(예: 접힘부 여백이 있는 템플릿)은 클램프가 no-op이라 그대로 유지돼요.
      const clamped = clampSlotToSpreadSafety(raw.xPct, slot.yPct, raw.widthPct, slot.heightPct, spreadSafetyPct);
      const { xPct, yPct, widthPct, heightPct } = clamped;
      const existing = usable[idx];
      if (existing) {
        // 기존 사진을 새 칸에 다시 배정할 때 이전 칸 기준으로 맞춰뒀던 확대/이동값
        // (innerOffsetXPct/innerOffsetYPct/innerScale)을 그대로 들고 오면, 새 칸의
        // 가로세로 비율이 달라서 사진이 중앙에서 벗어나 보이거나 심하면 화면 밖으로
        // 완전히 밀려나 "사진이 안 보이는" 것처럼 보일 수 있었어요 — 새 칸 기준으로
        // 가운데 정렬된 기본값(오프셋 0, 배율 1)으로 리셋해서 항상 중앙 기준점에
        // 맞도록 고쳤어요(2026-09-24, 혜민님 확인).
        return {
          ...existing,
          xPct,
          widthPct,
          yPct,
          heightPct,
          innerOffsetXPct: 0,
          innerOffsetYPct: 0,
          innerScale: 1,
        };
      }
      // 채울 사진이 없는 칸 — 빈 프레임을 새로 만들어요. 나중에 캔버스에서 "+사진
      // 추가"를 누르거나 드래그해서 채울 수 있어요.
      const emptyBox: ImageBoxDef = {
        id: crypto.randomUUID(),
        url: "",
        naturalWidth: 1,
        naturalHeight: 1,
        xPct,
        yPct,
        widthPct,
        heightPct,
        innerOffsetXPct: 0,
        innerOffsetYPct: 0,
        innerScale: 1,
      };
      return emptyBox;
    });

    setLayoutApplyMessage(
      extraBoxes.length > 0
        ? `이 템플릿은 사진 칸이 ${template.slots.length}개예요. 지금 이 범위에 사진이 ${inRange.length}장 있어서, 앞 ${template.slots.length}장만 채우고 나머지 ${extraBoxes.length}장은 그대로 남겨뒀어요.`
        : null
    );

    const preservedOrder = [
      ...fullOrder.filter(
        (id) =>
          stickerBoxes.some((b) => b.id === id) ||
          outOfRange.some((b) => b.id === id) ||
          extraBoxes.some((b) => b.id === id)
      ),
      ...placed.map((b) => b.id),
    ];

    // "사진 아래 문구 공간" 템플릿이면 남는 세로 공간에 캡션 텍스트박스를 자동으로 하나
    // 만들어줘요(range가 "left"/"right"일 때만 — hasCaptionSpace 템플릿은 half 스코프
    // 라서 애초에 "spread" 범위로는 고를 수 없지만, 혹시 모를 경우를 대비해 안전하게
    // left/right일 때만 처리해요). 같은 자리에 이미 자동 생성된 캡션 박스가 있으면
    // (재적용) 또 만들지 않고 그대로 둬요.
    const captionSlot = captionSlotFor(template);
    const captionKey: "textBoxesLeft" | "textBoxesRight" | null =
      captionSlot && (range === "left" || range === "right")
        ? range === "left"
          ? "textBoxesLeft"
          : "textBoxesRight"
        : null;

    setCustomSpreads((prev) =>
      prev.map((s, i) => {
        if (i !== spreadIndex) return s;
        const next: SpreadDef = {
          ...s,
          imageBoxes: [...stickerBoxes, ...outOfRange, ...extraBoxes, ...placed],
          imageBoxOrder: preservedOrder,
        };
        if (freeformSides.includes("left")) next.left = "freeform";
        if (freeformSides.includes("right")) next.right = "freeform";
        if (captionKey && captionSlot) {
          const existingTextBoxes = s[captionKey] ?? [];
          if (!hasAutoCaptionBox(existingTextBoxes)) {
            next[captionKey] = [...existingTextBoxes, makeCaptionTextBox(captionSlot)];
          }
        }
        return next;
      })
    );
    if (legacyRemovedPhotoIndexes.size > 0) {
      setPhotos((prev) => prev.filter((_, i) => !legacyRemovedPhotoIndexes.has(i)));
    }
  }

  // 표지(앞표지·뒤표지)에 레이아웃 템플릿을 적용해요 — 위 applyLayoutTemplate(내지용)과
  // 같은 방식이에요(칸보다 사진이 적으면 빈 프레임, 많으면 선택 팝업). 다만 표지는
  // "범위"(왼쪽/오른쪽/펼침면) 개념이 없이 앞표지·뒤표지 각각 사진 배열 하나씩이라 더
  // 단순해요. 레이아웃을 처음 쓰는 표지라면(=배열이 비어있고 기존 방식대로 사진이 1장
  // 있으면, coverPhoto/backCoverPhoto) 그 사진을 새 배열의 첫 칸으로 이어받아요(2026-09-24
  // 추가 — "레이아웃 적용하면 기존 사진이 사라진다"는 혼란을 막기 위해서예요). natural
  // 크기를 다시 읽어야 해서 이 이어받는 부분만 비동기로 처리해요.
  function applyCoverLayoutTemplate(target: "front" | "back", template: PhotoLayoutTemplate, selectedIds?: string[]) {
    const isFront = target === "front";
    // 2026-09-27, 혜민님 요청 — 내지와 같은 이유로 표지 스티커도 레이아웃 대상에서 빼요.
    const existingBoxesRaw = isFront ? coverImageBoxes : backCoverImageBoxes;
    const coverStickerBoxes = existingBoxesRaw.filter((b) => isStickerImageBox(b));
    const existingBoxes = existingBoxesRaw.filter((b) => !isStickerImageBox(b));
    const legacyPhoto = isFront ? coverPhoto : backCoverPhoto;
    // "사진 아래 문구 공간" 템플릿이면(내지 applyLayoutTemplate과 같은 방식) 남는 세로
    // 공간에 캡션 텍스트박스를 자동으로 하나 만들어줘요. 표지는 "범위" 개념이 없어서
    // 항상 coverTextBoxes/backCoverTextBoxes 전체에 적용해요.
    const captionSlot = captionSlotFor(template);

    const coverPanelSafetyPct = computeCoverPanelSafetyPct();

    function finish(baseBoxes: ImageBoxDef[]) {
      const usable = selectedIds
        ? selectedIds.map((id) => baseBoxes.find((b) => b.id === id)).filter((b): b is ImageBoxDef => !!b)
        : baseBoxes.slice(0, template.slots.length);
      const extraBoxes = selectedIds
        ? baseBoxes.filter((b) => !selectedIds.includes(b.id))
        : baseBoxes.slice(template.slots.length);
      const placed = template.slots.map((slot, idx) => {
        // 슬롯이 판의 바깥쪽(트림) 가장자리에 닿아 있으면 안전영역 안쪽으로 당겨요 —
        // 책등 쪽 경계는 대상이 아니라서 손대지 않아요(2026-09-27).
        const clamped = clampSlotToCoverSafety(
          slot.xPct,
          slot.yPct,
          slot.widthPct,
          slot.heightPct,
          coverPanelSafetyPct,
          isFront ? "front" : "back"
        );
        const existing = usable[idx];
        if (existing) {
          // 내지 applyLayoutTemplate과 같은 이유로, 표지도 새 칸에 재배정할 때 이전
          // 확대/이동값을 리셋해서 중앙 기준점에 맞춰요(2026-09-24).
          return {
            ...existing,
            xPct: clamped.xPct,
            yPct: clamped.yPct,
            widthPct: clamped.widthPct,
            heightPct: clamped.heightPct,
            innerOffsetXPct: 0,
            innerOffsetYPct: 0,
            innerScale: 1,
          };
        }
        const emptyBox: ImageBoxDef = {
          id: crypto.randomUUID(),
          url: "",
          naturalWidth: 1,
          naturalHeight: 1,
          xPct: clamped.xPct,
          yPct: clamped.yPct,
          widthPct: clamped.widthPct,
          heightPct: clamped.heightPct,
          innerOffsetXPct: 0,
          innerOffsetYPct: 0,
          innerScale: 1,
        };
        return emptyBox;
      });
      setCoverLayoutApplyMessage(
        extraBoxes.length > 0
          ? `이 템플릿은 사진 칸이 ${template.slots.length}개예요. 사진이 더 있어서 앞 ${template.slots.length}장만 채우고 나머지는 그대로 남겨뒀어요.`
          : null
      );
      if (isFront) {
        setCoverImageBoxes([...coverStickerBoxes, ...extraBoxes, ...placed]);
        setCoverPhoto(null);
        if (captionSlot) {
          setCoverTextBoxes((prev) => (hasAutoCaptionBox(prev) ? prev : [...prev, makeCaptionTextBox(captionSlot)]));
        }
      } else {
        setBackCoverImageBoxes([...coverStickerBoxes, ...extraBoxes, ...placed]);
        setBackCoverPhoto(null);
        if (captionSlot) {
          setBackCoverTextBoxes((prev) => (hasAutoCaptionBox(prev) ? prev : [...prev, makeCaptionTextBox(captionSlot)]));
        }
      }
    }

    if (existingBoxes.length > 0 || !legacyPhoto) {
      finish(existingBoxes);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      finish([
        {
          id: crypto.randomUUID(),
          url: legacyPhoto.url,
          naturalWidth: img.naturalWidth || 1,
          naturalHeight: img.naturalHeight || 1,
          xPct: 0,
          yPct: 0,
          widthPct: 100,
          heightPct: 100,
          innerOffsetXPct: 0,
          innerOffsetYPct: 0,
          innerScale: 1,
        },
      ]);
    };
    img.src = legacyPhoto.url;
  }

  function handleCoverImageBoxChange(boxId: string, changes: Partial<ImageBoxDef>) {
    setCoverImageBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }
  function handleDeleteCoverImageBox(boxId: string) {
    setCoverImageBoxes((prev) => prev.filter((b) => b.id !== boxId));
    setActiveCoverImageBox((prev) => (prev && prev.target === "front" && prev.boxId === boxId ? null : prev));
  }
  // Alt-드래그 복사(2026-09-28) — handleAltDuplicateImageBox(스프레드용)와 같은 원리예요.
  function handleAltDuplicateCoverImageBox(box: ImageBoxDef) {
    setCoverImageBoxes((prev) => [...prev, { ...box, id: crypto.randomUUID() }]);
  }
  function handleBackCoverImageBoxChange(boxId: string, changes: Partial<ImageBoxDef>) {
    setBackCoverImageBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, ...changes } : b)));
  }
  function handleDeleteBackCoverImageBox(boxId: string) {
    setBackCoverImageBoxes((prev) => prev.filter((b) => b.id !== boxId));
    setActiveCoverImageBox((prev) => (prev && prev.target === "back" && prev.boxId === boxId ? null : prev));
  }
  function handleAltDuplicateBackCoverImageBox(box: ImageBoxDef) {
    setBackCoverImageBoxes((prev) => [...prev, { ...box, id: crypto.randomUUID() }]);
  }

  // 표지 제목 서체를 바꿀 때 쓰는 핸들러예요. "연결" 스위치(titleFontLinked)가 켜져
  // 있으면 책등 서체도 같이 맞춰줘요. 글자 크기·위치·회전은 여기서 안 건드려요 — 각자
  // 값 그대로 유지돼요.
  function handleCoverTitleFontFamilyChange(fontId: string) {
    setCoverTitleFontFamily(fontId);
    if (titleFontLinked) setSpineTitleFontFamily(fontId);
  }
  // 책등 서체를 바꿀 때도 반대 방향으로 똑같이 동작해요 — 연결이 켜져 있으면 표지
  // 제목 서체도 같이 바뀌어요.
  function handleSpineTitleFontFamilyChange(fontId: string) {
    setSpineTitleFontFamily(fontId);
    if (titleFontLinked) setCoverTitleFontFamily(fontId);
  }

  // 표지 "테마" 하나를 골라 앞표지·책등·뒤표지 배경(+ 뒤표지 무늬)·제목 서체를 한 번에
  // 맞춰요. 사진·텍스트박스는 전혀 안 건드려요 — 배경·서체만 바꾸는 비파괴적 적용이라,
  // 테마를 고른 뒤에도 사진·텍스트는 원래대로 남아있어요(레이아웃 탭에서처럼 따로
  // 편집 가능). titleFontFamily가 있으면 표지·책등 제목 서체를 "연결" 여부와 상관없이
  // 둘 다 같은 테마 서체로 맞춰요.
  function applyCoverTheme(themeId: string) {
    const theme = COVER_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setCoverFrontBackgroundColor(theme.frontBackgroundColor);
    setCoverSpineBackgroundColor(theme.spineBackgroundColor);
    setBackCoverBackgroundColor(theme.backBackgroundColor);
    setCoverPatternId(theme.backPatternId);
    if (theme.titleFontFamily) {
      setCoverTitleFontFamily(theme.titleFontFamily);
      setSpineTitleFontFamily(theme.titleFontFamily);
    }
  }

  function handleDeleteImageBox(spreadIndex: number, boxId: string) {
    // "AI 맞춤 레이아웃"에서 박스 자체의 ✕ 버튼으로 지울 때도, 반대 방향으로
    // "전체 사진 목록"의 사진 목록이 계속 남아있지 않도록 짝이 되는 사진도 같이 지워요.
    if (isAiAuto) {
      const removedUrl = customSpreads[spreadIndex]?.imageBoxes?.find((b) => b.id === boxId)?.url;
      if (removedUrl) {
        setPhotos((prev) => prev.filter((p) => p.url !== removedUrl));
      }
    }
    setCustomSpreads((prev) =>
      prev.map((s, i) =>
        i === spreadIndex
          ? {
              ...s,
              imageBoxes: (s.imageBoxes ?? []).filter((b) => b.id !== boxId),
              imageBoxOrder: getSpreadImageBoxOrder(s).filter((id) => id !== boxId),
            }
          : s
      )
    );
    setActiveImageBox(null);
  }

  // ---- 레이어(쌓임) 순서 — 사진박스·텍스트박스를 종류 상관없이 앞뒤로 옮기기
  // (2026-09-25 추가) ----
  // 스프레드(내지) 한 장의 레이어 순서 조작이에요. 사진박스는 스프레드 전체를 공유하고
  // 텍스트박스는 왼쪽/오른쪽 낱장이 따로 있지만, 화면에서 이 셋은 이미 같은 자리에
  // 겹쳐 보이는 하나의 무리라(z-25/z-30이 스프레드 전체 기준으로 비교되던 예전 구조와
  // 같아요) 왼쪽+오른쪽 텍스트박스를 합쳐서 "이 스프레드의 텍스트 전체"로 취급해요.
  function applySpreadStackAction(spreadIndex: number, kind: StackKind, boxId: string, action: StackOrderAction) {
    const spread = customSpreads[spreadIndex];
    if (!spread) return;
    const texts = [...(spread.textBoxesLeft ?? []), ...(spread.textBoxesRight ?? [])];
    const updates = computeZOrderUpdates(spread.imageBoxes ?? [], texts, kind, boxId, action);
    for (const u of updates) {
      if (u.kind === "image") {
        handleImageBoxChange(spreadIndex, u.id, { zOrder: u.z });
      } else {
        // 텍스트박스는 왼쪽/오른쪽 중 어디 있는지 먼저 찾아야 handleTextBoxChange를
        // 부를 수 있어요.
        const side = (spread.textBoxesLeft ?? []).some((b) => b.id === u.id) ? "left" : "right";
        handleTextBoxChange(spreadIndex, side, u.id, { zOrder: u.z });
      }
    }
  }

  // 표지 앞면("front")·뒤표지("back") 한 칸의 레이어 순서 조작이에요. 표지는 스프레드처럼
  // 왼쪽/오른쪽으로 나뉘지 않고 칸 하나(앞면 또는 뒤면)가 곧 한 무리라 더 단순해요.
  // 뒤표지 키픽 로고는 표지 제목과 마찬가지로 이 레이어 시스템 밖의 고정 요소라(위
  // lib/printCompose.ts와 같은 설계) 여기서 다루지 않아요.
  function applyCoverStackAction(target: "front" | "back", kind: StackKind, boxId: string, action: StackOrderAction) {
    const images = target === "front" ? coverImageBoxes : backCoverImageBoxes;
    const texts = target === "front" ? coverTextBoxes : backCoverTextBoxes;
    const updates = computeZOrderUpdates(images, texts, kind, boxId, action);
    for (const u of updates) {
      if (target === "front") {
        if (u.kind === "image") handleCoverImageBoxChange(u.id, { zOrder: u.z });
        else handleCoverTextBoxChange(u.id, { zOrder: u.z });
      } else {
        if (u.kind === "image") handleBackCoverImageBoxChange(u.id, { zOrder: u.z });
        else handleBackCoverTextBoxChange(u.id, { zOrder: u.z });
      }
    }
  }

  // 편집 중 캔버스 위에서 바로 페이지를 넘길 수 있는 좌우 화살표예요(2026-09-26). 왼쪽
  // 사이드바의 ‹/› 버튼과 하는 일은 같아요(같은 pageOrder 이동 로직). CanvasStage의
  // overlay prop으로 넘겨서, 캔버스 자체(측정 래퍼) 기준으로 뜨게 해요 — 예전엔 아이콘
  // 메뉴+속성 패널까지 포함한 훨씬 넓은 바깥 영역 기준으로 떠 있어서, 화살표가 패널
  // 쪽까지 넘어와 보이는 문제가 있었어요(혜민님 확인, "화살표가 패널까지 보이는부분").
  function renderPageNavArrows(displayW: number, containerW: number = 0) {
    // 책이 캔버스 안에서 가로로 가운데 정렬돼 있어서(2026-09-27), 화살표는
    // measureRef 가장자리가 아니라 "책 실제 폭의 절반 + 여백"만큼 중앙에서 떨어진
    // 자리에 둬요 — 그래야 줌 배율이 달라져도 항상 책 바로 옆에 붙어요. displayW를
    // 아직 모르면(0) 화면 가장자리 쪽으로 대체해요.
    // 2026-10-04, 혜민님 요청(항목6): "화살표가 또 편집기 밖으로 나갔습니다. 책자가
    // 배치된 선상 안에서 고정되도록 해주세요" — 책이 편집기(컨테이너) 폭을 거의 꽉
    // 채우면 "책 절반 폭 + 8px"이 컨테이너 절반 폭보다 커져서, 화살표가 편집기 경계
    // 바깥으로 밀려났어요. 화살표 버튼 자체 반지름(18px)만큼 여유를 두고 컨테이너
    // 절반 폭을 넘지 않도록 잘라내요 — 여유가 있으면 예전처럼 책 바로 옆에, 여유가
    // 없으면 편집기 안쪽 가장자리에 붙어요.
    const rawHalfGap = displayW > 0 ? displayW / 2 + 8 : undefined;
    const maxHalfGap = containerW > 0 ? Math.max(0, containerW / 2 - 22) : undefined;
    const halfGap =
      rawHalfGap !== undefined && maxHalfGap !== undefined
        ? Math.min(rawHalfGap, maxHalfGap)
        : rawHalfGap;
    // 2026-10-04, 혜민님 요청(항목12): "편집하기 메뉴에서 오른쪽으로 화살표를 넘기면
    // 미리보기 창으로 이동하는 오류... 편집메뉴에서의 화살표는 편집메뉴 자체에서 이전,
    // 다음페이지이동할수있는 버튼입니다" — editorMode는 "선택된 페이지가 편집모드를 켠
    // 그 페이지와 같을 때만 edit"으로 계산돼요(위 editorModeState 주석 참고, 왼쪽
    // 사이드바에서 다른 페이지를 고르면 항상 미리보기부터 보여주려는 의도). 그런데 이
    // 캔버스 위 화살표도 selectedPageKey만 바꾸다 보니 같은 규칙에 걸려 편집 중에
    // 화살표만 눌러도 미리보기로 튕겨나갔어요. 화살표로 넘어갈 땐 편집 중이었다는
    // 사실을 그대로 유지해야 하므로, 새 페이지 키로 editorModeState도 함께 "edit"으로
    // 옮겨요(왼쪽 사이드바 클릭은 이 함수를 거치지 않으니 기존 "새 페이지=미리보기부터"
    // 동작은 그대로예요).
    function goToPage(key: typeof selectedPageKey) {
      setSelectedPageKey(key);
      setEditorModeState({ forPageKey: key, mode: "edit" });
    }
    return (
      <>
        <button
          type="button"
          onClick={() => {
            const order = pageOrder;
            const idx = order.findIndex((k) => k === selectedPageKey);
            if (idx > 0) goToPage(order[idx - 1]);
          }}
          disabled={pageOrder.findIndex((k) => k === selectedPageKey) <= 0}
          aria-label="이전 페이지"
          style={halfGap !== undefined ? { left: `calc(50% - ${halfGap}px)`, transform: "translate(-100%, -50%)" } : undefined}
          className={`pointer-events-auto absolute top-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white/90 text-base shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-30 ${
            halfGap !== undefined ? "" : "left-1 -translate-y-1/2 sm:left-2"
          }`}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => {
            const order = pageOrder;
            const idx = order.findIndex((k) => k === selectedPageKey);
            if (idx >= 0 && idx < order.length - 1) goToPage(order[idx + 1]);
          }}
          disabled={(() => {
            const idx = pageOrder.findIndex((k) => k === selectedPageKey);
            return idx < 0 || idx >= pageOrder.length - 1;
          })()}
          aria-label="다음 페이지"
          style={halfGap !== undefined ? { left: `calc(50% + ${halfGap}px)`, transform: "translateY(-50%)" } : undefined}
          className={`pointer-events-auto absolute top-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-hairline)] bg-white/90 text-base shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-30 ${
            halfGap !== undefined ? "" : "right-1 -translate-y-1/2 sm:right-2"
          }`}
        >
          ›
        </button>
      </>
    );
  }

  // ---- 편집기 단축키: 실행취소/다시실행, 복사/붙여넣기, 확대·축소 ----
  // 실행취소는 "지금까지 편집한 내용(사진 배치, 텍스트, 배경 등)" 전체를 하나의 스냅샷으로
  // 찍어뒀다가 되돌리는 방식이에요(필드 하나하나를 따로 추적하지 않아요). 스냅샷에는
  // 인쇄에 실제로 들어가는 내용만 담고, 화면 전용 설정(가이드선 표시 여부, 확대 배율,
  // 현재 보고 있는 페이지 등)은 담지 않아요 — 그런 것까지 되돌리면 오히려 헷갈려요.
  const [canvasZoom, setCanvasZoom] = useState(1);
  // CanvasStage가 보고해주는 "실제 크기(mm) 대비 지금 화면에 보이는 %"예요 — 창을
  // 좁히면 baseFit이 작아지면서 이 값도 같이 줄어들어요(2026-09-24). 아직 계산 전이거나
  // (소개 페이지처럼) 실제 mm 기준이 없는 화면일 때는 null — 그때는 아래 표시에서
  // canvasZoom(줌 배율)로 되돌아가요.
  const [actualSizePercent, setActualSizePercent] = useState<number | null>(null);
  // 편집 영역 높이는 이제(2026-09-23) 상단바 높이를 JS로 재서 calc()로 빼는 방식 대신,
  // <main>을 뷰포트 높이(h-dvh)에 고정하고 그 안을 flex 레이아웃으로 나누는 구조로
  // 바꿨어요(음수 마진이나 수동 높이 계산 없이, 상단바는 shrink-0, 편집 영역은
  // flex-1로 자동으로 남은 공간을 채움) — 그래서 이 높이 측정용 ref/state는 더 이상
  // 필요 없어서 지웠어요.
  // "화면에 맞추기"를 몇 번 눌렀는지 세는 값이에요 — CanvasStage는 이 값이 바뀔 때만
  // 맞춤 크기를 다시 계산해요(최초 진입 시 1회 + 사용자가 버튼을 누를 때만, 창 크기가
  // 저절로 바뀌었다고 배율이 따라 바뀌지 않도록, 2026-09-23 요청).
  const [canvasFitToken, setCanvasFitToken] = useState(0);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringHistoryRef = useRef(false);
  const lastHistorySnapshotRef = useRef<string | null>(null);
  // 드래그·리사이즈처럼 짧은 시간에 onChange가 여러 번(마우스무브마다) 연달아 일어나는
  // 동작을 "실행취소 한 번"으로 묶어주는 디바운스예요(2026-09-19, 혜민님 확인 — 예전엔
  // 마우스무브 한 번마다 스냅샷이 쌓여서 Ctrl+Z를 눌러도 찔끔찔끔씩만 되돌아갔어요).
  // burstBaseSnapshotRef = 지금 이어지고 있는 변화가 "시작되기 전" 상태 — 변화가
  // 멈춘 뒤 HISTORY_DEBOUNCE_MS 동안 조용하면 그 시작 시점 스냅샷 하나만 실행취소
  // 스택에 쌓아요.
  const burstBaseSnapshotRef = useRef<string | null>(null);
  const historyDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_DEBOUNCE_MS = 500;
  const copiedTextBoxRef = useRef<TextBoxDef | null>(null);
  const HISTORY_LIMIT = 60;

  // 디바운스 중(=아직 실행취소 스택에 안 쌓인) 변화가 있으면 지금 바로 하나로 묶어
  // 쌓아요. 실행취소/다시실행 직전에 반드시 불러야, 방금 끝낸 동작이 통째로 한 단계로
  // 잡혀요(안 그러면 타이머가 나중에 따로 쌓여서 순서가 엉켜요).
  function flushPendingHistoryBurst() {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (burstBaseSnapshotRef.current !== null) {
      undoStackRef.current.push(burstBaseSnapshotRef.current);
      if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
      redoStackRef.current = [];
      burstBaseSnapshotRef.current = null;
    }
  }

  function buildHistorySnapshot() {
    return JSON.stringify({
      customSpreads,
      coverPhoto,
      coverTitle,
      coverTitleFontSizePt,
      coverTitleLineHeightEm,
      coverTitleLetterSpacingEm,
      coverTitleXPct,
      coverTitleYPct,
      coverTitleFontFamily,
      coverTitleAlign,
      spineTitleYPct,
      spineTitleHeightPct,
      spineTitleFontSizePt,
      spineTitleFontFamily,
      titleFontLinked,
      backCoverLogo,
      backCoverPhoto,
      backCoverBackgroundColor,
      coverPatternId,
      backCoverTextBoxes,
      coverSpineBackgroundColor,
      coverFrontBackgroundColor,
      coverTextBoxes,
      coverImageBoxes,
      backCoverImageBoxes,
      coverTableBoxes,
      backCoverTableBoxes,
    });
  }

  function restoreHistorySnapshot(snapshotJson: string) {
    const s = JSON.parse(snapshotJson);
    isRestoringHistoryRef.current = true;
    setCustomSpreads(s.customSpreads);
    setCoverPhoto(s.coverPhoto);
    setCoverTitle(s.coverTitle);
    setCoverTitleFontSizePt(s.coverTitleFontSizePt ?? 36);
    setCoverTitleLineHeightEm(s.coverTitleLineHeightEm ?? 1.2);
    setCoverTitleLetterSpacingEm(s.coverTitleLetterSpacingEm ?? 0);
    // draft 입력창도 불러온 값으로 같이 맞춰요(안 하면 문서를 불러온 직후에도 입력칸엔
    // 이전 draft 문자열이 남아있게 됨).
    setCoverTitlePtDraft(String(s.coverTitleFontSizePt ?? 36));
    setCoverTitleLineHeightDraft(String(s.coverTitleLineHeightEm ?? 1.2));
    setCoverTitleLetterSpacingDraft(String(s.coverTitleLetterSpacingEm ?? 0));
    setCoverTitleXPct(s.coverTitleXPct);
    setCoverTitleYPct(s.coverTitleYPct);
    setCoverTitleFontFamily(s.coverTitleFontFamily);
    setCoverTitleAlign(s.coverTitleAlign ?? "center");
    setSpineTitleYPct(s.spineTitleYPct ?? null);
    setSpineTitleHeightPct(s.spineTitleHeightPct);
    setSpineTitleFontSizePt(s.spineTitleFontSizePt ?? null);
    setSpineTitleFontSizePtDraft(s.spineTitleFontSizePt !== undefined && s.spineTitleFontSizePt !== null ? String(s.spineTitleFontSizePt) : "");
    setSpineTitleFontFamily(s.spineTitleFontFamily ?? fontOptions[0].id);
    setTitleFontLinked(s.titleFontLinked ?? true);
    setBackCoverLogo(s.backCoverLogo !== undefined ? s.backCoverLogo : { xPct: 50, yPct: 50, scalePct: 100 });
    setBackCoverPhoto(s.backCoverPhoto);
    setBackCoverBackgroundColor(s.backCoverBackgroundColor);
    setCoverPatternId(s.coverPatternId);
    setBackCoverTextBoxes(s.backCoverTextBoxes);
    setCoverSpineBackgroundColor(s.coverSpineBackgroundColor);
    setCoverFrontBackgroundColor(s.coverFrontBackgroundColor);
    setCoverTextBoxes(s.coverTextBoxes);
    setCoverImageBoxes(s.coverImageBoxes ?? []);
    setBackCoverImageBoxes(s.backCoverImageBoxes ?? []);
    setCoverTableBoxes(s.coverTableBoxes ?? []);
    setBackCoverTableBoxes(s.backCoverTableBoxes ?? []);
    setActiveTableBox(null);
    setActiveTextBox(null);
    setActiveCoverImageBox(null);
    setBackCoverLogoSelected(false);
  }

  // 매 렌더마다 지금 상태를 스냅샷으로 찍어서, 직전 스냅샷과 다르면(=혜민님이 뭔가
  // 바꿨으면) 직전 스냅샷을 실행취소 스택에 쌓아요. 되돌리기/다시하기로 인한 변경은
  // isRestoringHistoryRef로 표시해서 다시 쌓지 않아요.
  useEffect(() => {
    const snap = buildHistorySnapshot();
    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      lastHistorySnapshotRef.current = snap;
      // 되돌리기/다시실행으로 인한 변경은 새 묶음을 시작하지 않아요.
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      burstBaseSnapshotRef.current = null;
      return;
    }
    if (lastHistorySnapshotRef.current !== null && lastHistorySnapshotRef.current !== snap) {
      // 지금 이어지는 변화 묶음이 처음 시작될 때만 "시작 전" 상태를 기억해두고, 그 뒤로
      // 계속 바뀌는 동안은 타이머를 계속 미뤄요. 다 멈추면(HISTORY_DEBOUNCE_MS 동안
      // 조용) 그때 한 번만 실행취소 스택에 쌓여요 — 드래그 하나 = 실행취소 한 단계.
      if (burstBaseSnapshotRef.current === null) {
        burstBaseSnapshotRef.current = lastHistorySnapshotRef.current;
      }
      if (historyDebounceTimerRef.current) clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = setTimeout(() => {
        historyDebounceTimerRef.current = null;
        flushPendingHistoryBurst();
      }, HISTORY_DEBOUNCE_MS);
    }
    lastHistorySnapshotRef.current = snap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customSpreads,
    coverPhoto,
    coverTitle,
    coverTitleFontSizePt,
    coverTitleLineHeightEm,
    coverTitleLetterSpacingEm,
    coverTitleXPct,
    coverTitleYPct,
    coverTitleFontFamily,
    coverTitleAlign,
    spineTitleYPct,
    spineTitleHeightPct,
    spineTitleFontSizePt,
    spineTitleFontFamily,
    titleFontLinked,
    backCoverLogo,
    backCoverPhoto,
    backCoverBackgroundColor,
    coverPatternId,
    backCoverTextBoxes,
    coverSpineBackgroundColor,
    coverFrontBackgroundColor,
    coverTextBoxes,
    coverImageBoxes,
    backCoverImageBoxes,
    coverTableBoxes,
    backCoverTableBoxes,
  ]);

  function handleUndo() {
    flushPendingHistoryBurst();
    const prevSnap = undoStackRef.current.pop();
    if (prevSnap === undefined) return;
    const current = lastHistorySnapshotRef.current ?? buildHistorySnapshot();
    redoStackRef.current.push(current);
    restoreHistorySnapshot(prevSnap);
  }

  function handleRedo() {
    flushPendingHistoryBurst();
    const nextSnap = redoStackRef.current.pop();
    if (nextSnap === undefined) return;
    const current = lastHistorySnapshotRef.current ?? buildHistorySnapshot();
    undoStackRef.current.push(current);
    restoreHistorySnapshot(nextSnap);
  }

  // 텍스트박스가 표지/뒤표지/내지 중 어디 속해있는지에 상관없이 "지금 활성화된 자리에
  // 새 박스를 하나 더 넣기"를 할 수 있게 해줘요(붙여넣기용).
  function addTextBoxToRef(ref: TextBoxRef, box: TextBoxDef) {
    if (ref.scope === "cover") {
      setCoverTextBoxes((prev) => [...prev, box]);
    } else if (ref.scope === "backCover") {
      setBackCoverTextBoxes((prev) => [...prev, box]);
    } else {
      const key = ref.side === "left" ? "textBoxesLeft" : "textBoxesRight";
      setCustomSpreads((prev) =>
        prev.map((s, i) => (i === ref.spreadIndex ? { ...s, [key]: [...(s[key] ?? []), box] } : s))
      );
    }
    selectTextBox(ref, box.id);
  }

  function handleCopyActiveTextBox() {
    if (!activeTextBoxDef) return;
    copiedTextBoxRef.current = activeTextBoxDef;
  }

  function handlePasteTextBox() {
    const copied = copiedTextBoxRef.current;
    if (!copied || !activeTextBox) return;
    const box: TextBoxDef = {
      ...copied,
      id: crypto.randomUUID(),
      xPct: Math.min(90, copied.xPct + 3),
      yPct: Math.min(90, copied.yPct + 3),
    };
    addTextBoxToRef(activeTextBox.ref, box);
  }

  function handleZoomIn() {
    setCanvasZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100));
  }
  function handleZoomOut() {
    setCanvasZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 100) / 100));
  }
  function handleZoomReset() {
    setCanvasZoom(1);
    // 창 크기가 바뀌어도 배율을 자동으로 안 바꾸는 대신, 사용자가 이 버튼을 직접 눌렀을
    // 때만 지금 뷰포트 크기 기준으로 "화면에 맞추기"를 다시 계산해요.
    setCanvasFitToken((t) => t + 1);
  }

  // 실행취소(Ctrl/Cmd+Z), 다시실행(Ctrl/Cmd+Shift+Z 또는 Ctrl/Cmd+Y), 텍스트박스
  // 복사·붙여넣기(Ctrl/Cmd+C/V)를 전역 단축키로 등록해요. 텍스트를 직접 입력 중일
  // 때(input·textarea)는 브라우저 기본 동작(글자 단위 실행취소 등)을 그대로 두고
  // 가로채지 않아요.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }
    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // ESC: 텍스트박스가 선택돼 있으면(글자를 입력하는 중이어도) 바로 지워요 — ESC는
      // 원래 "취소/빠져나가기" 용도라 텍스트 입력 중에 눌러도 글자가 지워질 걱정이 없어요.
      // 백스페이스는 입력 중이 아닐 때(=박스만 선택된 상태)만 지워요 — 입력 중에는 글자
      // 지우기 동작을 그대로 둬야 해요.
      if (!meta && key === "escape" && activeTextBox) {
        e.preventDefault();
        deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId);
        return;
      }
      // 이미지박스도 텍스트박스와 같은 방식으로 ESC/백스페이스로 지워요.
      if (!meta && key === "escape" && activeImageBox) {
        e.preventDefault();
        handleDeleteImageBox(activeImageBox.spreadIndex, activeImageBox.boxId);
        return;
      }
      if (!meta && key === "backspace" && !isTypingTarget(e.target)) {
        if (activeTextBox) {
          e.preventDefault();
          deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId);
        } else if (activeImageBox) {
          e.preventDefault();
          handleDeleteImageBox(activeImageBox.spreadIndex, activeImageBox.boxId);
        }
        return;
      }

      // 2026-09-30, 혜민님 확인: "Ctrl+Alt = 드래그해서 복사(제자리복사 아님)" — 이전
      // 라운드엔 조합키를 누르는 순간 제자리에서 바로 복사되는 키보드 전용 단축키가
      // 있었는데, 그게 "드래그로 복사"가 아니라 잘못된 동작이라 지적받아서 통째로
      // 없앴어요. Alt-드래그(ImageBoxOverlay의 onAltDragDuplicate, altKey만 보므로
      // Ctrl이 같이 눌려 있어도 그대로 동작)가 이미 "Ctrl+Alt+드래그 = 복사"를
      // 충족하고, Ctrl+Alt+Shift+드래그의 가로 고정은 dragStart.current.axisLockX로
      // 처리해요(위 handleMouseDown/handleMouseMove).
      if (!meta) return;
      if (isTypingTarget(e.target)) {
        // 텍스트박스 안에서도 "붙여넣기"는 박스 자체를 복제하는 우리 기능과 헷갈릴 수
        // 있어서, 실행취소/다시실행만 브라우저 기본값에 맡기고 나머지는 건드리지 않아요.
        return;
      }
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if (key === "z") {
        e.preventDefault();
        handleUndo();
      } else if (key === "y") {
        e.preventDefault();
        handleRedo();
      } else if (key === "c") {
        e.preventDefault();
        handleCopyActiveTextBox();
      } else if (key === "d" && e.altKey && activeImageBox) {
        e.preventDefault();
        handleDuplicateActiveImageBox(e.shiftKey);
      } else if (key === "v") {
        e.preventDefault();
        handlePasteTextBox();
      } else if (key === "=" || key === "+") {
        e.preventDefault();
        handleZoomIn();
      } else if (key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (key === "0") {
        e.preventDefault();
        handleZoomReset();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTextBoxDef, activeTextBox, activeImageBox]);

  async function uploadPhotoToStorage(photo: Photo): Promise<string> {
    const blob = await fetch(photo.url).then((res) => res.blob());
    const ext = blob.type.split("/")[1]?.split("+")[0] || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from("order-photos").upload(path, blob);
    if (error) throw error;

    const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  // 포토북 편집 내용을 실제 인쇄용 PDF(내지 1개 + 표지 1개)로 만들어서 Storage에 올리고,
  // 다운로드 링크를 주문 photos 배열에 특별한 표시(note: "[인쇄파일] ...")로 함께 담아요.
  // 혜민님은 관리자 화면에서 이 링크로 바로 파일을 받아 발주할 수 있어요.
  //
  // 주의: 표지의 책등(세네카) 폭은 참고용 예상치예요. 실제 발주 전에는 꼭 제작처
  // 계산기로 다시 확인해주세요. (자세한 내용은 lib/printCompose.ts 상단 설명 참고)
  async function generatePhotobookPrintFiles(): Promise<
    { url: string; caption: string; note: string }[]
  > {
    if (!template) return [];

    const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
    const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const innerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
    const trimMatch = (sizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const trimCm = trimMatch ? parseFloat(trimMatch[1]) : 30;

    const { printBlob: innerBlob, guideBlob: innerGuideBlob } = await buildInnerPrintPdf({
      customSpreads,
      spreadPhotoGroups,
      photos,
      productionFileSizeMm: sizeInfo?.productionFileSizeMm ?? null,
      // "마지막 소개 페이지"를 내지 맨 마지막 장으로 자동으로 붙여요.
      introPage: { coverPhoto, coverTitle, introDate: introPublishDate, introMaker: introMakerName },
    });
    const { printBlob: coverBlob, guideBlob: coverGuideBlob } = await buildCoverPrintPdf({
      cover: photobookCover === "hard" ? "hard" : "soft",
      sizeInnerTrimMm: trimCm * 10,
      coverPhoto,
      coverTitle,
      coverTitleFontSizePt,
      coverTitleLineHeightEm,
      coverTitleLetterSpacingEm,
      coverTitleFontFamily,
      coverTitleAlign,
      coverTitleXPct,
      coverTitleYPct,
      coverTitleWidthPct,
      innerPaperWeightG: innerPaper.weightG,
      pages,
      spineTitleYPct: spineTitleYPct ?? undefined,
      spineTitleHeightPct,
      spineTitleFontSizePt: spineTitleFontSizePt ?? undefined,
      spineTitleFontFamily,
      backCoverLogo,
      backCoverPhoto,
      backCoverBackgroundColor,
      coverPatternId,
      backCoverTextBoxes,
      coverSpineBackgroundColor,
      coverFrontBackgroundColor,
      coverTextBoxes,
      coverImageBoxes,
      backCoverImageBoxes,
      coverTableBoxes,
      backCoverTableBoxes,
    });

    const uuid = () => crypto.randomUUID();
    const files: { path: string; blob: Blob }[] = [
      { path: `print-files/${uuid()}-inner.pdf`, blob: innerBlob },
      { path: `print-files/${uuid()}-inner-guide.pdf`, blob: innerGuideBlob },
      { path: `print-files/${uuid()}-cover.pdf`, blob: coverBlob },
      { path: `print-files/${uuid()}-cover-guide.pdf`, blob: coverGuideBlob },
    ];

    const uploads = await Promise.all(
      files.map((f) =>
        supabase.storage.from("order-photos").upload(f.path, f.blob, { contentType: "application/pdf" })
      )
    );
    const uploadError = uploads.find((u) => u.error);
    if (uploadError?.error) throw uploadError.error;

    const [innerUrl, innerGuideUrl, coverUrl, coverGuideUrl] = files.map(
      (f) => supabase.storage.from("order-photos").getPublicUrl(f.path).data.publicUrl
    );

    const spineIsConfirmed = calcEstimatedSpineWidthMm(innerPaper.weightG, pages, photobookCover === "hard" ? "hard" : "soft")
      .isConfirmed;
    const coverNote = spineIsConfirmed
      ? "[인쇄파일] 표지 PDF (책등 폭: 레드프린팅 실측 확인값 적용)"
      : "[인쇄파일] 표지 PDF (책등 폭은 참고용 예상치 — 발주 전 재확인 필요)";

    return [
      { url: innerUrl, caption: "", note: "[인쇄파일] 내지 PDF" },
      { url: coverUrl, caption: "", note: coverNote },
      { url: innerGuideUrl, caption: "", note: "[가이드] 내지 확인용 PDF (재단선·안전선 표시 — 발주 금지, 확인 후 버려주세요)" },
      { url: coverGuideUrl, caption: "", note: "[가이드] 표지 확인용 PDF (재단선·안전선·책등 경계 표시 — 발주 금지, 확인 후 버려주세요)" },
    ];
  }

  // [테스트용] 지금 화면에 편집 중인 내용(photos, customSpreads)을 그대로 새 pdf-lib
  // 생성기에 넣어서 샘플 PDF를 만들고 바로 다운로드해요. Storage 업로드나 주문 흐름과는
  // 완전히 분리되어 있어서, 여러 번 눌러봐도 실제 주문/데이터에는 아무 영향이 없어요.
  async function handlePdfLibTest() {
    setPdfLibTestState({ status: "running" });
    try {
      const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
      const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
      const result = await buildInnerPrintPdfLib({
        customSpreads,
        spreadPhotoGroups,
        photos,
        productionFileSizeMm: sizeInfo?.productionFileSizeMm ?? null,
        introPage: { coverPhoto, coverTitle, introDate: introPublishDate, introMaker: introMakerName },
      });

      const objectUrl = URL.createObjectURL(result.printBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `pdflib-test-inner-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setPdfLibTestState({
        status: "done",
        info: `생성 완료 — ${result.pageCount}쪽 / 용지(재단표시 포함) ${result.mediaSizeMm.w}×${result.mediaSizeMm.h}mm / 도련 포함 작업사이즈 ${result.workSizeMm.w}×${result.workSizeMm.h}mm / 재단(완성) ${result.trimSizeMm.w}×${result.trimSizeMm.h}mm / 도련폭 ${result.bleedMm}mm`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPdfLibTestState({ status: "error", message });
      // eslint-disable-next-line no-console
      console.error("[pdflib-test]", err);
    }
  }

  // [테스트용] 표지 펼침면 2페이지(바깥면+안쪽면) 샘플 PDF를 만들어서 바로 다운로드해요.
  // 안쪽면에 들어갈 "첫 내지/마지막 내지" 내용은 지금 화면의 customSpreads 맨 처음 면(왼쪽)과
  // 맨 마지막 면(오른쪽)을 그대로 가져와요. Storage 업로드·주문 흐름과는 무관해요.
  async function handleCoverPdfLibTest() {
    setCoverPdfLibTestState({ status: "running" });
    try {
      const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);
      const sizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
      const innerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
      const trimMatch = (sizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
      const trimCm = trimMatch ? parseFloat(trimMatch[1]) : 30;

      const firstSpread = customSpreads[0];
      const lastSpread = customSpreads[customSpreads.length - 1];
      const firstGroup = spreadPhotoGroups[0];
      const lastGroup = spreadPhotoGroups[spreadPhotoGroups.length - 1];
      const firstPage =
        firstSpread && firstGroup
          ? { templateId: firstSpread.left, photos: firstGroup.leftIndexes.map((idx) => photos[idx]).filter(Boolean) }
          : null;
      const lastPage =
        lastSpread && lastGroup
          ? { templateId: lastSpread.right, photos: lastGroup.rightIndexes.map((idx) => photos[idx]).filter(Boolean) }
          : null;

      const result = await buildCoverPrintPdfLib({
        cover: photobookCover === "hard" ? "hard" : "soft",
        sizeInnerTrimMm: trimCm * 10,
        coverPhoto,
        coverTitle,
        innerPaperWeightG: innerPaper.weightG,
        pages,
        firstPage,
        lastPage,
        spineTitleOffsetRatio: coverSpineTitleOffset,
      });

      const objectUrl = URL.createObjectURL(result.printBlob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `pdflib-test-cover-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);

      setCoverPdfLibTestState({
        status: "done",
        info: `생성 완료 — 2쪽(1p 바깥면/2p 안쪽면) / 펼침면 전체 ${result.outerSizeMm.w}×${result.outerSizeMm.h}mm / 표지판 ${result.panelMm}mm / 책등 ${result.spineMm}mm(${result.spineIsConfirmed ? "실측" : "예상치"}) / 도련 ${result.bleedMm}mm` +
          (result.spineTitleFits === false ? " / ⚠️ 책등 제목이 길어서 최소 크기로도 다 안 들어갔어요" : "") +
          (result.spineLogoDrawn === false ? " / ⚠️ 책등이 좁아 로고를 생략했어요" : ""),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCoverPdfLibTestState({ status: "error", message });
      // eslint-disable-next-line no-console
      console.error("[pdflib-cover-test]", err);
    }
  }

  async function handleProceed(nextUrl: string, photosToUpload: Photo[], note?: string) {
    setIsSaving(true);
    try {
      const uploadedPhotos = await Promise.all(
        photosToUpload.map(async (p) => ({ ...p, url: await uploadPhotoToStorage(p) }))
      );

      // 텀블러 각인 요청사항이나 하드케이스 배경색상처럼 사진이 아닌 메모는
      // 실제 이미지 업로드 없이 photos 배열 맨 뒤에 { url: "", note } 형태로 함께 담아요.
      // (colorNote는 이 페이지에서 고칠 수 없는, 이전 단계에서 자동으로 붙은 메모예요.)
      const notePhotos = [note, colorNote]
        .filter((n): n is string => !!n && n.trim() !== "")
        .map((n) => ({ url: "", caption: "", note: n.trim() }));

      let printFilePhotos: { url: string; caption: string; note: string }[] = [];
      if (isPhotobook && template) {
        setIsGeneratingPrintFiles(true);
        try {
          printFilePhotos = await generatePhotobookPrintFiles();
        } catch (err) {
          console.error(err);
          alert(
            "인쇄용 파일을 만드는 중 문제가 발생했어요. 주문은 계속 접수되고, 인쇄 파일은 나중에 다시 만들어드릴게요."
          );
        } finally {
          setIsGeneratingPrintFiles(false);
        }
      }

      const draft = {
        productName,
        sizeId: selectedSizeInfo.id,
        sizeLabel: displaySizeLabel,
        sizeDetail: displaySizeDetail,
        quantity,
        unitPrice,
        templateId: template?.id ?? null,
        photos: [...uploadedPhotos, ...notePhotos, ...printFilePhotos],
      };

      sessionStorage.setItem("keepic_draft_order", JSON.stringify([draft]));
      router.push(nextUrl);
    } catch (err) {
      console.error(err);
      alert("사진을 올리는 중 문제가 발생했어요. 다시 시도해주세요.");
      setIsSaving(false);
    }
  }

  if (config.maxPhotos > 1 && template) {
    // 스프레드 1(index 0)의 왼쪽 면은 표지 뒷면이라 인쇄되지 않는 빈 면으로 고정돼서
    // 필요한 사진 장수에서 제외해요. (computeSpreadPhotoGroups와 같은 기준)
    const requiredCount = customSpreads.reduce(
      (total, s, i) =>
        total + (i === 0 ? 0 : pageTemplates[s.left].photoCount) + pageTemplates[s.right].photoCount,
      0
    );
    // "AI 맞춤 레이아웃"은 이제 칸 개수가 정해져 있지 않고(전부 자유 배치 이미지박스라서
    // requiredCount가 늘 0으로 계산돼요) 사진을 몇 장을 올리든 자유롭게 배치할 수 있어요 —
    // 그래서 "정확히 N장" 검사 대신 최소 1장만 있으면 다음으로 넘어갈 수 있게 해요.
    const isPhotoCountValid = isAiAuto ? photos.length >= 1 : photos.length === requiredCount;
    const lowResCount = photos.filter((p) => isLowRes(p, requiredMinPx / 2)).length;

    const nextUrl = `/checkout?product=${encodeURIComponent(
      productName
    )}&size=${selectedSizeInfo.id}&quantity=${quantity}`;

    const spreadPhotoGroups = computeSpreadPhotoGroups(customSpreads);

    // 작업선·재단선·안전선 미리보기용 비율이에요. (실제 발주 파일의 수치와 같은 값을 써요:
    // lib/printCompose.ts의 printFileSpec.innerTrimBleedMm / GUIDE_SAFETY_MARGIN_MM)
    // 스프레드는 왼쪽+오른쪽 페이지 두 장이 나란히 붙은 통짜 작업 사이즈라서, 가로 비율은
    // 페이지 폭의 2배를 기준으로 계산해요. (가로/세로 기준을 따로 둬야 점선이 딱 맞아요)
    const guideSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const guideWorkMatch = (guideSizeInfo?.productionFileSizeMm ?? "").match(/(\d+(\.\d+)?)/);
    const guidePageWorkMm = guideWorkMatch ? parseFloat(guideWorkMatch[1]) : 310;
    const guideSpreadWorkMm = guidePageWorkMm * 2;
    const GUIDE_BLEED_MM = 5;
    const GUIDE_SAFETY_MM = 15; // lib/printCompose.ts의 GUIDE_SAFETY_MARGIN_MM과 같은 값(2026-09-26, 10→15mm)
    const trimXPct = (GUIDE_BLEED_MM / guideSpreadWorkMm) * 100;
    const trimYPct = (GUIDE_BLEED_MM / guidePageWorkMm) * 100;
    // "변형(mm)" 패널은 혜민님 요청으로 제거됐어요(2026-09-24, 캔버스 위 드래그·손잡이로도
    // 위치·크기 조절이 되니 중복이라는 판단) — 여기서만 쓰이던 mm↔퍼센트 변환 함수들도
    // 함께 정리했어요. 다음 라운드에 "테두리"·"사진틀모양" 기능을 만들 때 비슷한 변환이
    // 다시 필요하면 이 커밋(git log)에서 되살릴 수 있어요.
    // "인쇄 미리보기"에서 재단선 안쪽만 확대해서 꽉 차게 보여주는 배율이에요 — 가운데를
    // 기준으로 확대하면 도련(bleed) 부분이 바깥으로 밀려나서 overflow-hidden에 자동으로
    // 잘려나가고, 재단선 안쪽 라인이 딱 상자 테두리에 맞춰져요.
    const previewScaleX = 100 / (100 - 2 * trimXPct);
    const previewScaleY = 100 / (100 - 2 * trimYPct);
    // 바깥쪽(재단 기준) 안전 여백 — 위/아래 및 왼쪽 페이지의 왼쪽·오른쪽 페이지의 오른쪽
    // (제본부 반대쪽) 가장자리에 써요.
    const safetyOuterXPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guideSpreadWorkMm) * 100;
    const safetyYPct = ((GUIDE_BLEED_MM + GUIDE_SAFETY_MM) / guidePageWorkMm) * 100;
    // 제본부(가운데) 전용 안전 여백 — 바깥쪽 안전 여백과 다른 값을 써요(제본 때문에 접히는
    // 쪽이라 더 넓은 여백이 필요해요). 표지 책등 폭과는 무관하게, 내지 자체의 여백이에요.
    // ⚠️ 추정치예요 — 실제 제본 방식(무선철 등) 확인이 필요해요.
    const GUIDE_BINDING_MARGIN_MM = 15;
    const bindingHalfPct = (GUIDE_BINDING_MARGIN_MM / guideSpreadWorkMm) * 100;
    const bindingCenterPct = 50;
    const bindingLeftEdgePct = bindingCenterPct - bindingHalfPct; // 왼쪽 페이지 안전영역의 오른쪽(제본쪽) 경계
    const bindingRightEdgePct = bindingCenterPct + bindingHalfPct; // 오른쪽 페이지 안전영역의 왼쪽(제본쪽) 경계
    // 왼쪽·오른쪽 페이지 각각 닫힌 사각형(재단 기준 3면 + 제본부 1면)이에요. 표지의 책등
    // 폭은 여기 더하지 않아요 — 내지는 각 페이지 안쪽에서 제본 여백을 확보하는 방식이에요.
    const leftPageSafetyLeftPct = safetyOuterXPct;
    const leftPageSafetyRightPct = bindingLeftEdgePct;
    const rightPageSafetyLeftPct = bindingRightEdgePct;
    const rightPageSafetyRightPct = 100 - safetyOuterXPct;
    const innerSafetyFits = leftPageSafetyRightPct > leftPageSafetyLeftPct; // 페이지가 너무 좁으면 박스가 찌그러질 수 있어요

    // 이미지박스 크기 조절 스냅용 안내선이에요(2026-09-22, 혜민님 요청) — 재단선·
    // 안전영역·펼침면 중앙(책등/제본 경계)까지 포함해서, 손잡이를 끌 때 가까우면 자동으로
    // 달라붙어요. 화면에 보이는지(showGuidelines 등)와 무관하게 항상 스냅 대상이에요.
    const imageBoxGuidesX = [
      0,
      100,
      bindingCenterPct,
      bindingLeftEdgePct,
      bindingRightEdgePct,
      trimXPct,
      100 - trimXPct,
      safetyOuterXPct,
      100 - safetyOuterXPct,
    ];
    // 가로 안내선(imageBoxGuidesX)엔 펼침면 가운데(bindingCenterPct=50)가 들어있어서
    // 가운데 정렬이 스냅됐는데, 세로 안내선엔 그 대응값(세로 50%, 페이지 가운데)이
    // 빠져 있었어요 — "가로는 적용되고 세로는 적용이 안 된다"는 확인(2026-09-27) 이후
    // 추가해요.
    const imageBoxGuidesY = [0, 50, 100, trimYPct, 100 - trimYPct, safetyYPct, 100 - safetyYPct];

    // 표지(뒤표지-책등-앞표지) 실제 비율이에요. lib/printCompose.ts의 buildCoverPrintPdf와
    // 같은 계산식을 그대로 써서, 화면 미리보기가 실제 표지 인쇄 파일 비율과 일치하도록 해요.
    const coverIsHard = photobookCover === "hard";
    const coverSizeInfo = photobookSizes.find((s) => s.id === selectedSizeInfo.id);
    const coverTrimMatch = (coverSizeInfo?.finishedSizeCm ?? "").match(/(\d+(\.\d+)?)/);
    const coverTrimCm = coverTrimMatch ? parseFloat(coverTrimMatch[1]) : 30;
    const coverInnerTrimMm = coverTrimCm * 10;
    const coverInnerPaper = innerPaperOptions.find((o) => o.id === photobookInnerPaper) ?? innerPaperOptions[0];
    const coverPages = photobookPages ? Number(photobookPages) : 20;
    const coverPanelMm = coverIsHard
      ? coverInnerTrimMm + printFileSpec.hardCoverPanelOverhangMm * 2
      : coverInnerTrimMm;
    const coverBleedMm = coverIsHard ? printFileSpec.hardCoverWrapBleedMm : printFileSpec.softCoverBleedMm;
    const coverSpineInfo = calcEstimatedSpineWidthMm(coverInnerPaper.weightG, coverPages, coverIsHard ? "hard" : "soft");
    const coverSpineMm = coverSpineInfo.isConfirmed ? coverSpineInfo.estimateMm : coverSpineInfo.maxMm;
    const coverTotalWmm = coverPanelMm * 2 + coverSpineMm + coverBleedMm * 2;
    const coverTotalHmm = coverPanelMm + coverBleedMm * 2;
    const coverSpinePct = (coverSpineMm / coverTotalWmm) * 100;
    // 뒤표지·책등·앞표지를 하나의 표지 펼침면으로 보고 계산해요(2026-09 재설계). 뒤표지·
    // 앞표지 "칸"은 이제 그 바깥쪽 도련까지 포함해요 — 그래야 (1) 화면에 표시되는 칸 크기가
    // 실제 인쇄 파일의 사진 칸(도련까지 확장됨, 아래 lib/printCompose.ts 참고)과 정확히
    // 같은 비율이 되고, (2) 세 칸(뒤표지 칸+책등+앞표지 칸)의 폭을 더하면 정확히 100%가
    // 돼서 오른쪽 끝에 정체불명의 흰 여백이 남지 않아요.
    const coverBackPct = ((coverBleedMm + coverPanelMm) / coverTotalWmm) * 100;
    const coverFrontPct = ((coverPanelMm + coverBleedMm) / coverTotalWmm) * 100;
    // coverBackPct + coverSpinePct + coverFrontPct === 100

    // 아래는 표지 안내선(도련선·재단선·안전영역·책등 경계) 계산이에요. 전부 "표지 펼침면
    // 전체"를 100%로 보는 같은 좌표계를 써요(패널마다 따로 계산하지 않아요 — 그래야 점선이
    // 책등에서 끊기지 않고 하나로 이어져요).
    const coverBleedXPct = (coverBleedMm / coverTotalWmm) * 100; // 도련선(바깥 재단 경계)의 좌우 inset
    const coverBleedYPct = (coverBleedMm / coverTotalHmm) * 100; // 도련선의 상하 inset
    const coverSafetyXPct = (GUIDE_SAFETY_MM / coverTotalWmm) * 100;
    const coverSafetyYPct = (GUIDE_SAFETY_MM / coverTotalHmm) * 100;
    // 책등 좌우 경계(접힘 위치)의 x% 두 곳
    const coverSpineStartPct = coverBackPct;
    const coverSpineEndPct = coverBackPct + coverSpinePct;
    // 안전영역 상/하 경계는 뒤표지·책등·앞표지 모두 같아요(위아래 도련은 세 구역이 공통).
    const coverSafetyTopPct = coverBleedYPct + coverSafetyYPct;
    const coverSafetyBottomPct = 100 - coverBleedYPct - coverSafetyYPct;
    // 뒤표지 안전영역(재단선 안쪽으로 한 번 더 들어간 영역)
    const coverBackSafetyLeftPct = coverBleedXPct + coverSafetyXPct;
    const coverBackSafetyRightPct = coverSpineStartPct - coverSafetyXPct;
    // 앞표지 안전영역
    const coverFrontSafetyLeftPct = coverSpineEndPct + coverSafetyXPct;
    const coverFrontSafetyRightPct = 100 - coverBleedXPct - coverSafetyXPct;
    // 책등은 실측해보면(예: 소프트커버 20p 7.22mm) 11~12pt 글자도 여유 있게 들어가서,
    // 뒤표지·앞표지처럼 별도 안전영역 여백을 두지 않아요(2026-09, 사용자 확인). 책등
    // 경계(재단선)는 위 패널 테두리로 이미 보여주고 있어요.

    // 책등 키픽 로고 — 책등이 좁아서(7~9mm) 이미지를 90도로 눕혀서 넣어요(혜민님 확인:
    // "오른쪽으로 돌려서"). 재단선에서 로고 글자가 잘리지 않도록, 로고 블록의 아래쪽
    // 끝을 재단선(책등 맨 아래)에서 안전영역과 같은 10mm 띄운 자리에 둬요 — 정중앙이나
    // 임의의 비율이 아니라, 실제 mm 안전 여백을 기준으로 계산해요.
    const coverSpinePt = mmToPt(coverSpineMm);
    const coverSpineLogoLayout = computeSpineLogoLayout(coverSpinePt);
    const SPINE_LOGO_BOTTOM_MARGIN_MM = 25; // 재단선에서 로고까지 — 혜민님 확인(2026-09): 아래에서 25mm
    const SPINE_TITLE_TOP_MARGIN_MM = 25; // 책 제목 위쪽 여백 — 혜민님 확인(2026-09): 위에서 25mm
    const coverSpineTitleDefaultYPct = (SPINE_TITLE_TOP_MARGIN_MM / coverTotalHmm) * 100;
    const coverSpineTitleYPct = spineTitleYPct ?? coverSpineTitleDefaultYPct;
    // 책 제목 글자 크기 — 실제 mm 기준으로 계산해서 cqh(컨테이너 높이 대비 %)로 넣어요.
    // 고정 px이 아니라서 브라우저 창을 늘리거나 줄여도 항상 책 실물 크기 그대로예요.
    const spineTitleMaxLengthMm = (spineTitleHeightPct / 100) * coverTotalHmm;
    const spineTitleMeasure = measureSpineTitleFontSizeMm(
      coverTitle.replace(/\n/g, " ").trim(),
      coverSpineMm,
      spineTitleMaxLengthMm,
      spineTitleFontSizePt ?? undefined,
      spineTitleFontFamily
    );
    const spineTitleFontSizeCqh = (spineTitleMeasure.sizeMm / coverTotalHmm) * 100;
    // 표지 제목 글자 크기 — pt를 실제 mm로 환산해서 cqh(컨테이너 높이 대비 %)로 넣어요.
    // 고정 rem이 아니라서 창 크기가 바뀌어도 항상 pt로 지정한 실제 인쇄 크기 그대로예요.
    const coverTitleFontSizeMm = (coverTitleFontSizePt * 25.4) / 72;
    const coverTitleFontSizeCqh = (coverTitleFontSizeMm / coverTotalHmm) * 100;
    // computeSpineLogoLayout이 돌려주는 drawnWidthPt(책등 폭 방향)·drawnHeightPt(책등
    // 길이 방향)는 "눕힌 뒤(화면에 실제로 보이는)" 가로/세로예요. 회전 전 <img> 박스는
    // 가로/세로가 서로 뒤바뀌어야 rotate(90deg) 후 원하는 크기가 나와요. (표지 펼침면은
    // aspectRatio로 실측 mm 비율 그대로 렌더링돼서 가로·세로 축척이 같아요 — 그래서
    // "책등 폭 대비 %"와 "표지 전체 높이 대비 %"를 이렇게 서로 변환할 수 있어요.)
    const coverSpineLogoPreRotateWidthPct =
      coverSpinePt > 0 ? (coverSpineLogoLayout.drawnHeightPt / coverSpinePt) * 100 : 0;
    const coverSpineLogoPreRotateHeightPct = (coverSpineLogoLayout.drawnWidthPt / mmToPt(coverTotalHmm)) * 100;
    const coverSpineLogoVisibleHeightPct = (coverSpineLogoLayout.drawnHeightPt / mmToPt(coverTotalHmm)) * 100;
    const coverSpineLogoBottomMarginPct = (SPINE_LOGO_BOTTOM_MARGIN_MM / coverTotalHmm) * 100;
    const coverSpineLogoCenterYPct = 100 - coverSpineLogoBottomMarginPct - coverSpineLogoVisibleHeightPct / 2;

    return (
      <main className="flex h-dvh flex-col overflow-hidden bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
        {/* 사진이 템플릿 칸보다 많을 때 "어떤 사진을 쓸지" 고르는 팝업이에요(2026-09-23
            추가) — 취소를 누르면(바깥 클릭 포함) 아무것도 안 바뀌고 그대로 닫혀요. */}
        {pendingLayoutApply && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2"
            onClick={() => setPendingLayoutApply(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-[var(--color-hairline)] bg-white "
            >
              <div className="border-b border-[var(--color-hairline)] px-2 py-1.5">
                <p className="text-sm font-semibold">이 템플릿에 쓸 사진을 골라주세요</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-charcoal)]/50">
                  사진 칸 {pendingLayoutApply.template.slots.length}개예요. 지금 이 범위에
                  사진이 {pendingLayoutApply.candidates.length}장 있어서, 쓸 사진을
                  정확히 {pendingLayoutApply.template.slots.length}장 골라야 해요. 고르지
                  않은 사진은 그대로 남아요.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 overflow-y-auto p-2">
                {pendingLayoutApply.candidates.map((box) => {
                  const checked = pendingLayoutApplySelectedIds.includes(box.id);
                  const atLimit =
                    !checked && pendingLayoutApplySelectedIds.length >= pendingLayoutApply.template.slots.length;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      disabled={atLimit}
                      onClick={() =>
                        setPendingLayoutApplySelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== box.id) : [...prev, box.id]
                        )
                      }
                      className={`relative aspect-square overflow-hidden border-2 transition ${
                        checked
                          ? "border-[var(--color-sky)]"
                          : atLimit
                            ? "cursor-not-allowed border-[var(--color-hairline)] opacity-40"
                            : "border-transparent hover:border-[var(--color-sky)]/50"
                      }`}
                    >
                      {box.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={box.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--color-ivory)] text-[10px] text-[var(--color-charcoal)]/40">
                          빈 프레임
                        </div>
                      )}
                      {checked && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-[var(--color-sky)] text-[9px] text-white">
                          {pendingLayoutApplySelectedIds.indexOf(box.id) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[var(--color-hairline)] px-2 py-1.5">
                <p className="text-[11px] text-[var(--color-charcoal)]/50">
                  {pendingLayoutApplySelectedIds.length} / {pendingLayoutApply.template.slots.length}개 선택
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingLayoutApply(null)}
                    className=" border border-[var(--color-hairline)] px-2 py-1.5 text-xs text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={pendingLayoutApplySelectedIds.length !== pendingLayoutApply.template.slots.length}
                    onClick={() => {
                      applyLayoutTemplate(
                        pendingLayoutApply.spreadIndex,
                        pendingLayoutApply.range,
                        pendingLayoutApply.template,
                        pendingLayoutApplySelectedIds
                      );
                      setPendingLayoutApply(null);
                    }}
                    className={` px-2 py-1.5 text-xs font-medium text-white transition ${
 pendingLayoutApplySelectedIds.length === pendingLayoutApply.template.slots.length
                        ? "bg-[var(--color-charcoal)] hover:opacity-90"
                        : "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                    }`}
                  >
                    적용
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* "왼쪽/양쪽/오른쪽 페이지 중 어디에 적용할지" 묻는 팝업이에요(2026-09-27
            추가) — 레이아웃 패널을 항상 스프레드(펼침면)로 보여주면서, 실제 적용 범위는
            썸네일을 고른 다음 여기서 물어봐요(스위트북 참고 화면과 같은 방식). */}
        {layoutRangePicker && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2"
            onClick={() => setLayoutRangePicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-md flex-col overflow-hidden border border-[var(--color-hairline)] bg-white"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-3 py-2">
                <p className="text-sm font-semibold">변경하실 레이아웃을 선택해주세요</p>
                <button
                  type="button"
                  onClick={() => setLayoutRangePicker(null)}
                  className="text-[var(--color-charcoal)]/40 hover:text-[var(--color-charcoal)]"
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-3">
                {(
                  [
                    { id: "left" as const, label: "왼쪽 페이지", enabled: layoutRangePicker.allowLeft },
                    { id: "spread" as const, label: "양쪽 페이지", enabled: true },
                    { id: "right" as const, label: "오른쪽 페이지", enabled: true },
                  ]
                ).map((opt) => {
                  const halfSource = SPREAD_AUTO_TO_HALF[layoutRangePicker.template.id];
                  const isSpreadOnly = !halfSource;
                  const disabled = !opt.enabled || (isSpreadOnly && opt.id !== "spread");
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        const spreadIndex = layoutRangePicker.spreadIndex;
                        if (opt.id === "spread") {
                          applyLayoutTemplate(spreadIndex, "spread", layoutRangePicker.template);
                        } else if (halfSource) {
                          applyLayoutTemplate(spreadIndex, opt.id, halfSource);
                        }
                        setLayoutRangePicker(null);
                      }}
                      className={`flex flex-col items-center gap-1.5 border p-2 text-center transition ${
                        disabled
                          ? "cursor-not-allowed border-[var(--color-hairline)] opacity-30"
                          : "border-[var(--color-hairline)] hover:border-[var(--color-sky)]"
                      }`}
                    >
                      <div className="flex h-12 w-full overflow-hidden border border-[var(--color-hairline)] bg-[var(--color-ivory)]">
                        <div
                          className={`h-full flex-1 ${
                            opt.id === "left" || opt.id === "spread" ? "bg-transparent" : "bg-[var(--color-charcoal)]/25"
                          }`}
                        />
                        <div
                          className={`h-full flex-1 border-l border-[var(--color-hairline)] ${
                            opt.id === "right" || opt.id === "spread" ? "bg-transparent" : "bg-[var(--color-charcoal)]/25"
                          }`}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--color-charcoal)]/70">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* 표지 레이아웃 탭용 선택 팝업이에요 — 위 pendingLayoutApply 팝업(내지용)과
            같은 구조·같은 동작이에요(2026-09-24 추가). 취소하면(바깥 클릭 포함) 아무것도
            안 바뀌고 그대로 닫혀요. */}
        {pendingCoverLayoutApply && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-2"
            onClick={() => setPendingCoverLayoutApply(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-[var(--color-hairline)] bg-white "
            >
              <div className="border-b border-[var(--color-hairline)] px-2 py-1.5">
                <p className="text-sm font-semibold">이 템플릿에 쓸 사진을 골라주세요</p>
                <p className="mt-0.5 text-[11px] text-[var(--color-charcoal)]/50">
                  사진 칸 {pendingCoverLayoutApply.template.slots.length}개예요. 지금
                  사진이 {pendingCoverLayoutApply.candidates.length}장 있어서, 쓸 사진을
                  정확히 {pendingCoverLayoutApply.template.slots.length}장 골라야 해요. 고르지
                  않은 사진은 그대로 남아요.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 overflow-y-auto p-2">
                {pendingCoverLayoutApply.candidates.map((box) => {
                  const checked = pendingCoverLayoutApplySelectedIds.includes(box.id);
                  const atLimit =
                    !checked &&
                    pendingCoverLayoutApplySelectedIds.length >= pendingCoverLayoutApply.template.slots.length;
                  return (
                    <button
                      key={box.id}
                      type="button"
                      disabled={atLimit}
                      onClick={() =>
                        setPendingCoverLayoutApplySelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== box.id) : [...prev, box.id]
                        )
                      }
                      className={`relative aspect-square overflow-hidden border-2 transition ${
                        checked
                          ? "border-[var(--color-sky)]"
                          : atLimit
                            ? "cursor-not-allowed border-[var(--color-hairline)] opacity-40"
                            : "border-transparent hover:border-[var(--color-sky)]/50"
                      }`}
                    >
                      {box.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={box.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--color-ivory)] text-[10px] text-[var(--color-charcoal)]/40">
                          빈 프레임
                        </div>
                      )}
                      {checked && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center bg-[var(--color-sky)] text-[9px] text-white">
                          {pendingCoverLayoutApplySelectedIds.indexOf(box.id) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[var(--color-hairline)] px-2 py-1.5">
                <p className="text-[11px] text-[var(--color-charcoal)]/50">
                  {pendingCoverLayoutApplySelectedIds.length} / {pendingCoverLayoutApply.template.slots.length}개 선택
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingCoverLayoutApply(null)}
                    className=" border border-[var(--color-hairline)] px-2 py-1.5 text-xs text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={
                      pendingCoverLayoutApplySelectedIds.length !== pendingCoverLayoutApply.template.slots.length
                    }
                    onClick={() => {
                      applyCoverLayoutTemplate(
                        pendingCoverLayoutApply.target,
                        pendingCoverLayoutApply.template,
                        pendingCoverLayoutApplySelectedIds
                      );
                      setPendingCoverLayoutApply(null);
                    }}
                    className={` px-2 py-1.5 text-xs font-medium text-white transition ${
 pendingCoverLayoutApplySelectedIds.length === pendingCoverLayoutApply.template.slots.length
                        ? "bg-[var(--color-charcoal)] hover:opacity-90"
                        : "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                    }`}
                  >
                    적용
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 편집기 전용 상단바 — 2026-09 화면 배치 개편으로 로고 아래 빈 여백을 없애고,
            뒤로가기·로고·책 이름·실행취소/다시실행·미리보기·확대축소를 한 줄에 정돈함.
            좁은 화면에서는 flex-wrap으로 줄바꿈돼서 버튼이 겹치지 않아요. 실제로 동작하지
            않는 "저장" 버튼/상태 표시는 일부러 넣지 않았어요(혜민님 확인, 2026-09-23 —
            자동저장 기능은 이번 범위 밖). */}
        <header
          className="shrink-0 border-b border-[var(--color-hairline)] bg-[var(--color-ivory)]/95 backdrop-blur"
        >
          {/* 2026-10-05, 혜민님 요청: "현재 패널이 위쪽에 몰려있는데 사이 간격을 벌여줘
              (세로폭만, 가로는 그대로 넓히지말고)" — 좁은 화면에서 버튼들이 여러 줄로
              줄바꿈될 때 줄 사이 세로 간격만 넉넉하게(gap-y-1.5 -> gap-y-3) 늘리고, 한
              줄 안의 버튼 간 가로 간격(gap-x-1.5)은 그대로 둠. */}
          <div className="relative mx-auto flex flex-wrap items-center gap-x-1.5 gap-y-3 px-1.5 py-2 sm:px-1.5">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="뒤로가기"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-hairline)]/30 hover:text-[var(--color-charcoal)]"
            >
              ←
            </button>
            <a href="/" className="shrink-0">
              <img src="/logo.svg" alt="Keepic" className="h-6 w-auto" />
            </a>
            {/* 2026-10-04, 혜민님 요청(항목4): "Keepic 제목 없는 포토북 <- 제목없는포토북
                문구 삭제" — 표지 제목을 아직 안 정했을 때 뜨던 "제목 없는 포토북" 자리표시
                문구를 없앴어요. 제목을 이미 정했다면(coverTitle) 로고 옆에 그대로 보여줘요. */}
            {coverTitle.trim() && (
              <span className="min-w-0 max-w-[40vw] truncate text-sm font-medium text-[var(--color-charcoal)]/80 sm:max-w-xs">
                {coverTitle.trim()}
              </span>
            )}
            {photos.length > 0 && (
              <>
                {/* 미리보기/편집하기 전환 버튼은 없앴어요(2026-09-26 요청) — 포토북 위에
                    마우스를 올리면 뜨는 "편집하기" 오버레이(아래 CanvasStage 안,
                    aria-label="편집하기")로 편집 모드에 들어가요. 편집 중엔 페이지를 바꾸지
                    않고도 미리보기로 돌아갈 수 있어야 해서, 같은 자리에 작은 "완료" 버튼만
                    남겨뒀어요(편집 중일 때만 보임). */}
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {editorMode === "edit" && (
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    // 2026-09-27, 혜민님 요청: "완료, 다음 버튼들 크기가 전부 제각각이라
                    // 이상합니다" — 텍스트 길이에 따라 버튼 폭이 들쭉날쭉했던 걸, "완료"/
                    // "다음" 버튼에 공통 최소 폭(min-w)과 가운데 정렬을 줘서 비슷한
                    // 크기로 보이게 맞췄어요.
                    className="flex h-8 min-w-[68px] items-center justify-center border border-[var(--color-hairline)] bg-white px-2.5 text-xs font-medium text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    {/* 2026-10-02, 혜민님 요청: "완료 버튼을 미리보기로 문구 바꿔주세요" —
                        실제로 누르면 미리보기 모드로 돌아가는 동작이라 문구를 동작에 맞춤. */}
                    미리보기
                  </button>
                )}
                <div className="flex h-8 items-center gap-1 border border-[var(--color-hairline)] bg-white px-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleUndo}
                    title="실행취소 (Ctrl+Z)"
                    className="flex h-full items-center px-2 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    title="다시실행 (Ctrl+Shift+Z)"
                    className="flex h-full items-center px-2 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    ↷
                  </button>
                </div>
                {editorMode === "preview" && (
                  <button
                    type="button"
                    onClick={() => setIsPrintPreview((v) => !v)}
                    title="인쇄됐을 때 모습(재단선·안내선 숨김)으로 전환해요"
                    className={`flex h-8 min-w-[68px] items-center justify-center border px-1.5 text-xs font-medium transition ${
 isPrintPreview
                        ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                        : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]/70 hover:bg-[var(--color-ivory)]"
                    }`}
                  >
                    🖨️ 인쇄 미리보기
                  </button>
                )}
                <div className="flex h-8 items-center gap-1 border border-[var(--color-hairline)] bg-white px-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    title="축소 (Ctrl+-)"
                    className="flex h-full items-center px-2 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    title="화면에 맞추기 (Ctrl+0) — 지금 화면에 보이는 크기가 실제 크기 대비 몇 %인지예요"
                    className="flex h-full w-14 items-center justify-center px-1 text-center text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    {/* 2026-09-24, 혜민님 요청: 창을 좁혀 캔버스가 실제로 작아져도 이 숫자가
                        계속 "100%"로 고정돼 있던 문제 — 이제 CanvasStage가 보고하는 실제
                        크기(mm) 기준 % (actualSizePercent)를 우선 보여주고, 그 값이 아직
                        없을 때만(예: 소개 페이지처럼 mm 기준이 없는 화면) 줌 배율로 대체해요. */}
                    {Math.round(actualSizePercent ?? canvasZoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    title="확대 (Ctrl+=)"
                    className="flex h-full items-center px-2 text-[var(--color-charcoal)]/70 transition hover:bg-[var(--color-ivory)]"
                  >
                    +
                  </button>
                </div>
                {isPhotoCountValid ? (
                  <button
                    type="button"
                    onClick={() => handleProceed(nextUrl, photos)}
                    disabled={isSaving}
                    className={`flex h-8 min-w-[68px] shrink-0 items-center justify-center px-2.5 text-xs font-medium text-white transition ${
                      isSaving
                        ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                        : "bg-[var(--color-charcoal)] hover:opacity-90"
                    }`}
                  >
                    {isGeneratingPrintFiles
                      ? "인쇄 파일 만드는 중..."
                      : isSaving
                        ? "사진 올리는 중..."
                        : "다음"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex h-8 min-w-[68px] shrink-0 cursor-not-allowed items-center justify-center bg-[var(--color-hairline)] px-2.5 text-xs font-medium text-white/70"
                  >
                    다음
                  </button>
                )}
              </div>
              </>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {isPdfLibTestMode && (
          <section className="mx-auto w-full max-w-5xl shrink-0 px-1.5 pt-4 sm:px-10">
            <div className="mt-4 border border-dashed border-[var(--color-charcoal)]/30 bg-white/60 p-2">
              <p className="text-sm font-medium">🧪 새 PDF 생성기 테스트 (pdf-lib) — 주문/저장과 무관해요</p>
              <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                지금 화면에 있는 사진·캡션 편집 내용 그대로 샘플 PDF(내지만)를 만들어서 바로
                다운로드해요. 기존 &quot;다음&quot; 진행이나 주문 저장과는 전혀 연결되어 있지 않아요.
              </p>
              <button
                type="button"
                onClick={handlePdfLibTest}
                disabled={pdfLibTestState.status === "running"}
                className="mt-3 bg-[var(--color-charcoal)] px-2 py-2 text-sm text-white transition disabled:opacity-50"
              >
                {pdfLibTestState.status === "running" ? "생성 중…" : "테스트 샘플 PDF 만들기"}
              </button>
              {pdfLibTestState.status === "done" && (
                <p className="mt-2 text-xs text-emerald-700 break-keep">✅ {pdfLibTestState.info}</p>
              )}
              {pdfLibTestState.status === "error" && (
                <p className="mt-2 text-xs text-red-600 break-keep">
                  ❌ 에러: {pdfLibTestState.message}
                </p>
              )}

              <div className="mt-4 border-t border-dashed border-[var(--color-charcoal)]/20 pt-4">
                <p className="text-sm font-medium">🧪 표지 펼침면 테스트 (바깥면+안쪽면 2쪽)</p>
                <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                  표지 사진·제목 + 지금 화면의 맨 처음/맨 마지막 페이지 내용으로 표지 펼침면
                  샘플 PDF(2쪽)를 만들어요. 이것도 주문·저장과 무관해요. 책등에는 위 제목과
                  Keepic 로고가 옆으로 눕혀서 들어가요(제목은 아래 슬라이더로 위/아래 위치만
                  조정 가능, 로고는 책등 아래쪽에 고정).
                </p>
                <div className="mt-3">
                  <label className="text-xs text-[var(--color-charcoal)]/70">
                    책등 제목 위치 (위 ↔ 아래)
                  </label>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={coverSpineTitleOffset}
                    onChange={(e) => setCoverSpineTitleOffset(Number(e.target.value))}
                    className="mt-1 w-full"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--color-charcoal)]/40">
                    <span>위쪽</span>
                    <span>정중앙</span>
                    <span>아래쪽</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCoverPdfLibTest}
                  disabled={coverPdfLibTestState.status === "running"}
                  className="mt-3 bg-[var(--color-charcoal)] px-2 py-2 text-sm text-white transition disabled:opacity-50"
                >
                  {coverPdfLibTestState.status === "running" ? "생성 중…" : "표지 테스트 샘플 PDF 만들기"}
                </button>
                {coverPdfLibTestState.status === "done" && (
                  <p className="mt-2 text-xs text-emerald-700 break-keep">✅ {coverPdfLibTestState.info}</p>
                )}
                {coverPdfLibTestState.status === "error" && (
                  <p className="mt-2 text-xs text-red-600 break-keep">
                    ❌ 에러: {coverPdfLibTestState.message}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="flex w-full min-h-0 flex-1 flex-col bg-[var(--color-hairline)]/15 pl-0 pr-2 pb-4 pt-0 sm:pr-1.5 lg:pr-2">
          {photos.length === 0 && (
            <div className="mx-auto flex max-w-md flex-col items-center gap-1.5 py-16 text-center">
              <p className="text-[var(--color-charcoal)]/70 break-keep">
                {isAiAuto
                  ? "사진을 올리면 AI가 개수와 비율에 맞춰 자동으로 배치해드려요."
                  : `이 디자인은 정확히 사진 ${requiredCount}장이 필요해요.`}
              </p>
              <label className="inline-block cursor-pointer bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-sm font-medium text-white transition hover:opacity-90">
                사진 선택하기
                <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}
          {photos.length > 0 && (
            // PC 큰 화면에서는 좌우에 흰 여백이 남지 않도록 폭 제한을 풀어요(예전엔
            // max-w-6xl로 가운데 고정폭이었는데, 넓은 모니터에서 편집 캔버스 양옆이
            // 허전해 보인다는 피드백을 반영했어요 — 스위트북 편집기처럼 꽉 차게).
            <div
              // 2026-10-02, 혜민님 요청: "가로폭을 3분의2로 줄여달라는 얘기를 잘못
              // 알아들었나봅니다" — 편집 영역 전체가 아니라 왼쪽 아이콘 메뉴 옆에 뜨는
              // "편집칸"(속성 패널, 아래 세 곳: 288px에서 224px로 축소)을 줄여야 하는
              // 거였음. 전체 폭은 다시 lg:max-w-none으로 꽉 채움(2026-10-01의
              // lg:w-2/3는 되돌림).
              className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 lg:max-w-none lg:flex-row"
              style={{ minHeight: 420 }}
            >
              {/* 왼쪽(데스크톱)/하단(모바일) 페이지 목록 — "미리보기" 모드일 때만 보여요.
                  2026-09-28 재확인: "스프레드 페이지 왼쪽패널로 옮기는 부분 적용
                  안됐습니다" — 예전 커밋 코멘트엔 "왼쪽 세로 사이드바"라고 적혀
                  있었지만, 실제로는 이 블록이 캔버스 영역 뒤(같은 lg:flex-row 안의
                  두 번째 자식)에 그대로 있어서 화면엔 오른쪽에 보이고 있었어요 — DOM
                  순서만 캔버스보다 앞으로 옮겨서 실제로 왼쪽에 오도록 고침. min-h-0을
                  더해서(2026-09-28, "페이지 패널이 세로로 너무 깁니다") flex 자식
                  기본값(min-height:auto) 때문에 내부 overflow-y-auto가 안 먹히고
                  페이지가 많을수록 패널 전체가 책자 높이보다 길게 늘어나던 문제도
                  같이 고침 — 이제 책자(캔버스)와 같은 높이로 고정되고 그 안에서만
                  스크롤돼요. */}
              {editorMode === "preview" && (
              <div
                className="mt-3 flex min-h-0 shrink-0 items-center gap-2 lg:mt-0 lg:h-full lg:w-28 lg:flex-none lg:flex-col lg:items-stretch lg:border-r lg:border-[var(--color-hairline)] lg:pr-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    const order = pageOrder;
                    const idx = order.findIndex((k) => k === selectedPageKey);
                    if (idx > 0) setSelectedPageKey(order[idx - 1]);
                  }}
                  disabled={pageOrder.findIndex((k) => k === selectedPageKey) <= 0}
                  // 2026-10-01, 혜민님 요청: "페이지 상단과 하단에있는 화살표에 박스와
                  // 선은 없애고 아이콘만 남겨주세요" — 테두리·배경을 빼고 화살표 글자만
                  // 남김.
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-base text-[var(--color-charcoal)]/70 transition hover:text-[var(--color-charcoal)] disabled:opacity-30 lg:w-full"
                  aria-label="이전 페이지"
                >
                  ‹
                </button>
                <div
                  className="flex min-h-0 flex-1 gap-2 overflow-x-auto bg-white p-2 lg:flex-col lg:items-stretch lg:overflow-x-hidden lg:overflow-y-auto"
                  // 이 줄 바로 위(표지·내지 캔버스 테두리)를 없앴더니, 여기 남아있던
                  // border-t가 허공에 떠 있는 선처럼 보이고, 기본 스크롤바까지 겹쳐서
                  // "박스 안에 또 박스"처럼 보인다는 피드백(2026-09-26)에 따라 border-t를
                  // 빼고 스크롤바도 다른 가로 스크롤 영역(카테고리 바 등)과 같이 얇게
                  // 바꿨어요.
                  style={{ scrollbarWidth: "thin" }}
                >
                  {isPhotobook && (
                    <button
                      type="button"
                      onClick={() => setSelectedPageKey("cover")}
                      className={`shrink-0 border-2 p-1 transition lg:w-full ${
 selectedPageKey === "cover" ? "border-[var(--color-sky)]" : "border-transparent"
                      }`}
                    >
                      <div
                        className="pointer-events-none flex h-14 overflow-hidden bg-white lg:h-auto lg:w-full"
                        style={{ aspectRatio: `${coverTotalWmm} / ${coverTotalHmm}` }}
                      >
                        <div
                          className="h-full"
                          style={{
                            width: `${coverBackPct}%`,
                            background: coverPatternId
                              ? resolveSpreadBackgroundCss(
                                  { backgroundColor: backCoverBackgroundColor, backgroundPattern: coverPatternId },
                                  "right",
                                  { panelWidthPct: coverBackPct, offsetPct: 0 }
                                )
                              : (backCoverBackgroundColor ?? "#ffffff"),
                          }}
                        />
                        <div
                          className="h-full border-x border-[#1a1a1a]/60"
                          style={{
                            width: `${coverSpinePct}%`,
                            background: coverPatternId
                              ? resolveSpreadBackgroundCss(
                                  { backgroundColor: coverSpineBackgroundColor, backgroundPattern: coverPatternId },
                                  "left",
                                  { panelWidthPct: coverSpinePct, offsetPct: coverSpineStartPct }
                                )
                              : (coverSpineBackgroundColor ?? "#ffffff"),
                          }}
                        />
                        <div
                          className="relative h-full overflow-hidden"
                          style={{
                            width: `${coverFrontPct}%`,
                            background: coverPatternId
                              ? resolveSpreadBackgroundCss(
                                  { backgroundColor: coverFrontBackgroundColor, backgroundPattern: coverPatternId },
                                  "left",
                                  { panelWidthPct: coverFrontPct, offsetPct: coverSpineEndPct }
                                )
                              : (coverFrontBackgroundColor ?? "#ffffff"),
                          }}
                        >
                          {(coverPhoto?.url ?? coverImageBoxes[0]?.url) && (
                            <img
                              src={coverPhoto?.url ?? coverImageBoxes[0]?.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">표지</p>
                    </button>
                  )}
                  {customSpreads.map((spread, i) => {
                    const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
                    const leftPhotos = leftIndexes.map((idx) => photos[idx]).filter(Boolean);
                    const rightPhotos = rightIndexes.map((idx) => photos[idx]).filter(Boolean);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedPageKey(i)}
                        className={`shrink-0 border-2 p-1 transition lg:w-full ${
 selectedPageKey === i ? "border-[var(--color-sky)]" : "border-transparent"
                        }`}
                      >
                        <div className="pointer-events-none relative h-14 overflow-hidden bg-white lg:h-auto lg:w-full" style={{ aspectRatio: "2 / 1" }}>
                          <div className="grid h-full grid-cols-2 overflow-hidden">
                            <div className="overflow-hidden">
                              {i === 0 ? (
                                <div className="flex h-full w-full items-center justify-center bg-[var(--color-ivory)]" />
                              ) : (
                                renderPage(
                                  spread.left,
                                  leftPhotos,
                                  leftIndexes,
                                  () => {},
                                  () => {},
                                  requiredMinPx,
                                  resolveSpreadBackgroundCss(spread, "right")
                                )
                              )}
                            </div>
                            <div className="overflow-hidden">
                              {renderPage(
                                spread.right,
                                rightPhotos,
                                rightIndexes,
                                () => {},
                                () => {},
                                requiredMinPx,
                                resolveSpreadBackgroundCss(spread, "left")
                              )}
                            </div>
                          </div>
                          {/* 자유 배치 이미지박스("AI 맞춤 레이아웃" 상품 등)는 위 격자 칸
                              렌더링(renderPage)이 사진을 전혀 안 그려요 — renderPage는 고정
                              템플릿 칸(photos 배열의 순번) 기준이라, 스프레드 전체 기준
                              자유 좌표인 imageBoxes는 아예 안 보고 있었어요(하단 썸네일이
                              빈칸처럼 보이던 버그의 원인). 그래서 imageBoxes는 실제 캔버스와
                              같은 스프레드 전체 0~100% 좌표를 그대로 써서 이 썸네일 위에
                              따로 겹쳐 그려요 — 별도 축소 계산 없이 그대로 얹으면 실제
                              배치와 항상 같은 자리에 보여요. */}
                          {(spread.imageBoxes ?? [])
                            // 빈 프레임(사진 없음)은 이 작은 썸네일에서도 실제 인쇄·미리보기와
                            // 똑같이 안 보여야 해서 제외해요(2026-09-23).
                            .filter((box) => box.url)
                            .map((box) => (
                              <img
                                key={box.id}
                                src={box.url}
                                alt=""
                                className="pointer-events-none absolute -[1px] border border-white/70 object-cover"
                                style={{
                                  left: `${box.xPct}%`,
                                  top: `${box.yPct}%`,
                                  width: `${box.widthPct}%`,
                                  height: `${box.heightPct}%`,
                                  transform: box.flipX ? "scaleX(-1)" : undefined,
                                }}
                              />
                            ))}
                        </div>
                        <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">
                          {formatSpreadPageLabel(i)}
                        </p>
                      </button>
                    );
                  })}
                  {isPhotobook && (
                    <button
                      type="button"
                      onClick={() => setSelectedPageKey("intro")}
                      className={`shrink-0 border-2 p-1 transition lg:w-full ${
 selectedPageKey === "intro" ? "border-[var(--color-sky)]" : "border-transparent"
                      }`}
                    >
                      <div className="pointer-events-none flex h-14 items-end overflow-hidden bg-white p-1 lg:h-auto lg:w-full" style={{ aspectRatio: "2 / 1" }}>
                        {(coverPhoto?.url ?? coverImageBoxes[0]?.url) && (
                          <img
                            src={coverPhoto?.url ?? coverImageBoxes[0]?.url}
                            alt=""
                            className="h-1/2 w-1/2 -sm object-cover"
                          />
                        )}
                      </div>
                      <p className="mt-1 text-center text-[10px] text-[var(--color-charcoal)]/60">
                        소개 페이지
                      </p>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const order = pageOrder;
                    const idx = order.findIndex((k) => k === selectedPageKey);
                    if (idx >= 0 && idx < order.length - 1) setSelectedPageKey(order[idx + 1]);
                  }}
                  disabled={(() => {
                    const idx = pageOrder.findIndex((k) => k === selectedPageKey);
                    return idx < 0 || idx >= pageOrder.length - 1;
                  })()}
                  // 2026-10-01, 혜민님 요청: "페이지 상단과 하단에있는 화살표에 박스와
                  // 선은 없애고 아이콘만 남겨주세요" — 테두리·배경을 빼고 화살표 글자만
                  // 남김.
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-base text-[var(--color-charcoal)]/70 transition hover:text-[var(--color-charcoal)] disabled:opacity-30 lg:w-full"
                  aria-label="다음 페이지"
                >
                  ›
                </button>
                <span className="shrink-0 text-xs text-[var(--color-charcoal)]/50 lg:text-center">
                  {pageOrder.findIndex((k) => k === selectedPageKey) + 1} / {pageOrder.length}
                </span>
              </div>
              )}
              {/* 인쇄 미리보기 버튼은 상단바 "미리보기" 옆 보조 버튼으로 옮겼어요(2026-09).
                  텍스트박스 바깥(빈 곳)을 누르면 선택이 풀려요 — TextBoxOverlay 쪽 mousedown은
                  stopPropagation으로 여기까지 안 올라와서, 박스 자체를 누른 경우는 안 풀려요.
                  2026-09 화면 배치 개편: 왼쪽 페이지 목록은 하단 바(아래 BottomPageBar)로
                  옮겼고, 실행취소·다시실행·미리보기·확대축소는 상단바로 옮겨서 여기는
                  편집 캔버스 한 칸만 남았어요 — 높이가 "화면 전체 − 상단바"로 고정돼 있어서
                  펼침면이 항상 중앙에 꽉 차게 보여요. */}
              <div
                className="flex min-h-0 flex-1 flex-col"
                onMouseDown={() => {
                  setActiveTextBox(null);
                  setMultiTextSelection(null);
                  setActiveImageBox(null);
                  setMultiImageSelection(null);
                  setActiveCoverImageBox(null);
                  setBackCoverLogoSelected(false);
                }}
              >
                  <div
                    className={
                      (editorMode === "preview" ? "pointer-events-none select-none " : "") +
                      "relative flex min-h-0 flex-1 flex-col"
                    }
                    onWheel={(e) => {
                      if (!e.ctrlKey && !e.metaKey) return;
                      e.preventDefault();
                      if (e.deltaY < 0) handleZoomIn();
                      else if (e.deltaY > 0) handleZoomOut();
                    }}
                  >
                    {editorMode === "preview" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode("edit");
                          setIsPrintPreview(false);
                          // 편집하기 진입 시엔 항상 접힌(아무 탭도 안 고른) 상태로 시작.
                          setActiveEditTab(null);
                          setActiveCoverEditTab(null);
                        }}
                        aria-label="편집하기"
                        className="group pointer-events-auto absolute inset-0 z-30 flex cursor-pointer items-center justify-center"
                      >
                        <span className="pointer-events-none bg-black/60 px-2.5 py-2.5 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                          ✏️ 편집하기
                        </span>
                      </button>
                    )}
                  {selectedPageKey === "cover" ? (
                    <div className="flex h-full min-h-0 flex-col px-2.5 pb-2.5">
                      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row" style={{ containerType: "inline-size" }}>
                        {editorMode === "edit" && (
                        <div className="-ml-2.5 flex gap-2 border-[var(--color-hairline)] pl-2.5 lg:-ml-[18px] lg:shrink-0 lg:border-r lg:pr-2">
                          {/* 표지도 내지처럼 왼쪽 아이콘 메뉴로 골라요 — 사진/제목/배경/텍스트박스
                              (2026-09-23, 이전엔 전부 한 화면에 세로로 나열돼 있었어요).
                              2026-09-26: 바깥 p-2.5 패딩만큼 왼쪽으로 당겨서(-ml-2.5) 아이콘이
                              화면 맨 왼쪽에 붙게 하고(스위트북 참고), 캔버스와의 경계에 세로
                              구분선(lg:border-r)을 그음. */}
                          <div className="flex flex-row gap-1 overflow-x-auto lg:w-[clamp(44px,9cqw,56px)] lg:shrink-0 lg:flex-col lg:gap-0 lg:overflow-visible">
                            {COVER_EDIT_TABS.map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveCoverEditTab(tab.id)}
                                className={`flex shrink-0 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition ${
                                  activeCoverEditTab === tab.id
                                    ? "bg-[var(--color-sky)]/15 text-[var(--color-sky)]"
                                    : "text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                }`}
                              >
                                <MenuTabIcon name={tab.icon} />
                                <span className="whitespace-nowrap">{tab.label}</span>
                              </button>
                            ))}
                          </div>
                          {/* 2026-10-02: 탭을 하나도 안 골랐으면(접힌 상태) 패널 자체를
                              안 그려서 폭을 0으로 접어요(안엔 대부분 어차피
                              activeCoverEditTab==="..." 조건이라 내용은 안 보였지만, 빈
                              칸만 224px 차지하고 있던 걸 없앰). */}
                          {activeCoverEditTab && (
                          <div
                            className="flex min-h-0 flex-col overflow-y-auto lg:w-[clamp(160px,22cqw,224px)] lg:shrink-0 lg:pr-1"
                          >
                          {activeCoverEditTab === "text" &&
                            multiTextSelection &&
                            (multiTextSelection.ref.scope === "cover" || multiTextSelection.ref.scope === "backCover") &&
                            multiTextSelection.boxIds.length >= 2 && (
                            <MultiTextAlignPanel
                              count={multiTextSelection.boxIds.length}
                              canVerticalAlign={multiTextSelectedBoxes().every((b) => b.heightPct !== undefined)}
                              onAlign={alignMultiTextBoxes}
                              onDistribute={distributeMultiTextBoxes}
                              onClear={() => setMultiTextSelection(null)}
                            />
                          )}
                          {activeCoverEditTab === "text" &&
                            activeTextBox &&
                            (activeTextBox.ref.scope === "cover" || activeTextBox.ref.scope === "backCover") && (
                            <TextBoxToolbar
                              box={activeTextBoxDef}
                              onChange={(c) => updateTextBoxByRef(activeTextBox.ref, activeTextBox.boxId, c)}
                              onDelete={() => deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId)}
                              scopeLabel={textBoxScopeLabel(activeTextBox.ref)}
                              pageWidthMm={coverPanelMm + coverBleedMm}
                            />
                          )}
                          {activeCoverEditTab === "theme" && (
                            // 2026-10-04, 혜민님 요청: "표지테마 상단에 문구삭제" — 위
                            // 설명 문단을 UI에서 없앴어요(테마를 고르면 무슨 일이 일어나는지는
                            // 표지 디자인 예시로만 보여줄 예정이라, 화면 안내문은 필요 없다고
                            // 확인해주셨어요).
                            <div className="flex flex-col gap-2">
                              {/* 2026-09-25, 혜민님 요청(항목5): "테마는 가족 여행 커플
                                  아기 생일 이렇게 5개 메뉴로 나눠주세요" — 위의 글쓰기/
                                  표만들기/이모티콘 탭과 같은 스타일(진한 차콜=선택,
                                  아이보리=선택안됨)로 카테고리 탭을 만들었어요. */}
                              <div className="flex overflow-x-auto text-[11px]" style={{ scrollbarWidth: "thin" }}>
                                {THEME_CATEGORIES.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setThemeCategoryTab(cat.id)}
                                    className={`shrink-0 border-r border-white/40 px-2 py-1.5 font-medium transition last:border-r-0 ${
                                      themeCategoryTab === cat.id
                                        ? "bg-[var(--color-charcoal)] text-white"
                                        : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60"
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {COVER_THEMES.filter((theme) => theme.category === themeCategoryTab).map((theme) => (
                                  <button
                                    key={theme.id}
                                    type="button"
                                    onClick={() => applyCoverTheme(theme.id)}
                                    className="flex w-24 flex-col items-center gap-1 border border-[var(--color-hairline)] bg-white p-1.5 text-center transition hover:border-[var(--color-charcoal)]"
                                  >
                                    <span className="flex h-10 w-full overflow-hidden">
                                      <span
                                        className="h-full flex-1"
                                        style={{ backgroundColor: theme.frontBackgroundColor }}
                                      />
                                      <span
                                        className="h-full w-1.5"
                                        style={{ backgroundColor: theme.spineBackgroundColor }}
                                      />
                                      <span
                                        className="h-full flex-1"
                                        style={{ backgroundColor: theme.backBackgroundColor }}
                                      />
                                    </span>
                                    <span className="text-[11px] text-[var(--color-charcoal)]/70">
                                      {theme.label}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {activeCoverEditTab === "photo" && (
                            <div className="flex flex-col gap-1.5">
                              {/* 2026-10-02, 혜민님 요청: "이미지 선택하면 '선택한
                                  사진박스'라고 메뉴 뜨는데 왜뜨는지 이유를 모르겠습니다"
                                  — 사진 위치 조정 모드(더블클릭)에 들어가지 않았으면 이
                                  안내문 자체가 필요 없었어요(테두리·확대·반전 등은 캔버스
                                  위 StackOrderToolbar로 이미 다 되고 있어서, 이 헤더+
                                  뒤로가기만 있는 빈 화면은 이유 없이 목록을 가리고만
                                  있었음). 실제로 조정 모드에 들어갔을 때만 이 화면으로
                                  바뀌게 함. */}
                              {activeCoverImageBox && coverImageBoxPhotoEditActive ? (
                                <>
                                  {/* 표지 사진박스를 선택한 직후엔 목록 대신 이 박스의 속성부터
                                      바로 보여줘요(2026-09, 내지 꾸미기 탭과 같은 패턴). */}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-[var(--color-charcoal)]">
                                      선택한 사진박스
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setActiveCoverImageBox(null)}
                                      className="text-[11px] text-[var(--color-charcoal)]/50 underline underline-offset-4"
                                    >
                                      ‹ 뒤로가기
                                    </button>
                                  </div>
                                  {/* "꽉 채우기" 버튼 — 혜민님 요청으로 제거(2026-09-24,
                                      "스프레드 전체 채우기 버튼이 확인됩니다. 필요
                                      없습니다. 삭제해주세요" — 표지 쪽 같은 기능도 함께
                                      제거). */}
                                  {coverImageBoxPhotoEditActive && (
                                    <div className=" border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-1.5">
                                      <p className="text-xs font-medium text-[var(--color-brand-purple)]">
                                        사진 위치 조정 중
                                      </p>
                                      <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                        박스 안에서 사진의 위치·확대·반전을 조정해요(박스 자체
                                        크기는 캔버스에서 손잡이로 조절해주세요).
                                      </p>
                                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          title="축소"
                                          onClick={() =>
                                            activeCoverImageBox &&
                                            coverImageBoxHandlesRef.current.get(activeCoverImageBox.boxId)?.zoomOut()
                                          }
                                          className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                        >
                                          −
                                        </button>
                                        <button
                                          type="button"
                                          title="확대"
                                          onClick={() =>
                                            activeCoverImageBox &&
                                            coverImageBoxHandlesRef.current.get(activeCoverImageBox.boxId)?.zoomIn()
                                          }
                                          className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                        >
                                          +
                                        </button>
                                        <button
                                          type="button"
                                          title="좌우 반전"
                                          onClick={() =>
                                            activeCoverImageBox &&
                                            coverImageBoxHandlesRef.current.get(activeCoverImageBox.boxId)?.toggleFlip()
                                          }
                                          className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                        >
                                          ⇌
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            activeCoverImageBox &&
                                            coverImageBoxHandlesRef.current.get(activeCoverImageBox.boxId)?.resetPhotoPosition()
                                          }
                                          className=" bg-white px-1.5 py-1 text-[11px] text-[var(--color-charcoal)]/70 "
                                        >
                                          초기화
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            activeCoverImageBox &&
                                            coverImageBoxHandlesRef.current.get(activeCoverImageBox.boxId)?.exitPhotoEditMode()
                                          }
                                          className=" bg-[var(--color-charcoal)] px-1.5 py-1 text-[11px] text-white"
                                        >
                                          완료
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : backCoverLogoSelected ? (
                                <>
                                  {/* 뒤표지 로고 속성 패널 — 드래그 대신 숫자 입력으로 위치·
                                      크기를 조절해요(2026-09, 실제 브라우저 드래그 동작을
                                      확인할 수 없어 안전한 방식을 택했어요). */}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-medium text-[var(--color-charcoal)]">
                                      키픽 로고
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => setBackCoverLogoSelected(false)}
                                      className="text-[11px] text-[var(--color-charcoal)]/50 underline underline-offset-4"
                                    >
                                      ‹ 뒤로가기
                                    </button>
                                  </div>
                                  {/* 2026-10-02, 혜민님 요청: "가로위치 세로위치 크기 메뉴가
                                      보이는데 삭제해주세요. 테마에따라 변경되게 하고
                                      수정하고싶을때는 이미지툴처럼 적용해서 수정할수있게
                                      할겁니다" — 숫자 입력 패널을 없앴어요. 로고 위치·크기를
                                      테마별로 정하고, 나중에 이미지박스처럼 캔버스에서 직접
                                      드래그로 조절하는 방식은 별도 작업으로 다시 요청해주세요
                                      (지금은 이 패널 자체가 빠진 상태예요). */}
                                </>
                              ) : (
                                <>
                              {/* 2026-09-25, 혜민님 요청: "편집기 메뉴 가로폭에 맞춰서
                                  배치해주세요 / 사진 메뉴는 사진 추가·사진 프레임 변경
                                  버튼을 상단에, 하단 버튼은 글상자 추가 버튼처럼 사진
                                  불러오기 버튼을 만들어주세요 / 레이아웃 탭 안내문 삭제"
                                  — 박스 개수(0/1/2+)에 따라 갈라지던 예전 3단계 화면을
                                  없애고, 항상 같은 3버튼 구성으로 통일했어요. 상단 2개는
                                  패널 폭을 절반씩 나눠 쓰고(grid-cols-2), 하단 1개는
                                  글상자 추가 버튼과 같은 그라데이션으로 패널 폭 전체를
                                  채워요. */}
                              {(() => {
                                const frameTargetBox =
                                  (activeCoverImageBox?.target === "front"
                                    ? coverImageBoxes.find((b) => b.id === activeCoverImageBox.boxId)
                                    : undefined) ?? coverImageBoxes[coverImageBoxes.length - 1];
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <label className="flex cursor-pointer items-center justify-center border border-[var(--color-sky)] px-2 py-2 text-center text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10">
                                        + 사진 추가
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => handleAddCoverPhotoBoxFromFile("front", e)}
                                          className="hidden"
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        disabled={!frameTargetBox}
                                        onClick={() => setCoverPhotoFramePanelOpen((v) => !v)}
                                        className={`border px-2 py-2 text-xs font-medium transition ${
                                          coverPhotoFramePanelOpen
                                            ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                                            : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/70 hover:border-[var(--color-charcoal)]/40"
                                        } disabled:cursor-not-allowed disabled:opacity-30`}
                                      >
                                        사진 프레임 변경
                                      </button>
                                    </div>
                                    {coverPhotoFramePanelOpen && frameTargetBox && (
                                      // 캔버스에서 사진박스를 선택했을 때 뜨는 StackOrderToolbar의
                                      // "테두리" 조절판(테두리 두께·색·모서리 둥글게)과 똑같은
                                      // 기능이에요 — handleCoverImageBoxChange로 같은 상태를 갱신.
                                      <div className="border border-[var(--color-hairline)] bg-white p-2">
                                        <p className="mb-1 text-[10px] text-[var(--color-charcoal)]/60">
                                          테두리 두께 {frameTargetBox.borderWidthPx ?? 0}px
                                        </p>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="range"
                                            min={0}
                                            max={12}
                                            step={1}
                                            value={frameTargetBox.borderWidthPx ?? 0}
                                            onChange={(e) =>
                                              handleCoverImageBoxChange(frameTargetBox.id, {
                                                borderWidthPx: Number(e.target.value),
                                              })
                                            }
                                            className="flex-1"
                                          />
                                          <input
                                            type="color"
                                            value={frameTargetBox.borderColor ?? "#ffffff"}
                                            onChange={(e) =>
                                              handleCoverImageBoxChange(frameTargetBox.id, { borderColor: e.target.value })
                                            }
                                            className="h-5 w-6 shrink-0 cursor-pointer border-none bg-transparent p-0"
                                          />
                                        </div>
                                        <p className="mb-1 mt-2 text-[10px] text-[var(--color-charcoal)]/60">
                                          모서리 둥글게 {frameTargetBox.borderRadiusPct ?? 0}%
                                          {(frameTargetBox.borderRadiusPct ?? 0) >= 50 ? " (원)" : ""}
                                        </p>
                                        <input
                                          type="range"
                                          min={0}
                                          max={50}
                                          step={1}
                                          value={frameTargetBox.borderRadiusPct ?? 0}
                                          onChange={(e) =>
                                            handleCoverImageBoxChange(frameTargetBox.id, {
                                              borderRadiusPct: Number(e.target.value),
                                            })
                                          }
                                          className="w-full"
                                        />
                                      </div>
                                    )}
                                    <label className="block cursor-pointer bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-center text-xs font-medium text-white shadow-sm shadow-[var(--color-brand-purple)]/20 transition hover:opacity-90">
                                      사진 불러오기
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleAddCoverPhotoBoxFromFile("front", e)}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                );
                              })()}
                              {/* 2026-10-02, 혜민님 요청: "뒤표지꾸미기 사진선택, 로고빼기도
                                  다 삭제 사진탭은 사진올리기, 프레임, 모서리 두께, 둥글게
                                  메뉴만 확인되게 해주세요" — "뒤표지 꾸미기"(사진선택/로고빼기)
                                  블록 전체 삭제. 프레임·모서리 두께·둥글게는 이미 내지와 똑같은
                                  ImageBoxLayer/ImageBoxOverlay를 표지에도 그대로 쓰고 있어서
                                  (위 <ImageBoxLayer boxes={coverImageBoxes} .../> 참고), 사진
                                  박스를 캔버스에서 선택하면 뜨는 StackOrderToolbar(레이어
                                  툴바)에도 테두리 두께·색·모서리 둥글게가 있어요 — 위 "사진
                                  프레임 변경" 패널은 그 기능을 이 사진 탭 안에서도 바로 쓸 수
                                  있게 한 거예요(2026-09-25). */}
                                </>
                              )}
                            </div>
                          )}
                          {activeCoverEditTab === "sticker" && (
                            <div className="flex flex-col gap-1.5">
                              {/* 2026-10-02, 혜민님 요청: "적용대상 앞표지, 뒤표지 삭제해주세요"
                                  — 어느 쪽에 붙는지는 이제 캔버스에서 마지막으로 선택한 사진박스
                                  쪽(coverLayoutApplyTarget, selectCoverImageBox에서 자동 갱신)을
                                  그대로 따라가요. */}
                              <CategoryTabbedGrid
                                categories={STICKER_CATEGORIES}
                                items={STICKERS}
                                activeCategoryId={stickerCategoryTab}
                                onSelectCategory={setStickerCategoryTab}
                                onItemClick={(item) => handleAddCoverSticker(coverLayoutApplyTarget, item.url)}
                                emptyMessage="아직 스티커가 없어요."
                              />
                            </div>
                          )}
                          {activeCoverEditTab === "handwriting" && (
                            <div className="flex flex-col gap-1.5">
                              {/* 2026-09-25 브리프 1단계 요청: 표지에도 손글씨 탭 추가 —
                                  내지 손글씨 탭과 같은 CategoryTabbedGrid, 적용 대상은 스티커
                                  탭과 마찬가지로 coverLayoutApplyTarget을 따라가요. */}
                              <CategoryTabbedGrid
                                categories={HANDWRITING_CATEGORIES}
                                items={HANDWRITING_ITEMS}
                                activeCategoryId={handwritingCategoryTab}
                                onSelectCategory={setHandwritingCategoryTab}
                                onItemClick={(item) => handleAddCoverHandwriting(coverLayoutApplyTarget, item.url)}
                                emptyMessage="아직 손글씨가 없어요."
                              />
                            </div>
                          )}
                          {activeCoverEditTab === "layout" && (() => {
                            const target: "front" | "back" = coverLayoutApplyTarget;
                            const isFront = target === "front";
                            const boxesForTarget = isFront ? coverImageBoxes : backCoverImageBoxes;
                            const legacyPhotoForTarget = isFront ? coverPhoto : backCoverPhoto;
                            // 레이아웃을 아직 한 번도 안 썼으면(배열이 비어있으면), 기존
                            // 사진 1장(있으면)을 "지금 사진 개수 1장"으로 쳐서 필터·안내
                            // 문구를 보여줘요 — 실제로 배열에 이어받는 건 적용 순간에요.
                            const currentCount = boxesForTarget.length > 0 ? boxesForTarget.length : legacyPhotoForTarget ? 1 : 0;
                            const visibleTemplates = COVER_LAYOUT_TEMPLATES.filter((t) => {
                              if (layoutCountFilter === "auto") return t.photoCount === currentCount;
                              if (layoutCountFilter === "all") return true;
                              if (layoutCountFilter === "6+") return t.photoCount >= 6;
                              return t.photoCount === layoutCountFilter;
                            });
                            return (
                              <div className="flex flex-col gap-1.5">
                                {/* 2026-09-25, 혜민님 요청: "설명글 삭제(레이아웃패널)" —
                                    "지금 OO에 사진이 N장 있어요" 안내문을 없앴어요. */}
                                <div className="flex overflow-x-auto text-[11px]" style={{ scrollbarWidth: "thin" }}>
                                  {LAYOUT_COUNT_FILTERS.filter((f) => f.id === "all" || (typeof f.id === "number" && f.id <= 3)).map((f) => (
                                    <button
                                      key={String(f.id)}
                                      type="button"
                                      onClick={() => setLayoutCountFilter(f.id)}
                                      className={`shrink-0 border-r border-white/40 px-2 py-1.5 font-medium transition last:border-r-0 ${
                                        layoutCountFilter === f.id
                                          ? "bg-[var(--color-charcoal)] text-white"
                                          : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60"
                                      }`}
                                    >
                                      {f.label}
                                    </button>
                                  ))}
                                </div>
                                {coverLayoutApplyMessage && (
                                  <p className=" bg-[var(--color-ivory)] px-1.5 py-2 text-[11px] text-[var(--color-charcoal)]/70 break-keep">
                                    {coverLayoutApplyMessage}
                                  </p>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  {visibleTemplates.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => {
                                        // 내지와 같은 이유로 팝업 없이 즉시 적용(2026-09-24).
                                        applyCoverLayoutTemplate(target, t);
                                      }}
                                      className=" border border-[var(--color-hairline)] p-1.5 text-left transition hover:border-[var(--color-sky)]"
                                    >
                                      <div className="relative w-full overflow-hidden bg-[var(--color-ivory)]" style={{ aspectRatio: "1 / 1" }}>
                                        {t.slots.map((slot, idx) => (
                                          <div
                                            key={idx}
                                            className="absolute -[2px] border border-white bg-[var(--color-sky)]/60"
                                            style={{
                                              left: `${slot.xPct}%`,
                                              top: `${slot.yPct}%`,
                                              width: `${slot.widthPct}%`,
                                              height: `${slot.heightPct}%`,
                                            }}
                                          />
                                        ))}
                                      </div>
                                      <p className="mt-1 truncate text-[10px] text-[var(--color-charcoal)]/70">
                                        {t.name}
                                        {t.hasCaptionSpace ? " · 문구 공간" : ""}
                                      </p>
                                      <p className="mt-0.5 text-[9px] text-[var(--color-charcoal)]/50">
                                        사진 칸 {t.photoCount}개
                                        {t.photoCount !== currentCount ? ` · 지금 ${currentCount}장` : ""}
                                      </p>
                                    </button>
                                  ))}
                                  {visibleTemplates.length === 0 && (
                                    <p className="col-span-2 text-[11px] text-[var(--color-charcoal)]/40">
                                      이 조건에 맞는 템플릿이 없어요.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          {activeCoverEditTab === "text" && (
                            <div className="flex flex-col gap-2">
                              {/* 2026-09-25, 혜민님 요청: "텍스트 메뉴 상단에는 글쓰기 / 표만들기
                                  / 이모티콘 메뉴를 만들고 싶습니다" — 글상자/타이틀 편집(기존
                                  화면)과 표·이모티콘 추가를 서브탭으로 나눠요. */}
                              <div className="grid grid-cols-3 gap-1 border-b border-[var(--color-hairline)] pb-2">
                                {(
                                  [
                                    { id: "write" as const, label: "글쓰기" },
                                    { id: "table" as const, label: "표만들기" },
                                    { id: "emoji" as const, label: "이모티콘" },
                                  ]
                                ).map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTextPanelSubTab(t.id)}
                                    className={`py-1.5 text-xs font-medium transition ${
                                      textPanelSubTab === t.id
                                        ? "bg-[var(--color-charcoal)] text-white"
                                        : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:bg-[var(--color-hairline)]/40"
                                    }`}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                              {textPanelSubTab === "table" && (
                                <TablePanelControls
                                  onAdd={(rows, cols) =>
                                    coverLayoutApplyTarget === "back"
                                      ? handleAddBackCoverTableBox(rows, cols)
                                      : handleAddCoverTableBox(rows, cols)
                                  }
                                />
                              )}
                              {textPanelSubTab === "emoji" && (
                                <EmojiPanelGrid
                                  onPick={(emoji) => handleAddCoverEmojiTextBox(coverLayoutApplyTarget === "back" ? "back" : "front", emoji)}
                                />
                              )}
                              {textPanelSubTab === "write" && (
                              <>
                              {/* 2026-10-06, 혜민님 요청: "글상자추가 버튼을 상단으로
                                  올려주세요" — 원래 탭 맨 아래(타이틀·책등 필드들 뒤)에
                                  있던 버튼을 탭 맨 위로 옮겼어요(선택 여부와 무관하게 항상
                                  표시, 내지 텍스트 탭과 같은 방식). */}
                              <div className="flex flex-col gap-1.5 border-b border-[var(--color-hairline)] pb-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    coverLayoutApplyTarget === "back"
                                      ? handleAddBackCoverTextBox()
                                      : handleAddCoverTextBox()
                                  }
                                  className="rounded-md bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-xs font-medium text-white shadow-sm shadow-[var(--color-brand-purple)]/20 transition hover:opacity-90"
                                >
                                  + 글상자 추가
                                </button>
                              </div>
                              {/* 2026-10-02, 혜민님 요청(항목8): "표지에 넣을 제목을 타이틀로,
                                  글자크기, 행간, 자간처럼 텍스트로 넣어주고 밑에 박스에는
                                  (예:우리 가족의 여름) 내용만 넣습니다" — 아래 다른 필드들
                                  (글자 크기·행간·자간)처럼 라벨을 먼저 붙이고, placeholder는
                                  예시 문구만 남겨요. */}
                              <div>
                                <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  타이틀
                                </label>
                                <textarea
                                  value={coverTitle}
                                  onChange={(e) => handleCoverTitleChange(e.target.value)}
                                  placeholder="예: 우리 가족의 여름"
                                  rows={2}
                                  className="w-full resize-none border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                />
                              </div>
                              <div className="mt-2 grid grid-cols-1 gap-1.5">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    글자 크기(pt)
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={8}
                                      max={200}
                                      list="titlePtPresets"
                                      value={coverTitlePtDraft}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        setCoverTitlePtDraft(raw);
                                        const pt = Number(raw);
                                        if (Number.isFinite(pt) && pt > 0) {
                                          setCoverTitleFontSizePt(Math.max(8, Math.min(200, pt)));
                                        }
                                      }}
                                      onBlur={() => setCoverTitlePtDraft(String(coverTitleFontSizePt))}
                                      className="w-24 border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                    />
                                    <span className="text-xs text-[var(--color-charcoal)]/40">pt</span>
                                    <datalist id="titlePtPresets">
                                      {COVER_TITLE_PT_PRESETS.map((pt) => (
                                        <option key={pt} value={pt} />
                                      ))}
                                    </datalist>
                                  </div>
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    행간(줄 간격)
                                  </label>
                                  <input
                                    type="number"
                                    min={0.8}
                                    max={2.5}
                                    step={0.05}
                                    value={coverTitleLineHeightDraft}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      setCoverTitleLineHeightDraft(raw);
                                      const v = Number(raw);
                                      if (Number.isFinite(v)) {
                                        setCoverTitleLineHeightEm(Math.max(0.8, Math.min(2.5, v)));
                                      }
                                    }}
                                    onBlur={() => setCoverTitleLineHeightDraft(String(coverTitleLineHeightEm))}
                                    className="w-full border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                    자간
                                  </label>
                                  <input
                                    type="number"
                                    min={-0.1}
                                    max={0.5}
                                    step={0.01}
                                    value={coverTitleLetterSpacingDraft}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      setCoverTitleLetterSpacingDraft(raw);
                                      const v = Number(raw);
                                      if (Number.isFinite(v)) {
                                        setCoverTitleLetterSpacingEm(Math.max(-0.1, Math.min(0.5, v)));
                                      }
                                    }}
                                    onBlur={() => setCoverTitleLetterSpacingDraft(String(coverTitleLetterSpacingEm))}
                                    className="w-full border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                  />
                                </div>
                              </div>
                              <div className="mt-2">
                                <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  표지 제목 서체
                                </label>
                                <select
                                  value={coverTitleFontFamily}
                                  onChange={(e) => handleCoverTitleFontFamilyChange(e.target.value)}
                                  className="w-full border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                  style={{ fontFamily: coverTitleFontFamily }}
                                >
                                  {fontOptions.map((f) => (
                                    <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                                      {f.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* 2026-10-05, 혜민님 요청: "내지페이지에 적용한 텍스트 수정메뉴도
                                  넣어줘(폰트정렬, 박스정렬 등)" — 내지 텍스트박스(TextBoxToolbar)의
                                  "문단 정렬"과 같은 3버튼(좌/가운데/우)을 표지 제목에도 추가. */}
                              <div className="mt-2">
                                <p className="mb-1 text-[11px] font-medium text-[var(--color-charcoal)]/70">
                                  문단 정렬
                                </p>
                                <div className="flex gap-1">
                                  {(
                                    [
                                      { id: "left" as const, icon: "textAlignLeft" as const, title: "왼쪽 정렬" },
                                      { id: "center" as const, icon: "textAlignCenter" as const, title: "가운데 정렬" },
                                      { id: "right" as const, icon: "textAlignRight" as const, title: "오른쪽 정렬" },
                                    ]
                                  ).map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      title={opt.title}
                                      onClick={() => setCoverTitleAlign(opt.id)}
                                      className={`flex h-7 flex-1 items-center justify-center border transition ${
                                        coverTitleAlign === opt.id
                                          ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                                          : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60"
                                      }`}
                                    >
                                      <LayerIcon name={opt.icon} className="h-4 w-4" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="mt-2 border border-[var(--color-hairline)] bg-white p-1.5">
                                <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                  책등 제목 크기·서체
                                </label>
                                <label className="mb-2 flex items-center gap-2 text-[11px] text-[var(--color-charcoal)]/70">
                                  <input
                                    type="checkbox"
                                    checked={!titleFontLinked}
                                    onChange={(e) => setTitleFontLinked(!e.target.checked)}
                                    className="h-3.5 w-3.5"
                                  />
                                  서체 분리(기본은 표지 제목과 동기화돼요)
                                </label>
                                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                      글자 크기(pt)
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={8}
                                        max={200}
                                        list="titlePtPresets"
                                        value={spineTitleFontSizePtDraft}
                                        placeholder="자동"
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          setSpineTitleFontSizePtDraft(raw);
                                          if (raw === "") {
                                            setSpineTitleFontSizePt(null);
                                            return;
                                          }
                                          const pt = Number(raw);
                                          if (Number.isFinite(pt) && pt > 0) {
                                            setSpineTitleFontSizePt(Math.max(8, Math.min(200, pt)));
                                          }
                                        }}
                                        onBlur={() =>
                                          setSpineTitleFontSizePtDraft(
                                            spineTitleFontSizePt === null ? "" : String(spineTitleFontSizePt)
                                          )
                                        }
                                        className="w-24 border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSpineTitleFontSizePt(null);
                                          setSpineTitleFontSizePtDraft("");
                                        }}
                                        className={`shrink-0 border px-1.5 py-2.5 text-xs font-medium transition ${
                                          spineTitleFontSizePt === null
                                            ? "border-[var(--color-sky)] bg-[var(--color-sky)]/10 text-[var(--color-sky)]"
                                            : "border-[var(--color-hairline)] text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                        }`}
                                      >
                                        자동
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-[var(--color-charcoal)]/70">
                                      책등 서체
                                    </label>
                                    <select
                                      value={spineTitleFontFamily}
                                      onChange={(e) => handleSpineTitleFontFamilyChange(e.target.value)}
                                      className="w-full border border-[var(--color-hairline)] bg-white px-2 py-2.5 text-sm outline-none focus:border-[var(--color-sky)]"
                                      style={{ fontFamily: spineTitleFontFamily }}
                                    >
                                      {fontOptions.map((f) => (
                                        <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
                                          {f.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                              </>
                              )}
                            </div>
                          )}
                          {activeCoverEditTab === "background" && (() => {
                            // 2026-09-30(2차), 혜민님 지적: "배경이 바뀌는데 왜 큰 구조변경이
                            // 필요할까요? 이미지하나 넣는 개념인데요" — 맞는 말이었음. 배경
                            // "색"은 사진·스티커처럼 좌표계를 공유할 필요가 없고, 그냥 앞표지·
                            // 책등·뒤표지 세 색상값을 한 번에 같이 바꾸면 되는 문제라 "적용범위"
                            // 선택 메뉴 자체를 없애고 항상 세 군데를 동시에 같은 색으로 맞춤.
                            // (내지처럼 사진·텍스트박스까지 표지 전체가 하나의 좌표계를 공유하게
                            // 만드는 건 여전히 구조 변경이 필요한 별개 작업 — 위 "기술 부채" 항목
                            // 참고.)
                            const applyCoverColor = (hex: string) => {
                              setBackCoverBackgroundColor(hex);
                              setCoverSpineBackgroundColor(hex);
                              setCoverFrontBackgroundColor(hex);
                            };
                            const applyCoverPattern = (id: string | undefined) => {
                              setCoverPatternId(id);
                            };
                            const coverColorValue = backCoverBackgroundColor ?? coverSpineBackgroundColor ?? coverFrontBackgroundColor ?? "#ffffff";
                            return (
                            <div className=" border border-[var(--color-hairline)] bg-white p-1.5">
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs text-[var(--color-charcoal)]/60">배경색(표지 전체)</span>
                                <ColorChartPicker
                                  activeColor={coverPatternId ? "" : coverColorValue}
                                  onPick={(color) => applyCoverColor(color)}
                                  customValue={coverColorValue}
                                  onCustomChange={(color) => applyCoverColor(color)}
                                />
                              </div>
                              <div className="mt-3">
                                <span className="text-xs text-[var(--color-charcoal)]/60">
                                  그래픽·패턴·텍스처(표지 전체)
                                </span>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => applyCoverPattern(undefined)}
                                    className={`h-6 border px-2 text-[11px] transition ${
                                      !coverPatternId
                                        ? "border-[var(--color-charcoal)] bg-[var(--color-charcoal)] text-white"
                                        : "border-[var(--color-hairline)] bg-white text-[var(--color-charcoal)]/70"
                                    }`}
                                  >
                                    없음
                                  </button>
                                  {backgroundPatterns.map((preset) => {
                                    const isActive = coverPatternId === preset.id;
                                    return (
                                      <button
                                        key={preset.id}
                                        type="button"
                                        title={preset.label}
                                        onClick={() => applyCoverPattern(isActive ? undefined : preset.id)}
                                        className={`h-6 w-6 border transition ${
                                          isActive
                                            ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                            : "border-[var(--color-hairline)]"
                                        }`}
                                        style={{ background: patternToCssBackground(preset) }}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            );
                          })()}
                          </div>
                          )}
                        </div>
                        )}
                        <CanvasStage
                          aspect={coverTotalWmm / coverTotalHmm}
                          zoom={canvasZoom}
                          fitToken={canvasFitToken}
                          widthMm={coverTotalWmm}
                          onActualSizePercentChange={setActualSizePercent}
                          overlay={editorMode === "edit" ? renderPageNavArrows : undefined}
                        >
                        {/* 뒤표지·책등·앞표지를 하나의 표지 펼침면으로 보고 그려요. 안내선은
                            패널마다 따로 그리지 않고, 이 바깥 컨테이너 하나에 펼침면 전체 기준
                            좌표로 그려서 책등에서 끊기지 않게 해요. (화면 전용 — 인쇄 PDF에는
                            포함되지 않아요) */}
                        <div
                          className="relative mt-4 flex w-full overflow-hidden border border-[var(--color-hairline)] bg-white "
                          style={{ aspectRatio: `${coverTotalWmm} / ${coverTotalHmm}`, containerType: "size" }}
                        >
                          <div
                            className="group relative flex h-full items-center justify-center overflow-hidden"
                            style={{
                              width: `${coverBackPct}%`,
                              background: coverPatternId
                                ? resolveSpreadBackgroundCss(
                                    { backgroundColor: backCoverBackgroundColor, backgroundPattern: coverPatternId },
                                    "right",
                                    { panelWidthPct: coverBackPct, offsetPct: 0 }
                                  )
                                : (backCoverBackgroundColor ?? "#ffffff"),
                            }}
                          >
                            {/* 2026-09, 로고("backCoverMode")와 사진은 이제 독립된 객체라
                                함께 있을 수 있어요 — 사진(레이아웃 여러 장 또는 사진 1장)을
                                먼저 그리고, 로고는 backCoverLogo가 있을 때만 별도로 얹어요. */}
                            {backCoverImageBoxes.length > 0 ? (
                              // 레이아웃 탭에서 여러 장 배치를 적용한 뒤표지예요 — 내지와 같은
                              // ImageBoxLayer를 그대로 재사용해서, 빈 프레임 채우기·사진만
                              // 빼기/프레임 삭제·확대·반전이 똑같이 동작해요(2026-09-24).
                              <ImageBoxLayer
                                boxes={backCoverImageBoxes}
                                onChange={handleBackCoverImageBoxChange}
                                onDelete={handleDeleteBackCoverImageBox}
                                onAltDuplicate={handleAltDuplicateBackCoverImageBox}
                                onStackAction={(boxId, action) => applyCoverStackAction("back", "image", boxId, action)}
                                activeBoxId={
                                  activeCoverImageBox?.target === "back" ? activeCoverImageBox.boxId : null
                                }
                                onSelect={(boxId) => selectCoverImageBox("back", boxId)}
                                onPhotoEditModeChange={setCoverImageBoxPhotoEditActive}
                                registerBoxRef={(boxId, handle) => {
                                  if (handle) coverImageBoxHandlesRef.current.set(boxId, handle);
                                  else coverImageBoxHandlesRef.current.delete(boxId);
                                }}
                                guidesX={[]}
                                guidesY={[]}
                              />
                            ) : backCoverPhoto ? (
                              <img
                                src={backCoverPhoto.url}
                                alt=""
                                className="h-[46%] w-[46%] -sm object-cover "
                              />
                            ) : !backCoverLogo ? (
                              <label className="flex h-[46%] w-[46%] cursor-pointer flex-col items-center justify-center gap-1 -sm border border-dashed border-[var(--color-charcoal)]/30 bg-white text-center text-[9px] text-[var(--color-charcoal)]/50">
                                사진 선택
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleBackCoverFileSelect}
                                  className="hidden"
                                />
                              </label>
                            ) : null}
                            {backCoverLogo && (
                              // 로고 위치·크기는 왼쪽 "꾸미기" 패널의 숫자 입력으로 조절해요
                              // (드래그가 아니라 안전한 숫자 입력 방식으로 구현 — 2026-09,
                              // 실제 브라우저에서 드래그 동작을 확인할 수 없어 위험을 줄였어요).
                              // xPct/yPct는 이 칸(뒤표지)을 기준으로 한 로고 "중심" 위치 %예요.
                              <img
                                src="/logo.svg"
                                alt="Keepic"
                                onClick={() => selectBackCoverLogo()}
                                className={`absolute cursor-pointer opacity-80 transition ${
 backCoverLogoSelected ? "outline outline-2 outline-[var(--color-sky)]" : ""
                                }`}
                                style={{
                                  left: `${backCoverLogo.xPct}%`,
                                  top: `${backCoverLogo.yPct}%`,
                                  width: `${34 * (backCoverLogo.scalePct / 100)}%`,
                                  maxWidth: `${96 * (backCoverLogo.scalePct / 100)}px`,
                                  transform: "translate(-50%, -50%)",
                                }}
                              />
                            )}
                            <TextBoxLayer
                              boxes={backCoverTextBoxes}
                              onAdd={handleAddBackCoverTextBox}
                              onChange={handleBackCoverTextBoxChange}
                              onDelete={(boxId) => deleteTextBoxByRef({ scope: "backCover" }, boxId)}
                              onStackAction={(boxId, action) => applyCoverStackAction("back", "text", boxId, action)}
                              activeBoxId={activeTextBox?.ref.scope === "backCover" ? activeTextBox.boxId : null}
                              onSelect={(boxId) => selectTextBox({ scope: "backCover" }, boxId)}
                              onShiftSelect={(boxId) => toggleTextBoxMultiSelect({ scope: "backCover" }, boxId)}
                              multiSelectedBoxIds={
                                multiTextSelection?.ref.scope === "backCover" ? multiTextSelection.boxIds : undefined
                              }
                            />
                            <TableBoxLayer
                              boxes={backCoverTableBoxes}
                              onChange={handleBackCoverTableBoxChange}
                              onDelete={handleDeleteBackCoverTableBox}
                              activeBoxId={activeTableBox?.scope === "backCover" ? activeTableBox.boxId : null}
                              onSelect={(boxId) => setActiveTableBox({ scope: "backCover", boxId })}
                            />
                          </div>
                          <div
                            className={`relative h-full overflow-hidden px-1 ${
 isPrintPreview ? "" : "border-x border-[#1a1a1a]/70"
                            }`}
                            style={{
                              width: `${coverSpinePct}%`,
                              background: coverPatternId
                                ? resolveSpreadBackgroundCss(
                                    { backgroundColor: coverSpineBackgroundColor, backgroundPattern: coverPatternId },
                                    "left",
                                    { panelWidthPct: coverSpinePct, offsetPct: coverSpineStartPct }
                                  )
                                : (coverSpineBackgroundColor ?? "#ffffff"),
                            }}
                          >
                            {/* 책등엔 책등 제목과 키픽 로고만 보여줘요 — 제목 텍스트박스는 끌어서
                                위치를, 아래쪽 손잡이로 높이를 바꿀 수 있어요(가로폭은 책등 폭에
                                고정, 한 글자씩 정방향으로 위→아래 세로쓰기). 로고는 책등이 좁아서
                                90도로 눕히고(글자가 위→아래로 읽혀요), 재단선에서 안전영역과 같은
                                10mm 띄운 자리에 고정으로 둬요(화면에서 위치를 바꿀 수 없어요). */}
                            <SpineTitleOverlay
                              title={coverTitle.replace(/\n/g, " ")}
                              emptyLabel="책등"
                              yPct={coverSpineTitleYPct}
                              heightPct={spineTitleHeightPct}
                              fontSizeCqh={spineTitleFontSizeCqh}
                              fontFamily={spineTitleFontFamily}
                              onMove={setSpineTitleYPct}
                              onResize={setSpineTitleHeightPct}
                            />
                            {coverSpineLogoLayout.fits && (
                              <img
                                src="/logo.svg"
                                alt="Keepic"
                                className="pointer-events-none absolute z-10 opacity-90"
                                style={{
                                  top: `${coverSpineLogoCenterYPct}%`,
                                  left: "50%",
                                  width: `${coverSpineLogoPreRotateWidthPct}%`,
                                  height: `${coverSpineLogoPreRotateHeightPct}%`,
                                  transform: "translate(-50%, -50%) rotate(90deg)",
                                }}
                              />
                            )}
                          </div>
                          <div
                            className="group relative h-full overflow-hidden"
                            style={{
                              width: `${coverFrontPct}%`,
                              background: coverPatternId
                                ? resolveSpreadBackgroundCss(
                                    { backgroundColor: coverFrontBackgroundColor, backgroundPattern: coverPatternId },
                                    "left",
                                    { panelWidthPct: coverFrontPct, offsetPct: coverSpineEndPct }
                                  )
                                : (coverFrontBackgroundColor ?? "#ffffff"),
                            }}
                          >
                            {coverImageBoxes.length > 0 ? (
                              <ImageBoxLayer
                                boxes={coverImageBoxes}
                                onChange={handleCoverImageBoxChange}
                                onDelete={handleDeleteCoverImageBox}
                                onAltDuplicate={handleAltDuplicateCoverImageBox}
                                onStackAction={(boxId, action) => applyCoverStackAction("front", "image", boxId, action)}
                                activeBoxId={
                                  activeCoverImageBox?.target === "front" ? activeCoverImageBox.boxId : null
                                }
                                onSelect={(boxId) => selectCoverImageBox("front", boxId)}
                                onPhotoEditModeChange={setCoverImageBoxPhotoEditActive}
                                registerBoxRef={(boxId, handle) => {
                                  if (handle) coverImageBoxHandlesRef.current.set(boxId, handle);
                                  else coverImageBoxHandlesRef.current.delete(boxId);
                                }}
                                guidesX={[]}
                                guidesY={[]}
                              />
                            ) : coverPhoto ? (
                              <PhotoCell
                                photo={coverPhoto}
                                requiredMinPx={requiredMinPx}
                                onChange={(c) => setCoverPhoto((prev) => (prev ? { ...prev, ...c } : prev))}
                              />
                            ) : (
                              <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 bg-[var(--color-ivory)] text-center text-xs text-[var(--color-charcoal)]/50">
                                표지 사진 선택
                                <input type="file" accept="image/*" onChange={handleCoverFileSelect} className="hidden" />
                              </label>
                            )}
                            <CoverTitleOverlay
                              title={coverTitle}
                              xPct={coverTitleXPct}
                              yPct={coverTitleYPct}
                              widthPct={coverTitleWidthPct}
                              fontSizeCqh={coverTitleFontSizeCqh}
                              lineHeightEm={coverTitleLineHeightEm}
                              letterSpacingEm={coverTitleLetterSpacingEm}
                              fontFamily={coverTitleFontFamily}
                              align={coverTitleAlign}
                              onMove={({ xPct, yPct }) => {
                                setCoverTitleXPct(xPct);
                                setCoverTitleYPct(yPct);
                              }}
                            />
                            <TextBoxLayer
                              boxes={coverTextBoxes}
                              onAdd={handleAddCoverTextBox}
                              onChange={handleCoverTextBoxChange}
                              onDelete={(boxId) => deleteTextBoxByRef({ scope: "cover" }, boxId)}
                              onStackAction={(boxId, action) => applyCoverStackAction("front", "text", boxId, action)}
                              activeBoxId={activeTextBox?.ref.scope === "cover" ? activeTextBox.boxId : null}
                              onSelect={(boxId) => selectTextBox({ scope: "cover" }, boxId)}
                              onShiftSelect={(boxId) => toggleTextBoxMultiSelect({ scope: "cover" }, boxId)}
                              multiSelectedBoxIds={
                                multiTextSelection?.ref.scope === "cover" ? multiTextSelection.boxIds : undefined
                              }
                            />
                            <TableBoxLayer
                              boxes={coverTableBoxes}
                              onChange={handleCoverTableBoxChange}
                              onDelete={handleDeleteCoverTableBox}
                              activeBoxId={activeTableBox?.scope === "cover" ? activeTableBox.boxId : null}
                              onSelect={(boxId) => setActiveTableBox({ scope: "cover", boxId })}
                            />
                          </div>

                          <CoverGuideBox left={0} right={100} top={0} bottom={100} variant="dashed" />
                          <CoverGuideBox
                            left={coverBleedXPct}
                            right={100 - coverBleedXPct}
                            top={coverBleedYPct}
                            bottom={100 - coverBleedYPct}
                            variant="solid"
                          />
                          <CoverGuideBox
                            left={coverBackSafetyLeftPct}
                            right={coverBackSafetyRightPct}
                            top={coverSafetyTopPct}
                            bottom={coverSafetyBottomPct}
                            variant="dotted"
                          />
                          <CoverGuideBox
                            left={coverFrontSafetyLeftPct}
                            right={coverFrontSafetyRightPct}
                            top={coverSafetyTopPct}
                            bottom={coverSafetyBottomPct}
                            variant="dotted"
                          />
                          {/* 안내선(도련선/재단선/안전영역)은 2026-09-23부터 편집 화면에서 항상 표시돼요
                              (예전엔 체크박스로 껐다 켤 수 있었는데, 혜민님 요청으로 토글을 없애고 늘
                              보이게 했어요 — 필요하면 "미리보기"로 전환해서 안내선 없는 최종 모습을
                              확인하면 돼요). 책등 경계는 위 패널 테두리(항상 표시)만으로 보여줘요. */}
                        </div>
                        </CanvasStage>
                      </div>
                    </div>
                  ) : selectedPageKey === "intro" ? (
                    <div className="flex h-full min-h-0 flex-col p-2">
                      <div className="shrink-0">
                        <p className="text-sm font-medium">마지막 소개 페이지</p>
                        <p className="mt-1 text-xs text-[var(--color-charcoal)]/60 break-keep">
                          앞표지 사진·제목이 자동 반영돼요(여기서 조절해도 앞표지엔 영향 없음).
                          오른쪽 면은 인쇄되지 않는 빈 면이에요.
                        </p>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
                        {editorMode === "edit" && (
                        <div className="lg:w-56 lg:shrink-0">
                        <div className="mt-4 grid grid-cols-1 gap-1.5">
                          <label className="text-xs text-[var(--color-charcoal)]/70">
                            발행일
                            <input
                              value={introPublishDate}
                              onChange={(e) => setIntroPublishDate(e.target.value)}
                              className="mt-1 w-full border border-[var(--color-hairline)] px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="text-xs text-[var(--color-charcoal)]/70">
                            만든이
                            <input
                              value={introMakerName}
                              onChange={(e) => setIntroMakerName(e.target.value)}
                              placeholder="신규 작성자"
                              className="mt-1 w-full border border-[var(--color-hairline)] px-2 py-1.5 text-sm"
                            />
                          </label>
                        </div>
                        </div>
                        )}
                        <CanvasStage aspect={2} zoom={canvasZoom} fitToken={canvasFitToken}>
                        <div className="relative flex w-full items-stretch bg-white ">
                          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                          <div className="aspect-square w-1/2">
                            <IntroPagePreview
                              coverPhoto={coverPhoto}
                              coverTitle={coverTitle}
                              introPublishDate={introPublishDate}
                              introMakerName={introMakerName}
                            />
                          </div>
                          <div className="relative aspect-square w-1/2 overflow-hidden bg-[var(--color-ivory)]">
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-black/10 to-transparent" />
                          </div>
                        </div>
                        </CanvasStage>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const i = selectedPageKey;
                      const spread = customSpreads[i];
                      const { leftIndexes, rightIndexes } = spreadPhotoGroups[i];
                      const leftPhotos = leftIndexes.map((idx) => photos[idx]).filter(Boolean);
                      const rightPhotos = rightIndexes.map((idx) => photos[idx]).filter(Boolean);
                      return (
                        <div className="flex h-full min-h-0 flex-col px-2 pb-2">
                          <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row" style={{ containerType: "inline-size" }}>
                            {editorMode === "edit" && (
                            <div className="-ml-2 flex gap-2 border-[var(--color-hairline)] pl-2 lg:-ml-4 lg:shrink-0 lg:border-r lg:pr-2">
                              {/* 왼쪽 아이콘 메뉴 — 사진/배경/표지변경/스티커/손글씨스티커/텍스트를
                                  아이콘으로 골라요. 예전엔 배경만 항상 펼쳐져 있고 사진·스티커
                                  추가는 캔버스에 마우스를 올려야만 보이는 숨은 버튼이었는데,
                                  이제 다른 편집기들처럼 아이콘을 눌러야 해당 메뉴가 열려요.
                                  2026-09-26: 바깥 p-2 패딩만큼 왼쪽으로 당겨서(-ml-2) 아이콘이
                                  화면 맨 왼쪽에 붙게 하고(스위트북 참고), 캔버스와의 경계에 세로
                                  구분선(lg:border-r)을 그음. */}
                              <div className="flex flex-row gap-1 overflow-x-auto lg:w-[clamp(44px,9cqw,56px)] lg:shrink-0 lg:flex-col lg:gap-0 lg:overflow-visible">
                                {/* "레이아웃" 탭은 사진 1장=이미지박스 1개 구조를 쓰는 "AI 맞춤
                                    레이아웃" 상품에서만 의미가 있어요(다른 고정 템플릿 상품은
                                    격자 칸 방식이라 이 기능이 적용되지 않아요). */}
                                {EDIT_TABS.filter((tab) => tab.id !== "layout" || isAiAuto).map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveEditTab(tab.id)}
                                    className={`flex shrink-0 flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] transition ${
                                      activeEditTab === tab.id
                                        ? "bg-[var(--color-sky)]/15 text-[var(--color-sky)]"
                                        : "text-[var(--color-charcoal)]/60 hover:bg-[var(--color-ivory)]"
                                    }`}
                                  >
                                    <MenuTabIcon name={tab.icon} />
                                    <span className="whitespace-nowrap">{tab.label}</span>
                                  </button>
                                ))}
                              </div>
                              {/* 2026-10-02: 탭을 하나도 안 골랐으면(접힌 상태) 패널 폭을
                                  0으로 접어요 — 안쪽 내용은 전부 activeEditTab==="..."
                                  조건이라 null이면 어차피 안 보이지만, 빈 칸만 224px를
                                  차지하고 있던 걸 없앰(closing 태그를 건드리지 않는 안전한
                                  방식으로, 폭만 조건부로 바꿈). */}
                              <div
                                className={
                                  activeEditTab
                                    ? "flex min-h-0 flex-col overflow-y-auto lg:w-[clamp(160px,22cqw,224px)] lg:shrink-0 lg:pr-1"
                                    : "flex min-h-0 flex-col overflow-hidden lg:w-0 lg:shrink-0"
                                }
                              >
                            {activeEditTab === "text" && (
                              <div className="mb-1.5 grid grid-cols-3 gap-1 border-b border-[var(--color-hairline)] pb-2">
                                {(
                                  [
                                    { id: "write" as const, label: "글쓰기" },
                                    { id: "table" as const, label: "표만들기" },
                                    { id: "emoji" as const, label: "이모티콘" },
                                  ]
                                ).map((t) => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTextPanelSubTab(t.id)}
                                    className={`py-1.5 text-xs font-medium transition ${
                                      textPanelSubTab === t.id
                                        ? "bg-[var(--color-charcoal)] text-white"
                                        : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60 hover:bg-[var(--color-hairline)]/40"
                                    }`}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {activeEditTab === "text" && textPanelSubTab === "table" && (
                              <TablePanelControls onAdd={(rows, cols) => handleAddTableBox(i, rows, cols)} />
                            )}
                            {activeEditTab === "text" && textPanelSubTab === "emoji" && (
                              <EmojiPanelGrid onPick={(emoji) => handleAddEmojiTextBox(i, i === 0 ? "right" : "left", emoji)} />
                            )}
                            {activeEditTab === "text" && textPanelSubTab === "write" && (
                              <div className="mb-1.5 flex flex-col gap-1.5">
                                {/* 2026-10-06, 혜민님 요청: "글상자추가 버튼을 상단으로
                                    올려주세요" — 텍스트박스를 선택하면 바로 아래
                                    TextBoxToolbar가 길어져서 버튼이 화면 밖으로 밀렸어요.
                                    선택 여부와 무관하게 "텍스트" 탭 맨 위에 항상 보이게 함. */}
                                <button
                                  type="button"
                                  onClick={() => handleAddTextBox(i, i === 0 ? "right" : "left")}
                                  className="rounded-md bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-xs font-medium text-white shadow-sm shadow-[var(--color-brand-purple)]/20 transition hover:opacity-90"
                                >
                                  + 글상자 추가
                                </button>
                              </div>
                            )}
                            {activeEditTab === "text" &&
                              textPanelSubTab === "write" &&
                              multiTextSelection &&
                              multiTextSelection.ref.scope === "spread" &&
                              multiTextSelection.boxIds.length >= 2 && (
                              <MultiTextAlignPanel
                                count={multiTextSelection.boxIds.length}
                                canVerticalAlign={multiTextSelectedBoxes().every((b) => b.heightPct !== undefined)}
                                onAlign={alignMultiTextBoxes}
                                onDistribute={distributeMultiTextBoxes}
                                onClear={() => setMultiTextSelection(null)}
                              />
                            )}
                            {activeEditTab === "text" && textPanelSubTab === "write" && activeTextBox && activeTextBox.ref.scope === "spread" && (
                              <TextBoxToolbar
                                box={activeTextBoxDef}
                                onChange={(c) => updateTextBoxByRef(activeTextBox.ref, activeTextBox.boxId, c)}
                                onDelete={() => deleteTextBoxByRef(activeTextBox.ref, activeTextBox.boxId)}
                                scopeLabel={textBoxScopeLabel(activeTextBox.ref)}
                                pageWidthMm={guidePageWorkMm}
                              />
                            )}
                            <div>
                              {activeEditTab === "photo" && (
                                <div className="flex flex-col gap-1.5">
                                  {/* 2026-10-02, 혜민님 요청: "이미지 선택하면 '선택한
                                      사진박스'라고 메뉴 뜨는데 왜뜨는지 이유를 모르겠습니다"
                                      — 사진 위치 조정 모드(더블클릭)에 들어가지 않았으면 이
                                      화면(헤더+뒤로가기만)으로 바뀔 이유가 없었어요(테두리·
                                      확대·반전은 캔버스 위 StackOrderToolbar가 이미 담당).
                                      실제로 조정 모드에 들어갔을 때만 이 화면으로 바뀌게 함. */}
                                  {activeImageBox?.spreadIndex === i && imageBoxPhotoEditActive ? (
                                    <>
                                      {/* 사진박스를 선택한 직후엔 목록 대신 이 박스의 속성(꽉 채우기·
                                          mm 변형·사진 위치 조정)부터 바로 보여줘요(2026-09,
                                          혜민님 요청 — "선택 즉시 그 사진 속성부터"). "뒤로가기"를
                                          누르거나 선택을 해제하면 아래 기본 목록으로 돌아가요. */}
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-[var(--color-charcoal)]">
                                          선택한 사진박스
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => setActiveImageBox(null)}
                                          className="text-[11px] text-[var(--color-charcoal)]/50 underline underline-offset-4"
                                        >
                                          ‹ 뒤로가기
                                        </button>
                                      </div>
                                      {/* "스프레드 전체 채우기" 버튼과 "변형 (mm)" 숫자입력
                                          패널 — 혜민님 요청으로 제거(2026-09-24, "사진메뉴에는
                                          사진추가, 테두리, 사진틀모양 메뉴만 필요합니다" — 캔버스
                                          위 드래그·손잡이로도 위치·크기 조절이 되니 중복이라는
                                          판단, 테두리·사진틀모양 새 기능은 다음 라운드 과제로
                                          확인받음). */}
                                      {imageBoxPhotoEditActive && (
                                        <div className=" border border-[var(--color-brand-purple)]/30 bg-[var(--color-brand-purple)]/5 p-1.5">
                                          <p className="text-xs font-medium text-[var(--color-brand-purple)]">
                                            사진 위치 조정 중
                                          </p>
                                          <p className="mt-1 text-[11px] text-[var(--color-charcoal)]/50 break-keep">
                                            박스 안에서 사진의 위치·확대·반전을 조정해요(박스 자체
                                            크기는 캔버스에서 손잡이로 조절해주세요).
                                          </p>
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <button
                                              type="button"
                                              title="축소"
                                              onClick={() =>
                                                activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.zoomOut()
                                              }
                                              className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                            >
                                              −
                                            </button>
                                            <button
                                              type="button"
                                              title="확대"
                                              onClick={() =>
                                                activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.zoomIn()
                                              }
                                              className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                            >
                                              +
                                            </button>
                                            <button
                                              type="button"
                                              title="좌우 반전"
                                              onClick={() =>
                                                activeImageBox && imageBoxHandlesRef.current.get(activeImageBox.boxId)?.toggleFlip()
                                              }
                                              className="flex h-7 w-7 items-center justify-center bg-white text-sm text-[var(--color-charcoal)]/70 "
                                            >
                                              ⇌
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                activeImageBox &&
                                                imageBoxHandlesRef.current.get(activeImageBox.boxId)?.resetPhotoPosition()
                                              }
                                              className=" bg-white px-1.5 py-1 text-[11px] text-[var(--color-charcoal)]/70 "
                                            >
                                              초기화
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                activeImageBox &&
                                                imageBoxHandlesRef.current.get(activeImageBox.boxId)?.exitPhotoEditMode()
                                              }
                                              className=" bg-[var(--color-charcoal)] px-1.5 py-1 text-[11px] text-white"
                                            >
                                              완료
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <div>
                                        {/* 2026-10-02, 혜민님 요청: "설명글 삭제" — 라벨(제목)만
                                            남기고 부연 설명 문장은 제거. */}
                                        <p className="text-xs font-medium text-[var(--color-charcoal)]/70">
                                          이 페이지에 사진 추가
                                        </p>
                                        <label className="mt-1.5 inline-block cursor-pointer border border-[var(--color-sky)] px-2 py-2 text-xs font-medium text-[var(--color-sky)] transition hover:bg-[var(--color-sky)]/10">
                                          + 사진 추가
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) handleAddImageBox(i, file);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      </div>
                                      <details className="border-t border-[var(--color-hairline)] pt-3">
                                        <summary className="cursor-pointer text-xs font-medium text-[var(--color-charcoal)]/70 transition hover:text-[var(--color-charcoal)]">
                                          전체 사진 관리 ({photos.length}장)
                                        </summary>
                                        <div className="mt-2">
                                          <label className="inline-block cursor-pointer bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-xs font-medium text-white transition hover:opacity-90">
                                            사진 더 올리기
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              onChange={handleFileSelect}
                                              className="hidden"
                                            />
                                          </label>
                                          {lowResCount > 0 && (
                                            <p className="mt-2 bg-red-50 px-1.5 py-2 text-[11px] text-red-600 break-keep">
                                              해상도가 낮은 사진이 {lowResCount}장 있어요. 인쇄 시 흐릿하게
                                              나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
                                            </p>
                                          )}
                                          {photos.length > 0 && (
                                            <details className="mt-2">
                                              <summary className="cursor-pointer text-xs text-[var(--color-charcoal)]/60 transition hover:text-[var(--color-charcoal)]">
                                                전체 사진 목록 보기 (순서 확인 · 삭제)
                                              </summary>
                                              {(() => {
                                                const pageCount = Math.max(1, Math.ceil(photos.length / PHOTO_GRID_PAGE_SIZE));
                                                const page = Math.min(photoGridPage, pageCount - 1);
                                                const start = page * PHOTO_GRID_PAGE_SIZE;
                                                const visiblePhotos = photos.slice(start, start + PHOTO_GRID_PAGE_SIZE);
                                                return (
                                                  <div className="mt-3">
                                                    {pageCount > 1 && (
                                                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-[var(--color-charcoal)]/60">
                                                        <button
                                                          type="button"
                                                          onClick={() => setPhotoGridPage(Math.max(0, page - 1))}
                                                          disabled={page === 0}
                                                          className="border border-[var(--color-hairline)] px-2.5 py-1 transition disabled:opacity-30"
                                                        >
                                                          ‹ 이전
                                                        </button>
                                                        <span>
                                                          {page + 1} / {pageCount}페이지 · {start + 1}–
                                                          {Math.min(start + PHOTO_GRID_PAGE_SIZE, photos.length)}번째 (전체 {photos.length}장)
                                                        </span>
                                                        <button
                                                          type="button"
                                                          onClick={() => setPhotoGridPage(Math.min(pageCount - 1, page + 1))}
                                                          disabled={page >= pageCount - 1}
                                                          className="border border-[var(--color-hairline)] px-2.5 py-1 transition disabled:opacity-30"
                                                        >
                                                          다음 ›
                                                        </button>
                                                      </div>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-2">
                                                      {visiblePhotos.map((photo, pi) => {
                                                        const index = start + pi;
                                                        return (
                                                          <div
                                                            key={index}
                                                            className="group relative aspect-square overflow-hidden border border-[var(--color-hairline)]"
                                                          >
                                                            <img
                                                              src={photo.url}
                                                              alt={`선택한 사진 ${index + 1}`}
                                                              className="h-full w-full object-cover"
                                                            />
                                                            {isLowRes(photo, requiredMinPx / 2) && (
                                                              <span
                                                                title="인쇄 기준 화질이 낮아요"
                                                                className="absolute left-1 top-1 bg-red-500/90 px-1.5 py-0.5 text-[9px] font-medium text-white"
                                                              >
                                                                저해상도
                                                              </span>
                                                            )}
                                                            <button
                                                              onClick={() => handleRemovePhoto(index)}
                                                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                                                            >
                                                              ✕
                                                            </button>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })()}
                                            </details>
                                          )}
                                        </div>
                                      </details>
                                    </>
                                  )}
                                </div>
                              )}
                              {activeEditTab === "layout" && (() => {
                                // 2026-09-27, 혜민님 요청: "기본적으로 펼침면으로 레이아웃을
                                // 보여주세요 ... 낱장으로 되어있는건 전부 스프레드로
                                // 만들어주세요." — 더 이상 "적용 범위"를 먼저 고르지 않고,
                                // 항상 스프레드(펼침면) 형태 썸네일만 보여줘요(원래 half
                                // 전용이던 템플릿도 좌우로 자동 복제됨, spreadBrowseTemplates()).
                                // 실제 적용 범위(왼쪽/양쪽/오른쪽)는 썸네일을 클릭한 뒤 뜨는
                                // 팝업(layoutRangePicker)에서 물어봐요. 스프레드 1(i===0)의
                                // 왼쪽 면은 표지 뒷면이라 인쇄 안 되는 빈 면이라, 그 팝업에서
                                // "왼쪽 페이지"만 비활성화해요.
                                const allowLeft = i !== 0;
                                const nonStickerBoxes = (spread.imageBoxes ?? []).filter((b) => !isStickerImageBox(b));
                                const rangePhotoCount = nonStickerBoxes.length;
                                const candidates = spreadBrowseTemplates();
                                const visibleTemplates = candidates.filter((t) => {
                                  if (layoutCountFilter === "auto") return t.photoCount === rangePhotoCount;
                                  if (layoutCountFilter === "all") return true;
                                  if (layoutCountFilter === "6+") return t.photoCount >= 6;
                                  return t.photoCount === layoutCountFilter;
                                });
                                return (
                                  <div className="flex flex-col gap-1.5">
                                    {/* 2026-09-25, 혜민님 요청: "설명글 삭제(레이아웃패널)" — 안내문을 없앴어요. */}
                                    <div className="flex overflow-x-auto text-[11px]" style={{ scrollbarWidth: "thin" }}>
                                      {LAYOUT_COUNT_FILTERS.map((f) => (
                                        <button
                                          key={String(f.id)}
                                          type="button"
                                          onClick={() => setLayoutCountFilter(f.id)}
                                          className={`shrink-0 border-r border-white/40 px-2 py-1.5 font-medium transition last:border-r-0 ${
                                            layoutCountFilter === f.id
                                              ? "bg-[var(--color-charcoal)] text-white"
                                              : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/60"
                                          }`}
                                        >
                                          {f.label}
                                        </button>
                                      ))}
                                    </div>
                                    {layoutApplyMessage && (
                                      <p className=" bg-[var(--color-ivory)] px-1.5 py-2 text-[11px] text-[var(--color-charcoal)]/70 break-keep">
                                        {layoutApplyMessage}
                                      </p>
                                    )}
                                    {/* 2026-09-27, 혜민님 요청으로 썸네일 아래 설명글(이름·칸
                                        수)을 없애고 이미지(슬롯 미리보기)만 남겼어요. */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {visibleTemplates.map((t) => (
                                        <button
                                          key={t.id}
                                          type="button"
                                          onClick={() => setLayoutRangePicker({ spreadIndex: i, template: t, allowLeft })}
                                          className="border border-[var(--color-hairline)] p-1 text-left transition hover:border-[var(--color-sky)]"
                                        >
                                          <div
                                            className="relative w-full overflow-hidden bg-[var(--color-ivory)]"
                                            style={{ aspectRatio: "2 / 1" }}
                                          >
                                            {t.slots.map((slot, idx) => (
                                              <div
                                                key={idx}
                                                className="absolute border border-white bg-[var(--color-sky)]/60"
                                                style={{
                                                  left: `${slot.xPct}%`,
                                                  top: `${slot.yPct}%`,
                                                  width: `${slot.widthPct}%`,
                                                  height: `${slot.heightPct}%`,
                                                }}
                                              />
                                            ))}
                                          </div>
                                        </button>
                                      ))}
                                      {visibleTemplates.length === 0 && (
                                        <p className="col-span-2 text-[11px] text-[var(--color-charcoal)]/40">
                                          이 조건에 맞는 템플릿이 없어요.
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                              {activeEditTab === "background" && (
                              <div className="flex flex-wrap gap-1 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => setBackgroundTab("solid")}
                                  className={` px-1.5 py-1 transition ${
 backgroundTab === "solid"
                                      ? "bg-[var(--color-sky)] text-white"
                                      : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
                                  }`}
                                >
                                  단색
                                </button>
                                {backgroundPatternCategories.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setBackgroundTab(cat.id)}
                                    className={` px-1.5 py-1 transition ${
 backgroundTab === cat.id
                                        ? "bg-[var(--color-sky)] text-white"
                                        : "bg-[var(--color-ivory)] text-[var(--color-charcoal)]/70"
                                    }`}
                                  >
                                    {cat.label}
                                  </button>
                                ))}
                              </div>
                              )}
                              {activeEditTab === "background" && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {backgroundTab === "solid" ? (
                                  <>
                                    <ColorChartPicker
                                      activeColor={!spread.backgroundPattern ? (spread.backgroundColor ?? "#ffffff") : ""}
                                      onPick={(color) => handleChangeBackground(i, color === "#ffffff" ? undefined : color)}
                                      customValue={spread.backgroundColor ?? "#ffffff"}
                                      onCustomChange={(color) => handleChangeBackground(i, color)}
                                    />
                                  </>
                                ) : (
                                  backgroundPatterns
                                    .filter((p) => p.category === backgroundTab)
                                    .map((preset) => {
                                      const isActive = spread.backgroundPattern === preset.id;
                                      return (
                                        <button
                                          key={preset.id}
                                          type="button"
                                          title={preset.label}
                                          onClick={() =>
                                            handleChangePattern(i, isActive ? undefined : preset.id)
                                          }
                                          className={`h-8 w-8 border transition ${
                                            isActive
                                              ? "border-[var(--color-charcoal)] ring-2 ring-[var(--color-sky)] ring-offset-1"
                                              : "border-[var(--color-hairline)]"
                                          }`}
                                          style={{ background: patternToCssBackground(preset) }}
                                        />
                                      );
                                    })
                                )}
                              </div>
                              )}
                              {activeEditTab === "theme" && (
                                <div className=" bg-[var(--color-ivory)]/60 p-1.5 text-[11px] text-[var(--color-charcoal)]/60 break-keep">
                                  테마변경은 준비 중이에요. 완성되면 여기서 디자인 테마를 골라
                                  사진 배치를 한 번에 바꿀 수 있게 돼요.
                                </div>
                              )}
                              {activeEditTab === "sticker" && (
                                <CategoryTabbedGrid
                                  categories={STICKER_CATEGORIES}
                                  items={STICKERS}
                                  activeCategoryId={stickerCategoryTab}
                                  onSelectCategory={setStickerCategoryTab}
                                  onItemClick={(item) => handleAddSticker(i, item.url)}
                                  emptyMessage="아직 스티커가 없어요."
                                />
                              )}
                              {activeEditTab === "handwriting" && (
                                <CategoryTabbedGrid
                                  categories={HANDWRITING_CATEGORIES}
                                  items={HANDWRITING_ITEMS}
                                  activeCategoryId={handwritingCategoryTab}
                                  onSelectCategory={setHandwritingCategoryTab}
                                  onItemClick={(item) => handleAddHandwriting(i, item.url)}
                                  emptyMessage="손글씨 스티커는 준비 중이에요. 곧 추가할게요."
                                />
                              )}
                            </div>
                              </div>
                            </div>
                            )}
                            <CanvasStage
                              aspect={guideSpreadWorkMm / guidePageWorkMm}
                              zoom={canvasZoom}
                              fitToken={canvasFitToken}
                              widthMm={guideSpreadWorkMm}
                              onActualSizePercentChange={setActualSizePercent}
                              overlay={editorMode === "edit" ? renderPageNavArrows : undefined}
                            >
                            <div
                              className={
                                isPrintPreview
                                  ? "relative mx-auto w-full bg-[var(--color-charcoal)]/[0.07] p-2 sm:p-12"
                                  : ""
                              }
                            >
                              {isPrintPreview && (
                                <div className="pointer-events-none absolute inset-8 bg-white shadow-[0_25px_55px_-12px_rgba(0,0,0,0.5)] sm:inset-12" />
                              )}
                              <div
                                className="relative overflow-hidden"
                                style={
                                  !isPrintPreview && SHOW_RULER
                                    ? {
                                        paddingLeft: RULER_THICKNESS_PX.w,
                                        paddingTop: Math.max(0, RULER_THICKNESS_PX.h - SPREAD_BOX_MARGIN_TOP_PX),
                                      }
                                    : undefined
                                }
                              >
                                {!isPrintPreview && SHOW_RULER && (
                                  <>
                                    {/* 눈금자 왼쪽 위 빈 모서리 칸(일러스트레이터 편집대지와 같은 자리) —
                                        2026-09-27, 혜민님 요청으로 회색 배경을 없앴어요(빈 칸 자체는
                                        레이아웃 정렬을 위해 그대로 두되, 배경색만 제거). */}
                                    <div
                                      className="pointer-events-none absolute left-0 top-0 z-30"
                                      style={{ width: RULER_THICKNESS_PX.w, height: RULER_THICKNESS_PX.h }}
                                    />
                                    <div
                                      className="pointer-events-none absolute right-0 top-0 z-30"
                                      style={{ left: RULER_THICKNESS_PX.w, height: RULER_THICKNESS_PX.h }}
                                    >
                                      <Ruler
                                        orientation="horizontal"
                                        totalMm={guideSpreadWorkMm}
                                        zeroOffsetMm={GUIDE_BLEED_MM}
                                        trimTotalMm={(guidePageWorkMm - 2 * GUIDE_BLEED_MM) * 2}
                                      />
                                    </div>
                                    <div
                                      className="pointer-events-none absolute bottom-0 left-0 z-30"
                                      style={{ top: RULER_THICKNESS_PX.h, width: RULER_THICKNESS_PX.w }}
                                    >
                                      <Ruler orientation="vertical" totalMm={guidePageWorkMm} zeroOffsetMm={GUIDE_BLEED_MM} />
                                    </div>
                                  </>
                                )}
                            <div
                              className={`group relative mt-3 flex w-full items-start bg-white ${
 isPrintPreview ? "" : ""
                              }`}
                              style={
                                isPrintPreview
                                  ? { transform: `scale(${previewScaleX}, ${previewScaleY})`, transformOrigin: "center center" }
                                  : undefined
                              }
                            >
                              {/* 스프레드 접힘선 - 두 페이지를 하나로 이어 보이게 하고, 가운데는 이 선 하나로만
                                  구분해요. "접힘·제본 경계" 안내선을 켜면 그 옆으로 옅은 배경(BindingGuide)이
                                  더해질 뿐, 선은 늘지 않아요. */}
                              <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-[var(--color-charcoal)]/15" />
                              <div className="group relative w-1/2">
                                {i === 0 ? (
                                  <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-ivory)] p-2" />
                                ) : (
                                  <>
                                    {!isAiAuto && (
                                      <select
                                        value={spread.left}
                                        onChange={(e) => handleChangeLayout(i, "left", e.target.value as PageTemplateId)}
                                        className="absolute left-1 top-1 z-10 bg-white/90 px-1 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                                      >
                                        {layoutOptions.map((opt) => (
                                          <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    {renderPage(
                                      spread.left,
                                      leftPhotos,
                                      leftIndexes,
                                      handlePhotoTransform,
                                      handleCaptionChange,
                                      requiredMinPx,
                                      resolveSpreadBackgroundCss(spread, "right"),
                                      !isAiAuto && (spread.left === "full" || spread.left === "fullMargin") && leftIndexes[0] !== undefined
                                        ? () => handleConvertPhotoToImageBox(i, "left", leftIndexes[0])
                                        : undefined
                                    )}
                                    <TextBoxLayer
                                      boxes={spread.textBoxesLeft ?? []}
                                      onAdd={() => handleAddTextBox(i, "left")}
                                      showAddButton={false}
                                      onChange={(boxId, c) => handleTextBoxChange(i, "left", boxId, c)}
                                      onDelete={(boxId) => handleDeleteTextBox(i, "left", boxId)}
                                      onStackAction={(boxId, action) => applySpreadStackAction(i, "text", boxId, action)}
                                      activeBoxId={
                                        activeTextBox?.ref.scope === "spread" &&
                                        activeTextBox.ref.spreadIndex === i &&
                                        activeTextBox.ref.side === "left"
                                          ? activeTextBox.boxId
                                          : null
                                      }
                                      onSelect={(boxId) =>
                                        selectTextBox({ scope: "spread", spreadIndex: i, side: "left" }, boxId)
                                      }
                                      onShiftSelect={(boxId) =>
                                        toggleTextBoxMultiSelect({ scope: "spread", spreadIndex: i, side: "left" }, boxId)
                                      }
                                      multiSelectedBoxIds={
                                        multiTextSelection?.ref.scope === "spread" &&
                                        multiTextSelection.ref.spreadIndex === i &&
                                        multiTextSelection.ref.side === "left"
                                          ? multiTextSelection.boxIds
                                          : undefined
                                      }
                                    />
                                  </>
                                )}
                              </div>
                              <div className="group relative w-1/2">
                                {!isAiAuto && (
                                  <select
                                    value={spread.right}
                                    onChange={(e) => handleChangeLayout(i, "right", e.target.value as PageTemplateId)}
                                    className="absolute left-1 top-1 z-10 bg-white/90 px-1 py-0.5 text-[10px] opacity-0 transition group-hover:opacity-100"
                                  >
                                    {layoutOptions.map((opt) => (
                                      <option key={opt.id} value={opt.id}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                {renderPage(
                                  spread.right,
                                  rightPhotos,
                                  rightIndexes,
                                  handlePhotoTransform,
                                  handleCaptionChange,
                                  requiredMinPx,
                                  resolveSpreadBackgroundCss(spread, "left"),
                                  !isAiAuto && (spread.right === "full" || spread.right === "fullMargin") && rightIndexes[0] !== undefined
                                    ? () => handleConvertPhotoToImageBox(i, "right", rightIndexes[0])
                                    : undefined
                                )}
                                <TextBoxLayer
                                  boxes={spread.textBoxesRight ?? []}
                                  onAdd={() => handleAddTextBox(i, "right")}
                                  showAddButton={false}
                                  onChange={(boxId, c) => handleTextBoxChange(i, "right", boxId, c)}
                                  onDelete={(boxId) => handleDeleteTextBox(i, "right", boxId)}
                                  onStackAction={(boxId, action) => applySpreadStackAction(i, "text", boxId, action)}
                                  activeBoxId={
                                    activeTextBox?.ref.scope === "spread" &&
                                    activeTextBox.ref.spreadIndex === i &&
                                    activeTextBox.ref.side === "right"
                                      ? activeTextBox.boxId
                                      : null
                                  }
                                  onSelect={(boxId) =>
                                    selectTextBox({ scope: "spread", spreadIndex: i, side: "right" }, boxId)
                                  }
                                  onShiftSelect={(boxId) =>
                                    toggleTextBoxMultiSelect({ scope: "spread", spreadIndex: i, side: "right" }, boxId)
                                  }
                                  multiSelectedBoxIds={
                                    multiTextSelection?.ref.scope === "spread" &&
                                    multiTextSelection.ref.spreadIndex === i &&
                                    multiTextSelection.ref.side === "right"
                                      ? multiTextSelection.boxIds
                                      : undefined
                                  }
                                />
                              </div>
                              {/* 2026-09-30, 혜민님 확인: "맨뒤로 보내기를 누르면 이미지가
                                  사라지거나 생기는 현상" — 원인은 위 두 w-1/2(왼쪽/오른쪽 낱장, 배경색을
                                  담음) div가 이 자유배치 레이어보다 DOM상 나중에 오면서, z-index가 같은
                                  값(0)일 땐 나중에 오는 요소가 위에 그려지는 CSS 규칙 때문에 사진이 배경
                                  뒤로 숨어버렸던 거예요. 자유배치 사진·텍스트 레이어는 항상 두 낱장 배경
                                  위에 있어야 하므로(zOrder 0은 "배경보다는 위, 그 외엔 맨 뒤"라는 뜻),
                                  아예 DOM에서도 두 낱장 배경 div보다 뒤에(=항상 위에) 오도록 옮겼어요. */}
                              {/* 자유 배치 이미지박스 — 왼쪽·오른쪽 낱장이 아니라 스프레드 전체
                                  위에 얹어서, 박스를 끌어 페이지 경계를 자유롭게 넘나들 수 있어요. */}
                              <ImageBoxLayer
                                boxes={spread.imageBoxes ?? []}
                                onChange={(boxId, c) => handleImageBoxChange(i, boxId, c)}
                                onDelete={(boxId) => handleDeleteImageBox(i, boxId)}
                                onAltDuplicate={(box) => handleAltDuplicateImageBox(i, box)}
                                onStackAction={(boxId, action) => applySpreadStackAction(i, "image", boxId, action)}
                                activeBoxId={activeImageBox?.spreadIndex === i ? activeImageBox.boxId : null}
                                onSelect={(boxId) => selectImageBox(i, boxId)}
                                onShiftSelect={(boxId) => toggleImageBoxMultiSelect(i, boxId)}
                                multiSelectedBoxIds={
                                  multiImageSelection?.spreadIndex === i ? multiImageSelection.boxIds : undefined
                                }
                                onPhotoEditModeChange={setImageBoxPhotoEditActive}
                                registerBoxRef={(boxId, handle) => {
                                  if (handle) imageBoxHandlesRef.current.set(boxId, handle);
                                  else imageBoxHandlesRef.current.delete(boxId);
                                }}
                                guidesX={imageBoxGuidesX}
                                guidesY={imageBoxGuidesY}
                              />
                              {/* 자유 배치 표(테이블) 박스도 이미지박스와 같은 스프레드 전체
                                  좌표계를 써요(기본형, 2026-09-25 "표 만들기" 요청). */}
                              <TableBoxLayer
                                boxes={spread.tableBoxes ?? []}
                                onChange={(boxId, c) => handleTableBoxChange(i, boxId, c)}
                                onDelete={(boxId) => handleDeleteTableBox(i, boxId)}
                                activeBoxId={
                                  activeTableBox?.scope === "spread" && activeTableBox.spreadIndex === i
                                    ? activeTableBox.boxId
                                    : null
                                }
                                onSelect={(boxId) => setActiveTableBox({ scope: "spread", spreadIndex: i, boxId })}
                              />
                              {/* 사진박스 2개 이상 Shift+다중 선택했을 때 뜨는 캔버스 위 정렬
                                  아이콘 툴바예요(2026-09-26 추가, 혜민님 요청 — 참고 이미지의
                                  일러스트레이터 정렬 패널처럼). 선택된 박스들의 바운딩 박스
                                  오른쪽 위에 붙어요. */}
                              {(() => {
                                const kind = spreadMultiSelectionKind(i);
                                if (kind === "mixed") {
                                  const bounds = combinedMultiSelectionBounds(i);
                                  const hasAutoHeightText = multiTextSelectedBoxes().some(
                                    (b) => b.heightPct === undefined
                                  );
                                  return bounds ? (
                                    <MultiAlignFloatingToolbar
                                      bounds={bounds}
                                      onAlign={(mode) => alignCombinedSelection(i, mode)}
                                      disabledModes={hasAutoHeightText ? ["vmiddle", "bottom"] : undefined}
                                    />
                                  ) : null;
                                }
                                if (kind === "image") {
                                  const bounds = multiImageSelectionBounds();
                                  return bounds ? (
                                    <MultiAlignFloatingToolbar bounds={bounds} onAlign={alignMultiImageBoxes} />
                                  ) : null;
                                }
                                return null;
                              })()}
                              {!isPrintPreview && showGuidelines && (
                                <GuideLines trimXPct={trimXPct} trimYPct={trimYPct} />
                              )}
                              {!isPrintPreview && showInnerBindingGuide && (
                                <BindingGuide leftPct={bindingLeftEdgePct} rightPct={bindingRightEdgePct} />
                              )}
                              {!isPrintPreview && showInnerSafetyGuide &&
                                (innerSafetyFits ? (
                                  <>
                                    <CoverGuideBox
                                      left={leftPageSafetyLeftPct}
                                      right={leftPageSafetyRightPct}
                                      top={safetyYPct}
                                      bottom={100 - safetyYPct}
                                      variant="dotted"
                                    />
                                    <CoverGuideBox
                                      left={rightPageSafetyLeftPct}
                                      right={rightPageSafetyRightPct}
                                      top={safetyYPct}
                                      bottom={100 - safetyYPct}
                                      variant="dotted"
                                    />
                                  </>
                                ) : (
                                  <div className="pointer-events-none absolute inset-x-0 top-1 z-20 text-center text-[10px] text-[#e0524c]">
                                    페이지가 좁아 제본부 안전영역을 확보하지 못했어요
                                  </div>
                                ))}
                            </div>
                              </div>
                              </div>
                            </CanvasStage>
                          </div>
                        </div>
                      );
                    })()
                  )}
                  </div>
              </div>

            </div>
          )}
        </div>

        {/* 2026-09-25, 혜민님 요청(1B단계 화면 비율): 여기 있던 <section>은 원래
            "다음" 진행 버튼을 담았는데, 그 버튼이 2026-09에 상단바로 옮겨간 뒤에도
            빈 껍데기(px-1.5 pb-24 pt-6 = 세로 padding만 120px)가 그대로 남아있었어요.
            사진 수가 안 맞을 때 뜨는 경고 문구만 빼고는 평소엔 완전히 비어있는데도
            shrink-0라서 항상 고정 높이를 차지했고, 이게 바로 편집 캔버스(위 회색 영역)
            아래에 정체불명의 흰 여백으로 남던 원인이었어요 — 캔버스는 flex-1이라 이
            빈 껍데기가 차지한 만큼 높이를 못 받았던 거예요. 이제 경고 문구가 실제로
            보일 때만 이 섹션 자체를 렌더링해서, 평소엔 캔버스가 남은 세로 공간을 전부
            쓰게 했어요. */}
        {photos.length > 0 && !isPhotoCountValid && (
          <section className="mx-auto w-full max-w-5xl shrink-0 px-1.5 pb-3 pt-1.5 sm:px-10">
            <p className="text-sm text-red-500">
              {photos.length < requiredCount
                ? `사진이 ${requiredCount - photos.length}장 더 필요해요.`
                : `사진이 ${photos.length - requiredCount}장 더 많아요. ${photos.length - requiredCount}장을 빼주세요.`}
            </p>
          </section>
        )}
        </div>
      </main>
    );
  }

  const nextUrlSimple = `/checkout?product=${encodeURIComponent(
    productName
  )}&size=${selectedSizeInfo.id}&quantity=${quantity}`;

  return (
    <main className="min-h-screen bg-[var(--color-ivory)] text-[var(--color-charcoal)]">
      <header className="mx-auto flex max-w-6xl items-center gap-2 px-1.5 py-2 sm:px-10">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="뒤로가기"
          className="flex h-9 w-9 items-center justify-center text-[var(--color-charcoal)]/60 transition hover:bg-[var(--color-hairline)]/30 hover:text-[var(--color-charcoal)]"
        >
          ←
        </button>
        <a href="/">
          <img src="/logo.svg" alt="Keepic" className="h-7 w-auto" />
        </a>
      </header>

      <section className="mx-auto max-w-6xl px-1.5 pb-24 pt-8 sm:px-10">
        <p className="text-sm text-[var(--color-charcoal)]/60">
          {productName} · {selectedSizeInfo.label} · {quantity}개
        </p>
        <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">
          {productName === "텀블러" ? "요청사항을 확인해주세요" : "사진을 골라주세요"}
        </h1>
        <p className="mt-3 text-[var(--color-charcoal)]/70">
          {productName === "텀블러"
            ? "텀블러는 사진 대신 각인으로 제작해요. 참고할 사진이 있다면 함께 올려주셔도 좋아요. (선택)"
            : "이 상품은 사진 1장이 필요해요."}
        </p>

        {hasNoteFeature && (
          <div className="mt-6 border border-[var(--color-hairline)] bg-white px-2.5 py-2">
            <p className="text-xs font-medium text-[var(--color-charcoal)]/50 break-keep">
              앞에서 남기신 요청사항 · 수정하고 싶으면 바로 고칠 수 있어요
            </p>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="요청사항이 없다면 비워두셔도 돼요."
              rows={4}
              className="mt-3 w-full resize-none border border-[var(--color-hairline)] bg-white px-2 py-1.5 text-sm outline-none focus:border-[var(--color-sky)]"
            />
          </div>
        )}

        <label className="mt-8 inline-block cursor-pointer bg-[linear-gradient(135deg,var(--color-brand-purple),var(--color-sky))] px-2 py-2 text-sm font-medium text-white transition hover:opacity-90">
          사진 선택하기
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </label>

        {photos.length === 1 && isLowRes(photos[0], requiredMinPx) && (
          <p className="mt-4 bg-red-50 px-2 py-1.5 text-sm text-red-600 break-keep">
            이 사진은 인쇄 기준으로 해상도가 낮아요. 이대로 인쇄하면 흐릿하게 나올 수 있으니, 가능하면 더 큰 사진으로 교체해주세요.
          </p>
        )}

        {photos.length === 1 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold">미리보기</h2>
            <div className="mt-4 inline-block bg-white p-1.5 ">
              <div
                className={`${selectedSizeInfo.aspect} w-64 p-1.5 ${
 productName === "액자"
                    ? "border-8 border-[var(--color-charcoal)]"
                    : "-[2rem] border-2 border-[var(--color-charcoal)]/40"
                }`}
              >
                <PhotoCell
                  photo={photos[0]}
                  requiredMinPx={requiredMinPx}
                  onChange={(c) => handlePhotoTransform(0, c)}
                />
              </div>
            </div>
          </div>
        )}

        {(photos.length > 0 ||
          (productName === "텀블러" && requestNote.trim() !== "")) && (
          <button
            onClick={() =>
              handleProceed(
                nextUrlSimple,
                photos,
                requestNote.trim() ? requestNote : undefined
              )
            }
            disabled={isSaving}
            className={`mt-10 px-2 py-2 text-sm font-medium text-white transition ${
              isSaving
                ? "cursor-not-allowed bg-[var(--color-hairline)] text-white/70"
                : "bg-[var(--color-charcoal)] hover:opacity-90"
            }`}
          >
            {isSaving
              ? productName === "텀블러"
                ? "신청 접수하는 중..."
                : "사진 올리는 중..."
              : productName === "텀블러"
                ? "제작 신청하기"
                : "다음"}
          </button>
        )}
      </section>
    </main>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory)]" />}>
      <UploadPageContent />
    </Suspense>
  );
}
