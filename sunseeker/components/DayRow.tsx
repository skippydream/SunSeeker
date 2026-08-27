"use client";

import type { DayForecast } from "@/lib/weather";
import { minutesToClock } from "@/lib/sun";
import {
  consensusLabel,
  describeWeather,
  formatDate,
  formatHours,
  isUncertain,
  isWetDay,
  rainLabel,
} from "@/lib/weather";
import { RainBadge } from "./RainBadge";
import HourlyDetail from "./HourlyDetail";
import SunStrip from "./SunStrip";
import WeatherGlyph from "./WeatherGlyph";

interface Props {
  day: DayForecast;
  todayIso: string;
  tomorrowIso: string;
  /** Definito solo per il giorno corrente. */
  nowMinutes?: number;
  expanded: boolean;
  onToggle: () => void;
  /** Ore di sole del giorno più soleggiato della settimana, per la scala relativa. */
  bestSunHours: number;
  index: number;
}

export default function DayRow({
  day,
  todayIso,
  tomorrowIso,
  nowMinutes,
  expanded,
  onToggle,
  bestSunHours,
  index,
}: Props) {
  const label = formatDate(day.date, todayIso, tomorrowIso);
  const weather = describeWeather(day.weatherCode);
  const sun = formatHours(day.sunHours);
  const isToday = day.date === todayIso;
  const wet = isWetDay(day.rainLevel);
  const uncertain = isUncertain(day.consensus);

  return (
    <li
      className={`animate-rise relative border-b border-white/6 last:border-b-0 ${
        wet ? "bg-sky-400/[0.055]" : ""
      }`}
      style={{ animationDelay: `${120 + index * 55}ms` }}
    >
      {/* Sui giorni di pioggia la riga porta un segno che si vede scorrendo */}
      {wet && <span className="absolute inset-y-0 left-0 w-[3px] bg-sky-400/70" aria-hidden />}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="group w-full cursor-pointer px-4 py-4 text-left transition-colors hover:bg-white/4 sm:px-6"
      >
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 sm:grid-cols-[8.5rem_2rem_1fr_5.5rem_4.5rem]">
          {/* Giorno */}
          <div className="sm:col-auto">
            <div className="flex items-baseline gap-2">
              <span className={`text-[15px] font-semibold ${isToday ? "text-sun-300" : "text-white"}`}>
                {label.relative ?? label.weekday}
              </span>
              {isToday && <span className="size-1.5 rounded-full bg-sun-400" />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-white/45">{label.dayMonth}</span>
              <RainBadge
                level={day.rainLevel}
                millimetres={day.precipitationMm}
                uncertain={uncertain}
                title={
                  day.consensus
                    ? `${consensusLabel(day.consensus)} — fra ${day.consensus.minMm} e ${day.consensus.maxMm} mm`
                    : rainLabel(day.rainLevel)
                }
              />
            </div>
          </div>

          {/* Icona */}
          <div
            className="hidden justify-self-center text-white/75 sm:block"
            title={weather.label}
          >
            <WeatherGlyph sky={weather.sky} className="size-6" />
          </div>

          {/* Ore di sole + temperature (a destra su mobile) */}
          <div className="flex items-center gap-4 justify-self-end sm:hidden">
            <div className="text-right">
              <span className={`font-mono text-lg tabular-nums ${wet ? "text-sun-300/50" : "text-sun-300"}`}>
                {sun.value}
              </span>
              <span className={`font-mono text-sm tabular-nums ${wet ? "text-sun-300/40" : "text-sun-300/70"}`}>
                h {sun.minutes}
              </span>
            </div>
            <div className="font-mono text-sm tabular-nums text-white/50">
              {day.tempMin}° <span className="text-white">{day.tempMax}°</span>
            </div>
          </div>

          {/* Striscia oraria, fra alba e tramonto */}
          <div className="col-span-2 sm:col-auto">
            <div className="flex items-center gap-2">
              <time
                dateTime={day.sunrise}
                className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/55"
              >
                {day.sunrise}
              </time>
              <SunStrip
                hours={day.hours}
                sunrise={day.sunrise}
                sunset={day.sunset}
                nowMinutes={nowMinutes}
                className="flex-1"
              />
              <time
                dateTime={day.sunset}
                className="w-9 shrink-0 font-mono text-[11px] tabular-nums text-white/55"
              >
                {day.sunset}
              </time>
            </div>
          </div>

          {/* Ore di sole (desktop) */}
          <div className="hidden text-right sm:block">
            <span className={`font-mono text-xl tabular-nums ${wet ? "text-sun-300/50" : "text-sun-300"}`}>
              {sun.value}
            </span>
            <span className={`font-mono text-sm tabular-nums ${wet ? "text-sun-300/40" : "text-sun-300/70"}`}>
              h {sun.minutes}
            </span>
            <div
              className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/10"
              title={`${Math.round((day.sunHours / Math.max(bestSunHours, 0.1)) * 100)}% del giorno più soleggiato`}
            >
              <div
                className="h-full rounded-full bg-sun-400/70"
                style={{ width: `${(day.sunHours / Math.max(bestSunHours, 0.1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Temperature (desktop) */}
          <div className="hidden text-right font-mono text-sm tabular-nums sm:block">
            <span className="text-white/45">{day.tempMin}°</span>{" "}
            <span className="text-white">{day.tempMax}°</span>
          </div>
        </div>
      </button>

      {/*
        L'apertura anima grid-template-rows da 0fr a 1fr invece di animare
        un'altezza calcolata: il grafico orario si dimensiona dopo il primo
        layout e un'altezza fissata in anticipo lo taglierebbe.
      */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            inert={!expanded}
            className={`px-4 pb-6 transition-opacity duration-200 sm:px-6 ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
              <div className="rounded-2xl bg-white/4 p-3 sm:p-4">
                <HourlyDetail day={day} nowMinutes={nowMinutes} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Cielo" value={weather.label} />
                <Stat
                  label="Pioggia"
                  value={
                    day.precipitationMm >= 0.1
                      ? `${day.precipitationMm.toFixed(1).replace(".", ",")} mm in ${day.precipitationHours}h`
                      : rainLabel(day.rainLevel)
                  }
                />
                <Stat
                  label="Golden hour, mattina"
                  value={
                    Number.isFinite(day.goldenMorningEnd)
                      ? `${day.sunrise} – ${minutesToClock(day.goldenMorningEnd as number)}`
                      : "—"
                  }
                />
                <Stat
                  label="Golden hour, sera"
                  value={
                    Number.isFinite(day.goldenEveningStart)
                      ? `${minutesToClock(day.goldenEveningStart as number)} – ${day.sunset}`
                      : "—"
                  }
                />
                <Stat
                  label="Luce"
                  value={
                    formatHours(day.daylightHours).value +
                    "h " +
                    formatHours(day.daylightHours).minutes +
                    "m" +
                    (Number.isFinite(day.daylightDeltaMinutes) && day.daylightDeltaMinutes !== 0
                      ? ` (${(day.daylightDeltaMinutes as number) > 0 ? "+" : "−"}${Math.abs(day.daylightDeltaMinutes as number)} min)`
                      : "")
                  }
                />
                <Stat
                  label="UV massimo"
                  value={`${day.uvIndex.toFixed(1)} · ${uvLabel(day.uvIndex)}`}
                />
                {day.consensus && (
                  <Stat
                    label="Accordo fra modelli"
                    value={
                      day.consensus.maxMm > 0
                        ? `${consensusLabel(day.consensus)} · ${day.consensus.minMm}–${day.consensus.maxMm} mm`
                        : consensusLabel(day.consensus)
                    }
                  />
                )}
                <Stat
                  label="Modello"
                  value={day.highResolution ? "ICON-2I · 2,2 km" : "Best match Open-Meteo"}
                />
              </dl>

              <p className="mt-4 text-[13px] leading-relaxed text-white/45">
                {wet && day.rainWindow && (
                  <span className="text-sky-200">
                    Pioggia prevista fra le {minutesToClock(day.rainWindow.start)} e le{" "}
                    {minutesToClock(day.rainWindow.end)}.{" "}
                  </span>
                )}
                {sun.value}h {sun.minutes}m di sole su {day.daylightHours.toFixed(1)}h di luce —{" "}
                {Math.round(day.sunRatio * 100)}% del tempo fra alba e tramonto.
              </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/4 px-3 py-2.5">
      <dt className="text-[11px] uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function uvLabel(uv: number): string {
  if (uv < 3) return "basso";
  if (uv < 6) return "moderato";
  if (uv < 8) return "alto";
  if (uv < 11) return "molto alto";
  return "estremo";
}
