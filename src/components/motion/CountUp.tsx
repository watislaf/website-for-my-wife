"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

type CountUpProps = {
  /** Target value to animate to. */
  value: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Format the displayed number (e.g. toLocaleString, money). */
  format?: (n: number) => string;
  className?: string;
};

/**
 * Animates a number from 0 up to `value` on mount. Snaps directly to the final
 * value under prefers-reduced-motion. Formatting is applied to each frame's
 * value via `format` (defaults to rounded integer + locale separators).
 */
export function CountUp({
  value,
  duration = 1,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimated(v),
    });
    return () => controls.stop();
  }, [value, duration, reduced]);

  // Reduced-motion users see the final value straight from the prop (no
  // animation, no synchronous state sync in the effect).
  const display = reduced ? value : animated;
  return <span className={className}>{format(display)}</span>;
}
