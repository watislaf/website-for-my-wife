"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { MoreVerticalIcon } from "lucide-react";

import {
  createGoal,
  toggleGoalCheck,
  setGoalArchived,
  deleteGoal,
} from "@/actions/goals";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export type GoalWithStats = {
  id: number;
  title: string;
  emoji: string;
  total: number;
  month: number;
  cur: number;
  best: number;
  last7: boolean[];
  checkedToday: boolean;
};

export type ArchivedGoal = {
  id: number;
  title: string;
  emoji: string;
};

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    colors: ["#ec4899", "#f9a8d4", "#fbbf24", "#fb7185"],
  });
}

export function GoalsBoard({
  active,
  archived,
  today,
}: {
  active: GoalWithStats[];
  archived: ArchivedGoal[];
  today: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <NewGoalForm />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {active.map((goal) => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GoalCard goal={goal} active={active} today={today} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No goals yet. Add one above.
        </p>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground select-none">
            Archived ({archived.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {archived.map((goal) => (
              <ArchivedRow key={goal.id} goal={goal} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function NewGoalForm() {
  const [emoji, setEmoji] = useState("");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await createGoal({ title: title.trim(), emoji: emoji.trim() });
        setEmoji("");
        setTitle("");
        toast.success("Goal added");
      } catch {
        toast.error("Could not add goal");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <Input
        placeholder="🎯"
        aria-label="Emoji"
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        className="w-14 text-center"
      />
      <Input
        placeholder="New goal…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        className="flex-1"
      />
      <Button onClick={handleAdd} disabled={pending}>
        Add
      </Button>
    </div>
  );
}

function GoalCard({
  goal,
  active,
  today,
}: {
  goal: GoalWithStats;
  active: GoalWithStats[];
  today: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    // Predict whether this toggle completes the whole active set for today.
    // Fire confetti only when transitioning INTO all-checked, and never with
    // zero active goals.
    const willAllBeChecked =
      checked &&
      active.length > 0 &&
      active.every((g) =>
        g.id === goal.id ? true : g.checkedToday,
      );
    const wasAllChecked = active.every((g) => g.checkedToday);

    startTransition(async () => {
      try {
        await toggleGoalCheck(goal.id, today);
        if (willAllBeChecked && !wasAllChecked) fireConfetti();
      } catch {
        toast.error("Could not update");
      }
    });
  }

  function handleArchive() {
    startTransition(async () => {
      try {
        await setGoalArchived(goal.id, true);
        toast.success("Archived");
      } catch {
        toast.error("Could not archive");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${goal.title}"? This removes all its checks.`)) return;
    startTransition(async () => {
      try {
        await deleteGoal(goal.id);
        toast.success("Deleted");
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            {goal.emoji}
          </span>
          <span className="min-w-0 flex-1 font-medium break-words">
            {goal.title}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Goal actions"
                  disabled={pending}
                />
              }
            >
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={goal.checkedToday}
            onCheckedChange={(checked) => handleToggle(checked)}
            disabled={pending}
            className="size-5"
          />
          Did it today
        </label>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">✅ {goal.total} total</Badge>
          <Badge variant="secondary">🔥 {goal.cur} streak</Badge>
          <Badge variant="secondary">🏆 {goal.best} best</Badge>
          <Badge variant="secondary">📅 {goal.month} this month</Badge>
        </div>

        <div className="flex items-center gap-1.5" aria-label="Last 7 days">
          {goal.last7.map((filled, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full ${filled ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ArchivedRow({ goal }: { goal: ArchivedGoal }) {
  const [pending, startTransition] = useTransition();

  function handleUnarchive() {
    startTransition(async () => {
      try {
        await setGoalArchived(goal.id, false);
        toast.success("Unarchived");
      } catch {
        toast.error("Could not unarchive");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${goal.title}"? This removes all its checks.`)) return;
    startTransition(async () => {
      try {
        await deleteGoal(goal.id);
        toast.success("Deleted");
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <span className="text-lg leading-none" aria-hidden>
        {goal.emoji}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {goal.title}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnarchive}
        disabled={pending}
      >
        Unarchive
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDelete}
        disabled={pending}
      >
        Delete
      </Button>
    </div>
  );
}
