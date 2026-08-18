import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    // Spelled out rather than inherited: a plain string here would replace
    // the root's title object outright, leaving admin pages with no suffix.
    title: {
      default: `${t.admin.metaTitle} · ${t.site.name}`,
      template: `%s · ${t.site.name}`,
    },
    // Nothing behind the login belongs in a search index — and the login
    // page itself has no reason to be found either.
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
