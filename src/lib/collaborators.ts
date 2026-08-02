import "server-only";
import { db } from "@/db";
import { admins } from "@/db/schema";

/** Password hashes are deliberately not selected — nothing needs them for display. */
export async function listCollaborators() {
  return db
    .select({
      id: admins.id,
      email: admins.email,
      name: admins.name,
      invitedBy: admins.invitedBy,
      lastLoginAt: admins.lastLoginAt,
    })
    .from(admins)
    .orderBy(admins.name);
}
