/**
 * Posizione solare (algoritmo NOAA) e palette del cielo.
 *
 * Serve per far corrispondere lo sfondo dell'app al cielo reale della località
 * mostrata: non usiamo l'ora del browser ma l'elevazione del sole calcolata su
 * latitudine, longitudine e istante UTC.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SolarPosition {
  /** Altezza del sole sull'orizzonte, in gradi (negativa = sotto l'orizzonte). */
  elevation: number;
  /** Azimut in gradi da nord, senso orario. */
  azimuth: number;
  /** Declinazione solare in gradi. */
  declination: number;
}

export function solarPosition(date: Date, lat: number, lon: number): SolarPosition {
  const julianDay = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (julianDay - 2_451_545) / 36_525; // secoli giuliani da J2000

  const meanLong = (280.46646 + t * (36_000.76983 + t * 0.0003032)) % 360;
  const meanAnom = 357.52911 + t * (35_999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const center =
    Math.sin(meanAnom * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnom * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnom * RAD) * 0.000289;

  const omega = 125.04 - 1934.136 * t;
  const appLong = meanLong + center - 0.00569 - 0.00478 * Math.sin(omega * RAD);

  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);

  const declination =
    Math.asin(Math.sin(obliquity * RAD) * Math.sin(appLong * RAD)) * DEG;

  // Equazione del tempo, in minuti
  const y = Math.tan((obliquity / 2) * RAD) ** 2;
  const eqTime =
    4 *
    DEG *
    (y * Math.sin(2 * meanLong * RAD) -
      2 * eccentricity * Math.sin(meanAnom * RAD) +
      4 * eccentricity * y * Math.sin(meanAnom * RAD) * Math.cos(2 * meanLong * RAD) -
      0.5 * y * y * Math.sin(4 * meanLong * RAD) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnom * RAD));

  const utcMinutes =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = (utcMinutes + eqTime + 4 * lon + 1440) % 1440;

  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const cosZenith =
    Math.sin(lat * RAD) * Math.sin(declination * RAD) +
    Math.cos(lat * RAD) * Math.cos(declination * RAD) * Math.cos(hourAngle * RAD);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) * DEG;

  const elevation = 90 - zenith - refraction(90 - zenith);

  // Azimut da nord, senso orario (forma NOAA)
  const denom = Math.cos(lat * RAD) * Math.sin(zenith * RAD);
  let azimuth = lat > 0 ? 180 : 0;
  if (Math.abs(denom) > 1e-6) {
    const cosAz =
      (Math.sin(lat * RAD) * Math.cos(zenith * RAD) - Math.sin(declination * RAD)) / denom;
    const acos = Math.acos(Math.min(1, Math.max(-1, cosAz))) * DEG;
    azimuth = hourAngle > 0 ? (acos + 180) % 360 : (540 - acos) % 360;
  }

  return { elevation, azimuth, declination };
}

/** Rifrazione atmosferica: il sole appare più alto di quanto sia davvero. */
function refraction(elevation: number): number {
  if (elevation > 85) return 0;
  const te = Math.tan(elevation * RAD);
  let correction: number;
  if (elevation > 5) {
    correction = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  } else if (elevation > -0.575) {
    correction =
      1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  } else {
    correction = -20.774 / te;
  }
  return -correction / 3600;
}

/* ------------------------------------------------------------------ */
/* Palette del cielo                                                    */
/* ------------------------------------------------------------------ */

type Rgb = [number, number, number];
/** [alto, mezzo, basso] della sfumatura verticale del cielo. */
type SkyStop = { elevation: number; colors: [Rgb, Rgb, Rgb] };

const hex = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const SKY_STOPS: SkyStop[] = [
  { elevation: -18, colors: [hex("#02040e"), hex("#050a1b"), hex("#0a1226")] }, // notte
  { elevation: -10, colors: [hex("#04091f"), hex("#0d1236"), hex("#1b1c45")] }, // nautico
  { elevation: -5, colors: [hex("#0b1233"), hex("#2a1c50"), hex("#5c2a54")] },  // civile
  { elevation: -1, colors: [hex("#152046"), hex("#5b2f63"), hex("#c25a4e")] },  // orizzonte
  { elevation: 4, colors: [hex("#1c3a7a"), hex("#8a5a76"), hex("#f0a05a")] },   // golden hour
  { elevation: 12, colors: [hex("#14539f"), hex("#3f8fd6"), hex("#9cc6e4")] },  // mattino
  { elevation: 30, colors: [hex("#0d4ea8"), hex("#2b83d6"), hex("#79bde8")] },  // giorno
  { elevation: 60, colors: [hex("#083b96"), hex("#1b6fcc"), hex("#5aa9e2")] },  // zenit
];

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mixRgb = (a: Rgb, b: Rgb, k: number): Rgb => [
  Math.round(lerp(a[0], b[0], k)),
  Math.round(lerp(a[1], b[1], k)),
  Math.round(lerp(a[2], b[2], k)),
];
const css = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

