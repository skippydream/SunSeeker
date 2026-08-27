import { NextResponse } from "next/server";
import type { Place } from "@/lib/weather";

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) return NextResponse.json([]);

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}` +
    `&count=6&language=it&format=json`;

  try {
    const res = await fetch(url, { next: { revalidate: 86_400 } });
    if (!res.ok) return NextResponse.json([]);

    const data = await res.json();
    const places: Place[] = (data.results ?? []).map((r: GeocodingResult) => ({
      name: r.name,
      region: r.admin1,
      country: r.country,
      countryCode: r.country_code,
      latitude: r.latitude,
      longitude: r.longitude,
    }));

    return NextResponse.json(places);
  } catch {
    return NextResponse.json([]);
  }
}
