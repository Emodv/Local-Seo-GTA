import type { CandidateProfile, EnrichedJob, FilterResult } from "../types";
import { normalize } from "./text";

const MARKETING_LEADERSHIP_LEVELS = new Set([
  "director",
  "head",
  "vp",
  "cmo",
]);

/** Marketing-leadership signal so we don't apply to sales/ops director roles. */
function isMarketingRole(job: EnrichedJob): boolean {
  const t = normalize(job.title);
  const marketingWords = [
    "marketing",
    "growth",
    "demand",
    "brand",
    "acquisition",
    "gtm",
    "go-to-market",
    "media",
    "revenue marketing",
    "lifecycle",
    "cmo",
  ];
  return marketingWords.some((w) => t.includes(w));
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/**
 * Hard filters — any failure auto-rejects the job. Location is treated as a
 * pass if the role is remote OR mentions Canada/Ontario/Toronto, since the
 * candidate is Toronto-based and remote-open.
 */
export function applyHardFilters(
  job: EnrichedJob,
  profile: CandidateProfile,
  opts: { maxAgeDays?: number } = {},
): FilterResult {
  const rejections: string[] = [];
  const maxAgeDays = opts.maxAgeDays ?? 30;

  // Salary floor (use effective = posted-min-or-estimate).
  if (job.effectiveSalaryCad != null && job.effectiveSalaryCad < profile.targetSalaryCad) {
    rejections.push(
      `Salary ${job.effectiveSalaryCad.toLocaleString()} < target ${profile.targetSalaryCad.toLocaleString()} CAD`,
    );
  }

  // Level: must be marketing leadership.
  if (!MARKETING_LEADERSHIP_LEVELS.has(job.seniority)) {
    rejections.push(`Level "${job.seniority}" below Director/Head/VP/CMO`);
  }
  if (!isMarketingRole(job)) {
    rejections.push("Not a marketing-leadership role");
  }

  // Location.
  const loc = normalize(job.location);
  const locationOk =
    job.remote ||
    /canada|ontario|toronto|\bon\b|remote|gta/.test(loc) ||
    loc === "";
  if (!locationOk) {
    rejections.push(`Location "${job.location}" not Canada/Remote/Toronto`);
  }

  // Company distress / suspect.
  const intel = job.company_intel;
  if (intel?.recentLayoffs) rejections.push("Recent mass layoffs");
  if (intel?.isMlmOrSuspect) rejections.push("MLM / suspect business");
  if (intel?.glassdoorRating != null && intel.glassdoorRating < 3.5) {
    rejections.push(`Glassdoor ${intel.glassdoorRating} < 3.5`);
  }

  // Freshness.
  const age = daysSince(job.postedAt);
  if (age != null && age > maxAgeDays) {
    rejections.push(`Posted ${age} days ago (> ${maxAgeDays})`);
  }

  return { passed: rejections.length === 0, rejections };
}
