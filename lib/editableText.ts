// contentEditable 글상자(TextBoxRichEditor)의 DOM에서 글자를 읽을 때 쓰는 순수 함수예요(53차, 혜민님 요청 "Enter로 넣은 줄바꿈이 저장돼야 해요").
//
// 브라우저는 Enter를 누르면 상황에 따라 줄바꿈 문자("\n"), <br>, 또는 <div>(줄마다 블록)를 만들어요.
// 예전 코드는 <br>을 건너뛰고 <div> 안 글자만 이어 붙여서 "Summer" + Enter + "Vacation"이 "SummerVacation"으로 저장됐어요(Chromium에서 재현됨).
// 이 함수는 innerText처럼 줄바꿈이 되는 모든 경우를 "\n" 조각으로 돌려줘서, 글자 조각(span)별 서식은 그대로 이어받게 해요.
//
// 규칙:
//  · 글자 노드 → 그 글자 그대로(조각의 서식은 가장 가까운 data-idx span의 것)
//  · <br> → "\n" (단, 블록 안에 <br> 하나만 있는 "빈 줄 자리표시"는 블록 경계가 줄바꿈을 대신하므로 무시)
//  · <div>/<p> 블록 → 앞에 이미 줄이 시작됐으면 "\n"을 하나 넣고 안쪽을 읽어요(첫 블록이 맨 앞이면 넣지 않아요)

export type EditablePiece = { text: string; el: HTMLElement | null; fromBr?: boolean };

const BLOCK_TAGS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6"]);

export function collectEditablePieces(root: Node): EditablePiece[] {
  const out: EditablePiece[] = [];
  let started = false; // 글자나 블록이 하나라도 나왔는지(맨 앞 블록은 앞 줄바꿈이 필요 없어요)
  const lastEl = (): HTMLElement | null => {
    for (let i = out.length - 1; i >= 0; i--) if (out[i].el) return out[i].el;
    return null;
  };
  function walk(node: Node, span: HTMLElement | null) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3) {
        const text = child.textContent ?? "";
        if (text) {
          out.push({ text, el: span });
          started = true;
        }
      } else if (child.nodeType === 1) {
        const el = child as HTMLElement;
        const tag = el.tagName;
        if (tag === "BR") {
          const parent = el.parentNode as HTMLElement | null;
          const placeholder = !!parent && BLOCK_TAGS.has(parent.tagName) && parent.childNodes.length === 1;
          if (!placeholder) {
            out.push({ text: "\n", el: span ?? lastEl(), fromBr: true });
            started = true;
          }
        } else if (BLOCK_TAGS.has(tag)) {
          if (started) out.push({ text: "\n", el: span ?? lastEl() });
          started = true;
          walk(el, span);
        } else {
          walk(el, el.hasAttribute("data-idx") ? el : span);
        }
      }
    }
  }
  walk(root, null);
  // 54차: Firefox는 Enter 뒤에 글자를 insertText(한글 입력기 포함)로 넣으면 맨 끝에 캐럿용 <br>을 그대로 남겨요("우리 가족\n여행<br>") — 이걸 줄바꿈으로 읽으면 제목 끝에 안 쓴 줄바꿈이 하나 저장돼요.
  // 맨 끝 <br>이 "글자 바로 뒤"(앞이 줄바꿈이 아닌)에 있으면 자리표시자라서 버려요. 줄바꿈 바로 뒤의 <br>("ab\n<br>" = Enter로 만든 빈 마지막 줄)은 Chromium의 "ab\n\n"과 같게 그대로 둬요.
  const last = out[out.length - 1];
  if (last && last.fromBr) {
    const before = out.slice(0, -1).map((x) => x.text).join("");
    if (before.length > 0 && !before.endsWith("\n")) out.pop();
  }
  return out;
}

/** 위 규칙으로 읽은 전체 글자(구간 서식 없이) — 테스트·진단용. */
export function editablePlainText(root: Node): string {
  return collectEditablePieces(root)
    .map((p) => p.text)
    .join("");
}

/** 붙여넣은 글자를 줄 단위로 쪼개요(\r\n·\r도 줄바꿈 하나로). */
export function splitPastedLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

/**
 * 54차: Enter 키를 우리가 직접 줄바꿈으로 바꿔도 되는지. 한글 입력기(IME)로 글자를 확정하는 Enter는 건드리면 안 돼요.
 *  · Chrome/Firefox: 조합 중 keydown은 isComposing=true (그리고 keyCode 229)
 *  · Safari: compositionend가 keydown "보다 먼저" 와서 그 keydown의 isComposing은 이미 false지만 keyCode는 229로 남아요 — 이걸 안 거르면 확정 Enter가 줄바꿈으로 한 번 더 들어가요.
 */
export function isImeEnter(ev: { isComposing?: boolean; keyCode?: number }, composingRef: boolean): boolean {
  return composingRef || !!ev.isComposing || ev.keyCode === 229;
}
