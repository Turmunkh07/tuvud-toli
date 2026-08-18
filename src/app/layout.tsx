import type { Metadata } from "next";
import { Inter, Source_Serif_4, Noto_Serif_Tibetan } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import { getLocale, getDictionary } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "cyrillic"],
});

const notoTibetan = Noto_Serif_Tibetan({
  variable: "--font-noto-tibetan",
  weight: ["400", "600"],
  subsets: ["tibetan"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: {
      default: t.site.name,
      template: `%s · ${t.site.name}`,
    },
    description: t.site.description,
  };
}

/**
 * Applies a pinned theme before the first paint.
 *
 * This has to run synchronously ahead of the page body: doing it in an effect
 * would let a light-themed frame flash in front of a reader who chose dark.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("toli-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);

  return (
    // suppressHydrationWarning: the inline script below sets `data-theme`
    // on this element before React hydrates, which would otherwise be
    // flagged as a mismatch even though it's expected and intentional.
    <html
      lang={locale}
      className={`${inter.variable} ${sourceSerif.variable} ${notoTibetan.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        {/* Top-right, labelled and above the page: tucked into a corner as a
            bare icon it was too easy to miss. Language sits to the left of
            theme so both settle into one control cluster, language first
            since it changes what the theme toggle's own label reads. */}
        <div className="fixed right-4 top-4 z-40 flex items-center gap-2">
          <LocaleToggle locale={locale} t={t.locale} />
          <ThemeToggle t={t.theme} />
        </div>
      </body>
    </html>
  );
}
