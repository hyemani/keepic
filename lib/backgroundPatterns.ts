// 내지 배경 "그래픽·패턴·텍스처" 꾸미기 기능이에요. 기존 단색 배경(스프레드 배경색)에
// 더해서, 미리 만들어둔 배경 조합을 골라 쓸 수 있어요.
//
// 화면 미리보기(CSS)와 실제 인쇄 PDF(Canvas)가 정확히 같은 결과를 보여줘야 해서, 각
// 배경을 "색 + 방식(kind) + 간격(mm)"이라는 하나의 조합(레시피)으로 정의해두고,
// 화면용 CSS 문자열과 인쇄용 Canvas 그리기 함수를 이 레시피 하나에서 함께 만들어요.

export type BackgroundPatternCategory = "graphic" | "pattern" | "texture";

export type BackgroundPatternKind = "diagonalSplit" | "gradient" | "dots" | "stripes" | "grid";

export type BackgroundPatternPreset = {
  id: string;
  label: string;
  category: BackgroundPatternCategory;
  kind: BackgroundPatternKind;
  colors: [string, string];
  // dots/stripes/grid 전용 — 무늬가 반복되는 간격이에요(mm 기준, 인쇄 파일과 같은 실제
  // 크기). diagonalSplit/gradient는 안 써요.
  spacingMm?: number;
};

export const backgroundPatterns: BackgroundPatternPreset[] = [
  // 그래픽
  {
    id: "diagonal-ivory-beige",
    label: "대각 분할",
    category: "graphic",
    kind: "diagonalSplit",
    colors: ["#f7f3ec", "#e9dfc9"],
  },
  {
    id: "diagonal-sky-ivory",
    label: "대각 분할(하늘)",
    category: "graphic",
    kind: "diagonalSplit",
    colors: ["#eef1f4", "#dbe6ef"],
  },
  {
    id: "gradient-sunset",
    label: "그라데이션(선셋)",
    category: "graphic",
    kind: "gradient",
    colors: ["#f8e4d8", "#e4ecf4"],
  },
  {
    id: "gradient-sage",
    label: "그라데이션(세이지)",
    category: "graphic",
    kind: "gradient",
    colors: ["#eef1e8", "#dbe4d6"],
  },
  // 패턴
  {
    id: "dots-sand",
    label: "도트(샌드)",
    category: "pattern",
    kind: "dots",
    colors: ["#f7f3ec", "#c9b89a"],
    spacingMm: 6,
  },
  {
    id: "dots-sky",
    label: "도트(하늘)",
    category: "pattern",
    kind: "dots",
    colors: ["#eef4fa", "#a9c6dd"],
    spacingMm: 6,
  },
  {
    id: "stripes-mint",
    label: "스트라이프(민트)",
    category: "pattern",
    kind: "stripes",
    colors: ["#eef1f4", "#c7d6e0"],
    spacingMm: 5,
  },
  {
    id: "stripes-blush",
    label: "스트라이프(블러시)",
    category: "pattern",
    kind: "stripes",
    colors: ["#faf1ee", "#e9c9c1"],
    spacingMm: 5,
  },
  // 텍스처
  {
    id: "grid-linen",
    label: "리넨 그리드",
    category: "texture",
    kind: "grid",
    colors: ["#f5f1ea", "#d8cfbd"],
    spacingMm: 4,
  },
  {
    id: "grain-kraft",
    label: "크래프트 결",
    category: "texture",
    kind: "dots",
    colors: ["#efe6d8", "#ddccae"],
    spacingMm: 2.2,
  },
];

export const backgroundPatternCategories: { id: BackgroundPatternCategory; label: string }[] = [
  { id: "graphic", label: "그래픽" },
  { id: "pattern", label: "패턴" },
  { id: "texture", label: "텍스처" },
];

export function findBackgroundPattern(id: string | undefined): BackgroundPatternPreset | undefined {
  if (!id) return undefined;
  return backgroundPatterns.find((p) => p.id === id);
}

// mm를 "화면 미리보기용" CSS px로 바꿔요(96dpi 기준 — 실제 인쇄 해상도와는 무관하게,
// 무늬 간격이 화면에서 보기 좋은 크기가 되도록 대략치만 맞추면 돼요).
function mmToCssPx(mm: number): number {
  return Math.max(4, Math.round(mm * 3.78));
}

