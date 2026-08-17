/**
 * Full dump of every table to a timestamped JSON file.
 *
 *   npm run db:backup
 *
 * Independent of drizzle: it reads whatever tables exist and writes plain
 * rows, so a backup taken before a migration is restorable even if the
 * migration is what broke the schema.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient, type Client } from "@libsql/client";

const BACKUP_DIR = "backups";

function connect(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.");
  }
  return createClient({ url, authToken });
}

export async function listTables(client: Client): Promise<string[]> {
  const result = await client.execute(
    `SELECT name FROM sqlite_master
     WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'
     ORDER BY name`,
  );
  return result.rows.map((row) => String(row.name));
}

export type Backup = {
  takenAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

export async function dumpDatabase(client: Client): Promise<Backup> {
  const tables = await listTables(client);
  const dump: Backup = { takenAt: new Date().toISOString(), tables: {} };

  for (const table of tables) {
    const rows = await client.execute(`SELECT * FROM "${table}"`);
    dump.tables[table] = rows.rows.map((row) => ({ ...row }));
  }
  return dump;
}

export async function writeBackup(
  client: Client,
  label = "manual",
): Promise<{ path: string; dump: Backup }> {
  const dump = await dumpDatabase(client);
  mkdirSync(BACKUP_DIR, { recursive: true });

  const stamp = dump.takenAt.replace(/[:.]/g, "-");
  const path = join(BACKUP_DIR, `toli-${stamp}-${label}.json`);
  writeFileSync(path, JSON.stringify(dump, null, 2), "utf8");
  return { path, dump };
}

async function main() {
  const client = connect();
  try {
    const { path, dump } = await writeBackup(client, "manual");
    console.log(`Backup written to ${path}\n`);
    for (const [table, rows] of Object.entries(dump.tables)) {
      console.log(`  ${table.padEnd(24)} ${rows.length} rows`);
    }
  } finally {
    client.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { connect };
