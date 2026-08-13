/**
 * Minimal in-house i18n — this app is Czech-first with English as an
 * opt-in per-member preference (Member.locale, see Settings), not a
 * routing-level locale split, so a full framework (next-intl etc.) is
 * more machinery than this needs. Every UI string lives in one flat
 * dictionary keyed by a dotted string; `translate` falls back to Czech
 * (then the raw key) if a key is ever missing from the English side, so a
 * half-translated new string never renders blank.
 *
 * Localizing the whole app string-by-string is a large, ongoing effort —
 * this starts with the always-visible chrome (nav, Settings' own labels)
 * and the Today card; more cards get added to the dictionary over time
 * the same way.
 */

export type Locale = "cs" | "en";

const cs = {
  // Navigace
  "nav.today": "Dnes",
  "nav.family": "Rodina",
  "nav.assign": "Zadat",
  "nav.analytics": "Statistiky",
  "nav.chat": "Chat",
  "nav.shop": "Obchod",
  "nav.investments": "Investice",
  "nav.photos": "Fotky",
  "nav.practice": "Vzdělání",
  "nav.calendar": "Kalendář",
  "nav.schedule": "Rozvrh",
  "nav.lists": "Seznamy",
  "nav.journals": "Deníky",
  "nav.media": "Média",
  "nav.weather": "Počasí",
  "nav.adam": "Adam",
  "nav.settings": "Nastavení",

  // Společné
  "common.save": "Uložit",
  "common.cancel": "Zrušit",
  "common.add": "Přidat",
  "common.delete": "Smazat",
  "common.loading": "Načítání…",

  // Nastavení — přepínač jazyka
  "settings.language": "Jazyk",
  "settings.language.description": "Jazyk rozhraní jen pro tento účet — zbytek rodiny to neovlivní.",
  "settings.language.cs": "Čeština",
  "settings.language.en": "English",

  // Dnes
  "today.title": "Dnešní úkoly",
  "today.pendingApproval": "Čeká na schválení",
  "today.approve": "Schválit",
  "today.return": "Vrátit",
  "today.noTasksParent": "Vítej! Rodina ještě nemá žádné úkoly.",
  "today.noTasksParentHint": "Založ první úkoly na kartě Zadat — vyber si z připravených šablon nebo si vytvoř vlastní.",
  "today.noTasksParentCta": "Nastavit první úkoly",
  "today.noTasksChild": "Rodiče ještě nenastavili žádné úkoly.",
  "today.wantAnotherTask": "Nemáš žádné nesplněné úkoly. Chceš další?",
  "today.requestTask": "Chci nový úkol",
  "today.waitingForRequest": "Čekáš na návrh nového úkolu od rodiny.",
  "today.cancelRequest": "Zrušit žádost",
} as const;

export type TranslationKey = keyof typeof cs;

const en: Record<TranslationKey, string> = {
  "nav.today": "Today",
  "nav.family": "Family",
  "nav.assign": "Assign",
  "nav.analytics": "Analytics",
  "nav.chat": "Chat",
  "nav.shop": "Shop",
  "nav.investments": "Investments",
  "nav.photos": "Photos",
  "nav.practice": "Learning",
  "nav.calendar": "Calendar",
  "nav.schedule": "Schedule",
  "nav.lists": "Lists",
  "nav.journals": "Journals",
  "nav.media": "Media",
  "nav.weather": "Weather",
  "nav.adam": "Adam",
  "nav.settings": "Settings",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.add": "Add",
  "common.delete": "Delete",
  "common.loading": "Loading…",

  "settings.language": "Language",
  "settings.language.description": "Interface language for this account only — the rest of the family is unaffected.",
  "settings.language.cs": "Čeština",
  "settings.language.en": "English",

  "today.title": "Today's tasks",
  "today.pendingApproval": "Awaiting approval",
  "today.approve": "Approve",
  "today.return": "Send back",
  "today.noTasksParent": "Welcome! The family doesn't have any tasks yet.",
  "today.noTasksParentHint": "Set up your first tasks on the Assign card — pick from the built-in templates or create your own.",
  "today.noTasksParentCta": "Set up first tasks",
  "today.noTasksChild": "Parents haven't set up any tasks yet.",
  "today.wantAnotherTask": "You don't have any unfinished tasks. Want another?",
  "today.requestTask": "I want a new task",
  "today.waitingForRequest": "Waiting for the family to suggest a new task.",
  "today.cancelRequest": "Cancel request",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { cs, en };

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale]?.[key] ?? dictionaries.cs[key] ?? key;
}
