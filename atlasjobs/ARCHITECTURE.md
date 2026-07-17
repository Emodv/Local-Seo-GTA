# AtlasJobs AI — Production Architecture

**The Autonomous Executive Job Hunter.** Finds high-quality executive marketing
roles, researches companies, scores fit, tailors résumés, drafts outreach and
Gmail applications, and — within a strict, compliant approval model — assists or
automates applying. Primary user: Emod Vafa (Toronto, $170k+ CAD).

This document is the source of truth for *how the system is built and why*. It is
written to hold at 100k users. It is deliberately honest about what is legal,
what is technically bounded, and what stays human-in-the-loop.

---

## 0. Non-negotiable design principles

1. **Compliance is an architectural constraint, not a feature toggle.** We never
   scrape or automate a logged-in session on a site whose ToS forbids it
   (LinkedIn, Indeed). Job data comes from *permitted* sources (official ATS
   APIs, licensed aggregators, public RSS/JSON boards, the user's own inbox).
2. **The human owns the "Submit" click by default.** Auto-submit exists only for
   channels where it is permissible and only under an explicit, per-rule,
   revocable consent — never as an unattended LinkedIn bot.
3. **Never fabricate.** Résumé/cover-letter generation may reorder, reframe, and
   optimize — never invent experience, employers, dates, or metrics. Enforced in
   code and tests, not just prompts.
4. **Every autonomous action is auditable.** Append-only `ActivityLog`; every
   AI decision stores its inputs, model, prompt hash, and output.
5. **Reuse the tested core.** The scoring / tailoring / cover-letter engine
   already built and unit-tested (`/job-agent`) is promoted to
   `packages/core` and consumed by the API and workers.

---

## 1. System context (C4 level 1)

```
                        ┌─────────────────────────────────────────┐
                        │                 Emod (User)              │
                        │  Web dashboard · Email · Slack · Push     │
                        └───────────────┬─────────────────────────┘
                                        │ HTTPS
                        ┌───────────────▼─────────────────────────┐
                        │            apps/web (Next.js 15)          │
                        │   Dashboard · Kanban · Review & Send      │
                        └───────────────┬─────────────────────────┘
                                        │ REST/tRPC + WebSocket
                        ┌───────────────▼─────────────────────────┐
                        │            apps/api (NestJS)              │
                        │  Auth · Domain services · Job orchestration│
                        └──┬──────────┬──────────────┬─────────────┘
                           │          │              │
                 ┌─────────▼──┐  ┌────▼─────┐  ┌─────▼───────────────┐
                 │ Postgres    │  │  Redis   │  │ BullMQ queues        │
                 │ (Prisma)    │  │ cache/rl │  │ discovery/enrich/... │
                 └─────────────┘  └──────────┘  └─────┬───────────────┘
                                                      │ jobs
                        ┌─────────────────────────────▼─────────────┐
                        │      services/ai-worker (Python 3.11)      │
                        │  Agents · Playwright (permitted sites) ·   │
                        │  LLM calls (Claude) · PDF render           │
                        └───────────┬───────────────────┬───────────┘
                                    │                   │
                   ┌────────────────▼───┐   ┌───────────▼──────────────┐
                   │ Permitted job data │   │ External integrations     │
                   │ • ATS APIs (GH/    │   │ • Gmail API (drafts)       │
                   │   Lever/Ashby/     │   │ • Google/MS Calendar       │
                   │   SmartRecruiters) │   │ • Apollo/enrichment (opt)  │
                   │ • Licensed jobs API│   │ • Glassdoor/Crunchbase via │
                   │ • RemoteOK/RSS     │   │   licensed/allowed sources │
                   └────────────────────┘   └──────────────────────────┘
```

---

## 2. Monorepo layout

```
atlasjobs/
├─ apps/
│  ├─ web/                 # Next.js 15 (App Router) + Tailwind + shadcn + Framer
│  └─ api/                 # NestJS (Clean Architecture / DDD / CQRS)
├─ services/
│  └─ ai-worker/           # Python 3.11 agents, Playwright, PDF, LLM
├─ packages/
│  ├─ core/                # Domain logic (promoted from /job-agent): scoring,
│  │                       #   tailoring, cover letters, decision gates — pure, tested
│  ├─ db/                  # Prisma client + schema + migrations (shared)
│  ├─ contracts/           # Zod schemas + shared TS types (API <-> web <-> worker)
│  └─ config/              # eslint, tsconfig, tailwind presets
├─ prisma/                 # schema.prisma (canonical), seed
├─ docker-compose.yml      # postgres, redis, api, web, ai-worker
├─ .env.example
└─ docs/                   # ADRs, runbooks, deployment guide
```

Tooling: **pnpm workspaces + Turborepo**, TypeScript project references, Python
via `uv`/Poetry in the worker. Shared contracts package keeps the three runtimes
type-safe across the boundary (Zod at the edges, generated types inward).

---

## 3. Services

### apps/api — NestJS (Clean Architecture, DDD, CQRS)
- **Modules** map to bounded contexts: `identity`, `jobs`, `companies`,
  `applications`, `resumes`, `outreach`, `interviews`, `analytics`, `settings`.
- **CQRS**: commands (TailorResume, DraftApplicationEmail, EnqueueDiscovery) vs
  queries (GetPipeline, GetTopMatches). Read models are denormalized for the
  dashboard.
- **Repository pattern** over Prisma; domain services never import Prisma
  directly.
- **Orchestration**: API enqueues BullMQ jobs; workers publish results back via
  events → API updates read models → WebSocket pushes to the dashboard.

### services/ai-worker — Python 3.11
- Hosts the **AI agents** (§5) and the only place Playwright runs.
- Playwright is used **only** for: (a) rendering résumé/cover-letter PDFs, and
  (b) driving the *user's own* authenticated browser context for assisted apply
  on permitted portals — never headless scraping of ToS-restricted sites.
- LLM calls go through a single `LLMGateway` (Claude default) with prompt
  templates, JSON-schema-constrained outputs, retries, and cost/token logging.

### packages/core — the brain (already built & tested)
`enrich` (seniority + salary estimate) · `filters` (hard rejects) · `fit-score`
(weighted 0–100, tunable) · `selectors` (résumé variant + brag stories) ·
`resume-tailor` (ATS-safe reorder + permanent/fractional summary) · `decision`
(manual/assisted/autonomous gates) · `cover-letter`. Pure functions, no I/O →
runs identically in API and worker, and is unit-tested (18 tests today).

---

## 4. Compliance & data-sourcing architecture (the part most tools get wrong)

Every "search everywhere" source is classified and routed by a **SourceAdapter**
with a declared legal basis:

| Tier | Sources | Method | Auto-apply? |
|---|---|---|---|
| **A — Official APIs** | Greenhouse, Lever, Ashby, SmartRecruiters, Workday (tenant APIs), RemoteOK, Job Bank feeds | Documented JSON APIs / RSS | Email/portal per site ToS, human-approved |
| **B — Licensed aggregator** | LinkedIn/Indeed/Google Jobs **content** | Via a paid, licensed jobs-data API (e.g. Coresignal/SerpApi-class) — never direct scraping | Discovery only; apply via original URL, human |
| **C — User-owned** | The user's Gmail (recruiter replies), user's authenticated browser | Gmail API; user-driven Playwright context | Assisted; user clicks Submit |
| **D — Explicitly excluded** | LinkedIn Easy Apply automation, headless Indeed scraping, unattended logins | **Not built** | Never |

The `JobSource` table records `tier`, `legalBasis`, and `enabled` so the running
system can prove *why* every job entered the pipeline. Turning on a Tier-B source
requires a configured API key; there is no scraping fallback.

**Autonomous submit** (Fit>95, Confidence>98, salary>target, no unknown
questions) is permitted **only** on Tier-A email applications and Tier-C
user-context portals, and only when the user has enabled an `ApprovalRule` for
that exact scope. LinkedIn is never auto-submitted.

---

## 5. AI agents (independent, queue-driven)

Each agent is a worker consumer with a typed input/output contract, idempotency
key, and its own retry/backoff. They compose into pipelines but are individually
testable and independently scalable.

| Agent | Trigger | Output |
|---|---|---|
| Job Discovery | cron / on-demand | normalized `Job` rows (dedup by hash) |
| Company Research | new Job | `Company` intel (funding, Glassdoor, layoffs, stack) |
| Salary Estimation | Job missing salary | estimate + confidence |
| Fit Scoring | enriched Job | `FitScore` breakdown (packages/core) |
| Résumé Optimizer | qualified Job | `ResumeVersion` (tailored, ATS-safe) |
| ATS Keyword | résumé draft | coverage % + missing keywords |
| Cover Letter | qualified Job | `CoverLetter` (<300w) |
| Recruiter Outreach | qualified Job | LinkedIn/email drafts |
| Hiring-Manager Finder | qualified Job | contact (via permitted enrichment) |
| Email Agent | approved package | Gmail **draft** + attachments |
| Application Agent | approved + rule | assisted/auto fill, pause at Submit |
| Interview Coach | interview booked | prep brief + Q&A |
| Career Advisor | on-demand | strategy guidance |
| Learning Agent | weekly | updated fit weights + variant stats |
| Analytics Agent | nightly | `AnalyticsSnapshot` |

**Dedup & normalization:** discovery hashes `(company, title, location,
normalizedDescription)` → `Job.dedupeHash` unique index; re-postings update
`lastSeenAt` instead of inserting.

---

## 6. Queue topology (BullMQ on Redis)

```
discovery      → produces jobs.raw
normalize      → jobs.normalized (dedup)
enrich.company → company.intel
enrich.salary  → salary.estimate
score.fit      → fit.scored            (fan-in: needs company + salary)
generate.resume, generate.cover, outreach.find  (fan-out on qualified)
package.review → user notification (manual/assisted)
apply.execute  → only after approval (mode + rule gated)
```

Concurrency, rate limits, and per-source politeness live in queue options.
Idempotency keys prevent double-apply. A dead-letter queue captures poison jobs.

---

## 7. Data model

Canonical in `prisma/schema.prisma`. Core entities: `User`, `Company`, `Job`,
`JobSource`, `Application`, `Recruiter`, `HiringManager`, `Resume`,
`ResumeVersion`, `CoverLetter`, `EmailDraft`, `Outreach`, `Interview`, `Note`,
`Task`, `ActivityLog`, `AnalyticsSnapshot`, `Settings`, `ApprovalRule`. See the
schema for fields, enums, indexes, and relations. Multi-tenant from day one
(every owned row carries `userId`) even though the first tenant is one user.

---

## 8. Auth & security
- **Auth**: Google OAuth + Microsoft OAuth + Magic Link (NextAuth/Auth.js on web,
  JWT/session validated by the API). Gmail/Calendar scopes requested
  incrementally, only when the user enables those features.
- **Secrets**: envelope encryption (KMS-wrapped DEK); OAuth refresh tokens
  encrypted at rest. No secret in the DB in plaintext.
- **Least privilege**: role/permission checks in the API; row-level ownership by
  `userId`.
- **Audit**: append-only `ActivityLog` for every state change and AI action.
- **Rate limiting**: Redis token-bucket per user and per external source.
- **Privacy/GDPR**: data export + delete; PII (recruiter contacts) segregated and
  purgeable; retention policy per source.

---

## 9. Frontend (apps/web)
Next.js 15 App Router, Tailwind, shadcn/ui, Framer Motion. Key surfaces:
Dashboard (today's jobs, top matches, funnel), **Review & Send** (side-by-side
JD ⋅ tailored résumé ⋅ cover letter ⋅ Gmail draft with one-click Send),
Kanban pipeline, Calendar, Analytics, Settings (salary/titles/locations/
blacklist/approval rules). Realtime via WebSocket subscription to API events.

---

## 10. Observability & deployment
- **Local/dev**: `docker-compose up` (postgres, redis, api, web, ai-worker).
- **Prod**: containers on a managed platform (Fly/Render/AWS ECS); managed
  Postgres + Redis; workers scaled independently of the API.
- **CI/CD**: GitHub Actions — lint, typecheck, unit + integration + e2e, build,
  migrate, deploy. Prisma migrations gated.
- **Monitoring**: structured logs, OpenTelemetry traces across api→queue→worker,
  Sentry for errors, per-agent cost/latency dashboards.

---

## 11. Build sequence (honest, phased)

Production readiness is **incremental**. Each phase ends shippable.

- **Phase 1 — Foundation (this commit):** architecture, full DB schema, monorepo
  scaffold, docker-compose, env, promote `packages/core`.
- **Phase 2 — Discovery + scoring:** Tier-A source adapters, normalization/dedup,
  company + salary enrichment, fit scoring end-to-end, minimal dashboard list.
- **Phase 3 — Materials:** résumé variants + tailoring + **PDF render**, ATS
  scoring, cover letters, Review UI.
- **Phase 4 — Apply:** Gmail drafts with attachments, approval workflow,
  assisted apply on permitted portals.
- **Phase 5 — Intelligence:** analytics, learning engine, interview coach,
  notifications.
- **Phase 6 — Hardening:** security review, load/scale, observability, docs.

No phase claims to be "done" until its tests pass and it runs. We do not skip to
autonomous apply.
