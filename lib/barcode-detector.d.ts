// Minimal ambient typing for the native BarcodeDetector API (Chrome/Edge, and
// Safari 17+ on iOS/macOS) — not yet part of TypeScript's bundled DOM lib.
// Used by FoodFactsExplorer's camera barcode scanner; feature-detected at
// runtime via `"BarcodeDetector" in window`, so this only needs to describe
// the shape, not guarantee it exists.
interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
