import type { Metadata } from "next";
import { verifySession } from "@/lib/dal";
import { WordForm } from "@/components/WordForm";
import { createWordAction } from "@/app/admin/actions";
import { listSources } from "@/lib/sources";
import { AdminPageShell } from "@/components/AdminPageShell";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.wordNew.metaTitle };
}

export default async function AdminNewWordPage() {
  const [, sources, t] = await Promise.all([verifySession(), listSources(), getDictionary()]);

  return (
    <AdminPageShell>
      <h1 className="font-serif text-2xl font-semibold text-foreground">{t.admin.wordNew.title}</h1>

      <WordForm
        action={createWordAction}
        existingSources={sources.map((source) => source.title)}
        submitLabel={t.admin.wordNew.submit}
        t={t.wordForm}
      />
    </AdminPageShell>
  );
}
