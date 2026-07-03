"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarIcon, Loader2Icon, Trash2Icon, XIcon } from "lucide-react";

import type { PeriodSummary, PeriodTotals } from "@/lib/periods";
import {
  createSource,
  setSourceArchived,
  updateSource,
  deleteSource,
  createEntry,
} from "@/actions/work";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PeriodCard } from "./PeriodCard";
import { dateToStr, strToDate, prettyDate, fmtMoney, fmtHours } from "./format";

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

export type WorkFilter = {
  source: number | null;
  from: string;
  to: string;
};

/* Date + number format helpers live in ./format (shared with PeriodCard). */

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

/* ============================================================= */

export function WorkBoard({
  sources,
  periods,
  today,
  lifetime,
  filter,
  isFiltered,
}: {
  sources: Source[];
  periods: PeriodSummary[];
  today: string;
  lifetime: PeriodTotals;
  filter: WorkFilter;
  isFiltered: boolean;
}) {
  const active = sources.filter((s) => !s.archived);

  return (
    <div className="flex flex-col gap-8">
      <LifetimeStrip lifetime={lifetime} />

      <div className="flex items-center justify-between">
        <SourcesDialog sources={sources} />
      </div>

      <QuickAddForm active={active} today={today} />

      <FilterBar sources={sources} filter={filter} isFiltered={isFiltered} />

      <div className="flex flex-col gap-6">
        {isFiltered && (
          <p className="text-xs text-muted-foreground">
            Showing a filtered view — period totals reflect only the matching
            entries.
          </p>
        )}
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

/* ---------- lifetime totals strip ---------- */

function LifetimeStrip({ lifetime }: { lifetime: PeriodTotals }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:grid-cols-4">
      <Stat label="Lifetime hours" value={fmtHours(lifetime.hours)} />
      <Stat label="Lifetime earned" value={fmtMoney(lifetime.amount)} />
      <Stat
        label="Avg $/h"
        value={lifetime.hours > 0 ? `${fmtMoney(lifetime.perHour)}/h` : "—"}
      />
      <Stat label="Days worked" value={lifetime.daysWorked.toLocaleString()} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-heading text-lg font-medium">{value}</span>
    </div>
  );
}

/* ---------- filter bar (drives the URL searchParams) ---------- */

const ALL = "all";

function FilterBar({
  sources,
  filter,
  isFiltered,
}: {
  sources: Source[];
  filter: WorkFilter;
  isFiltered: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  function apply(next: WorkFilter) {
    const params = new URLSearchParams();
    if (next.source !== null) params.set("source", String(next.source));
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const selectItems = [
    { value: ALL, label: "All sources" },
    ...sources.map((s) => ({ value: String(s.id), label: s.name })),
  ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select
          items={selectItems}
          value={filter.source === null ? ALL : String(filter.source)}
          onValueChange={(v) =>
            apply({ ...filter, source: v === ALL ? null : Number(v) })
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {selectItems.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="justify-start sm:w-44">
                <CalendarIcon />
                {filter.from ? prettyDate(filter.from) : "From…"}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filter.from ? strToDate(filter.from) : undefined}
              onSelect={(d) => {
                apply({ ...filter, from: d ? dateToStr(d) : "" });
                setFromOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" className="justify-start sm:w-44">
                <CalendarIcon />
                {filter.to ? prettyDate(filter.to) : "To…"}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={filter.to ? strToDate(filter.to) : undefined}
              onSelect={(d) => {
                apply({ ...filter, to: d ? dateToStr(d) : "" });
                setToOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => apply({ source: null, from: "", to: "" })}
          >
            <XIcon />
            Clear filters
          </Button>
        )}
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(source.name);
  const [color, setColor] = useState(source.color);
  const { confirm, dialog } = useConfirm();

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

  function startEdit() {
    setName(source.name);
    setColor(source.color);
    setEditing(true);
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateSource(source.id, { name: name.trim(), color });
        setEditing(false);
        toast.success("Source updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update source",
        );
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete source?",
        description:
          "This removes the source permanently. Sources with entries can't be deleted — archive them instead.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteSource(source.id);
        toast.success("Source deleted");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not delete source",
        );
      }
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-2">
        {dialog}
        <input
          type="color"
          aria-label="Color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          aria-label="Source name"
          className="flex-1"
          autoFocus
        />
        <PendingButton
          size="sm"
          onClick={handleSave}
          pending={pending}
          pendingLabel="Saving…"
        >
          Save
        </PendingButton>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      {dialog}
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
      <Button variant="ghost" size="sm" onClick={startEdit} disabled={pending}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={toggleArchived} disabled={pending}>
        {source.archived ? "Unarchive" : "Archive"}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Delete source"
      >
        <Trash2Icon />
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
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add entry");
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
