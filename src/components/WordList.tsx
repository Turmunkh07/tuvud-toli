import Link from "next/link";
import type { WordResult } from "@/lib/search";

/** Shared result row, used by search results and by letter browsing alike. */
export function WordList({
  items,
  hrefPrefix,
}: {
  items: WordResult[];
  hrefPrefix: string;
}) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-surface">
      {items.map((word) => (
        <li key={word.id}>
          <Link
            href={`${hrefPrefix}/${word.id}`}
            className="block px-4 py-3 hover:bg-primary-light/10"
          >
            <span className="tibetan text-xl text-foreground">{word.termTibetan}</span>
            {word.preview && (
              <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                {word.preview}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
