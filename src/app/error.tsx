"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { mn } from "@/dictionaries/mn";
import { en } from "@/dictionaries/en";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

/**
 * Error boundaries are Client Components (React requirement), so they cannot
 * call the server's `cookies()` the way every other page does — the locale
 * has to be read from `document.cookie` instead. `useSyncExternalStore` with
 * a fixed server snapshot is the same pattern ThemeToggle uses: it renders
 * the default on the server and during the first client pass, then swaps to
 * the real value, which is what keeps this from hydration-mismatching the
 * way a plain `document.cookie` read at render time would.
 */
function subscribe() {
  return () => {};
}
function getSnapshot() {
  return document.cookie.includes(`${LOCALE_COOKIE}=en`) ? en : mn;
}
function getServerSnapshot() {
  return mn;
}

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the segment, unlike `reset`, which only clears
   *  the error state. A failed database read needs the re-fetch. */
  unstable_retry: () => void;
}) {
  const t = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Vercel keeps the server-side detail; the digest is the thread back to it.
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="font-serif text-2xl font-semibold text-foreground">{t.errorPage.heading}</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{t.errorPage.body}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
        >
          {t.errorPage.retry}
        </button>
        <Link
          href="/"
          className="rounded-md border border-primary px-4 py-2 font-medium text-primary hover:bg-primary-light/10"
        >
          {t.errorPage.home}
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-xs text-muted-foreground">{t.errorPage.code(error.digest)}</p>
      )}
    </main>
  );
}
