import { getDictionary } from "@/lib/i18n";

export default async function Loading() {
  const t = await getDictionary();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pb-12 pt-16" aria-busy>
      <span className="sr-only">{t.loading.label}</span>

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="h-7 w-52 animate-pulse rounded-md bg-border" />
          <div className="mt-2 h-4 w-36 animate-pulse rounded bg-border" />
        </div>
        <div className="h-4 w-12 animate-pulse rounded bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-md bg-border" />
        ))}
      </div>

      <div className="h-11 w-full animate-pulse rounded-md bg-border" />
      <div className="h-24 w-full animate-pulse rounded-md bg-border" />
    </main>
  );
}
