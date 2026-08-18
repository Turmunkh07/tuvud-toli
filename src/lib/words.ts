import "server-only";
import { cache } from "react";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions, sources } from "@/db/schema";

// Cached per request: the word page asks for the entry once for its metadata
// and again to render it, and this keeps that to a single round trip.
export const getWordById = cache(async (id: number) => {
  const [word] = await db.select().from(words).where(eq(words.id, id));
  if (!word) return null;

  // Joined against sources rather than reading definitions.source directly,
  // so a source renamed after the fact (see lib/sources.ts) is reflected here
  // immediately instead of showing whatever text was typed at import time.
  const rows = await db
    .select({
      id: definitions.id,
      meaningNumber: definitions.meaningNumber,
      definitionText: definitions.definitionText,
      sourceId: definitions.sourceId,
      sourceTitle: sources.title,
      // Fallback for the handful of legacy rows a migration couldn't backfill.
      sourceFallback: definitions.source,
      sourceFile: definitions.sourceFile,
      createdBy: definitions.createdBy,
    })
    .from(definitions)
    .leftJoin(sources, eq(definitions.sourceId, sources.id))
    .where(eq(definitions.wordId, id))
    .orderBy(asc(definitions.meaningNumber));

  return {
    ...word,
    definitions: rows.map((row) => ({
      id: row.id,
      meaningNumber: row.meaningNumber,
      definitionText: row.definitionText,
      source: row.sourceTitle ?? row.sourceFallback,
      sourceFile: row.sourceFile,
      createdBy: row.createdBy,
    })),
  };
});

/**
 * One entry at random, or null while the dictionary is still empty.
 *
 * `order by random() limit 1` scans the table, which is the right trade here:
 * the alternative (pick a random id) skips over deleted ids unevenly, and at
 * this dictionary's size the scan costs nothing.
 */
export async function getRandomWordId(): Promise<number | null> {
  const [row] = await db
    .select({ id: words.id })
    .from(words)
    .orderBy(sql`random()`)
    .limit(1);

  return row?.id ?? null;
}
