import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { wordRevisions, words, definitions } from "@/db/schema";
import { wordIndexFields } from "@/lib/tibetan";
import { normalizeForSearch } from "@/lib/normalize";
import { UserFacingError } from "@/lib/errors";

type SnapshotDefinition = {
  meaningNumber: number;
  source: string;
  sourceId: number | null;
  definitionText: string;
  sourceFile: string | null;
  createdBy: string | null;
};

const REVISION_LIMIT = 100;

/**
 * Records a word exactly as it stands, immediately before it is overwritten
 * or deleted. Taken *before* the change so the snapshot is the thing you want
 * back; taking it after would record the damage.
 */
export async function snapshotWord(wordId: number, action: "update" | "delete", actor: string) {
  const [word] = await db.select().from(words).where(eq(words.id, wordId));
  if (!word) return;

  const rows = await db
    .select({
      meaningNumber: definitions.meaningNumber,
      source: definitions.source,
      sourceId: definitions.sourceId,
      definitionText: definitions.definitionText,
      sourceFile: definitions.sourceFile,
      createdBy: definitions.createdBy,
    })
    .from(definitions)
    .where(eq(definitions.wordId, wordId));

  const sourceFiles = Array.from(
    new Set(rows.map((row) => row.sourceFile).filter((file): file is string => Boolean(file))),
  );

  // Words typed straight into the CMS are not archived: there is no
  // spreadsheet to point back at, so by request they go for good rather than
  // accumulating snapshots nobody would consult.
  if (sourceFiles.length === 0) return;

  await db.insert(wordRevisions).values({
    wordId,
    termTibetan: word.termTibetan,
    termKey: word.termKey,
    definitionsJson: JSON.stringify(rows satisfies SnapshotDefinition[]),
    sourceFiles: sourceFiles.join(", "),
    action,
    actor,
  });
}

export async function listRevisions(limit = REVISION_LIMIT) {
  return db
    .select({
      id: wordRevisions.id,
      wordId: wordRevisions.wordId,
      termTibetan: wordRevisions.termTibetan,
      action: wordRevisions.action,
      actor: wordRevisions.actor,
      createdAt: wordRevisions.createdAt,
      definitionsJson: wordRevisions.definitionsJson,
      sourceFiles: wordRevisions.sourceFiles,
    })
    .from(wordRevisions)
    .orderBy(desc(wordRevisions.id))
    .limit(limit);
}

/**
 * Puts a snapshot back. If the word still exists its definitions are replaced
 * wholesale; if it was deleted it is recreated — under a new id, since the
 * original row is gone, so any link to the old id will not resurrect.
 *
 * Restoring is itself snapshotted by the caller, so an unwanted restore can
 * be undone in turn.
 */
export async function restoreRevision(revisionId: number, actor: string) {
  const [revision] = await db
    .select()
    .from(wordRevisions)
    .where(eq(wordRevisions.id, revisionId));
  if (!revision) throw new UserFacingError("Энэ хувилбар олдсонгүй.");

  let snapshot: SnapshotDefinition[];
  try {
    snapshot = JSON.parse(revision.definitionsJson) as SnapshotDefinition[];
  } catch {
    throw new UserFacingError("Хадгалагдсан хувилбарыг уншиж чадсангүй.");
  }

  const [existing] = await db.select().from(words).where(eq(words.id, revision.wordId));

  let targetId = revision.wordId;
  if (existing) {
    await snapshotWord(revision.wordId, "update", actor);
    await db
      .update(words)
      .set({
        termTibetan: revision.termTibetan,
        ...wordIndexFields(revision.termTibetan),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(words.id, revision.wordId));
    await db.delete(definitions).where(eq(definitions.wordId, revision.wordId));
  } else {
    const [recreated] = await db
      .insert(words)
      .values({
        termTibetan: revision.termTibetan,
        ...wordIndexFields(revision.termTibetan),
      })
      .returning({ id: words.id });
    targetId = recreated.id;
  }

  if (snapshot.length > 0) {
    await db.insert(definitions).values(
      snapshot.map((row) => ({
        wordId: targetId,
        meaningNumber: row.meaningNumber,
        source: row.source,
        sourceId: row.sourceId,
        definitionText: row.definitionText,
        definitionTextLower: normalizeForSearch(row.definitionText),
        sourceFile: row.sourceFile,
        createdBy: row.createdBy,
      })),
    );
  }

  return { wordId: targetId, termTibetan: revision.termTibetan, recreated: !existing };
}
