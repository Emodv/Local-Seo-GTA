# AtlasJobs AI — The Autonomous Executive Job Hunter

Production-grade SaaS that finds high-quality executive marketing roles,
researches companies, scores fit, tailors résumés (ATS-safe, no fabrication),
drafts outreach and Gmail applications, and — under a strict, compliant approval
model — assists or automates applying. Primary user: Emod Vafa (Toronto, $170k+).

> **Status: Phase 1 (Foundation).** This is a phased build, not a finished
> product. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) §11 for the sequence and be
> clear-eyed: a production 100k-user system is built incrementally, each phase
> shippable and tested. Nothing here claims to auto-apply yet.

## What exists now (Phase 1)
- ✅ **Complete production architecture** — [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- ✅ **Full database schema** — [`prisma/schema.prisma`](./prisma/schema.prisma)
  (Users, Companies, Jobs, Applications, Recruiters, Hiring Managers, Résumés +
  Versions, Cover Letters, Email Drafts, Outreach, Interviews, Notes, Tasks,
  Activity Log, Analytics, Settings, Approval Rules, Job Sources)
- ✅ **Infra topology** — [`docker-compose.yml`](./docker-compose.yml) (Postgres,
  Redis, service placeholders) + [`.env.example`](./.env.example)
- ✅ **Monorepo root** — pnpm workspaces + Turborepo
- ♻️ **Tested domain core** — the scoring / résumé-tailoring / cover-letter engine
  in [`../job-agent`](../job-agent) (18 passing unit tests) is promoted to
  `packages/core` in Phase 2.

## Not built yet (later phases — honest)
- Next.js 15 web app, NestJS API, Python AI worker (skeletons land in Phase 2).
- Live source adapters, résumé PDF rendering, Gmail-draft execution, apply engine.

## Compliance stance (read `ARCHITECTURE.md` §4)
Job data comes only from **permitted** sources: official ATS APIs
(Greenhouse/Lever/Ashby/SmartRecruiters/Workday), a **licensed** aggregator for
LinkedIn/Indeed/Google-Jobs *content*, public boards, and your own Gmail.
**We do not scrape ToS-restricted sites and we never automate LinkedIn Easy
Apply.** Auto-submit is limited to permitted channels under an explicit,
revocable `ApprovalRule`. The `JobSource` table records the legal basis for
every job that enters the pipeline.

## Getting started (Phase 1)
```bash
cd atlasjobs
cp .env.example .env          # fill DATABASE_URL etc.
pnpm install
pnpm infra:up                 # start postgres + redis
pnpm db:generate              # generate Prisma client
pnpm db:migrate               # create the schema
```

## Repo layout
```
atlasjobs/
├─ apps/web            Next.js 15 dashboard (Phase 2+)
├─ apps/api            NestJS API — DDD / CQRS / repositories (Phase 2+)
├─ services/ai-worker  Python 3.11 agents · Playwright · PDF · LLM (Phase 2+)
├─ packages/core       Domain logic (promoted from ../job-agent)
├─ packages/db         Prisma client + migrations
├─ packages/contracts  Shared Zod schemas + types
├─ prisma/             Canonical schema + seed
├─ docker-compose.yml  Local topology
└─ ARCHITECTURE.md     The full design (start here)
```
