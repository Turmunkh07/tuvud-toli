import "server-only";
import { cookies } from "next/headers";
import { mn } from "@/dictionaries/mn";
import { en } from "@/dictionaries/en";
import type { Dictionary } from "@/dictionaries/mn";
import { LOCALE_COOKIE, type Locale } from "@/lib/locale-cookie";

export type { Locale };
export { LOCALE_COOKIE };

const DEFAULT_LOCALE: Locale = "mn";

const dictionaries: Record<Locale, Dictionary> = { mn, en };

/** BCP-47 tag for `Number.prototype.toLocaleString` / `Date` formatting. */
const NUMBER_LOCALE: Record<Locale, string> = { mn: "mn-MN", en: "en-US" };

/** The visitor's chosen interface language, defaulting to Mongolian. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : DEFAULT_LOCALE;
}

/**
 * Reads the locale and returns its dictionary in one call, so a page doesn't
 * need to thread the raw locale through when all it wants is the strings.
 */
export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}

/** Locale-aware digit grouping for word/definition counts shown on a page. */
export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(NUMBER_LOCALE[locale]);
}
