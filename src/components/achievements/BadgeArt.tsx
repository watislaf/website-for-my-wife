import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { BadgeEffect } from "@/lib/achievements/catalog";

/**
 * Renders a badge image wrapped in an effect layer. When `effect` is set, the
 * wrapper gets a `.badge-fx--<effect>` class whose ::before/::after pseudo
 * elements (defined in globals.css) paint the flashy overlay — flames, glow,
 * rainbow rain, etc. Without an effect it's just the plain image in a neutral
 * wrapper, so callers can use it unconditionally.
 *
 * Sizing lives on the <img> via `imgClassName` (e.g. "size-16"); the wrapper is
 * inline-flex and shrink-wraps the image so overlays line up with the artwork.
 */
export function BadgeArt({
  badgeKey,
  effect,
  alt,
  imgClassName,
  className,
  style,
}: {
  badgeKey: string;
  effect?: BadgeEffect;
  alt: string;
  imgClassName?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn("badge-fx", effect && `badge-fx--${effect}`, className)}
      data-effect={effect}
      style={style}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/badges/${badgeKey}.svg`}
        alt={alt}
        className={cn("badge-fx__img", imgClassName)}
      />
    </span>
  );
}
