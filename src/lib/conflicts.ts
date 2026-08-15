import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { definitionConflicts, definitions, sources, words } from "@/db/schema";
import { normalizeForSearch } from "@/lib/normalize";
import { UserFacingError } from "@/lib/errors";

/** An incoming row that clashes with what a source already says about a word. */
export type PendingConflict = {
  wordId: number;
  sourceId: number;
  existingDefinitionId: number | null;
  existingText: string;
  existingUploadedBy: string | null;
  incomingText: string;
};

type IncomingRow = {
  wordId: number;
  sourceId: number;
  definitionText: string;
};

export type ConflictSplit = {
  /** Rows safe to insert — the source has not defined this word before. */
  accepted: IncomingRow[];
  /** Rows whose exact text is already recorded; re-importing a file is a no-op. */
  duplicateCount: number;
  conflicts: PendingConflict[];
};

/**
 * Decides, for one import, which incoming rows are new, which merely repeat
 * what is already stored, and which contradict it.
 *
 * A source is allowed to define a word several times — those are separate
 * senses, and rows that arrive together in one workbook are all accepted.
 * What is not allowed is a *later* import asserting different wording for a
 * pair another file already covered: one of the two contributors misread the
 * book, and silently keeping both would leave the entry claiming the source
 * says two different things.
 */
export async function splitOutConflicts(rows: IncomingRow[]): Promise<ConflictSplit> {
  const accepted: IncomingRow[] = [];
  const conflicts: PendingConflict[] = [];
  let duplicateCount = 0;

  if (rows.length === 0) return { accepted, duplicateCount, conflicts };

  // One lookup for every word in the batch, rather than per row.
  const wordIds = Array.from(new Set(rows.map((row) => row.wordId)));
  const existing = new Map<string, { id: number; text: string; uploadedBy: string | null }[]>();

  for (let i = 0; i < wordIds.length; i += 200) {
    const chunk = wordIds.slice(i, i + 200);
    const found = await db
      .select({
        id: definitions.id,
        wordId: definitions.wordId,
        sourceId: definitions.sourceId,
        definitionText: definitions.definitionText,
        createdBy: definitions.createdBy,
      })
      .from(definitions)
      .where(inArray(definitions.wordId, chunk));

    for (const row of found) {
      if (row.sourceId === null) continue;
      const key = `${row.wordId}:${row.sourceId}`;
      const bucket = existing.get(key) ?? [];
      bucket.push({ id: row.id, text: row.definitionText, uploadedBy: row.createdBy });
      existing.set(key, bucket);
    }
  }

  for (const row of rows) {
    const key = `${row.wordId}:${row.sourceId}`;
    const priorForPair = existing.get(key);

    // First time this source has covered this word: nothing to contradict.
    if (!priorForPair || priorForPair.length === 0) {
      accepted.push(row);
      continue;
    }

    // Compared case- and whitespace-insensitively so a re-upload that differs
    // only in incidental typing is treated as the same text, not a conflict.
    const incomingKey = normalizeForSearch(row.definitionText);
    const identical = priorForPair.find(
      (prior) => normalizeForSearch(prior.text) === incomingKey,
    );
    if (identical) {
      duplicateCount += 1;
      continue;
    }

    const clashesWith = priorForPair[0];
    conflicts.push({
      wordId: row.wordId,
      sourceId: row.sourceId,
      existingDefinitionId: clashesWith.id,
      existingText: clashesWith.text,
      existingUploadedBy: clashesWith.uploadedBy,
      incomingText: row.definitionText,
    });
  }

  return { accepted, duplicateCount, conflicts };
}

export async function recordConflicts(
  pending: PendingConflict[],
  uploadedBy: string,
  fileName: string | null,
) {
  if (pending.length === 0) return;
  for (let i = 0; i < pending.length; i += 100) {
    await db
      .insert(definitionConflicts)
      .values(pending.slice(i, i + 100).map((row) => ({ ...row, uploadedBy, fileName })));
  }
}

