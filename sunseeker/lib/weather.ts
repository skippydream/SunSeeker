/** Tipi condivisi fra la route API e i componenti. */

export interface HourPoint {
  /** "HH:MM" nel fuso della località. */
  time: string;
  /** Ora del giorno 0-23 nel fuso della località. */
  hour: number;
  temperature: number;
  cloudCover: number;
  /** Frazione di ora effettivamente soleggiata, 0-1. */
  sunshine: number;
  /** Probabilità di precipitazione, 0-100. */
  precipitationChance: number;
  /** Millimetri caduti in quell'ora. */
  precipitationMm: number;
  isDay: boolean;
}

export interface DayForecast {
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM" nel fuso della località. */
  sunrise: string;
  sunset: string;
  /** Ore di sole effettive (misura sunshine_duration, non una stima da nuvolosità). */
  sunHours: number;
  /** Ore fra alba e tramonto. */
  daylightHours: number;
  /** sunHours / daylightHours, 0-1. */
  sunRatio: number;
  /** Minuti di luce guadagnati (+) o persi (-) rispetto al giorno prima. */
  daylightDeltaMinutes: number | null;
  /** Inizio e fine della golden hour, in minuti dalla mezzanotte locale. */
  goldenMorningEnd: number | null;
  goldenEveningStart: number | null;
  /** Fine del crepuscolo civile la sera, inizio la mattina. */
  blueMorningStart: number | null;
  blueEveningEnd: number | null;
  cloudCover: number;
  uvIndex: number;
  tempMax: number;
  tempMin: number;
  precipitationChance: number;
  /** Millimetri totali attesi nella giornata. */
  precipitationMm: number;
  /** Ore in cui è prevista precipitazione. */
  precipitationHours: number;
  rainLevel: RainLevel;
  /** Prima e ultima ora con pioggia, in minuti locali. Null se non piove. */
  rainWindow: { start: number; end: number } | null;
  /** Quanto i modelli indipendenti concordano sulla pioggia di questo giorno. */
  consensus: RainConsensus | null;
  /** Vero quando i valori vengono dal modello ad alta risoluzione italiano. */
  highResolution: boolean;
  weatherCode: number;
  hours: HourPoint[];
}

/**
 * Quanto conta la pioggia in una giornata. La classificazione guarda i
 * millimetri, non la probabilità: capita spesso di avere 45% di probabilità e
 * zero millimetri (nebbia, nuvole basse), e chiamarlo "giorno di pioggia"
 * sarebbe fuorviante.
 */
export type RainLevel = "asciutto" | "possibile" | "debole" | "pioggia" | "forte";

export function classifyRain(millimetres: number, chance: number): RainLevel {
  if (millimetres >= 15) return "forte";
  if (millimetres >= 2) return "pioggia";
  if (millimetres >= 0.2) return "debole";
  if (chance >= 45) return "possibile";
  return "asciutto";
}

/** Vero quando la pioggia è abbastanza da rendere secondarie le ore di sole. */
export const isWetDay = (level: RainLevel) => level === "pioggia" || level === "forte";

const RAIN_LABEL: Record<RainLevel, string> = {
  asciutto: "Asciutto",
  possibile: "Pioggia possibile",
  debole: "Pioggia debole",
  pioggia: "Giorno di pioggia",
  forte: "Pioggia forte",
};

export const rainLabel = (level: RainLevel) => RAIN_LABEL[level];

/** 5.4 -> "5,4 mm"; sotto il decimo di millimetro non ha senso mostrare cifre. */
export function formatMillimetres(mm: number): string {
  if (mm < 1) return `${mm.toFixed(1).replace(".", ",")} mm`;
  return `${mm.toFixed(mm < 10 ? 1 : 0).replace(".", ",")} mm`;
}

