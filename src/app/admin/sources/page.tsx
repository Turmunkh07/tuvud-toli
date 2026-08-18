import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listSources } from "@/lib/sources";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { AdminPageShell } from "@/components/AdminPageShell";
import { getDictionary } from "@/lib/i18n";
import {
  renameSourceAction,
  mergeSourcesIntoAction,
  deleteSourceAction,
} from "@/app/admin/actions";

const inputClass =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.sources.metaTitle };
}

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await verifySession();
  const [{ notice, error }, allSources, t] = await Promise.all([
    searchParams,
    listSources(),
    getDictionary(),
  ]);
  const s = t.admin.sources;

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">{s.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
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

      {allSources.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {allSources.map((source) => {
            const otherSources = allSources.filter((other) => other.id !== source.id);
            const boundRename = renameSourceAction.bind(null, source.id);
            const boundMerge = mergeSourcesIntoAction.bind(null, source.id);
            const boundDelete = deleteSourceAction.bind(null, source.id);

            return (
              <li
                key={source.id}
                className="rounded-md border border-border bg-surface p-4"
              >
                <form action={boundRename} className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                    {s.nameLabel}
                    <input
                      type="text"
                      name="title"
                      defaultValue={source.title}
                      required
                      className={inputClass}
                    />
                  </label>
                  <Link
                    href={`/admin/sources/${source.id}`}
                    className="pb-1.5 text-xs text-primary hover:underline"
                  >
                    {s.defCount(source.definitionCount)}
                  </Link>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-dark"
                  >
                    {s.save}
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  {otherSources.length > 0 && (
                    <form action={boundMerge} className="flex flex-1 items-end gap-2">
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        {s.mergeInto}
                        <select name="targetSourceId" required className={inputClass}>
                          <option value="">{s.chooseOption}</option>
                          {otherSources.map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.title} ({other.definitionCount})
                            </option>
                          ))}
                        </select>
                      </label>
                      <ConfirmSubmitButton
                        confirmMessage={s.mergeConfirm(source.title)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        {s.merge}
                      </ConfirmSubmitButton>
                    </form>
                  )}

                  {source.definitionCount === 0 && (
                    <form action={boundDelete}>
                      <ConfirmSubmitButton
                        confirmMessage={s.deleteConfirm(source.title)}
                        className="text-xs text-danger hover:underline"
                      >
                        {s.delete}
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </AdminPageShell>
  );
}
