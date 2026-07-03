"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  syncAndGetUnseen,
  markSeen,
  type UnseenAchievement,
} from "@/actions/achievements";

const AUTO_DISMISS_MS = 6000;
// Cap simultaneous popups so a first sync over a data-rich account can't flood
// the screen with dozens of toasts. Overflow is still marked seen (so it won't
// re-pop) and remains visible on the achievements page.
const MAX_TOASTS = 4;

/**
 * Client-only toaster that syncs achievements on mount + on navigation and pops
 * a small card at the bottom of the screen for each newly-earned, still-unseen
 * achievement. Marks them seen immediately so they don't re-pop on reload.
 *
 * Resilient by design: the server action never throws (returns [] on failure)
 * and every call is additionally wrapped in try/catch. It never blocks render.
 */
export function AchievementToaster() {
  const pathname = usePathname();
  const router = useRouter();

  const [toasts, setToasts] = React.useState<UnseenAchievement[]>([]);
  // Guard against overlapping syncs (a navigation firing mid-flight).
  const inflight = React.useRef(false);
  // Ids we've already surfaced this session so we never pop the same row twice.
  const surfaced = React.useRef<Set<number>>(new Set());

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (inflight.current) return;
      inflight.current = true;
      try {
        const unseen = await syncAndGetUnseen();
        if (cancelled || unseen.length === 0) return;

        const fresh = unseen.filter((a) => !surfaced.current.has(a.id));
        if (fresh.length === 0) return;

        for (const a of fresh) surfaced.current.add(a.id);
        // Only pop a handful at once; overflow is still marked seen below.
        setToasts((prev) => [...prev, ...fresh.slice(0, MAX_TOASTS)]);

        // Mark ALL fresh (incl. overflow) seen so nothing re-pops on reload.
        try {
          await markSeen(fresh.map((a) => a.id));
        } catch {
          // markSeen also swallows its own errors; belt-and-suspenders.
        }
      } catch {
        // Never throw / never block the page.
      } finally {
        inflight.current = false;
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4 sm:items-end sm:pr-6">
      <AnimatePresence initial={false}>
        {toasts.map((a) => (
          <Toast
            key={a.id}
            achievement={a}
            onDismiss={dismiss}
            onNavigate={() => router.push("/admin/achievements")}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * A single toast. Owns exactly one auto-dismiss timer via useEffect, cleared on
 * unmount — no redundant timers from animation callbacks.
 */
function Toast({
  achievement: a,
  onDismiss,
  onNavigate,
}: {
  achievement: UnseenAchievement;
  onDismiss: (id: number) => void;
  onNavigate: () => void;
}) {
  React.useEffect(() => {
    const t = setTimeout(() => onDismiss(a.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // One timer per toast id, cleared on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.id]);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      onClick={() => {
        onDismiss(a.id);
        onNavigate();
      }}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-primary/30 bg-card/95 px-4 py-3 text-left shadow-lg ring-1 ring-primary/10 backdrop-blur transition-colors hover:border-primary/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${a.achievementKey}.svg`}
        alt=""
        className="size-12 shrink-0"
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Achievement unlocked!
        </span>
        <span className="truncate text-sm font-semibold text-foreground">
          {a.name}
        </span>
        <span className="text-xs text-muted-foreground">🪙 {a.coins}</span>
      </span>
    </motion.button>
  );
}
