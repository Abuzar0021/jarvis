# OmniStack Digital — Setup & Deployment

## Local development

```bash
pnpm install
pnpm dev          # http://localhost:3000  ·  admin at /admin
```

Default admin password: `omnistack-admin` (change `ADMIN_PASSWORD` before launch).

## Quality gates

```bash
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm build        # production build
```

CI runs all three on every push (`.github/workflows/ci.yml`).

## Environment

Copy `.env.example` → `.env.local` (dev) or `.env` (Docker). Set before launch:

- `ADMIN_PASSWORD`, `ADMIN_SECRET` — admin login + cookie signing.
- `NEXT_PUBLIC_SITE_URL` — your domain (canonicals, sitemap, OG, feed).
- `SMTP_*` / `CONTACT_TO` — email notifications for enquiries (optional).
- `NEXT_PUBLIC_UMAMI_SRC` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` — analytics (optional).

The site validates env on startup and logs warnings for anything missing.

## Deploy with Docker (recommended for a VPS)

The app builds to a standalone server and persists content/uploads via volumes.

```bash
cp .env.example .env        # fill in values
docker compose up -d --build
```

- App: http://localhost:3000
- Content (`content/`) and uploads (`public/uploads/`) are mounted as volumes,
  so edits made in `/admin` survive redeploys.
- For automatic HTTPS, set `DOMAIN` in `.env` and uncomment the `caddy` service
  in `docker-compose.yml` (it proxies to the app and manages TLS certificates).

## Deploy without Docker (Node host: Railway / Render / Fly / VPS)

```bash
export NEXT_PUBLIC_SITE_URL=https://yourdomain.com   # needed at BUILD time
pnpm install && pnpm build
node .next/standalone/server.js     # or: pnpm start
```

> `NEXT_PUBLIC_SITE_URL` must be set **before `pnpm build`** so canonical, OG,
> and sitemap URLs bake into the static pages. With Docker, set it in `.env`
> (passed as a build arg by `docker-compose.yml`).

Ensure `content/` and `public/uploads/` are on a **persistent disk** so admin
edits and uploads are retained.

> Serverless platforms (e.g. Vercel) have a read-only filesystem at runtime, so
> live editing/uploads won't persist there. Use a Node host with a disk, or move
> content to a database/object store.

## Redirects

Manage redirects in `/admin → Redirects`. They're written to
`content/redirects.json` and applied by `next.config.ts` on the next build, so
redeploy (or rebuild) after changing them.

## Backups

`/admin → Tools → Download backup` exports all content as a single JSON file.
Restore from the same screen. Keep periodic backups before large edits.
