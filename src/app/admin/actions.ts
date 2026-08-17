"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/db";
import { words, definitions, activityLog, admins, sources } from "@/db/schema";
import { generatePassword, hashPassword } from "@/lib/password";
import { isMailConfigured, sendInviteEmail, sendConflictEmail } from "@/lib/mailer";
import {
  splitOutConflicts,
  recordConflicts,
  resolveConflictKeepIncoming,
  resolveConflictKeepExisting,
  type PendingConflict,
} from "@/lib/conflicts";
import { verifyAdminCredentials } from "@/lib/admin-users";
import { createSession, destroySession } from "@/lib/session";
import { verifySession } from "@/lib/dal";
import { canManageCollaborators, listOwnerEmails } from "@/lib/owners";
import { parseWorkbook } from "@/lib/xlsx-import";
import { normalizeForSearch } from "@/lib/normalize";
import { normalizeTibetanTerm, wordIndexFields } from "@/lib/tibetan";
import { snapshotWord, restoreRevision } from "@/lib/revisions";
import { cleanFileName } from "@/lib/text";
import { userFacingMessage } from "@/lib/errors";
import {
  resolveSources,
  normalizeSourceKey,
  renameSource,
  mergeSources,
  deleteSourceIfUnused,
} from "@/lib/sources";
import {
  getClientIdentifier,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/rate-limit";

type ActivityAction = "create" | "update" | "delete" | "import";
type ActivityEntity = "word" | "definition" | "import" | "source";

async function logActivity(
  actor: string,
  action: ActivityAction,
  entityType: ActivityEntity,
  entityId: number,
  summary?: string,
  fileName?: string,
) {
  await db.insert(activityLog).values({ actor, action, entityType, entityId, summary, fileName });
}

function requiredField(formData: FormData, name: string): string {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`"${name}" талбарыг бөглөнө үү.`);
  }
  return value.trim();
}

/**
 * Definition rows are submitted as repeated `source` / `definitionText` fields,
 * so the pairs line up by position no matter which rows were added or removed.
 * Each row's source text is resolved against the `sources` table — same name,
 * same source; a name not seen before creates one — rather than stored as
 * free text, so it can never split into near-duplicates by spelling variance.
 */
async function readDefinitionRows(formData: FormData, actor: string) {
  const rawSources = formData.getAll("source").map((v) => String(v).trim());
  const texts = formData.getAll("definitionText").map((v) => String(v).trim());

  const rows = texts
    .map((definitionText, index) => ({ sourceRaw: rawSources[index] ?? "", definitionText }))
    // A row left entirely untouched is treated as unused rather than an error.
    .filter((row) => row.sourceRaw !== "" || row.definitionText !== "");

  if (rows.length === 0) {
    throw new Error("Дор хаяж нэг тодорхойлолт оруулна уу.");
  }
  if (rows.some((row) => row.sourceRaw === "")) {
    throw new Error("Тодорхойлолт бүрт эх сурвалж оруулна уу.");
  }
  if (rows.some((row) => row.definitionText === "")) {
    throw new Error("Эх сурвалж бүрт тодорхойлолт оруулна уу.");
  }

  const resolved = await resolveSources(rows.map((row) => row.sourceRaw));

  return rows.map((row, index) => {
    const source = resolved.get(normalizeSourceKey(row.sourceRaw))!;
    return {
      source: source.title,
      sourceId: source.id,
      definitionText: row.definitionText,
      meaningNumber: index + 1,
      definitionTextLower: normalizeForSearch(row.definitionText),
      // Null file: typed into the CMS rather than imported from a workbook.
      sourceFile: null,
      createdBy: actor,
    };
  });
}

// --- Auth ---

