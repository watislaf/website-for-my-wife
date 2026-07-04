"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  type AchievementDef,
  type Category,
} from "@/lib/achievements/catalog";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/Reveal";
import { Stagger } from "@/components/motion/Stagger";
import { BadgeDetailDialog } from "./BadgeDetailDialog";
import { BadgeArt } from "./BadgeArt";

export type Earned = {
  count: number;
  firstEarnedAt: string;
  lastEarnedAt: string;
};

/** Format an earned UTC "YYYY-MM-DD HH:MM:SS" string to a local date. */
export function formatEarnedDate(ts: string): string {
  const [y, m, d] = ts.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return ts.slice(0, 10);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function LockedCard({ def }: { def: AchievementDef }) {
  return (
    <div
      title={def.hint}
      className="flex h-full flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-1 ring-foreground/10"
    >
      <div className="relative size-16 md:size-20">
        {/* The real badge, drained to unlit gray behind frosted glass. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/badges/${def.key}.svg`}
          alt="Locked achievement"
          className="size-full opacity-30 grayscale brightness-[.55] contrast-[.85]"
        />
        <div className="absolute inset-0 grid place-items-center rounded-full bg-neutral-500/20 ring-1 ring-inset ring-foreground/10 backdrop-blur-[2px] backdrop-grayscale">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-5 text-muted-foreground/80"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      </div>
      <span className="text-sm font-semibold text-muted-foreground">Locked</span>
      <span className="text-xs text-muted-foreground line-clamp-3">
        {def.hint}
      </span>
      <span className="mt-auto text-xs font-medium text-muted-foreground/80">
        🪙 {def.coins}
      </span>
    </div>
  );
}

function UnlockedCard({
  def,
  earned,
  onClick,
}: {
  def: AchievementDef;
  earned: Earned;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="flex h-full w-full flex-col items-center gap-2 rounded-xl bg-card px-3 py-4 text-center ring-2 ring-primary/40 shadow-sm cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50"
    >
      <BadgeArt
        badgeKey={def.key}
        effect={def.effect}
        alt={def.name}
        imgClassName="size-16 md:size-20 drop-shadow-sm"
      />
      <span className="text-sm font-semibold leading-snug">
        {def.name}
        {earned.count > 1 && (
          <span className="ml-1 text-xs font-medium text-primary">
            ×{earned.count}
          </span>
        )}
      </span>
      <span className="text-xs text-muted-foreground line-clamp-3">
        {def.description}
      </span>
      <div className="mt-auto flex flex-col items-center gap-0.5">
        <span className="text-xs font-semibold text-primary">🪙 {def.coins}</span>
        <span className="text-[10px] text-muted-foreground">
          {formatEarnedDate(earned.lastEarnedAt)}
        </span>
      </div>
    </motion.button>
  );
}

export function BadgeGrid({
  earnedByKey,
}: {
  earnedByKey: Record<string, Earned | undefined>;
}) {
  const [selected, setSelected] = useState<AchievementDef | null>(null);
  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <>
      {categories.map((category) => {
        const defs = ACHIEVEMENTS.filter((a) => a.category === category);
        if (defs.length === 0) return null;
        return (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
            <Stagger
              className={cn(
                "grid gap-3",
                "grid-cols-3 sm:grid-cols-4 md:grid-cols-6",
              )}
            >
              {defs.map((def) => {
                const earned = earnedByKey[def.key];
                const unlocked = (earned?.count ?? 0) >= 1;
                return (
                  <Reveal key={def.key} className="h-full">
                    {unlocked && earned ? (
                      <UnlockedCard
                        def={def}
                        earned={earned}
                        onClick={() => setSelected(def)}
                      />
                    ) : (
                      <LockedCard def={def} />
                    )}
                  </Reveal>
                );
              })}
            </Stagger>
          </section>
        );
      })}

      <BadgeDetailDialog
        def={selected}
        earned={selected ? earnedByKey[selected.key] : undefined}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
