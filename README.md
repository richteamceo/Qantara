# CORE1X

Construction-commercial control application, built against the CORE1X V7.0
design-authority pack under a gated checkpoint process. See
`OWNER_ACCEPTANCE_PACK.md` for the consolidated, current status across all
checkpoints (currently through Checkpoint 13) — every checkpoint remains
**not owner-accepted**; that pack, not this file, is kept current after
each one.

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

## Deploying

See `DEPLOYMENT.md` for a Vercel + managed Postgres walkthrough.

## Scope

Nine V7 page contracts plus two self-scoped additions (a real multi-tier
approval engine, a Variation Order register) are implemented against a
deliberately narrow slice of the full canonical domain model — enough to
compute every KPI from real, joined data rather than fabricate it. See
`OWNER_ACCEPTANCE_PACK.md` for what's built and what's still an open gap;
individual `CHECKPOINT_N_REPORT.md` files and `evidence/v7/checkpoint-N/`
have the detail and reconciliation evidence per checkpoint.
