import { suggestWords } from "@/lib/search";

/** Nothing useful is searched for beyond this; the cap just bounds the query. */
const MAX_QUERY_LENGTH = 100;

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  if (query.length === 0) return Response.json({ items: [] });

  const items = await suggestWords(query);

  return Response.json(
    { items },
    {
      headers: {
        // The dictionary changes rarely, so letting a repeated prefix come
        // from cache keeps the type-ahead cheap on the free tier.
        "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
      },
    },
  );
}
