import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listRevisions } from "@/lib/revisions";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { restoreRevisionAction } from "@/app/admin/actions";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.history.metaTitle };
}

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [, { notice, error }, revisions, t] = await Promise.all([
    verifySession(),
    searchParams,
    listRevisions(),
    getDictionary(),
  ]);
  const h = t.admin.history;
  const actionLabel: Record<string, string> = {
    update: h.actionUpdate,
    delete: h.actionDelete,
  };

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{h.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{h.description}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/admin/imports" className="text-primary hover:underline">
            {h.seeImportsLink}
          </Link>{" "}
          {h.seeImportsSuffix}
        </p>
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

      {revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{h.empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {revisions.map((revision) => {
            const restore = restoreRevisionAction.bind(null, revision.id);
            let definitionCount = 0;
            try {
              definitionCount = (JSON.parse(revision.definitionsJson) as unknown[]).length;
            } catch {
              definitionCount = 0;
            }

            return (
              <li
                key={revision.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/words/${revision.wordId}`}
                    className="tibetan text-lg text-foreground hover:text-primary"
                  >
                    {revision.termTibetan}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {revision.actor} · {actionLabel[revision.action] ?? revision.action} ·{" "}
                    {h.defCount(definitionCount)} · {revision.createdAt}
                  </p>
                  {revision.sourceFiles && (
                    <p className="mt-0.5 break-all text-xs text-brown">
                      {h.fileLabel(revision.sourceFiles)}
                    </p>
                  )}
                </div>
                <form action={restore}>
                  <ConfirmSubmitButton
                    confirmMessage={h.restoreConfirm(revision.termTibetan)}
                    className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light/10"
                  >
                    {h.restore}
                  </ConfirmSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPageShell>
  );
}