export interface SkyTheme {
  top: string;
  mid: string;
  bottom: string;
  /** Colore del bagliore attorno al sole. */
  glow: string;
  /** 0 = notte fonda, 1 = pieno giorno. Guida stelle e intensità del bagliore. */
  daylight: number;
  /** 0 = nessuna stella, 1 = cielo stellato. */
  starOpacity: number;
  phase: SkyPhase;
  label: string;
}

export type SkyPhase = "notte" | "alba" | "mattino" | "giorno" | "oradoro" | "tramonto" | "crepuscolo";

export function skyTheme(elevation: number, rising: boolean): SkyTheme {
  const stops = SKY_STOPS;
  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (elevation >= stops[i].elevation && elevation <= stops[i + 1].elevation) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  if (elevation < stops[0].elevation) lower = upper = stops[0];
  if (elevation > stops[stops.length - 1].elevation) lower = upper = stops[stops.length - 1];

  const span = upper.elevation - lower.elevation;
  const k = span === 0 ? 0 : (elevation - lower.elevation) / span;

  const top = mixRgb(lower.colors[0], upper.colors[0], k);
  const mid = mixRgb(lower.colors[1], upper.colors[1], k);
  const bottom = mixRgb(lower.colors[2], upper.colors[2], k);

  const daylight = clamp01((elevation + 12) / 24);
  const starOpacity = clamp01((-elevation - 2) / 10);

  // Il bagliore vira dal bianco-azzurro del mezzogiorno all'arancio radente
  const glowWarm = hex("#ff9d4d");
  const glowCool = hex("#ffefc4");
  const warmth = clamp01(1 - elevation / 25);
  const glow = mixRgb(glowCool, glowWarm, warmth);

  return {
    top: css(top),
    mid: css(mid),
    bottom: css(bottom),
    glow: css(glow),
    daylight,
    starOpacity,
    ...phaseOf(elevation, rising),
  };
}

function phaseOf(elevation: number, rising: boolean): { phase: SkyPhase; label: string } {
  if (elevation < -12) return { phase: "notte", label: "Notte" };
  if (elevation < -0.833)
    return rising
      ? { phase: "alba", label: "Prima dell'alba" }
      : { phase: "crepuscolo", label: "Crepuscolo" };
  if (elevation < 6)
    return rising
      ? { phase: "alba", label: "Alba" }
      : { phase: "tramonto", label: "Tramonto" };
  if (elevation < 12) return { phase: "oradoro", label: "Golden hour" };
  if (rising) return { phase: "mattino", label: "Mattino" };
  return { phase: "giorno", label: "Pomeriggio" };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ */
/* Momenti della luce                                                   */
/* ------------------------------------------------------------------ */

export interface LightWindows {
  /** Minuti dalla mezzanotte locale; null se la soglia non viene mai attraversata. */
  goldenMorningEnd: number | null;
  goldenEveningStart: number | null;
  blueMorningStart: number | null;
  blueEveningEnd: number | null;
}

const GOLDEN_ELEVATION = 6; // sopra i 6° la luce smette di essere radente
const CIVIL_ELEVATION = -6; // fine del crepuscolo civile: l'ora blu

/**
 * Golden hour e ora blu, ricavate campionando l'elevazione solare lungo la
 * giornata locale. L'API dà alba e tramonto ma non queste soglie.
 */
export function lightWindows(
  dateIso: string,
  lat: number,
  lon: number,
  utcOffsetSeconds: number
): LightWindows {
  const localMidnightUtc = Date.parse(`${dateIso}T00:00:00Z`) - utcOffsetSeconds * 1000;
  const STEP = 2; // minuti

  const elevationAt = (minute: number) =>
    solarPosition(new Date(localMidnightUtc + minute * 60_000), lat, lon).elevation;

  const crossings = (threshold: number): { up: number | null; down: number | null } => {
    let up: number | null = null;
    let down: number | null = null;
    let previous = elevationAt(0);

    for (let m = STEP; m <= 1440; m += STEP) {
      const current = elevationAt(m);
      if (previous < threshold && current >= threshold && up === null) {
        up = m - STEP + (STEP * (threshold - previous)) / (current - previous);
      }
      if (previous >= threshold && current < threshold && up !== null && down === null) {
        down = m - STEP + (STEP * (previous - threshold)) / (previous - current);
      }
      previous = current;
    }
    return { up, down };
  };

  const golden = crossings(GOLDEN_ELEVATION);
  const civil = crossings(CIVIL_ELEVATION);

  return {
    goldenMorningEnd: golden.up === null ? null : Math.round(golden.up),
    goldenEveningStart: golden.down === null ? null : Math.round(golden.down),
    blueMorningStart: civil.up === null ? null : Math.round(civil.up),
    blueEveningEnd: civil.down === null ? null : Math.round(civil.down),
  };
}

/** 987 -> "16:27" */
export function minutesToClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
