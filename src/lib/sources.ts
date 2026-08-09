import "server-only";
import { eq, inArray, sql, count } from "drizzle-orm";
import { db } from "@/db";
import { sources, definitions } from "@/db/schema";
import { UserFacingError } from "@/lib/errors";

/**
 * Dedup key for a source title. Deliberately looser than the display title:
 * case and whitespace differences between two typings of the same citation
 * must not create two rows. Punctuation is left alone — collapsing it risks
 * merging two books that happen to share wording.
 */
export function normalizeSourceKey(title: string): string {
  return title.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

function cleanTitle(title: string): string {
  return title.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export async function listSources() {
  return db
    .select({
      id: sources.id,
      title: sources.title,
      definitionCount: count(definitions.id),
    })
    .from(sources)
    .leftJoin(definitions, eq(definitions.sourceId, sources.id))
    .groupBy(sources.id)
    .orderBy(sources.title);
}

/** Finds or creates the source for one title, returning both id and display title. */
export async function resolveSource(
  titleRaw: string,
): Promise<{ id: number; title: string }> {
  const title = cleanTitle(titleRaw);
  const titleKey = normalizeSourceKey(title);

  const [existing] = await db.select().from(sources).where(eq(sources.titleKey, titleKey));
  if (existing) return { id: existing.id, title: existing.title };

  const [inserted] = await db
    .insert(sources)
    .values({ title, titleKey })
    .returning({ id: sources.id, title: sources.title });
  return inserted;
}

/**
 * Batched form of resolveSource for bulk import, where a workbook can carry
 * hundreds of rows: one lookup query and one insert query instead of one of
 * each per row.
 */
export async function resolveSources(
  titlesRaw: string[],
): Promise<Map<string, { id: number; title: string }>> {
  const byKey = new Map<string, { id: number; title: string }>();
  const cleaned = new Map<string, string>(); // titleKey -> first-seen display title
  for (const raw of titlesRaw) {
    const title = cleanTitle(raw);
    const key = normalizeSourceKey(title);
    if (key && !cleaned.has(key)) cleaned.set(key, title);
  }

  const keys = Array.from(cleaned.keys());
  if (keys.length === 0) return byKey;

  for (let i = 0; i < keys.length; i += 200) {
    const chunk = keys.slice(i, i + 200);
    const found = await db.select().from(sources).where(inArray(sources.titleKey, chunk));
    for (const row of found) byKey.set(row.titleKey, { id: row.id, title: row.title });
  }

  const missing = keys.filter((key) => !byKey.has(key));
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const inserted = await db
      .insert(sources)
      .values(chunk.map((key) => ({ title: cleaned.get(key)!, titleKey: key })))
      .returning({ id: sources.id, title: sources.title, titleKey: sources.titleKey });
    for (const row of inserted) byKey.set(row.titleKey, { id: row.id, title: row.title });
  }

  return byKey;
}

export async function renameSource(id: number, newTitleRaw: string) {
  const title = cleanTitle(newTitleRaw);
  const titleKey = normalizeSourceKey(title);

  // Renaming onto a title that already exists elsewhere is a merge, not a
  // rename — reassign this source's definitions and remove the empty row.
  const [collision] = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.titleKey, titleKey));

  if (collision && collision.id !== id) {
    await mergeSources(id, collision.id);
    return collision.id;
  }

  await db.update(sources).set({ title, titleKey }).where(eq(sources.id, id));
  return id;
}

/** Reassigns every definition from one source onto another, then deletes the empty one. */
export async function mergeSources(fromId: number, intoId: number) {
  if (fromId === intoId) return;
  const [target] = await db.select({ title: sources.title }).from(sources).where(eq(sources.id, intoId));
  // Reachable whenever another admin deletes or merges away the target
  // between the caller reading it and this running, so the wording is for
  // an admin to read, not a developer.
  if (!target) {
    throw new UserFacingError("Нэгтгэх гэсэн эх сурвалж олдсонгүй. Хуудсыг сэргээж дахин оролдоно уу.");
  }

  await db
    .update(definitions)
    .set({ sourceId: intoId, source: target.title })
    .where(eq(definitions.sourceId, fromId));
  await db.delete(sources).where(eq(sources.id, fromId));
}

export async function deleteSourceIfUnused(id: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(definitions)
    .where(eq(definitions.sourceId, id));
  if (Number(row?.n ?? 0) > 0) {
    throw new UserFacingError("Энэ эх сурвалжид тодорхойлолт хавсаргасан тул устгах боломжгүй.");
  }
  await db.delete(sources).where(eq(sources.id, id));
}
