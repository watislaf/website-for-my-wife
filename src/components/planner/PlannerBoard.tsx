"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarIcon, Loader2Icon, Trash2Icon } from "lucide-react";

import { addDays } from "@/lib/dates";
import {
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
  carryOverToToday,
  clearDoneItems,
} from "@/actions/planner";
import { useConfirm } from "@/components/ui/confirm-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

export type PlanItem = {
  id: number;
  date: string;
  title: string;
  notes: string;
  done: boolean;
  createdAt: string;
};

/** Format a Date to YYYY-MM-DD using LOCAL date parts (never toISOString / UTC). */
function dateToStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Parse a YYYY-MM-DD string into a local Date (noon avoids DST edge cases). */
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

type Section = {
  key: string;
  label: string;
  items: PlanItem[];
  collapsed?: boolean;
};

function groupItems(items: PlanItem[], today: string): Section[] {
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);

  const past: PlanItem[] = [];
  const todayItems: PlanItem[] = [];
  const tomorrowItems: PlanItem[] = [];
  const thisWeek: PlanItem[] = [];
  const later: PlanItem[] = [];

  for (const item of items) {
    if (item.date < today) past.push(item);
    else if (item.date === today) todayItems.push(item);
    else if (item.date === tomorrow) tomorrowItems.push(item);
    else if (item.date <= weekEnd) thisWeek.push(item);
    else later.push(item);
  }

  return [
    { key: "today", label: "Today", items: todayItems },
    { key: "tomorrow", label: "Tomorrow", items: tomorrowItems },
    { key: "week", label: "This week", items: thisWeek },
    { key: "later", label: "Later", items: later },
    { key: "past", label: "Past", items: past, collapsed: true },
  ];
}

