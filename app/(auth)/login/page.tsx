"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";

type Mode = "create" | "join";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, configError, signInWithGoogle } = useAuth();
  const { loading: familyLoading, familyId } = useFamily();
  const [mode, setMode] = useState<Mode>("join");
  const [memberName, setMemberName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !familyLoading && user && familyId) {
      router.replace("/today");
    }
  }, [authLoading, familyLoading, user, familyId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "create") {
        const createFamily = httpsCallable(getFirebaseFunctions(), "createFamily");
        await createFamily({ familyName, memberName });
      } else {
        const joinFamily = httpsCallable(getFirebaseFunctions(), "joinFamily");
        await joinFamily({ inviteCode, memberName });
      }
      router.replace("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se nepovedlo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (configError) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-xl font-semibold">Firebase není nakonfigurován</h1>
        <p className="max-w-sm text-sm text-zinc-500">
          Chybí proměnné prostředí NEXT_PUBLIC_FIREBASE_*. Zkopíruj .env.local.example do
          .env.local a doplň konfiguraci Firebase projektu.
        </p>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-zinc-500">Načítání…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-2xl font-semibold">Family Quest</h1>
        <p className="text-zinc-500">Přihlaš se pro pokračování.</p>
        <button
          type="button"
          onClick={() => signInWithGoogle()}
          className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white"
        >
          Přihlásit se přes Google
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Family Quest</h1>

      <div className="flex rounded-full border border-zinc-200 p-1 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            mode === "join" ? "bg-amber-500 text-white" : "text-zinc-500"
          }`}
        >
          Připojit se
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            mode === "create" ? "bg-amber-500 text-white" : "text-zinc-500"
          }`}
        >
          Založit rodinu
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          placeholder="Tvé jméno"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          required
          className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
        />

        {mode === "create" ? (
          <input
            type="text"
            placeholder="Název rodiny"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
            className="rounded-lg border border-zinc-200 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ) : (
          <input
            type="text"
            placeholder="Invite kód"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            className="rounded-lg border border-zinc-200 px-4 py-2 uppercase dark:border-zinc-800 dark:bg-zinc-900"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {mode === "create" ? "Založit rodinu" : "Připojit se"}
        </button>
      </form>
    </main>
  );
}
