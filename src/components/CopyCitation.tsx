"use client";

import { useState } from "react";

function ClipboardIcon({ checked }: { checked: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {checked ? (
        <polyline points="20 6 9 17 4 12" />
      ) : (
        <>
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </>
      )}
    </svg>
  );
}

/**
 * Citations follow the standard form for a dictionary entry: the work, then
 * `s.v.` (sub verbo, "under the word") and the headword in quotes, then the
 * database it was consulted in with an access date. That is what Chicago and
 * friends expect for a reference-work entry, and `s.v.` is language-neutral,
 * so the two variants differ only in their surrounding words.
 */
function buildCitation(
  language: "mn" | "en",
  { term, source, url, accessed }: { term: string; source: string; url: string; accessed: string },
) {
  const work = source.replace(/\.\s*$/, "");
  return language === "mn"
    ? `${work}. s.v. "${term}". Төвөд-Монгол толь. Хандсан ${accessed}. ${url}`
    : `${work}. s.v. "${term}." Tibetan–Mongolian Dictionary. Accessed ${accessed}. ${url}`;
}

export function CopyCitation({
  term,
  source,
  wordId,
}: {
  term: string;
  source: string;
  wordId: number;
}) {
  const [copied, setCopied] = useState<"mn" | "en" | null>(null);

  const copy = async (language: "mn" | "en") => {
    // Read at click time: the URL is only known in the browser, and the access
    // date must be the reader's, not the server's render date.
    const url = `${window.location.origin}/word/${wordId}`;
    const now = new Date();
    // Numeric for Mongolian rather than toLocaleDateString("mn-MN"): browsers
    // routinely lack mn locale data and silently fall back to English month
    // names, which would put "August" inside a Mongolian citation.
    const accessed =
      language === "mn"
        ? `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
            now.getDate(),
          ).padStart(2, "0")}`
        : now.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
    const citation = buildCitation(language, { term, source, url, accessed });

    try {
      await navigator.clipboard.writeText(citation);
      setCopied(language);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be refused (insecure origin, denied permission).
      // Selecting the text by hand still works, so this stays silent rather
      // than throwing an error at someone who was only citing a word.
    }
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => copy("mn")}
        aria-label={`${term} — эшлэлийг монголоор хуулах`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ClipboardIcon checked={copied === "mn"} />
        {copied === "mn" ? "Хуулагдлаа" : "Эшлэл хуулах"}
      </button>
      <button
        type="button"
        onClick={() => copy("en")}
        aria-label={`${term} — copy citation in English`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
      >
        <ClipboardIcon checked={copied === "en"} />
        {copied === "en" ? "Copied" : "Cite in English"}
      </button>
    </div>
  );
}