export async function countOpenConflicts(): Promise<number> {
  const rows = await db.select({ id: definitionConflicts.id }).from(definitionConflicts);
  return rows.length;
}

/** Everything awaiting a decision, with the word and source spelled out. */
export async function listConflicts() {
  return db
    .select({
      id: definitionConflicts.id,
      wordId: definitionConflicts.wordId,
      termTibetan: words.termTibetan,
      sourceTitle: sources.title,
      existingText: definitionConflicts.existingText,
      incomingText: definitionConflicts.incomingText,
      existingUploadedBy: definitionConflicts.existingUploadedBy,
      uploadedBy: definitionConflicts.uploadedBy,
      fileName: definitionConflicts.fileName,
      createdAt: definitionConflicts.createdAt,
      existingDefinitionId: definitionConflicts.existingDefinitionId,
    })
    .from(definitionConflicts)
    .innerJoin(words, eq(definitionConflicts.wordId, words.id))
    .innerJoin(sources, eq(definitionConflicts.sourceId, sources.id))
    .orderBy(desc(definitionConflicts.id));
}

/**
 * Keeps the newly-uploaded wording: overwrites the definition it clashed
 * with, or inserts it if that row has since been deleted.
 */
export async function resolveConflictKeepIncoming(conflictId: number, actor: string) {
  const [conflict] = await db
    .select()
    .from(definitionConflicts)
    .where(eq(definitionConflicts.id, conflictId));
  if (!conflict) throw new UserFacingError("Энэ зөрчил аль хэдийн шийдэгдсэн байна.");

  const [target] = conflict.existingDefinitionId
    ? await db.select().from(definitions).where(eq(definitions.id, conflict.existingDefinitionId))
    : [];

  if (target) {
    await db
      .update(definitions)
      .set({
        definitionText: conflict.incomingText,
        definitionTextLower: normalizeForSearch(conflict.incomingText),
        sourceFile: conflict.fileName,
        createdBy: conflict.uploadedBy,
      })
      .where(eq(definitions.id, target.id));
  } else {
    // The row it argued with is gone; the incoming text becomes the entry.
    const [source] = await db
      .select({ title: sources.title })
      .from(sources)
      .where(eq(sources.id, conflict.sourceId));
    const existingForWord = await db
      .select({ meaningNumber: definitions.meaningNumber })
      .from(definitions)
      .where(eq(definitions.wordId, conflict.wordId));
    const nextNumber =
      existingForWord.reduce((max, row) => Math.max(max, row.meaningNumber), 0) + 1;

    await db.insert(definitions).values({
      wordId: conflict.wordId,
      sourceId: conflict.sourceId,
      source: source?.title ?? "",
      meaningNumber: nextNumber,
      definitionText: conflict.incomingText,
      definitionTextLower: normalizeForSearch(conflict.incomingText),
      sourceFile: conflict.fileName,
      createdBy: conflict.uploadedBy,
    });
  }

  await db.delete(definitionConflicts).where(eq(definitionConflicts.id, conflictId));
  return { termId: conflict.wordId, actor };
}

/** Discards the uploaded wording and leaves the recorded definition alone. */
export async function resolveConflictKeepExisting(conflictId: number) {
  const [conflict] = await db
    .select({ wordId: definitionConflicts.wordId })
    .from(definitionConflicts)
    .where(eq(definitionConflicts.id, conflictId));
  if (!conflict) throw new UserFacingError("Энэ зөрчил аль хэдийн шийдэгдсэн байна.");

  await db.delete(definitionConflicts).where(eq(definitionConflicts.id, conflictId));
  return { termId: conflict.wordId };
}

/** Used by the import path to skip notifying about a word twice in one run. */
export async function conflictExists(wordId: number, sourceId: number, incomingText: string) {
  const [row] = await db
    .select({ id: definitionConflicts.id })
    .from(definitionConflicts)
    .where(
      and(
        eq(definitionConflicts.wordId, wordId),
        eq(definitionConflicts.sourceId, sourceId),
        eq(definitionConflicts.incomingText, incomingText),
      ),
    );
  return Boolean(row);
}
