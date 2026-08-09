"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, ScanLine, Search, Utensils, X } from "lucide-react";
import { useToast } from "@/lib/toast-context";
import {
  buildBarcodeLookupUrl,
  buildFoodSearchUrl,
  parseBarcodeLookup,
  parseFoodSearchResults,
  type FoodProduct,
} from "@/lib/open-food-facts";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

const NUTRISCORE_COLORS: Record<string, string> = {
  A: "bg-green-600",
  B: "bg-lime-600",
  C: "bg-yellow-500",
  D: "bg-orange-500",
  E: "bg-red-600",
};

const SCAN_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/** Informational-only food/nutrition lookup (no XP) — Open Food Facts search, by name or barcode. */
export default function FoodFactsExplorer() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Feature-detected, not assumed — BarcodeDetector ships in Chrome/Edge and
  // Safari 17+, but not every browser this PWA might run in.
  const [scanSupported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopScan() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => stopScan, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(buildFoodSearchUrl(query.trim()));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProducts(parseFoodSearchResults(await res.json()));
    } catch (err) {
      toast.error(describeError(err, "Potraviny se nepodařilo najít."));
    } finally {
      setLoading(false);
    }
  }

  async function handleBarcodeLookup(code: string) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(buildBarcodeLookupUrl(code));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const product = parseBarcodeLookup(await res.json());
      setProducts(product ? [product] : []);
      if (!product) toast.error("Tenhle čárový kód se v databázi nenašel.");
    } catch (err) {
      toast.error(describeError(err, "Potraviny se nepodařilo najít."));
    } finally {
      setLoading(false);
    }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (barcode.trim()) handleBarcodeLookup(barcode.trim());
  }

  async function startScan() {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("no video element");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new BarcodeDetector({ formats: SCAN_FORMATS });
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const [detected] = await detector.detect(videoRef.current);
          if (detected) {
            stopScan();
            handleBarcodeLookup(detected.rawValue);
            return;
          }
        } catch {
          // A frame not being ready yet is routine — just try the next one.
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      toast.error("Kameru se nepodařilo spustit — zkontroluj oprávnění.");
      stopScan();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Vyhledej potravinu jménem nebo čárovým kódem a podívej se na její výživové údaje. Databáze je celosvětová a
        česká zboží tam jsou, ale ne úplně všechna — jde o produkty, které tam někdo nahrál.
      </p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Např. jogurt"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
        >
          <Search size={16} /> Hledat
        </button>
      </form>

      <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Nebo zadej čárový kód"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-4 py-2"
        />
        <button
          type="submit"
          disabled={loading || !barcode.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          <Barcode size={16} /> Najít
        </button>
        {scanSupported && (
          <button
            type="button"
            onClick={startScan}
            disabled={loading}
            aria-label="Skenovat čárový kód kamerou"
            title="Skenovat kamerou"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-accent disabled:opacity-50"
          >
            <ScanLine size={18} />
          </button>
        )}
      </form>

      {scanning && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-2 text-white">
            <p className="text-sm font-medium">Namiř na čárový kód</p>
            <button type="button" onClick={stopScan} aria-label="Zavřít" className="text-white">
              <X size={20} />
            </button>
          </div>
          <video ref={videoRef} muted playsInline className="min-h-0 flex-1 object-cover" />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <Utensils size={40} />
          <p className="text-lg">{searched ? "Nic nenalezeno." : "Vyhledej potravinu."}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div key={product.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-3">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable-domain product photos, not a static asset
                  <img src={product.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-zinc-400">
                    <Utensils size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  {product.brand && <p className="truncate text-xs text-zinc-500">{product.brand}</p>}
                </div>
                {product.nutriScore && (
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                      NUTRISCORE_COLORS[product.nutriScore] ?? "bg-zinc-400"
                    }`}
                  >
                    {product.nutriScore}
                  </span>
                )}
              </div>
              {(product.energyKcal !== null || product.sugars !== null || product.fat !== null) && (
                <p className="text-xs text-zinc-500">
                  Na 100 g:{" "}
                  {[
                    product.energyKcal !== null ? `${product.energyKcal} kcal` : null,
                    product.sugars !== null ? `cukry ${product.sugars} g` : null,
                    product.fat !== null ? `tuky ${product.fat} g` : null,
                    product.proteins !== null ? `bílkoviny ${product.proteins} g` : null,
                    product.salt !== null ? `sůl ${product.salt} g` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
