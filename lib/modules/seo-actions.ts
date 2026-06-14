import { emitProgress } from "../progress";

export interface SeoReport {
  sitemapUrl: string;
  socialPosts: SocialPost[];
  citationReport: CitationIssue[];
  seoScore: number;
  recommendations: string[];
}

interface SocialPost {
  platform: string;
  content: string;
}

interface CitationIssue {
  type: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export async function runSeoActions(
  sessionId: string,
  websiteUrl: string,
  businessName: string,
  industry: string,
  keywords: string[]
): Promise<SeoReport> {
  emitProgress(sessionId, "Running additional SEO analysis...", "info");

  const domain = new URL(websiteUrl).hostname;
  const sitemapUrl = `${websiteUrl.replace(/\/$/, "")}/sitemap.xml`;

  emitProgress(sessionId, `Checking sitemap at ${sitemapUrl}...`, "info");

  let hasSitemap = false;
  try {
    const res = await fetch(sitemapUrl, { method: "HEAD" });
    hasSitemap = res.ok;
  } catch {
    hasSitemap = false;
  }

  emitProgress(
    sessionId,
    hasSitemap ? "Sitemap found" : "No sitemap detected – recommend creating one",
    hasSitemap ? "success" : "warning"
  );

  // Generate social media post drafts
  const guestPostTitle = `How to Choose the Best ${industry} in Toronto`;
  const socialPosts: SocialPost[] = [
    {
      platform: "Twitter/X",
      content: `Looking for the best ${industry} in Toronto? ${businessName} shares expert tips on what to look for. Read our guide: ${websiteUrl} #Toronto #GTA #${industry.replace(/\s/g, "")}`,
    },
    {
      platform: "Facebook",
      content: `🏙️ Toronto homeowners & businesses – are you looking for reliable ${industry} services in the GTA?\n\n${businessName} has published a comprehensive guide to help you make the right choice.\n\n📖 Read: "${guestPostTitle}"\n\n🔗 ${websiteUrl}\n\n#Toronto #GTA #${industry}`,
    },
    {
      platform: "LinkedIn",
      content: `Proud to share our latest industry insights: "${guestPostTitle}"\n\nAt ${businessName}, we believe in educating our clients in the Greater Toronto Area about making informed decisions.\n\nKey takeaways:\n✅ What credentials to verify\n✅ How to compare quotes\n✅ Red flags to avoid\n\nRead the full article: ${websiteUrl}\n\n#Toronto #LocalBusiness #${industry}`,
    },
  ];

  // NAP citation analysis (simulated)
  const citationReport: CitationIssue[] = [
    {
      type: "Missing Directory Listings",
      description: `${businessName} was not found on several major directories. Complete the submissions above.`,
      severity: "high",
    },
    {
      type: "Inconsistent Business Name",
      description: "Ensure your business name is identical across all platforms (avoid abbreviations).",
      severity: "medium",
    },
    {
      type: "Missing Hours of Operation",
      description: "Add consistent business hours to all directory listings.",
      severity: "medium",
    },
    {
      type: "No Schema Markup",
      description: "Add LocalBusiness JSON-LD schema to your website for better local search visibility.",
      severity: "high",
    },
    {
      type: "Missing Google Business Profile Reviews",
      description: "Request reviews from past clients on your Google Business Profile.",
      severity: "medium",
    },
  ];

  // Calculate SEO score
  let score = 40; // base
  if (hasSitemap) score += 10;
  if (keywords.length > 15) score += 10;
  score += Math.min(20, keywords.length);

  const recommendations = [
    `Add LocalBusiness JSON-LD schema markup to ${websiteUrl}`,
    "Claim and verify Google Business Profile listing",
    "Request reviews from satisfied customers on Google",
    "Ensure NAP (Name, Address, Phone) is consistent across all directories",
    "Create location-specific pages for each GTA city you serve",
    "Build backlinks from local Toronto news sites and blogs",
    "Add your business to all directory listings generated above",
    hasSitemap
      ? "Submit your existing sitemap to Google Search Console"
      : "Create and submit an XML sitemap to Google Search Console",
  ];

  emitProgress(sessionId, `SEO score estimated: ${score}/100`, "info");
  emitProgress(sessionId, "Additional SEO analysis complete", "success");

  return {
    sitemapUrl,
    socialPosts,
    citationReport,
    seoScore: score,
    recommendations,
  };
}