export function PlannerBoard({
  items,
  today,
}: {
  items: PlanItem[];
  today: string;
}) {
  const sections = groupItems(items, today);
  const { confirm, dialog } = useConfirm();
  const [pending, startTransition] = useTransition();

  const hasDone = items.some((i) => i.done);
  const hasPastUndone = items.some((i) => i.date < today && !i.done);

  function handleClearDone() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Clear done items?",
        description: "This permanently deletes every completed plan.",
        confirmLabel: "Clear done",
        destructive: true,
      });
      if (!ok) return;
      try {
        await clearDoneItems();
        toast.success("Cleared done items");
      } catch {
        toast.error("Could not clear done items");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {dialog}
      <AddPlanForm today={today} />

      {hasDone && (
        <div className="flex justify-end">
          <PendingButton
            variant="outline"
            size="sm"
            onClick={handleClearDone}
            pending={pending}
            pendingLabel="Clearing…"
          >
            <Trash2Icon />
            Clear done
          </PendingButton>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {sections.map((section) => {
          const showDateBadge = section.key === "week" || section.key === "later";

          if (section.collapsed) {
            if (section.items.length === 0) return null;
            return (
              <details key={section.key} className="group">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground select-none">
                  {section.label} ({section.items.length})
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  {hasPastUndone && (
                    <div className="flex justify-start">
                      <PastCarryOverButton />
                    </div>
                  )}
                  <SectionItems
                    section={section}
                    today={today}
                    showDateBadge={showDateBadge}
                  />
                </div>
              </details>
            );
          }

          // Always keep Today visible, even when empty.
          if (section.items.length === 0 && section.key !== "today") return null;

          return (
            <div key={section.key} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {section.label}
              </h2>
              <div className="flex flex-col gap-2">
                {section.items.length === 0 && section.key === "today" ? (
                  <p className="text-sm text-muted-foreground">
                    Nothing planned for today 🎉
                  </p>
                ) : (
                  <SectionItems
                    section={section}
                    today={today}
                    showDateBadge={showDateBadge}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PastCarryOverButton() {
  const [pending, startTransition] = useTransition();

  function handleCarryOver() {
    startTransition(async () => {
      try {
        await carryOverToToday();
        toast.success("Moved unfinished to today");
      } catch {
        toast.error("Could not move items");
      }
    });
  }

  return (
    <PendingButton
      variant="outline"
      size="sm"
      onClick={handleCarryOver}
      pending={pending}
      pendingLabel="Moving…"
    >
      Move all unfinished to today
    </PendingButton>
  );
}

function SectionItems({
  section,
  today,
  showDateBadge,
}: {
  section: Section;
  today: string;
  showDateBadge: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {section.items.map((item) => (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
        >
          <PlanItemRow
            item={item}
            today={today}
            isPast={section.key === "past"}
            showDateBadge={showDateBadge}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

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

function AddPlanForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Midnight-safe: if the tab stays open past midnight, `today` changes on the
  // next server render/revalidate. Re-seed the date so new items don't land on
  // yesterday — but only when it's still pointing at a now-past day (untouched
  // form). Adjusting state during render is React's recommended pattern for
  // "reset state when a prop changes" (no cascading-render effect needed).
  if (date < today) {
    setDate(today);
  }

  function handleAdd() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await createPlanItem({ date, title: title.trim(), notes: notes.trim() });
        setTitle("");
        setNotes("");
        setDate(today);
        toast.success("Plan added");
      } catch {
        toast.error("Could not add plan");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
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

        <Input
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          className="flex-1"
        />
        <PendingButton
          onClick={handleAdd}
          pending={pending}
          pendingLabel="Adding…"
        >
          Add
        </PendingButton>
      </div>
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </div>
  );
}

function PlanItemRow({
  item,
  today,
  isPast,
  showDateBadge,
}: {
  item: PlanItem;
  today: string;
  isPast: boolean;
  showDateBadge: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  function toggleDone(checked: unknown) {
    // Base UI can emit an "indeterminate" state; only persist real booleans.
    const done = checked === true;
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, { done });
        toast.success(done ? "Done" : "Reopened");
      } catch {
        toast.error("Could not update");
      }
    });
  }

  function reschedule(date: string, label: string) {
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, { date });
        toast.success(label);
      } catch {
        toast.error("Could not move");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Delete plan?",
        description: `"${item.title}" will be permanently deleted.`,
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deletePlanItem(item.id);
        toast.success("Deleted");
      } catch {
        toast.error("Could not delete");
      }
    });
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      {dialog}
      <Checkbox
        checked={item.done}
        onCheckedChange={(checked) => toggleDone(checked)}
        disabled={pending}
        className="mt-0.5"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              item.done
                ? "text-sm line-through text-muted-foreground"
                : "text-sm font-medium"
            }
          >
            {item.title}
          </span>
          {showDateBadge && (
            <Badge variant="secondary" className="font-normal">
              {prettyDate(item.date)}
            </Badge>
          )}
          {isPast && !item.done && (
            <Badge
              variant="outline"
              render={
                <button
                  type="button"
                  onClick={() => reschedule(today, "Moved to today")}
                  disabled={pending}
                  aria-label="Move to today"
                />
              }
              className="cursor-pointer"
            >
              → today
            </Badge>
          )}
          {!item.done && (
            <Badge
              variant="outline"
              render={
                <button
                  type="button"
                  onClick={() =>
                    reschedule(addDays(item.date, 1), "Pushed one day")
                  }
                  disabled={pending}
                  aria-label="Reschedule one day later"
                />
              }
              className="cursor-pointer"
            >
              +1 day
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="text-xs whitespace-pre-wrap text-muted-foreground">
            {item.notes}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <EditPlanDialog item={item} />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Delete"
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

function EditPlanDialog({ item }: { item: PlanItem }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(item.date);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setDate(item.date);
    setTitle(item.title);
    setNotes(item.notes);
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, {
          date,
          title: title.trim(),
          notes: notes.trim(),
        });
        toast.success("Saved");
        setOpen(false);
      } catch {
        toast.error("Could not save");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="Edit">
            Edit
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
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
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
