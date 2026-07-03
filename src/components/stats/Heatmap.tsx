"use client";

import { addDays } from "@/lib/dates";
import { strToDate } from "@/components/work/format";
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

// Sun–Sat, matching JS getDay() (0 = Sunday). Only alternating rows get a
// visible label so the column stays readable (Mon/Wed/Fri like GitHub).
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Cell = { date: string; hours: number } | null;

export function Heatmap({
  byDayHours,
  today,
}: {
  byDayHours: Record<string, number>;
  today: string;
}) {
  // Trailing 53 weeks, weekday-aligned so each ROW is a fixed weekday (Sun top).
  // The last cell is `today`; we walk back to the Sunday of today's week, then
  // 52 weeks earlier, so the grid always starts on a Sunday column and each of
  // the 7 rows maps to one weekday. Cells before the range or after today are
  // null (rendered as invisible spacers) to keep the weekday alignment.
  const COLS = 53;
  const ROWS = 7;

  const todayDow = strToDate(today).getDay(); // 0=Sun..6=Sat
  // Sunday that starts the LAST (rightmost) column.
  const lastColSunday = addDays(today, -todayDow);
  // Sunday that starts the FIRST (leftmost) column.
  const gridStart = addDays(lastColSunday, -(COLS - 1) * ROWS);

  // Column-major: columns[ci] is a week (7 cells, Sun..Sat top..bottom).
  const columns: Cell[][] = [];
  for (let c = 0; c < COLS; c++) {
    const col: Cell[] = [];
    for (let r = 0; r < ROWS; r++) {
      const date = addDays(gridStart, c * ROWS + r);
      // Only cells within (range start … today] carry data; future days null.
      col.push(date > today ? null : { date, hours: byDayHours[date] ?? 0 });
    }
    columns.push(col);
  }

  // Month labels: show a month name above the first column whose top cell (its
  // Sunday) begins a new calendar month vs. the previous column.
  const monthLabels: (string | null)[] = columns.map((col, ci) => {
    const top = col[0];
    if (!top) return null;
    const m = strToDate(top.date).getMonth();
    if (ci === 0) return null; // avoid a cramped label at the very left edge
    const prevTop = columns[ci - 1][0];
    const prevM = prevTop ? strToDate(prevTop.date).getMonth() : -1;
    return m !== prevM ? MONTHS[m] : null;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours worked — last 53 weeks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <div className="inline-flex flex-col gap-1">
            {/* Month labels row (offset by the weekday-label gutter) */}
            <div className="flex gap-1 pl-8 text-[10px] text-muted-foreground">
              {monthLabels.map((label, ci) => (
                <div key={ci} className="w-3 shrink-0">
                  {label ? <span className="whitespace-nowrap">{label}</span> : null}
                </div>
              ))}
            </div>

            <div className="flex gap-1">
              {/* Weekday labels gutter */}
              <div className="flex w-7 shrink-0 flex-col gap-1 text-[10px] text-muted-foreground">
                {WEEKDAYS.map((d, i) => (
                  <div key={i} className="flex h-3 items-center leading-none">
                    {d}
                  </div>
                ))}
              </div>

              {columns.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-1">
                  {col.map((cell, ri) =>
                    cell ? (
                      <div
                        key={cell.date}
                        title={`${cell.date}: ${cell.hours}h`}
                        className={`h-3 w-3 rounded-sm ${bucketClass(cell.hours)}`}
                      />
                    ) : (
                      // spacer keeps weekday rows aligned
                      <div key={`${ci}-${ri}`} className="h-3 w-3" />
                    ),
                  )}
                </div>
              ))}
            </div>
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
