import Link from "next/link";
import { CleanFlashUrl } from "@/components/CleanFlashUrl";

/**
 * Frame shared by every admin page below the dashboard: same width, same
 * spacing, same way back. Previously copy-pasted into each one, so a change
 * to the chrome had to be repeated four times and could silently drift.
 */
export function AdminPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <CleanFlashUrl />
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-primary">
        ← Самбар руу буцах
      </Link>
      {children}
    </main>
  );
}
