"use client";

import { useSyncExternalStore } from "react";
import type { Dictionary } from "@/dictionaries/mn";

type Theme = "light" | "dark";

const STORAGE_KEY = "toli-theme";

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : null;
  } catch {
    // Private-browsing modes can throw on localStorage access; the toggle
    // still works for the current page, it just will not be remembered.
    return null;
  }
}

/**
 * The theme is external state — it lives in localStorage — so it is read
 * through a store rather than mirrored into React state by an effect.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab changing the preference should not leave this one stale.
  window.addEventListener("storage", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * White unless the reader chose otherwise. The operating system's dark setting
 * is deliberately ignored: the dictionary opens light for everyone.
 */
function getSnapshot(): Theme {
  return readStored() ?? "light";
}

/** The server cannot read localStorage; light matches the default palette. */
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle({ t }: { t: Dictionary["theme"] }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const goingDark = theme === "light";

  const toggle = () => {
    const next: Theme = goingDark ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* not remembered, but applied */
    }
    listeners.forEach((listener) => listener());
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={goingDark ? t.ariaToDark : t.ariaToLight}
      className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
    >
      {goingDark ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden
          className="h-4 w-4 shrink-0"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden
          className="h-4 w-4 shrink-0"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {/* The label is what makes the control findable; on the narrowest
          screens the icon alone has to carry it. */}
      <span className="hidden sm:inline">{goingDark ? t.toDark : t.toLight}</span>
    </button>
  );
}
