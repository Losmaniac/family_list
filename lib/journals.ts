/** Pure helpers for the "Deníky" (diaries/journals) card. */

import type { JournalKind } from "./types";

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  food: "Stravovací deník",
  training: "Tréninkový deník",
  custom: "Vlastní deník",
};

/** Built-in diaries a parent can one-tap-create from the "+ Přidat deník" form, alongside a fully custom one. */
export const JOURNAL_PRESETS: { kind: JournalKind; title: string }[] = [
  { kind: "food", title: JOURNAL_KIND_LABELS.food },
  { kind: "training", title: JOURNAL_KIND_LABELS.training },
];
