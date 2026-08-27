"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DayForecast } from "@/lib/weather";
import { minutesOf } from "@/lib/weather";

const H = 186;
const L = 6;
const R = 6;
const TOP = 24;
const BASE = 138; // linea di base delle barre
const LABEL_Y = 160;
const BAR_MAX = 74;

export default function HourlyDetail({
  day,
  nowMinutes,
}: {
  day: DayForecast;
  nowMinutes?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const boxRef = useRef<HTMLDivElement>(null);

  // Il grafico si disegna alla larghezza reale del contenitore: così i testi
  // dell'SVG restano alla dimensione in px scelta, invece di rimpicciolirsi
  // insieme al viewBox quando lo spazio è poco.
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hours = day.hours;
  const plotW = width - L - R;
  const slot = plotW / Math.max(1, hours.length);
  const x = (hour: number) => L + hour * slot;

  const temps = hours.map((h) => h.temperature);
  const tMin = hours.length ? Math.min(...temps) : 0;
  const tMax = hours.length ? Math.max(...temps) : 1;
  const tSpan = Math.max(1, tMax - tMin);
  const tempY = (t: number) => TOP + 6 + (1 - (t - tMin) / tSpan) * 40;

  const riseX = x(minutesOf(day.sunrise) / 60);
  const setX = x(minutesOf(day.sunset) / 60);

  const tempPath = hours
    .map(
      (h, i) =>
        `${i === 0 ? "M" : "L"} ${(x(h.hour) + slot / 2).toFixed(1)} ${tempY(h.temperature).toFixed(1)}`
    )
    .join(" ");

  const warmest = hours.length ? hours.reduce((a, b) => (b.temperature > a.temperature ? b : a)) : null;
  const labelStep = width < 420 ? 6 : 3;

  return (
    <div ref={boxRef} className="w-full">
      {hours.length > 0 && (
        <svg
          viewBox={`0 0 ${width} ${H}`}
          height={H}
          className="block w-full"
          role="img"
          aria-label={`Sole, nuvolosità e temperatura ora per ora. In totale ${day.sunHours.toFixed(1)} ore di sole.`}
        >
          <defs>
            <linearGradient id={`bar-${uid}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#f59a05" />
              <stop offset="100%" stopColor="#ffe9b0" />
            </linearGradient>
          </defs>

          {/* Notte: prima dell'alba e dopo il tramonto */}
          <rect x={L} y={TOP} width={Math.max(0, riseX - L)} height={BASE - TOP} fill="#000" opacity={0.25} />
          <rect x={setX} y={TOP} width={Math.max(0, width - R - setX)} height={BASE - TOP} fill="#000" opacity={0.25} />

          {hours.map((h) => {
            const barH = h.sunshine * BAR_MAX;
            const cloudH = (h.cloudCover / 100) * BAR_MAX;
            const bw = Math.max(2, slot - 3);
            // La pioggia pende dall'alto, così non compete con il sole per lo
            // stesso spazio e nelle ore in cui c'è entrambi si vedono tutte e due.
            const rainH = h.precipitationMm >= 0.1 ? Math.min(46, 10 + h.precipitationMm * 11) : 0;
            return (
              <g key={h.hour}>
                <rect x={x(h.hour) + 1.5} y={BASE - cloudH} width={bw} height={cloudH} fill="#fff" opacity={0.08} rx={2} />
                {barH > 0.5 && (
                  <rect x={x(h.hour) + 1.5} y={BASE - barH} width={bw} height={barH} fill={`url(#bar-${uid})`} rx={2} />
                )}
                {rainH > 0 && (
                  <rect x={x(h.hour) + 1.5} y={TOP} width={bw} height={rainH} fill="#38bdf8" opacity={0.85} rx={2} />
                )}
              </g>
            );
          })}

          <line x1={L} y1={BASE} x2={width - R} y2={BASE} stroke="#fff" strokeOpacity={0.18} strokeWidth={1} />

          {/* Temperatura */}
          <path d={tempPath} fill="none" stroke="#ff8a5c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {warmest && (
            <>
              <circle cx={x(warmest.hour) + slot / 2} cy={tempY(warmest.temperature)} r={3} fill="#ff8a5c" />
              <text
                x={Math.min(width - 16, Math.max(16, x(warmest.hour) + slot / 2))}
                y={tempY(warmest.temperature) - 8}
                textAnchor="middle"
                fill="#ffb59a"
                className="font-mono text-[12px]"
              >
                {warmest.temperature}°
              </text>
            </>
          )}

          {/* Adesso */}
          {nowMinutes !== undefined && (
            <g>
              <line
                x1={x(nowMinutes / 60)}
                y1={TOP - 8}
                x2={x(nowMinutes / 60)}
                y2={BASE + 5}
                stroke="#fff"
                strokeOpacity={0.75}
                strokeWidth={1.5}
              />
              <circle cx={x(nowMinutes / 60)} cy={TOP - 8} r={3.5} fill="#fff" />
            </g>
          )}

          {/* Ore */}
          {Array.from({ length: Math.ceil(24 / labelStep) }, (_, i) => i * labelStep).map((h) => (
            <text
              key={h}
              x={x(h) + slot / 2}
              y={LABEL_Y}
              textAnchor="middle"
              fill="rgb(255 255 255 / 0.5)"
              className="font-mono text-[12px]"
            >
              {String(h).padStart(2, "0")}
            </text>
          ))}
        </svg>
      )}

      {/* Legenda in HTML: va a capo da sola sugli schermi stretti */}
      <ul className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/55">
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px] bg-linear-to-t from-sun-500 to-sun-200" />
          minuti di sole
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-[3px] bg-white/15" />
          nuvolosità
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-[#ff8a5c]" />
          temperatura
        </li>
        {hours.some((h) => h.precipitationMm >= 0.1) && (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-[3px] bg-sky-400" />
            pioggia
          </li>
        )}
      </ul>
    </div>
  );
}
