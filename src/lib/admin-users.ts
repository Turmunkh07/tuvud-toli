import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { env } from "@/lib/env";
import { verifyPassword } from "@/lib/password";

type EnvAdmin = { name: string; password: string };

export type AuthenticatedAdmin = { name: string; email: string | null };

function loadEnvAdmins(): EnvAdmin[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(env.ADMIN_USERS);
  } catch {
    throw new Error('ADMIN_USERS must be valid JSON, e.g. [{"name":"Alice","password":"secret"}]');
  }
  if (!Array.isArray(parsed)) {
    throw new Error("ADMIN_USERS must be a JSON array");
  }
  return parsed as EnvAdmin[];
}

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = createHash("sha256").update(a).digest();
  const bufB = createHash("sha256").update(b).digest();
  return timingSafeEqual(bufA, bufB);
}

/**
 * Invited collaborators log in with their email; the ADMIN_USERS entries log in
 * with their name. Keeping the env path alive means a broken or emptied admins
 * table can never lock everyone out of the dictionary.
 */
export async function verifyAdminCredentials(
  identifier: string,
  password: string,
): Promise<AuthenticatedAdmin | null> {
  const trimmed = identifier.trim();

  if (trimmed.includes("@")) {
    const [record] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, trimmed.toLowerCase()));

    if (record && verifyPassword(password, record.passwordHash)) {
      await db
        .update(admins)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(admins.id, record.id));
      return { name: record.name, email: record.email };
    }
    return null;
  }

  const envAdmin = loadEnvAdmins().find((admin) => admin.name === trimmed);
  if (envAdmin && timingSafeEqualString(envAdmin.password, password)) {
    return { name: envAdmin.name, email: null };
  }

  return null;
}
