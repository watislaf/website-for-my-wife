"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { transitions } from "@/lib/motion";

/**
 * Cross-fades + small-slides admin route content on navigation. Keyed on the
 * pathname so AnimatePresence swaps between routes. `mode="wait"` lets the old
 * page finish exiting before the new one enters.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={transitions.soft}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
