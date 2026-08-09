import { verifySession } from "@/lib/dal";
import { listSources } from "@/lib/sources";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { AdminPageShell } from "@/components/AdminPageShell";
import {
  renameSourceAction,
  mergeSourcesIntoAction,
  deleteSourceAction,
} from "@/app/admin/actions";

const inputClass =
  "rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light";

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await verifySession();
  const [{ notice, error }, allSources] = await Promise.all([searchParams, listSources()]);

  return (
    <AdminPageShell>
      <div>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Эх сурвалжууд</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Импорт болон гараар нэмэхэд бүх тодорхойлолт эндээс жагсаасан эх сурвалж руу холбогддог.
          Ижил нэрээр импортолсон бол автоматаар нэг сурвалж болж нэгддэг; өөр бичлэгээр орсон бол
          доор гараар нэрийг нь засаж эсвэл нэгтгэж болно.
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

      {allSources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Одоогоор эх сурвалж алга.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {allSources.map((source) => {
            const otherSources = allSources.filter((s) => s.id !== source.id);
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
                    Нэр
                    <input
                      type="text"
                      name="title"
                      defaultValue={source.title}
                      required
                      className={inputClass}
                    />
                  </label>
                  <span className="pb-1.5 text-xs text-muted-foreground">
                    {source.definitionCount} тодорхойлолт
                  </span>
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
                  >
                    Хадгалах
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                  {otherSources.length > 0 && (
                    <form action={boundMerge} className="flex flex-1 items-end gap-2">
                      <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                        Үүн рүү нэгтгэх
                        <select name="targetSourceId" required className={inputClass}>
                          <option value="">— сонгох —</option>
                          {otherSources.map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.title} ({other.definitionCount})
                            </option>
                          ))}
                        </select>
                      </label>
                      <ConfirmSubmitButton
                        confirmMessage={`"${source.title}"-г сонгосон сурвалж руу нэгтгэх үү? Энэ сурвалж устана.`}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary hover:text-primary"
                      >
                        Нэгтгэх
                      </ConfirmSubmitButton>
                    </form>
                  )}

                  {source.definitionCount === 0 && (
                    <form action={boundDelete}>
                      <ConfirmSubmitButton
                        confirmMessage={`Ашиглагдаагүй "${source.title}"-г устгах уу?`}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Устгах
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
