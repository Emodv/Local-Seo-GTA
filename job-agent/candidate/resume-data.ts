/**
 * Structured resume content, transcribed verbatim from
 * Emod_Vafa_Resume_2026.pdf (2026-07-16). This is the factual source the
 * tailoring engine reorders/emphasizes — it must never be edited to invent
 * achievements, change dates, or alter metrics.
 *
 * Two summary variants are provided so the tailor can present the appropriate
 * framing for permanent vs fractional/consulting/contract roles WITHOUT
 * changing any underlying experience.
 */

export interface ResumeExperience {
  title: string;
  company: string;
  location: string;
  dates: string;
  context?: string; // verticals line
  bullets: string[];
}

export interface ResumeData {
  name: string;
  headline: string;
  contactLine: string;
  /** Summary framed for permanent corporate leadership roles (resume default). */
  summaryPermanent: string;
  /** Summary framed for fractional / consulting / contract engagements. */
  summaryFractional: string;
  skillGroups: { label: string; skills: string[] }[];
  experience: ResumeExperience[];
  education: string[];
  certifications: string[];
}

export const RESUME: ResumeData = {
  name: "EMOD VAFA",
  headline: "Director of Marketing  |  Performance & Growth Leader  |  15+ Years",
  contactLine:
    "Toronto, ON  |  (416) 400-4699  |  emadvafa@gmail.com  |  linkedin.com/in/emodvafa",
  summaryPermanent:
    "Revenue-focused Director of Marketing with 15+ years building high-performance demand generation engines across Legal, Automotive, Real Estate, Affiliate/Ecommerce, and Skilled Trades. Doubled ARR $5M → $10M at Intercap Inc. by architecting scalable, AI-driven revenue systems across brand, content, performance, and organic channels. Expert in team building (1–10+), cross-functional leadership, and sales alignment. Seeking a permanent corporate leadership role to apply enterprise-grade marketing infrastructure skills at scale.",
  summaryFractional:
    "Revenue-focused marketing leader with 15+ years building high-performance demand generation engines across Legal, Automotive, Real Estate, Affiliate/Ecommerce, and Skilled Trades. Doubled ARR $5M → $10M at Intercap Inc. by architecting scalable, AI-driven revenue systems across brand, content, performance, and organic channels. Currently Fractional CMO at Banoo Marketing, partnering with law, cybersecurity, and retail clients. Open to executive consulting and fractional leadership engagements where enterprise-grade marketing infrastructure can be stood up quickly.",
  skillGroups: [
    {
      label: "Growth Channels",
      skills: [
        "Google Ads (Certified)",
        "Meta / Facebook Ads",
        "LinkedIn Ads",
        "Programmatic / DSP",
        "Enterprise SEO & SEM",
        "Email Marketing",
      ],
    },
    {
      label: "Industry Expertise",
      skills: [
        "Law Firm PPC (PI & Family)",
        "Automotive",
        "Real Estate Pre-Con",
        "Affiliate & Traffic Arbitrage",
        "Ecommerce",
        "Skilled Trades",
      ],
    },
    {
      label: "MarTech & Automation",
      skills: [
        "HubSpot",
        "Salesforce",
        "GA4",
        "AI Automation (OpenAI / Claude / Gemini)",
        "Close CRM",
        "CAC/LTV Optimization",
        "Multi-Touch Attribution",
      ],
    },
  ],
  experience: [
    {
      title: "Director of Marketing",
      company: "Intercap Inc. (Premium Domain Sales)",
      location: "Toronto, ON",
      dates: "2022 – 2025",
      context: "Premium Domain Sales (.inc, .box, Ecommerce TLDs) | Web3 | B2B Outbound",
      bullets: [
        "Built the marketing department from scratch — grew team from 1 to 10 overseas specialists covering Email, Social, PPC, SEO, Content, and Web Development.",
        "Owned full marketing scope: Performance Marketing & Growth, Brand, Content, and Organic — ensuring consistent positioning across all channels and funnel stages.",
        "Led cross-functional strategy and sales alignment — partnered with product and revenue teams to translate market feedback into roadmap priorities and GTM execution.",
        "Architected scalable revenue systems — automated lead nurture, segmentation, and reporting infrastructure supporting consistent ARR growth from $5M to $10M.",
        "Drove premium domain sales for .inc, .box (Web3), and ecommerce TLDs through multi-channel demand generation and funnel CRO.",
        "Executed high-volume email outbound at 1M+ sends/month via Mailgun and SendGrid; managed B2B pipeline in Close CRM with Twilio SMS integration.",
        "Reduced CPL by 30% while increasing lead volume by 50% via AI-driven bid automation across Google Ads, Meta, and LinkedIn.",
      ],
    },
    {
      title: "Senior Growth Marketing Manager",
      company: "VerticalScope Inc.",
      location: "Toronto, ON",
      dates: "2018 – 2022",
      context: "Affiliate Marketing | Traffic Arbitrage | Fitness Ecommerce | Automotive Media",
      bullets: [
        "Managed paid search, display, and programmatic ads across 5 high-traffic affiliate review sites: RateMDs, Treadmill Reviews, AutoGuide, FitRated, and Red Flag Deals.",
        "Executed traffic arbitrage strategy — buying low-cost display and native traffic via DSP and converting it into affiliate and ad revenue across fitness, health, and automotive verticals.",
        "Grew affiliate revenue 75% while reducing CPC by 45% via algorithmic bid management and programmatic display arbitrage.",
        "Drove ecommerce affiliate sales for fitness equipment (treadmills, ellipticals, spin bikes, rowers) through review content and paid acquisition.",
      ],
    },
    {
      title: "Agency Paid Search & Performance Leader",
      company: "Search Engine People (SEP) & Search Kings",
      location: "Toronto, ON",
      dates: "2016 – 2018",
      context: "Legal (PI) | Automotive | Skilled Trades | Mortgage",
      bullets: [
        "Managed Diamond & Diamond Personal Injury and Preszler Law PPC — ultra-high-competition legal ($50–$200+ CPCs), top ad positions across Ontario.",
        "Led Google Ads for Mr. Rooter Plumbing, HVAC, roofing, and dental clients across Canada.",
        "Managed Rafih Auto Group, Subaru Canada used car inventory, and national automotive dealer group campaigns.",
        "Orchestrated 70+ SMB and enterprise accounts across legal, trades, automotive, mortgage, and real estate verticals.",
        "Built proprietary KPI dashboards automating 30% of manual reporting; consistently achieved 5x+ ROAS across high-spend accounts.",
      ],
    },
    {
      title: "Digital Marketing Manager",
      company: "eDealer",
      location: "Toronto, ON",
      dates: "2014 – 2016",
      context: "Automotive — New & Used Inventory (20+ Dealerships)",
      bullets: [
        "Managed Google Ads for Pfaff Auto Group, Macdonald Auto Group, Policaro Auto Group, Zanchin Auto Group, Budds Auto Group, and Rafih Auto Group.",
        "Led new and used inventory campaigns — model launches, seasonal promotions, and clearance across all major Canadian automotive franchises.",
        "Delivered consistent ROI improvements through data-driven optimization and OEM co-op compliance.",
      ],
    },
    {
      title: "Fractional CMO & Automation Consultant",
      company: "Banoo Marketing",
      location: "Toronto, ON",
      dates: "2025 – Present",
      bullets: [
        "Retained by select clients in law, cybersecurity, and retail to architect AI-driven growth engines, reducing manual operational overhead while stabilizing acquisition costs.",
        "Deployed LLM workflows (OpenAI, Claude, Gemini) to automate multi-channel outbound sequences, content production, reporting, and landing page builds.",
        "Specialized in GTA preconstruction condo lead generation; partnered with N5R, World Class Realty Point, Connect Asset Management, and Royal LePage agents.",
      ],
    },
  ],
  education: [
    "Honours Bachelor of Business Administration (BBA) — Marketing, Schulich School of Business, York University | Toronto, ON | 2011",
  ],
  certifications: [
    "Google Ads Certified (Search, Display, Video)",
    "Google Analytics 4 (GA4)",
    "Meta Blueprint",
    "HubSpot Marketing Hub",
    "Salesforce CRM",
    "Instantly.ai",
    "Apollo.io",
    "Snov.io",
    "Vapi.ai",
    "OpenAI / Claude AI / Prompt Engineering",
  ],
};
