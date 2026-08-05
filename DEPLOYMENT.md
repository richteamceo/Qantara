# Deploying CORE1X to Vercel

This app is a standard Next.js 16 App Router project — Vercel detects and
builds it with no extra config. The only real work is provisioning a
managed Postgres and pointing `DATABASE_URL` at it.

## What you need (that I can't create for you)

- A Vercel account, with this repo's branch (`claude/design-authority-review-azeq82`)
  importable — either connect your GitHub account to Vercel and import
  `richteamceo/Qantara` directly, or fork it first.
- A managed Postgres instance and its connection string. Any provider
  works; the two easiest from inside Vercel's own dashboard:
  - **Vercel Postgres** (Storage tab → Create Database → Postgres) — Neon
    under the hood, pooled connection string provided automatically.
  - **Neon** (neon.tech) directly via the Vercel Marketplace integration —
    same thing, one more click to set up.
  Use the **pooled** connection string if the provider distinguishes one
  (Neon calls it the "pooled connection" vs. "direct connection") — plain
  `pg.Pool` from a serverless function scales one pool per warm instance,
  and a pooled upstream connection is what keeps that from exhausting
  Postgres's own connection limit under real traffic.

## Steps

1. **Import the project.** Vercel dashboard → Add New → Project → import
   `richteamceo/Qantara` → select branch `claude/design-authority-review-azeq82`.
   Framework preset auto-detects as Next.js; no build command changes
   needed (`next build` / `next start` are already the default).
2. **Add Postgres.** Storage tab → Create Database → Postgres (or connect
   Neon via Marketplace). Vercel wires the connection string into your
   project's environment variables automatically — check what name it
   used (often `POSTGRES_URL` or `DATABASE_URL` depending on the
   integration) and either rename it or add a `DATABASE_URL` env var that
   points to the same value, since that's the exact name
   `src/db/index.ts` reads.
3. **Deploy.** Vercel builds and deploys on push automatically once the
   project is imported. First deploy will succeed (the app doesn't touch
   the database at build time) but every page will 500 until the schema
   exists — that's step 4.
4. **Migrate and seed.** Run these from any machine with network access
   to the new database (your laptop, or this sandbox if you paste the
   connection string into a throwaway local `.env` — never into a chat
   message):
   ```bash
   DATABASE_URL="<your pooled connection string>" npx drizzle-kit migrate
   DATABASE_URL="<your pooled connection string>" npx tsx src/db/seed.ts
   ```
   The seed script populates the golden transaction fixture
   (`MR-SWTBK-2026-0035` through `PV-2026-0076`) plus the disclosed demo
   records used to live-exercise each checkpoint's transitions
   (`MR-DEMO-0001`, `MR-DEMO-0002`, `FV-DEMO-0001`, two demo Variation
   Orders) — this is demo/fixture data by design (see
   `OWNER_ACCEPTANCE_PACK.md` §3), not real production data, so seeding a
   public deployment is intentional here.
5. **Open it.** `https://<your-project>.vercel.app/app/projects/SWTBK/control-room`.

## What this deployment is and isn't

Every checkpoint report in this repo discloses this build's real gaps
(`OWNER_ACCEPTANCE_PACK.md` §4) — most importantly **no real
authentication**: the "Acting as" role switcher (top bar) is a
self-service cookie, not a login. A public Vercel URL makes that
concrete: anyone with the link can act as any role, including
Managing Director / Finance / Accountant approval steps. Fine for a
review/demo deployment; not something to point real users or real data
at without Checkpoint 7's disclosed gap being closed first.
