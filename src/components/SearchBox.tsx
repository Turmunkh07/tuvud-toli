"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type Suggestion = {
  id: number;
  termTibetan: string;
  preview: string | null;
};

/** Long enough that a fast typist issues one request per word, not per key. */
const DEBOUNCE_MS = 160;

/**
 * The search field with live headword suggestions.
 *
 * It stays a plain GET form underneath: if the suggestion request fails, is
 * still in flight, or JavaScript never loaded, pressing Enter submits and the
 * server-rendered results page answers exactly as before.
 */
export function SearchBox({
  action,
  wordHrefPrefix,
  defaultValue = "",
  placeholder = "Төвөд үг хайх...",
  autoFocus = false,
  inputClassName,
  submitLabel,
  className = "",
}: {
  action: string;
  wordHrefPrefix: string;
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName: string;
  submitLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  // Picking a suggestion rewrites the input; without this the change would
  // immediately trigger a fresh lookup for a word we are already leaving for.
  const skipNextLookup = useRef(false);

  const query = value.trim();

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }

    // Nothing to look up. Stale items stay in state but the render path below
    // ignores them, which avoids a state update on every keystroke back to
    // empty.
    if (query.length === 0) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("suggest failed");
        const data = (await response.json()) as { items?: Suggestion[] };
        setItems(data.items ?? []);
        setActive(-1);
        setOpen((data.items ?? []).length > 0);
      } catch {
        if (controller.signal.aborted) return;
        setItems([]);
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const openWord = (item: Suggestion) => {
    skipNextLookup.current = true;
    setValue(item.termTibetan);
    setOpen(false);
    setActive(-1);
    router.push(`${wordHrefPrefix}/${item.id}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (items.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((current) => {
        const next = current + (event.key === "ArrowDown" ? 1 : -1);
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
      return;
    }

    // Enter on a highlighted suggestion opens that entry; Enter with nothing
    // highlighted falls through and submits the search as usual.
    if (event.key === "Enter" && open && active >= 0 && items[active]) {
      event.preventDefault();
      openWord(items[active]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <form action={action} className={className} autoComplete="off">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="search"
            name="q"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(items.length > 0)}
            onBlur={() => setOpen(false)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            className={inputClassName}
          />

          {loading && query.length > 0 && (
            <span
              aria-hidden
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border border-t-primary"
            />
          )}

          {open && query.length > 0 && items.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-border bg-surface text-left shadow-lg"
            >
              {items.map((item, index) => (
                <li key={item.id} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={index === active}
                    // Keep focus in the input so blur does not close the list
                    // out from under the click.
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openWord(item)}
                    className={`block w-full px-4 py-2 text-left ${
                      index === active ? "bg-primary-light/15" : ""
                    }`}
                  >
                    <span className="tibetan block text-lg leading-snug text-foreground">
                      {item.termTibetan}
                    </span>
                    {item.preview && (
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {item.preview}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {submitLabel && (
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
