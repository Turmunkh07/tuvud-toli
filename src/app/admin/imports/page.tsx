import { verifySession } from "@/lib/dal";
import { listImportHistory, IMPORT_HISTORY_LIMIT } from "@/lib/imports";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminImportsPage() {
  // Proxy has already rejected unauthenticated requests to /admin/* before a
  // page renders, so the session check and the query can overlap rather than
  // paying two sequential round trips.
  const [, history] = await Promise.all([verifySession(), listImportHistory()]);

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Импортын түүх</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Excel-ээс оруулсан файл бүр, хэн, хэзээ оруулснаар нь жагсаав.
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Одоогоор import хийгдээгүй байна.</p>
      ) : (
        <div>
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
            {history.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium text-brown">{entry.actor}</span>
                  <span className="text-xs text-muted-foreground">{entry.createdAt}</span>
                </div>
                {entry.fileName && (
                  <p className="mt-1 break-all font-medium text-foreground">{entry.fileName}</p>
                )}
                <p className="mt-0.5 text-muted-foreground">{entry.summary}</p>
              </li>
            ))}
          </ul>

          {history.length === IMPORT_HISTORY_LIMIT && (
            <p className="mt-2 text-xs text-muted-foreground">
              Хамгийн сүүлийн {IMPORT_HISTORY_LIMIT} импортыг харуулав.
            </p>
          )}
        </div>
      )}
    </AdminPageShell>
  );
}
