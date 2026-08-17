/**
 * The only sanctioned way to change this database's schema.
 *
 *   npm run db:migrate                       # apply, refusing anything risky
 *   npm run db:migrate -- --allow-data-loss  # override, after reading why
 *
 * Why this exists: `drizzle-kit push --force` means "auto-approve all data
 * loss statements" — its own help text says so. On SQLite, adding a NOT NULL
 * column can make drizzle-kit decide the table must be rebuilt, and it emits
 * `delete from <table>` to get there. With --force that runs silently. It
 * emptied `words` twice during development; once real entries exist it would
 * be unrecoverable.
 *
 * Rather than scrape drizzle-kit's output (it renders through a TUI that
 * produces nothing useful when piped), this compares the TypeScript schema
 * against the live database and refuses the two shapes that cause loss:
 *
 *   1. adding a NOT NULL column to a table that already has rows
 *   2. removing a column or table that still holds data
 *
 * Whatever it does allow, it backs up first and verifies row counts after.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { execFileSync } from "child_process";
import { join } from "path";
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Client } from "@libsql/client";
import * as schema from "../db/schema";
import { connect, writeBackup, listTables } from "./db-backup";

type LiveColumn = { name: string; notNull: boolean };

async function liveColumns(client: Client, table: string): Promise<LiveColumn[]> {
  const result = await client.execute(`PRAGMA table_info('${table}')`);
  return result.rows.map((row) => ({
    name: String(row.name),
    notNull: Number(row.notnull) === 1,
  }));
}

async function rowCount(client: Client, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
  return Number(result.rows[0].n);
}

/** Every table drizzle declares, keyed by its SQL name. */
function declaredTables() {
  const tables = new Map<string, ReturnType<typeof getTableConfig>>();
  for (const value of Object.values(schema)) {
    try {
      const cfg = getTableConfig(value as SQLiteTable);
      tables.set(cfg.name, cfg);
    } catch {
      // Not a table (relations, helpers, constants).
    }
  }
  return tables;
}

async function findRisks(client: Client) {
  const risks: string[] = [];
  const declared = declaredTables();
  const live = new Set(await listTables(client));

  for (const [name, cfg] of declared) {
    if (!live.has(name)) continue; // brand-new table: nothing to lose
    const rows = await rowCount(client, name);
    if (rows === 0) continue; // empty table: a rebuild costs nothing

    const existing = await liveColumns(client, name);
    const existingNames = new Set(existing.map((c) => c.name));

    for (const column of cfg.columns) {
      if (existingNames.has(column.name)) continue;
      if (column.notNull) {
        risks.push(
          `${name}.${column.name} is a new NOT NULL column on a table holding ${rows} rows — ` +
            `SQLite cannot add it in place, so drizzle-kit would empty "${name}".`,
        );
      }
    }

    const declaredNames = new Set(cfg.columns.map((c) => c.name));
    for (const column of existing) {
      if (!declaredNames.has(column.name)) {
        risks.push(
          `${name}.${column.name} exists in the database but not in schema.ts — ` +
            `it would be dropped, discarding its values across ${rows} rows.`,
        );
      }
    }
  }

  for (const name of live) {
    if (declared.has(name) || name === "__drizzle_migrations") continue;
    const rows = await rowCount(client, name);
    if (rows > 0) {
      risks.push(`Table "${name}" holds ${rows} rows but is absent from schema.ts — it would be dropped.`);
    }
  }

  return risks;
}

async function allRowCounts(client: Client) {
  const counts: Record<string, number> = {};
  for (const table of await listTables(client)) {
    counts[table] = await rowCount(client, table);
  }
  return counts;
}

async function main() {
  const allowDataLoss = process.argv.includes("--allow-data-loss");
  const client = connect();

  try {
    console.log("Comparing schema.ts against the live database...\n");
    const risks = await findRisks(client);

    if (risks.length > 0) {
      console.error("REFUSED — this migration would destroy data:\n");
      for (const risk of risks) console.error(`  • ${risk}`);
      console.error(
        [
          "",
          "Nothing has been changed. Prefer fixing the schema over overriding:",
          "",
          "  • make the new column nullable and treat null as the default in code",
          "  • or add it nullable now, backfill every row, and tighten it later",
          "  • to remove a column, migrate its data out first",
          "",
          "If you have read the above and genuinely accept the loss:",
          "  npm run db:backup",
          "  npm run db:migrate -- --allow-data-loss",
        ].join("\n"),
      );
      if (!allowDataLoss) process.exit(1);
      console.error("\n--allow-data-loss given; continuing anyway.\n");
    } else {
      console.log("No destructive changes detected.\n");
    }

    // Backup precedes even a plan that reads as safe: it costs seconds, and
    // the alternative failure mode is unrecoverable.
    const { path: backupPath } = await writeBackup(
      client,
      allowDataLoss ? "pre-forced" : "pre-migrate",
    );
    console.log(`Backup written to ${backupPath}\n`);

    const before = await allRowCounts(client);

    console.log("Applying...\n");
    const bin = join(process.cwd(), "node_modules", "drizzle-kit", "bin.cjs");
    execFileSync(process.execPath, [bin, "push", "--force"], { stdio: "inherit" });

    const after = await allRowCounts(client);
    const lost = Object.entries(before).filter(([table, n]) => (after[table] ?? 0) < n);

    if (lost.length > 0) {
      console.error("\nROWS LOST during this migration:");
      for (const [table, n] of lost) console.error(`  ${table}: ${n} -> ${after[table] ?? 0}`);
      console.error(`\nRestore with:\n  npm run db:restore -- ${backupPath} --confirm`);
      process.exit(1);
    }

    console.log("\nDone. No rows lost.");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
