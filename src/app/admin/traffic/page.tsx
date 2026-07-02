import { asc } from "drizzle-orm";

import { db } from "@/db";
import { landingEvents } from "@/db/schema";
import { todayStr, addDays } from "@/lib/dates";
import { TrafficBoard, type TrafficData } from "@/components/traffic/TrafficBoard";

export default async function TrafficPage() {
  const events = await db
    .select()
    .from(landingEvents)
    .orderBy(asc(landingEvents.date), asc(landingEvents.id));

  // ---- totals ----
  let views = 0;
  let clicks = 0;
  for (const e of events) {
    if (e.type === "pageview") views += 1;
    else if (e.type === "click") clicks += 1;
  }
  const ctr = views > 0 ? clicks / views : 0;

  // ---- views by source ----
  const viewsBySourceMap = new Map<string, number>();
  const clicksBySourceMap = new Map<string, number>();
  const clicksByTargetMap = new Map<string, number>();
  for (const e of events) {
    if (e.type === "pageview") {
      viewsBySourceMap.set(e.source, (viewsBySourceMap.get(e.source) ?? 0) + 1);
    } else if (e.type === "click") {
      clicksBySourceMap.set(e.source, (clicksBySourceMap.get(e.source) ?? 0) + 1);
      const target = e.target || "(unknown)";
      clicksByTargetMap.set(target, (clicksByTargetMap.get(target) ?? 0) + 1);
    }
  }

  const sortDesc = (m: Map<string, number>, key: "source" | "target") =>
    [...m.entries()]
      .map(([k, count]) => ({ [key]: k, count }))
      .sort((a, b) => (b.count as number) - (a.count as number));

  const viewsBySource = sortDesc(viewsBySourceMap, "source") as {
    source: string;
    count: number;
  }[];
  const clicksBySource = sortDesc(clicksBySourceMap, "source") as {
    source: string;
    count: number;
  }[];
  const clicksByTarget = sortDesc(clicksByTargetMap, "target") as {
    target: string;
    count: number;
  }[];

  // ---- last 30 days (trailing window ending today, one point per day) ----
  const today = todayStr();
  const start = addDays(today, -29);
  const perDay = new Map<string, { views: number; clicks: number }>();
  for (const e of events) {
    if (e.date < start || e.date > today) continue;
    const d = perDay.get(e.date) ?? { views: 0, clicks: 0 };
    if (e.type === "pageview") d.views += 1;
    else if (e.type === "click") d.clicks += 1;
    perDay.set(e.date, d);
  }
  const last30: { date: string; views: number; clicks: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const date = addDays(start, i);
    const d = perDay.get(date) ?? { views: 0, clicks: 0 };
    last30.push({ date, views: d.views, clicks: d.clicks });
  }

  const data: TrafficData = {
    totals: { views, clicks, ctr },
    viewsBySource,
    clicksByTarget,
    clicksBySource,
    last30,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold heading-gradient">Traffic</h1>
      <TrafficBoard data={data} />
    </div>
  );
}
