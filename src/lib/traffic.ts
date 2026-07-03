// Pure source-resolution for landing analytics. No DB / server-only imports so
// it stays trivially unit-testable.

// Known referer hostnames → coarse source label.
export const HOST_SOURCES: Record<string, string> = {
  "instagram.com": "instagram",
  "l.instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "t.co": "tiktok",
  "twitch.tv": "twitch",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "pinterest.com": "pinterest",
  "pin.it": "pinterest",
  "reddit.com": "reddit",
  "bing.com": "search",
  "duckduckgo.com": "search",
};

// Search engines whose hostname varies by TLD (google.com, google.co.uk, …).
// Matched by second-level label after stripping a leading `www.`.
const SEARCH_HOST_PREFIXES = ["google."];

/**
 * Resolve a coarse traffic source.
 * 1. A non-empty `utmSource` wins → trimmed + lowercased.
 * 2. Otherwise map the referer's hostname via a lookup; unknown hosts return the
 *    bare hostname with a leading `www.` stripped.
 * 3. Otherwise (null/empty/unparseable) → "direct".
 */
export function resolveSource(utmSource: string | null, referer: string | null): string {
  const utm = utmSource?.trim();
  if (utm) return utm.toLowerCase();

  const ref = referer?.trim();
  if (!ref) return "direct";

  let host: string;
  try {
    host = new URL(ref).hostname.toLowerCase();
  } catch {
    return "direct";
  }
  if (!host) return "direct";

  const bare = host.replace(/^www\./, "");
  if (HOST_SOURCES[host]) return HOST_SOURCES[host];
  if (HOST_SOURCES[bare]) return HOST_SOURCES[bare];
  if (SEARCH_HOST_PREFIXES.some((p) => bare.startsWith(p))) return "search";
  return bare;
}

// ---- presentation helpers (raw keys stay for aggregation) ----

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitch: "Twitch",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  reddit: "Reddit",
  search: "Search",
};

/** Friendly display label for a raw source key. Known keys get a proper name;
 *  unknown keys (bare domains) are shown as-is. Empty → "Unknown". */
export function sourceLabel(source: string): string {
  if (!source) return "Unknown";
  return SOURCE_LABELS[source] ?? source;
}

/** Friendly display label for a raw click-target key. Empty target (missing
 *  payload) is surfaced as "Unknown link" rather than silently bucketed. */
export function targetLabel(target: string): string {
  return target ? target : "Unknown link";
}

/** Friendly label for a utm_medium / utm_campaign value (null/empty → given
 *  fallback, e.g. "(none)"). */
export function utmLabel(value: string | null, fallback = "(none)"): string {
  return value && value.length > 0 ? value : fallback;
}
