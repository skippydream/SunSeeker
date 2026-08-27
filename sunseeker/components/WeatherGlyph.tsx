import type { Sky } from "@/lib/weather";

/** Icone disegnate a mano: le emoji rendono in modo diverso su ogni sistema. */
export default function WeatherGlyph({ sky, className = "" }: { sky: Sky; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  const cloud = <path d="M7 18h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 18Z" />;
  const rays = (
    <g opacity={0.9}>
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </g>
  );

  switch (sky) {
    case "sereno":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.2" />
          {rays}
        </svg>
      );
    case "poco-nuvoloso":
      return (
        <svg {...common}>
          <circle cx="9.5" cy="9" r="3.4" />
          <path d="M9.5 2.6v1.6M3.1 9h1.6M5 4.5l1.1 1.1M14 4.5l-1.1 1.1" opacity={0.85} />
          <path d="M10 19h7.5a3 3 0 0 0 .2-6 4.3 4.3 0 0 0-8.2 1 3 3 0 0 0 .5 5Z" />
        </svg>
      );
    case "nuvoloso":
      return (
        <svg {...common}>
          <circle cx="8.5" cy="8" r="3" opacity={0.85} />
          <path d="M10 19h7.5a3 3 0 0 0 .2-6 4.3 4.3 0 0 0-8.2 1 3 3 0 0 0 .5 5Z" />
        </svg>
      );
    case "coperto":
      return (
        <svg {...common}>
          <path d="M5 14h8.5a3.2 3.2 0 0 0 .2-6.4A4.6 4.6 0 0 0 5 8.7 2.7 2.7 0 0 0 5 14Z" opacity={0.6} />
          {cloud}
        </svg>
      );
    case "nebbia":
      return (
        <svg {...common}>
          <path d="M7 13h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 13Z" />
          <path d="M4 17h16M6 20.5h12" opacity={0.75} />
        </svg>
      );
    case "pioggia":
      return (
        <svg {...common}>
          <path d="M7 15h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 15Z" />
          <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
        </svg>
      );
    case "rovesci":
      return (
        <svg {...common}>
          <circle cx="8" cy="6.5" r="2.6" opacity={0.85} />
          <path d="M9 15h8a3.2 3.2 0 0 0 .2-6.4A4.6 4.6 0 0 0 8.6 9.6 2.8 2.8 0 0 0 9 15Z" />
          <path d="M11 18 9.6 21.2M15.4 18 14 21.2" />
        </svg>
      );
    case "neve":
      return (
        <svg {...common}>
          <path d="M7 14h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 14Z" />
          <path d="M9 18h.01M12.5 20h.01M16 18h.01M12.5 17h.01" strokeWidth={2.4} />
        </svg>
      );
    case "temporale":
      return (
        <svg {...common}>
          <path d="M7 14h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3.4 3.4 0 0 0 7 14Z" />
          <path d="m13 16-3 3.6h3.2L11.8 22.5" />
        </svg>
      );
  }
}
