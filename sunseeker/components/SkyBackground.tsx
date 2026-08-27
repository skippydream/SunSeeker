"use client";

import { useMemo } from "react";
import type { SkyTheme } from "@/lib/sun";

/**
 * Stelle generate una volta sola con un seed fisso: posizioni stabili fra
 * render e fra server e client, senza Math.random().
 */
function makeStars(count: number) {
  let seed = 20260827;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const r = random();
    return {
      left: `${random() * 100}%`,
      // Concentrate in alto: verso l'orizzonte il cielo resta più chiaro.
      top: `${random() * 68}%`,
      size: r < 0.86 ? 1.5 : 2.5,
      delay: `${random() * 4}s`,
      duration: `${3 + random() * 4}s`,
      base: 0.35 + random() * 0.65,
    };
  });
}

const STARS = makeStars(110);

interface Props {
  theme: SkyTheme;
  /** Posizione orizzontale del sole, 0 = alba, 1 = tramonto. */
  sunX: number;
  /** Altezza del sole sull'orizzonte, in gradi. */
  elevation: number;
  /** Nuvolosità corrente 0-100: comanda il velo di nubi. */
  cloudCover: number;
}

export default function SkyBackground({ theme, sunX, elevation, cloudCover }: Props) {
  // Il bagliore segue il sole: orizzontalmente lungo l'arco, verticalmente
  // secondo l'elevazione reale, così al tramonto si schiaccia sull'orizzonte.
  const glowLeft = 8 + sunX * 84;
  const glowTop = 88 - Math.max(-6, Math.min(70, elevation)) * 0.95;

  const veil = useMemo(() => Math.min(0.5, (cloudCover / 100) * 0.5), [cloudCover]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Sfumatura del cielo */}
      <div
        className="absolute inset-0 transition-[--sky-top,--sky-mid,--sky-bottom] duration-[1600ms] ease-out"
        style={
          {
            "--sky-top": theme.top,
            "--sky-mid": theme.mid,
            "--sky-bottom": theme.bottom,
            background:
              "linear-gradient(180deg, var(--sky-top) 0%, var(--sky-mid) 52%, var(--sky-bottom) 100%)",
          } as React.CSSProperties
        }
      />

      {/* Stelle */}
      <div
        className="absolute inset-0 transition-opacity duration-[2000ms]"
        style={{ opacity: theme.starOpacity }}
      >
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white animate-twinkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.base,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>

      {/* Bagliore solare */}
      <div
        className="absolute h-[110vmax] w-[110vmax] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[1600ms] ease-out"
        style={{
          left: `${glowLeft}%`,
          top: `${glowTop}%`,
          opacity: 0.10 + theme.daylight * 0.28,
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 55%)`,
        }}
      />

      {/* Velo di nubi: densità proporzionale alla nuvolosità dell'ora corrente */}
      <div className="absolute inset-0" style={{ opacity: veil }}>
        <div className="absolute -left-[10%] top-[12%] h-[42vmax] w-[70vmax] rounded-full bg-white/40 blur-[90px] animate-drift" />
        <div
          className="absolute right-[-15%] top-[34%] h-[34vmax] w-[60vmax] rounded-full bg-white/30 blur-[100px] animate-drift"
          style={{ animationDelay: "-8s" }}
        />
        <div
          className="absolute left-[22%] top-[2%] h-[26vmax] w-[48vmax] rounded-full bg-white/25 blur-[80px] animate-drift"
          style={{ animationDelay: "-16s" }}
        />
      </div>

      {/* Velo scuro proporzionale alla luce del giorno. Senza, il testo bianco
          sul cielo azzurro di mezzogiorno scende sotto il rapporto 4.5:1. */}
      <div
        className="absolute inset-0 transition-opacity duration-[1600ms]"
        style={{
          background:
            "linear-gradient(180deg, rgb(3 8 18 / 0.55) 0%, rgb(3 8 18 / 0.30) 38%, rgb(3 8 18 / 0.42) 100%)",
          opacity: 0.25 + theme.daylight * 0.75,
        }}
      />

      {/* Foschia all'orizzonte + scurimento in basso, per staccare il contenuto */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950/85 via-ink-950/25 to-transparent" />
    </div>
  );
}
