import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const words = sqliteTable(
  "words",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    termTibetan: text("term_tibetan").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("words_term_tibetan_idx").on(table.termTibetan)],
);

export const definitions = sqliteTable(
  "definitions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    meaningNumber: integer("meaning_number").notNull().default(1),
    /** Academic source this definition is drawn from (book, paper, dictionary). Required. */
    source: text("source").notNull(),
    definitionText: text("definition_text").notNull(),
    /** Lowercased mirror of definitionText; see lib/normalize.ts. Always write both. */
    definitionTextLower: text("definition_text_lower"),
  },
  (table) => [
    index("definitions_word_id_idx").on(table.wordId),
    index("definitions_text_lower_idx").on(table.definitionTextLower),
  ],
);

export const wordsRelations = relations(words, ({ many }) => ({
  definitions: many(definitions),
}));

export const definitionsRelations = relations(definitions, ({ one }) => ({
  word: one(words, {
    fields: [definitions.wordId],
    references: [words.id],
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
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actor: text("actor").notNull(),
  action: text("action").notNull(), // "create" | "update" | "delete" | "import"
  entityType: text("entity_type").notNull(), // "word" | "definition" | "import"
  entityId: integer("entity_id").notNull(),
  summary: text("summary"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
