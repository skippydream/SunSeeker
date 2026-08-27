import type { NextConfig } from "next";

/**
 * Il sito viene pubblicato su GitHub Pages, che serve solo file statici: da qui
 * `output: "export"` e l'assenza di route API (le previsioni si chiedono a
 * Open-Meteo dal browser, vedi lib/forecast.ts).
 *
 * Su Pages il sito vive in una sottocartella (/SunSeeker), mentre in sviluppo
 * sta alla radice: il prefisso arriva dalla variabile che imposta la workflow.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
