"use client";

import { useEffect } from "react";

/** Query keys used only to carry a one-time flash message through a redirect. */
const FLASH_KEYS = ["notice", "error", "saved"];

/**
 * Server actions redirect with e.g. `?notice=...` so the message survives the
 * redirect and the page can render it. Once painted, there's no reason for
 * that text to keep sitting in the address bar — bookmarking or sharing the
 * link would replay a stale confirmation, and on /admin it made invite
 * passwords briefly visible in the URL.
 *
 * This only rewrites what the browser displays via the History API, after the
 * page has already rendered the message once. It deliberately does not use
 * Next's router: a router navigation would re-render the page from the new
 * (query-stripped) URL and the message would vanish before anyone read it.
 * Search-relevant params (q, tab, page) are left untouched.
 */
export function CleanFlashUrl() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const hadFlash = FLASH_KEYS.some((key) => url.searchParams.has(key));
    if (!hadFlash) return;

    for (const key of FLASH_KEYS) url.searchParams.delete(key);
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);

  return null;
}
