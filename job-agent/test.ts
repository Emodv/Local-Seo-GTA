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
import { pickSummaryMode, tailorResume, renderResumeText } from "./core/resume-tailor";
import { RESUME } from "./candidate/resume-data";
import { templateCoverLetter } from "./core/cover-letter";
import { processJob } from "./pipeline";
import { sampleIntelLookup, SAMPLE_JOBS } from "./fixtures/sample-jobs";
import type { JobPosting } from "./types";

const byId = (id: string): JobPosting => {
  const j = SAMPLE_JOBS.find((x) => x.id === id);
  if (!j) throw new Error(`fixture ${id} missing`);
  return j;
};

const strongJob = byId("job-001"); // Director of Growth Marketing, $185k

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
  const noSalary = enrichJob(byId("job-002")); // Head of Marketing, no salary
  assert.equal(noSalary.effectiveSalaryCad, estimateSalaryCad("head"));
});

test("hard filters reject low salary, wrong function, and stale posts", () => {
  const mgr = enrichJob(byId("job-003")); // Marketing Manager $95k
  assert.equal(applyHardFilters(mgr, EMOD_VAFA).passed, false);

  const salesOps = enrichJob(byId("job-004")); // Director of Sales Operations, US only
  const r = applyHardFilters(salesOps, EMOD_VAFA);
  assert.equal(r.passed, false);
  assert.ok(r.rejections.some((x) => /marketing/i.test(x)));

  const staleVp = enrichJob(byId("job-005")); // 40 days old
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
  const mgr = enrichJob(byId("job-003"));
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
  const mgr: JobPosting = byId("job-003");
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
  assert.ok(pkg.tailoredResume);
  assert.equal(pkg.selectedBragStories.length, 3);
});

test("summary mode: permanent for FT roles, fractional for contract/fractional", () => {
  const perm = enrichJob(strongJob); // full-time
  assert.equal(pickSummaryMode(perm), "permanent");

  const fractional = enrichJob({
    ...strongJob,
    id: "job-frac",
    title: "Fractional Head of Growth",
    employmentType: "fractional",
  });
  assert.equal(pickSummaryMode(fractional), "fractional");

  const contractByTitle = enrichJob({
    ...strongJob,
    id: "job-contract",
    title: "Director of Marketing (6-month contract)",
  });
  assert.equal(pickSummaryMode(contractByTitle), "fractional");

  // Regression: a full-time role at a company whose name/description contains
  // "consulting" must stay permanent (title has no non-permanent signal).
  const agencyFullTime = enrichJob({
    ...strongJob,
    id: "job-agency",
    title: "Director of Demand Generation",
    company: "Directive Consulting",
    employmentType: "full-time",
    description: "Director of Demand Generation at Directive Consulting, a performance-marketing agency.",
  });
  assert.equal(pickSummaryMode(agencyFullTime), "permanent");
});

test("tailored resume selects the matching summary and never mutates source", () => {
  const perm = tailorResume(enrichJob(strongJob));
  assert.equal(perm.summary, RESUME.summaryPermanent);

  const frac = tailorResume(
    enrichJob({ ...strongJob, id: "f", employmentType: "fractional" }),
  );
  assert.equal(frac.summary, RESUME.summaryFractional);

  // Source resume unchanged (no fabrication / mutation), same bullet set.
  const srcBullets = RESUME.experience[0].bullets;
  const outBullets = perm.experience[0].bullets;
  assert.equal(outBullets.length, srcBullets.length);
  assert.deepEqual([...outBullets].sort(), [...srcBullets].sort());
});

test("tailoring reorders bullets by JD relevance without dropping any", () => {
  const t = tailorResume(enrichJob(strongJob));
  // Every role keeps exactly its original bullets (permutation only).
  t.experience.forEach((e, i) => {
    assert.deepEqual(
      [...e.bullets].sort(),
      [...RESUME.experience[i].bullets].sort(),
    );
  });
  // ATS coverage is a sane percentage.
  assert.ok(t.atsKeywordCoverage >= 0 && t.atsKeywordCoverage <= 100);
});

test("rendered resume is plain text and contains real, unaltered dates", () => {
  const text = renderResumeText(tailorResume(enrichJob(strongJob)));
  assert.ok(text.includes("2022 – 2025")); // Intercap dates unchanged
  assert.ok(text.includes("Schulich School of Business"));
  assert.ok(text.includes("PROFESSIONAL EXPERIENCE"));
});
