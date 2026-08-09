/**
 * Client-side helpers for the free, keyless Open-Meteo API
 * (open-meteo.com) — geocoding (city name -> coordinates) and weather
 * forecasts, CORS-enabled for direct browser fetches. Only URL building
 * and response-shaping live here (pure, testable); the actual fetch()
 * calls happen in the /weather page itself, same split as
 * radio-browser.ts and iptv-org.ts.
 */

export const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface GeocodedPlace {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export function buildGeocodingUrl(query: string): string {
  const params = new URLSearchParams({ name: query, count: "8", language: "cs", format: "json" });
  return `${OPEN_METEO_GEOCODING_URL}?${params.toString()}`;
}

interface RawPlace {
  id?: number;
  name?: string;
  country?: string;
  admin1?: string;
  latitude?: number;
  longitude?: number;
}

export function parseGeocodedPlaces(raw: RawPlace[]): GeocodedPlace[] {
  return raw
    .filter((p) => typeof p.id === "number" && typeof p.name === "string" && typeof p.latitude === "number" && typeof p.longitude === "number")
    .map((p) => ({
      id: p.id as number,
      name: p.name as string,
      country: p.country ?? "",
      admin1: p.admin1,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
    }));
}

export function buildForecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,weather_code",
    timezone: "auto",
    forecast_days: "5",
  });
  return `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
}

export interface WeatherNow {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
}

export interface DailyForecastDay {
  date: string;
  max: number;
  min: number;
  weatherCode: number;
}

export interface WeatherForecast {
  current: WeatherNow;
  daily: DailyForecastDay[];
}

interface RawForecastResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
  };
}

export function parseForecast(raw: RawForecastResponse): WeatherForecast | null {
  if (!raw.current) return null;
  const time = raw.daily?.time ?? [];
  const daily: DailyForecastDay[] = time.map((date, i) => ({
    date,
    max: raw.daily?.temperature_2m_max?.[i] ?? 0,
    min: raw.daily?.temperature_2m_min?.[i] ?? 0,
    weatherCode: raw.daily?.weather_code?.[i] ?? 0,
  }));

  return {
    current: {
      temperature: raw.current.temperature_2m ?? 0,
      weatherCode: raw.current.weather_code ?? 0,
      humidity: raw.current.relative_humidity_2m ?? 0,
      windSpeed: raw.current.wind_speed_10m ?? 0,
    },
    daily,
  };
}

/** WMO weather code -> emoji + Czech label, per Open-Meteo's standard code table. */
export function weatherCodeInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Jasno" };
  if ([1, 2, 3].includes(code)) return { icon: "⛅", label: "Polojasno" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Mlha" };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: "🌦️", label: "Mrholení" };
  if ([61, 63, 65, 66, 67].includes(code)) return { icon: "🌧️", label: "Déšť" };
  if ([71, 73, 75, 77].includes(code)) return { icon: "🌨️", label: "Sníh" };
  if ([80, 81, 82].includes(code)) return { icon: "🌧️", label: "Přeháňky" };
  if ([85, 86].includes(code)) return { icon: "🌨️", label: "Sněhové přeháňky" };
  if ([95, 96, 99].includes(code)) return { icon: "⛈️", label: "Bouřka" };
  return { icon: "🌡️", label: "Počasí" };
}
