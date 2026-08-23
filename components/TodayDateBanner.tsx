"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Sunrise, Sunset } from "lucide-react";
import { buildSvatkyApiUrlForDate, parseDayInfo, SVATKY_API_URL, type DayInfo } from "@/lib/svatky-api";
import { buildSunriseSunsetUrl, FULNEK_COORDS, parseSunTimes, type SunTimes } from "@/lib/sunrise-sunset";
import { buildForecastUrl, parseForecast, weatherCodeInfo } from "@/lib/open-meteo";
import { addDays, dateKeyInFamilyZone } from "@/lib/date-utils";

interface DayWeather {
  icon: string;
  label: string;
  temperature: number;
}

interface TomorrowWeather {
  icon: string;
  label: string;
  min: number;
  max: number;
}

/**
 * Today's date, who has their name day ("svátek"), sunrise/sunset, and the
 * current weather — plus tomorrow's name day and forecast, so the family
 * can plan the evening before — all for Fulnek, CZ, at the very top of
 * Dnes. Each piece is fetched independently and just omitted if its call
 * fails; this is a nice-to-have banner, not core to the page, so no
 * toasts/retries.
 */
export default function TodayDateBanner() {
  const [info, setInfo] = useState<DayInfo | null>(null);
  const [tomorrowInfo, setTomorrowInfo] = useState<DayInfo | null>(null);
  const [sun, setSun] = useState<SunTimes | null>(null);
  const [weather, setWeather] = useState<DayWeather | null>(null);
  const [tomorrowWeather, setTomorrowWeather] = useState<TomorrowWeather | null>(null);

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
        const tomorrowKey = dateKeyInFamilyZone(addDays(new Date(), 1));
        const res = await fetch(buildSvatkyApiUrlForDate(tomorrowKey));
        if (res.ok && !cancelled) setTomorrowInfo(parseDayInfo(await res.json()));
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
        const tomorrowKey = dateKeyInFamilyZone(addDays(new Date(), 1));
        const tomorrow = forecast.daily.find((d) => d.date === tomorrowKey);
        if (tomorrow) {
          setTomorrowWeather({ ...weatherCodeInfo(tomorrow.weatherCode), min: tomorrow.min, max: tomorrow.max });
        }
      } catch {
        // Best-effort.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info && !sun && !weather && !tomorrowInfo && !tomorrowWeather) return null;

  return (
    <div className="flex flex-col gap-1 text-sm text-zinc-500">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
      {(tomorrowInfo || tomorrowWeather) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span>
            Zítra
            {tomorrowInfo?.name && <> · Svátek má {tomorrowInfo.name}</>}
            {tomorrowInfo?.isHoliday && tomorrowInfo.holidayName && <> · {tomorrowInfo.holidayName}</>}
          </span>
          {tomorrowWeather && (
            <span className="flex items-center gap-1">
              {tomorrowWeather.icon} {Math.round(tomorrowWeather.min)}–{Math.round(tomorrowWeather.max)}°C
            </span>
          )}
        </div>
      )}
    </div>
  );
}
