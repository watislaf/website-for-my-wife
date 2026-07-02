"use client";

import { addDays } from "@/lib/dates";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/** Bucket hours into an intensity class. 0 / <2 / <5 / <8 / >=8. */
function bucketClass(hours: number): string {
  if (hours <= 0) return "bg-muted";
  if (hours < 2) return "bg-pink-200";
  if (hours < 5) return "bg-pink-400";
  if (hours < 8) return "bg-pink-600";
  return "bg-pink-800";
}

const LEGEND: { label: string; className: string }[] = [
  { label: "0", className: "bg-muted" },
  { label: "<2", className: "bg-pink-200" },
  { label: "<5", className: "bg-pink-400" },
  { label: "<8", className: "bg-pink-600" },
  { label: "8+", className: "bg-pink-800" },
];

export function Heatmap({
  byDayHours,
  today,
}: {
  byDayHours: Record<string, number>;
  today: string;
}) {
  // 53 columns × 7 rows. Build the grid ending on `today`, aligned so the
  // last cell is today. Total cells = 53*7 = 371 (~ last 53 weeks).
  const COLS = 53;
  const ROWS = 7;
  const total = COLS * ROWS;
  const start = addDays(today, -(total - 1));

  // Column-major fill so consecutive days go down a column (calendar style).
  const columns: { date: string; hours: number }[][] = Array.from(
    { length: COLS },
    () => [],
  );
  for (let i = 0; i < total; i++) {
    const date = addDays(start, i);
    const hours = byDayHours[date] ?? 0;
    columns[Math.floor(i / ROWS)].push({ date, hours });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours worked — last year</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {columns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-1">
                {col.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date}: ${cell.hours}h`}
                    className={`h-3 w-3 rounded-sm ${bucketClass(cell.hours)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          {LEGEND.map((l) => (
            <div
              key={l.label}
              className={`h-3 w-3 rounded-sm ${l.className}`}
              title={l.label}
            />
          ))}
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
