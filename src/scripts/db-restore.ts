/**
 * Puts a backup file back into the database.
 *
 *   npm run db:restore -- backups/toli-....json            # dry run, reports only
 *   npm run db:restore -- backups/toli-....json --confirm  # actually writes
 *
 * Restores only the tables present in the file, replacing their contents.
 * Deliberately two-step: an accidental restore is itself data loss.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "fs";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { connect, type Backup } from "./db-backup";

/**
 * Tables ordered so a parent is always written before anything referencing
 * it. Restoring alphabetically fails on foreign keys — `definitions` would
 * land before the `words` it points at.
 */
function dependencyOrder(tables: string[]): string[] {
  const dependsOn = new Map<string, string[]>();

  for (const value of Object.values(schema)) {
    try {
      const cfg = getTableConfig(value as SQLiteTable);
      dependsOn.set(
        cfg.name,
        cfg.foreignKeys
          .map((fk) => getTableConfig(fk.reference().foreignTable as SQLiteTable).name)
          .filter((name) => name !== cfg.name), // self-references need no ordering
      );
    } catch {
      // Not a table.
    }
  }

  const ordered: string[] = [];
  const remaining = new Set(tables);

  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) =>
      (dependsOn.get(table) ?? []).every((dep) => !remaining.has(dep)),
    );
    // A cycle (or a table drizzle doesn't know) must still be restored;
    // emitting the rest in place is better than looping forever.
    const next = ready.length > 0 ? ready : [...remaining];
    for (const table of next) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  return ordered;
}

async function main() {
  const path = process.argv[2];
  const confirmed = process.argv.includes("--confirm");

  if (!path || path.startsWith("--")) {
    console.error("Usage: npm run db:restore -- <backup.json> [--confirm]");
    process.exit(1);
  }

  const backup = JSON.parse(readFileSync(path, "utf8")) as Backup;
  const client = connect();

  try {
    console.log(`Backup taken ${backup.takenAt}\n`);

    for (const [table, rows] of Object.entries(backup.tables)) {
      const current = await client
        .execute(`SELECT COUNT(*) AS n FROM "${table}"`)
        .then((r) => Number(r.rows[0].n))
        .catch(() => -1);
      const currentLabel = current < 0 ? "missing" : `${current} rows`;
      console.log(`  ${table.padEnd(24)} ${currentLabel}  ->  ${rows.length} rows`);
    }

    if (!confirmed) {
      console.log("\nDry run. Re-run with --confirm to write these rows.");
      return;
    }

    console.log("\nRestoring...");
    const order = dependencyOrder(Object.keys(backup.tables));

    // Children are cleared before their parents, so no delete trips a
    // foreign key on the way out.
    for (const table of [...order].reverse()) {
      await client.execute(`DELETE FROM "${table}"`);
    }

    for (const table of order) {
      const rows = backup.tables[table] ?? [];
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        const placeholders = columns.map(() => "?").join(", ");
        const quoted = columns.map((c) => `"${c}"`).join(", ");
        await client.execute({
          sql: `INSERT INTO "${table}" (${quoted}) VALUES (${placeholders})`,
          args: columns.map((c) => row[c] as never),
        });
      }
      console.log(`  ${table}: ${rows.length} rows restored`);
    }
    console.log("\nDone.");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
