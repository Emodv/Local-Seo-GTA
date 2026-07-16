import type { BragStory } from "../types";

/**
 * Brag Bank — structured achievement library.
 *
 * Every entry is a real, factual accomplishment expressed in STAR form.
 * The pipeline selects the most relevant stories per job (see
 * core/brag-selector.ts). Nothing here may be fabricated — add only what the
 * candidate can defend in an interview.
 */
export const BRAG_BANK: BragStory[] = [
  {
    id: "intercap-arr",
    situation:
      "Intercap Inc. needed to accelerate revenue growth against an aggressive board target.",
    action:
      "Built and led a full-funnel demand generation engine across paid, SEO, lifecycle, and outbound.",
    result: "Doubled ARR from $5M to $10M.",
    headline: "Doubled ARR from $5M to $10M at Intercap Inc.",
    metrics: ["ARR $5M -> $10M", "2x revenue"],
    technologies: [
      "demand generation",
      "performance marketing",
      "hubspot",
      "salesforce",
      "seo",
    ],
    industries: ["b2b", "saas", "fintech"],
  },
  {
    id: "affiliate-revenue",
    situation:
      "Affiliate channel was underperforming with flat revenue and rising costs.",
    action:
      "Restructured partner mix and introduced algorithmic bidding and creative testing.",
    result: "Grew affiliate revenue by 75% while cutting CPC by 45%.",
    headline: "Affiliate revenue +75% and CPC -45% via algorithmic bidding.",
    metrics: ["affiliate revenue +75%", "CPC -45%"],
    technologies: [
      "affiliate marketing",
      "programmatic",
      "google ads",
      "performance marketing",
    ],
    industries: ["affiliate", "ecommerce"],
  },
  {
    id: "account-scale-roas",
    situation:
      "Paid media portfolio needed to scale spend without eroding efficiency.",
    action:
      "Managed 70+ accounts with rigorous structure, automation, and bidding discipline.",
    result: "Sustained 5x+ ROAS across a 70+ account portfolio.",
    headline: "Managed 70+ accounts at 5x+ ROAS.",
    metrics: ["70+ accounts", "5x+ ROAS"],
    technologies: [
      "google ads",
      "meta ads",
      "linkedin ads",
      "performance marketing",
      "roas",
    ],
    industries: ["b2b", "ecommerce", "legal", "automotive"],
  },
  {
    id: "team-building",
    situation:
      "Marketing function needed to scale from a solo operator to a full team.",
    action:
      "Hired, structured, and mentored a cross-functional marketing team.",
    result: "Built teams from 1 to 10+ people.",
    headline: "Scaled marketing teams from 1 to 10+.",
    metrics: ["1 -> 10+ team members"],
    technologies: ["team leadership", "gtm strategy"],
    industries: ["saas", "b2b", "tech"],
  },
  {
    id: "ai-automation",
    situation:
      "Manual marketing ops were limiting throughput and personalization.",
    action:
      "Deployed AI automation (OpenAI/Claude/Gemini) across content, lead scoring, and CRM workflows.",
    result:
      "Cut turnaround time and improved lead quality through AI-driven automation.",
    headline:
      "Built AI-driven marketing automation across OpenAI/Claude/Gemini.",
    metrics: ["AI automation across content + CRM"],
    technologies: [
      "ai automation",
      "openai",
      "claude",
      "gemini",
      "close crm",
      "hubspot",
    ],
    industries: ["ai", "saas", "tech"],
  },
  {
    id: "vertical-breadth",
    situation:
      "Growth mandates spanned very different regulated and competitive verticals.",
    action:
      "Ran acquisition and demand programs across Legal (PI & Family), Automotive, Real Estate, Ecommerce, and B2B outbound.",
    result:
      "Delivered pipeline and revenue growth across multiple regulated verticals.",
    headline:
      "Cross-vertical growth: Legal, Automotive, Real Estate, Ecommerce, B2B.",
    metrics: ["5+ verticals"],
    technologies: ["acquisition", "demand generation", "b2b", "seo", "sem"],
    industries: [
      "legal",
      "automotive",
      "real estate",
      "ecommerce",
      "b2b",
    ],
  },
];
