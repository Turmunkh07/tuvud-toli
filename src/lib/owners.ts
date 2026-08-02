import "server-only";
import type { SessionPayload } from "@/lib/session";

/**
 * Owners are the only accounts allowed to remove collaborators. Configured via
 * OWNER_IDENTIFIERS as a comma-separated list, matched case-insensitively
 * against either an admin's login email or their ADMIN_USERS name — the two
 * kinds of account log in with different identifiers.
 *
 *   OWNER_IDENTIFIERS=Turmunkh,l.rikchok@gmail.com
 */
function ownerIdentifiers(): string[] {
  return (process.env.OWNER_IDENTIFIERS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function canManageCollaborators(session: SessionPayload): boolean {
  const owners = ownerIdentifiers();

  // With no list configured, fall back to ADMIN_USERS accounts only. Defaulting
  // to "everyone" would silently void the restriction if the var went missing.
  if (owners.length === 0) return session.email === null;

  const name = session.name.trim().toLowerCase();
  const email = session.email?.trim().toLowerCase() ?? null;

  return owners.includes(name) || (email !== null && owners.includes(email));
}
