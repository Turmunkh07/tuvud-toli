"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  clearRecent,
  recentServerSnapshot,
  recentSnapshot,
  subscribeRecent,
} from "@/lib/recent";
import type { Dictionary } from "@/dictionaries/mn";

export function RecentlyViewed({ t }: { t: Dictionary["recentlyViewed"] }) {
  // The list lives in the browser, so the server renders nothing here and the
  // real history appears once hydration hands over.
  const words = useSyncExternalStore(subscribeRecent, recentSnapshot, recentServerSnapshot);

  if (words.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-brown">{t.heading}</h2>
        <button
          type="button"
          onClick={clearRecent}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {t.clear}
        </button>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {words.map((word) => (
          <li key={word.id}>
            <Link
              href={`/word/${word.id}`}
              className="tibetan inline-block rounded-md border border-border bg-surface px-3 py-1.5 text-lg leading-none text-foreground transition-colors hover:border-primary hover:bg-primary-light/10 hover:text-primary"
            >
              {word.termTibetan}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
