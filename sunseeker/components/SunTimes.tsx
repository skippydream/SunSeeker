"use client";

import { minutesToClock } from "@/lib/sun";
import { minutesOf } from "@/lib/weather";

interface Props {
  sunrise: string;
  sunset: string;
  goldenMorningEnd: number | null;
  goldenEveningStart: number | null;
  blueEveningEnd: number | null;
  /** Minuti dalla mezzanotte locale. */
  nowMinutes: number;
  daylightHours: number;
  daylightDeltaMinutes: number | null;
  tomorrowSunrise?: string;
}

export default function SunTimes({
  sunrise,
  sunset,
  goldenMorningEnd,
  goldenEveningStart,
  blueEveningEnd,
  nowMinutes,
  daylightHours,
  daylightDeltaMinutes,
  tomorrowSunrise,
}: Props) {
  const riseMin = minutesOf(sunrise);
  const setMin = minutesOf(sunset);

  // Un payload più vecchio (cache del browser) può non avere questi campi:
  // trattiamo "assente" e "non applicabile" allo stesso modo.
  const goldenStart = num(goldenEveningStart);
  const goldenEnd = num(goldenMorningEnd);
  const blueEnd = num(blueEveningEnd);
  const delta = daylightDeltaMinutes && Number.isFinite(daylightDeltaMinutes)
    ? daylightDeltaMinutes
    : null;

  // Quale dei due sta per arrivare: è quello che merita il conto alla rovescia.
  const next: "alba" | "tramonto" =
    nowMinutes < riseMin ? "alba" : nowMinutes < setMin ? "tramonto" : "alba";

  const minutesToNext =
    next === "tramonto"
      ? setMin - nowMinutes
      : nowMinutes < riseMin
        ? riseMin - nowMinutes
        : 1440 - nowMinutes + minutesOf(tomorrowSunrise ?? sunrise);

  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-2 gap-2.5">
        <TimeCard
          kind="alba"
          time={sunrise}
          highlighted={next === "alba"}
          golden={
            goldenEnd !== null ? `golden hour fino alle ${minutesToClock(goldenEnd)}` : undefined
          }
          countdown={next === "alba" ? formatGap(minutesToNext) : undefined}
        />
        <TimeCard
          kind="tramonto"
          time={sunset}
          highlighted={next === "tramonto"}
          golden={
            goldenStart !== null ? `golden hour dalle ${minutesToClock(goldenStart)}` : undefined
          }
          countdown={next === "tramonto" ? formatGap(minutesToNext) : undefined}
          footnote={
            blueEnd !== null ? `buio alle ${minutesToClock(blueEnd)}` : undefined
          }
        />
      </div>

      <p className="mt-2.5 text-center text-[13px] text-white/70 text-glow">
        {formatDuration(daylightHours)} di luce
        {delta !== null && (
          <>
            {" · "}
            <span className={delta > 0 ? "text-sun-200" : "text-white/60"}>
              {delta > 0 ? "+" : "−"}
              {Math.abs(delta)} min rispetto a ieri
            </span>
          </>
        )}
      </p>
    </div>
  );
}

function TimeCard({
  kind,
  time,
  golden,
  countdown,
  footnote,
  highlighted,
}: {
  kind: "alba" | "tramonto";
  time: string;
  golden?: string;
  countdown?: string;
  footnote?: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-3.5 py-3 text-left backdrop-blur-md transition-colors ${
        highlighted
          ? "bg-ink-950/45 ring-1 ring-sun-300/40"
          : "bg-ink-950/30 ring-1 ring-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <HorizonGlyph kind={kind} className="size-4 shrink-0 text-sun-300" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-white/70">{kind}</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-[26px] leading-none tabular-nums text-white">{time}</span>
        {countdown && <span className="text-[12px] text-sun-200">fra {countdown}</span>}
      </div>

      {golden && <p className="mt-1.5 text-[12px] leading-snug text-white/55">{golden}</p>}
      {footnote && <p className="text-[12px] leading-snug text-white/40">{footnote}</p>}
    </div>
  );
}

/** Mezzo sole sull'orizzonte con la freccia nel verso giusto. */
function HorizonGlyph({ kind, className = "" }: { kind: "alba" | "tramonto"; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 18h18" />
      <path d="M7.5 18a4.5 4.5 0 0 1 9 0" />
      <path d="M12 3.5v5" />
      {kind === "alba" ? <path d="m9.6 5.9 2.4-2.4 2.4 2.4" /> : <path d="m9.6 6.1 2.4 2.4 2.4-2.4" />}
    </svg>
  );
}

/** null, undefined e NaN diventano tutti null. */
function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** 372 -> "6h 12m", 45 -> "45m" */
function formatGap(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

/** 13.53 -> "13h 32m" */
function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}