export async function loginAction(formData: FormData) {
  const identifier = await getClientIdentifier();

  // Checked before the credentials are even read, so a locked-out client cannot
  // use this endpoint as a password oracle.
  const { limited, retryAfterMinutes } = await checkRateLimit(identifier);
  if (limited) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        `Хэт олон удаа оролдлоо. ${retryAfterMinutes} минутын дараа дахин оролдоно уу.`,
      )}`,
    );
  }

  const name = requiredField(formData, "name");
  const password = requiredField(formData, "password");

  const admin = await verifyAdminCredentials(name, password);
  if (!admin) {
    await recordFailedAttempt(identifier);
    redirect(`/admin/login?error=${encodeURIComponent("Имэйл, нэр эсвэл нууц үг буруу байна.")}`);
  }

  await clearAttempts(identifier);
  await createSession(admin.name, admin.email);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

// --- Words ---

export async function createWordAction(formData: FormData) {
  const session = await verifySession();
  const termTibetan = requiredField(formData, "termTibetan");
  const rows = await readDefinitionRows(formData, session.name);
  const termKey = normalizeTibetanTerm(termTibetan);

  // Adding a word another source already contributed appends to it rather than
  // creating a rival entry — the same rule the bulk import follows.
  const [duplicate] = await db
    .select({ id: words.id })
    .from(words)
    .where(eq(words.termKey, termKey));

  if (duplicate) {
    const [{ max }] = await db
      .select({ max: sql<number | null>`max(${definitions.meaningNumber})` })
      .from(definitions)
      .where(eq(definitions.wordId, duplicate.id));

    let counter = Number(max ?? 0);
    await db.insert(definitions).values(
      rows.map((row) => ({
        ...row,
        wordId: duplicate.id,
        meaningNumber: ++counter,
      })),
    );

    await logActivity(session.name, "update", "word", duplicate.id, termTibetan);
    revalidatePath("/");
    revalidatePath(`/word/${duplicate.id}`);
    redirect(
      `/admin/words/${duplicate.id}?notice=${encodeURIComponent(
        "Энэ үг аль хэдийн бүртгэгдсэн тул тодорхойлолтыг нь нэмлээ.",
      )}`,
    );
  }

  const [word] = await db
    .insert(words)
    .values({ termTibetan, ...wordIndexFields(termTibetan) })
    .returning({ id: words.id });

  if (rows.length > 0) {
    await db.insert(definitions).values(rows.map((row) => ({ ...row, wordId: word.id })));
  }

  await logActivity(session.name, "create", "word", word.id, termTibetan);
  revalidatePath("/");
  redirect(`/admin/words/${word.id}?saved=1`);
}

export async function updateWordAction(wordId: number, formData: FormData) {
  const session = await verifySession();
  const termTibetan = requiredField(formData, "termTibetan");
  const rows = await readDefinitionRows(formData, session.name);

  // Taken before anything changes, so the snapshot holds what is about to be lost.
  await snapshotWord(wordId, "update", session.name);

  await db
    .update(words)
    .set({
      termTibetan,
      ...wordIndexFields(termTibetan),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(words.id, wordId));

  // Definitions are positional, so the simplest correct save is replace-in-place.
  await db.delete(definitions).where(eq(definitions.wordId, wordId));
  if (rows.length > 0) {
    await db.insert(definitions).values(rows.map((row) => ({ ...row, wordId })));
  }

  await logActivity(session.name, "update", "word", wordId, termTibetan);
  revalidatePath("/");
  revalidatePath(`/word/${wordId}`);
  redirect(`/admin/words/${wordId}?saved=1`);
}

export async function deleteWordAction(wordId: number) {
  const session = await verifySession();

  const [existing] = await db
    .select({ termTibetan: words.termTibetan })
    .from(words)
    .where(eq(words.id, wordId));

  // Deletion cascades to every definition, so the snapshot is the only way back.
  await snapshotWord(wordId, "delete", session.name);

  await db.delete(words).where(eq(words.id, wordId));

  await logActivity(session.name, "delete", "word", wordId, existing?.termTibetan);
  revalidatePath("/");
  redirect("/admin");
}

// --- Collaborators ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteCollaboratorAction(formData: FormData) {
  const session = await verifySession();

  const email = requiredField(formData, "email").toLowerCase();
  const name = requiredField(formData, "collaboratorName");

  if (!EMAIL_PATTERN.test(email)) {
    redirect(`/admin?error=${encodeURIComponent("Имэйл хаяг буруу байна.")}`);
  }

  const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email));
  if (existing) {
    redirect(`/admin?error=${encodeURIComponent(`${email} аль хэдийн уригдсан байна.`)}`);
  }

  const password = generatePassword();
  await db.insert(admins).values({
    email,
    name,
    passwordHash: hashPassword(password),
    invitedBy: session.name,
  });

  const loginUrl = `${await resolveAppUrl()}/admin/login`;

  if (!isMailConfigured()) {
    // The account is real either way; hand the password back so it can be
    // relayed manually rather than lost.
    redirect(
      `/admin?notice=${encodeURIComponent(
        `${name} (${email}) нэмэгдлээ. Имэйл тохируулаагүй тул нууц үгийг өөрөө дамжуулна уу: ${password}`,
      )}`,
    );
  }

  try {
    await sendInviteEmail({ to: email, name, password, invitedBy: session.name, loginUrl });
  } catch {
    redirect(
      `/admin?notice=${encodeURIComponent(
        `${name} (${email}) нэмэгдлээ, гэвч имэйл илгээгдсэнгүй. Нууц үг: ${password}`,
      )}`,
    );
  }

  redirect(
    `/admin?notice=${encodeURIComponent(`${email} хаяг руу урилга илгээлээ.`)}`,
  );
}

export async function removeCollaboratorAction(adminId: number) {
  const session = await verifySession();

  // Enforced here, not just by hiding the button — the action is reachable directly.
  if (!canManageCollaborators(session)) {
    redirect(`/admin?error=${encodeURIComponent("Танд хамтран ажиллагчийг хасах эрх байхгүй.")}`);
  }

  const [target] = await db.select().from(admins).where(eq(admins.id, adminId));
  if (!target) redirect("/admin");

  // Guard against removing the account you are currently signed in with.
  if (target.name === session.name) {
    redirect(`/admin?error=${encodeURIComponent("Өөрийн бүртгэлийг устгах боломжгүй.")}`);
  }

  await db.delete(admins).where(eq(admins.id, adminId));
  redirect(`/admin?notice=${encodeURIComponent(`${target.email} хасагдлаа.`)}`);
}

async function resolveAppUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

// --- Bulk import ---

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function importWorkbookAction(formData: FormData) {
  const session = await verifySession();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/admin?error=${encodeURIComponent("Файл сонгоно уу.")}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    redirect(`/admin?error=${encodeURIComponent("Файл хэт том байна (дээд хэмжээ 4MB).")}`);
  }
  // The original filename, not just row counts, so /admin/imports can answer
  // "who uploaded which book" — the actual question this gets asked.
  const fileName = cleanFileName(file.name);

  let grouped: Map<string, { term: string; rows: { sourceRaw: string; definitionText: string }[] }>;
  let skipped: number;
  try {
    ({ grouped, skipped } = await parseWorkbook(await file.arrayBuffer()));
  } catch {
    redirect(`/admin?error=${encodeURIComponent("Файлыг уншиж чадсангүй. .xlsx файл эсэхийг шалгана уу.")}`);
  }

  if (grouped.size === 0) {
    redirect(`/admin?error=${encodeURIComponent("Файлаас өгөгдөл олдсонгүй.")}`);
  }

  // Keyed on the normalised form, so a word already contributed by another
  // source is found even if this book spells it slightly differently.
  const keys = Array.from(grouped.keys());
  const existing = new Map<string, number>();

  // Look up existing terms in chunks so the SQL variable limit is never hit.
  for (let i = 0; i < keys.length; i += 200) {
    const chunk = keys.slice(i, i + 200);
    const found = await db
      .select({ id: words.id, termKey: words.termKey })
      .from(words)
      .where(inArray(words.termKey, chunk));
    for (const row of found) if (row.termKey) existing.set(row.termKey, row.id);
  }

  const newKeys = keys.filter((key) => !existing.has(key));
  const newKeySet = new Set(newKeys);
  for (let i = 0; i < newKeys.length; i += 100) {
    const chunk = newKeys.slice(i, i + 100);
    const inserted = await db
      .insert(words)
      .values(
        chunk.map((key) => {
          const term = grouped.get(key)!.term;
          return { termTibetan: term, ...wordIndexFields(term) };
        }),
      )
      .returning({ id: words.id, termKey: words.termKey });
    for (const row of inserted) if (row.termKey) existing.set(row.termKey, row.id);
  }

  // Existing entries get their new definitions appended after the ones already there.
  const nextNumber = new Map<number, number>();
  const appendIds = keys.filter((k) => !newKeySet.has(k)).map((k) => existing.get(k)!);
  for (let i = 0; i < appendIds.length; i += 200) {
    const chunk = appendIds.slice(i, i + 200);
    const counts = await db
      .select({ wordId: definitions.wordId, max: sql<number>`max(${definitions.meaningNumber})` })
      .from(definitions)
      .where(inArray(definitions.wordId, chunk))
      .groupBy(definitions.wordId);
    for (const row of counts) nextNumber.set(row.wordId, Number(row.max));
  }

  // Resolved once across the whole file: same source name anywhere in the
  // workbook lands on the same row in `sources`, a name not seen before creates one.
  const allSourceTexts = Array.from(grouped.values()).flatMap((group) =>
    group.rows.map((row) => row.sourceRaw),
  );
  const resolvedSources = await resolveSources(allSourceTexts);

  const incoming: { wordId: number; sourceId: number; definitionText: string }[] = [];
  for (const [key, group] of grouped) {
    const wordId = existing.get(key)!;
    for (const row of group.rows) {
      const source = resolvedSources.get(normalizeSourceKey(row.sourceRaw))!;
      incoming.push({ wordId, sourceId: source.id, definitionText: row.definitionText });
    }
  }

  // Rows that contradict what another file already recorded for the same
  // word from the same book are held back rather than written in, so the
  // dictionary never publishes two rival texts attributed to one source.
  const { accepted, duplicateCount, conflicts } = await splitOutConflicts(incoming);

  const sourceTitleById = new Map(
    Array.from(resolvedSources.values()).map((source) => [source.id, source.title]),
  );

  const pending: {
    wordId: number;
    meaningNumber: number;
    source: string;
    sourceId: number;
    definitionText: string;
    definitionTextLower: string;
    sourceFile: string;
    createdBy: string;
  }[] = [];
  const perWordCounter = new Map<number, number>();
  for (const row of accepted) {
    const counter = (perWordCounter.get(row.wordId) ?? nextNumber.get(row.wordId) ?? 0) + 1;
    perWordCounter.set(row.wordId, counter);
    pending.push({
      wordId: row.wordId,
      meaningNumber: counter,
      source: sourceTitleById.get(row.sourceId) ?? "",
      sourceId: row.sourceId,
      definitionText: row.definitionText,
      definitionTextLower: normalizeForSearch(row.definitionText),
      sourceFile: fileName,
      createdBy: session.name,
    });
  }

  for (let i = 0; i < pending.length; i += 100) {
    await db.insert(definitions).values(pending.slice(i, i + 100));
  }

  await recordConflicts(conflicts, session.name, fileName);

  const summary =
    `${newKeys.length} шинэ үг, ${keys.length - newKeys.length} одоо байгаа үгэнд ` +
    `нийт ${pending.length} тодорхойлолт нэмэв` +
    (duplicateCount > 0 ? `, ${duplicateCount} давхардсан` : "") +
    (conflicts.length > 0 ? `, ${conflicts.length} зөрчилтэй` : "") +
    (skipped > 0 ? ` (${skipped} мөр алгассан)` : "");

  if (conflicts.length > 0) {
    await notifyAboutConflicts(conflicts, session.name, fileName);
  }

  // Filename is stored in its own column (shown on /admin/imports) but kept
  // out of the on-page notice — the person who just uploaded already knows
  // what they uploaded; it matters to whoever reviews the history later.
  await logActivity(session.name, "import", "import", pending.length, summary, fileName);
  revalidatePath("/");
  redirect(`/admin?notice=${encodeURIComponent(summary)}`);
}

/**
 * A single message per import to everyone with a stake in the disagreement:
 * whoever just uploaded, whoever contributed the wording it clashes with, and
 * the owners who arbitrate. Failure to send never fails the import — the
 * conflicts are already saved and visible on /admin/conflicts.
 */
async function notifyAboutConflicts(
  conflicts: PendingConflict[],
  uploadedBy: string,
  fileName: string | null,
) {
  if (!isMailConfigured()) return;

  // The owners, plus whoever just uploaded — deliberately NOT whoever
  // contributed the wording being contradicted. They find out from the owner
  // if the decision affects their work, rather than being pulled into every
  // clash someone else's spreadsheet happens to cause.
  const recipients = new Set(listOwnerEmails());

  // ADMIN_USERS accounts have no email; only invited collaborators are mailable.
  const [uploader] = await db
    .select({ email: admins.email })
    .from(admins)
    .where(eq(admins.name, uploadedBy));
  if (uploader) recipients.add(uploader.email);

  if (recipients.size === 0) return;

  const wordIds = Array.from(new Set(conflicts.map((c) => c.wordId))).slice(0, 5);
  const sampleWords = await db
    .select({ id: words.id, termTibetan: words.termTibetan })
    .from(words)
    .where(inArray(words.id, wordIds));
  const termById = new Map(sampleWords.map((w) => [w.id, w.termTibetan]));

  const sourceIds = Array.from(new Set(conflicts.map((c) => c.sourceId)));
  const sourceRows = await db
    .select({ id: sources.id, title: sources.title })
    .from(sources)
    .where(inArray(sources.id, sourceIds));
  const sourceById = new Map(sourceRows.map((s) => [s.id, s.title]));

  const samples = conflicts.slice(0, 5).map((conflict) => ({
    term: termById.get(conflict.wordId) ?? `#${conflict.wordId}`,
    source: sourceById.get(conflict.sourceId) ?? "",
  }));

  try {
    await sendConflictEmail({
      to: Array.from(recipients),
      uploadedBy,
      fileName,
      conflictCount: conflicts.length,
      reviewUrl: `${await resolveAppUrl()}/admin/conflicts`,
      samples,
    });
  } catch {
    // Deliberately swallowed: the import succeeded and the conflicts are
    // recorded. Failing here would roll the admin into an error page over a
    // notification, and the review page shows the same information.
  }
}

