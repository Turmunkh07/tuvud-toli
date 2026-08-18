import { setLocaleAction } from "@/app/locale-actions";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/dictionaries/mn";

/**
 * A two-way switch rather than a single "next language" button (compare
 * ThemeToggle): with only two languages either reads fine, but showing both
 * flags at once means a reader lands on the page and can see immediately
 * which one is active, not just which one they'd get by clicking.
 *
 * Plain Server Component: switching language is a full round trip regardless
 * (the page text itself is server-rendered), so there is nothing here that
 * needs client JS — the form posts to setLocaleAction and works even before
 * hydration.
 */
export function LocaleToggle({ locale, t }: { locale: Locale; t: Dictionary["locale"] }) {
  return (
    <form
      action={setLocaleAction}
      className="flex items-center gap-0.5 rounded-md border border-border bg-surface p-1 shadow-sm"
    >
      <LocaleOption value="mn" flag="🇲🇳" label="MN" active={locale === "mn"} ariaLabel={t.ariaSwitchToMn} />
      <LocaleOption value="en" flag="🇬🇧" label="EN" active={locale === "en"} ariaLabel={t.ariaSwitchToEn} />
    </form>
  );
}

function LocaleOption({
  value,
  flag,
  label,
  active,
  ariaLabel,
}: {
  value: Locale;
  flag: string;
  label: string;
  active: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="submit"
      name="locale"
      value={value}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
        active
          ? "bg-primary-light/20 text-primary"
          : "text-muted-foreground hover:text-primary"
      }`}
    >
      <span aria-hidden="true">{flag}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
