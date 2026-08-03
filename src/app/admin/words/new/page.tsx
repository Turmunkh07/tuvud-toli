import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { WordForm } from "@/components/WordForm";
import { createWordAction } from "@/app/admin/actions";
import { listSources } from "@/lib/sources";

export default async function AdminNewWordPage() {
  await verifySession();
  const sources = await listSources();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
        ← Самбар руу буцах
      </Link>

      <h1 className="font-serif text-2xl font-semibold text-foreground">Шинэ үг нэмэх</h1>

      <WordForm
        action={createWordAction}
        existingSources={sources.map((source) => source.title)}
        submitLabel="Хадгалах"
      />
    </main>
  );
}
