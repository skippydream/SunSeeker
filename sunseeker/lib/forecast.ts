/**
 * Chiamate a Open-Meteo dal browser.
 *
 * Il sito è pubblicato come export statico (GitHub Pages non esegue Node), quindi
 * non c'è un backend dove far passare queste richieste. Non è un problema:
 * Open-Meteo non richiede chiavi e risponde con `access-control-allow-origin: *`.
 */

import { lightWindows } from "./sun";
import { classifyRain, consensusOf } from "./weather";
import type { DayForecast, Forecast, HourPoint, Place, RainConsensus } from "./weather";

const ROOT = "https://api.open-meteo.com/v1/forecast";
const GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

const FORECAST_DAYS = 7;
const PAST_DAYS = 1; // serve solo a confrontare la luce con ieri

export const DEFAULT_PLACE: Place = {
  name: "Milano",
  region: "Lombardia",
  countryCode: "IT",
  latitude: 45.4642,
  longitude: 9.19,
};

const DAILY = [
  "sunrise",
  "sunset",
  "sunshine_duration",
  "daylight_duration",
  "cloud_cover_mean",
  "uv_index_max",
  "temperature_2m_max",
  "temperature_2m_min",
  "weather_code",
  "precipitation_probability_max",
  "precipitation_sum",
  "precipitation_hours",
].join(",");

const HOURLY = [
  "temperature_2m",
  "cloud_cover",
  "sunshine_duration",
  "precipitation_probability",
  "precipitation",
  "is_day",
].join(",");

/**
 * ICON-2I è il modello di ItaliaMeteo/ARPAE: 2,2 km sull'Italia, contro gli
 * ~11 km di ECMWF. Copre però solo i primi tre giorni e non produce né indice
 * UV né probabilità di precipitazione, quindi lo usiamo come strato sopra la
 * previsione di base invece che al suo posto.
 */
const ITALY_MODEL = "italia_meteo_arpae_icon_2i";
const ITALY_DAILY = [
  "sunshine_duration",
  "cloud_cover_mean",
  "temperature_2m_max",
  "temperature_2m_min",
  "weather_code",
  "precipitation_sum",
  "precipitation_hours",
].join(",");
const ITALY_HOURLY = ["temperature_2m", "cloud_cover", "sunshine_duration", "precipitation"].join(",");

/** Centri meteorologici indipendenti: se concordano, la previsione è solida. */
const CONSENSUS_MODELS = [ITALY_MODEL, "icon_seamless", "ecmwf_ifs025", "gfs_seamless"];

interface DailyBlock {
  time: string[];
  sunrise: string[];
  sunset: string[];
  sunshine_duration: (number | null)[];
  daylight_duration: number[];
  cloud_cover_mean: (number | null)[];
  uv_index_max: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  weather_code: (number | null)[];
  precipitation_probability_max: (number | null)[];
  precipitation_sum: (number | null)[];
  precipitation_hours: (number | null)[];
}

interface HourlyBlock {
  time: string[];
  temperature_2m: (number | null)[];
  cloud_cover: (number | null)[];
  sunshine_duration: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  is_day: number[];
}

interface BaseResponse {
  timezone: string;
  utc_offset_seconds: number;
  daily: DailyBlock;
  hourly: HourlyBlock;
}

interface OverlayResponse {
  daily: Partial<DailyBlock> & { time: string[] };
  hourly: Partial<HourlyBlock> & { time: string[] };
}

interface ConsensusResponse {
  daily: Record<string, (number | null)[] | string[]>;
}

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

export class ForecastError extends Error {}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new ForecastError(`Il servizio meteo ha risposto ${res.status}.`);
  return res.json() as Promise<T>;
}

export interface ForecastRequest {
  latitude: number;
  longitude: number;
  /** Località scelta dalla ricerca; assente per una posizione rilevata dal GPS. */
  place?: Place;
  signal?: AbortSignal;
}