// --- History ---

export async function restoreRevisionAction(revisionId: number) {
  const session = await verifySession();

  let restored: { wordId: number; termTibetan: string; recreated: boolean };
  try {
    restored = await restoreRevision(revisionId, session.name);
  } catch (error) {
    const message = userFacingMessage(error, "Сэргээж чадсангүй.");
    redirect(`/admin/history?error=${encodeURIComponent(message)}`);
  }

  await logActivity(
    session.name,
    "update",
    "word",
    restored.wordId,
    `restored: ${restored.termTibetan}`,
  );
  revalidatePath("/");
  revalidatePath(`/word/${restored.wordId}`);
  redirect(
    `/admin/words/${restored.wordId}?notice=${encodeURIComponent(
      restored.recreated
        ? "Устгасан үгийг сэргээлээ."
        : "Өмнөх хувилбарыг сэргээлээ.",
    )}`,
  );
}

// --- Conflicts ---

export async function keepIncomingDefinitionAction(conflictId: number) {
  const session = await verifySession();

  let wordId: number;
  try {
    ({ termId: wordId } = await resolveConflictKeepIncoming(conflictId, session.name));
  } catch (error) {
    const message = userFacingMessage(error, "Зөрчлийг шийдэж чадсангүй.");
    redirect(`/admin/conflicts?error=${encodeURIComponent(message)}`);
  }

  await logActivity(session.name, "update", "definition", conflictId, "conflict: kept incoming");
  revalidatePath("/");
  revalidatePath(`/word/${wordId}`);
  redirect(`/admin/conflicts?notice=${encodeURIComponent("Шинэ хувилбарыг үлдээлээ.")}`);
}

