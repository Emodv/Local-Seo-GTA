import type { CompanyIntel, JobPosting } from "../types";

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

/**
 * Five sample jobs spanning the decision space:
 * strong auto-apply fit, mid approval-required, and several auto-rejects
 * (low salary, wrong function, stale posting).
 */
export const SAMPLE_JOBS: JobPosting[] = [
  {
    id: "job-001",
    source: "greenhouse",
    url: "https://boards.greenhouse.io/example/jobs/1",
    title: "Director of Growth Marketing",
    company: "NorthLoop SaaS",
    location: "Toronto, ON (Hybrid)",
    remote: false,
    postedAt: daysAgo(3),
    salaryMinCad: 185_000,
    salaryMaxCad: 215_000,
    employmentType: "full-time",
    description:
      "We're hiring a Director of Growth Marketing to own demand generation and revenue marketing for our B2B SaaS platform. You'll scale paid acquisition (Google Ads, Meta, LinkedIn), lifecycle, and ABM. 10+ years in performance marketing required. Stack: HubSpot, Salesforce, GA4. Experience with AI automation a plus.",
    requirements: [
      "10+ years marketing leadership",
      "Demand generation and pipeline ownership",
      "Paid media at scale (5x+ ROAS)",
    ],
  },
  {
    id: "job-002",
    source: "lever",
    url: "https://jobs.lever.co/example/2",
    title: "Head of Marketing",
    company: "Cinder Legal Tech",
    location: "Remote (Canada)",
    remote: true,
    postedAt: daysAgo(10),
    // No salary posted -> estimator kicks in.
    employmentType: "full-time",
    description:
      "Head of Marketing for a legal tech company serving personal injury and family law firms. Own brand, demand gen, and case acquisition. SEO/SEM and content leadership. Build the marketing team from the ground up.",
    requirements: ["8+ years marketing leadership", "Legal or regulated vertical experience a plus"],
  },
  {
    id: "job-003",
    source: "workday",
    url: "https://example.wd1.myworkdayjobs.com/3",
    title: "Marketing Manager",
    company: "BrightRetail",
    location: "Toronto, ON",
    remote: false,
    postedAt: daysAgo(5),
    salaryMinCad: 95_000,
    salaryMaxCad: 110_000,
    employmentType: "full-time",
    description:
      "Marketing Manager to run campaigns and social. Reports to the Director of Marketing.",
  },
  {
    id: "job-004",
    source: "ashby",
    url: "https://jobs.ashbyhq.com/example/4",
    title: "Director of Sales Operations",
    company: "Ligado Systems",
    location: "Remote (US only)",
    remote: true,
    postedAt: daysAgo(2),
    salaryMinCad: 190_000,
    description:
      "Director of Sales Operations to own CRM hygiene, forecasting, and rev ops tooling. Salesforce admin experience required.",
  },
  {
    id: "job-006",
    source: "manual",
    url: "https://example.com/careers/6",
    title: "Fractional Head of Growth",
    company: "Aperture Cyber",
    location: "Remote (Canada)",
    remote: true,
    postedAt: daysAgo(4),
    salaryMinCad: 200_000,
    employmentType: "fractional",
    description:
      "Fractional Head of Growth (consulting engagement) for a cybersecurity startup. Own demand generation, paid media, and GTM strategy on a part-time basis. B2B SaaS experience and AI automation a strong plus.",
    requirements: ["10+ years growth/demand generation leadership", "Comfortable in a fractional/advisory capacity"],
  },
  {
    id: "job-005",
    source: "manual",
    url: "https://example.com/careers/5",
    title: "VP of Marketing",
    company: "Vertex FinTech",
    location: "Toronto, ON (up to 4 days onsite)",
    remote: false,
    postedAt: daysAgo(40), // stale -> auto-reject on freshness
    salaryMinCad: 220_000,
    salaryMaxCad: 260_000,
    description:
      "VP of Marketing to lead GTM strategy for a growth-stage fintech. Own P&L, team of 10+, board reporting. 12+ years marketing leadership, B2B SaaS/fintech.",
  },
];

/** Injectable company-intelligence fixtures keyed by company name. */
export const SAMPLE_INTEL: Record<string, CompanyIntel> = {
  "NorthLoop SaaS": {
    name: "NorthLoop SaaS",
    glassdoorRating: 4.4,
    employeeCount: 320,
    fundingStage: "Series C",
    industry: "saas",
  },
  "Cinder Legal Tech": {
    name: "Cinder Legal Tech",
    glassdoorRating: 4.1,
    employeeCount: 60,
    fundingStage: "Series A",
    industry: "legal",
  },
  "Vertex FinTech": {
    name: "Vertex FinTech",
    glassdoorRating: 3.9,
    industry: "fintech",
  },
  "Aperture Cyber": {
    name: "Aperture Cyber",
    glassdoorRating: 4.3,
    employeeCount: 90,
    fundingStage: "Series B",
    industry: "cybersecurity",
  },
};

export const sampleIntelLookup = (company: string): CompanyIntel | undefined =>
  SAMPLE_INTEL[company];
