"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors thrown by the root layout itself (rare, but app/error.tsx
// can't catch those since it renders *inside* the layout). Must render its
// own <html>/<body> since the layout that would normally provide them is
// exactly what crashed.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "1rem", padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Něco se pokazilo</h1>
          <p style={{ fontSize: "0.875rem", color: "#71717a" }}>Zkus prosím obnovit stránku.</p>
          <button
            type="button"
            onClick={reset}
            style={{ borderRadius: "9999px", background: "#f59e0b", color: "#1c1917", padding: "0.5rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, border: "none" }}
          >
            Zkusit znovu
          </button>
        </main>
      </body>
    </html>
  );
}
