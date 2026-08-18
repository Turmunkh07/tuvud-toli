import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getWordById } from "@/lib/words";
import { WordForm } from "@/components/WordForm";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { updateWordAction, deleteWordAction } from "@/app/admin/actions";
import { listSources } from "@/lib/sources";
import { AdminPageShell } from "@/components/AdminPageShell";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.wordEdit.metaTitle };
}

export default async function AdminWordEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; notice?: string }>;
}) {
  await verifySession();

  const [{ id }, { saved, notice }, t] = await Promise.all([
    params,
    searchParams,
    getDictionary(),
  ]);
  const wordId = Number(id);
  if (!Number.isInteger(wordId)) notFound();

  const [word, sources] = await Promise.all([getWordById(wordId), listSources()]);
  if (!word) notFound();

  const boundUpdate = updateWordAction.bind(null, wordId);
  const boundDelete = deleteWordAction.bind(null, wordId);
  const we = t.admin.wordEdit;

  return (
    <AdminPageShell>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground">{we.title}</h1>
        <Link
          href={`/word/${wordId}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          {we.viewPublic}
        </Link>
      </div>

      {(notice || saved) && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm text-primary-dark">
          {notice ?? we.saved}
        </p>
      )}

      <WordForm
        action={boundUpdate}
        initialTerm={word.termTibetan}
        initialDefinitions={word.definitions.map((definition) => ({
          source: definition.source,
          definitionText: definition.definitionText,
          sourceFile: definition.sourceFile,
          createdBy: definition.createdBy,
        }))}
        existingSources={sources.map((source) => source.title)}
        submitLabel={we.submit}
        t={t.wordForm}
      />

      <form action={boundDelete} className="border-t border-border pt-6">
        <ConfirmSubmitButton
          confirmMessage={we.deleteConfirm(word.termTibetan)}
          className="text-sm text-danger hover:underline"
        >
          {we.delete}
        </ConfirmSubmitButton>
      </form>
    </AdminPageShell>
  );
}
