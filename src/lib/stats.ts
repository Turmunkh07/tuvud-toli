import "server-only";
import { count, countDistinct, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions, sources, activityLog } from "@/db/schema";

// Single definition of the alphabet, alongside the collation that uses it.
export { TIBETAN_LETTERS } from "@/lib/tibetan";

export type LandingData = {
  wordCount: number;
  sourceCount: number;
  definitionCount: number;
  recentWords: { id: number; termTibetan: string }[];
  populatedLetters: Set<string>;
};

/** Headline counts for the admin dashboard. Definition count is deliberately absent. */
export async function getAdminStats() {
  const [wordRows, sourceRows, importRows] = await Promise.all([
    db.select({ value: count() }).from(words),
    db.select({ value: count() }).from(sources),
    db
      .select({ value: count() })
      .from(activityLog)
      .where(eq(activityLog.action, "import")),
  ]);

  return {
    wordCount: wordRows[0]?.value ?? 0,
    sourceCount: sourceRows[0]?.value ?? 0,
    importCount: importRows[0]?.value ?? 0,
  };
}

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
    // The root letter each word actually files under, not its first written
    // character — see lib/tibetan.ts.
    db.selectDistinct({ letter: words.rootLetter }).from(words),
  ]);

  return {
    wordCount: wordRows[0]?.value ?? 0,
    sourceCount: sourceRows[0]?.value ?? 0,
    definitionCount: definitionRows[0]?.value ?? 0,
    recentWords,
    populatedLetters: new Set(
      firstLetters.map((row) => row.letter).filter((letter): letter is string => letter !== null),
    ),
  };
}
