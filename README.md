This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
