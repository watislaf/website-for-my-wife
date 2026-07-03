"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createPlanItem } from "@/actions/planner";
import { todayStr } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddPlan() {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await createPlanItem({
          date: todayStr(),
          title: title.trim(),
          notes: "",
        });
        setTitle("");
        toast.success("Plan added");
      } catch {
        toast.error("Could not add plan");
      }
    });
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
      <Input
        placeholder="Add to today…"
        aria-label="New plan item"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
        }}
        className="flex-1"
      />
      <Button size="sm" onClick={handleAdd} disabled={pending}>
        Add
      </Button>
    </div>
  );
}
