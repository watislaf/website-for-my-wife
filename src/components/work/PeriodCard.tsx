"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarIcon, ChevronDownIcon, PencilIcon, Trash2Icon } from "lucide-react";

import type { PeriodSummary, WorkEntryLite } from "@/lib/periods";
import {
  createMarker,
  updateMarker,
  deleteMarker,
  updateEntry,
  deleteEntry,
} from "@/actions/work";
import type { Source } from "./WorkBoard";
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const { marker, startDate, endDate, entries, totals } = period;
  const isOpen = marker === null;
  const [expanded, setExpanded] = useState(isOpen);

  const byId = new Map(sources.map((s) => [s.id, s]));

  const title = marker?.name
    ? marker.name
    : marker
      ? `Period ending ${marker.endDate}`
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
        <Chip label={`${fmtMoney(totals.perHour)}/h`} />
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
                        <span>{fmtHours(agg.hours)}</span>
                        <span>·</span>
                        <span>{fmtMoney(agg.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {entries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="w-16 text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        sources={sources}
                        byId={byId}
                      />
                    ))}
                  </TableBody>
                </Table>
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

/* ---------- entry row (inline edit + delete) ---------- */

function EntryRow({
  entry,
  sources,
  byId,
}: {
  entry: WorkEntryLite;
  sources: Source[];
  byId: Map<number, Source>;
}) {
  const [pending, startTransition] = useTransition();
  const s = byId.get(entry.sourceId);

  function handleDelete() {
    if (!confirm("Delete this entry?")) return;
    startTransition(async () => {
      try {
        await deleteEntry(entry.id);
        toast.success("Entry deleted");
      } catch {
        toast.error("Could not delete entry");
      }
    });
  }

  return (
    <TableRow>
      <TableCell>{prettyDate(entry.date)}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: s?.color ?? "#999" }}
            aria-hidden
          />
          {s?.name ?? "Unknown"}
        </span>
      </TableCell>
      <TableCell className="text-right">{fmtHours(entry.hours)}</TableCell>
      <TableCell className="text-right">{fmtMoney(entry.amount)}</TableCell>
      <TableCell className="max-w-40 truncate text-muted-foreground">
        {entry.note}
      </TableCell>
      <TableCell className="text-right">
        <span className="flex justify-end gap-1">
          <EditEntryDialog entry={entry} sources={sources} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={pending}
            aria-label="Delete entry"
          >
            <Trash2Icon />
          </Button>
        </span>
      </TableCell>
    </TableRow>
  );
}

function EditEntryDialog({
  entry,
  sources,
}: {
  entry: WorkEntryLite;
  sources: Source[];
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(entry.date);
  const [sourceId, setSourceId] = useState<number>(entry.sourceId);
  const [hours, setHours] = useState(String(entry.hours));
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Include archived sources so an entry's original source can still be shown.
  const options = sources;

  function handleSave() {
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
        await updateEntry(entry.id, {
          date,
          sourceId,
          hours: h,
          amount: a,
          note: note.trim(),
        });
        setOpen(false);
        toast.success("Entry updated");
      } catch {
        toast.error("Could not update entry");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        aria-label="Edit entry"
      >
        <PencilIcon />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="justify-start">
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
            items={options.map((s) => ({ value: s.id, label: s.name }))}
            value={sourceId}
            onValueChange={(v) => setSourceId(v as number)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((s) => (
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

          <div className="flex gap-2">
            <Input
              type="number"
              step="0.5"
              min="0"
              placeholder="Hours"
              aria-label="Hours"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              placeholder="Amount"
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
            />
          </div>

          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
      <Button variant="default" onClick={() => setOpen(true)}>
        Close period here
      </Button>
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
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Move / rename
      </Button>
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

  function handleDelete() {
    if (
      !confirm(
        "Delete this marker? Its entries merge into the next (later) period.",
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteMarker(markerId);
        toast.success("Marker deleted");
      } catch {
        toast.error("Could not delete marker");
      }
    });
  }

  return (
    <Button variant="destructive" onClick={handleDelete} disabled={pending}>
      Delete marker
    </Button>
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
