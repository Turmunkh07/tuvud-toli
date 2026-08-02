import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";

export const verifySession = cache(async () => {
  const token = await getSessionCookie();
  const session = await decrypt(token);
  if (!session) redirect("/admin/login");
  return session;
});
