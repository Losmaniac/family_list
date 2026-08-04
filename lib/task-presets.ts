import type { Recurrence } from "./types";

export interface TaskPreset {
  title: string;
  icon: string;
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
      { title: "Ustlat postel", icon: "🛏️", xpValue: 5, recurrence: "daily", daysOfWeek: [] },
      { title: "Umýt nádobí", icon: "🍽️", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Vyvenčit psa", icon: "🐕", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Uklidit pokoj", icon: "🧹", xpValue: 10, recurrence: "daily", daysOfWeek: [] },
      { title: "Domácí úkoly", icon: "📚", xpValue: 15, recurrence: "daily", daysOfWeek: [] },
      { title: "Nakrmit zvíře", icon: "🐾", xpValue: 5, recurrence: "daily", daysOfWeek: [] },
    ],
  },
  {
    label: "Týdenní",
    presets: [
      { title: "Vynést odpadky", icon: "🗑️", xpValue: 10, recurrence: "weekly", daysOfWeek: [1, 4] },
      { title: "Vysát byt", icon: "🧼", xpValue: 20, recurrence: "weekly", daysOfWeek: [6] },
      { title: "Zalít květiny", icon: "🪴", xpValue: 10, recurrence: "weekly", daysOfWeek: [3] },
      { title: "Vyprat prádlo", icon: "🧺", xpValue: 15, recurrence: "weekly", daysOfWeek: [2, 5] },
      { title: "Umýt koupelnu", icon: "🛁", xpValue: 25, recurrence: "weekly", daysOfWeek: [6] },
    ],
  },
  {
    label: "Jednorázové",
    presets: [
      { title: "Uklidit garáž", icon: "🚗", xpValue: 40, recurrence: "once", daysOfWeek: [] },
      { title: "Umýt okna", icon: "🪟", xpValue: 30, recurrence: "once", daysOfWeek: [] },
      { title: "Přebrat oblečení", icon: "👕", xpValue: 20, recurrence: "once", daysOfWeek: [] },
    ],
  },
];
