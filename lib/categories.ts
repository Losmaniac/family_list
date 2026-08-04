import type { TaskCategory } from "./types";

export const TASK_CATEGORIES: { value: TaskCategory; label: string; icon: string }[] = [
  { value: "household", label: "Domácnost", icon: "🏠" },
  { value: "school", label: "Škola", icon: "📚" },
  { value: "health", label: "Zdraví", icon: "💪" },
  { value: "personal", label: "Osobní rozvoj", icon: "🌱" },
  { value: "other", label: "Ostatní", icon: "✨" },
];

export function categoryInfo(category: TaskCategory) {
  return TASK_CATEGORIES.find((c) => c.value === category) ?? TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
}
