import Link from "next/link";
import { WordList } from "@/components/WordList";
import { PAGE_SIZE, type SearchResults as Results, type SearchTab } from "@/lib/search";
import type { Dictionary } from "@/dictionaries/mn";

/**
 * Tabs and pages are links rather than client state so that a result page is
 * shareable, survives the back button, and can be paged without loading every
 * match into the browser.
 */
export function SearchResults({
  query,
  results,
  basePath,
  wordHrefPrefix,
  t,
}: {
  query: string;
  results: Results;
  /** Route the tab and page links point at, e.g. "/" or "/admin". */
  basePath: string;
  /** Route each result links to, e.g. "/word" or "/admin/words". */
  wordHrefPrefix: string;
  t: Dictionary["searchResults"];
}) {
  const { tab, items, page, pageCount, total, startsWithCount, containsCount } = results;

  const hrefFor = (nextTab: SearchTab, nextPage: number) => {
    const params = new URLSearchParams({ q: query });
    if (nextTab !== "startsWith") params.set("tab", nextTab);
    if (nextPage > 1) params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  };

  const firstOnPage = (page - 1) * PAGE_SIZE + 1;
  const lastOnPage = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      <div className="flex border-b border-border">
        <TabLink
          href={hrefFor("startsWith", 1)}
          label={t.startsWith(query)}
          count={startsWithCount}
          isActive={tab === "startsWith"}
        />
        <TabLink
          href={hrefFor("contains", 1)}
          label={t.contains(query)}
          count={containsCount}
          isActive={tab === "contains"}
        />
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.noneFound}</p>
      ) : (
        <>
          <div className="mt-4">
            <WordList items={items} hrefPrefix={wordHrefPrefix} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">{t.rangeOfTotal(firstOnPage, lastOnPage, total)}</p>

            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <PageLink href={hrefFor(tab, page - 1)} disabled={page <= 1}>
                  {t.prev}
                </PageLink>
                <span className="text-muted-foreground">{t.pageOf(page, pageCount)}</span>
                <PageLink href={hrefFor(tab, page + 1)} disabled={page >= pageCount}>
                  {t.next}
                </PageLink>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TabLink({
  href,
  label,
  count,
  isActive,
}: {
  href: string;
  label: string;
  count: number;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`-mb-px flex-1 border-b-2 px-3 py-2 text-center text-sm font-medium uppercase tracking-wide transition-colors ${
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-brown"
      }`}
    >
      {label} <span className="text-muted-foreground">({count})</span>
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled="true" className="rounded-md border border-transparent px-2 py-1 text-muted-foreground/40">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-md border border-border px-2 py-1 text-foreground transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </Link>
  );
}
