import type { ApplicationPackage } from "./types";

const DECISION_ICON: Record<string, string> = {
  "auto-apply": "🟢",
  "approval-required": "🟡",
  reject: "🔴",
};

/** Render a single application package as a human-readable review block. */
export function renderPackage(pkg: ApplicationPackage): string {
  const { job, fit, filter, decision } = pkg;
  const lines: string[] = [];
  lines.push(
    `${DECISION_ICON[decision]} ${job.title} @ ${job.company}  —  fit ${fit.total}/100  [${decision}]`,
  );
  lines.push(`   ${job.url}`);
  const salary =
    job.salaryMinCad != null
      ? `$${job.salaryMinCad.toLocaleString()}${job.salaryMaxCad ? `–$${job.salaryMaxCad.toLocaleString()}` : ""} (posted)`
      : job.estimatedSalaryCad != null
        ? `~$${job.estimatedSalaryCad.toLocaleString()} (estimated)`
        : "unknown";
  lines.push(`   Level: ${job.seniority} | Salary: ${salary} | Remote: ${job.remote}`);

  if (!filter.passed) {
    lines.push(`   ❌ Rejected: ${filter.rejections.join("; ")}`);
    return lines.join("\n");
  }

  const b = fit.breakdown;
  lines.push(
    `   Score: title ${b.roleTitle} · industry ${b.industry} · salary ${b.salary} · exp ${b.experience} · tech ${b.techStack} · company ${b.companyQuality} · loc ${b.location}`,
  );
  lines.push(
    `   Resume: ${pkg.selectedResume?.file ?? "—"} (confidence ${pkg.resumeConfidence}%)`,
  );
  lines.push(
    `   Brag stories: ${pkg.selectedBragStories.map((s) => s.id).join(", ") || "—"}`,
  );
  if (fit.matchedSkills.length) {
    lines.push(`   Matched skills: ${fit.matchedSkills.join(", ")}`);
  }
  return lines.join("\n");
}

/** Daily-reporter style summary across a batch. */
export function renderDailySummary(pkgs: ApplicationPackage[]): string {
  const found = pkgs.length;
  const qualified = pkgs.filter((p) => p.filter.passed && p.fit.total >= 80).length;
  const autoApply = pkgs.filter((p) => p.decision === "auto-apply").length;
  const needApproval = pkgs.filter((p) => p.decision === "approval-required").length;
  const rejected = pkgs.filter((p) => p.decision === "reject").length;
  const avg =
    found === 0
      ? 0
      : Math.round(pkgs.reduce((a, p) => a + p.fit.total, 0) / found);

  return [
    "── Daily Summary ─────────────────────────────",
    `Jobs found:        ${found}`,
    `Qualified (≥80):   ${qualified}`,
    `Auto-apply:        ${autoApply}`,
    `Needs approval:    ${needApproval}`,
    `Rejected:          ${rejected}`,
    `Average fit score: ${avg}/100`,
    "──────────────────────────────────────────────",
  ].join("\n");
}
