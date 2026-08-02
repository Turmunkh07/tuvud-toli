import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const COOKIE_NAME = "toli_admin_session";
const SESSION_DURATION = "7d";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const encodedSecret = new TextEncoder().encode(env.AUTH_SECRET);

export type SessionPayload = {
  name: string;
  /** Null for ADMIN_USERS accounts, which log in by name and have no email. */
  email: string | null;
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(encodedSecret);
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedSecret, { algorithms: ["HS256"] });
    if (typeof payload.name !== "string") return null;
    // Sessions issued before email was carried simply lack the claim.
    const email = typeof payload.email === "string" ? payload.email : null;
    return { name: payload.name, email };
  } catch {
    return null;
  }
}

export async function createSession(name: string, email: string | null) {
  const token = await encrypt({ name, email });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export { COOKIE_NAME };
