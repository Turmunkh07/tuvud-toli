import Link from "next/link";
import { searchWords, listWordsByRootLetter, parseTab, parsePage } from "@/lib/search";
import { getLandingData, TIBETAN_LETTERS } from "@/lib/stats";
import { getPopularWords } from "@/lib/views";
import { SearchResults } from "@/components/SearchResults";
import { WordList } from "@/components/WordList";
import { SearchBox } from "@/components/SearchBox";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getDictionary, getLocale, formatNumber } from "@/lib/i18n";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; page?: string; letter?: string }>;
}) {
  const { q, tab, page, letter } = await searchParams;
  const query = (q ?? "").trim();
  // A letter is only honoured when it is one of the 30 — an arbitrary value
  // would otherwise run a query guaranteed to return nothing.
  const browseLetter =
    letter && (TIBETAN_LETTERS as readonly string[]).includes(letter) ? letter : null;

  const [t, locale, results, browse, landing] = await Promise.all([
    getDictionary(),
    getLocale(),
    query ? searchWords(query, parseTab(tab), parsePage(page)) : Promise.resolve(null),
    !query && browseLetter
      ? listWordsByRootLetter(browseLetter, parsePage(page))
      : Promise.resolve(null),
    query || browseLetter ? Promise.resolve(null) : getLandingData(),
  ]);

  // Popularity only replaces recency once enough words have been looked up
  // enough times for the ranking to say anything — see lib/views.ts.
  const popular = landing ? await getPopularWords() : null;
  const featured = popular?.ready
    ? { title: t.home.mostSearched, words: popular.words }
    : { title: t.home.recentlyAdded, words: landing?.recentWords ?? [] };

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          {t.home.title}
        </h1>
        <Link
          href="/word/random"
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-light/10"
        >
          {t.home.randomWordCta}
        </Link>
      </div>

      <SearchBox
        action="/"
        wordHrefPrefix="/word"
        defaultValue={query}
        placeholder={t.home.searchPlaceholder}
        autoFocus
        className="mt-8 w-full max-w-xl"
        inputClassName="tibetan w-full rounded-md border border-border bg-surface px-5 py-3 text-lg text-foreground placeholder:font-serif placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
      />

      {results && (
        <div className="mt-10 w-full max-w-xl">
          <SearchResults
            query={query}
            results={results}
            basePath="/"
            wordHrefPrefix="/word"
            t={t.searchResults}
          />
        </div>
      )}

      {browse && (
        <div className="mt-10 w-full max-w-xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-brown">
              <span className="tibetan text-lg">{browse.letter}</span> {t.home.letterHeadingSuffix}
            </h2>
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
              {t.home.allLetters}
            </Link>
          </div>

          {browse.total === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.home.noWordsForLetter}</p>
          ) : (
            <>
              <div className="mt-4">
                <WordList items={browse.items} hrefPrefix="/word" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <p className="text-muted-foreground">
                  {t.home.rangeOfTotal(
                    (browse.page - 1) * 20 + 1,
                    Math.min(browse.page * 20, browse.total),
                    browse.total,
                  )}
                </p>
                {browse.pageCount > 1 && (
                  <div className="flex items-center gap-2">
                    {browse.page > 1 ? (
                      <Link
                        href={`/?letter=${encodeURIComponent(browse.letter)}&page=${browse.page - 1}`}
                        className="rounded-md border border-border px-2 py-1 hover:border-primary hover:text-primary"
                      >
                        {t.home.prev}
                      </Link>
                    ) : (
                      <span className="px-2 py-1 text-muted-foreground/40">{t.home.prev}</span>
                    )}
                    <span className="text-muted-foreground">
                      {t.home.pageOf(browse.page, browse.pageCount)}
                    </span>
                    {browse.page < browse.pageCount ? (
                      <Link
                        href={`/?letter=${encodeURIComponent(browse.letter)}&page=${browse.page + 1}`}
                        className="rounded-md border border-border px-2 py-1 hover:border-primary hover:text-primary"
                      >
                        {t.home.next}
                      </Link>
                    ) : (
                      <span className="px-2 py-1 text-muted-foreground/40">{t.home.next}</span>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {landing && (
        <div className="mt-6 w-full max-w-xl">
          <p className="text-center text-sm text-muted-foreground">
            {t.home.stats(
              formatNumber(landing.wordCount, locale),
              formatNumber(landing.sourceCount, locale),
              formatNumber(landing.definitionCount, locale),
            )}
          </p>

          <section className="mt-10">
            <h2 className="text-xs font-medium uppercase tracking-wide text-brown">
              {t.home.browseByLetter}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TIBETAN_LETTERS.map((letter) =>
                landing.populatedLetters.has(letter) ? (
                  <Link
                    key={letter}
                    href={`/?letter=${encodeURIComponent(letter)}`}
                    className="tibetan flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-lg leading-none text-foreground transition-colors hover:border-primary hover:bg-primary-light/10 hover:text-primary"
                  >
                    {letter}
                  </Link>
                ) : (
                  <span
                    key={letter}
                    aria-disabled="true"
                    title={t.home.noWordYet}
                    className="tibetan flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-lg leading-none text-muted-foreground/30"
                  >
                    {letter}
                  </span>
                ),
              )}
            </div>
          </section>

          {featured.words.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xs font-medium uppercase tracking-wide text-brown">
                {featured.title}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {featured.words.map((word) => (
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
          )}

          <RecentlyViewed t={t.recentlyViewed} />
        </div>
      )}
    </main>
  );
}
