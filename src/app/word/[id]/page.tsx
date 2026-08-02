import Link from "next/link";
import { notFound } from "next/navigation";
import { getWordById } from "@/lib/words";

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
        ← Хайлт руу буцах
      </Link>

      <header className="mt-6 border-b border-border pb-6">
        <h1 className="tibetan text-4xl font-semibold text-foreground">{word.termTibetan}</h1>
      </header>

      <ol className="mt-8 flex flex-col gap-8">
        {word.definitions.map((definition) => (
          <li key={definition.id} className="flex gap-4">
            <span className="font-serif text-lg text-primary">{definition.meaningNumber}.</span>
            <div className="flex-1">
              <p className="text-lg text-foreground">{definition.definitionText}</p>
              <p className="mt-2 border-l-2 border-primary-light pl-3 text-sm text-brown">
                {definition.source}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
