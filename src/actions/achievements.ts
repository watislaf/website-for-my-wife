"use server";

import { db } from "@/db";
import {
  workEntries,
  periodMarkers,
  incomeSources,
  goals,
  goalChecks,
  planItems,
  landingEvents,
  subscribers,
  earnedAchievements,
} from "@/db/schema";
import { and, eq, count, sum, inArray, sql } from "drizzle-orm";
import { todayStr } from "@/lib/dates";
import { computeEarned } from "@/lib/achievements/engine";
import { achievementByKey, type Category } from "@/lib/achievements/catalog";
import { getLandingContent } from "@/lib/site-content";
import { landing } from "@/content/landing";

// The catalog def fields the client needs to pop a toast for a newly-earned row.
export type UnseenAchievement = {
  id: number;
  achievementKey: string;
  instanceKey: string;
  coins: number;
  earnedAt: string;
  name: string;
  description: string;
  category: Category;
  tier: number;
};

/**
 * Recompute all achievements from current DB state, insert any newly-satisfied
 * instances (idempotent via the UNIQUE (achievement_key, instance_key) index +
 * onConflictDoNothing), and return the still-unseen rows joined with their
 * catalog def so the client can pop them. Never throws — returns [] on failure.
 */
export async function syncAndGetUnseen(): Promise<UnseenAchievement[]> {
  try {
    // ---- Load everything the engine needs ----
    const [
      entries,
      markers,
      sources,
      allGoals,
      checks,
      planDoneRows,
      pageviewRows,
      clicksRows,
      distinctSourceRows,
      subsRows,
      coinsRows,
    ] = await Promise.all([
      db
        .select({
          id: workEntries.id,
          date: workEntries.date,
          sourceId: workEntries.sourceId,
          hours: workEntries.hours,
          amount: workEntries.amount,
          note: workEntries.note,
        })
        .from(workEntries),
      db
        .select({ id: periodMarkers.id, endDate: periodMarkers.endDate, name: periodMarkers.name })
        .from(periodMarkers),
      db.select({ id: incomeSources.id }).from(incomeSources),
      db.select({ id: goals.id, archived: goals.archived }).from(goals),
      db.select({ goalId: goalChecks.goalId, date: goalChecks.date }).from(goalChecks),
      db.select({ n: count() }).from(planItems).where(eq(planItems.done, true)),
      db
        .select({ date: landingEvents.date, source: landingEvents.source })
        .from(landingEvents)
        .where(eq(landingEvents.type, "pageview")),
      db.select({ n: count() }).from(landingEvents).where(eq(landingEvents.type, "click")),
      db
        .select({ n: sql<number>`count(distinct ${landingEvents.source})` })
        .from(landingEvents),
      db.select({ n: count() }).from(subscribers),
      db.select({ total: sum(earnedAchievements.coins) }).from(earnedAchievements),
    ]);

    const currentCoins = Number(coinsRows[0]?.total ?? 0);

    // ---- Landing-page SETUP / onboarding flags (never throws) ----
    let landingFlags = {
      nameSet: false,
      aboutSet: false,
      photoUploaded: false,
      socialSet: false,
      sectionEnabled: false,
    };
    try {
      const content = await getLandingContent();
      landingFlags = {
        nameSet:
          content.name.trim() !== "" && content.name.trim() !== landing.name,
        aboutSet:
          content.about.trim() !== "" && content.about.trim() !== landing.about,
        photoUploaded: [
          content.heroImage,
          content.portrait,
          ...content.gallery,
        ].some((u) => typeof u === "string" && u.startsWith("/api/media/")),
        socialSet: content.socials.some(
          (s) => s.url && s.url.trim() !== "" && s.url.trim() !== "#",
        ),
        sectionEnabled:
          Array.isArray(content.sections) &&
          content.sections.some((s) => s.enabled),
      };
    } catch (err) {
      console.error("landing flags computation failed", err);
    }

    const earned = computeEarned({
      entries,
      markers,
      sources,
      goals: allGoals,
      goalChecks: checks,
      planDoneCount: planDoneRows[0]?.n ?? 0,
      pageviews: pageviewRows,
      clicksCount: clicksRows[0]?.n ?? 0,
      distinctTrafficSources: Number(distinctSourceRows[0]?.n ?? 0),
      subscribersCount: subsRows[0]?.n ?? 0,
      currentCoins,
      landing: landingFlags,
      today: todayStr(),
    });

    // ---- Insert any newly-earned instances (idempotent) ----
    if (earned.length > 0) {
      await db
        .insert(earnedAchievements)
        .values(
          earned.map((e) => ({
            achievementKey: e.key,
            instanceKey: e.instanceKey,
            coins: e.coins,
            seen: false,
          })),
        )
        .onConflictDoNothing();
    }

    // ---- Return unseen rows joined with their catalog def ----
    const unseen = await db
      .select()
      .from(earnedAchievements)
      .where(eq(earnedAchievements.seen, false));

    return unseen
      .map((row): UnseenAchievement | null => {
        const def = achievementByKey(row.achievementKey);
        if (!def) return null; // stale row for a removed catalog key — skip
        return {
          id: row.id,
          achievementKey: row.achievementKey,
          instanceKey: row.instanceKey,
          coins: row.coins,
          earnedAt: row.earnedAt,
          name: def.name,
          description: def.description,
          category: def.category,
          tier: def.tier,
        };
      })
      .filter((x): x is UnseenAchievement => x !== null);
  } catch (err) {
    console.error("syncAndGetUnseen failed", err);
    return [];
  }
}

