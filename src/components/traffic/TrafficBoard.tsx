"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export type TrafficData = {
  totals: { views: number; clicks: number; ctr: number };
  viewsBySource: { source: string; count: number }[];
  clicksByTarget: { target: string; count: number }[];
  clicksBySource: { source: string; count: number }[];
  last30: { date: string; views: number; clicks: number }[];
};

const AXIS = "var(--muted-foreground)";

function TooltipBox({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {children}
    </div>
  );
}

/** "2026-07-02" → "Jul 2" (local, no toISOString). */
function shortDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TrafficBoard({ data }: { data: TrafficData }) {
  const { totals, viewsBySource, clicksByTarget, clicksBySource, last30 } = data;

  if (totals.views === 0 && totals.clicks === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          No visitors tracked yet — share your link 📣
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: "Pageviews", value: totals.views.toLocaleString() },
    { label: "Link clicks", value: totals.clicks.toLocaleString() },
    { label: "Click-through rate", value: `${(totals.ctr * 100).toFixed(1)}%` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} size="sm">
            <CardContent className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-lg font-semibold">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views by source</CardTitle>
          </CardHeader>
          <CardContent>
            {viewsBySource.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                No pageviews yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={viewsBySource}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="source"
                    tick={{ fontSize: 11, fill: AXIS }}
                    tickLine={false}
                    axisLine={false}
                    width={96}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <TooltipBox label={label as string}>
                          {Number(payload[0].value)} views
                        </TooltipBox>
                      ) : null
                    }
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clicks by link</CardTitle>
          </CardHeader>
          <CardContent>
            {clicksByTarget.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
                No link clicks yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={clicksByTarget}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="target"
                    tick={{ fontSize: 11, fill: AXIS }}
                    tickLine={false}
                    axisLine={false}
                    width={96}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <TooltipBox label={label as string}>
                          {Number(payload[0].value)} clicks
                        </TooltipBox>
                      ) : null
                    }
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Clicks by source</CardTitle>
          </CardHeader>
          <CardContent>
            {clicksBySource.length === 0 ? (
              <div className="text-sm text-muted-foreground">No link clicks yet.</div>
            ) : (
              <ul className="flex flex-col gap-2">
                {clicksBySource.map((c) => (
                  <li
                    key={c.source}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{c.source}</span>
                    <span className="font-medium tabular-nums">{c.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={last30} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TooltipBox label={shortDay(label as string)}>
                        <div className="flex flex-col gap-0.5">
                          {payload.map((p) => (
                            <div key={p.name} className="flex items-center gap-1.5">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: p.color as string }}
                              />
                              <span>{p.name}:</span>
                              <span className="font-medium">{Number(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      </TooltipBox>
                    ) : null
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="var(--muted-foreground)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
