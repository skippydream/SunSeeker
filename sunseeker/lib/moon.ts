/**
 * Posizione e fase della luna.
 *
 * Come per il sole, calcoliamo tutto in locale: open-meteo non espone dati
 * lunari e non vale la pena aggiungere un servizio esterno per qualcosa che
 * è pura astronomia. Le formule sono quelle a bassa precisione di Meeus
 * (errore di pochi primi d'arco: irrilevante per orari al minuto).
 */

const RAD = Math.PI / 180;
const OBLIQUITY = 23.4397 * RAD; // inclinazione dell'eclittica
const J2000 = 2_451_545;
const SYNODIC_MONTH = 29.530588853; // giorni fra due lune nuove

const { sin, cos, tan, asin, atan2, acos, PI } = Math;

/** Giorni dall'epoca J2000. */
function daysSinceJ2000(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5 - J2000;
}

const rightAscension = (l: number, b: number) =>
  atan2(sin(l) * cos(OBLIQUITY) - tan(b) * sin(OBLIQUITY), cos(l));
const declination = (l: number, b: number) =>
  asin(sin(b) * cos(OBLIQUITY) + cos(b) * sin(OBLIQUITY) * sin(l));
const siderealTime = (d: number, westLongitude: number) =>
  RAD * (280.16 + 360.9856235 * d) - westLongitude;

interface EquatorialCoords {
  ra: number;
  dec: number;
  /** Distanza in km (solo per la luna). */
  distance: number;
}

function sunCoords(d: number): EquatorialCoords {
  const meanAnomaly = RAD * (357.5291 + 0.98560028 * d);
  const center =
    RAD * (1.9148 * sin(meanAnomaly) + 0.02 * sin(2 * meanAnomaly) + 0.0003 * sin(3 * meanAnomaly));
  const eclipticLongitude = meanAnomaly + center + RAD * 102.9372 + PI;

  return {
    ra: rightAscension(eclipticLongitude, 0),
    dec: declination(eclipticLongitude, 0),
    distance: 149_598_000,
  };
}

function moonCoords(d: number): EquatorialCoords {
  const eclipticLongitude = RAD * (218.316 + 13.176396 * d);
  const meanAnomaly = RAD * (134.963 + 13.064993 * d);
  const meanDistance = RAD * (93.272 + 13.2293535 * d);

  const longitude = eclipticLongitude + RAD * 6.289 * sin(meanAnomaly);
  const latitude = RAD * 5.128 * sin(meanDistance);
  const distance = 385_001 - 20_905 * cos(meanAnomaly);

  return {
    ra: rightAscension(longitude, latitude),
    dec: declination(longitude, latitude),
    distance,
  };
}

/* ------------------------------------------------------------------ */
/* Fase                                                                 */
/* ------------------------------------------------------------------ */

export interface MoonIllumination {
  /** Frazione del disco illuminata, 0-1. */
  fraction: number;
  /** 0 = luna nuova, 0.25 primo quarto, 0.5 piena, 0.75 ultimo quarto. */
  phase: number;
  /** Angolo dell'asse dei corni; il segno dice se cresce o cala. */
  angle: number;
  /** Distanza Terra-Luna in km. */
  distance: number;
}

export function moonIllumination(date: Date): MoonIllumination {
  const d = daysSinceJ2000(date);
  const sun = sunCoords(d);
  const moon = moonCoords(d);

  // Elongazione geocentrica fra sole e luna
  const elongation = acos(
    sin(sun.dec) * sin(moon.dec) + cos(sun.dec) * cos(moon.dec) * cos(sun.ra - moon.ra)
  );
  // Angolo di fase visto dalla luna. Serve atan2 e non atan: vicino alla luna
  // nuova il denominatore è negativo e l'angolo sta nel secondo quadrante,
  // che atan da solo non sa distinguere.
  const phaseAngle = atan2(
    sun.distance * sin(elongation),
    moon.distance - sun.distance * cos(elongation)
  );
  const angle = atan2(
    cos(sun.dec) * sin(sun.ra - moon.ra),
    sin(sun.dec) * cos(moon.dec) - cos(sun.dec) * sin(moon.dec) * cos(sun.ra - moon.ra)
  );

  return {
    fraction: (1 + cos(phaseAngle)) / 2,
    phase: 0.5 + (0.5 * phaseAngle * (angle < 0 ? -1 : 1)) / PI,
    angle,
    distance: moon.distance,
  };
}

