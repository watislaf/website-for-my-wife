"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { updatePlanItem } from "@/actions/planner";
import { Checkbox } from "@/components/ui/checkbox";

export type TodayPlanItem = { id: number; title: string; done: boolean };

export function TodayPlan({ items }: { items: TodayPlanItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing planned for today.</p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <PlanRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function PlanRow({ item }: { item: TodayPlanItem }) {
  const [pending, startTransition] = useTransition();

  function toggle(done: boolean) {
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, { done });
      } catch {
        toast.error("Could not update");
      }
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={item.done}
        onCheckedChange={(c) => toggle(c)}
        disabled={pending}
      />
      <span
        className={item.done ? "text-muted-foreground line-through" : undefined}
      >
        {item.title}
      </span>
    </label>
  );
}
