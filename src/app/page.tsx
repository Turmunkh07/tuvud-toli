import Link from "next/link";
import { searchWords, parseTab, parsePage } from "@/lib/search";
import { getLandingData, TIBETAN_LETTERS } from "@/lib/stats";
import { SearchResults } from "@/components/SearchResults";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; page?: string }>;
}) {
  const { q, tab, page } = await searchParams;
  const query = (q ?? "").trim();

  const [results, landing] = await Promise.all([
    query ? searchWords(query, parseTab(tab), parsePage(page)) : Promise.resolve(null),
    query ? Promise.resolve(null) : getLandingData(),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          Төвөд-Монгол толь
        </h1>
        <p className="mt-3 text-muted-foreground">
          Эрдэмтэн судлаачдад зориулсан Төвөд-монгол толь бичиг
        </p>
      </div>

      <form action="/" className="mt-8 w-full max-w-xl">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Төвөд үг хайх..."
          autoFocus
          className="tibetan w-full rounded-md border border-border bg-surface px-5 py-3 text-lg text-foreground placeholder:font-serif placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
      </form>

      {results && (
        <div className="mt-10 w-full max-w-xl">
          <SearchResults
            query={query}
            results={results}
            basePath="/"
            wordHrefPrefix="/word"
          />
        </div>
      )}

      {landing && (
        <div className="mt-6 w-full max-w-xl">
          <p className="text-center text-sm text-muted-foreground">
            <span className="font-medium text-brown">{landing.wordCount.toLocaleString("mn-MN")}</span>{" "}
            үг ·{" "}
            <span className="font-medium text-brown">
              {landing.sourceCount.toLocaleString("mn-MN")}
            </span>{" "}
            эх сурвалж ·{" "}
            <span className="font-medium text-brown">
              {landing.definitionCount.toLocaleString("mn-MN")}
            </span>{" "}
            тодорхойлолт
          </p>

          <section className="mt-10">
            <h2 className="text-xs font-medium uppercase tracking-wide text-brown">
              Цагаан толгойгоор үзэх
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TIBETAN_LETTERS.map((letter) =>
                landing.populatedLetters.has(letter) ? (
                  <Link
                    key={letter}
                    href={`/?q=${encodeURIComponent(letter)}`}
                    className="tibetan flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-lg leading-none text-foreground transition-colors hover:border-primary hover:bg-primary-light/10 hover:text-primary"
                  >
                    {letter}
                  </Link>
                ) : (
                  <span
                    key={letter}
                    aria-disabled="true"
                    title="Одоогоор үг алга"
                    className="tibetan flex h-10 w-10 items-center justify-center rounded-md border border-transparent text-lg leading-none text-muted-foreground/30"
                  >
                    {letter}
                  </span>
                ),
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Бичигдсэн эхний үсгээр нь эрэмбэлэв.
            </p>
          </section>

          {landing.recentWords.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xs font-medium uppercase tracking-wide text-brown">
                Сүүлд нэмэгдсэн
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {landing.recentWords.map((word) => (
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
        </div>
      )}
    </main>
  );
}