export type MoonPhaseName =
  | "Luna nuova"
  | "Falce crescente"
  | "Primo quarto"
  | "Gibbosa crescente"
  | "Luna piena"
  | "Gibbosa calante"
  | "Ultimo quarto"
  | "Falce calante";

export function moonPhaseName(phase: number): MoonPhaseName {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.02 || p >= 0.98) return "Luna nuova";
  if (p < 0.23) return "Falce crescente";
  if (p < 0.27) return "Primo quarto";
  if (p < 0.48) return "Gibbosa crescente";
  if (p < 0.52) return "Luna piena";
  if (p < 0.73) return "Gibbosa calante";
  if (p < 0.77) return "Ultimo quarto";
  return "Falce calante";
}

/** Giorni trascorsi dall'ultima luna nuova. */
export const moonAge = (phase: number) => phase * SYNODIC_MONTH;

/**
 * Prossimo istante in cui la fase vale `target` (0 = nuova, 0.5 = piena).
 * Si parte dalla durata media del mese sinodico e si raffina sulla fase vera,
 * che per via dell'orbita ellittica può scostarsi di diverse ore.
 */
export function nextPhase(from: Date, target: number): Date {
  const current = moonIllumination(from).phase;
  let delta = (((target - current) % 1) + 1) % 1;
  if (delta < 0.01) delta += 1;

  let time = from.getTime() + delta * SYNODIC_MONTH * 86_400_000;
  for (let i = 0; i < 5; i++) {
    const phase = moonIllumination(new Date(time)).phase;
    // Distanza con segno più corta sul cerchio delle fasi
    const diff = ((((target - phase) % 1) + 1.5) % 1) - 0.5;
    time += diff * SYNODIC_MONTH * 86_400_000;
  }
  return new Date(time);
}

/* ------------------------------------------------------------------ */
/* Altezza sull'orizzonte e orari                                       */
/* ------------------------------------------------------------------ */

/** Altezza della luna in gradi, corretta per rifrazione. */
export function moonAltitude(date: Date, lat: number, lon: number): number {
  const d = daysSinceJ2000(date);
  const moon = moonCoords(d);
  const westLongitude = RAD * -lon;
  const phi = RAD * lat;
  const hourAngle = siderealTime(d, westLongitude) - moon.ra;

  let altitude = asin(sin(phi) * sin(moon.dec) + cos(phi) * cos(moon.dec) * cos(hourAngle));
  altitude += refraction(altitude);
  return altitude / RAD;
}

function refraction(altitude: number): number {
  const h = Math.max(altitude, 0);
  return 0.0002967 / tan(h + 0.00312536 / (h + 0.08901179));
}

export interface MoonTimes {
  /** Minuti dalla mezzanotte locale; null se l'evento non accade quel giorno. */
  rise: number | null;
  set: number | null;
  /** Vero se la luna resta tutto il giorno sopra o sotto l'orizzonte. */
  alwaysUp: boolean;
  alwaysDown: boolean;
}

/**
 * Sorgere e tramontare cercando gli attraversamenti dell'orizzonte lungo la
 * giornata locale. Non sempre ci sono: la luna slitta di ~50 minuti al giorno,
 * quindi certi giorni non sorge (o non tramonta) affatto.
 */
export function moonTimes(
  dateIso: string,
  lat: number,
  lon: number,
  utcOffsetSeconds: number
): MoonTimes {
  const localMidnightUtc = Date.parse(`${dateIso}T00:00:00Z`) - utcOffsetSeconds * 1000;
  const HORIZON = 0.125; // gradi: tiene conto di parallasse e semidiametro
  const STEP = 5; // minuti

  let rise: number | null = null;
  let set: number | null = null;
  let previous = moonAltitude(new Date(localMidnightUtc), lat, lon) - HORIZON;
  const first = previous;
  let everUp = previous > 0;
  let everDown = previous <= 0;

  for (let m = STEP; m <= 1440; m += STEP) {
    const current = moonAltitude(new Date(localMidnightUtc + m * 60_000), lat, lon) - HORIZON;
    if (current > 0) everUp = true;
    else everDown = true;

    if (previous <= 0 && current > 0 && rise === null) {
      rise = Math.round(m - STEP + (STEP * -previous) / (current - previous));
    }
    if (previous > 0 && current <= 0 && set === null) {
      set = Math.round(m - STEP + (STEP * previous) / (previous - current));
    }
    previous = current;
  }

  return {
    rise,
    set,
    alwaysUp: !everDown && first > 0,
    alwaysDown: !everUp,
  };
}
