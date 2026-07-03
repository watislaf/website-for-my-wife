"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

import { updatePlanItem, deletePlanItem } from "@/actions/planner";
import { Button } from "@/components/ui/button";
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

  function handleDelete() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    startTransition(async () => {
      try {
        await deletePlanItem(item.id);
        toast.success("Deleted");
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <div className="group flex items-center gap-2 text-sm">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <Checkbox
          checked={item.done}
          onCheckedChange={(c) => toggle(c)}
          disabled={pending}
        />
        <span
          className={
            item.done
              ? "truncate text-muted-foreground line-through"
              : "truncate"
          }
        >
          {item.title}
        </span>
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Delete"
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
