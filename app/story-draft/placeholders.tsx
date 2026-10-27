// 임시 도형(placeholder) 모음 — 진짜 일러스트가 들어오기 전까지 자리를 지키는 코드 그림들이에요.
// layers.ts에서 src를 파일 경로로 바꾸면 이 도형은 더 이상 쓰이지 않아요(이 파일은 나중에 지워도 돼요).
import type { LayerSpec } from "./layers";

const INK = "#2B2B5E";

export default function Placeholder({ ph }: { ph: LayerSpec["ph"] }) {
  const t = ph.tint ?? "#fff";
  const t2 = ph.tint2 ?? "#ddd";
  const common = { "aria-hidden": true, focusable: false, className: "st-svg" } as const;
  switch (ph.kind) {
    case "cloud":
      return (
        <svg {...common} viewBox="0 0 200 100">
          <rect x="22" y="56" width="156" height="34" rx="17" fill={t2} />
          <g fill={t}>
            <circle cx="62" cy="58" r="30" />
            <circle cx="102" cy="44" r="38" />
            <circle cx="146" cy="60" r="28" />
            <rect x="36" y="52" width="130" height="34" rx="17" />
          </g>
        </svg>
      );
    case "star":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <path d="M50 4 C54 32 68 46 96 50 C68 54 54 68 50 96 C46 68 32 54 4 50 C32 46 46 32 50 4Z" fill={t} />
        </svg>
      );
    case "spark":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <path d="M50 2 C53 36 64 47 98 50 C64 53 53 64 50 98 C47 64 36 53 2 50 C36 47 47 36 50 2Z" fill={t} />
        </svg>
      );
    case "moon":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill={t} />
          <circle cx="36" cy="40" r="7" fill="#F5D866" />
          <circle cx="60" cy="62" r="9" fill="#F5D866" />
          <circle cx="62" cy="32" r="4" fill="#F5D866" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill={t} opacity="0.28" />
          <circle cx="50" cy="50" r="34" fill={t} />
        </svg>
      );
    case "hill":
      return (
        <svg {...common} viewBox="0 0 1000 300" preserveAspectRatio="none">
          <path d="M0 300 V150 C140 50 320 40 500 120 C680 200 860 90 1000 130 V300Z" fill={t} />
        </svg>
      );
    case "card":
      // 폴라로이드 느낌의 사진 카드: 흰 테두리 + 색 사진 + 해와 산
      return (
        <svg {...common} viewBox="0 0 100 125">
          <rect x="2" y="6" width="96" height="117" rx="10" fill="#2B2B5E" opacity="0.14" />
          <rect x="0" y="0" width="96" height="119" rx="10" fill="#fff" />
          <rect x="8" y="8" width="80" height="88" rx="6" fill={t} />
          <circle cx="68" cy="30" r="9" fill="#fff" opacity="0.85" />
          <path d="M8 96 V74 L34 48 L56 72 L68 60 L88 80 V96Z" fill={t2} />
          <rect x="22" y="104" width="52" height="6" rx="3" fill={t} />
        </svg>
      );
    case "char":
      // 동글이 친구: 둥근 몸 + 눈 + 볼터치
      return (
        <svg {...common} viewBox="0 0 100 100">
          <ellipse cx="50" cy="94" rx="26" ry="5" fill="#2B2B5E" opacity="0.12" />
          <ellipse cx="32" cy="90" rx="9" ry="6" fill={t2} />
          <ellipse cx="68" cy="90" rx="9" ry="6" fill={t2} />
          <circle cx="50" cy="52" r="38" fill={t} />
          <circle cx="37" cy="50" r="5" fill={INK} />
          <circle cx="63" cy="50" r="5" fill={INK} />
          <circle cx="38.6" cy="48.4" r="1.6" fill="#fff" />
          <circle cx="64.6" cy="48.4" r="1.6" fill="#fff" />
          <ellipse cx="27" cy="62" rx="6" ry="4" fill={t2} opacity="0.7" />
          <ellipse cx="73" cy="62" rx="6" ry="4" fill={t2} opacity="0.7" />
          <path d="M43 64 Q50 71 57 64" stroke={INK} strokeWidth="3.4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "cover":
      return (
        <svg {...common} viewBox="0 0 100 133">
          <rect x="0" y="0" width="100" height="133" rx="7" fill={t} />
          <rect x="0" y="0" width="9" height="133" rx="4" fill="#2B2B5E" opacity="0.18" />
          <rect x="22" y="26" width="58" height="44" rx="9" fill="#fff" opacity="0.95" />
          <circle cx="38" cy="40" r="5" fill={t2} />
          <path d="M22 70 V58 L40 44 L54 56 L62 49 L80 62 V70Z" fill={t} opacity="0.55" />
          <rect x="30" y="86" width="44" height="7" rx="3.5" fill="#fff" opacity="0.9" />
          <rect x="38" y="100" width="28" height="5" rx="2.5" fill="#fff" opacity="0.6" />
        </svg>
      );
    case "pageLeft":
      return (
        <svg {...common} viewBox="0 0 100 133">
          <rect x="0" y="0" width="100" height="133" rx="6" fill="#FFFDF7" />
          <rect x="88" y="0" width="12" height="133" fill="#2B2B5E" opacity="0.06" />
          <rect x="0" y="0" width="100" height="133" rx="6" fill="none" stroke="#2B2B5E" strokeOpacity="0.12" strokeWidth="1.2" />
        </svg>
      );
    case "pageRight":
      return (
        <svg {...common} viewBox="0 0 100 133">
          <rect x="0" y="0" width="100" height="133" rx="6" fill="#FFFDF7" />
          <rect x="0" y="0" width="12" height="133" fill="#2B2B5E" opacity="0.06" />
          <rect x="0" y="0" width="100" height="133" rx="6" fill="none" stroke="#2B2B5E" strokeOpacity="0.12" strokeWidth="1.2" />
        </svg>
      );
    case "shadow":
      return (
        <svg {...common} viewBox="0 0 160 20" preserveAspectRatio="none">
          <ellipse cx="80" cy="10" rx="78" ry="9" fill="#2B2B5E" opacity="0.12" />
        </svg>
      );
    case "albumClosed":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <ellipse cx="50" cy="94" rx="36" ry="5" fill="#2B2B5E" opacity="0.14" />
          <rect x="16" y="10" width="72" height="82" rx="7" fill="#fff" />
          <rect x="10" y="6" width="72" height="82" rx="7" fill={ph.tint ?? "#7C6BFF"} />
          <rect x="10" y="6" width="9" height="82" rx="4" fill="#2B2B5E" opacity="0.18" />
          <rect x="28" y="24" width="42" height="32" rx="7" fill="#fff" opacity="0.95" />
          <circle cx="40" cy="34" r="4" fill={t2} />
          <path d="M28 56 V47 L42 36 L52 45 L58 40 L70 49 V56Z" fill={ph.tint ?? "#7C6BFF"} opacity="0.5" />
          <rect x="30" y="66" width="38" height="6" rx="3" fill="#fff" opacity="0.9" />
        </svg>
      );
    case "house":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <ellipse cx="50" cy="94" rx="40" ry="5" fill="#2B2B5E" opacity="0.14" />
          <rect x="72" y="14" width="9" height="22" rx="2" fill="#C9694A" />
          <rect x="14" y="44" width="72" height="48" rx="5" fill={t2} />
          <path d="M6 48 L50 10 L94 48 Q94 54 88 54 H12 Q6 54 6 48Z" fill={t} />
          <rect x="41" y="62" width="18" height="30" rx="9" fill="#9B5B3C" />
          <circle cx="55" cy="78" r="1.8" fill="#FFE27A" />
          <rect x="20" y="58" width="16" height="16" rx="4" fill="#FFE27A" />
          <rect x="64" y="58" width="16" height="16" rx="4" fill="#FFE27A" />
          <path d="M28 58 V74 M20 66 H36 M72 58 V74 M64 66 H80" stroke="#fff" strokeWidth="2" opacity="0.8" />
        </svg>
      );
    case "tree":
      return (
        <svg {...common} viewBox="0 0 80 100">
          <rect x="35" y="62" width="10" height="34" rx="4" fill="#9B5B3C" />
          <circle cx="40" cy="38" r="30" fill={t} />
          <circle cx="26" cy="50" r="18" fill={t} />
          <circle cx="56" cy="48" r="19" fill={t} />
          <circle cx="32" cy="30" r="5" fill="#fff" opacity="0.18" />
        </svg>
      );
    case "bush":
      return (
        <svg {...common} viewBox="0 0 140 100">
          <circle cx="44" cy="62" r="32" fill={t} />
          <circle cx="82" cy="52" r="38" fill={t} />
          <circle cx="112" cy="68" r="26" fill={t} />
          <rect x="10" y="72" width="120" height="22" rx="11" fill={t} />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} viewBox="0 0 100 100">
          <path d="M50 88 C14 62 6 40 18 24 C28 12 44 16 50 30 C56 16 72 12 82 24 C94 40 86 62 50 88Z" fill={t} />
          <circle cx="32" cy="32" r="5" fill="#fff" opacity="0.55" />
        </svg>
      );
    case "path":
      return null; // 길은 Scene3Home에서 ROUTE로 직접 그려요(아래 PathPlaceholder)
    default:
      return null;
  }
}

/** 길(placeholder): ROUTE.d 선을 굵은 베이지 길 + 가운데 점선으로 그려요. */
export function PathPlaceholder({ d }: { d: string }) {
  return (
    <svg aria-hidden focusable={false} className="st-svg" viewBox="0 0 100 100">
      <path d={d} fill="none" stroke="#E9C79A" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#FFF3E2" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="0.1 3" />
    </svg>
  );
}
