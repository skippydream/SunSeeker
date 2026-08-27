"use client";

import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "@/lib/forecast";
import type { Place } from "@/lib/weather";

interface Props {
  current: string;
  subtitle?: string;
  onSelect: (place: Place) => void;
  onUseMyLocation: () => void;
  geolocationBusy: boolean;
}

export default function LocationSearch({
  current,
  subtitle,
  onSelect,
  onUseMyLocation,
  geolocationBusy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Chiusura su clic esterno / Esc
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Ricerca con debounce; le risposte in ritardo vengono annullate.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // svuotare la lista tocca a onChange, non all'effetto

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchPlaces(q, controller.signal));
        setActive(0);
      } catch {
        // richiesta annullata o rete assente: la tendina resta com'è
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choose = (place: Place) => {
    onSelect(place);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex cursor-pointer items-center gap-2.5 rounded-full bg-white/10 px-4 py-2 text-left backdrop-blur-md transition hover:bg-white/16"
        >
          <PinIcon className="size-4 shrink-0 text-white/70" />
          <span className="text-[15px] font-medium text-white text-glow">{current}</span>
          {subtitle && <span className="hidden text-[13px] text-white/55 sm:inline">{subtitle}</span>}
          <SearchIcon className="size-3.5 shrink-0 text-white/45 transition group-hover:text-white/80" />
        </button>
      ) : (
        <div className="w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl bg-ink-850/92 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <SearchIcon className="size-4 shrink-0 text-white/45" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (value.trim().length < 2) {
                  setResults([]);
                  setLoading(false);
                }
              }}
              onKeyDown={onKeyDown}
              placeholder="Cerca una città…"
              aria-label="Cerca una città"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
            />
            {loading && <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />}
          </div>

          {results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto border-t border-white/8 py-1">
              {/* Il geocoding può restituire più voci con le stesse coordinate
                  (Singapore città e Singapore stato): l'indice le distingue. */}
              {results.map((place, i) => (
                <li key={`${place.name}-${place.latitude},${place.longitude}-${i}`}>
                  <button
                    type="button"
                    onClick={() => choose(place)}
                    onPointerEnter={() => setActive(i)}
                    className={`flex w-full cursor-pointer items-baseline gap-2 px-4 py-2.5 text-left transition ${
                      i === active ? "bg-white/10" : ""
                    }`}
                  >
                    <span className="text-[15px] text-white">{place.name}</span>
                    <span className="truncate text-[13px] text-white/45">
                      {[place.region, place.country].filter(Boolean).join(", ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length >= 2 && !loading && results.length === 0 && (
            <p className="border-t border-white/8 px-4 py-3 text-[13px] text-white/45">
              Nessuna località trovata.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              onUseMyLocation();
              setOpen(false);
            }}
            disabled={geolocationBusy}
            className="flex w-full cursor-pointer items-center gap-2.5 border-t border-white/8 px-4 py-3 text-left text-[14px] text-white/75 transition hover:bg-white/8 disabled:opacity-50"
          >
            <PinIcon className="size-4 shrink-0" />
            {geolocationBusy ? "Cerco la tua posizione…" : "Usa la mia posizione"}
          </button>
        </div>
      )}
    </div>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className={className} aria-hidden>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
