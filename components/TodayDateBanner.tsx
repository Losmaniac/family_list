"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { parseDayInfo, SVATKY_API_URL, type DayInfo } from "@/lib/svatky-api";

/** Today's date + who has their name day ("svátek") — fetched from svatkyapi.cz, informational only, no XP. Silently shows nothing if the fetch fails; this is a nice-to-have, not core to the page. */
export default function TodayDateBanner() {
  const [info, setInfo] = useState<DayInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(SVATKY_API_URL);
        if (!res.ok) return;
        const parsed = parseDayInfo(await res.json());
        if (!cancelled) setInfo(parsed);
      } catch {
        // Best-effort — no toast, this is a small informational banner.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!info) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <CalendarDays size={16} className="shrink-0" />
      <span>
        {info.dayInWeek} {info.formattedDate}
        {info.name && <> · Svátek má {info.name}</>}
        {info.isHoliday && info.holidayName && <> · {info.holidayName}</>}
      </span>
    </div>
  );
}
