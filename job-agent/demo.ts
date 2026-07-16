/**
 * End-to-end demo: process the 5 sample jobs through the full pipeline,
 * print a per-job review + daily summary, and persist queued applications to
 * the CRM. Nothing is submitted.
 *
 * Run:  npx tsx job-agent/demo.ts
 */
import { sampleIntelLookup, SAMPLE_JOBS } from "./fixtures/sample-jobs";
import { processJobs } from "./pipeline";
import { renderDailySummary, renderPackage } from "./reporter";
import { CrmStore } from "./store/crm";

async function main() {
  console.log("Autonomous Job Application Agent — V1 demo (no submissions)\n");

  const packages = await processJobs(SAMPLE_JOBS, {
    mode: "assisted",
    intelLookup: sampleIntelLookup,
    offlineCoverLetter: !process.env.ANTHROPIC_API_KEY,
  });

  for (const pkg of packages) {
    console.log(renderPackage(pkg));
    console.log("");
  }

  console.log(renderDailySummary(packages));

  // Persist everything we'd pursue into the CRM as "queued".
  const crm = new CrmStore();
  for (const pkg of packages) {
    if (pkg.decision !== "reject") await crm.upsertFromPackage(pkg);
  }
  const funnel = await crm.funnel();
  console.log(`\nCRM queued: ${funnel.queued} record(s) → job-agent/data/crm.json`);

  // Show one full cover letter as a sample of generated material.
  const sample = packages.find((p) => p.coverLetter);
  if (sample) {
    console.log(`\n── Sample cover letter (${sample.job.company}) ──\n`);
    console.log(sample.coverLetter);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
