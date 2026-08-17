/**
 * Sample data for local development only.
 *
 * These are well-known Tibetan Buddhist/philosophical terms with short Mongolian
 * glosses. They are placeholders to exercise the UI — the definitions are not
 * drawn from the cited works verbatim and the sources carry no page numbers.
 * Replace this with real lexicographic data (or an .xlsx import) before launch.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { words, definitions, sources } from "./schema";
import { normalizeForSearch } from "../lib/normalize";
import { wordIndexFields } from "../lib/tibetan";

// Inlined rather than imported from lib/sources.ts, which is guarded with
// 'server-only' and throws when loaded outside the Next.js bundler.
function normalizeSourceKey(title: string): string {
  return title.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error(
    "Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Copy .env.example to .env.local and fill it in.",
  );
}

const client = createClient({ url, authToken });
const db = drizzle(client);

type SeedWord = {
  termTibetan: string;
  definitions: { source: string; definitionText: string }[];
};

const seedData: SeedWord[] = [
  {
    termTibetan: "ཆོས་",
    definitions: [
      {
        source: "Сумати Ратна. Төвөд-монгол толь. 1959",
        definitionText: "Ном, шашны сургаал; юмс үзэгдлийн мөн чанар.",
      },
      {
        source: "Das, S. C. A Tibetan-English Dictionary. 1902",
        definitionText: "Бурханы номлол, сургаал.",
      },
    ],
  },
  {
    termTibetan: "སེམས་",
    definitions: [
      {
        source: "Сумати Ратна. Төвөд-монгол толь. 1959",
        definitionText: "Сэтгэл, оюун ухаан; мэдрэх чадвар.",
      },
    ],
  },
  {
    termTibetan: "བླ་མ་",
    definitions: [
      {
        source: "Jäschke, H. A. A Tibetan-English Dictionary. 1881",
        definitionText: "Багш, лам; шашны удирдагч.",
      },
    ],
  },
  {
    termTibetan: "སྟོང་པ་ཉིད་",
    definitions: [
      {
        source: "Цэрэнсодном, Д. Монголын уран зохиолын товч түүх. 1987",
        definitionText: "Хоосон чанар; бие даасан мөн чанаргүй байдал.",
      },
    ],
  },
  {
    termTibetan: "བྱང་ཆུབ་སེམས་དཔའ་",
    definitions: [
      {
        source: "Das, S. C. A Tibetan-English Dictionary. 1902",
        definitionText: "Бодьсадва; гэгээрэлд хүрэхээр тангараглагч.",
      },
    ],
  },
  {
    termTibetan: "དགེ་སློང་",
    definitions: [
      {
        source: "Сумати Ратна. Төвөд-монгол толь. 1959",
        definitionText: "Гэлэн; бүрэн санваар хүртсэн лам.",
      },
    ],
  },
  {
    termTibetan: "རིག་པ་",
    definitions: [
      {
        source: "Jäschke, H. A. A Tibetan-English Dictionary. 1881",
        definitionText: "Ухаан, мэдлэг; ойлгох чадвар.",
      },
    ],
  },
  {
    termTibetan: "བཀྲ་ཤིས་",
    definitions: [
      {
        source: "Das, S. C. A Tibetan-English Dictionary. 1902",
        definitionText: "Ерөөл, өлзий хутаг; сайн сайхны тэмдэг.",
      },
    ],
  },
];

async function resolveSourceId(titleRaw: string): Promise<number> {
  const title = titleRaw.normalize("NFC").trim().replace(/\s+/gu, " ");
  const titleKey = normalizeSourceKey(title);

  const [existing] = await db.select().from(sources).where(eq(sources.titleKey, titleKey));
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(sources)
    .values({ title, titleKey })
    .returning({ id: sources.id });
  return inserted.id;
}

async function seed() {
  console.log("Clearing existing data...");
  await db.delete(definitions);
  await db.delete(words);
  await db.delete(sources);

  for (const word of seedData) {
    const [inserted] = await db
      .insert(words)
      .values({
        termTibetan: word.termTibetan,
        ...wordIndexFields(word.termTibetan),
      })
      .returning({ id: words.id });

    for (const [index, definition] of word.definitions.entries()) {
      const sourceId = await resolveSourceId(definition.source);
      await db.insert(definitions).values({
        wordId: inserted.id,
        meaningNumber: index + 1,
        source: definition.source,
        sourceId,
        definitionText: definition.definitionText,
        definitionTextLower: normalizeForSearch(definition.definitionText),
      });
    }

    console.log(`Seeded: ${word.termTibetan}`);
  }

  console.log(`Done. Seeded ${seedData.length} words.`);
  client.close();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
