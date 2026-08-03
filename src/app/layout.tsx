import type { Metadata } from "next";
import { Inter, Source_Serif_4, Noto_Serif_Tibetan } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Төвөд-Монгол толь",
  description:
    " Төвөд-монгол толь бичиг. A Tibetan-Mongolian academic dictionary with sourced definitions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="mn"
      className={`${inter.variable} ${sourceSerif.variable} ${notoTibetan.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
