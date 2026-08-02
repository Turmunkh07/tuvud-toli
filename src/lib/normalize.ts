/**
 * SQLite's LIKE only case-folds ASCII, so Cyrillic queries would otherwise be
 * case-sensitive ("цас" would miss "Цас"). Definitions are stored alongside a
 * pre-lowercased copy, and searches run against that instead.
 *
 * Not marked server-only: the seed script imports it outside the Next runtime.
 */
export function normalizeForSearch(value: string): string {
  return value.trim().toLowerCase();
}
