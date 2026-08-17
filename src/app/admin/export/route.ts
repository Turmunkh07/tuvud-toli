import ExcelJS from "exceljs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { words, definitions, sources } from "@/db/schema";
import { verifySession } from "@/lib/dal";

/**
 * The whole dictionary as one workbook, in exactly the three-column shape the
 * importer accepts — so an export can be re-imported, and the corpus is never
 * trapped in a single hosted database with no way out.
 *
 * Streaming is not worth it here: the row count is bounded by what a small
 * team can hand-enter, and generating in memory keeps this a dozen lines.
 */
export async function GET() {
  await verifySession();

  const rows = await db
    .select({
      sourceTitle: sources.title,
      sourceFallback: definitions.source,
      termTibetan: words.termTibetan,
      definitionText: definitions.definitionText,
      sortKey: words.sortKey,
      meaningNumber: definitions.meaningNumber,
    })
    .from(definitions)
    .innerJoin(words, eq(definitions.wordId, words.id))
    .leftJoin(sources, eq(definitions.sourceId, sources.id))
    // Same order the dictionary reads in, so a diff between two exports is legible.
    .orderBy(asc(words.sortKey), asc(definitions.meaningNumber));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Толь");

  sheet.columns = [
    { header: "Эх сурвалж", key: "source", width: 42 },
    { header: "Төвөд үг", key: "term", width: 26 },
    { header: "Тодорхойлолт (кирилл)", key: "definition", width: 64 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getColumn("definition").alignment = { wrapText: true, vertical: "top" };

  for (const row of rows) {
    sheet.addRow({
      source: row.sourceTitle ?? row.sourceFallback,
      term: row.termTibetan,
      definition: row.definitionText,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="toli-export-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
