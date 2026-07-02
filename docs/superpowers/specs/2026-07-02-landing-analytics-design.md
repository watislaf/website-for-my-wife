# Landing Analytics — Design Spec

**Date:** 2026-07-02
**Status:** Approved
**Context:** Addition to the Personal Site plan (`plan.md`). Adds first-party,
privacy-respecting analytics for the public landing page: how many visitors
arrive, from what source, and which links they click.

## Goals

- Count landing-page **pageviews**, attributed to a traffic **source**.
- Count **clicks** on outbound links (socials, hero CTAs, footer), attributed to
  both the link **target** and the source.
- View it all in the admin under a dedicated **`/admin/traffic`** page.
- No cookies, no IP storage, no third-party scripts. Self-hosted in the same
  SQLite DB. GDPR-light, no consent banner required.

## Non-goals (out of scope)

Unique-visitor dedup, geo/device breakdown, real-time streaming, bot filtering
beyond trivial, funnels/sessions.

## Data model

One new table, added to `src/db/schema.ts` (Task 2):

```ts
export const landingEvents = sqliteTable("landing_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),                         // "pageview" | "click"
  source: text("source").notNull().default("direct"),  // tiktok | instagram | twitch | direct | <domain>
  target: text("target").notNull().default(""),         // click only: which link (e.g. "tiktok", "hero-cta")
  date: text("date").notNull(),                         // YYYY-MM-DD (server local)
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
```

## Source resolution (server-side, `src/lib/traffic.ts`, TDD-tested)

`resolveSource(utmSource: string | null, referer: string | null): string`

1. If `utmSource` is non-empty → normalize (lowercase, trim) and return it.
2. Else if `referer` present → map its hostname to a known source via a lookup
   table (`instagram.com`→`instagram`, `t.co`/`tiktok.com`/`vm.tiktok.com`→`tiktok`,
   `twitch.tv`→`twitch`, `l.instagram.com`→`instagram`, etc.); unknown hostnames
   return the bare hostname (registrable domain) so nothing is lost.
3. Else → `"direct"`.

Pure function → unit tests cover: UTM wins over referer; each known referer maps;
unknown referer returns hostname; empty/both-null → `"direct"`; case/whitespace
normalization.

## Capture

### `POST /api/track` (public route)
- Body: `{ type: "pageview" | "click", target?: string, utmSource?: string }`.
- Reads the `Referer` request header; computes `source = resolveSource(utmSource, referer)`.
- Validates `type`; `target` only stored for clicks (ignored/empty for pageviews).
- Inserts one `landingEvents` row with `date = todayStr()`.
- Light in-memory rate limit (same style as the login route) to blunt trivial abuse.
- Always returns 204 quickly; never throws to the client (analytics must never break the page).

### Landing page beacons (Task 4)
- **Pageview:** on mount, read `utm_source` from `location.search`, then
  `navigator.sendBeacon("/api/track", blob({type:"pageview", utmSource}))`.
  Fire-and-forget; falls back to `fetch(..., {keepalive:true})` if `sendBeacon`
  is unavailable.
- **Clicks:** each tracked link's `onClick` fires a click beacon
  (`{type:"click", target, utmSource}`) BEFORE the normal `<a href>` navigation
  proceeds. Because `sendBeacon` is non-blocking, the outbound navigation to
  TikTok/IG/Twitch is unaffected even if tracking fails or the server is down.
- Tracked targets: each social (`tiktok`/`instagram`/`twitch`), hero CTA buttons,
  and the footer `/login` chef-hat is NOT tracked (internal).

A tiny client helper `trackClick(target)` centralizes the beacon logic and is
imported by Hero/Socials/footer components.

## Viewing — `/admin/traffic` (new Task 17)

Server component aggregates from `landingEvents` in TS, passes to client charts
(recharts, already in stack; pink theme):

- **Headline cards:** total views, total clicks, click-through rate (clicks/views).
- **Views by source** — bar chart / table.
- **Clicks by link (target)** — bar chart / table.
- **Clicks by source** — small breakdown.
- **Last 30 days** — line of daily views vs clicks.
- Friendly empty state when no events yet.

Guarded by the existing `/admin/:path*` middleware. Added to the sidebar nav and
Cmd+K palette (Task 5): "Traffic" with a chart/activity lucide icon.

## Plan integration summary

- **Task 2 (DB):** add `landingEvents` table; regenerate migration.
- **Task 4 (landing):** add pageview beacon + click beacons via `trackClick`.
- **Task 5 (admin shell):** add "Traffic" sidebar item + Cmd+K entry.
- **New Task 17:** `src/lib/traffic.ts` (+ tests), `POST /api/track` route,
  `src/app/admin/traffic/page.tsx` + `src/components/traffic/TrafficBoard.tsx`.

## Privacy statement (for README)

The site records anonymous, aggregate landing events (a page-load or a link-click,
with a coarse source label and a date). It stores no cookies, no IP addresses, and
no personal data, and sends nothing to third parties. All data lives in the same
self-hosted SQLite file as the rest of the app.
