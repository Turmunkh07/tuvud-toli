import type { Metadata } from "next";
import { loginAction } from "@/app/admin/actions";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.admin.login.metaTitle };
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <CleanFlashUrl />
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl font-semibold text-foreground">{t.admin.login.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.admin.login.subtitle}</p>

        {error && (
          <p className="mt-4 rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form action={loginAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-foreground">
            {t.admin.login.nameLabel}
            <input
              type="text"
              name="name"
              required
              autoFocus
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-foreground">
            {t.admin.login.passwordLabel}
            <input
              type="password"
              name="password"
              required
              className="rounded-md border border-border bg-surface px-3 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-dark"
          >
            {t.admin.login.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