export async function loadForecast({
  latitude,
  longitude,
  place,
  signal,
}: ForecastRequest): Promise<Forecast> {
  const common = `latitude=${latitude}&longitude=${longitude}&timezone=auto&forecast_days=${FORECAST_DAYS}&past_days=${PAST_DAYS}`;

  // La previsione di base è l'unica indispensabile; gli altri due strati
  // migliorano il risultato ma la loro assenza non deve far fallire nulla.
  const [base, overlay, consensus] = await Promise.all([
    getJson<BaseResponse>(`${ROOT}?${common}&daily=${DAILY}&hourly=${HOURLY}`, signal),
    getJson<OverlayResponse>(
      `${ROOT}?${common}&daily=${ITALY_DAILY}&hourly=${ITALY_HOURLY}&models=${ITALY_MODEL}`,
      signal
    ).catch(() => null),
    getJson<ConsensusResponse>(
      `${ROOT}?${common}&daily=precipitation_sum&models=${CONSENSUS_MODELS.join(",")}`,
      signal
    ).catch(() => null),
  ]);

  return buildForecast(base, overlay, consensus, place ?? detectedPlace(latitude, longitude));
}

/** Ricerca città. Restituisce una lista vuota su errore: non è un percorso critico. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const data = await getJson<{ results?: GeocodingResult[] }>(
    `${GEOCODING}?name=${encodeURIComponent(q)}&count=6&language=it&format=json`,
    signal
  );
  return (data.results ?? []).map((r) => ({
    name: r.name,
    region: r.admin1,
    country: r.country,
    countryCode: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/**
 * Per una posizione rilevata dal GPS non facciamo reverse geocoding:
 * significherebbe mandare le coordinate dell'utente a un servizio terzo solo
 * per scrivere un nome di città.
 */
function detectedPlace(latitude: number, longitude: number): Place {
  const ns = latitude >= 0 ? "N" : "S";
  const ew = longitude >= 0 ? "E" : "O";
  return {
    name: "La tua posizione",
    region: `${Math.abs(latitude).toFixed(2)}°${ns}, ${Math.abs(longitude).toFixed(2)}°${ew}`,
    latitude,
    longitude,
  };
}

/* ------------------------------------------------------------------ */

function buildForecast(
  base: BaseResponse,
  overlay: OverlayResponse | null,
  consensus: ConsensusResponse | null,
  place: Place
): Forecast {
  const d = base.daily;
  const hoursByDate = groupHours(base.hourly, overlay?.hourly ?? null);

  let highResolutionDays = 0;

  const days: DayForecast[] = d.time.map((date, i) => {
    // Preferiamo ICON-2I quando ha un valore per quel giorno: fuori dal suo
    // dominio e oltre il terzo giorno restituisce null e restiamo sulla base.
    const od = overlay?.daily;
    const pick = <K extends keyof DailyBlock>(key: K): number | null => {
      const fine = od?.[key] as (number | null)[] | undefined;
      const value = fine?.[i];
      if (value !== null && value !== undefined) return value as number;
      return ((d[key] as (number | null)[])[i] ?? null) as number | null;
    };

    const fromItalyModel =
      od?.sunshine_duration?.[i] !== null && od?.sunshine_duration?.[i] !== undefined;
    if (fromItalyModel && i >= PAST_DAYS) highResolutionDays++;

    const sunHours = (pick("sunshine_duration") ?? 0) / 3600;
    const daylightHours = d.daylight_duration[i] / 3600;
    const previousDaylight = i > 0 ? d.daylight_duration[i - 1] / 3600 : null;

    const hours = hoursByDate.get(date) ?? [];
    const millimetres = Math.round((pick("precipitation_sum") ?? 0) * 10) / 10;
    const chance = Math.round(d.precipitation_probability_max[i] ?? 0);

    const light = lightWindows(date, place.latitude, place.longitude, base.utc_offset_seconds);

    return {
      date,
      // Le stringhe di open-meteo sono già nel fuso della località:
      // le teniamo tali e quali invece di farle passare da Date.
      sunrise: timeOf(d.sunrise[i]),
      sunset: timeOf(d.sunset[i]),
      sunHours,
      daylightHours,
      sunRatio: daylightHours > 0 ? Math.min(1, sunHours / daylightHours) : 0,
      daylightDeltaMinutes:
        previousDaylight === null ? null : Math.round((daylightHours - previousDaylight) * 60),
      goldenMorningEnd: light.goldenMorningEnd,
      goldenEveningStart: light.goldenEveningStart,
      blueMorningStart: light.blueMorningStart,
      blueEveningEnd: light.blueEveningEnd,
      cloudCover: Math.round(pick("cloud_cover_mean") ?? 0),
      // ICON-2I non produce l'indice UV: qui la base è l'unica fonte.
      uvIndex: d.uv_index_max[i] ?? 0,
      tempMax: Math.round(pick("temperature_2m_max") ?? 0),
      tempMin: Math.round(pick("temperature_2m_min") ?? 0),
      precipitationChance: chance,
      precipitationMm: millimetres,
      precipitationHours: Math.round(pick("precipitation_hours") ?? 0),
      rainLevel: classifyRain(millimetres, chance),
      rainWindow: rainWindowOf(hours),
      consensus: consensusFor(consensus, i),
      highResolution: fromItalyModel,
      weatherCode: pick("weather_code") ?? 0,
      hours,
    };
  });

  return {
    place,
    timezone: base.timezone,
    utcOffsetSeconds: base.utc_offset_seconds,
    days: days.slice(PAST_DAYS), // via il giorno passato, serviva solo per il confronto
    highResolutionDays,
  };
}

