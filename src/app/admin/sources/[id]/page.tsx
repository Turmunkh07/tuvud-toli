import Link from "next/link";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getSourceWithEntries } from "@/lib/sources";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminSourceEntriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifySession();

  const { id } = await params;
  const sourceId = Number(id);
  if (!Number.isInteger(sourceId)) notFound();

  const data = await getSourceWithEntries(sourceId);
  if (!data) notFound();

  const { source, entries } = data;
  const files = Array.from(
    new Set(entries.map((entry) => entry.sourceFile).filter(Boolean)),
  ) as string[];

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{source.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} тодорхойлолт
          {files.length > 0 && ` · ${files.join(", ")}`}
          {" · "}
          <Link href="/admin/sources" className="text-primary hover:underline">
            бүх эх сурвалж
          </Link>
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Энэ эх сурвалжид тодорхойлолт алга.</p>
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
                  {entry.sourceFile ? ` · ${entry.sourceFile}` : " · гараар"}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
