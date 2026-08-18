import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getWordById } from "@/lib/words";
import { recordWordView } from "@/lib/views";
import { CopyCitation } from "@/components/CopyCitation";
import { RecordRecentView } from "@/components/RecordRecentView";
import { getDictionary } from "@/lib/i18n";

type Definition = {
  id: number;
  meaningNumber: number;
  source: string;
  definitionText: string;
};

/**
 * Definitions arrive flat but each carries the book it came from. Grouping by
 * source is what makes a merged entry legible: you can see at a glance that
 * three scholars defined the same headword, and how they differed.
 */
function groupBySource(definitions: Definition[]) {
  const groups = new Map<string, Definition[]>();
  for (const definition of definitions) {
    const bucket = groups.get(definition.source) ?? [];
    bucket.push(definition);
    groups.set(definition.source, bucket);
  }
  return Array.from(groups, ([source, entries]) => ({ source, entries }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const wordId = Number(id);
  const [word, t] = await Promise.all([
    Number.isInteger(wordId) ? getWordById(wordId) : Promise.resolve(null),
    getDictionary(),
  ]);
  if (!word) return { title: t.notFoundPage.metaTitle };

  const first = word.definitions[0]?.definitionText;

  return {
    title: word.termTibetan,
    description: first ? `${word.termTibetan} — ${first}` : undefined,
  };
}

export default async function WordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wordId = Number(id);
  if (!Number.isInteger(wordId)) notFound();

  const [word, t] = await Promise.all([getWordById(wordId), getDictionary()]);
  if (!word) notFound();

  // Counted after the response is sent, so a reader never waits on a write
  // and a failed counter cannot break the page.
  after(() => recordWordView(wordId));

  const grouped = groupBySource(word.definitions);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <RecordRecentView id={word.id} termTibetan={word.termTibetan} />

      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          {t.word.backToSearch}
        </Link>
        <Link
          href="/word/random"
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {t.word.randomWord}
        </Link>
      </div>

      <header className="mt-6 border-b border-border pb-6">
        <h1 className="tibetan text-4xl font-semibold text-foreground">{word.termTibetan}</h1>
        {grouped.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t.word.sourceDefCounts(grouped.length, word.definitions.length)}
          </p>
        )}
      </header>

      {grouped.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{t.word.noDefinitions}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {grouped.map(({ source, entries }) => (
            <section key={source}>
              <h2 className="font-serif text-sm font-semibold text-brown">{source}</h2>

              <ol className="mt-2 flex flex-col gap-3 border-l-2 border-primary-light pl-4">
                {entries.map((definition, index) => (
                  <li key={definition.id} className="flex gap-3">
                    {entries.length > 1 && (
                      <span className="font-serif text-sm text-primary">{index + 1}.</span>
                    )}
                    <p className="flex-1 text-lg text-foreground">{definition.definitionText}</p>
                  </li>
                ))}
              </ol>

              {/* One citation per work: `s.v.` cites the entry, not a sense. */}
              <div className="pl-4">
                <CopyCitation term={word.termTibetan} source={source} wordId={word.id} t={t.citation} />
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
