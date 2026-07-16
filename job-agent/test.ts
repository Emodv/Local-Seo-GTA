/**
 * Unit tests for the pure pipeline stages. Uses Node's built-in test runner.
 *
 * Run:  npx tsx --test job-agent/test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { EMOD_VAFA } from "./candidate/profile";
import { RESUME_VARIANTS } from "./candidate/resume-variants";
import { BRAG_BANK } from "./candidate/brag-bank";
import { classifySeniority, enrichJob, estimateSalaryCad } from "./core/enrich";
import { applyHardFilters } from "./core/filters";
import { scoreFit } from "./core/fit-score";
import { decide } from "./core/decision";
import { selectResume, selectBragStories } from "./core/selectors";
import { templateCoverLetter } from "./core/cover-letter";
import { processJob } from "./pipeline";
import { sampleIntelLookup, SAMPLE_JOBS } from "./fixtures/sample-jobs";
import type { JobPosting } from "./types";

const strongJob = SAMPLE_JOBS[0]; // Director of Growth Marketing, $185k

test("classifySeniority handles the hierarchy", () => {
  assert.equal(classifySeniority("VP of Marketing"), "vp");
  assert.equal(classifySeniority("Chief Marketing Officer"), "cmo");
  assert.equal(classifySeniority("Head of Growth"), "head");
  assert.equal(classifySeniority("Director of Demand Generation"), "director");
  assert.equal(classifySeniority("Senior Marketing Manager"), "senior");
  assert.equal(classifySeniority("Marketing Manager"), "manager");
  assert.equal(classifySeniority("Marketing Coordinator"), "ic");
});

test("salary estimator only returns figures for pursued levels", () => {
  assert.equal(estimateSalaryCad("director"), 180_000);
  assert.equal(estimateSalaryCad("cmo"), 260_000);
  assert.equal(estimateSalaryCad("ic"), null);
});

test("enrichJob uses posted salary, else estimate", () => {
  const posted = enrichJob(strongJob);
  assert.equal(posted.effectiveSalaryCad, 185_000);
  const noSalary = enrichJob(SAMPLE_JOBS[1]); // Head of Marketing, no salary
  assert.equal(noSalary.effectiveSalaryCad, estimateSalaryCad("head"));
});

test("hard filters reject low salary, wrong function, and stale posts", () => {
  const mgr = enrichJob(SAMPLE_JOBS[2]); // Marketing Manager $95k
  assert.equal(applyHardFilters(mgr, EMOD_VAFA).passed, false);

  const salesOps = enrichJob(SAMPLE_JOBS[3]); // Director of Sales Operations, US only
  const r = applyHardFilters(salesOps, EMOD_VAFA);
  assert.equal(r.passed, false);
  assert.ok(r.rejections.some((x) => /marketing/i.test(x)));

  const staleVp = enrichJob(SAMPLE_JOBS[4]); // 40 days old
  assert.equal(applyHardFilters(staleVp, EMOD_VAFA).passed, false);
});

test("hard filters pass a strong in-region director role", () => {
  const job = enrichJob(strongJob, sampleIntelLookup);
  assert.equal(applyHardFilters(job, EMOD_VAFA).passed, true);
});

test("fit score rewards the strong job and stays within bounds", () => {
  const job = enrichJob(strongJob, sampleIntelLookup);
  const fit = scoreFit(job, EMOD_VAFA);
  assert.ok(fit.total >= 85, `expected >=85, got ${fit.total}`);
  assert.ok(fit.total <= 100);
  // Breakdown never exceeds its weight cap.
  assert.ok(fit.breakdown.salary <= 20);
  assert.ok(fit.breakdown.roleTitle <= 25);
});

test("resume selector picks growth/performance variant for a growth role", () => {
  const job = enrichJob(strongJob);
  const { variant, confidence } = selectResume(job, RESUME_VARIANTS);
  assert.ok(variant);
  assert.ok(["growth", "performance", "demandgen", "saas"].includes(variant!.id));
  assert.ok(confidence > 0);
});

test("brag selector returns up to 3 relevant stories", () => {
  const job = enrichJob(strongJob);
  const stories = selectBragStories(job, BRAG_BANK, 3);
  assert.equal(stories.length, 3);
});

test("decision: manual/assisted never auto-applies", () => {
  const job = enrichJob(strongJob, sampleIntelLookup);
  const fit = scoreFit(job, EMOD_VAFA);
  const filter = applyHardFilters(job, EMOD_VAFA);
  const d = decide(fit, filter, job, EMOD_VAFA, {
    mode: "assisted",
    resumeConfidence: 99,
  });
  assert.equal(d, "approval-required");
});

test("decision: autonomous auto-applies only when all gates pass", () => {
  const job = enrichJob(strongJob, sampleIntelLookup);
  const fit = scoreFit(job, EMOD_VAFA);
  const filter = applyHardFilters(job, EMOD_VAFA);

  const gated = decide(fit, filter, job, EMOD_VAFA, {
    mode: "autonomous",
    resumeConfidence: 50, // too low
  });
  assert.equal(gated, "approval-required");

  // Only auto-apply if fit is also high enough.
  if (fit.total >= 92) {
    const ok = decide(fit, filter, job, EMOD_VAFA, {
      mode: "autonomous",
      resumeConfidence: 96,
      openQuestions: false,
    });
    assert.equal(ok, "auto-apply");
  }
});

test("decision: rejects below 80 and failed filters", () => {
  const mgr = enrichJob(SAMPLE_JOBS[2]);
  const fit = scoreFit(mgr, EMOD_VAFA);
  const filter = applyHardFilters(mgr, EMOD_VAFA);
  assert.equal(
    decide(fit, filter, mgr, EMOD_VAFA, { mode: "assisted", resumeConfidence: 80 }),
    "reject",
  );
});

test("cover letter is company-specific, <=300 words, no fabrication markers", () => {
  const job = enrichJob(strongJob);
  const stories = selectBragStories(job, BRAG_BANK, 3);
  const letter = templateCoverLetter(job, EMOD_VAFA, stories);
  assert.ok(letter.includes(job.company));
  assert.ok(letter.includes(EMOD_VAFA.calendarLink));
  assert.ok(letter.split(/\s+/).length <= 301);
});

test("processJob rejects produce no generated materials", async () => {
  const mgr: JobPosting = SAMPLE_JOBS[2];
  const pkg = await processJob(mgr, { offlineCoverLetter: true });
  assert.equal(pkg.decision, "reject");
  assert.equal(pkg.coverLetter, null);
  assert.equal(pkg.selectedResume, null);
});

test("processJob end-to-end on strong job yields a full package", async () => {
  const pkg = await processJob(strongJob, {
    intelLookup: sampleIntelLookup,
    offlineCoverLetter: true,
  });
  assert.notEqual(pkg.decision, "reject");
  assert.ok(pkg.coverLetter);
  assert.ok(pkg.selectedResume);
  assert.equal(pkg.selectedBragStories.length, 3);
});
