import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const words = sqliteTable(
  "words",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** The headword as the contributing source spelled it — this is what's displayed. */
    termTibetan: text("term_tibetan").notNull(),
    /**
     * Normalised form used to decide whether two contributors mean the same
     * word. See lib/tibetan.ts. Nullable only so the column could be added
     * without drizzle-kit rebuilding (and emptying) the table.
     */
    termKey: text("term_key"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("words_term_tibetan_idx").on(table.termTibetan),
    index("words_term_key_idx").on(table.termKey),
  ],
);

/**
 * One row per contributing book/dictionary/paper, so "which source is this"
 * is a foreign key rather than a string a collaborator retypes on every row of
 * their spreadsheet. Two rows with the same intended source, spelled slightly
 * differently, used to read as two different sources — this makes that
 * impossible by construction: pick the existing source or create one, once.
 */
export const sources = sqliteTable(
  "sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Display form — whatever casing/punctuation it was first entered with. */
    title: text("title").notNull(),
    /** Normalised dedup key; see lib/sources.ts. */
    titleKey: text("title_key").notNull().unique(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("sources_title_key_idx").on(table.titleKey)],
);

export const definitions = sqliteTable(
  "definitions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    meaningNumber: integer("meaning_number").notNull().default(1),
    /**
     * Legacy free-text source, kept NOT NULL and always written as a mirror of
     * sources.title so this column never goes stale. `sourceId` is the join
     * key every read now uses; this text column exists only because SQLite
     * migrations to add a NOT NULL column force drizzle-kit to rebuild the
     * table and empty it (see README) — kept nullable-in-spirit-only to avoid
     * ever risking that again.
     */
    source: text("source").notNull(),
    /** Nullable for the same reason: an additive column can never trigger a rebuild. */
    sourceId: integer("source_id").references(() => sources.id),
    definitionText: text("definition_text").notNull(),
    /** Lowercased mirror of definitionText; see lib/normalize.ts. Always write both. */
    definitionTextLower: text("definition_text_lower"),
    /** Workbook this came from; null when typed directly into the CMS. */
    sourceFile: text("source_file"),
    /** Admin who contributed it, so a conflict can notify the other party. */
    createdBy: text("created_by"),
  },
  (table) => [
    index("definitions_word_id_idx").on(table.wordId),
    index("definitions_text_lower_idx").on(table.definitionTextLower),
    index("definitions_source_id_idx").on(table.sourceId),
    // Conflict detection asks "does this word already have definitions from
    // this exact source?" for every incoming row.
    index("definitions_word_source_idx").on(table.wordId, table.sourceId),
  ],
);

/**
 * An incoming definition that contradicts one already recorded for the same
 * word from the same book. Held here rather than written into `definitions`,
 * so the live dictionary never shows two rival texts attributed to one source
 * — an admin decides which is right on /admin/conflicts and only then does it
 * land (or get dropped).
 *
 * `existingText` is snapshotted rather than read through the FK at display
 * time: the definition it clashes with can be edited or removed while the
 * conflict sits unresolved, and the reviewer needs to see what was actually
 * compared.
 */
export const definitionConflicts = sqliteTable(
  "definition_conflicts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    /** Null once the definition it clashed with has since been deleted. */
    existingDefinitionId: integer("existing_definition_id").references(() => definitions.id, {
      onDelete: "set null",
    }),
    existingText: text("existing_text").notNull(),
    incomingText: text("incoming_text").notNull(),
    /** Who contributed the definition already on record, where known. */
    existingUploadedBy: text("existing_uploaded_by"),
    fileName: text("file_name"),
    uploadedBy: text("uploaded_by").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("definition_conflicts_word_idx").on(table.wordId)],
);

export const wordsRelations = relations(words, ({ many }) => ({
  definitions: many(definitions),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  definitions: many(definitions),
}));

export const definitionsRelations = relations(definitions, ({ one }) => ({
  word: one(words, {
    fields: [definitions.wordId],
    references: [words.id],
  }),
  sourceRef: one(sources, {
    fields: [definitions.sourceId],
    references: [sources.id],
  }),
}));

/**
 * Collaborators invited by email. Kept in the database rather than the
 * ADMIN_USERS env var so that inviting someone doesn't require a redeploy.
 * The env var stays live as a bootstrap account — see lib/admin-users.ts.
 */
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Stored lowercased; this is the login identifier. */
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** scrypt digest — see lib/password.ts. The plaintext is emailed once, never stored. */
  passwordHash: text("password_hash").notNull(),
  invitedBy: text("invited_by"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  lastLoginAt: text("last_login_at"),
});

/**
 * One row per failed admin login, used for rate limiting. Kept in the database
 * rather than in memory because serverless instances don't share memory and are
 * recycled constantly — an in-process counter would reset itself away.
 */
export const loginAttempts = sqliteTable(
  "login_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Client IP. Not a user id: we must throttle before trusting any input. */
    identifier: text("identifier").notNull(),
    /** Unix epoch milliseconds, so window maths stays in JS. */
    attemptedAt: integer("attempted_at").notNull(),
  },
  (table) => [index("login_attempts_identifier_idx").on(table.identifier)],
);

/** Audit trail of admin edits, so every change can be attributed to the admin who made it. */
export const activityLog = sqliteTable(
  "activity_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actor: text("actor").notNull(),
    action: text("action").notNull(), // "create" | "update" | "delete" | "import"
    entityType: text("entity_type").notNull(), // "word" | "definition" | "import"
    entityId: integer("entity_id").notNull(),
    summary: text("summary"),
    /**
     * Uploaded workbook name for "import" rows, null for everything else. Its
     * own column rather than text folded into `summary` so it can be filtered
     * and sorted on, and so a filename containing the separator can't make the
     * stored record ambiguous.
     */
    fileName: text("file_name"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  // /admin/imports reads this table filtered to one action and ordered newest
  // first; without the index that is a scan of every row the whole app has
  // ever logged, which grows far faster than the import rows being shown.
  (table) => [index("activity_log_action_id_idx").on(table.action, table.id)],
);
