// 67차(가로 고정 시험판): "화면 크기" 미디어쿼리(@media 의 width·height·orientation)를 두 벌로 만들어 둬요.
// - 원래 규칙: <html data-rot-lock> 이 없을 때만 적용(:where라서 우선순위 변화 없음) → 시험판을 안 켠 보통 화면은 예전과 똑같이 동작해요.
// - 복사본: <html data-rot-lock> 일 때만 적용되고, 쿼리의 width↔height·portrait↔landscape 를 서로 바꿔서 "가상 화면(폰을 눕힌 것처럼)" 크기로 판단해요.
// 시험판이 꺼져 있으면 복사본은 절대 안 맞아서 화면에 아무 영향이 없어요. 규칙의 위치(순서)와 우선순위는 그대로라 덮어쓰기 결과도 같아요.
const NOT_LOCK = ":where(html:not([data-rot-lock]))";
const LOCK = ":where(html[data-rot-lock])";
const NEED = /(?<!device-)\b(?:width|height)\b|\borientation\b/;

function swapMediaParams(p) {
  return p.replace(/(?<!device-)\b(width|height|portrait|landscape)\b/g, (m) => ({ width: "height", height: "width", portrait: "landscape", landscape: "portrait" })[m]);
}

// 쉼표(최상위)로 나눈 선택자 목록
function splitSelectors(sel) {
  const out = [];
  let depth = 0, cur = "", q = "";
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === "\\") { cur += c + (sel[i + 1] ?? ""); i++; continue; }
    if (q) { if (c === q) q = ""; cur += c; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; continue; }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

// 선택자 맨 앞 "붙은 덩어리"(html..., :root...)의 끝 위치
function firstCompoundEnd(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") { i++; continue; }
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0 && /[\s>+~]/.test(c)) return i;
  }
  return s.length;
}

function guard(sel, lock) {
  if (sel.includes("data-rot-lock")) return sel;
  if (/^(html|:root)(?![\w-])/.test(sel)) {
    const e = firstCompoundEnd(sel);
    return sel.slice(0, e) + (lock ? ":where([data-rot-lock])" : ":where(:not([data-rot-lock]))") + sel.slice(e);
  }
  if (sel.startsWith("&")) return sel;
  return (lock ? LOCK : NOT_LOCK) + " " + sel;
}

function guardRules(container, lock) {
  container.walkRules((rule) => {
    const p = rule.parent;
    if (p && p.type === "atrule" && /keyframes$/i.test(p.name)) return;
    rule.selector = splitSelectors(rule.selector).map((s) => guard(s, lock)).join(",");
  });
}

// vh·vw 단위(dvh·svh·lvh 포함)가 든 값은 가상 화면에서는 반대 단위가 맞아요(눕힌 화면의 세로 = 실제 가로).
const UNIT = /(?:\d|\.)(?:d|s|l)?v[hw]\b/;
function swapUnits(v) {
  return v.replace(/((?:\d|\.)(?:d|s|l)?v)([hw])\b/g, (m, a, b) => a + (b === "h" ? "w" : "h"));
}

const creator = () => ({
  postcssPlugin: "keepic-rot-lock-media",
  Once(root, { AtRule, Rule }) {
    const medias = [];
    root.walkAtRules("media", (at) => {
      if (NEED.test(at.params) && !at.__rotLock) medias.push(at);
    });
    for (const at of medias) {
      const clone = at.clone({ params: swapMediaParams(at.params) });
      clone.__rotLock = true;
      if (at.parent && at.parent.type === "rule") {
        // 개발 모드: 규칙 안에 @media 가 들어 있는 모양(CSS 중첩) — 안의 내용을 "html 조건 & " 규칙으로 감싸요.
        const wrap = (node, cond) => {
          const kids = node.nodes ? node.nodes.slice() : [];
          const rule = new Rule({ selector: `${cond} &` });
          kids.forEach((k) => { k.remove(); rule.append(k); });
          node.append(rule);
        };
        wrap(at, NOT_LOCK);
        wrap(clone, LOCK);
      } else {
        guardRules(at, false);
        guardRules(clone, true);
      }
      clone.walkDecls((d) => { if (UNIT.test(d.value)) d.value = swapUnits(d.value); });
      at.after(clone);
    }
    // 미디어쿼리 밖(또는 크기와 상관없는 @media 안)의 vh·vw 값: 같은 선택자의 복사본(바로 뒤, 우선순위 같음)이 가상 화면일 때 덮어써요.
    const rules = [];
    root.walkRules((rule) => {
      const p = rule.parent;
      if (!p || p.type === "rule") return;
      if (p.type === "atrule" && /keyframes$/i.test(p.name)) return;
      if (rule.selector.includes("data-rot-lock")) return;
      if (rule.nodes && rule.nodes.some((n) => n.type === "decl" && UNIT.test(n.value))) rules.push(rule);
    });
    for (const rule of rules) {
      const c = rule.clone();
      c.removeAll();
      rule.nodes.forEach((n) => { if (n.type === "decl" && UNIT.test(n.value)) c.append(n.clone({ value: swapUnits(n.value) })); });
      c.selector = splitSelectors(rule.selector).map((s) => guard(s, true)).join(",");
      rule.after(c);
    }
  },
});
creator.postcss = true;
module.exports = creator;
module.exports.swapMediaParams = swapMediaParams;
module.exports.swapUnits = swapUnits;
