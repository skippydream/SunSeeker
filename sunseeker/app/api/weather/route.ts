import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") || "45.4642";  // Milano default
  const lon = searchParams.get("lon") || "9.19";

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset,cloudcover_mean&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();

  // calcolo ore di sole
  const result = data.daily.time.map((date: string, i: number) => {
    const sunrise = new Date(data.daily.sunrise[i]);
    const sunset = new Date(data.daily.sunset[i]);

    const daylightHours =
      (sunset.getTime() - sunrise.getTime()) / 1000 / 3600;

    const cloud = data.daily.cloudcover_mean[i];
    const sunHours = daylightHours * (1 - cloud / 100);

    return {
      date,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      cloudcover: cloud,
      daylightHours: daylightHours.toFixed(1),
      sunHours: sunHours.toFixed(1),
    };
  });

  return NextResponse.json(result);
}
