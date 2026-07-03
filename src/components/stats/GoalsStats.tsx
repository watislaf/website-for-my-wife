"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export type GoalStat = {
  id: number;
  title: string;
  emoji: string;
  currentStreak: number;
  bestStreak: number;
  totalChecks: number;
  checksThisMonth: number;
};

export function GoalsStats({ goals }: { goals: GoalStat[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center text-sm text-muted-foreground">
            No active goals yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Goal</TableHead>
                <TableHead className="text-right">Current 🔥</TableHead>
                <TableHead className="text-right">Best</TableHead>
                <TableHead className="text-right">This month</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{g.emoji}</span>
                      <span className="truncate">{g.title}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{g.currentStreak}</TableCell>
                  <TableCell className="text-right">{g.bestStreak}</TableCell>
                  <TableCell className="text-right">{g.checksThisMonth}</TableCell>
                  <TableCell className="text-right">{g.totalChecks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
