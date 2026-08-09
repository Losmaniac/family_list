"use client";

import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["cs", "en"];

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-zinc-500">{t("settings.language.description")}</p>
      <div className="flex gap-1 rounded-2xl border border-border p-1">
        {OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setLocale(value)}
            className={`flex-1 rounded-full px-3 py-2 text-sm ${
              locale === value ? "bg-accent text-accent-foreground" : "text-zinc-500"
            }`}
          >
            {t(`settings.language.${value}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
