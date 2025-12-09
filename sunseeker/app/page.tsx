"use client";

import { useEffect, useState } from "react";
import SunCard from "../components/SunCard";
import { motion } from "framer-motion";

export default function Home() {
  const [data, setData] = useState([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
        const d = await res.json();
        setData(d);
      },
      async () => {
        const res = await fetch(`/api/weather`);
        const d = await res.json();
        setData(d);
      }
    );
  }, []);

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col items-center px-6 py-24">
      
      {/* HERO */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center max-w-2xl text-4xl mb-20"
      >
        <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight leading-tight text-balance">
          ☀️ Sun Seeker
        </h1>

        <p className="mt-5 text-neutral-600 text-lg md:text-xl text-balance max-w-xl">
         Quanto sole c'è, oggi e nei prossimi giorni, con dati aggiornati automaticamente.
        </p>
      </motion.div>

      {/* GRID */}
      <div className="w-full max-w-5xl grid sm:grid-cols-2 lg:grid-cols-3 gap-10 place-items-center">
        {data.map((day, i) => (
          <SunCard key={i} day={day} />
        ))}
      </div>

      {/* Footer minimal */}
      <div className="mt-20 mb-8 text-neutral-500 text-sm text-center">
        creato in giorni di ☔️
      </div>

    </main>
  );
}
