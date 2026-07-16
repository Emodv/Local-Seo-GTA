# Autonomous Job Application Agent — V1

A human-in-the-loop pipeline that finds, scores, and prepares application
materials for marketing-leadership roles (Director / Head / VP / CMO, $170k+
CAD) for **Emod Vafa**. This is **V1**: it prepares everything a human needs to
review and **never submits an application** on its own.

> **Stack note:** the project brief specified Python + Playwright + SQLite. This
> module is instead built in **TypeScript**, reusing the existing repo's
> `@anthropic-ai/sdk` and Node toolchain, so it lives in one coherent codebase.
> The store is a swappable JSON file rather than SQLite (see below).

## Quick start

```bash
# Run the end-to-end demo over 5 sample jobs (no submissions, no network needed)
npx tsx job-agent/demo.ts

# Run the unit tests
npx tsx --test job-agent/test.ts
```

The demo scores 5 sample jobs, applies hard filters, selects a résumé variant +
brag stories, generates a cover letter, prints a daily summary, and writes
queued applications to `job-agent/data/crm.json`.

Set `ANTHROPIC_API_KEY` to have cover letters written by Claude; without it, a
deterministic template is used so the pipeline is fully runnable offline.

## Architecture

```
job-agent/
  types.ts               Core domain types (pure data)
  candidate/
    profile.ts           Emod Vafa profile (from brief; resume-parse TODO)
    brag-bank.ts         Structured STAR achievement library
    resume-variants.ts   Pre-built résumé variants + matching keywords
  core/                  Pure, unit-tested pipeline stages
    text.ts              Shared matching helpers
    enrich.ts            Seniority classification + salary estimation
    filters.ts           Hard filters (auto-reject rules)
    fit-score.ts         0–100 fit score (tunable weights)
    selectors.ts         Résumé-variant + brag-story selection
    decision.ts          Fit thresholds × approval mode → action
    cover-letter.ts      Claude generation with offline template fallback
  store/
    crm.ts               File-based application tracker (swappable seam)
  fixtures/
    sample-jobs.ts       5 sample jobs + company-intel fixtures
  pipeline.ts            Orchestrates one job end-to-end
  reporter.ts            Per-job review + daily summary rendering
  demo.ts                Runnable end-to-end demo
  test.ts                Unit tests (node:test)
```

Each stage is a pure function over `types.ts`, so it's independently testable
and the Weekly Learning agent can tune `FitWeights` without touching logic.

## Fit score (out of 100)

| Component        | Weight |
|------------------|--------|
| Role-title match | 25     |
| Industry         | 15     |
| Salary (≥170k)   | 20     |
| Experience       | 15     |
| Tech-stack       | 10     |
| Company quality  | 10     |
| Location         | 5      |

**Action thresholds:** ≥85 → auto-apply (mode permitting) · 80–84 → approval
required · <80 → reject.

## Approval modes

- **Manual** / **Assisted** (default) — always resolve to `approval-required`; a
  human makes the final click.
- **Autonomous** — only emits `auto-apply` when **all** gates pass: fit ≥ 92,
  résumé confidence ≥ 95, salary ≥ target, and no open application questions.
  Otherwise it downgrades to `approval-required`.

## Honest scope & limitations (read this)

- **No résumé parsed yet.** `Emod_Vafa_Resume_2026.pdf` was not provided to the
  agent. The profile in `candidate/profile.ts` is transcribed from the brief and
  is the source of truth until the PDF is supplied and parsed.
- **No live scraping / no auto-submit.** LinkedIn/Indeed scraping and automated
  form submission violate those sites' ToS and require real credentials. V1
  deliberately stops at *prepared, reviewable packages*. Live ingestion should
  use ToS-friendly sources (Greenhouse/Lever/Ashby public boards, RemoteOK).
- **Résumé PDFs are referenced, not generated.** `resume-*.pdf` files are
  selection targets; producing the actual tailored PDF is a downstream step.
- **CRM is a JSON file, not SQLite.** `store/crm.ts` is the single seam — swap in
  better-sqlite3 or the repo's Prisma/Postgres by reimplementing that class.

## How V1 maps to the full 14-module vision

| Brief module            | V1 status                                            |
|-------------------------|------------------------------------------------------|
| Job Search Engine       | ⏳ Interface only (`JobPosting`); fixtures stand in   |
| Job Parser + Salary Est.| ✅ `core/enrich.ts`                                   |
| Company Intelligence    | 🟡 Type + injectable lookup; no live provider yet     |
| Brag Bank               | ✅ `candidate/brag-bank.ts`                           |
| Résumé Variants         | ✅ Selection logic; PDF generation TODO               |
| ATS Optimizer           | 🟡 Résumé confidence = keyword overlap; no reorder yet |
| Cover Letter Generator  | ✅ `core/cover-letter.ts`                             |
| Outreach Agent          | ⏳ Templates in brief; not built                      |
| Human-in-the-Loop       | ✅ `core/decision.ts` (3 modes)                       |
| Application Tracker/CRM  | ✅ `store/crm.ts`                                     |
| Follow-up Scheduler     | ⏳ Not built                                          |
| Interview Prep Agent    | ⏳ Not built                                          |
| Weekly Learning Agent   | 🟡 Weights are injectable; learning loop TODO         |
| Daily Reporter          | ✅ `reporter.ts`                                      |

## Suggested next steps

1. **Supply the résumé PDF** so the profile and brag bank can be reconciled to
   the real document.
2. **Wire one ToS-friendly source** (e.g. Greenhouse public boards) behind the
   `JobPosting` interface to replace fixtures.
3. **Generate tailored résumé PDFs** from the selected variant + reordered
   bullets.
4. **Persist to the repo's Prisma/Postgres** if you want a shared DB, by
   reimplementing `CrmStore`.
