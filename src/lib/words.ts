import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { words } from "@/db/schema";

export async function getWordById(id: number) {
  return db.query.words.findFirst({
    where: eq(words.id, id),
    with: {
      definitions: {
        orderBy: (definitions, { asc }) => [asc(definitions.meaningNumber)],
      },
    },
  });
}
