import type { ResumeVariant } from "../types";

/**
 * Pre-built resume variants. Each PDF is expected to live under
 * job-agent/assets/resumes/ (not yet generated — the selector picks which one
 * to send; producing the actual PDF is a downstream step once the base resume
 * is supplied).
 */
export const RESUME_VARIANTS: ResumeVariant[] = [
  {
    id: "growth",
    file: "resume-growth.pdf",
    label: "Growth Marketing",
    keywords: [
      "growth",
      "acquisition",
      "retention",
      "funnel",
      "experimentation",
      "lifecycle",
      "cac",
      "ltv",
    ],
    titles: ["growth", "head of growth", "director of growth"],
  },
  {
    id: "demandgen",
    file: "resume-demandgen.pdf",
    label: "Demand Generation",
    keywords: [
      "demand generation",
      "pipeline",
      "mql",
      "sql",
      "abm",
      "revenue marketing",
      "lead generation",
    ],
    titles: [
      "demand generation",
      "revenue marketing",
      "director of demand",
    ],
  },
  {
    id: "performance",
    file: "resume-performance.pdf",
    label: "Performance Marketing",
    keywords: [
      "performance marketing",
      "paid media",
      "google ads",
      "meta ads",
      "roas",
      "cpa",
      "programmatic",
      "ppc",
    ],
    titles: ["performance", "paid", "media", "acquisition"],
  },
  {
    id: "executive",
    file: "resume-executive.pdf",
    label: "Executive (VP/CMO)",
    keywords: [
      "strategy",
      "p&l",
      "board",
      "gtm",
      "leadership",
      "vision",
      "transformation",
    ],
    titles: ["vp", "chief marketing officer", "cmo", "head of marketing"],
  },
  {
    id: "saas",
    file: "resume-saas.pdf",
    label: "SaaS / B2B",
    keywords: [
      "saas",
      "b2b",
      "arr",
      "product-led",
      "plg",
      "subscription",
      "salesforce",
      "hubspot",
    ],
    titles: ["b2b", "saas", "gtm"],
  },
  {
    id: "legal",
    file: "resume-legal.pdf",
    label: "Legal Vertical",
    keywords: [
      "legal",
      "law firm",
      "personal injury",
      "family law",
      "intake",
      "case acquisition",
    ],
    titles: ["legal", "law"],
  },
  {
    id: "automotive",
    file: "resume-automotive.pdf",
    label: "Automotive Vertical",
    keywords: [
      "automotive",
      "dealership",
      "vehicle",
      "auto",
      "oem",
      "test drive",
    ],
    titles: ["automotive", "auto"],
  },
];
