import { getDictionary } from "@/lib/i18n";

export default async function Loading() {
  const t = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16" aria-busy>
      <span className="sr-only">{t.loading.label}</span>

      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto h-10 w-72 max-w-full animate-pulse rounded-md bg-border" />
        <div className="mx-auto mt-4 h-10 w-44 max-w-full animate-pulse rounded-md bg-border" />
      </div>

      <div className="mt-8 h-14 w-full max-w-xl animate-pulse rounded-md bg-border" />

      <div className="mt-10 w-full max-w-xl">
        <div className="h-3 w-40 animate-pulse rounded bg-border" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 18 }, (_, index) => (
            <div key={index} className="h-10 w-10 animate-pulse rounded-md bg-border" />
          ))}
        </div>
      </div>
    </main>
  );
}
