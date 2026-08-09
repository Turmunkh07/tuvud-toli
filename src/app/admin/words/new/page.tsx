import { verifySession } from "@/lib/dal";
import { WordForm } from "@/components/WordForm";
import { createWordAction } from "@/app/admin/actions";
import { listSources } from "@/lib/sources";
import { AdminPageShell } from "@/components/AdminPageShell";

export default async function AdminNewWordPage() {
  const [, sources] = await Promise.all([verifySession(), listSources()]);

  return (
    <AdminPageShell>
      <h1 className="font-serif text-2xl font-semibold text-foreground">Шинэ үг нэмэх</h1>

      <WordForm
        action={createWordAction}
        existingSources={sources.map((source) => source.title)}
        submitLabel="Хадгалах"
      />
    </AdminPageShell>
  );
}
