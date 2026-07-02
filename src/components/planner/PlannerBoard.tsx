"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarIcon, Trash2Icon } from "lucide-react";

import { addDays } from "@/lib/dates";
import {
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
} from "@/actions/planner";

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

  return (
    <div className="flex flex-col gap-8">
      <AddPlanForm today={today} />

      <div className="flex flex-col gap-6">
        {sections.map((section) => {
          if (section.items.length === 0) return null;

          if (section.collapsed) {
            return (
              <details key={section.key} className="group">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground select-none">
                  {section.label} ({section.items.length})
                </summary>
                <div className="mt-3 flex flex-col gap-2">
                  <SectionItems section={section} today={today} />
                </div>
              </details>
            );
          }

          return (
            <div key={section.key} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {section.label}
              </h2>
              <div className="flex flex-col gap-2">
                <SectionItems section={section} today={today} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No plans yet. Add one above.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionItems({
  section,
  today,
}: {
  section: Section;
  today: string;
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
          <PlanItemRow item={item} today={today} isPast={section.key === "past"} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

function AddPlanForm({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
        <Button onClick={handleAdd} disabled={pending}>
          Add
        </Button>
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
}: {
  item: PlanItem;
  today: string;
  isPast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function toggleDone(done: boolean) {
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, { done });
        toast.success(done ? "Done" : "Reopened");
      } catch {
        toast.error("Could not update");
      }
    });
  }

  function moveToToday() {
    startTransition(async () => {
      try {
        await updatePlanItem(item.id, { date: today });
        toast.success("Moved to today");
      } catch {
        toast.error("Could not move");
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
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
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
          {isPast && !item.done && (
            <Badge
              variant="outline"
              render={
                <button
                  type="button"
                  onClick={moveToToday}
                  disabled={pending}
                  aria-label="Move to today"
                />
              }
              className="cursor-pointer"
            >
              → today
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
