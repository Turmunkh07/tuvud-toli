import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";

/** Every xlsx import ever run, newest first — who, when, and (in summary) which file. */
export async function listImportHistory() {
  return db
    .select({
      id: activityLog.id,
      actor: activityLog.actor,
      summary: activityLog.summary,
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(eq(activityLog.action, "import"))
    .orderBy(desc(activityLog.id));
}
