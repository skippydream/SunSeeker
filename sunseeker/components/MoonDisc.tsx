import { useId } from "react";

const R = 50;
const C = 60;

interface Props {
  /** Frazione illuminata, 0-1. */
  fraction: number;
  /** Vero fra luna nuova e piena: la parte illuminata sta a destra. */
  waxing: boolean;
  /** Nell'emisfero australe la luna si vede ruotata di mezzo giro. */
  southern?: boolean;
  className?: string;
  title?: string;
}

/**
 * Il terminatore è una semiellisse il cui semiasse orizzontale vale
 * R·|1−2f|: a f=0.5 degenera in una retta (quarti), a f=0 e f=1 coincide
 * con il bordo del disco.
 */
function litPath(fraction: number): string {
  const f = Math.min(1, Math.max(0, fraction));
  const a = (R * Math.abs(1 - 2 * f)).toFixed(2);
  const sweep = f < 0.5 ? 0 : 1;
  return `M ${C} ${C - R} A ${R} ${R} 0 0 1 ${C} ${C + R} A ${a} ${R} 0 0 ${sweep} ${C} ${C - R} Z`;
}

export default function MoonDisc({ fraction, waxing, southern = false, className = "", title }: Props) {
  const uid = useId().replace(/:/g, "");
  const transforms = [
    waxing ? null : `scale(-1 1) translate(${-2 * C} 0)`,
    southern ? `rotate(180 ${C} ${C})` : null,
  ].filter(Boolean);

  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title ?? "Fase lunare"}>
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={`lit-${uid}`} cx="38%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="62%" stopColor="#ecead9" />
          <stop offset="100%" stopColor="#c9c6b4" />
        </radialGradient>
        <radialGradient id={`halo-${uid}`}>
          <stop offset="55%" stopColor="#dfe6ff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#dfe6ff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={litPath(fraction)} />
        </clipPath>
      </defs>

      {/* Alone */}
      <circle cx={C} cy={C} r={58} fill={`url(#halo-${uid})`} />

      {/* Faccia in ombra: resta appena percettibile, come la luce cinerea */}
      <circle cx={C} cy={C} r={R} fill="#141a2b" stroke="#ffffff" strokeOpacity={0.09} strokeWidth={1} />

      <g transform={transforms.join(" ") || undefined}>
        <path d={litPath(fraction)} fill={`url(#lit-${uid})`} />
        {/* Mari lunari, ritagliati sulla sola parte illuminata */}
        <g clipPath={`url(#clip-${uid})`} fill="#b5b2a0" opacity={0.34}>
          <ellipse cx={48} cy={46} rx={15} ry={12} />
          <ellipse cx={74} cy={40} rx={9} ry={7} opacity={0.75} />
          <ellipse cx={72} cy={70} rx={12} ry={14} opacity={0.8} />
          <ellipse cx={44} cy={80} rx={10} ry={8} opacity={0.7} />
        </g>
      </g>
    </svg>
  );
}
