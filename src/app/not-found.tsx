import Link from "next/link";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.notFoundPage.metaTitle };
}

export default async function NotFound() {
  const t = await getDictionary();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="font-serif text-5xl font-semibold text-primary-light">404</p>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-foreground">
        {t.notFoundPage.heading}
      </h1>
      <p className="mt-2 max-w-sm text-muted-foreground">{t.notFoundPage.body}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
        >
          {t.notFoundPage.home}
        </Link>
        <Link
          href="/word/random"
          className="rounded-md border border-primary px-4 py-2 font-medium text-primary hover:bg-primary-light/10"
        >
          {t.notFoundPage.randomWord}
        </Link>
      </div>
    </main>
  );
}
