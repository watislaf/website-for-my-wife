"use client";

import * as React from "react";
import { useOptimistic, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  Loader2Icon,
  MoreVerticalIcon,
} from "lucide-react";

import {
  createGoal,
  updateGoal,
  toggleGoalCheck,
  reorderGoal,
  setGoalArchived,
  deleteGoal,
} from "@/actions/goals";
import { useConfirm } from "@/components/ui/confirm-dialog";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Last7Day = { date: string; checked: boolean };

export type GoalWithStats = {
  id: number;
  title: string;
  emoji: string;
  total: number;
  month: number;
  cur: number;
  best: number;
  last7: Last7Day[];
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

/** Human-readable label for a YYYY-MM-DD string using LOCAL date parts. */
function prettyDate(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PendingButton({
  pending,
  pendingLabel,
  children,
  ...props
}: React.ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel?: string;
}) {
  return (
    <Button {...props} disabled={pending || props.disabled}>
      {pending ? (
        <>
          <Loader2Icon className="animate-spin" />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
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
          {active.map((goal, i) => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GoalCard
                goal={goal}
                active={active}
                today={today}
                isFirst={i === 0}
                isLast={i === active.length - 1}
              />
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
      <PendingButton
        onClick={handleAdd}
        pending={pending}
        pendingLabel="Adding…"
      >
        Add
      </PendingButton>
    </div>
  );
}

function GoalCard({
  goal,
  active,
  today,
  isFirst,
  isLast,
}: {
  goal: GoalWithStats;
  active: GoalWithStats[];
  today: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  // Optimistic view of this goal's checks so the checkbox + dots flip
  // instantly, before the server round-trip completes. Keyed by date string.
  // The reducer toggles the given date; server revalidation reconciles by
  // replacing `goal` (fresh props reset the optimistic base).
  const [optimisticGoal, applyOptimistic] = useOptimistic(
    goal,
    (state: GoalWithStats, toggledDate: string): GoalWithStats => {
      const wasChecked = state.last7.some(
        (d) => d.date === toggledDate && d.checked,
      );
      const nowChecked = !wasChecked;
      return {
        ...state,
        checkedToday:
          toggledDate === today ? nowChecked : state.checkedToday,
        last7: state.last7.map((d) =>
          d.date === toggledDate ? { ...d, checked: nowChecked } : d,
        ),
        total: state.total + (nowChecked ? 1 : -1),
      };
    },
  );

  function toggleDate(date: string) {
    // Predict, SYNCHRONOUSLY at click time, whether checking `today` completes
    // the whole active set. Fire confetti immediately — before/independent of
    // the await — so it never reads stale post-revalidation state. Guarded:
    // only when checking (not unchecking) today, and only with active goals.
    if (date === today) {
      const wasCheckedToday = goal.checkedToday;
      const willBeChecked = !wasCheckedToday;
      const wasAllChecked =
        active.length > 0 && active.every((g) => g.checkedToday);
      const willAllBeChecked =
        willBeChecked &&
        active.length > 0 &&
        active.every((g) => (g.id === goal.id ? true : g.checkedToday));
      if (willAllBeChecked && !wasAllChecked) fireConfetti();
    }

    startTransition(async () => {
      applyOptimistic(date);
      try {
        await toggleGoalCheck(goal.id, date);
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

  function handleReorder(direction: "up" | "down") {
    startTransition(async () => {
      try {
        await reorderGoal(goal.id, direction);
      } catch {
        toast.error("Could not reorder");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: `Delete "${goal.title}"?`,
        description: "This removes the goal and all its checks.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteGoal(goal.id);
        toast.success("Deleted");
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  const view = optimisticGoal;

  return (
    <Card className="h-full">
      {dialog}
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            {view.emoji}
          </span>
          <span className="min-w-0 flex-1 font-medium break-words">
            {view.title}
          </span>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move up"
              disabled={pending || isFirst}
              onClick={() => handleReorder("up")}
            >
              <ChevronUpIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Move down"
              disabled={pending || isLast}
              onClick={() => handleReorder("down")}
            >
              <ChevronDownIcon />
            </Button>
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
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={view.checkedToday}
            onCheckedChange={() => toggleDate(today)}
            disabled={pending}
            className="size-5"
          />
          Did it today
        </label>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">✅ {view.total} total</Badge>
          <Badge
            variant="secondary"
            className={view.cur === 0 ? "opacity-50" : undefined}
          >
            🔥 {view.cur} streak
          </Badge>
          <Badge variant="secondary">🏆 {view.best} best</Badge>
          <Badge variant="secondary">📅 {view.month} this month</Badge>
        </div>

        <div className="flex items-center gap-1.5" role="group" aria-label="Last 7 days">
          {view.last7.map((day) => {
            const isToday = day.date === today;
            const label = `${prettyDate(day.date)}${isToday ? " (today)" : ""}: ${
              day.checked ? "done" : "not done"
            } — click to toggle`;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => toggleDate(day.date)}
                disabled={pending}
                title={label}
                aria-label={label}
                aria-pressed={day.checked}
                className={`h-4 w-4 rounded-full transition-colors disabled:cursor-not-allowed ${
                  day.checked ? "bg-primary" : "bg-muted hover:bg-muted-foreground/30"
                } ${isToday ? "ring-2 ring-primary/60 ring-offset-1 ring-offset-background" : ""}`}
              />
            );
          })}
        </div>
      </CardContent>

      <EditGoalDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />
    </Card>
  );
}

function EditGoalDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal: GoalWithStats;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [emoji, setEmoji] = useState(goal.emoji);
  const [title, setTitle] = useState(goal.title);
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmoji(goal.emoji);
    setTitle(goal.title);
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateGoal(goal.id, { title: title.trim(), emoji: emoji.trim() });
        toast.success("Saved");
        onOpenChange(false);
      } catch {
        toast.error("Could not save");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit goal</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Input
              aria-label="Emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-14 text-center"
            />
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <PendingButton
              onClick={handleSave}
              pending={pending}
              pendingLabel="Saving…"
            >
              Save
            </PendingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArchivedRow({ goal }: { goal: ArchivedGoal }) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

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
    startTransition(async () => {
      const ok = await confirm({
        title: `Delete "${goal.title}"?`,
        description: "This removes the goal and all its checks.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
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
      {dialog}
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
      <Button variant="ghost" size="sm" onClick={handleDelete} disabled={pending}>
        Delete
      </Button>
    </div>
  );
}
