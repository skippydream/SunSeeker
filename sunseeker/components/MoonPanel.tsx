"use client";

import { useMemo } from "react";
import {
  moonAge,
  moonAltitude,
  moonIllumination,
  moonPhaseName,
  moonTimes,
  nextPhase,
} from "@/lib/moon";
import { minutesToClock } from "@/lib/sun";
import MoonDisc from "./MoonDisc";

interface Props {
  latitude: number;
  longitude: number;
  utcOffsetSeconds: number;
  /** Date "YYYY-MM-DD" locali, nello stesso ordine dei sette giorni del sole. */
  dates: string[];
  todayIso: string;
  now: Date;
}

const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export default function MoonPanel({
  latitude,
  longitude,
  utcOffsetSeconds,
  dates,
  todayIso,
  now,
}: Props) {
  const moon = useMemo(() => {
    const illumination = moonIllumination(now);
    const waxing = illumination.phase < 0.5;
    const times = moonTimes(todayIso, latitude, longitude, utcOffsetSeconds);
    const altitude = moonAltitude(now, latitude, longitude);

    const full = nextPhase(now, 0.5);
    const nuova = nextPhase(now, 0);

    // La fase di ciascuna notte, valutata a mezzanotte locale del giorno dopo
    const nights = dates.map((date) => {
      const localMidnightUtc = Date.parse(`${date}T00:00:00Z`) - utcOffsetSeconds * 1000;
      const atNight = new Date(localMidnightUtc + 22 * 3_600_000);
      const info = moonIllumination(atNight);
      return { date, fraction: info.fraction, waxing: info.phase < 0.5 };
    });

    return { illumination, waxing, times, altitude, full, nuova, nights };
  }, [now, todayIso, dates, latitude, longitude, utcOffsetSeconds]);

  const { illumination, waxing, times, altitude } = moon;
  const percent = Math.round(illumination.fraction * 100);
  const age = moonAge(illumination.phase);
  const phaseName = moonPhaseName(illumination.phase);
  const southern = latitude < 0;

  const formatMoment = (date: Date) => {
    const shifted = new Date(date.getTime() + utcOffsetSeconds * 1000);
    const day = GIORNI_BREVI[shifted.getUTCDay()];
    const clock = `${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
    return `${day} ${shifted.getUTCDate()} ${MESI[shifted.getUTCMonth()]} · ${clock}`;
  };

  return (
    <section className="surface overflow-hidden rounded-3xl">
      <div className="flex items-baseline justify-between px-4 pb-4 pt-5 sm:px-6">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.16em] text-white/55">Luna</h2>
        <span className="text-[12px] text-white/35">
          {altitude > 0 ? `${Math.round(altitude)}° sull'orizzonte` : "sotto l'orizzonte"}
        </span>
      </div>

      <div className="flex flex-col gap-5 px-4 pb-5 sm:flex-row sm:items-center sm:gap-7 sm:px-6">
        <MoonDisc
          fraction={illumination.fraction}
          waxing={waxing}
          southern={southern}
          className="size-24 shrink-0 self-center sm:size-28"
          title={`${phaseName}, ${percent}% illuminata`}
        />

        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-semibold text-white">{phaseName}</p>
          <p className="mt-1 text-[14px] text-white/60">
            <span className="text-sun-200">{percent}%</span> illuminata · {age.toFixed(1)} giorni
            dalla luna nuova
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            <Cell
              label="Sorge"
              value={times.rise !== null ? minutesToClock(times.rise) : sky(times, true)}
            />
            <Cell
              label="Tramonta"
              value={times.set !== null ? minutesToClock(times.set) : sky(times, false)}
            />
          </dl>
        </div>
      </div>

      {/* Le prossime notti */}
      <div className="border-t border-white/6 px-4 py-4 sm:px-6">
        <p className="mb-3 text-[11px] uppercase tracking-wider text-white/40">Le prossime notti</p>
        <ul className="flex justify-between gap-1">
          {moon.nights.map((night) => {
            const [y, m, d] = night.date.split("-").map(Number);
            const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
            return (
              <li key={night.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <MoonDisc
                  fraction={night.fraction}
                  waxing={night.waxing}
                  southern={southern}
                  className="size-8 sm:size-9"
                  title={`${Math.round(night.fraction * 100)}% illuminata`}
                />
                <span className="text-[11px] text-white/45">
                  {night.date === todayIso ? "oggi" : GIORNI_BREVI[weekday]}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-white/30">
                  {Math.round(night.fraction * 100)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <dl className="grid grid-cols-1 gap-px border-t border-white/6 bg-white/6 sm:grid-cols-3">
        <Row label="Prossima luna piena" value={formatMoment(moon.full)} />
        <Row label="Prossima luna nuova" value={formatMoment(moon.nuova)} />
        <Row
          label="Distanza"
          value={`${Math.round(illumination.distance).toLocaleString("it-IT")} km`}
        />
      </dl>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="mt-0.5 font-mono text-[17px] tabular-nums text-white">{value}</dd>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink-850/80 px-4 py-3 sm:px-6">
      <dt className="text-[11px] uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-white/85">{value}</dd>
    </div>
  );
}

/** Nei giorni in cui la luna non sorge o non tramonta, spieghiamo perché. */
function sky(times: { alwaysUp: boolean; alwaysDown: boolean }, rising: boolean): string {
  if (times.alwaysUp) return rising ? "sempre su" : "—";
  if (times.alwaysDown) return "—";
  return rising ? "non sorge" : "non tramonta";
}
