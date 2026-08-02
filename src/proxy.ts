import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, decrypt } from "@/lib/session";

const LOGIN_PATH = "/admin/login";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await decrypt(token);
  const isLoginPage = pathname === LOGIN_PATH;

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
