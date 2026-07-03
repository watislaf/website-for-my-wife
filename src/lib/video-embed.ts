// Convert a watch/share URL from a supported platform into its embeddable URL.
// Returns null when the URL isn't recognized (caller should render a plain link
// instead of an iframe — we never inject arbitrary untrusted embeds).
//
// Supported: YouTube (watch?v=, youtu.be, /shorts, existing /embed), Vimeo,
// Twitch (video + channel), TikTok. If the URL already looks like an embed URL
// for a known host, it's passed through.

export function toEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.pathname.startsWith("/embed/")) return u.toString();
    if (u.pathname.startsWith("/shorts/")) {
      const id = u.pathname.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  }
  if (host === "youtube-nocookie.com" && u.pathname.startsWith("/embed/")) {
    return u.toString();
  }

  // ── Vimeo ────────────────────────────────────────────────────────────────
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return /^\d+$/.test(id ?? "") ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") return u.toString();

  // ── Twitch ───────────────────────────────────────────────────────────────
  if (host === "twitch.tv") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "videos" && parts[1]) {
      return `https://player.twitch.tv/?video=${parts[1]}&parent=${TWITCH_PARENT}`;
    }
    if (parts[0]) {
      return `https://player.twitch.tv/?channel=${parts[0]}&parent=${TWITCH_PARENT}`;
    }
    return null;
  }
  if (host === "player.twitch.tv") return u.toString();

  // ── TikTok ───────────────────────────────────────────────────────────────
  if (host === "tiktok.com") {
    // .../@user/video/1234567890  →  https://www.tiktok.com/embed/v2/1234567890
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    if (u.pathname.startsWith("/embed/")) return u.toString();
    return null;
  }

  return null;
}

// Twitch's embedded player requires a `parent` matching the host it's embedded
// on. We can't know the runtime host in this pure/SSR-safe helper, so emit a
// placeholder default; the CLIENT component (VideoSection) rewrites `parent` to
// window.location.hostname after mount via `withTwitchParent` below.
const TWITCH_PARENT = "localhost";

/**
 * Rewrite the `parent` query param of a Twitch player embed URL to the given
 * host. No-op for non-Twitch URLs. Safe to call with the value returned by
 * `toEmbedUrl`. Returns the input unchanged if it isn't a valid URL.
 */
export function withTwitchParent(embed: string, host: string): string {
  if (!host) return embed;
  try {
    const u = new URL(embed);
    if (u.hostname !== "player.twitch.tv") return embed;
    u.searchParams.set("parent", host);
    return u.toString();
  } catch {
    return embed;
  }
}