export interface Place {
  name: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

export interface Forecast {
  place: Place;
  timezone: string;
  /** Scostamento della località da UTC, in secondi. */
  utcOffsetSeconds: number;
  days: DayForecast[];
  /** Quanti dei sette giorni arrivano da ICON-2I invece che dal modello di base. */
  highResolutionDays: number;
}

/**
 * Accordo fra centri meteorologici indipendenti sulla pioggia di un giorno.
 * Un solo numero nasconde quanto è incerta la previsione: capita che tre
 * modelli dicano zero e il quarto due millimetri e mezzo.
 */
export interface RainConsensus {
  /** Modelli che hanno risposto per questo giorno. */
  total: number;
  /** Quanti prevedono pioggia. */
  wet: number;
  /** 0-1: quota dei modelli che sta con la maggioranza. */
  agreement: number;
  minMm: number;
  maxMm: number;
}

/** Sotto questa soglia la giornata non è "bagnata" in senso utile. */
const WET_THRESHOLD_MM = 0.5;

export function consensusOf(values: number[]): RainConsensus | null {
  if (values.length < 2) return null;
  const wet = values.filter((v) => v >= WET_THRESHOLD_MM).length;
  return {
    total: values.length,
    wet,
    agreement: Math.max(wet, values.length - wet) / values.length,
    minMm: Math.min(...values),
    maxMm: Math.max(...values),
  };
}

export function consensusLabel(c: RainConsensus): string {
  const majority = Math.max(c.wet, c.total - c.wet);
  if (c.agreement === 1) return `${c.total} modelli su ${c.total} d'accordo`;
  return `${majority} modelli su ${c.total}: previsione incerta`;
}

/** Vero quando i modelli sono abbastanza divisi da meritare un avviso. */
export const isUncertain = (c: RainConsensus | null) => c !== null && c.agreement < 0.75;

/* ------------------------------------------------------------------ */

/** Codici meteo WMO raggruppati nelle categorie che ci servono per l'icona. */
export type Sky = "sereno" | "poco-nuvoloso" | "nuvoloso" | "coperto" | "nebbia" | "pioggia" | "rovesci" | "neve" | "temporale";

const WMO: Record<number, { sky: Sky; label: string }> = {
  0: { sky: "sereno", label: "Sereno" },
  1: { sky: "poco-nuvoloso", label: "Prevalentemente sereno" },
  2: { sky: "nuvoloso", label: "Parzialmente nuvoloso" },
  3: { sky: "coperto", label: "Coperto" },
  45: { sky: "nebbia", label: "Nebbia" },
  48: { sky: "nebbia", label: "Nebbia con brina" },
  51: { sky: "pioggia", label: "Pioviggine leggera" },
  53: { sky: "pioggia", label: "Pioviggine" },
  55: { sky: "pioggia", label: "Pioviggine intensa" },
  56: { sky: "pioggia", label: "Pioviggine gelata" },
  57: { sky: "pioggia", label: "Pioviggine gelata intensa" },
  61: { sky: "pioggia", label: "Pioggia debole" },
  63: { sky: "pioggia", label: "Pioggia" },
  65: { sky: "pioggia", label: "Pioggia forte" },
  66: { sky: "pioggia", label: "Pioggia gelata" },
  67: { sky: "pioggia", label: "Pioggia gelata forte" },
  71: { sky: "neve", label: "Neve debole" },
  73: { sky: "neve", label: "Neve" },
  75: { sky: "neve", label: "Neve abbondante" },
  77: { sky: "neve", label: "Granuli di neve" },
  80: { sky: "rovesci", label: "Rovesci deboli" },
  81: { sky: "rovesci", label: "Rovesci" },
  82: { sky: "rovesci", label: "Rovesci violenti" },
  85: { sky: "neve", label: "Rovesci di neve" },
  86: { sky: "neve", label: "Rovesci di neve forti" },
  95: { sky: "temporale", label: "Temporale" },
  96: { sky: "temporale", label: "Temporale con grandine" },
  99: { sky: "temporale", label: "Temporale con grandine forte" },
};

export function describeWeather(code: number): { sky: Sky; label: string } {
  return WMO[code] ?? { sky: "nuvoloso", label: "Variabile" };
}

/* ------------------------------------------------------------------ */

/** "3.6" -> "3h 36m" leggibile senza decimali ambigui. */
export function formatHours(hours: number): { value: string; minutes: string } {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return { value: String(h), minutes: String(m).padStart(2, "0") };
}

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const GIORNI_BREVI = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

/**
 * Formatta una data "YYYY-MM-DD" senza passare da Date, che la
 * reinterpreterebbe nel fuso del browser e potrebbe spostarla di un giorno.
 */
export function formatDate(iso: string, todayIso: string, tomorrowIso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  // Costruita in UTC solo per ricavare il giorno della settimana.
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return {
    relative: iso === todayIso ? "Oggi" : iso === tomorrowIso ? "Domani" : null,
    weekday: GIORNI[weekday],
    weekdayShort: GIORNI_BREVI[weekday],
    dayMonth: `${d} ${MESI[m - 1]}`,
  };
}

/** Data "YYYY-MM-DD" corrente nel fuso della località. */
export function localDateIso(utcOffsetSeconds: number, now = new Date()): string {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Minuti trascorsi dalla mezzanotte locale della località. */
export function localMinutes(utcOffsetSeconds: number, now = new Date()): number {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** "06:38" -> 398 */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
