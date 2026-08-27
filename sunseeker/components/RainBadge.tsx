import { formatMillimetres, rainLabel, type RainLevel } from "@/lib/weather";

export function DropIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.6c3.4 4 6.2 7.4 6.2 10.8a6.2 6.2 0 1 1-12.4 0C5.8 10 8.6 6.6 12 2.6Z" />
    </svg>
  );
}

/**
 * Etichetta della pioggia. Sui giorni davvero bagnati diventa piena e opaca:
 * deve battere le ore di sole nella gerarchia visiva della riga.
 */
export function RainBadge({
  level,
  millimetres,
  uncertain = false,
  title,
  className = "",
}: {
  level: RainLevel;
  millimetres: number;
  /** I modelli non concordano: il contorno tratteggiato lo dice senza un secondo chip. */
  uncertain?: boolean;
  title?: string;
  className?: string;
}) {
  if (level === "asciutto" && !uncertain) return null;

  const strong = level === "pioggia" || level === "forte";
  const measured = millimetres >= 0.1;

  // Giornata data per asciutta ma contesa fra i modelli
  if (level === "asciutto") {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1 rounded-full border border-dashed border-white/25 px-1.5 py-0.5 text-[11px] leading-none text-white/50 ${className}`}
      >
        pioggia incerta
      </span>
    );
  }

  return (
    <span
      title={title ?? rainLabel(level)}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
        strong ? "bg-sky-400/25 font-medium text-sky-100" : "bg-sky-400/12 text-sky-200/80"
      } ${uncertain ? "border border-dashed border-sky-200/45" : ""} ${className}`}
    >
      <DropIcon className="size-2.5 shrink-0" />
      {measured ? formatMillimetres(millimetres) : "possibile"}
    </span>
  );
}

