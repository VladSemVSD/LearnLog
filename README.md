# Learning Portal

A personal learning management portal — track projects, courses, certifications, books, and videos through a single `BACKLOG → PLANNED → IN_PROGRESS → PAUSED | COMPLETED | DROPPED` flow. Solo project.

## Stack

- **Next.js 16** (App Router, `cacheComponents` / `"use cache"`)
- **TypeScript** · **TailwindCSS v4** · **shadcn/ui** (base-nova preset, Base UI under the hood)
- **Prisma 7** + **Neon Postgres** (driver adapter, pooled connections)
- **BetterAuth** (email + password, Prisma adapter)
- **Zod** + **React Hook Form**
- **Vercel** (deploy target)

## Local setup

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env.local        # then fill in values (see below)
pnpm db:migrate                   # applies migrations to your Neon DB
pnpm dev                          # http://localhost:3000
```

### Environment variables

| Var                   | Required | Notes                                                                    |
| --------------------- | -------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`        | yes      | Neon **pooled** connection string (`...-pooler...`)                      |
| `BETTER_AUTH_SECRET`  | yes      | 32+ char secret: `openssl rand -base64 32` (generate a fresh one)        |
| `BETTER_AUTH_URL`     | yes      | `http://localhost:3000` in dev; deployment URL in prod                   |
| `NODE_EXTRA_CA_CERTS` | optional | Path to TLS-intercepting CA `.pem` (e.g., behind Norton on Windows)      |

## Scripts

| Command            | What it does                                       |
| ------------------ | -------------------------------------------------- |
| `pnpm dev`         | Next dev server on port 3000                       |
| `pnpm build`       | `prisma migrate deploy && next build` (prod build) |
| `pnpm start`       | Start the production server                        |
| `pnpm typecheck`   | `tsc --noEmit`                                     |
| `pnpm lint`        | ESLint                                             |
| `pnpm test`        | Vitest (run once)                                  |
| `pnpm test:watch`  | Vitest watch mode                                  |
| `pnpm db:generate` | `prisma generate`                                  |
| `pnpm db:migrate`  | `prisma migrate dev` (creates & applies migration) |
| `pnpm db:push`     | `prisma db push` (schema-only, no migration file)  |
| `pnpm db:studio`   | Prisma Studio                                      |

## Project layout

```
app/                   # Next.js App Router (routes, RSC pages)
features/<name>/       # Feature slices: ui/, server/, schema/, types/
  auth/                # BetterAuth client + server helpers
components/ui/         # shadcn primitives (do not edit)
components/shared/     # Project wrappers over shadcn primitives
lib/                   # auth, db, cache, utils
prisma/                # schema.prisma + migrations
proxy.ts               # Edge middleware (Next 16 renamed `middleware.ts` → `proxy.ts`)
docs/architecture.md   # High-level architecture reference
```

Mutations go through server actions (no internal REST). Every server action: `requireUser()` → Zod `safeParse` → service call → `revalidatePath`. Every Prisma query is scoped by `userId`.

For the full architecture overview see [`docs/architecture.md`](docs/architecture.md).

## Deploy to Vercel

### One-time setup

1. **Create a Neon project** at [neon.tech](https://neon.tech). Copy the **pooled** connection string (the URL containing `-pooler`).
2. **Push this repo to GitHub** (or your Git host).
3. **Import the project** at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js + pnpm from the lockfile.
4. **Add environment variables** in Project Settings → Environment Variables (apply to Production + Preview + Development):
   - `DATABASE_URL` — Neon pooled URL
   - `BETTER_AUTH_SECRET` — fresh 32+ char secret (do **not** reuse the dev one)
   - `BETTER_AUTH_URL` — your Vercel URL, e.g. `https://your-project.vercel.app` (update to your custom domain once wired)
5. **Deploy.** The build script runs `prisma migrate deploy` before `next build`, so migrations apply automatically on each deploy.

### What happens on each deploy

- `pnpm install` runs `postinstall` → `prisma generate` (Prisma client lands in `lib/generated/prisma/`)
- `pnpm build` runs `prisma migrate deploy` (applies any pending migrations to the prod DB) then `next build`
- If `prisma migrate deploy` fails, the deploy aborts before building — your prod DB never ends up half-migrated

### Custom domain

Once wired up in Vercel: update `BETTER_AUTH_URL` to the canonical domain (BetterAuth uses it to derive cookie domain / trusted origins). Redeploy.

### Security headers

`next.config.ts` sets HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a minimal `Permissions-Policy`. No CSP yet — Tiptap and Next make a tight CSP fiddly; revisit when needed.
