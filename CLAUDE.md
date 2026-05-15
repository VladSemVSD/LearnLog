# Learning Portal

Personal learning management portal. Solo project.

## Stack

Next.js 16 (App Router) · TypeScript · TailwindCSS v4 · shadcn/ui (base-nova preset, Base UI under the hood) · Prisma 7 · Postgres (Neon) · BetterAuth · Zod · React Hook Form · Vercel

## Architecture

- Feature-based slices under `features/<name>/` (UI, server, schema, types, constants colocated)
- Server actions for mutations (no internal REST), RSC for reads
- Single `LearningItem` table keyed by `type` enum — `PROJECT | COURSE | CERTIFICATION | VIDEO | BOOK | MISC`
- Status flow: `BACKLOG → PLANNED → IN_PROGRESS → PAUSED | COMPLETED | DROPPED`
- 3-layer split inside the Next.js app: UI → server actions/queries → service (Prisma)

## Conventions

- `kebab-case` filenames, `PascalCase` components
- Zod schema is the single source of truth; infer TS types from it (`z.infer<typeof schema>`)
- Every server action: `requireUser()` → Zod `safeParse` → service call → `revalidatePath`
- Every Prisma query is scoped by `userId` — never query without it
- shadcn primitives in `components/ui/` are not edited; wrap them in `components/shared/` if behavior needs to change
- Prisma client imports from `@/lib/generated/prisma/client` (Prisma 7's new client generator output)

## Auth

- BetterAuth with the Prisma adapter, email + password
- Session helpers in `features/auth/server.ts`: `getSession()`, `requireUser()`
- Client helpers in `features/auth/client.ts`: `signIn`, `signUp`, `signOut`, `useSession`
- Auth route mounted at `app/api/auth/[...all]/route.ts`

## Common commands

```bash
pnpm dev               # next dev (port 3000)
pnpm build             # next build
pnpm typecheck         # tsc --noEmit
pnpm lint              # eslint
pnpm db:generate       # prisma generate
pnpm db:migrate        # prisma migrate dev
pnpm db:studio         # prisma studio
```

## Environment

Required in `.env.local`:

- `DATABASE_URL` — Neon Postgres pooled connection string
- `BETTER_AUTH_SECRET` — 32+ char base64 secret
- `BETTER_AUTH_URL` — `http://localhost:3000` in dev

If Node TLS fails reaching the npm registry, set `NODE_EXTRA_CA_CERTS` to a `.pem` of your TLS-intercepting CA (e.g., Norton).

## Out of scope (don't suggest)

- Microservices, CQRS, event bus
- Global state libs (Zustand/Redux) — URL params + RSC are enough
- REST route handlers for internal mutations (only BetterAuth + future webhooks belong in `app/api/`)
- Tag string arrays — we use the explicit `LearningItemTag` join table

## Phase roadmap

1. **Foundation** (current) — scaffold, auth, empty shell
2. **MVP** — CRUD for LearningItem, tagging, filters, search, markdown notes, dashboard
3. **UX** — keyboard shortcuts, bulk actions, saved views, better mobile
4. **Analytics** — hours/week, completion rate, stale-items report, streaks
5. **AI** — suggest-next, summarize notes, URL → metadata enrichment
6. **Advanced** — roadmaps, dependencies, reminders, spaced repetition
