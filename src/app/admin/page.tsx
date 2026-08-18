import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { searchWords, parseTab, parsePage } from "@/lib/search";
import { SearchResults } from "@/components/SearchResults";
import { SearchBox } from "@/components/SearchBox";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { listCollaborators } from "@/lib/collaborators";
import { canManageCollaborators } from "@/lib/owners";
import { countOpenConflicts } from "@/lib/conflicts";
import { getAdminStats } from "@/lib/stats";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";
import { getDictionary, getLocale, formatNumber } from "@/lib/i18n";
import {
  logoutAction,
  importWorkbookAction,
  inviteCollaboratorAction,
  removeCollaboratorAction,
} from "@/app/admin/actions";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    page?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const session = await verifySession();
  const canManage = canManageCollaborators(session);
  const { q, tab, page, notice, error } = await searchParams;
  const query = (q ?? "").trim();
  const [t, locale, results, collaborators, conflictCount, stats] = await Promise.all([
    getDictionary(),
    getLocale(),
    query ? searchWords(query, parseTab(tab), parsePage(page)) : Promise.resolve(null),
    listCollaborators(),
    countOpenConflicts(),
    getAdminStats(),
  ]);

  const dash = t.admin.dashboard;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pb-12 pt-16">
      <CleanFlashUrl />
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">{dash.heading}</h1>
          <p className="text-sm text-muted-foreground">{dash.loggedInAs(session.name)}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-primary">
            {dash.logout}
          </button>
        </form>
      </header>

      {notice && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm break-words text-primary-dark">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: dash.statWordCount, value: stats.wordCount },
          { label: dash.statSourceCount, value: stats.sourceCount },
          { label: dash.statCollaborators, value: collaborators.length },
          { label: dash.statImports, value: stats.importCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-border bg-surface px-3 py-2"
          >
            <p className="font-serif text-2xl font-semibold text-brown">
              {formatNumber(stat.value, locale)}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBox
          action="/admin"
          wordHrefPrefix="/admin/words"
          defaultValue={query}
          placeholder={t.home.searchPlaceholder}
          submitLabel={dash.searchSubmit}
          className="flex-1"
          inputClassName="tibetan w-full rounded-md border border-border bg-surface px-4 py-2 text-lg text-foreground placeholder:font-serif placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <Link
          href="/admin/words/new"
          className="rounded-md border border-primary px-4 py-2 text-center font-medium text-primary hover:bg-primary-light/10"
        >
          {dash.addWord}
        </Link>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brown">
            {dash.bulkImportHeading}
          </h2>
          <div className="flex gap-3">
            <Link href="/admin/sources" className="text-sm text-primary hover:underline">
              {dash.sourcesLink}
            </Link>
            <Link href="/admin/imports" className="text-sm text-primary hover:underline">
              {dash.importsLink}
            </Link>
            <Link href="/admin/history" className="text-sm text-primary hover:underline">
              {dash.historyLink}
            </Link>
            <Link
              href="/admin/conflicts"
              className={
                conflictCount > 0
                  ? "text-sm font-medium text-danger hover:underline"
                  : "text-sm text-primary hover:underline"
              }
            >
              {dash.conflictsLink(conflictCount)}
            </Link>
            <a href="/admin/template" className="text-sm text-primary hover:underline" download>
              {dash.templateDownload}
            </a>
            <a href="/admin/export" className="text-sm text-primary hover:underline" download>
              {dash.exportDownload}
            </a>
          </div>
        </div>
        <form action={importWorkbookAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-on-primary"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
          >
            {dash.importSubmit}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-brown">
          {dash.collaboratorsHeading}
        </h2>
        <form
          action={inviteCollaboratorAction}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm text-foreground">
            {dash.nameField}
            <input
              type="text"
              name="collaboratorName"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-foreground">
            {dash.emailField}
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
          >
            {dash.inviteSubmit}
          </button>
        </form>

        {collaborators.length > 0 && (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
            {collaborators.map((collaborator) => (
              <li
                key={collaborator.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span>
                  <span className="text-foreground">{collaborator.name}</span>{" "}
                  <span className="text-muted-foreground">{collaborator.email}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {collaborator.lastLoginAt ? dash.loggedIn : dash.neverLoggedIn}
                  {canManage && (
                    <form action={removeCollaboratorAction.bind(null, collaborator.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={dash.removeConfirm(collaborator.email)}
                        className="text-danger hover:underline"
                      >
                        {dash.remove}
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {results && (
        <section>
          <SearchResults
            query={query}
            results={results}
            basePath="/admin"
            wordHrefPrefix="/admin/words"
            t={t.searchResults}
          />
        </section>
      )}
    </main>
  );
}
