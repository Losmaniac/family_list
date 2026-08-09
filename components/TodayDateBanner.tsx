"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Sunrise, Sunset } from "lucide-react";
import { parseDayInfo, SVATKY_API_URL, type DayInfo } from "@/lib/svatky-api";
import { buildSunriseSunsetUrl, FULNEK_COORDS, parseSunTimes, type SunTimes } from "@/lib/sunrise-sunset";
import { buildForecastUrl, parseForecast, weatherCodeInfo } from "@/lib/open-meteo";

/**
 * Today's date, who has their name day ("svátek"), sunrise/sunset, and the
 * current weather — all for Fulnek, CZ, at the very top of Dnes. Each
 * piece is fetched independently and just omitted if its call fails; this
 * is a nice-to-have banner, not core to the page, so no toasts/retries.
 */
export default function TodayDateBanner() {
  const [info, setInfo] = useState<DayInfo | null>(null);
  const [sun, setSun] = useState<SunTimes | null>(null);
  const [weather, setWeather] = useState<{ icon: string; label: string; temperature: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(SVATKY_API_URL);
        if (res.ok && !cancelled) setInfo(parseDayInfo(await res.json()));
      } catch {
        // Best-effort.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(buildSunriseSunsetUrl(FULNEK_COORDS.latitude, FULNEK_COORDS.longitude));
        if (res.ok && !cancelled) setSun(parseSunTimes(await res.json()));
      } catch {
        // Best-effort.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(buildForecastUrl(FULNEK_COORDS.latitude, FULNEK_COORDS.longitude));
        if (!res.ok) return;
        const forecast = parseForecast(await res.json());
        if (!forecast || cancelled) return;
        setWeather({ ...weatherCodeInfo(forecast.current.weatherCode), temperature: forecast.current.temperature });
      } catch {
        // Best-effort.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info && !sun && !weather) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
      {info && (
        <span className="flex items-center gap-1.5">
          <CalendarDays size={16} className="shrink-0" />
          {info.dayInWeek} {info.formattedDate}
          {info.name && <> · Svátek má {info.name}</>}
          {info.isHoliday && info.holidayName && <> · {info.holidayName}</>}
        </span>
      )}
      {weather && (
        <span className="flex items-center gap-1">
          {weather.icon} {Math.round(weather.temperature)}°C · Fulnek
        </span>
      )}
      {sun && (
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <Sunrise size={14} /> {sun.sunrise}
          </span>
          <span className="flex items-center gap-1">
            <Sunset size={14} /> {sun.sunset}
          </span>
        </span>
      )}
    </div>
  );
}
