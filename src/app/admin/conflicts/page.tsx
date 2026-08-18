import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listConflicts } from "@/lib/conflicts";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { getDictionary } from "@/lib/i18n";
import {
  keepIncomingDefinitionAction,
  keepExistingDefinitionAction,
} from "@/app/admin/actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.conflicts.metaTitle };
}

export default async function AdminConflictsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [, { notice, error }, conflicts, t] = await Promise.all([
    verifySession(),
    searchParams,
    listConflicts(),
    getDictionary(),
  ]);
  const c = t.admin.conflicts;

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{c.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
      </div>

      {notice && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm text-primary-dark">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {conflicts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {conflicts.map((conflict) => {
            const keepIncoming = keepIncomingDefinitionAction.bind(null, conflict.id);
            const keepExisting = keepExistingDefinitionAction.bind(null, conflict.id);

            return (
              <li key={conflict.id} className="rounded-md border border-border bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/admin/words/${conflict.wordId}`}
                    className="tibetan text-xl text-foreground hover:text-primary"
                  >
                    {conflict.termTibetan}
                  </Link>
                  <span className="text-xs text-muted-foreground">{conflict.createdAt}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-brown">{conflict.sourceTitle}</p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.existingLabel}
                      {conflict.existingUploadedBy && ` · ${conflict.existingUploadedBy}`}
                    </p>
                    <p className="mt-1 text-foreground">{conflict.existingText}</p>
                    {conflict.existingDefinitionId === null && (
                      <p className="mt-1 text-xs text-muted-foreground">{c.existingGone}</p>
                    )}
                    <form action={keepExisting} className="mt-3">
                      <ConfirmSubmitButton
                        confirmMessage={c.keepExistingConfirm}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        {c.keepThis}
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  <div className="rounded-md border border-primary-light bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {c.incomingLabel} · {conflict.uploadedBy}
                      {conflict.fileName && ` · ${conflict.fileName}`}
                    </p>
                    <p className="mt-1 text-foreground">{conflict.incomingText}</p>
                    <form action={keepIncoming} className="mt-3">
                      <ConfirmSubmitButton
                        confirmMessage={c.keepIncomingConfirm}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-dark"
                      >
                        {c.keepThis}
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPageShell>
  );
}
