"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtMoney, fmtHours } from "@/components/work/format";

export type MonthPoint = { month: string; hours: number; amount: number };
export type SourceMeta = { name: string; color: string };
/** Each row is a month plus one cumulative-amount key per source name.
 *  Shape: { month: "YYYY-MM"; [sourceName]: cumulativeAmount, ... }. The
 *  `month` key is a string; all other keys are per-source cumulative numbers. */
export type CumulativeRow = { month: string; [sourceName: string]: string | number };

const AXIS = "var(--muted-foreground)";

/** Compact axis tick: thousands-grouped, no decimals, prefixed to match the
 *  tooltips (fmtMoney/fmtHours). Kept short so the Y axis stays narrow. */
function moneyTick(v: number): string {
  return `$${Math.round(v).toLocaleString()}`;
}
function hoursTick(v: number): string {
  return `${Math.round(v).toLocaleString()}h`;
}

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

export function Charts({
  byMonth,
  bySourceCumulative,
  sources,
}: {
  byMonth: MonthPoint[];
  bySourceCumulative: CumulativeRow[];
  sources: SourceMeta[];
}) {
  const [metric, setMetric] = useState<"amount" | "hours">("amount");

  if (byMonth.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
          No work logged yet — go earn 💸
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Monthly {metric === "amount" ? "earnings" : "hours"}</CardTitle>
          <Tabs
            value={metric}
            onValueChange={(v) => setMetric(v as "amount" | "hours")}
          >
            <TabsList>
              <TabsTrigger value="amount">$</TabsTrigger>
              <TabsTrigger value="hours">Hours</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: AXIS }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={metric === "amount" ? moneyTick : hoursTick}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <TooltipBox label={label as string}>
                      {metric === "amount"
                        ? fmtMoney(Number(payload[0].value))
                        : fmtHours(Number(payload[0].value))}
                    </TooltipBox>
                  ) : null
                }
              />
              <Bar
                dataKey={metric}
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cumulative earnings by source</CardTitle>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">
              No sources yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={bySourceCumulative}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: AXIS }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={moneyTick}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <TooltipBox label={label as string}>
                        <div className="flex flex-col gap-0.5">
                          {payload
                            .slice()
                            .reverse()
                            .map((p) => (
                              <div key={p.name} className="flex items-center gap-1.5">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: p.color as string }}
                                />
                                <span>{p.name}:</span>
                                <span className="font-medium">
                                  {fmtMoney(Number(p.value))}
                                </span>
                              </div>
                            ))}
                        </div>
                      </TooltipBox>
                    ) : null
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {sources.map((s) => (
                  <Area
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stackId="1"
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.35}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
