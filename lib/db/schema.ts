// Drizzle schema for Neon Postgres. Not wired in the MVP skeleton (see docs/data-model.md).
import { integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { PLATFORMS } from "../types";

export const platformEnum = pgEnum("platform", PLATFORMS);

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const styles = pgTable("styles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  currentVersion: integer().notNull().default(1),
  createdAt: timestamp().notNull().defaultNow(),
});

/** Append-only: every learn/refine writes a new row so styles can be diffed and rolled back. */
export const styleVersions = pgTable(
  "style_versions",
  {
    id: uuid().primaryKey().defaultRandom(),
    styleId: uuid()
      .notNull()
      .references(() => styles.id, { onDelete: "cascade" }),
    version: integer().notNull(),
    prompt: text().notNull(),
    features: jsonb(),
    changelog: jsonb().$type<string[]>(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (t) => [unique().on(t.styleId, t.version)], // makes concurrent refines fail instead of forking history
);

export const styleSamples = pgTable("style_samples", {
  id: uuid().primaryKey().defaultRandom(),
  styleId: uuid()
    .notNull()
    .references(() => styles.id, { onDelete: "cascade" }),
  sourceUrl: text(),
  text: text().notNull(),
});

export const articles = pgTable("articles", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  styleId: uuid().references(() => styles.id, { onDelete: "set null" }),
  mode: text({ enum: ["rewrite", "compose"] }).notNull(),
  sourceUrl: text(),
  source: jsonb(), // normalized Source snapshot
  draft: text(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const outputs = pgTable("outputs", {
  id: uuid().primaryKey().defaultRandom(),
  articleId: uuid()
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  platform: platformEnum().notNull(),
  title: text(),
  body: text().notNull(),
  media: jsonb().$type<{ images: string[]; videos: string[] }>(),
  copiedAt: timestamp(), // implicit quality signal: did the user actually use it?
});