export async function keepExistingDefinitionAction(conflictId: number) {
  const session = await verifySession();

  try {
    await resolveConflictKeepExisting(conflictId);
  } catch (error) {
    const message = userFacingMessage(error, "Зөрчлийг шийдэж чадсангүй.");
    redirect(`/admin/conflicts?error=${encodeURIComponent(message)}`);
  }

  await logActivity(session.name, "update", "definition", conflictId, "conflict: kept existing");
  revalidatePath("/admin/conflicts");
  redirect(`/admin/conflicts?notice=${encodeURIComponent("Одоо байгаа хувилбарыг үлдээлээ.")}`);
}

// --- Sources ---

export async function renameSourceAction(sourceId: number, formData: FormData) {
  const session = await verifySession();
  const newTitle = requiredField(formData, "title");

  // renameSource falls through to mergeSources when the new title collides
  // with an existing source, so it can fail the same way an explicit merge
  // can — another admin removing that source first. Same guard as below.
  let resultId: number;
  try {
    resultId = await renameSource(sourceId, newTitle);
  } catch (error) {
    const message = userFacingMessage(error, "Нэрийг өөрчилж чадсангүй.");
    redirect(`/admin/sources?error=${encodeURIComponent(message)}`);
  }

  const merged = resultId !== sourceId;

  await logActivity(
    session.name,
    "update",
    "source",
    resultId,
    merged ? `merged into "${newTitle}"` : newTitle,
  );
  revalidatePath("/");
  revalidatePath("/admin/sources");
  redirect(
    `/admin/sources?notice=${encodeURIComponent(
      merged
        ? `Ижил нэртэй эх сурвалж байсан тул нэгтгэлээ: "${newTitle}".`
        : `"${newTitle}" болгож нэрлэлээ.`,
    )}`,
  );
}

