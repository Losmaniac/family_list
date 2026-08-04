import type { Recurrence, TaskCategory } from "./types";

export interface TaskPreset {
  title: string;
  icon: string;
  category: TaskCategory;
  xpValue: number;
  recurrence: Recurrence;
  daysOfWeek: number[];
}

export interface TaskPresetCategory {
  label: string;
  presets: TaskPreset[];
}

export const TASK_PRESET_CATEGORIES: TaskPresetCategory[] = [
  {
    label: "Denní",
    presets: [
      { title: "Ustlat postel", icon: "🛏️", category: "household", xpValue: 5, recurrence: "daily", daysOfWeek: [] },
      { title: "Umýt nádobí", icon: "🍽️", category: "household", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Vyvenčit psa", icon: "🐕", category: "household", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Uklidit pokoj", icon: "🧹", category: "household", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Domácí úkoly", icon: "📚", category: "school", xpValue: 15, recurrence: "daily", daysOfWeek: [] },
      { title: "Nakrmit zvíře", icon: "🐾", category: "household", xpValue: 5, recurrence: "daily", daysOfWeek: [] },
      { title: "Pohyb / cvičení", icon: "🏃", category: "health", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
    ],
  },
  {
    label: "Týdenní",
    presets: [
      { title: "Vynést odpadky", icon: "🗑️", category: "household", xpValue: 10, recurrence: "weekly", daysOfWeek: [1, 4] },
      { title: "Vysát byt", icon: "🧼", category: "household", xpValue: 20, recurrence: "weekly", daysOfWeek: [6] },
      { title: "Zalít květiny", icon: "🪴", category: "household", xpValue: 10, recurrence: "weekly", daysOfWeek: [3] },
      { title: "Vyprat prádlo", icon: "🧺", category: "household", xpValue: 15, recurrence: "weekly", daysOfWeek: [2, 5] },
      { title: "Umýt koupelnu", icon: "🛁", category: "household", xpValue: 25, recurrence: "weekly", daysOfWeek: [6] },
      { title: "Čtení knihy", icon: "📖", category: "personal", xpValue: 15, recurrence: "weekly", daysOfWeek: [0] },
    ],
  },
  {
    label: "Jednorázové",
    presets: [
      { title: "Uklidit garáž", icon: "🚗", category: "household", xpValue: 40, recurrence: "once", daysOfWeek: [] },
      { title: "Umýt okna", icon: "🪟", category: "household", xpValue: 30, recurrence: "once", daysOfWeek: [] },
      { title: "Přebrat oblečení", icon: "👕", category: "personal", xpValue: 20, recurrence: "once", daysOfWeek: [] },
    ],
  },
];
