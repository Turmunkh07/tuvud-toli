/**
 * Just the cookie name and the type, with no `server-only` guard, so both
 * server code (lib/i18n.ts) and the client-only error boundaries (error.tsx,
 * global-error.tsx, which read `document.cookie` directly since they cannot
 * call the server's `cookies()`) can agree on where the locale lives without
 * either side pulling in `next/headers`.
 */
export type Locale = "mn" | "en";
export const LOCALE_COOKIE = "toli-locale";
