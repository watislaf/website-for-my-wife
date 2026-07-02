// Pure source-resolution for landing analytics. No DB / server-only imports so
// it stays trivially unit-testable.

// Known referer hostnames → coarse source label.
const HOST_SOURCES: Record<string, string> = {
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
};

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

  return HOST_SOURCES[host] ?? host.replace(/^www\./, "");
}
