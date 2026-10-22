import { useEffect, useRef, useState } from "react";
import { isTextEntryElement } from "./softKeyboard";

// 64차: "휴대폰을 가로로 돌려주세요" 안내를 언제 보여줄지 정하는 도구예요.
//
// 왜 다시 만들었어요? 예전에는 "창 높이 >= 창 폭" 한 가지 값만 보고 곧바로 안내를 띄웠어요. 실제 iPhone(특히 홈 화면 앱)은
// 회전 직후·키보드가 열리고 닫힐 때·주소창이 움직일 때 크기를 잠깐 옛날 값이나 줄어든 값으로 알려주는 일이 있어서, 가로로 편집하는 중에도 안내가 불쑥 떴고,
// 그 순간 "세로로 계속하기" 기억도 같이 지워져서 계속 반복됐어요.
//
// 지금 규칙:
//  (a) 세로 판단 = 세 신호가 "모두" 세로라고 할 때만: ① 미디어쿼리 (orientation: portrait) ② screen.orientation.type(있을 때) ③ 창 크기.
//      ③은 키보드가 줄인 높이를 쓰지 않고, 키보드가 없을 때 재 둔 "레이아웃 크기"로 판단해요. 신호가 서로 다르면 "세로 아님"(= 안내 안 띄움)으로 봐요.
//  (b) 키보드가 열려 있거나, 글 칸에 포커스가 있거나, 키보드·크기 변화 뒤 1.2초 안이면 안내를 새로 띄우지 않아요.
//  (c) 세로 상태가 0.7초 넘게 계속돼야 띄우고, 세로가 아니게 된 지 0.15초가 지나야 걷어요.
//  (d) "세로 화면으로 계속하기"를 누르면 편집을 떠났다가(1.5초 넘게) 다시 들어올 때까지 다시 안 떠요(메모리 + sessionStorage).
//  (e) 전체 화면 안내는 접속 한 번에 딱 한 번, "세로 상태에서 편집에 처음 들어올 때"만 떠요. 그 뒤(편집하다가 세로가 되었을 때 등)에는
//      화면을 가리지 않는 작은 알림 한 줄("가로로 돌리면 더 편해요")만 잠깐 보여줘요.
//
// 점검용: window.__keepicOrientationLog 에 최근 판단 30개(신호·시각·결정)가 쌓여요. 화면에는 나오지 않아요.

export type RotateNoticeKind = "none" | "full" | "chip";

const SHOW_AFTER_MS = 700;
const HIDE_AFTER_MS = 150;
const BLOCK_MS = 1200;
const LEAVE_EDIT_MS = 1500;
const CHIP_MS = 6000;
const TICK_MS = 200;
const SS_KEY = "keepic.portraitContinue";
const LOG_MAX = 30;

type LogEntry = Record<string, unknown>;
declare global {
  interface Window {
    __keepicOrientationLog?: LogEntry[];
  }
}

function pushLog(entry: LogEntry) {
  try {
    const arr = (window.__keepicOrientationLog ??= []);
    arr.push(entry);
    while (arr.length > LOG_MAX) arr.shift();
  } catch {
    /* 점검용이라 실패해도 무시 */
  }
}

function mm(q: string): boolean | null {
  try {
    return window.matchMedia(q).matches;
  } catch {
    return null;
  }
}

/** screen.orientation.type 으로 본 세로 여부(없으면 null) */
function screenOrientationPortrait(): boolean | null {
  try {
    const t = window.screen?.orientation?.type;
    if (typeof t === "string" && t) return t.startsWith("portrait");
  } catch {
    /* 무시 */
  }
  return null;
}

function readSS(): boolean {
  try {
    return window.sessionStorage.getItem(SS_KEY) === "1";
  } catch {
    return false;
  }
}
function writeSS(v: boolean) {
  try {
    if (v) window.sessionStorage.setItem(SS_KEY, "1");
    else window.sessionStorage.removeItem(SS_KEY);
  } catch {
    /* 무시 */
  }
}

