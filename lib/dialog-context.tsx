"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
}

type DialogState =
  | { kind: "none" }
  | { kind: "confirm"; options: ConfirmOptions }
  | { kind: "prompt"; options: PromptOptions; value: string };

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  promptText: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ kind: "none" });
  const resolverRef = useRef<((value: never) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve as (value: never) => void;
      setState({ kind: "confirm", options });
    });
  }, []);

  const promptText = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve as (value: never) => void;
      setState({ kind: "prompt", options, value: "" });
    });
  }, []);

  function close<T>(result: T) {
    resolverRef.current?.(result as never);
    resolverRef.current = null;
    setState({ kind: "none" });
  }

  return (
    <DialogContext.Provider value={{ confirm, promptText }}>
      {children}
      {state.kind !== "none" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{state.options.title}</h2>
            {state.options.description && (
              <p className="mt-1 text-sm text-zinc-500">{state.options.description}</p>
            )}

            {state.kind === "prompt" && (
              <input
                type="text"
                autoFocus
                value={state.value}
                placeholder={state.options.placeholder}
                onChange={(e) => setState({ ...state, value: e.target.value })}
                className="mt-3 w-full rounded-lg border border-border bg-surface px-4 py-2"
              />
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => close(state.kind === "confirm" ? false : null)}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
              >
                {state.options.cancelLabel ?? "Zrušit"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (state.kind === "prompt" && state.options.required && !state.value.trim()) return;
                  close(state.kind === "confirm" ? true : state.value);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
                  state.kind === "confirm" && state.options.danger ? "bg-danger" : "bg-accent text-accent-foreground"
                }`}
              >
                {state.options.confirmLabel ?? "Potvrdit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within a DialogProvider");
  return ctx;
}