/** Unisce le ore della previsione di base con quelle, più fini, di ICON-2I. */
function groupHours(
  base: HourlyBlock,
  overlay: OverlayResponse["hourly"] | null
): Map<string, HourPoint[]> {
  const byDate = new Map<string, HourPoint[]>();

  for (let i = 0; i < base.time.length; i++) {
    const stamp = base.time[i];
    const date = stamp.slice(0, 10);
    const hhmm = timeOf(stamp);

    const fine = <K extends keyof HourlyBlock>(key: K): number | null => {
      const value = (overlay?.[key] as (number | null)[] | undefined)?.[i];
      if (value !== null && value !== undefined) return value as number;
      return ((base[key] as (number | null)[])[i] ?? null) as number | null;
    };

    const point: HourPoint = {
      time: hhmm,
      hour: Number(hhmm.slice(0, 2)),
      temperature: Math.round(fine("temperature_2m") ?? 0),
      cloudCover: Math.round(fine("cloud_cover") ?? 0),
      sunshine: Math.min(1, (fine("sunshine_duration") ?? 0) / 3600),
      // ICON-2I non dà la probabilità: resta quella della previsione di base.
      precipitationChance: Math.round(base.precipitation_probability[i] ?? 0),
      precipitationMm: fine("precipitation") ?? 0,
      isDay: base.is_day[i] === 1,
    };

    const list = byDate.get(date);
    if (list) list.push(point);
    else byDate.set(date, [point]);
  }

  return byDate;
}

function consensusFor(response: ConsensusResponse | null, index: number): RainConsensus | null {
  if (!response) return null;

  const values: number[] = [];
  for (const model of CONSENSUS_MODELS) {
    const series = response.daily[`precipitation_sum_${model}`] as (number | null)[] | undefined;
    const value = series?.[index];
    if (typeof value === "number") values.push(value);
  }

  return consensusOf(values);
}

/** Prima e ultima ora bagnata della giornata, in minuti locali. */
function rainWindowOf(hours: HourPoint[]): { start: number; end: number } | null {
  const wet = hours.filter((h) => h.precipitationMm >= 0.1);
  if (wet.length === 0) return null;
  return { start: wet[0].hour * 60, end: (wet[wet.length - 1].hour + 1) * 60 };
}

/** "2026-08-27T06:38" -> "06:38" */
const timeOf = (iso: string) => iso.slice(11, 16);
