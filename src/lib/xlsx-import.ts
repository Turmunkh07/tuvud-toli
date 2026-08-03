import "server-only";
import ExcelJS from "exceljs";
import { normalizeTibetanTerm } from "@/lib/tibetan";

export type ImportRow = { sourceRaw: string; definitionText: string };

/** Tibetan block, used to tell a real data row from a header row. */
const TIBETAN_CHARS = /[ༀ-࿿]/;

function cellText(row: ExcelJS.Row, column: number): string {
  const value = row.getCell(column).value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // Rich text, hyperlinks and formula results all expose their text differently.
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return String(value.result ?? "").trim();
    return "";
  }
  return String(value).trim();
}

/**
 * Reads a workbook whose first sheet has exactly three columns:
 * A = source, B = Tibetan word, C = Cyrillic definition.
 *
 * The source text on each row is resolved against the `sources` table by the
 * caller (see lib/sources.ts) rather than stored verbatim — so "same name,
 * same bucket; new name, new bucket" holds regardless of how a row spells it
 * (case, whitespace). This function only groups by *word*; source resolution
 * happens afterwards because it needs a database round trip.
 *
 * Rows are grouped by *normalised* Tibetan term, so spelling variants of the
 * same headword collapse into one entry with several definitions instead of
 * several near-identical entries. Rows missing any of the three columns are
 * skipped and reported back to the caller.
 */
export type ParsedGroup = {
  /** First spelling seen for this key, used for display. */
  term: string;
  rows: ImportRow[];
};

export async function parseWorkbook(
  data: ArrayBuffer,
): Promise<{ grouped: Map<string, ParsedGroup>; skipped: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  const sheet = workbook.worksheets[0];
  const grouped = new Map<string, ParsedGroup>();
  let skipped = 0;

  if (!sheet) return { grouped, skipped };

  sheet.eachRow((row, rowNumber) => {
    const sourceRaw = cellText(row, 1);
    const term = cellText(row, 2);
    const definitionText = cellText(row, 3);

    // A first row with no Tibetan in column B is a header, not data.
    if (rowNumber === 1 && !TIBETAN_CHARS.test(term)) return;

    // All three columns are required, so an incomplete row is reported, not guessed at.
    if (!sourceRaw || !term || !definitionText) {
      skipped += 1;
      return;
    }

    const key = normalizeTibetanTerm(term);
    if (!key) {
      skipped += 1;
      return;
    }

    const group = grouped.get(key) ?? { term, rows: [] };
    group.rows.push({ sourceRaw, definitionText });
    grouped.set(key, group);
  });

  return { grouped, skipped };
}
