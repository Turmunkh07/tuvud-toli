/**
 * Recently viewed entries, kept in the browser only.
 *
 * Reading history is the reader's business, not the dictionary's — keeping it
 * in localStorage means it never reaches the server and needs no account.
 *
 * Exposed as a subscribable store rather than a plain read, so a component can
 * pull it through `useSyncExternalStore` instead of copying it into state.
 */

export type RecentWord = { id: number; termTibetan: string };

export const RECENT_KEY = "toli-recent";
export const RECENT_LIMIT = 8;

function readStorage(): RecentWord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is RecentWord =>
          typeof entry === "object" &&
          entry !== null &&
          Number.isInteger((entry as RecentWord).id) &&
          typeof (entry as RecentWord).termTibetan === "string",
      )
      .slice(0, RECENT_LIMIT);
  } catch {
    // Corrupt or unavailable storage simply means no history to show.
    return [];
  }
}

/**
 * `useSyncExternalStore` re-renders whenever the snapshot is a new reference,
 * so the parsed list is held until something actually changes it.
 */
let cached: RecentWord[] | null = null;
const listeners = new Set<() => void>();

function invalidate() {
  cached = null;
  listeners.forEach((listener) => listener());
}

export function subscribeRecent(listener: () => void): () => void {
  // Another tab writing history should not leave this one stale.
  const onStorage = () => {
    cached = null;
    listener();
  };

  listeners.add(listener);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function recentSnapshot(): RecentWord[] {
  if (cached === null) cached = readStorage();
  return cached;
}

/** The server has no history to render; a constant keeps the reference stable. */
const NONE: RecentWord[] = [];

export function recentServerSnapshot(): RecentWord[] {
  return NONE;
}

export function pushRecent(word: RecentWord): void {
  try {
    const next = [word, ...readStorage().filter((entry) => entry.id !== word.id)].slice(
      0,
      RECENT_LIMIT,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* history is a convenience; losing it is not worth an error */
  }
  invalidate();
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* nothing to do */
  }
  invalidate();
}
