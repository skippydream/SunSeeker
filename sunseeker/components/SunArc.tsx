"use client";

import { useId } from "react";
import type { HourPoint } from "@/lib/weather";
import { minutesOf } from "@/lib/weather";

const W = 440;
const CX = W / 2;
const CY = 190; // linea dell'orizzonte
const RX = 182;
const RY = 146;
const GLOW_R = 62;

/**
 * Il riquadro visibile è più largo dell'arco: all'apice e sull'orizzonte il
 * bagliore del sole sborda di GLOW_R oltre il tracciato, e senza margine
 * verrebbe tagliato dal bordo del viewBox.
 */
const VB_X = -26;
const VB_Y = CY - RY - GLOW_R - 4; // = -20
const VB_W = W + 52;
const VB_H = CY + 60 - VB_Y;

/** Punto sull'arco: t = 0 all'alba, 1 al tramonto. */
function pointAt(t: number): [number, number] {
  const a = Math.PI * t;
  return [CX - RX * Math.cos(a), CY - RY * Math.sin(a)];
}

function arcPath(t0: number, t1: number): string {
  const [x0, y0] = pointAt(t0);
  const [x1, y1] = pointAt(t1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${RX} ${RY} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

interface Props {
  sunrise: string;
  sunset: string;
  /** Minuti dalla mezzanotte locale. */
  nowMinutes: number;
  hours: HourPoint[];
  goldenMorningEnd: number | null;
  goldenEveningStart: number | null;
}

export default function SunArc({
  sunrise,
  sunset,
  nowMinutes,
  hours,
  goldenMorningEnd,
  goldenEveningStart,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const riseMin = minutesOf(sunrise);
  const setMin = minutesOf(sunset);
  const span = Math.max(1, setMin - riseMin);
  const toT = (minute: number) => Math.max(0, Math.min(1, (minute - riseMin) / span));

  const rawT = (nowMinutes - riseMin) / span;
  // Un po' di margine oltre alba e tramonto: di notte il sole si vede
  // scendere sotto l'orizzonte invece di restare incollato al bordo.
  const t = Math.max(-0.16, Math.min(1.16, rawT));
  const isUp = rawT >= 0 && rawT <= 1;
  const [sunPx, sunPy] = pointAt(t);

  // Ogni ora di luce diventa un segmento dell'arco, tanto più acceso
  // quanto più sole è previsto in quell'ora.
  const segments = hours
    .filter((h) => h.hour * 60 + 60 > riseMin && h.hour * 60 < setMin)
    .map((h) => ({
      hour: h.hour,
      t0: toT(h.hour * 60),
      t1: toT((h.hour + 1) * 60),
      sunshine: h.sunshine,
    }))
    .filter((s) => s.t1 - s.t0 > 0.004);

  const goldenBands: Array<[number, number]> = [];
  if (Number.isFinite(goldenMorningEnd)) goldenBands.push([0, toT(goldenMorningEnd as number)]);
  if (Number.isFinite(goldenEveningStart)) goldenBands.push([toT(goldenEveningStart as number), 1]);
  const bands = goldenBands.filter(([t0, t1]) => t1 - t0 > 0.005);

  const [riseX] = pointAt(0);
  const [setX] = pointAt(1);

  return (
    <svg
      viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
      className="w-full max-w-[480px] overflow-visible"
      role="img"
      aria-label={`Percorso del sole: alba alle ${sunrise}, tramonto alle ${sunset}`}
    >
      <defs>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0%" stopColor="#fff8e2" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#ffd470" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffb930" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`horizon-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="14%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="86%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fasce della golden hour, attorno ad alba e tramonto */}
      <g fill="none" strokeLinecap="round">
        {bands.map(([t0, t1], i) => (
          <path key={i} d={arcPath(t0, t1)} stroke="#ff9d4d" strokeWidth={11} strokeOpacity={0.45} />
        ))}
      </g>

      {/* Traccia completa dell'arco */}
      <path d={arcPath(0, 1)} fill="none" stroke="rgb(255 255 255 / 0.22)" strokeWidth={2} strokeLinecap="round" />

      {/* Sole previsto, ora per ora */}
      <g strokeLinecap="round" fill="none">
        {segments.map((s) => (
          <path
            key={s.hour}
            d={arcPath(s.t0 + 0.004, s.t1 - 0.004)}
            stroke="#ffd470"
            strokeWidth={s.sunshine > 0.6 ? 7 : 5}
            strokeOpacity={0.12 + s.sunshine * 0.88}
          />
        ))}
      </g>

      {/* Orizzonte */}
      <line x1={VB_X + 14} y1={CY} x2={VB_X + VB_W - 14} y2={CY} stroke={`url(#horizon-${uid})`} strokeWidth={1.5} />

      {/* Alba e tramonto: i due punti in cui il sole tocca l'orizzonte */}
      {(
        [
          { x: riseX, label: "alba" },
          { x: setX, label: "tramonto" },
        ] as const
      ).map((edge) => (
        <g key={edge.label}>
          <circle cx={edge.x} cy={CY} r={6.5} fill="#ffb930" fillOpacity={0.22} />
          <circle cx={edge.x} cy={CY} r={3.5} fill="#ffd470" />
          <text
            x={edge.x}
            y={CY + 24}
            textAnchor="middle"
            fill="rgb(255 255 255 / 0.72)"
            className="text-[13px] tracking-[0.1em] uppercase"
          >
            {edge.label}
          </text>
        </g>
      ))}


      {/* Il sole adesso */}
      <g
        style={{
          transform: `translate(${sunPx.toFixed(2)}px, ${sunPy.toFixed(2)}px)`,
          transition: "transform 1200ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <circle r={GLOW_R} fill={`url(#glow-${uid})`} opacity={isUp ? 1 : 0.35} />
        <circle r={11} fill={isUp ? "#fff6de" : "#8ea3c4"} opacity={isUp ? 1 : 0.75} />
        {isUp && <circle r={11} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} />}
      </g>
    </svg>
  );
}