// 화면(React 인라인 스타일)에 쓸 CSS background 값이에요. background 단축 속성이라
// 색 하나만 있어도, 그라데이션·반복 무늬가 있어도 모두 이 한 문자열로 표현돼요.
//
// anchorSide: 내지 스프레드는 왼쪽·오른쪽 두 낱장을 나란히 보여주는데, 각 낱장에 무늬를
// "왼쪽 위(0,0)부터" 독립적으로 반복시키면 두 낱장의 무늬 위상이 어긋나서 가운데(제본
// 경계)에서 간격이 안 맞아 보여요(마치 다른 이미지 두 장을 붙여놓은 것처럼). 그래서 왼쪽
// 낱장은 무늬 기준점을 "오른쪽"(=가운데 쪽)에, 오른쪽 낱장은 "왼쪽"(=가운데 쪽)에 둬서,
// 가운데를 기준으로 무늬가 대칭으로 맞아떨어지게 해요.
export function patternToCssBackground(
  preset: BackgroundPatternPreset,
  anchorSide: "left" | "right" = "left"
): string {
  const [c0, c1] = preset.colors;
  const posX = anchorSide === "right" ? "right" : "left";
  switch (preset.kind) {
    case "diagonalSplit":
      return `linear-gradient(135deg, ${c0} 50%, ${c1} 50%)`;
    case "gradient":
      return `linear-gradient(135deg, ${c0}, ${c1})`;
    case "dots": {
      const s = mmToCssPx(preset.spacingMm ?? 6);
      return `radial-gradient(${c1} 22%, transparent 23%) ${posX} top/${s}px ${s}px, ${c0}`;
    }
    case "stripes": {
      const w = mmToCssPx(preset.spacingMm ?? 5);
      return `repeating-linear-gradient(45deg, ${c1} 0 ${w / 2}px, ${c0} ${w / 2}px ${w}px) ${posX} top`;
    }
    case "grid": {
      const w = mmToCssPx(preset.spacingMm ?? 4);
      return `repeating-linear-gradient(0deg, ${c1} 0 1px, transparent 1px ${w}px) ${posX} top, repeating-linear-gradient(90deg, ${c1} 0 1px, transparent 1px ${w}px) ${posX} top, ${c0}`;
    }
    default:
      return c0;
  }
}

// 스프레드(SpreadDef)의 배경 설정을 화면에 그대로 쓸 수 있는 CSS background 값
// 하나로 정리해요. 패턴을 골랐으면 패턴이 우선이고, 아니면 기존 단색 배경색을 써요.
export function resolveSpreadBackgroundCss(
  spread: {
    backgroundColor?: string;
    backgroundPattern?: string;
  },
  anchorSide: "left" | "right" = "left"
): string | undefined {
  const preset = findBackgroundPattern(spread.backgroundPattern);
  if (preset) return patternToCssBackground(preset, anchorSide);
  return spread.backgroundColor;
}

// 인쇄 PDF(Canvas 2D)에 같은 배경을 그려요. mmToPxFn은 호출하는 쪽의 단위 변환 함수를
// 그대로 받아요(printCompose.ts는 px, printPdfLib.ts는 pt를 쓰기 때문에 함수로 받아서
// 이 파일은 두 생성기 모두에서 그대로 재사용할 수 있어요).
export function drawBackgroundPatternOnCanvas(
  ctx: CanvasRenderingContext2D,
  preset: BackgroundPatternPreset,
  x: number,
  y: number,
  w: number,
  h: number,
  mmToPxFn: (mm: number) => number
) {
  const [c0, c1] = preset.colors;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = c0;
  ctx.fillRect(x, y, w, h);

  switch (preset.kind) {
    case "diagonalSplit": {
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "gradient": {
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, c0);
      grad.addColorStop(1, c1);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      break;
    }
    case "dots": {
      const spacing = mmToPxFn(preset.spacingMm ?? 6);
      const radius = spacing * 0.28;
      ctx.fillStyle = c1;
      for (let py = y; py < y + h + spacing; py += spacing) {
        for (let px = x; px < x + w + spacing; px += spacing) {
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "stripes": {
      const spacing = mmToPxFn(preset.spacingMm ?? 5);
      const diag = Math.sqrt(w * w + h * h) * 1.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((45 * Math.PI) / 180);
      ctx.fillStyle = c1;
      for (let sx = -diag; sx < diag; sx += spacing) {
        ctx.fillRect(sx, -diag, spacing / 2, diag * 2);
      }
      ctx.restore();
      break;
    }
    case "grid": {
      const spacing = mmToPxFn(preset.spacingMm ?? 4);
      ctx.strokeStyle = c1;
      ctx.lineWidth = Math.max(1, spacing * 0.06);
      for (let gx = x; gx <= x + w; gx += spacing) {
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();
      }
      for (let gy = y; gy <= y + h; gy += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + w, gy);
        ctx.stroke();
      }
      break;
    }
    default:
      break;
  }

  ctx.restore();
}
