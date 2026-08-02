import "server-only";
import { and, eq, gte, lt, count } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

/** Failed attempts allowed from one IP inside WINDOW_MS before it is locked out. */
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Throttling is keyed on IP rather than username on purpose: locking a username
 * would let anyone lock a real admin out of their own dictionary by guessing at
 * it repeatedly. The trade-off is that an attacker with many IPs is not stopped
 * by this alone — it raises the cost of casual guessing, it is not a substitute
 * for strong passwords.
 */
export async function getClientIdentifier(): Promise<string> {
  const headerList = await headers();
  // Vercel sets both; x-forwarded-for may be a comma-separated chain, and the
  // client-controlled part is at the end, so the first entry is the real one.
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitState = { limited: boolean; retryAfterMinutes: number };

export async function checkRateLimit(identifier: string): Promise<RateLimitState> {
  const windowStart = Date.now() - WINDOW_MS;

  // Opportunistic cleanup keeps the table from growing without a cron job.
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, windowStart));

  const [row] = await db
    .select({ value: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        gte(loginAttempts.attemptedAt, windowStart),
      ),
    );

  const attempts = row?.value ?? 0;
  if (attempts < MAX_ATTEMPTS) return { limited: false, retryAfterMinutes: 0 };

  // Report time remaining from the oldest attempt still inside the window.
  const [oldest] = await db
    .select({ attemptedAt: loginAttempts.attemptedAt })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, identifier),
        gte(loginAttempts.attemptedAt, windowStart),
      ),
    )
    .orderBy(loginAttempts.attemptedAt)
    .limit(1);

  const unlocksAt = (oldest?.attemptedAt ?? Date.now()) + WINDOW_MS;
  const retryAfterMinutes = Math.max(1, Math.ceil((unlocksAt - Date.now()) / 60000));

  return { limited: true, retryAfterMinutes };
}

export async function recordFailedAttempt(identifier: string) {
  await db.insert(loginAttempts).values({ identifier, attemptedAt: Date.now() });
}

export async function clearAttempts(identifier: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
}
