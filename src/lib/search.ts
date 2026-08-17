import "server-only";
import { and, or, eq, like, notLike, exists, count, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions } from "@/db/schema";
import { normalizeForSearch } from "@/lib/normalize";

export const PAGE_SIZE = 20;

export type SearchTab = "startsWith" | "contains";

export type WordResult = {
  id: number;
  termTibetan: string;
  /** First line of a definition, used as a preview under the headword. */
  preview: string | null;
};

export type SearchResults = {
  startsWithCount: number;
  containsCount: number;
  tab: SearchTab;
  items: WordResult[];
  page: number;
  pageCount: number;
  total: number;
};

/** Escape LIKE wildcards so a query containing % or _ is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function parseTab(value: string | undefined): SearchTab {
  return value === "contains" ? "contains" : "startsWith";
}

export function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export async function searchWords(
  rawQuery: string,
  tab: SearchTab = "startsWith",
  requestedPage = 1,
): Promise<SearchResults> {
  const query = rawQuery.trim();
  const empty: SearchResults = {
    startsWithCount: 0,
    containsCount: 0,
    tab,
    items: [],
    page: 1,
    pageCount: 0,
    total: 0,
  };
  if (!query) return empty;

  const escaped = escapeLike(query);
  const startsWithPattern = `${escaped}%`;
  const containsPattern = `%${escaped}%`;
  const loweredPattern = `%${escapeLike(normalizeForSearch(query))}%`;

  const startsWithWhere = like(words.termTibetan, startsWithPattern);

  // Expressed against `words` alone via EXISTS so it can be counted and paged
  // without the duplicate rows a join against definitions would produce.
  const containsWhere = or(
    and(like(words.termTibetan, containsPattern), notLike(words.termTibetan, startsWithPattern)),
    exists(
      db
        .select({ one: sql`1` })
        .from(definitions)
        .where(
          and(
            eq(definitions.wordId, words.id),
            like(definitions.definitionTextLower, loweredPattern),
          ),
        ),
    ),
  );

  const [startsWithRows, containsRows] = await Promise.all([
    db.select({ value: count() }).from(words).where(startsWithWhere),
    db.select({ value: count() }).from(words).where(containsWhere),
  ]);

  const startsWithCount = startsWithRows[0]?.value ?? 0;
  const containsCount = containsRows[0]?.value ?? 0;

  const total = tab === "startsWith" ? startsWithCount : containsCount;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const page = pageCount === 0 ? 1 : Math.min(requestedPage, pageCount);

  if (total === 0) {
    return { startsWithCount, containsCount, tab, items: [], page: 1, pageCount: 0, total };
  }

  const pageRows = await db
    .select({ id: words.id, termTibetan: words.termTibetan })
    .from(words)
    .where(tab === "startsWith" ? startsWithWhere : containsWhere)
    .orderBy(words.termTibetan)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const previews = await buildPreviews(
    pageRows.map((row) => row.id),
    normalizeForSearch(query),
  );

  return {
    startsWithCount,
    containsCount,
    tab,
    items: pageRows.map((row) => ({ ...row, preview: previews.get(row.id) ?? null })),
    page,
    pageCount,
    total,
  };
}

export type LetterResults = {
  letter: string;
  items: WordResult[];
  page: number;
  pageCount: number;
  total: number;
};

/**
 * Every word filed under one root letter, in Tibetan dictionary order.
 *
 * Deliberately not a starts-with search on the letter: `བཀྲ་ཤིས་` is filed
 * under ཀ but written starting with བ, so matching the first character would
 * both miss it here and wrongly list it under བ.
 */
export async function listWordsByRootLetter(
  letter: string,
  requestedPage = 1,
): Promise<LetterResults> {
  const [countRow] = await db
    .select({ value: count() })
    .from(words)
    .where(eq(words.rootLetter, letter));

  const total = countRow?.value ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const page = pageCount === 0 ? 1 : Math.min(requestedPage, pageCount);

  if (total === 0) return { letter, items: [], page: 1, pageCount: 0, total };

  const pageRows = await db
    .select({ id: words.id, termTibetan: words.termTibetan })
    .from(words)
    .where(eq(words.rootLetter, letter))
    .orderBy(words.sortKey)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const previews = await buildPreviews(
    pageRows.map((row) => row.id),
    "",
  );

  return {
    letter,
    items: pageRows.map((row) => ({ ...row, preview: previews.get(row.id) ?? null })),
    page,
    pageCount,
    total,
  };
}

/**
 * Picks one definition per word to show under the headword. When the hit came
 * from definition text, showing meaning 1 would look like a non-match, so the
 * matching definition wins and the first meaning is only the fallback.
 */
async function buildPreviews(
  wordIds: number[],
  loweredQuery: string,
): Promise<Map<number, string>> {
  const previews = new Map<number, string>();
  if (wordIds.length === 0) return previews;

  const rows = await db
    .select({
      wordId: definitions.wordId,
      definitionText: definitions.definitionText,
      definitionTextLower: definitions.definitionTextLower,
    })
    .from(definitions)
    .where(inArray(definitions.wordId, wordIds))
    .orderBy(definitions.wordId, definitions.meaningNumber);

  // Rows arrive ordered by (wordId, meaningNumber), so the first row seen for a
  // word is its first meaning — kept unless a later meaning actually matches.
  const settled = new Set<number>();

  for (const row of rows) {
    if (settled.has(row.wordId)) continue;

    const isMatch =
      loweredQuery !== "" && (row.definitionTextLower ?? "").includes(loweredQuery);

    if (isMatch) {
      previews.set(row.wordId, row.definitionText);
      settled.add(row.wordId);
    } else if (!previews.has(row.wordId)) {
      previews.set(row.wordId, row.definitionText);
    }
  }

  return previews;
}
