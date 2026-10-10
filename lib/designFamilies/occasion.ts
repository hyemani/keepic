// 테마(가족·여행·커플·생일)별 새 디자인을 한곳에 모아요. 각 정의가 style·themes를 직접 가져서 designTemplates.ts가 그대로 목록에 이어 붙여요.
import type { CoverDesignDef, InnerDesignDef } from "../designKit";
import { FAMILY_COVERS, FAMILY_INNER } from "./family";
import { TRAVEL_COVERS, TRAVEL_INNER } from "./travel";
import { COUPLE_COVERS, COUPLE_INNER } from "./couple";
import { BIRTHDAY_COVERS, BIRTHDAY_INNER } from "./birthday";

// 새 파일들이 쓰는 서체는 모두 기존 스타일 파일(minimal·handwriting·kids·mz·포근한 기억)에 이미 있는 것이라 추가로 불러올 서체는 없어요.
export const OCCASION_FONTS: string[] = [];
export const OCCASION_INNER: InnerDesignDef[] = [...FAMILY_INNER, ...TRAVEL_INNER, ...COUPLE_INNER, ...BIRTHDAY_INNER];
export const OCCASION_COVER: CoverDesignDef[] = [...FAMILY_COVERS, ...TRAVEL_COVERS, ...COUPLE_COVERS, ...BIRTHDAY_COVERS];
