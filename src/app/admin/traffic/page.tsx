import { and, asc, gte, lte } from "drizzle-orm";
import { DownloadIcon } from "lucide-react";

import { db } from "@/db";
import { landingEvents } from "@/db/schema";
import { todayStr, addDays } from "@/lib/dates";
import { sourceLabel, targetLabel, utmLabel } from "@/lib/traffic";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/traffic/FilterBar";
import { TrafficBoard, type TrafficData } from "@/components/traffic/TrafficBoard";
import { Reveal } from "@/components/motion/Reveal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WINDOW_DAYS = 30;

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function TrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawFrom = firstParam(sp.from);
  const rawTo = firstParam(sp.to);

  // ?from=all → explicit all-time (no date bounds). Otherwise validate the
  // params; unset/invalid falls back to a trailing default window.
  const isAllTime = rawFrom === "all";
  let from = DATE_RE.test(rawFrom) ? rawFrom : "";
  let to = DATE_RE.test(rawTo) ? rawTo : "";
  // Guard against an inverted range (from after to): swap so the filter is sane.
  if (from && to && from > to) {
    [from, to] = [to, from];
  }
  const isCustom = !isAllTime && (Boolean(from) || Boolean(to));

  const today = todayStr();
  // Resolve the effective window. Custom uses the given bounds (open-ended
  // allowed). All-time has no bounds. Default is a trailing DEFAULT_WINDOW_DAYS.
  let windowFrom = "";
  let windowTo = "";
  if (isAllTime) {
    windowFrom = "";
    windowTo = "";
  } else if (isCustom) {
    windowFrom = from;
    windowTo = to;
  } else {
    windowFrom = addDays(today, -(DEFAULT_WINDOW_DAYS - 1));
    windowTo = today;
  }

  // Push a date WHERE for the windowed query instead of loading the whole table.
  const conds = [];
  if (windowFrom) conds.push(gte(landingEvents.date, windowFrom));
  if (windowTo) conds.push(lte(landingEvents.date, windowTo));
  const where = conds.length ? and(...conds) : undefined;

  const events = await db
    .select()
    .from(landingEvents)
    .where(where)
    .orderBy(asc(landingEvents.date), asc(landingEvents.id));

  // ---- totals (over the SAME window shown) ----
  let views = 0;
  let clicks = 0;
  for (const e of events) {
    if (e.type === "pageview") views += 1;
    else if (e.type === "click") clicks += 1;
  }
  // "Clicks per view": clicks ÷ views, both counts over this window. May exceed
  // 100% (multiple clicks per visit) — that is valid, not an error.
  const clicksPerView = views > 0 ? clicks / views : 0;

  // ---- breakdowns ----
  const viewsBySourceMap = new Map<string, number>();
  const clicksBySourceMap = new Map<string, number>();
  const clicksByTargetMap = new Map<string, number>();
  const clicksByCampaignMap = new Map<string, number>();
  for (const e of events) {
    if (e.type === "pageview") {
      viewsBySourceMap.set(e.source, (viewsBySourceMap.get(e.source) ?? 0) + 1);
    } else if (e.type === "click") {
      clicksBySourceMap.set(e.source, (clicksBySourceMap.get(e.source) ?? 0) + 1);
      // Empty target = missing/bad payload. Drop from the per-link breakdown so
      // it is not conflated with a real link; it still counts in totals.
      if (e.target) {
        clicksByTargetMap.set(e.target, (clicksByTargetMap.get(e.target) ?? 0) + 1);
      }
    }
    // Campaign breakdown spans both event types (null → "(none)").
    const campaign = utmLabel(e.utmCampaign);
    clicksByCampaignMap.set(campaign, (clicksByCampaignMap.get(campaign) ?? 0) + 1);
  }

  const viewsBySource = [...viewsBySourceMap.entries()]
    .map(([source, count]) => ({ source, label: sourceLabel(source), count }))
    .sort((a, b) => b.count - a.count);
  const clicksBySource = [...clicksBySourceMap.entries()]
    .map(([source, count]) => ({ source, label: sourceLabel(source), count }))
    .sort((a, b) => b.count - a.count);
  const clicksByTarget = [...clicksByTargetMap.entries()]
    .map(([target, count]) => ({ target, label: targetLabel(target), count }))
    .sort((a, b) => b.count - a.count);
  const byCampaign = [...clicksByCampaignMap.entries()]
    .map(([campaign, count]) => ({ campaign, count }))
    .sort((a, b) => b.count - a.count);

  // ---- trend: one point per day across the window ----
  // For all-time, span earliest..today; otherwise the resolved window bounds.
  const trendStart = windowFrom || (events.length ? events[0].date : today);
  const trendEnd = windowTo || today;
  const perDay = new Map<string, { views: number; clicks: number }>();
  for (const e of events) {
    const d = perDay.get(e.date) ?? { views: 0, clicks: 0 };
    if (e.type === "pageview") d.views += 1;
    else if (e.type === "click") d.clicks += 1;
    perDay.set(e.date, d);
  }
  const trend: { date: string; views: number; clicks: number }[] = [];
  // Bound the loop defensively (all-time over years could be large but finite).
  let cursor = trendStart;
  for (let i = 0; i < 5000 && cursor <= trendEnd; i++) {
    const d = perDay.get(cursor) ?? { views: 0, clicks: 0 };
    trend.push({ date: cursor, views: d.views, clicks: d.clicks });
    cursor = addDays(cursor, 1);
  }

  const windowLabel = isAllTime
    ? "all time"
    : isCustom
      ? "the selected range"
      : `the last ${DEFAULT_WINDOW_DAYS} days`;

  const data: TrafficData = {
    totals: { views, clicks, clicksPerView },
    viewsBySource,
    clicksByTarget,
    clicksBySource,
    byCampaign,
    trend,
    windowLabel,
  };

  return (
    <div className="flex flex-col gap-6">
      <Reveal
        onMount
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <h1 className="text-2xl font-semibold heading-gradient">Traffic</h1>
        <Button
          variant="outline"
          render={<a href="/api/export/traffic.csv" download />}
        >
          <DownloadIcon />
          Export CSV
        </Button>
      </Reveal>

      <FilterBar
        filter={{ from: isAllTime ? "" : from, to: isAllTime ? "" : to }}
        isCustom={isCustom}
        isAllTime={isAllTime}
      />

      <Reveal>
        <TrafficBoard data={data} />
      </Reveal>
    </div>
  );
}
