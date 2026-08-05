"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle size={32} className="text-danger" />
      <div>
        <h1 className="text-lg font-semibold">Něco se pokazilo</h1>
        <p className="mt-1 text-sm text-zinc-500">Zkus to prosím znovu. Pokud to nepomůže, zkus se odhlásit a přihlásit zpátky.</p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
      >
        Zkusit znovu
      </button>
    </main>
  );
}
