import "server-only";
import ExcelJS from "exceljs";

export type ImportRow = { source: string; definitionText: string };

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
 * Rows are grouped by Tibetan term so one word ends up with several definitions
 * rather than several duplicate entries. Rows without a Tibetan term or without
 * a definition are skipped and reported back to the caller.
 */
export async function parseWorkbook(
  data: ArrayBuffer,
): Promise<{ grouped: Map<string, ImportRow[]>; skipped: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);

  const sheet = workbook.worksheets[0];
  const grouped = new Map<string, ImportRow[]>();
  let skipped = 0;

  if (!sheet) return { grouped, skipped };

  sheet.eachRow((row, rowNumber) => {
    const source = cellText(row, 1);
    const term = cellText(row, 2);
    const definitionText = cellText(row, 3);

    // A first row with no Tibetan in column B is a header, not data.
    if (rowNumber === 1 && !TIBETAN_CHARS.test(term)) return;

    // All three columns are required, so an incomplete row is reported, not guessed at.
    if (!source || !term || !definitionText) {
      skipped += 1;
      return;
    }

    const rows = grouped.get(term) ?? [];
    rows.push({ source, definitionText });
    grouped.set(term, rows);
  });

  return { grouped, skipped };
}
