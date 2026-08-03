import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { listEnvAdminNames } from "@/lib/admin-users";
import type { SessionPayload } from "@/lib/session";

/**
 * A session's JWT can stay cryptographically valid for up to 7 days after the
 * account it names is removed — the token is just a signed claim, not a live
 * pointer to the database. Without this check, "remove collaborator" would
 * only take effect once their cookie happened to expire or they logged out
 * themselves. This makes removal take effect on their very next request.
 */
export async function isSessionAccountValid(session: SessionPayload): Promise<boolean> {
  if (session.email) {
    const [row] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.email, session.email));
    return Boolean(row);
  }
  return listEnvAdminNames().includes(session.name);
}
