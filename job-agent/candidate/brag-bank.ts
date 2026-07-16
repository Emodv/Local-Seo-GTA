import type { BragStory } from "../types";

/**
 * Brag Bank — structured achievement library.
 *
 * Reconciled against the real resume (Emod_Vafa_Resume_2026.pdf), 2026-07-16.
 * Every entry is a real, factual accomplishment in STAR form with correct
 * employer attribution. The pipeline selects the most relevant stories per job
 * (see core/selectors.ts). Nothing here may be fabricated.
 */
export const BRAG_BANK: BragStory[] = [
  {
    id: "intercap-arr",
    situation:
      "Intercap Inc. (premium domain sales, Web3, B2B outbound) needed to scale revenue against an aggressive target.",
    action:
      "Architected scalable, AI-driven revenue systems across brand, content, performance, and organic — automating lead nurture, segmentation, and reporting.",
    result: "Grew ARR from $5M to $10M.",
    headline: "Doubled ARR from $5M to $10M at Intercap Inc.",
    metrics: ["ARR $5M -> $10M", "2x revenue"],
    technologies: [
      "demand generation",
      "performance marketing",
      "ai automation",
      "gtm strategy",
      "cro",
    ],
    industries: ["b2b", "saas", "web3", "ecommerce"],
  },
  {
    id: "intercap-cpl",
    situation:
      "Intercap needed more pipeline without raising cost per lead across paid channels.",
    action:
      "Deployed AI-driven bid automation across Google Ads, Meta, and LinkedIn.",
    result: "Reduced CPL by 30% while increasing lead volume by 50%.",
    headline: "Cut CPL 30% and grew lead volume 50% via AI bid automation.",
    metrics: ["CPL -30%", "lead volume +50%"],
    technologies: [
      "google ads",
      "meta ads",
      "linkedin ads",
      "performance marketing",
      "ai automation",
    ],
    industries: ["b2b", "saas", "web3"],
  },
  {
    id: "intercap-email",
    situation:
      "Intercap's B2B outbound motion required high-volume, deliverable email at scale.",
    action:
      "Ran 1M+ email sends/month via Mailgun and SendGrid; managed the B2B pipeline in Close CRM with Twilio SMS.",
    result: "Sustained 1M+ sends/month feeding a managed Close CRM pipeline.",
    headline: "Scaled B2B email outbound to 1M+ sends/month (Close CRM + Twilio).",
    metrics: ["1M+ email sends/month"],
    technologies: ["email marketing", "close crm", "twilio", "mailgun", "sendgrid", "b2b"],
    industries: ["b2b", "saas"],
  },
  {
    id: "verticalscope-affiliate",
    situation:
      "At VerticalScope, affiliate/arbitrage sites (RateMDs, AutoGuide, FitRated, Treadmill Reviews, RedFlagDeals) needed more efficient revenue.",
    action:
      "Ran traffic arbitrage — buying low-cost display/native via DSP and converting to affiliate/ad revenue — with algorithmic bid management.",
    result: "Grew affiliate revenue 75% while cutting CPC 45%.",
    headline: "Affiliate revenue +75% and CPC -45% via programmatic arbitrage.",
    metrics: ["affiliate revenue +75%", "CPC -45%"],
    technologies: [
      "affiliate marketing",
      "traffic arbitrage",
      "programmatic",
      "dsp",
      "performance marketing",
    ],
    industries: ["affiliate", "ecommerce", "automotive"],
  },
  {
    id: "sep-accounts-roas",
    situation:
      "At Search Engine People / Search Kings, a large book of high-spend accounts spanned ultra-competitive verticals.",
    action:
      "Orchestrated 70+ SMB and enterprise accounts (legal, trades, automotive, mortgage, real estate) and built proprietary KPI dashboards automating 30% of reporting.",
    result: "Consistently achieved 5x+ ROAS across high-spend accounts.",
    headline: "Managed 70+ accounts at 5x+ ROAS across legal, auto, and trades.",
    metrics: ["70+ accounts", "5x+ ROAS", "30% reporting automated"],
    technologies: ["google ads", "performance marketing", "roas", "sem"],
    industries: ["legal", "automotive", "skilled trades", "real estate"],
  },
  {
    id: "legal-ppc",
    situation:
      "Legal PPC for Diamond & Diamond and Preszler Law meant competing at $50–$200+ CPCs in Ontario personal injury.",
    action:
      "Managed ultra-high-competition legal search campaigns for top ad positions across Ontario.",
    result: "Held top ad positions in the most expensive PI keyword markets.",
    headline: "Won top positions in $50–$200+ CPC legal PI search (Diamond & Diamond, Preszler).",
    metrics: ["$50–$200+ CPC keywords", "top ad positions Ontario"],
    technologies: ["google ads", "sem", "performance marketing"],
    industries: ["legal"],
  },
  {
    id: "intercap-team",
    situation:
      "Intercap's marketing function started as a single operator.",
    action:
      "Built the department from scratch — hired and led 10 specialists across Email, Social, PPC, SEO, Content, and Web Dev.",
    result: "Scaled the marketing team from 1 to 10.",
    headline: "Built a marketing team from 1 to 10 at Intercap.",
    metrics: ["1 -> 10 team members"],
    technologies: ["team leadership", "gtm strategy"],
    industries: ["saas", "b2b", "web3"],
  },
  {
    id: "banoo-ai",
    situation:
      "As Fractional CMO at Banoo Marketing, clients in law, cybersecurity, and retail needed lower operational overhead and stable acquisition costs.",
    action:
      "Deployed LLM workflows (OpenAI, Claude, Gemini) to automate multi-channel outbound, content, reporting, and landing-page builds.",
    result:
      "Reduced manual operational overhead while stabilizing acquisition costs.",
    headline:
      "Built AI-driven growth engines (OpenAI/Claude/Gemini) as Fractional CMO.",
    metrics: ["multi-channel automation", "stabilized CAC"],
    technologies: [
      "ai automation",
      "openai",
      "claude",
      "gemini",
      "prompt engineering",
    ],
    industries: ["legal", "cybersecurity", "ecommerce", "real estate"],
  },
];
