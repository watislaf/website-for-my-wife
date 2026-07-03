"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CalendarIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateToStr, strToDate, prettyDate } from "@/components/work/format";

export type DateFilter = { from: string; to: string };

/** Date-range filter that drives the URL searchParams (?from=&to=), mirroring
 *  the work page. The server page reads these and scopes its aggregations. */
export function FilterBar({
  filter,
  isFiltered,
}: {
  filter: DateFilter;
  isFiltered: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  function apply(next: DateFilter) {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-sm text-muted-foreground sm:mr-1">
          Date range
        </span>

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
            onClick={() => apply({ from: "", to: "" })}
          >
            <XIcon />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
