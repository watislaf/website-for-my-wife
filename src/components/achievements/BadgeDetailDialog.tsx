"use client";

import type { AchievementDef } from "@/lib/achievements/catalog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TiltCard } from "@/components/motion/TiltCard";
import { formatEarnedDate, type Earned } from "./BadgeGrid";

/**
 * Detail view for a single unlocked achievement. Renders a large badge inside a
 * TiltCard that follows the cursor. Controlled by the parent: `def` non-null =>
 * open. Closing (Esc / overlay / X) calls onOpenChange(false).
 */
export function BadgeDetailDialog({
  def,
  earned,
  onOpenChange,
}: {
  def: AchievementDef | null;
  earned: Earned | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={def !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {def && (
          <>
            <DialogHeader>
              <DialogTitle>{def.name}</DialogTitle>
              <DialogDescription>{def.description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-4 py-2">
              <TiltCard className="rounded-2xl bg-card p-8 ring-1 ring-foreground/10 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/badges/${def.key}.svg`}
                  alt={def.name}
                  className="size-32 md:size-40 drop-shadow"
                  style={{ transform: "translateZ(40px)" }}
                />
              </TiltCard>

              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                  🪙 {def.coins}
                </span>
                {earned && earned.count > 1 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 font-semibold ring-1 ring-foreground/10">
                    ×{earned.count} earned
                  </span>
                )}
                {earned && (
                  <span className="text-muted-foreground">
                    {formatEarnedDate(earned.lastEarnedAt)}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
