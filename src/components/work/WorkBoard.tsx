"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";

import type { PeriodSummary } from "@/lib/periods";
import { createSource, setSourceArchived, createEntry } from "@/actions/work";

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

/* ---------- date helpers (LOCAL date parts, never toISOString) ---------- */

function dateToStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function strToDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function prettyDate(s: string): string {
  return strToDate(s).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ---------- format helpers ---------- */

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtHours(n: number): string {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
}

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
  const byId = new Map(sources.map((s) => [s.id, s]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <SourcesDialog sources={sources} />
      </div>

      <QuickAddForm active={active} today={today} />

      <div className="flex flex-col gap-6">
        {periods.map((p, i) => (
          <PeriodSummaryBlock
            key={p.marker?.id ?? "open"}
            period={p}
            byId={byId}
            isOpen={p.marker === null}
            first={i === 0}
          />
        ))}
        {/* Task 11: PeriodCard replaces this — entries table + close/move/delete markers.
            Swap <PeriodSummaryBlock/> for <PeriodCard period={p} sources={sources} today={today} />. */}
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

/* ---------- 3. Period list (minimal summary — Task 11 swaps in PeriodCard) ---------- */

function PeriodSummaryBlock({
  period,
  byId,
  isOpen,
  first,
}: {
  period: PeriodSummary;
  byId: Map<number, Source>;
  isOpen: boolean;
  first: boolean;
}) {
  const { marker, startDate, endDate, totals } = period;

  const title = marker?.name
    ? marker.name
    : marker
      ? `Period ending ${marker.endDate}`
      : "Current period";

  const range =
    startDate && endDate
      ? startDate === endDate
        ? startDate
        : `${startDate} → ${endDate}`
      : "No entries yet";

  const bySource = Object.entries(totals.bySource).sort(
    (a, b) => b[1].amount - a[1].amount,
  );

  return (
    <div
      className={
        isOpen
          ? "flex flex-col gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4"
          : "flex flex-col gap-4 rounded-xl border border-border p-4"
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-heading text-base font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{range}</span>
        </div>
        {isOpen && first && (
          <span className="text-xs font-medium text-primary">Open</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Chip label={`${totals.daysWorked.toLocaleString()} days`} />
        <Chip label={fmtHours(totals.hours)} />
        <Chip label={fmtMoney(totals.amount)} />
        <Chip label={`${fmtMoney(totals.perHour)}/h`} />
      </div>

      {bySource.length > 0 && (
        <div className="flex flex-col gap-1">
          {bySource.map(([id, agg]) => {
            const s = byId.get(Number(id));
            return (
              <div
                key={id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s?.color ?? "#999" }}
                  aria-hidden
                />
                <span className="flex-1 truncate">{s?.name ?? "Unknown"}</span>
                <span>{fmtHours(agg.hours)}</span>
                <span>·</span>
                <span>{fmtMoney(agg.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
      {label}
    </span>
  );
}
