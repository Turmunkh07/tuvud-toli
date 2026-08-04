import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listImportHistory } from "@/lib/imports";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";

export default async function AdminImportsPage() {
  await verifySession();
  const history = await listImportHistory();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <CleanFlashUrl />
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
        ← Самбар руу буцах
      </Link>

      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Импортын түүх</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Excel-ээс оруулсан файл бүр, хэн, хэзээ оруулснаар нь жагсаав.
        </p>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">Одоогоор import хийгдээгүй байна.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {history.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm">
              <span className="font-medium text-brown">{entry.actor}</span>{" "}
              <span className="text-muted-foreground">{entry.createdAt}</span>
              <p className="mt-1 text-foreground">{entry.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
