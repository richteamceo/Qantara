# CORE1X

Construction-commercial control application, built against the CORE1X V7.0
design-authority pack under a gated checkpoint process. See
`GATE_0_INTAKE_REPORT.md` and `CHECKPOINT_1_REPORT.md` for status — the
current build is Checkpoint 1 (application shell + Project Commercial
Control Room), **not owner-accepted**.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM ·
PostgreSQL.

## Local setup

```bash
npm install
createdb core1x   # or point DATABASE_URL at an existing Postgres instance
cp .env.example .env  # set DATABASE_URL
npx drizzle-kit migrate
npx tsx src/db/seed.ts   # seeds the golden transaction fixture
npm run dev
```

Open `/` for the projects index, or go directly to
`/app/projects/SWTBK/control-room`.

## Scope

Only Page 01 (Control Room) is implemented, against a deliberately narrow
slice of the full canonical domain model — enough to compute its KPIs from
real, joined data rather than fabricate them. See `CHECKPOINT_1_REPORT.md`
for exactly what is and isn't built yet, and
`evidence/v7/checkpoint-1/P01/` for reconciliation evidence and
screenshots.