export async function mergeSourcesIntoAction(fromId: number, formData: FormData) {
  const session = await verifySession();
  const intoId = Number(requiredField(formData, "targetSourceId"));

  if (!Number.isInteger(intoId) || intoId === fromId) {
    redirect(`/admin/sources?error=${encodeURIComponent("Хүчинтэй сурвалж сонгоно уу.")}`);
  }

  try {
    await mergeSources(fromId, intoId);
  } catch (error) {
    // The target can vanish between page load and submit (e.g. someone else
    // just merged/deleted it) — same stale-selection race deleteSourceAction
    // already guards against, so it gets the same friendly-message treatment
    // instead of crashing to Next's generic error page.
    const message = userFacingMessage(error, "Нэгтгэж чадсангүй.");
    redirect(`/admin/sources?error=${encodeURIComponent(message)}`);
  }

  await logActivity(session.name, "delete", "source", fromId, `merged into #${intoId}`);
  revalidatePath("/");
  revalidatePath("/admin/sources");
  redirect(`/admin/sources?notice=${encodeURIComponent("Эх сурвалжуудыг нэгтгэлээ.")}`);
}

export async function deleteSourceAction(sourceId: number) {
  const session = await verifySession();

  try {
    await deleteSourceIfUnused(sourceId);
  } catch (error) {
    const message = userFacingMessage(error, "Устгаж чадсангүй.");
    redirect(`/admin/sources?error=${encodeURIComponent(message)}`);
  }

  await logActivity(session.name, "delete", "source", sourceId);
  revalidatePath("/admin/sources");
  redirect(`/admin/sources?notice=${encodeURIComponent("Эх сурвалжийг устгалаа.")}`);
}
