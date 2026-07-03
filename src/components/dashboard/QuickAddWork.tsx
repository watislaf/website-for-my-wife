"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createEntry } from "@/actions/work";
import { todayStr } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type QuickAddSource = { id: number; name: string; color: string };

export function QuickAddWork({ sources }: { sources: QuickAddSource[] }) {
  const [sourceId, setSourceId] = useState<number | null>(
    sources[0]?.id ?? null,
  );
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (sourceId === null) {
      toast.error("Pick a source");
      return;
    }
    const h = hours === "" ? 0 : Number(hours);
    const a = amount === "" ? 0 : Number(amount);
    if (!Number.isFinite(h) || h < 0) {
      toast.error("Hours must be a non-negative number");
      return;
    }
    if (!Number.isFinite(a)) {
      toast.error("Amount must be a number");
      return;
    }
    startTransition(async () => {
      try {
        await createEntry({
          date: todayStr(),
          sourceId,
          hours: h,
          amount: a,
          note: note.trim(),
        });
        setHours("");
        setAmount("");
        setNote("");
        toast.success("Entry added");
      } catch {
        toast.error("Could not add entry");
      }
    });
  }

  if (sources.length === 0) {
    return (
      <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
        Add an income source on the Work page to log entries.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        items={sources.map((s) => ({ value: s.id, label: s.name }))}
        value={sourceId}
        onValueChange={(v) => setSourceId(v as number)}
      >
        <SelectTrigger size="sm" className="sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sources.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                {s.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="number"
        step="0.5"
        min="0"
        placeholder="Hours"
        aria-label="Hours"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className="sm:w-20"
      />
      <Input
        type="number"
        step="0.01"
        placeholder="Amount"
        aria-label="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="sm:w-24"
      />
      <Input
        placeholder="Note"
        aria-label="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
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
