"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { fmtMoney, fmtHours } from "@/components/work/format";

export type SourceRow = {
  name: string;
  color: string;
  hours: number;
  amount: number;
  perHour: number;
  daysWorked: number;
};

export function SourceTable({ rows }: { rows: SourceRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By source</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
          No entries in this range.
        </CardContent>
      </Card>
    );
  }

  const totals = rows.reduce(
    (a, r) => {
      a.hours += r.hours;
      a.amount += r.amount;
      a.days += r.daysWorked;
      return a;
    },
    { hours: 0, amount: 0, days: 0 },
  );
  const totalPerHour = totals.hours > 0 ? totals.amount / totals.hours : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>By source</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">$/h</TableHead>
              <TableHead className="text-right">Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: r.color }}
                      aria-hidden
                    />
                    <span className="truncate">{r.name}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right">{fmtHours(r.hours)}</TableCell>
                <TableCell className="text-right">{fmtMoney(r.amount)}</TableCell>
                <TableCell className="text-right">
                  {r.hours > 0 ? fmtMoney(r.perHour) : "—"}
                </TableCell>
                <TableCell className="text-right">{r.daysWorked}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{fmtHours(totals.hours)}</TableCell>
              <TableCell className="text-right">{fmtMoney(totals.amount)}</TableCell>
              <TableCell className="text-right">
                {totals.hours > 0 ? fmtMoney(totalPerHour) : "—"}
              </TableCell>
              <TableCell className="text-right">{totals.days}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
