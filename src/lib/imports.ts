import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";

/**
 * Capped because activity_log grows with every admin action app-wide, not
 * just imports — an uncapped read would get steadily heavier for the life of
 * the dictionary. The page says so when the cap is reached.
 */
export const IMPORT_HISTORY_LIMIT = 100;

/** Most recent xlsx imports, newest first — who ran it, which file, and the result. */
export async function listImportHistory(limit = IMPORT_HISTORY_LIMIT) {
  return db
    .select({
      id: activityLog.id,
      actor: activityLog.actor,
      summary: activityLog.summary,
      fileName: activityLog.fileName,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.action, "import"))
    .orderBy(desc(activityLog.id))
    .limit(limit);
}
