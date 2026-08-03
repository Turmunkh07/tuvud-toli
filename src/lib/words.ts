import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions, sources } from "@/db/schema";

export async function getWordById(id: number) {
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
    })),
  };
}
