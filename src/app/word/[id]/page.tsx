import Link from "next/link";
import { notFound } from "next/navigation";
import { getWordById } from "@/lib/words";

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

export default async function WordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const wordId = Number(id);
  if (!Number.isInteger(wordId)) notFound();

  const word = await getWordById(wordId);
  if (!word) notFound();

  const grouped = groupBySource(word.definitions);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
        ← Хайлт руу буцах
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <h1 className="tibetan text-4xl font-semibold text-foreground">{word.termTibetan}</h1>
        {grouped.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            {grouped.length} эх сурвалж · {word.definitions.length} тодорхойлолт
          </p>
        )}
      </header>

      {grouped.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Тодорхойлолт алга.</p>
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
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
