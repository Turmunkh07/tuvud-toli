import Link from "next/link";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";
import { getDictionary } from "@/lib/i18n";

/**
 * Frame shared by every admin page below the dashboard: same width, same
 * spacing, same way back. Previously copy-pasted into each one, so a change
 * to the chrome had to be repeated four times and could silently drift.
 *
 * Reads the dictionary itself rather than taking it as a prop: it's the one
 * piece of chrome every admin sub-page shares regardless of its own content,
 * so there's nothing for a caller to customize by passing it in.
 */
export async function AdminPageShell({ children }: { children: React.ReactNode }) {
  const t = await getDictionary();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 pb-12 pt-16">
      <CleanFlashUrl />
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
        {t.admin.backToDashboard}
      </Link>
      {children}
    </main>
  );
}