export type AchievementsState = {
  coins: number;
  earnedByKey: Record<
    string,
    { count: number; firstEarnedAt: string; lastEarnedAt: string }
  >;
};

/**
 * Snapshot for the achievements page: total coins + per-key earned counts
 * (count >= 1 means unlocked). Never throws — returns an empty state on failure.
 */
export async function getAchievementsState(): Promise<AchievementsState> {
  try {
    const rows = await db
      .select({
        achievementKey: earnedAchievements.achievementKey,
        coins: earnedAchievements.coins,
        earnedAt: earnedAchievements.earnedAt,
      })
      .from(earnedAchievements);

    let coins = 0;
    const earnedByKey: AchievementsState["earnedByKey"] = {};
    for (const r of rows) {
      coins += r.coins;
      const cur = earnedByKey[r.achievementKey];
      if (!cur) {
        earnedByKey[r.achievementKey] = {
          count: 1,
          firstEarnedAt: r.earnedAt,
          lastEarnedAt: r.earnedAt,
        };
      } else {
        cur.count += 1;
        if (r.earnedAt < cur.firstEarnedAt) cur.firstEarnedAt = r.earnedAt;
        if (r.earnedAt > cur.lastEarnedAt) cur.lastEarnedAt = r.earnedAt;
      }
    }
    return { coins, earnedByKey };
  } catch (err) {
    console.error("getAchievementsState failed", err);
    return { coins: 0, earnedByKey: {} };
  }
}

/** Mark specific earned rows as seen (or all unseen when ids omitted). */
export async function markSeen(ids?: number[]): Promise<void> {
  try {
    if (ids && ids.length === 0) return;
    if (ids) {
      await db
        .update(earnedAchievements)
        .set({ seen: true })
        .where(
          and(inArray(earnedAchievements.id, ids), eq(earnedAchievements.seen, false)),
        );
    } else {
      await db
        .update(earnedAchievements)
        .set({ seen: true })
        .where(eq(earnedAchievements.seen, false));
    }
  } catch (err) {
    console.error("markSeen failed", err);
  }
}

/** Mark every unseen earned row as seen. */
export async function markAllSeen(): Promise<void> {
  await markSeen();
}
