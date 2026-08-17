import "server-only";
import { desc, eq, gte, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { words } from "@/db/schema";

/**
 * A word needs this many views to count as "looked up", and this many words
 * must reach it before the landing page switches from "recently added" to
 * "most looked up" — otherwise the first handful of clicks would masquerade
 * as popularity on a dictionary nobody has read yet.
 */
export const VIEW_THRESHOLD = 100;
export const WORDS_NEEDED = 10;

/** Fire-and-forget: called from `after()`, so a failed counter never breaks a page. */
export async function recordWordView(wordId: number) {
  try {
    await db
      .update(words)
      .set({ viewCount: sql`${words.viewCount} + 1` })
      .where(eq(words.id, wordId));
  } catch {
    // A view counter is not worth surfacing an error to a reader over.
  }
}

export type PopularWords = {
  ready: boolean;
  words: { id: number; termTibetan: string; viewCount: number }[];
};

/**
 * The most-looked-up words, but only once the dictionary has enough traffic
 * for the ranking to mean anything. Until then `ready` is false and the caller
 * shows recently-added instead.
 */
export async function getPopularWords(limit = 8): Promise<PopularWords> {
  const [qualifying] = await db
    .select({ value: count() })
    .from(words)
    .where(gte(words.viewCount, VIEW_THRESHOLD));

  if ((qualifying?.value ?? 0) < WORDS_NEEDED) return { ready: false, words: [] };

  const rows = await db
    .select({ id: words.id, termTibetan: words.termTibetan, viewCount: words.viewCount })
    .from(words)
    .orderBy(desc(words.viewCount))
    .limit(limit);

  return { ready: true, words: rows };
}
