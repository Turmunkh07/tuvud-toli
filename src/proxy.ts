import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decrypt } from "@/lib/session";
import { isSessionAccountValid } from "@/lib/session-validity";

const LOGIN_PATH = "/admin/login";

/**
 * This does a database check on every /admin request, which Next's own docs
 * advise against in Proxy for latency at scale. Deliberate here, for a
 * reason beyond scale: a JWT that decrypts fine can still name an account
 * that was just removed, and if only the DAL rejected it (the "Secure" check
 * elsewhere in this app), Proxy would keep waving that same stale cookie
 * through as "logged in" — sending a removed collaborator's browser back and
 * forth between /admin (DAL: invalid, redirect to login) and /admin/login
 * (Proxy: session looks valid, redirect to /admin) forever. Proxy is the only
 * layer that can clear the cookie on its response, which is what actually
 * breaks that loop. At this app's scale (a handful of admins) the extra query
 * is immaterial.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let session = await decrypt(token);
  let stale = false;

  if (session && !(await isSessionAccountValid(session))) {
    session = null;
    stale = true;
  }

  const isLoginPage = pathname === LOGIN_PATH;
  let response: NextResponse;

  if (!session && !isLoginPage) {
    response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  } else if (session && isLoginPage) {
    response = NextResponse.redirect(new URL("/admin", request.url));
  } else {
    response = NextResponse.next();
  }

  if (stale) response.cookies.delete(COOKIE_NAME);
  return response;
}

export const config = {
  matcher: "/admin/:path*",
};
