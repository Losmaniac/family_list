import { describe, expect, it } from "vitest";
import {
  buildForecastUrl,
  buildGeocodingUrl,
  OPEN_METEO_FORECAST_URL,
  OPEN_METEO_GEOCODING_URL,
  parseForecast,
  parseGeocodedPlaces,
  weatherCodeInfo,
} from "./open-meteo";

describe("buildGeocodingUrl", () => {
  it("builds a search URL with the query and Czech language", () => {
    const url = buildGeocodingUrl("Praha");
    expect(url).toContain(OPEN_METEO_GEOCODING_URL);
    expect(url).toContain("name=Praha");
    expect(url).toContain("language=cs");
  });
});

describe("buildForecastUrl", () => {
  it("builds a forecast URL with the given coordinates", () => {
    const url = buildForecastUrl(50.0755, 14.4378);
    expect(url).toContain(OPEN_METEO_FORECAST_URL);
    expect(url).toContain("latitude=50.0755");
    expect(url).toContain("longitude=14.4378");
    expect(url).toContain("timezone=auto");
  });
});

describe("parseGeocodedPlaces", () => {
  it("keeps only well-formed places", () => {
    const places = parseGeocodedPlaces([
      { id: 1, name: "Praha", country: "Česko", admin1: "Hlavní město Praha", latitude: 50.08, longitude: 14.43 },
      { id: 2, name: "No coords" },
      { name: "No id", latitude: 1, longitude: 2 },
    ]);
    expect(places).toEqual([
      { id: 1, name: "Praha", country: "Česko", admin1: "Hlavní město Praha", latitude: 50.08, longitude: 14.43 },
    ]);
  });
});

describe("parseForecast", () => {
  it("parses current conditions and the daily forecast", () => {
    const forecast = parseForecast({
      current: { temperature_2m: 21.5, weather_code: 1, relative_humidity_2m: 55, wind_speed_10m: 12 },
      daily: {
        time: ["2026-08-09", "2026-08-10"],
        temperature_2m_max: [25, 27],
        temperature_2m_min: [15, 16],
        weather_code: [1, 3],
      },
    });
    expect(forecast).toEqual({
      current: { temperature: 21.5, weatherCode: 1, humidity: 55, windSpeed: 12 },
      daily: [
        { date: "2026-08-09", max: 25, min: 15, weatherCode: 1 },
        { date: "2026-08-10", max: 27, min: 16, weatherCode: 3 },
      ],
    });
  });

  it("returns null when there is no current-conditions block", () => {
    expect(parseForecast({})).toBeNull();
  });

  it("defaults a missing daily block to an empty forecast", () => {
    expect(parseForecast({ current: { temperature_2m: 10 } })?.daily).toEqual([]);
  });
});

describe("weatherCodeInfo", () => {
  it("maps clear sky", () => {
    expect(weatherCodeInfo(0).label).toBe("Jasno");
  });

  it("maps rain codes", () => {
    expect(weatherCodeInfo(63).label).toBe("Déšť");
  });

  it("maps thunderstorm codes", () => {
    expect(weatherCodeInfo(95).label).toBe("Bouřka");
  });

  it("falls back for an unknown code", () => {
    expect(weatherCodeInfo(999).label).toBe("Počasí");
  });
});
