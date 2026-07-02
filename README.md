# personal-site

## What this is

A single Next.js app that serves two things from one deployment:

- **Public cooking landing** (`/`) — a creator landing page: hero, about, dish
  gallery, and social links. Content lives in `src/content/landing.ts`.
- **Password-protected admin** (`/admin`) — a private life-ops console behind a
  single password:
  - **Planner** — dated to-do items (`/admin/planner`)
  - **Goals** — daily habit checks with streaks (`/admin/goals`)
  - **Work tracker** — income entries per source, split into periods (`/admin/work`)
  - **Stats** — monthly earnings, per-source cumulative area chart, and a
    year-long work heatmap (`/admin/stats`)
  - **Landing analytics** — anonymous aggregate traffic for the public page
    (`/admin/traffic`)

Data is stored in a local SQLite file (via Drizzle + better-sqlite3). Migrations
run automatically on server boot from `drizzle/`.

## Local dev

Requires Node 20+ (developed on Node 24).

1. **Install deps**

   ```bash
   npm install
   ```

2. **Create `.env.local`** in the project root:

   ```bash
   # a random 32-byte (64 hex char) secret for signing the session cookie
   SESSION_SECRET=$(openssl rand -hex 32)

   # bcrypt hash of your admin password (see below)
   ADMIN_PASSWORD_HASH=<bcrypt-hash>

   # optional; defaults to ./data/app.db
   DATABASE_PATH=./data/app.db
   ```

   Generate a bcrypt hash for your chosen password with bcryptjs:

   ```bash
   node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
   ```

   > **`.env.local` `$`-escaping gotcha (this will silently break login):**
   > Bcrypt hashes look like `$2b$12$....`. Next's dotenv loader performs
   > `$VAR` expansion on `.env.local`, so an **unescaped** `$` corrupts the hash
   > and `bcrypt.compare` fails with no error — login just silently rejects the
   > right password. In `.env.local` you **must** escape every `$` as `\$`:
   >
   > ```
   > ADMIN_PASSWORD_HASH=\$2b\$12\$/DGeE2Tkbxq...
   > ```
   >
   > This escaping is **only** for `.env.local` (local dev). The **server**
   > `/opt/personal/.env` uses the **RAW, unescaped** hash — Docker's `env_file`
   > does no `$`-expansion, so escaping there would instead corrupt it.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 for the landing page, http://localhost:3000/admin
   for the console (you'll be redirected to `/login`).

4. **Seed demo data** (optional but recommended — see below):

   ```bash
   npm run db:seed
   ```

### Seeding

`npm run db:seed` runs `scripts/seed.ts` and populates the DB with realistic
demo data (2 income sources, ~40 work entries over the last 3 months, a period
marker at the start of the current month, 3 goals with scattered checks, and 5
planner items) so the dashboard, stats charts, and heatmap render against real
data.

It is **idempotent-ish**: if `income_sources` already has rows it prints
`already seeded` and exits without inserting, so re-running is safe.

> **Why `npm run db:seed` and not `npx tsx scripts/seed.ts` directly?**
> The script imports `@/db`, which pulls in `server-only`. Under a plain Node/
> tsx run that resolves to the "you imported a server module on the client"
> throw. The npm script sets `NODE_OPTIONS=--conditions=react-server`, which
> makes `server-only` resolve to its empty stub. If you want to invoke tsx
> directly, use:
>
> ```bash
> NODE_OPTIONS=--conditions=react-server npx tsx scripts/seed.ts
> ```

### Tests & build

```bash
npm test        # vitest (periods + streaks unit tests)
npm run build   # production build sanity check
```

## Changing landing content

- Edit `src/content/landing.ts` — name, headline, about copy, and the social
  links (set each social's real `url`, `handle`, and `accent` color).
- Drop real photos into `public/landing/` and update the `heroImage`,
  `portrait`, and `gallery` paths in the same file (they ship with placeholder
  SVGs).

## Changing the admin password

1. Generate a new bcrypt hash:

   ```bash
   node -e "console.log(require('bcryptjs').hashSync('new-password', 12))"
   ```

2. On the server, update `ADMIN_PASSWORD_HASH` in `/opt/personal/.env` with the
   **RAW** hash (no `\$` escaping — Docker `env_file` does not expand `$`).

3. Restart the app:

   ```bash
   docker compose restart app
   ```

For local dev, update `.env.local` instead (remember: **`\$`-escaped** there).

## Provisioning (first-time server setup)

Infra lives in `infra/` (Terraform, Hetzner Cloud).

1. **Provision the server:**

   ```bash
   terraform -chdir=infra init
   terraform -chdir=infra validate
   terraform -chdir=infra apply
   ```

   Requires `TF_VAR_hcloud_token` (Hetzner API token) and an SSH key configured
   in the Terraform variables.

2. **One-time `.env` creation over SSH.** SSH into the server and create
   `/opt/personal/.env` with the production values — using the **RAW,
   unescaped** bcrypt hash:

   ```
   SESSION_SECRET=<64 hex chars>
   ADMIN_PASSWORD_HASH=$2b$12$....   # RAW hash, NO \$ escaping
   TZ=Europe/Warsaw
   ```

3. **Set the timezone (`TZ`).** "Today" for the planner, goals, and work tracker
   is computed from the **server's local time**, so set `TZ` on the server /
   compose service to the user's timezone (default `Europe/Warsaw`). Otherwise a
   UTC server rolls "today" over at the wrong local hour.

## Deployment (CI/CD)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the Docker
image, pushes it to GHCR, copies the compose file + `Caddyfile` to the Hetzner
server, and runs `docker compose pull && docker compose up -d`. The SQLite DB lives
on the host bind-mount (`/opt/personal/data`), so data survives redeploys.

Required repo secrets: `SERVER_IP`, `SSH_PRIVATE_KEY` (GHCR uses the built-in
`GITHUB_TOKEN`).

**GHCR image names must be lowercase** — the workflow lowercases the repository
automatically, but keep the GitHub owner/repo lowercase to be safe.

**Manual re-pulls on the server:** the deploy run logs into GHCR with the per-run
`GITHUB_TOKEN`, so the automated pull works even for a private repo. To pull
manually later (outside a workflow run) you need a Personal Access Token with
`read:packages`:

```bash
docker login ghcr.io -u <github-user> -p <PAT_with_read:packages>
```

## Adding a domain

The public site is served by Caddy. To point it at a real domain:

1. Edit `Caddyfile`: change the site address from `:80` to your domain, e.g.
   `example.com`.
2. Point the domain's DNS `A` record at the server IP.
3. Redeploy (push to `main`, or copy the `Caddyfile` and
   `docker compose up -d caddy`).

Caddy auto-provisions and renews TLS certificates via Let's Encrypt once the
domain resolves — no manual certificate steps.

## Backups

A cron job (`scripts/backup.sh`) runs nightly at **03:15 server time** and keeps
the **last 14** snapshots of the SQLite DB.

To **restore** from a backup:

```bash
cp <backup-file> /opt/personal/data/app.db
docker compose restart app
```

## Landing analytics / privacy

The landing page records **anonymous aggregate** events only:

- Event type (`pageview` / `link-click`) and, for clicks, which link.
- A **coarse traffic source** (e.g. `tiktok` / `instagram` / `twitch` /
  `direct` / referrer domain).
- The date (server-local `YYYY-MM-DD`).

There are **no cookies, no IP addresses, and no personal data** collected, and
**nothing is sent to any third party** — all events are stored in the
self-hosted SQLite DB and shown only in `/admin/traffic`.
