import ExcelJS from "exceljs";
import { verifySession } from "@/lib/dal";

/**
 * Serves a blank import template. Generated on request rather than committed as
 * a binary so the columns can never drift from what lib/xlsx-import.ts expects.
 *
 * Header-only by design: a sample data row would be imported verbatim by anyone
 * who filled the sheet in without deleting it first.
 */
export async function GET() {
  await verifySession();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Толь");

  sheet.columns = [
    { header: "Эх сурвалж", key: "source", width: 42 },
    { header: "Төвөд үг", key: "term", width: 26 },
    { header: "Тодорхойлолт (кирилл)", key: "definition", width: 64 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getColumn("definition").alignment = { wrapText: true, vertical: "top" };

  const buffer = await workbook.xlsx.writeBuffer();

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="toli-import-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
