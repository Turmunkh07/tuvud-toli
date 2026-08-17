import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { listRevisions } from "@/lib/revisions";
import { AdminPageShell } from "@/components/AdminPageShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { restoreRevisionAction } from "@/app/admin/actions";

const ACTION_LABEL: Record<string, string> = {
  update: "засварлахын өмнөх",
  delete: "устгахын өмнөх",
};

export default async function AdminHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const [, { notice, error }, revisions] = await Promise.all([
    verifySession(),
    searchParams,
    listRevisions(),
  ]);

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Өөрчлөлтийн түүх</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Excel-ээс оруулсан үгийг засах, устгахын өмнөх хувилбарыг аль файлаас гаралтайг нь
          хамт хадгалав. Устгасан ч эх Excel файл өөрөө хэвээрээ — зөвхөн мэдээллийн сангийн
          бичлэг арилна. Гараар нэмсэн үг архивлагдахгүй, шууд устана.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/admin/imports" className="text-primary hover:underline">
            Импортын түүх
          </Link>{" "}
          хуудсаас тухайн файлыг хэн, хэзээ оруулсныг харна уу.
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

      {revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Одоогоор өөрчлөлт алга.</p>
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
                    {revision.actor} · {ACTION_LABEL[revision.action] ?? revision.action} ·{" "}
                    {definitionCount} тодорхойлолт · {revision.createdAt}
                  </p>
                  {revision.sourceFiles && (
                    <p className="mt-0.5 break-all text-xs text-brown">
                      Файл: {revision.sourceFiles}
                    </p>
                  )}
                </div>
                <form action={restore}>
                  <ConfirmSubmitButton
                    confirmMessage={`"${revision.termTibetan}"-г энэ хувилбар руу сэргээх үү?`}
                    className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light/10"
                  >
                    Сэргээх
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
