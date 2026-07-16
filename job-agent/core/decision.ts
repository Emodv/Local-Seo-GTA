import type {
  ApplyDecision,
  ApprovalMode,
  CandidateProfile,
  EnrichedJob,
  FilterResult,
  FitScore,
} from "../types";

/**
 * Map a scored job to an action, respecting both the fit-score thresholds and
 * the approval mode.
 *
 * Fit thresholds (from the brief):
 *   >= 85  -> auto-apply (subject to mode)
 *   80-84  -> approval required
 *   < 80   -> reject
 *
 * Autonomous mode only truly auto-submits when ALL gates pass:
 *   fit >= 92, resume confidence >= 95, salary >= target, no open questions.
 * Otherwise it downgrades to approval-required. Manual/assisted never emit
 * "auto-apply" — a human always makes the final click.
 */
export function decide(
  fit: FitScore,
  filter: FilterResult,
  job: EnrichedJob,
  profile: CandidateProfile,
  args: {
    mode: ApprovalMode;
    resumeConfidence: number;
    openQuestions?: boolean;
  },
): ApplyDecision {
  if (!filter.passed) return "reject";
  if (fit.total < 80) return "reject";
  if (fit.total < 85) return "approval-required";

  // fit >= 85 from here on.
  if (args.mode !== "autonomous") return "approval-required";

  const salaryOk =
    job.effectiveSalaryCad != null &&
    job.effectiveSalaryCad >= profile.targetSalaryCad;
  const autonomousOk =
    fit.total >= 92 &&
    args.resumeConfidence >= 95 &&
    salaryOk &&
    !args.openQuestions;

  return autonomousOk ? "auto-apply" : "approval-required";
}
