import "server-only";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { siteContent } from "@/db/schema";
import {
  landing,
  defaultSections,
  type LandingContent,
  type Section,
} from "@/content/landing";

export type { LandingContent };

const ROW_ID = 1;

/**
 * Merge stored sections over the defaults so the manager always sees every known
 * section type. For each default type: use the stored entry if present (keeping
 * its enabled/order/data), otherwise fall back to the default. Unknown stored
 * types are dropped. Missing → all defaults (disabled), so the live page is
 * unchanged for old content that never had a `sections` field.
 */
function mergeSections(stored: unknown): Section[] {
  const byType = new Map<string, Section>();
  if (Array.isArray(stored)) {
    for (const s of stored) {
      if (s && typeof s === "object" && "type" in s) {
        byType.set((s as Section).type, s as Section);
      }
    }
  }
  return defaultSections.map((def) => byType.get(def.type) ?? def);
}

/**
 * Read the stored landing content (row id=1) and MERGE it over the defaults so
 * any field missing from the stored JSON falls back to the default — we never
 * render a blank landing. If no row exists yet, return the defaults verbatim.
 */
export async function getLandingContent(): Promise<LandingContent> {
  const rows = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.id, ROW_ID))
    .limit(1);

  const row = rows[0];
  if (!row) return landing;

  let stored: Partial<LandingContent> = {};
  try {
    stored = JSON.parse(row.data) as Partial<LandingContent>;
  } catch {
    // Corrupt JSON → fall back entirely to defaults rather than throw.
    return landing;
  }

  // Shallow merge is enough for the core: each top-level field is either replaced
  // wholesale (name/headline/gallery/socials/…) or absent (→ default). Sections
  // need a per-type backfill so the manager always shows every known type.
  return { ...landing, ...stored, sections: mergeSections(stored.sections) };
}

/** Upsert the full landing content into row id=1. */
export async function saveLandingContent(next: LandingContent): Promise<void> {
  const data = JSON.stringify(next);
  await db
    .insert(siteContent)
    .values({ id: ROW_ID, data })
    .onConflictDoUpdate({
      target: siteContent.id,
      // The column default only applies on insert, so bump updatedAt explicitly
      // on update using the same SQLite expression.
      set: { data, updatedAt: sql`(datetime('now'))` },
    });
}
