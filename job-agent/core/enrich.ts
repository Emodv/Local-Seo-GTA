import type {
  CompanyIntel,
  EnrichedJob,
  JobPosting,
  SeniorityLevel,
} from "../types";
import { normalize } from "./text";

/**
 * Classify seniority from the job title. Order matters: check the most senior
 * signals first so "VP of Marketing" isn't caught by "manager".
 */
export function classifySeniority(title: string): SeniorityLevel {
  const t = normalize(title);
  if (/\b(cmo|chief marketing officer)\b/.test(t)) return "cmo";
  if (/\b(vp|vice president)\b/.test(t)) return "vp";
  if (/\bhead of\b/.test(t)) return "head";
  if (/\bdirector\b/.test(t)) return "director";
  if (/\bsenior\b/.test(t) || /\bsr\.?\b/.test(t)) return "senior";
  if (/\bmanager\b|\blead\b/.test(t)) return "manager";
  return "ic";
}

/**
 * Estimate an annual CAD salary when none is posted, keyed off seniority.
 * These are deliberately conservative midpoints for the Toronto market and are
 * clearly labelled as estimates downstream. Returns null for levels we won't
 * pursue anyway.
 */
export function estimateSalaryCad(seniority: SeniorityLevel): number | null {
  switch (seniority) {
    case "cmo":
      return 260_000;
    case "vp":
      return 210_000;
    case "head":
      return 190_000;
    case "director":
      return 180_000;
    case "senior":
      return 150_000;
    case "manager":
      return 120_000;
    default:
      return null;
  }
}

/**
 * Enrich a raw posting: classify seniority, resolve an effective salary
 * (posted min if present, else estimate), and attach any provided company
 * intel. In production, `intelLookup` would call a company-intelligence
 * service; here it's injected so the stage stays pure and testable.
 */
export function enrichJob(
  job: JobPosting,
  intelLookup?: (company: string) => CompanyIntel | undefined,
): EnrichedJob {
  const seniority = classifySeniority(job.title);
  const estimatedSalaryCad =
    job.salaryMinCad == null ? estimateSalaryCad(seniority) : null;
  const effectiveSalaryCad = job.salaryMinCad ?? estimatedSalaryCad;
  return {
    ...job,
    seniority,
    estimatedSalaryCad,
    effectiveSalaryCad,
    company_intel: intelLookup?.(job.company),
  };
}
