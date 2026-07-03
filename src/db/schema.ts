import { sqliteTable, text, integer, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const planItems = sqliteTable("plan_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),                       // YYYY-MM-DD
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const goalChecks = sqliteTable("goal_checks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
}, (t) => [unique("goal_day").on(t.goalId, t.date)]);

export const incomeSources = sqliteTable("income_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ec4899"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
});

export const workEntries = sqliteTable("work_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  sourceId: integer("source_id").notNull().references(() => incomeSources.id),
  hours: real("hours").notNull().default(0),
  amount: real("amount").notNull().default(0),
  note: text("note").notNull().default(""),
});

export const periodMarkers = sqliteTable("period_markers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endDate: text("end_date").notNull(),                // period covers (prevMarker.endDate, endDate]
  name: text("name").notNull().default(""),
});

// Landing CMS — single-row (id=1) JSON blob of the landing content.
export const siteContent = sqliteTable("site_content", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),                       // JSON string of the landing object shape
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Landing analytics
export const landingEvents = sqliteTable("landing_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),                       // "pageview" | "click"
  source: text("source").notNull().default("direct"),// tiktok | instagram | twitch | direct | <domain>
  target: text("target").notNull().default(""),        // click only: which link
  date: text("date").notNull(),                       // YYYY-MM-DD (server local)
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
