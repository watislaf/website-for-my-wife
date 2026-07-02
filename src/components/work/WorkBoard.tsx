"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";

import type { PeriodSummary } from "@/lib/periods";
import { createSource, setSourceArchived, createEntry } from "@/actions/work";
import { PeriodCard } from "./PeriodCard";
import { dateToStr, strToDate, prettyDate } from "./format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Source = {
  id: number;
  name: string;
  color: string;
  archived: boolean;
};

/* Date + number format helpers live in ./format (shared with PeriodCard). */

/* ============================================================= */

export function WorkBoard({
  sources,
  periods,
  today,
}: {
  sources: Source[];
  periods: PeriodSummary[];
  today: string;
}) {
  const active = sources.filter((s) => !s.archived);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <SourcesDialog sources={sources} />
      </div>

      <QuickAddForm active={active} today={today} />

      <div className="flex flex-col gap-6">
        <AnimatePresence initial={false}>
          {periods.map((p) => (
            <motion.div key={p.marker?.id ?? "open"} layout>
              <PeriodCard period={p} sources={sources} today={today} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- 1. Sources manager ---------- */

function SourcesDialog({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ec4899");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      try {
        await createSource({ name: name.trim(), color });
        setName("");
        setColor("#ec4899");
        toast.success("Source added");
      } catch {
        toast.error("Could not add source");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Manage sources</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Income sources</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground">No sources yet.</p>
          )}
          {sources.map((s) => (
            <SourceRow key={s.id} source={s} />
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <input
            type="color"
            aria-label="Color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent"
          />
          <Input
            placeholder="New source…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={pending}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SourceRow({ source }: { source: Source }) {
  const [pending, startTransition] = useTransition();

  function toggleArchived() {
    startTransition(async () => {
      try {
        await setSourceArchived(source.id, !source.archived);
        toast.success(source.archived ? "Unarchived" : "Archived");
      } catch {
        toast.error("Could not update");
      }
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: source.color }}
        aria-hidden
      />
      <span
        className={
          source.archived
            ? "flex-1 truncate text-sm text-muted-foreground line-through"
            : "flex-1 truncate text-sm"
        }
      >
        {source.name}
      </span>
      <Button variant="ghost" size="sm" onClick={toggleArchived} disabled={pending}>
        {source.archived ? "Unarchive" : "Archive"}
      </Button>
    </div>
  );
}

/* ---------- 2. Quick add ---------- */

function QuickAddForm({ active, today }: { active: Source[]; today: string }) {
  const [date, setDate] = useState(today);
  const [sourceId, setSourceId] = useState<number | null>(
    active[0]?.id ?? null,
  );
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
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
          date,
          sourceId,
          hours: h,
          amount: a,
          note: note.trim(),
        });
        // Keep date + source for rapid multi-row entry; clear the rest.
        setHours("");
        setAmount("");
        setNote("");
        toast.success("Entry added");
      } catch {
        toast.error("Could not add entry");
      }
    });
  }

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
        Add an income source first (use “Manage sources”) to log work.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="justify-start sm:w-44">
                <CalendarIcon />
                {prettyDate(date)}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={strToDate(date)}
              onSelect={(d) => {
                if (d) setDate(dateToStr(d));
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Select
          items={active.map((s) => ({ value: s.id, label: s.name }))}
          value={sourceId}
          onValueChange={(v) => setSourceId(v as number)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {active.map((s) => (
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
          className="sm:w-24"
        />
        <Input
          type="number"
          step="0.01"
          placeholder="Amount"
          aria-label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="sm:w-28"
        />
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={pending}>
          Add
        </Button>
      </div>
    </div>
  );
}

