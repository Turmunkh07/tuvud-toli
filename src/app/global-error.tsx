"use client";

import { useSyncExternalStore } from "react";
import { mn } from "@/dictionaries/mn";
import { en } from "@/dictionaries/en";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";
import "./globals.css";

/**
 * Last resort: the root layout itself failed, so this renders its own document.
 *
 * Next does not carry the root layout's stylesheet, fonts or theme script into
 * this document, so both are repeated here — otherwise a reader who pinned the
 * dark palette would get a white page at the worst possible moment. The same
 * applies to the locale: this can't call the server's `cookies()` (error
 * boundaries are Client Components), so it reads `document.cookie` directly,
 * behind `useSyncExternalStore` with a fixed server snapshot so hydration
 * doesn't flag the mismatch (see error.tsx for the fuller explanation).
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("toli-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return document.cookie.includes(`${LOCALE_COOKIE}=en`) ? en : mn;
}
function getServerSnapshot() {
  return mn;
}

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const lang = t === en ? "en" : "mn";

  return (
    <html lang={lang} className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col items-center justify-center bg-background px-6 py-24 text-center text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/* `metadata` is not supported in global-error, so the title is a tag. */}
        <title>{`${t.errorPage.heading} · ${t.site.name}`}</title>

        <h1 className="font-serif text-2xl font-semibold">{t.errorPage.heading}</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">{t.errorPage.body}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
          >
            {t.errorPage.retry}
          </button>
          {/* Deliberately a full page load, not <Link>: the root layout is
              what failed, so a client-side navigation would re-enter the same
              broken tree. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="rounded-md border border-primary px-4 py-2 font-medium text-primary hover:bg-primary-light/10"
          >
            {t.errorPage.home}
          </a>
        </div>

        {error.digest && (
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            {t.errorPage.code(error.digest)}
          </p>
        )}
      </body>
    </html>
  );
}
