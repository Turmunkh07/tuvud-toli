import { redirect } from "next/navigation";
import { getRandomWordId } from "@/lib/words";

// A different entry on every visit, so this must never be cached.
export const dynamic = "force-dynamic";

export async function GET() {
  const id = await getRandomWordId();

  // An empty dictionary has nothing to show; home explains itself better than
  // a 404 would.
  redirect(id === null ? "/" : `/word/${id}`);
}
