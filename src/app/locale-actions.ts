"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n";

/**
 * Flips the interface language. Bound to a form rather than driven by client
 * JS, since the page text itself is server-rendered and has to come from a
 * real round trip either way.
 *
 * Setting the cookie alone is not enough: Next does not automatically
 * re-render a route's Server Components just because a Server Action ran
 * against it — that only happens for data it knows was invalidated.
 * `revalidatePath("/", "layout")` marks the root layout and everything
 * beneath it stale, which is every page here, since every one of them reads
 * this same cookie for its own text.
 */
export async function setLocaleAction(formData: FormData) {
  const requested = formData.get("locale");
  const locale: Locale = requested === "en" ? "en" : "mn";

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