// 접속(페이지 로드) 한 번 동안만 기억하는 값 — 컴포넌트가 다시 만들어져도 유지돼요.
let fullShownThisLoad = false;
let continuedMem = false;

/** 테스트·점검용: 모듈 기억 초기화 */
export function __resetRotateNoticeMemory() {
  fullShownThisLoad = false;
  continuedMem = false;
  writeSS(false);
}

export function useRotateNotice(opts: { enabled: boolean; active: boolean; keyboardOpen: boolean }) {
  const { enabled, active, keyboardOpen } = opts;
  const [kind, setKind] = useState<RotateNoticeKind>("none");
  const inputs = useRef({ enabled, active, keyboardOpen });
  useEffect(() => {
    inputs.current = { enabled, active, keyboardOpen };
  });
  const apiRef = useRef({ continueInPortrait: () => {}, dismissChip: () => {} });

  useEffect(() => {
    if (!enabled) return;
    const now = () => Date.now();
    const t0 = now();
    let base = { w: window.innerWidth, h: window.innerHeight };
    let allPortrait = false;
    let portraitSince = t0;
    let landscapeSince = t0;
    let blockedUntil = t0 + BLOCK_MS; // 막 켜진 직후에는 한 번 기다려요
    let hideSince: number | null = null;
    let leftEditSince: number | null = null;
    let inEdit = false;
    let sawLandscapeInEdit = false;
    let entryPortraitFull = false; // 이번 편집 진입이 "세로 상태에서 처음 들어옴"이라 전체 화면 안내 자격이 있는지
    let chipDone = false;
    let chipShownAt = 0;
    let current: RotateNoticeKind = "none";
    let lastKey = "";
    if (readSS()) continuedMem = true;

    const evaluate = (ev: string) => {
      const n = now();
      const { active: act, keyboardOpen: kb } = inputs.current;
      const focused = isTextEntryElement(document.activeElement);
      const blockedNow = kb || focused;
      if (blockedNow) blockedUntil = Math.max(blockedUntil, n + BLOCK_MS);
      const blocked = n < blockedUntil;

      const iw = window.innerWidth;
      const ih = window.innerHeight;
      const vv = window.visualViewport;
      // ③ 레이아웃 크기: 막히지(키보드·크기 변화) 않았을 때만 갱신. 폭이 바뀌면(회전) 새로 시작.
      if (Math.abs(iw - base.w) > 1) base = { w: iw, h: ih };
      else if (!blocked) base = { w: iw, h: ih };
      const effH = blocked ? Math.max(base.h, ih) : ih;
      const size = iw > 0 && effH > 0 ? effH >= iw : null;
      const mqP = mm("(orientation: portrait)");
      const scrP = screenOrientationPortrait();
      const sigs = [mqP, scrP, size].filter((v): v is boolean => v !== null);
      const nowPortrait = sigs.length > 0 && sigs.every(Boolean);
      if (nowPortrait !== allPortrait) {
        allPortrait = nowPortrait;
        if (nowPortrait) portraitSince = n;
        else landscapeSince = n;
      }
      const stableP = n - portraitSince;
      const stableL = n - landscapeSince;

      // 편집 들락거림 추적
      if (act) {
        leftEditSince = null;
        if (!inEdit) {
          inEdit = true;
          sawLandscapeInEdit = false;
          entryPortraitFull = false;
          chipDone = false;
          // 들어오는 순간 세로가 한동안 이어져 온 상태면 "세로 상태에서 처음 들어옴"
          entryPortraitFull = allPortrait && !fullShownThisLoad && !continuedMem;
        }
        if (!allPortrait && stableL >= SHOW_AFTER_MS) {
          sawLandscapeInEdit = true;
          chipDone = false; // 가로를 거쳤다가 다시 세로가 되면 작은 알림은 다시 한 번 보여줘도 돼요
        }
      } else {
        if (leftEditSince === null) leftEditSince = n;
        if (inEdit && n - leftEditSince >= LEAVE_EDIT_MS) {
          inEdit = false;
          continuedMem = false;
          writeSS(false);
          entryPortraitFull = false;
        }
      }

      // 보여줄지
      const want = act && allPortrait && stableP >= SHOW_AFTER_MS && !blocked && !continuedMem;
      let nextKind: RotateNoticeKind = current;
      if (want) {
        hideSince = null;
        if (current === "none") {
          if (entryPortraitFull && !sawLandscapeInEdit && !fullShownThisLoad) {
            nextKind = "full";
            fullShownThisLoad = true;
          } else if (!chipDone) {
            nextKind = "chip";
            chipShownAt = n;
          }
        } else if (current === "chip" && n - chipShownAt >= CHIP_MS) {
          nextKind = "none";
          chipDone = true;
        }
      } else if (current !== "none") {
        // 걷기: 편집을 떠났거나 키보드/포커스면 곧바로(0.15초 뒤), 가로로 바뀌었어도 0.15초 이상 지속돼야
        if (hideSince === null) hideSince = n;
        const lingerOk = !act || continuedMem || n - hideSince >= HIDE_AFTER_MS;
        if (lingerOk && (!act || continuedMem || blockedNow || (!allPortrait && stableL >= HIDE_AFTER_MS))) {
          nextKind = "none";
          hideSince = null;
        } else if (lingerOk && blocked && current === "chip") {
          nextKind = "none";
          hideSince = null;
        }
      }
      if (nextKind !== current) {
        current = nextKind;
        setKind(nextKind);
      }
      const key = `${nextKind}|${allPortrait}|${blocked}|${mqP}|${scrP}|${size}|${act}`;
      if (key !== lastKey || ev !== "tick") {
        lastKey = key;
        pushLog({
          t: n,
          ev,
          mq: mqP,
          screen: scrP,
          size,
          iw,
          ih,
          vw: vv ? Math.round(vv.width) : null,
          vh: vv ? Math.round(vv.height) : null,
          baseW: base.w,
          baseH: base.h,
          kb,
          focused,
          blocked,
          allPortrait,
          stableMs: allPortrait ? stableP : -stableL,
          active: act,
          continued: continuedMem,
          decision: nextKind,
        });
      }
    };

    const onSizeEvent = (ev: string) => () => {
      blockedUntil = Math.max(blockedUntil, now() + BLOCK_MS);
      evaluate(ev);
    };
    const onResize = onSizeEvent("resize");
    const onVV = onSizeEvent("vv-resize");
    const onOri = onSizeEvent("orientationchange");
    const onFocus = () => evaluate("focus");
    const mqList = window.matchMedia("(orientation: portrait)");
    const onMq = () => evaluate("mq-change");
    const scrOri = window.screen?.orientation;
    const onScr = () => evaluate("screen-orientation");

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOri);
    window.visualViewport?.addEventListener("resize", onVV);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    mqList.addEventListener("change", onMq);
    scrOri?.addEventListener?.("change", onScr);
    const timer = setInterval(() => evaluate("tick"), TICK_MS);
    evaluate("mount");

    apiRef.current = {
      continueInPortrait: () => {
        continuedMem = true;
        writeSS(true);
        current = "none";
        setKind("none");
        pushLog({ t: now(), ev: "continue-click", decision: "none" });
      },
      dismissChip: () => {
        chipDone = true;
        current = "none";
        setKind("none");
        pushLog({ t: now(), ev: "chip-dismiss", decision: "none" });
      },
    };
    return () => {
      setKind("none");
      clearInterval(timer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOri);
      window.visualViewport?.removeEventListener("resize", onVV);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      mqList.removeEventListener("change", onMq);
      scrOri?.removeEventListener?.("change", onScr);
    };
  }, [enabled]);

  return {
    kind: enabled ? kind : ("none" as RotateNoticeKind),
    continueInPortrait: () => apiRef.current.continueInPortrait(),
    dismissChip: () => apiRef.current.dismissChip(),
  };
}
