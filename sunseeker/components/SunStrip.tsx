import type { HourPoint } from "@/lib/weather";
import { minutesOf } from "@/lib/weather";

/**
 * Strisce orarie fra alba e tramonto: si vede a colpo d'occhio *quando* ci sarà
 * sole, non solo quanto ne arriva in totale.
 */
export default function SunStrip({
  hours,
  sunrise,
  sunset,
  nowMinutes,
  className = "",
}: {
  hours: HourPoint[];
  sunrise: string;
  sunset: string;
  /** Minuti locali, per la tacca "adesso". Omesso se il giorno non è oggi. */
  nowMinutes?: number;
  className?: string;
}) {
  const riseMin = minutesOf(sunrise);
  const setMin = minutesOf(sunset);

  const daylight = hours.filter((h) => h.hour * 60 + 60 > riseMin && h.hour * 60 < setMin);
  if (daylight.length === 0) return null;

  const first = daylight[0].hour * 60;
  const last = daylight[daylight.length - 1].hour * 60 + 60;
  const nowPct =
    nowMinutes !== undefined && nowMinutes >= first && nowMinutes <= last
      ? ((nowMinutes - first) / (last - first)) * 100
      : null;

  return (
    <div className={`relative flex h-8 gap-[2px] ${className}`}>
      {daylight.map((h) => {
        const wet = h.precipitationMm >= 0.1;
        return (
          <div
            key={h.hour}
            className={`relative flex-1 overflow-hidden rounded-[3px] ${
              wet ? "bg-sky-400/20" : "bg-white/8"
            }`}
            title={
              `${h.time} — ${Math.round(h.sunshine * 60)} min di sole, ${h.cloudCover}% nuvole` +
              (wet ? `, ${h.precipitationMm.toFixed(1).replace(".", ",")} mm di pioggia` : "")
            }
          >
            {/* Il sole cresce dal basso */}
            <div
              className="absolute inset-x-0 bottom-0 bg-linear-to-t from-sun-500 to-sun-300"
              style={{ height: `${Math.max(h.sunshine * 100, h.sunshine > 0 ? 12 : 0)}%` }}
            />
            {/* La pioggia scende dall'alto: le due cose possono convivere */}
            {wet && (
              <div
                className="absolute inset-x-0 top-0 bg-sky-400"
                style={{ height: `${Math.min(50, 14 + h.precipitationMm * 12)}%` }}
              />
            )}
          </div>
        );
      })}

      {nowPct !== null && (
        <div
          className="pointer-events-none absolute -top-1 bottom-[-4px] w-px bg-white/70"
          style={{ left: `${nowPct}%` }}
        >
          <div className="absolute -left-[3px] -top-[3px] size-[7px] rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}
