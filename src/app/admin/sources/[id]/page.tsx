import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getSourceWithEntries } from "@/lib/sources";
import { AdminPageShell } from "@/components/AdminPageShell";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.sourceDetail.metaTitle };
}

export default async function AdminSourceEntriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();

  const { id } = await params;
  const sourceId = Number(id);
  if (!Number.isInteger(sourceId)) notFound();

  const [data, t] = await Promise.all([getSourceWithEntries(sourceId), getDictionary()]);
  if (!data) notFound();

  const { source, entries } = data;
  const files = Array.from(
    new Set(entries.map((entry) => entry.sourceFile).filter(Boolean)),
  ) as string[];
  const sd = t.admin.sourceDetail;

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{source.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sd.defCount(entries.length)}
          {files.length > 0 && ` · ${files.join(", ")}`}
          {" · "}
          <Link href="/admin/sources" className="text-primary hover:underline">
            {sd.allSources}
          </Link>
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{sd.empty}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border bg-surface">
          {entries.map((entry) => (
            <li key={entry.definitionId} className="px-4 py-3">
              <Link
                href={`/admin/words/${entry.wordId}`}
                className="tibetan text-lg text-foreground hover:text-primary"
              >
                {entry.termTibetan}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">{entry.definitionText}</p>
              {entry.createdBy && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {entry.createdBy}
                  {entry.sourceFile ? ` · ${entry.sourceFile}` : sd.manualSuffix}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
