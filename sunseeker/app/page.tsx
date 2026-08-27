"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DayRow from "@/components/DayRow";
import LocationSearch from "@/components/LocationSearch";
import MoonPanel from "@/components/MoonPanel";
import SkyBackground from "@/components/SkyBackground";
import SunArc from "@/components/SunArc";
import SunTimes from "@/components/SunTimes";
import { DropIcon } from "@/components/RainBadge";
import { skyTheme, solarPosition } from "@/lib/sun";
import type { Forecast, Place } from "@/lib/weather";
import {
  consensusLabel,
  formatHours,
  formatMillimetres,
  isUncertain,
  localDateIso,
  localMinutes,
  minutesOf,
  rainLabel,
} from "@/lib/weather";
import { minutesToClock } from "@/lib/sun";

type Status = "loading" | "ready" | "error";

export default function Home() {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Il cielo segue l'ora reale: un aggiornamento al minuto basta e avanza.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /**
   * Scarica le previsioni. Non tocca lo stato prima del primo await, così può
   * essere chiamata anche dall'effetto di avvio senza innescare render a cascata.
   */
  const fetchForecast = useCallback(
    async (params: string, fallbackNotice: string | null = null) => {
      try {
        const res = await fetch(`/api/weather${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Richiesta non riuscita.");
        setForecast(data as Forecast);
        setNotice(fallbackNotice);
        setError(null);
        setStatus("ready");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Qualcosa è andato storto.");
        setStatus("error");
      }
    },
    []
  );

  /** Come sopra, ma riporta subito la pagina in caricamento: per i clic. */
  const load = useCallback(
    (params: string, fallbackNotice: string | null = null) => {
      setStatus("loading");
      setError(null);
      void fetchForecast(params, fallbackNotice);
    },
    [fetchForecast]
  );

  /** Richiesta esplicita dell'utente: qui lo spinner ha senso. */
  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      void load("", "Il browser non espone la posizione: ecco Milano.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        void load(`?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
      },
      () => {
        setGeoBusy(false);
        void load("", "Non riesco a leggere la posizione. Controlla i permessi del browser.");
      },
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [load]);

  useEffect(() => {
    // All'avvio lo stato è già "loading": non tocchiamo nulla qui dentro e
    // lasciamo che siano le callback della geolocalizzazione, asincrone, a
    // muovere lo stato.
    if (!("geolocation" in navigator)) {
      // fetchForecast aggiorna lo stato solo dopo l'await: nessun render a cascata.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchForecast("", "Il browser non espone la posizione: ecco Milano.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void fetchForecast(`?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
      () =>
        void fetchForecast(
          "",
          "Posizione non disponibile: intanto ecco Milano. Cerca la tua città in alto."
        ),
      { timeout: 8000, maximumAge: 300_000 }
    );
  }, [fetchForecast]);

  const selectPlace = useCallback(
    (place: Place) => {
      const params = new URLSearchParams({
        lat: String(place.latitude),
        lon: String(place.longitude),
        name: place.name,
      });
      if (place.region) params.set("region", place.region);
      if (place.countryCode) params.set("country", place.countryCode);
      void load(`?${params}`);
      setExpanded(null);
    },
    [load]
  );

  /* ---------------- Derivati ---------------- */

  const view = useMemo(() => {
    if (!forecast) return null;

    const { place, utcOffsetSeconds, days, highResolutionDays } = forecast;
    const todayIso = localDateIso(utcOffsetSeconds, now);
    const nowMinutes = localMinutes(utcOffsetSeconds, now);
    const today = days.find((d) => d.date === todayIso) ?? days[0];

    const tomorrowDate = new Date(`${todayIso}T00:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrowIso = tomorrowDate.toISOString().slice(0, 10);

    const sun = solarPosition(now, place.latitude, place.longitude);
    const later = solarPosition(new Date(now.getTime() + 600_000), place.latitude, place.longitude);
    const theme = skyTheme(sun.elevation, later.elevation > sun.elevation);

    const riseMin = minutesOf(today.sunrise);
    const setMin = minutesOf(today.sunset);
    const sunX = Math.max(0, Math.min(1, (nowMinutes - riseMin) / Math.max(1, setMin - riseMin)));

    const currentHour = today.hours.find((h) => h.hour === Math.floor(nowMinutes / 60));

    // Sole che resta da qui a fine giornata, ora per ora.
    const remaining = today.hours
      .filter((h) => h.hour >= nowMinutes / 60 - 1 && h.hour * 60 + 60 > nowMinutes)
      .reduce((sum, h) => {
        const overlap = Math.min(60, h.hour * 60 + 60 - nowMinutes) / 60;
        return sum + h.sunshine * Math.max(0, Math.min(1, overlap));
      }, 0);

    return {
      place,
      days,
      today,
      utcOffsetSeconds,
      highResolutionDays,
      todayIso,
      tomorrowIso,
      nowMinutes,
      theme,
      sunX,
      elevation: sun.elevation,
      cloudCover: currentHour?.cloudCover ?? today.cloudCover,
      remaining,
      minutesToSunset: setMin - nowMinutes,
      clock: `${String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:${String(nowMinutes % 60).padStart(2, "0")}`,
      bestSunHours: Math.max(...days.map((d) => d.sunHours)),
      isDaytime: nowMinutes >= riseMin && nowMinutes <= setMin,
    };
  }, [forecast, now]);

  const theme = view?.theme ?? skyTheme(-20, false);

  return (
    <>
      <SkyBackground
        theme={theme}
        sunX={view?.sunX ?? 0.5}
        elevation={view?.elevation ?? -20}
        cloudCover={view?.cloudCover ?? 0}
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 pb-16 pt-6 sm:px-6">
        {/* Intestazione */}
        <header className="flex items-center justify-between gap-3">
          <LocationSearch
            current={view?.place.name ?? "Sun Seeker"}
            subtitle={view ? [view.place.region, view.place.countryCode].filter(Boolean).join(", ") : undefined}
            onSelect={selectPlace}
            onUseMyLocation={locate}
            geolocationBusy={geoBusy}
          />
          {view && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-[15px] tabular-nums text-white text-glow">{view.clock}</div>
              <div className="text-[12px] text-white/70 text-glow">{theme.label}</div>
            </div>
          )}
        </header>

        <div aria-live="polite" className="sr-only">
          {status === "loading" ? "Carico le previsioni" : status === "error" ? error : ""}
        </div>

        {status === "error" && (
          <ErrorState message={error} onRetry={locate} />
        )}

        {status !== "error" && (
          <>
            {/* Eroe: quanto sole oggi */}
            <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              {!view ? (
                <HeroSkeleton />
              ) : (
                <>
                  <p className="animate-rise text-[13px] uppercase tracking-[0.18em] text-white/75 text-glow">
                    Sole oggi
                  </p>

                  <h1
                    className="animate-rise mt-2 flex items-baseline justify-center font-display font-semibold tracking-tight text-white text-glow"
                    style={{ animationDelay: "60ms" }}
                  >
                    <span className="text-[clamp(4.5rem,17vw,8.5rem)] leading-[0.85] tabular-nums">
                      {formatHours(view.today.sunHours).value}
                    </span>
                    <span className="ml-1 text-[clamp(1.75rem,6vw,3rem)] leading-none text-white/85">h</span>
                    <span className="ml-3 text-[clamp(1.75rem,6vw,3rem)] leading-none tabular-nums text-white/85">
                      {formatHours(view.today.sunHours).minutes}
                    </span>
                    <span className="ml-1 text-[clamp(1.1rem,3.5vw,1.6rem)] leading-none text-white/60">m</span>
                  </h1>

                  <p
                    className="animate-rise mt-3 text-[15px] text-white/85 text-glow"
                    style={{ animationDelay: "120ms" }}
                  >
                    su {view.today.daylightHours.toFixed(1)}h di luce ·{" "}
                    <span className="text-sun-200">{Math.round(view.today.sunRatio * 100)}% del giorno</span>
                  </p>

                  {view.today.rainLevel !== "asciutto" && (
                    <div
                      className="animate-rise mt-4 inline-flex items-center gap-2 rounded-full bg-sky-500/25 px-4 py-1.5 text-[13px] text-sky-50 ring-1 ring-sky-300/30 backdrop-blur-md"
                      style={{ animationDelay: "150ms" }}
                    >
                      <DropIcon className="size-3.5 shrink-0" />
                      <span>
                        {rainLabel(view.today.rainLevel)}
                        {view.today.rainWindow && (
                          <>
                            {" · "}
                            {minutesToClock(view.today.rainWindow.start)}–
                            {minutesToClock(view.today.rainWindow.end)}
                          </>
                        )}
                        {view.today.precipitationMm >= 0.1 &&
                          ` · ${formatMillimetres(view.today.precipitationMm)}`}
                        {view.today.consensus && (
                          <span className="text-sky-100/65">
                            {" · "}
                            {consensusLabel(view.today.consensus)}
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Giornata data per asciutta ma su cui i modelli litigano */}
                  {view.today.rainLevel === "asciutto" && isUncertain(view.today.consensus) && (
                    <p
                      className="animate-rise mt-4 text-[13px] text-white/60 text-glow"
                      style={{ animationDelay: "150ms" }}
                    >
                      {consensusLabel(view.today.consensus!)} sulla pioggia di oggi
                    </p>
                  )}

                  <div className="animate-rise mt-6 w-full" style={{ animationDelay: "180ms" }}>
                    <div className="flex justify-center">
                      <SunArc
                        sunrise={view.today.sunrise}
                        sunset={view.today.sunset}
                        nowMinutes={view.nowMinutes}
                        hours={view.today.hours}
                        goldenMorningEnd={view.today.goldenMorningEnd}
                        goldenEveningStart={view.today.goldenEveningStart}
                      />
                    </div>
                  </div>

                  <div
                    className="animate-rise mt-3 flex w-full justify-center"
                    style={{ animationDelay: "240ms" }}
                  >
                    <SunTimes
                      sunrise={view.today.sunrise}
                      sunset={view.today.sunset}
                      goldenMorningEnd={view.today.goldenMorningEnd}
                      goldenEveningStart={view.today.goldenEveningStart}
                      blueEveningEnd={view.today.blueEveningEnd}
                      nowMinutes={view.nowMinutes}
                      daylightHours={view.today.daylightHours}
                      daylightDeltaMinutes={view.today.daylightDeltaMinutes}
                      tomorrowSunrise={view.days[1]?.sunrise}
                    />
                  </div>

                  <p
                    className="animate-rise mt-3 text-[13px] text-white/65 text-glow"
                    style={{ animationDelay: "300ms" }}
                  >
                    {view.isDaytime
                      ? `ancora ${compact(view.remaining)} di sole`
                      : `domani ${compact(view.days[1]?.sunHours ?? 0)} di sole`}{" "}
                    · nuvole {view.cloudCover}%
                  </p>

                  {notice && (
                    <p className="mt-6 max-w-sm rounded-xl bg-ink-950/45 px-4 py-2.5 text-[13px] text-white/80 ring-1 ring-white/10 backdrop-blur-md">
                      {notice}
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Prossimi giorni */}
            <section className="surface animate-rise overflow-hidden rounded-3xl" style={{ animationDelay: "300ms" }}>
              <div className="flex items-baseline justify-between px-4 pb-3 pt-5 sm:px-6">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.16em] text-white/55">
                  Sette giorni
                </h2>
                <span className="text-[12px] text-white/35">tocca un giorno per il dettaglio</span>
              </div>

              {!view ? (
                <ListSkeleton />
              ) : (
                <ul>
                  {view.days.map((day, i) => (
                    <DayRow
                      key={day.date}
                      day={day}
                      index={i}
                      todayIso={view.todayIso}
                      tomorrowIso={view.tomorrowIso}
                      nowMinutes={day.date === view.todayIso ? view.nowMinutes : undefined}
                      bestSunHours={view.bestSunHours}
                      expanded={expanded === day.date}
                      onToggle={() => setExpanded((cur) => (cur === day.date ? null : day.date))}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Luna */}
            {view && (
              <div className="animate-rise mt-4" style={{ animationDelay: "360ms" }}>
                <MoonPanel
                  latitude={view.place.latitude}
                  longitude={view.place.longitude}
                  utcOffsetSeconds={view.utcOffsetSeconds}
                  dates={view.days.map((d) => d.date)}
                  todayIso={view.todayIso}
                  now={now}
                />
              </div>
            )}

            <footer className="mt-8 space-y-1 text-center text-[12px] text-white/35">
              <p>
                Ore di sole misurate (<span className="font-mono">sunshine_duration</span>), non
                stimate dalla nuvolosità.
              </p>
              {view && view.highResolutionDays > 0 && (
                <p>
                  Primi {view.highResolutionDays} giorni da{" "}
                  <span className="text-white/55">ICON-2I</span> (ItaliaMeteo · ARPAE, 2,2 km);
                  oltre, modello globale. Accordo calcolato su quattro centri indipendenti.
                </p>
              )}
              <p>
                Dati{" "}
                <a
                  href="https://open-meteo.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-white/25 underline-offset-2 transition hover:text-white/60"
                >
                  Open-Meteo
                </a>{" "}
                · creato in giorni di ☔️
              </p>
            </footer>
          </>
        )}
      </main>
    </>
  );
}

/* ---------------- Pezzi di contorno ---------------- */

/** 2.35 -> "2h 21m", 0.4 -> "24m" */
function compact(hours: number): string {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : `${h}h ${String(m).padStart(2, "0")}m`;
}

function Shimmer({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/12 to-transparent" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="h-24 w-56" />
      <Shimmer className="h-3 w-44" />
      <Shimmer className="mt-4 h-40 w-full max-w-[420px] rounded-3xl" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 px-4 pb-6 sm:px-6">
      {Array.from({ length: 5 }, (_, i) => (
        <Shimmer key={i} className="h-11 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="surface rounded-3xl px-6 py-8">
        <h2 className="font-display text-xl font-semibold text-white">Niente previsioni, per ora</h2>
        <p className="mt-2 max-w-xs text-sm text-white/60">
          {message ?? "Il servizio meteo non ha risposto."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 cursor-pointer rounded-full bg-sun-400 px-5 py-2 text-sm font-semibold text-ink-950 transition hover:bg-sun-300"
        >
          Riprova
        </button>
      </div>
    </div>
  );
}
