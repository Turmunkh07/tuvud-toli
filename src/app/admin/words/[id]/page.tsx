import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getWordById } from "@/lib/words";
import { WordForm } from "@/components/WordForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateWordAction, deleteWordAction } from "@/app/admin/actions";

export default async function AdminWordEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  await verifySession();

  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const wordId = Number(id);
  if (!Number.isInteger(wordId)) notFound();

  const word = await getWordById(wordId);
  if (!word) notFound();

  const boundUpdate = updateWordAction.bind(null, wordId);
  const boundDelete = deleteWordAction.bind(null, wordId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
        ← Самбар руу буцах
      </Link>

      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground">Үг засах</h1>
        <Link
          href={`/word/${wordId}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          Нийтийн хуудсыг үзэх →
        </Link>
      </div>

      {saved && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm text-primary-dark">
          Хадгалагдлаа.
        </p>
      )}

      <WordForm
        action={boundUpdate}
        initialTerm={word.termTibetan}
        initialDefinitions={word.definitions.map((definition) => ({
          source: definition.source,
          definitionText: definition.definitionText,
        }))}
        submitLabel="Хадгалах"
      />

      <form action={boundDelete} className="border-t border-border pt-6">
        <ConfirmSubmitButton
          confirmMessage={`"${word.termTibetan}" үгийг устгах уу? Бүх тодорхойлолт устана.`}
          className="text-sm text-red-700 hover:underline"
        >
          Энэ үгийг устгах
        </ConfirmSubmitButton>
      </form>
    </main>
  );
}
