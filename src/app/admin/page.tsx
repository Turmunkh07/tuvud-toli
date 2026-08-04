import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { searchWords, parseTab, parsePage } from "@/lib/search";
import { SearchResults } from "@/components/SearchResults";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { listCollaborators } from "@/lib/collaborators";
import { canManageCollaborators } from "@/lib/owners";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";
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
  const [results, collaborators] = await Promise.all([
    query ? searchWords(query, parseTab(tab), parsePage(page)) : Promise.resolve(null),
    listCollaborators(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-12">
      <CleanFlashUrl />
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Удирдлагын самбар</h1>
          <p className="text-sm text-muted-foreground">Нэвтэрсэн: {session.name}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-primary">
            Гарах
          </button>
        </form>
      </header>

      {notice && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm break-words text-primary-dark">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/admin" className="flex flex-1 gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Төвөд үг хайх..."
            className="tibetan flex-1 rounded-md border border-border bg-surface px-4 py-2 text-lg text-foreground placeholder:font-serif placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
          >
            Хайх
          </button>
        </form>
        <Link
          href="/admin/words/new"
          className="rounded-md border border-primary px-4 py-2 text-center font-medium text-primary hover:bg-primary-light/10"
        >
          + Үг нэмэх
        </Link>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-brown">
            Excel-ээс олноор нь оруулах
          </h2>
          <div className="flex gap-3">
            <Link href="/admin/sources" className="text-sm text-primary hover:underline">
              Эх сурвалжууд
            </Link>
            <Link href="/admin/imports" className="text-sm text-primary hover:underline">
              Импортын түүх
            </Link>
            <a href="/admin/template" className="text-sm text-primary hover:underline" download>
              ↓ Загвар файл татах
            </a>
          </div>
        </div>
        <form action={importWorkbookAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="file"
            name="file"
            accept=".xlsx"
            required
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-white"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
          >
            Оруулах
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wide text-brown">
          Хамтран ажиллагчид
        </h2>
        <form
          action={inviteCollaboratorAction}
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm text-foreground">
            Нэр
            <input
              type="text"
              name="collaboratorName"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-foreground">
            Имэйл
            <input
              type="email"
              name="email"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-dark"
          >
            Урих
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
                  {collaborator.lastLoginAt ? "Нэвтэрсэн" : "Хараахан нэвтрээгүй"}
                  {canManage && (
                    <form action={removeCollaboratorAction.bind(null, collaborator.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`${collaborator.email}-г хасах уу?`}
                        className="text-red-700 hover:underline"
                      >
                        Хасах
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
          />
        </section>
      )}
    </main>
  );
}
