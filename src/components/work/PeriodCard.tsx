"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  CalendarIcon,
  ChevronDownIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";

import type { PeriodSummary, WorkEntryLite } from "@/lib/periods";
import {
  createMarker,
  updateMarker,
  deleteMarker,
  deleteDay,
} from "@/actions/work";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { DayDialog, type DayLine, type Source } from "./WorkBoard";
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

/* ============================================================= */

export function PeriodCard({
  period,
  sources,
  today,
}: {
  period: PeriodSummary;
  sources: Source[];
  today: string;
}) {
  const { marker, startDate, endDate, days, entries, totals } = period;
  const isOpen = marker === null;
  const [expanded, setExpanded] = useState(isOpen);

  const byId = new Map(sources.map((s) => [s.id, s]));

  const entriesByDate = new Map<string, WorkEntryLite[]>();
  for (const e of entries) {
    const arr = entriesByDate.get(e.date) ?? [];
    arr.push(e);
    entriesByDate.set(e.date, arr);
  }
  // Every date that has hours OR income, newest first.
  const dayByDate = new Map(days.map((d) => [d.date, d]));
  const allDates = [...new Set([...days.map((d) => d.date), ...entries.map((e) => e.date)])]
    .sort()
    .reverse();

  const title = marker?.name
    ? marker.name
    : marker
      ? `Period ending ${prettyDate(marker.endDate)}`
      : "Current period";

  const range =
    startDate && endDate
      ? startDate === endDate
        ? prettyDate(startDate)
        : `${prettyDate(startDate)} → ${prettyDate(endDate)}`
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
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <ChevronDownIcon
            className={
              expanded
                ? "size-4 shrink-0 text-muted-foreground transition-transform"
                : "size-4 shrink-0 -rotate-90 text-muted-foreground transition-transform"
            }
            aria-hidden
          />
          <div className="flex flex-col">
            <span className="font-heading text-base font-medium">{title}</span>
            <span className="text-xs text-muted-foreground">{range}</span>
          </div>
        </div>
        {isOpen && (
          <span className="text-xs font-medium text-primary">Open</span>
        )}
      </button>

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Chip label={`${totals.daysWorked.toLocaleString()} days`} />
        <Chip label={fmtHours(totals.hours)} />
        <Chip label={fmtMoney(totals.amount)} />
        <Chip label={totals.hours > 0 ? `${fmtMoney(totals.perHour)}/h` : "—/h"} />
        {totals.holidayDays !== null && (
          <Chip label={`${totals.holidayDays.toLocaleString()} off`} />
        )}
      </div>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 pt-1">
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
                        <span className="flex-1 truncate">
                          {s?.name ?? "Unknown"}
                        </span>
                        <span>{fmtMoney(agg.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {allDates.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {allDates.map((d) => {
                    const wd = dayByDate.get(d);
                    const dayEntries = entriesByDate.get(d) ?? [];
                    const dayAmount = dayEntries.reduce((a, e) => a + e.amount, 0);
                    return (
                      <DayRow
                        key={d}
                        date={d}
                        hours={wd?.hours ?? 0}
                        note={wd?.note ?? ""}
                        entries={dayEntries}
                        dayAmount={dayAmount}
                        sources={sources}
                        byId={byId}
                        today={today}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No entries in this period.
                </p>
              )}

              {/* Footer actions */}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {isOpen ? (
                  <ClosePeriodDialog today={today} />
                ) : (
                  <>
                    <MoveMarkerDialog marker={marker} />
                    <DeleteMarkerButton markerId={marker.id} />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- one day: hours + its income lines, edit/delete ---------- */

function DayRow({
  date,
  hours,
  note,
  entries,
  dayAmount,
  sources,
  byId,
  today,
}: {
  date: string;
  hours: number;
  note: string;
  entries: WorkEntryLite[];
  dayAmount: number;
  sources: Source[];
  byId: Map<number, Source>;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();
  const active = sources.filter((s) => !s.archived);

  const initial = {
    date,
    hours: hours ? String(hours) : "",
    note,
    lines: entries.map<DayLine>((e) => ({
      sourceId: e.sourceId,
      amount: String(e.amount),
      note: e.note,
    })),
  };

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete this day?",
        description: "Removes the day's hours and all its income lines.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteDay(date);
        toast.success("Day deleted");
      } catch {
        toast.error("Could not delete day");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      {dialog}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">{prettyDate(date)}</span>
          <span className="text-xs text-muted-foreground">{fmtHours(hours)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">{fmtMoney(dayAmount)}</span>
          <DayDialog
            active={active}
            allSources={sources}
            today={today}
            initial={initial}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Edit day">
                <PencilIcon />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Delete day"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-col gap-0.5 pl-1">
          {entries.map((e) => {
            const s = byId.get(e.sourceId);
            return (
              <div
                key={e.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: s?.color ?? "#999" }}
                  aria-hidden
                />
                <span className="flex-1 truncate">
                  {s?.name ?? "Unknown"}
                  {e.note ? ` — ${e.note}` : ""}
                </span>
                <span>{fmtMoney(e.amount)}</span>
              </div>
            );
          })}
        </div>
      )}
      {note && <p className="pl-1 text-xs italic text-muted-foreground">{note}</p>}
    </div>
  );
}

/* ---------- close period (open period → createMarker) ---------- */

function ClosePeriodDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(today);
  const [name, setName] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      try {
        await createMarker({ endDate, name: name.trim() });
        setOpen(false);
        setName("");
        toast.success("Period closed");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not close period",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="default">Close period here</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close period</DialogTitle>
          <DialogDescription>
            Entries on or before this date form a closed period.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="justify-start">
                  <CalendarIcon />
                  {prettyDate(endDate)}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={strToDate(endDate)}
                onSelect={(d) => {
                  if (d) setEndDate(dateToStr(d));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleClose} disabled={pending}>
            Close period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- move / rename marker ---------- */

function MoveMarkerDialog({
  marker,
}: {
  marker: NonNullable<PeriodSummary["marker"]>;
}) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(marker.endDate);
  const [name, setName] = useState(marker.name);
  const [pending, startTransition] = useTransition();

  // Re-seed from the current marker each time the dialog opens; the row stays
  // mounted across revalidations, so mount-only state would show stale values.
  function handleOpenChange(next: boolean) {
    if (next) {
      setEndDate(marker.endDate);
      setName(marker.name);
    }
    setOpen(next);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMarker(marker.id, { endDate, name: name.trim() });
        setOpen(false);
        toast.success("Period updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not update period",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={<Button variant="outline">Move / rename</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move or rename period</DialogTitle>
          <DialogDescription>
            Moving the end date re-buckets entries and recalculates totals.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <Calendar
            mode="single"
            selected={strToDate(endDate)}
            onSelect={(d) => {
              if (d) setEndDate(dateToStr(d));
            }}
          />
          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- delete marker ---------- */

function DeleteMarkerButton({ markerId }: { markerId: number }) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete this marker?",
        description: "Its entries merge into the next (later) period.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteMarker(markerId);
        toast.success("Marker deleted");
      } catch {
        toast.error("Could not delete marker");
      }
    });
  }

  return (
    <>
      {dialog}
      <Button variant="destructive" onClick={handleDelete} disabled={pending}>
        Delete marker
      </Button>
    </>
  );
}

/* ---------- chip ---------- */

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
      {label}
    </span>
  );
}
