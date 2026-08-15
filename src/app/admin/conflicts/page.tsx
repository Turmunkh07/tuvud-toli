import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listConflicts } from "@/lib/conflicts";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  keepIncomingDefinitionAction,
  keepExistingDefinitionAction,
} from "@/app/admin/actions";

export default async function AdminConflictsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [, { notice, error }, conflicts] = await Promise.all([
    verifySession(),
    searchParams,
    listConflicts(),
  ]);

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Зөрчилтэй тодорхойлолт</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Нэг ном нэг үгийг өөр өөрөөр тодорхойлсон тохиолдол. Аль нь зөв болохыг сонгох хүртэл
          шинэ хувилбарыг толь бичигт нэмээгүй хүлээлгэнд байлгав.
        </p>
      </div>

      {notice && (
        <p className="rounded-md border border-primary-light bg-primary-light/10 px-3 py-2 text-sm text-primary-dark">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {conflicts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Одоогоор зөрчил алга.</p>
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
                      Одоо байгаа
                      {conflict.existingUploadedBy && ` · ${conflict.existingUploadedBy}`}
                    </p>
                    <p className="mt-1 text-foreground">{conflict.existingText}</p>
                    {conflict.existingDefinitionId === null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        (Энэ тодорхойлолт хожим устсан байна.)
                      </p>
                    )}
                    <form action={keepExisting} className="mt-3">
                      <ConfirmSubmitButton
                        confirmMessage="Одоо байгаа хувилбарыг үлдээж, шинийг нь хаях уу?"
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        Үүнийг үлдээх
                      </ConfirmSubmitButton>
                    </form>
                  </div>

                  <div className="rounded-md border border-primary-light bg-background p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Шинээр ирсэн · {conflict.uploadedBy}
                      {conflict.fileName && ` · ${conflict.fileName}`}
                    </p>
                    <p className="mt-1 text-foreground">{conflict.incomingText}</p>
                    <form action={keepIncoming} className="mt-3">
                      <ConfirmSubmitButton
                        confirmMessage="Шинэ хувилбараар солих уу?"
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                      >
                        Үүнийг үлдээх
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
