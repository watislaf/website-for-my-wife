"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { toggleGoalCheck } from "@/actions/goals";
import { Checkbox } from "@/components/ui/checkbox";

export type TodayGoal = {
  id: number;
  title: string;
  emoji: string;
  checkedToday: boolean;
};

export function TodayGoals({
  goals,
  today,
}: {
  goals: TodayGoal[];
  today: string;
}) {
  if (goals.length === 0) {
    return <p className="text-sm text-muted-foreground">No active goals.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {goals.map((goal) => (
        <GoalRow key={goal.id} goal={goal} today={today} />
      ))}
    </div>
  );
}

function GoalRow({ goal, today }: { goal: TodayGoal; today: string }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        await toggleGoalCheck(goal.id, today);
      } catch {
        toast.error("Could not update");
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={goal.checkedToday}
        onCheckedChange={() => toggle()}
        disabled={pending}
      />
      <span aria-hidden>{goal.emoji}</span>
      <span
        className={
          goal.checkedToday ? "text-muted-foreground line-through" : undefined
        }
      >
        {goal.title}
      </span>
    </label>
  );
}
