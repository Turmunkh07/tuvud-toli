import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { isSessionAccountValid } from "@/lib/session-validity";

/**
 * The authoritative check every admin page/action calls. Proxy already
 * screens out sessions for removed accounts (and clears the stale cookie —
 * see proxy.ts for why that has to happen there, not here); this re-checks
 * for the same reason Next's own auth guide recommends not relying on Proxy
 * alone: it's a second, independent gate close to the data itself. It cannot
 * delete the cookie (Server Component renders aren't allowed to touch
 * cookies), but redirecting is sufficient — Proxy clears it on the very next
 * request regardless of whether this code path is ever reached.
 */
export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decrypt(token);
  if (!session) redirect("/admin/login");
  if (!(await isSessionAccountValid(session))) redirect("/admin/login");
  return session;
});
