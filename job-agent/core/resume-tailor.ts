import type { RESUME as ResumeType } from "../candidate/resume-data";
import { RESUME } from "../candidate/resume-data";
import type { EnrichedJob } from "../types";
import { normalize } from "./text";

/**
 * ATS-safe resume tailoring.
 *
 * Hard rules (enforced by construction — this module can only REORDER and
 * SELECT a pre-written summary variant):
 *   - Never fabricates or invents achievements.
 *   - Never changes dates, employers, titles, or metrics.
 *   - Only adjusts: summary framing, skill ordering, bullet ordering, and
 *     which keywords are surfaced.
 */

export type SummaryMode = "permanent" | "fractional";

export interface TailoredResume {
  summaryMode: SummaryMode;
  summary: string;
  skillGroups: { label: string; skills: string[] }[];
  experience: {
    title: string;
    company: string;
    location: string;
    dates: string;
    context?: string;
    bullets: string[];
  }[];
  education: string[];
  certifications: string[];
  /** 0-100: share of the JD's salient keywords present in the resume text. */
  atsKeywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

// Signals that the ROLE (not the employer's name) is non-permanent. Only
// scanned in the title, never the description — a company named
// "...Consulting" or an agency that "consults" must not flip the summary.
const FRACTIONAL_TITLE_SIGNALS = [
  "fractional",
  "contract",
  "consulting",
  "consultant",
  "part-time",
  "part time",
  "interim",
  "advisory",
];

/**
 * Decide which pre-written summary to use. employmentType is authoritative;
 * otherwise we look only at the job TITLE for non-permanent signals. The
 * description is deliberately NOT scanned, to avoid false positives from
 * company names / boilerplate (e.g. "Directive Consulting").
 */
export function pickSummaryMode(job: EnrichedJob): SummaryMode {
  if (
    job.employmentType === "fractional" ||
    job.employmentType === "contract" ||
    job.employmentType === "part-time"
  ) {
    return "fractional";
  }
  const title = normalize(job.title);
  return FRACTIONAL_TITLE_SIGNALS.some((s) => title.includes(s))
    ? "fractional"
    : "permanent";
}

/** Extract salient keywords from a job description for ATS scoring. */
function jdKeywords(job: EnrichedJob): string[] {
  const text = normalize(`${job.title} ${job.description} ${(job.requirements ?? []).join(" ")}`);
  const vocab = [
    "demand generation",
    "growth",
    "performance marketing",
    "paid media",
    "paid search",
    "google ads",
    "meta",
    "linkedin ads",
    "programmatic",
    "seo",
    "sem",
    "email",
    "lifecycle",
    "abm",
    "pipeline",
    "revenue",
    "arr",
    "roas",
    "cac",
    "ltv",
    "attribution",
    "hubspot",
    "salesforce",
    "ga4",
    "crm",
    "b2b",
    "saas",
    "gtm",
    "brand",
    "content",
    "team",
    "leadership",
    "budget",
    "automation",
    "ai",
    "affiliate",
    "ecommerce",
    "legal",
    "automotive",
    "real estate",
    "fintech",
    "cybersecurity",
  ];
  return vocab.filter((k) => text.includes(k));
}

function relevanceOf(text: string, keywords: string[]): number {
  const t = normalize(text);
  return keywords.reduce((n, k) => (t.includes(normalize(k)) ? n + 1 : n), 0);
}

/**
 * Produce a tailored resume for a job. Stable-sorts skills and bullets by JD
 * relevance (ties keep original order), selects the summary variant, and
 * computes ATS keyword coverage.
 */
export function tailorResume(
  job: EnrichedJob,
  resume: typeof ResumeType = RESUME,
): TailoredResume {
  const summaryMode = pickSummaryMode(job);
  const summary =
    summaryMode === "fractional" ? resume.summaryFractional : resume.summaryPermanent;

  const keywords = jdKeywords(job);

  // Reorder skills within each group by relevance (stable).
  const skillGroups = resume.skillGroups.map((g) => ({
    label: g.label,
    skills: [...g.skills]
      .map((s, i) => ({ s, i, r: relevanceOf(s, keywords) }))
      .sort((a, b) => b.r - a.r || a.i - b.i)
      .map((x) => x.s),
  }));

  // Reorder bullets within each role by relevance (stable). Dates/company fixed.
  const experience = resume.experience.map((e) => ({
    ...e,
    bullets: [...e.bullets]
      .map((b, i) => ({ b, i, r: relevanceOf(b, keywords) }))
      .sort((a, b) => b.r - a.r || a.i - b.i)
      .map((x) => x.b),
  }));

  // ATS coverage: how many JD keywords appear anywhere in the resume text.
  const resumeText = normalize(
    [
      summary,
      ...skillGroups.flatMap((g) => g.skills),
      ...experience.flatMap((e) => [e.title, e.context ?? "", ...e.bullets]),
      ...resume.certifications,
    ].join(" "),
  );
  const matchedKeywords = keywords.filter((k) => resumeText.includes(normalize(k)));
  const missingKeywords = keywords.filter((k) => !resumeText.includes(normalize(k)));
  const atsKeywordCoverage =
    keywords.length === 0
      ? 100
      : Math.round((matchedKeywords.length / keywords.length) * 100);

  return {
    summaryMode,
    summary,
    skillGroups,
    experience,
    education: resume.education,
    certifications: resume.certifications,
    atsKeywordCoverage,
    matchedKeywords,
    missingKeywords,
  };
}

/** Render a tailored resume as ATS-friendly plain text (one-page oriented). */
export function renderResumeText(t: TailoredResume, resume = RESUME): string {
  const lines: string[] = [];
  lines.push(resume.name);
  lines.push(resume.headline);
  lines.push(resume.contactLine);
  lines.push("");
  lines.push("PROFESSIONAL SUMMARY");
  lines.push(t.summary);
  lines.push("");
  lines.push("CORE COMPETENCIES");
  for (const g of t.skillGroups) lines.push(`${g.label}: ${g.skills.join(" · ")}`);
  lines.push("");
  lines.push("PROFESSIONAL EXPERIENCE");
  for (const e of t.experience) {
    lines.push("");
    lines.push(`${e.title} | ${e.company}`);
    lines.push(`${e.location}    ${e.dates}`);
    if (e.context) lines.push(`Verticals: ${e.context}`);
    for (const b of e.bullets) lines.push(`• ${b}`);
  }
  lines.push("");
  lines.push("EDUCATION");
  for (const ed of t.education) lines.push(ed);
  lines.push("");
  lines.push("CERTIFICATIONS & TOOLS");
  lines.push(t.certifications.join(" · "));
  return lines.join("\n");
}
