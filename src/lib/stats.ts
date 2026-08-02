import "server-only";
import { count, countDistinct, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions } from "@/db/schema";

/** The 30 consonants of the Tibetan alphabet, in traditional order. */
export const TIBETAN_LETTERS = [
  "ཀ", "ཁ", "ག", "ང",
  "ཅ", "ཆ", "ཇ", "ཉ",
  "ཏ", "ཐ", "ད", "ན",
  "པ", "ཕ", "བ", "མ",
  "ཙ", "ཚ", "ཛ", "ཝ",
  "ཞ", "ཟ", "འ", "ཡ",
  "ར", "ལ", "ཤ", "ས",
  "ཧ", "ཨ",
] as const;

export type LandingData = {
  wordCount: number;
  sourceCount: number;
  definitionCount: number;
  recentWords: { id: number; termTibetan: string }[];
  populatedLetters: Set<string>;
};

export async function getLandingData(): Promise<LandingData> {
  const [wordRows, sourceRows, definitionRows, recentWords, firstLetters] = await Promise.all([
    db.select({ value: count() }).from(words),
    // Distinct works cited, not distinct citations — two definitions drawn from
    // the same dictionary count as one source.
    db.select({ value: countDistinct(definitions.source) }).from(definitions),
    db.select({ value: count() }).from(definitions),
    db
      .select({ id: words.id, termTibetan: words.termTibetan })
      .from(words)
      .orderBy(desc(words.id))
      .limit(8),
    db
      .selectDistinct({ letter: sql<string>`substr(${words.termTibetan}, 1, 1)` })
      .from(words),
  ]);

  return {
    wordCount: wordRows[0]?.value ?? 0,
    sourceCount: sourceRows[0]?.value ?? 0,
    definitionCount: definitionRows[0]?.value ?? 0,
    recentWords,
    populatedLetters: new Set(firstLetters.map((row) => row.letter)),
  };
}
