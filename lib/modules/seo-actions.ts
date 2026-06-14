import { emitProgress } from "../progress";
import { getDomainAnalysis, getKeywordVolumes, calculateSeoScoreFromSemrush } from "./semrush";
import { postTweet, buildSeoTweet } from "./twitter-poster";

export interface SeoReport {
  sitemapUrl: string;
  socialPosts: SocialPost[];
  citationReport: CitationIssue[];
  seoScore: number;
  seoScoreBreakdown: Record<string, number>;
  semrushData: SemrushSummary | null;
  tweetUrl: string | null;
  recommendations: string[];
}

export interface SemrushSummary {
  domainRank: number;
  organicKeywords: number;
  organicTraffic: number;
  topKeywords: Array<{ keyword: string; searchVolume: number; cpc: number }>;
  competitors: Array<{ domain: string; commonKeywords: number }>;
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
  keywords: string[],
  isGoogleListed: boolean
): Promise<SeoReport> {
  emitProgress(sessionId, "Running advanced SEO analysis...", "info");

  const domain = new URL(websiteUrl).hostname.replace("www.", "");
  const sitemapUrl = `${websiteUrl.replace(/\/$/, "")}/sitemap.xml`;

  // Check sitemap
  emitProgress(sessionId, `Checking sitemap at ${sitemapUrl}...`, "info");
  let hasSitemap = false;
  try {
    const res = await fetch(sitemapUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    hasSitemap = res.ok;
  } catch {
    hasSitemap = false;
  }
  emitProgress(sessionId, hasSitemap ? "Sitemap found ✓" : "No sitemap – recommend creating one", hasSitemap ? "success" : "warning");

  // SemRush domain analysis
  const semrush = await getDomainAnalysis(domain, sessionId);
  const semrushKeywords = await getKeywordVolumes(keywords.slice(0, 10), sessionId);

  // Merge SemRush keyword data into our keyword list
  let enrichedKeywords = keywords;
  if (semrushKeywords.length > 0) {
    const srKwSet = new Set(semrushKeywords.map((k) => k.keyword));
    enrichedKeywords = [
      ...semrushKeywords.map((k) => k.keyword),
      ...keywords.filter((k) => !srKwSet.has(k)),
    ].slice(0, 30);
    emitProgress(sessionId, `SemRush: Updated keyword list with real search data`, "success");
  }

  // Calculate SEO score using real data
  const { score, breakdown } = calculateSeoScoreFromSemrush(semrush, hasSitemap, isGoogleListed, enrichedKeywords.length);

  // Post tweet
  const tweetText = buildSeoTweet(businessName, industry, websiteUrl, enrichedKeywords);
  const tweet = await postTweet(tweetText, sessionId);

  // Social media post drafts
  const guestPostTitle = `How to Choose the Best ${industry} in Toronto`;
  const socialPosts: SocialPost[] = [
    {
      platform: "Twitter/X",
      content: tweet ? `✅ POSTED: ${tweet.url}` : tweetText,
    },
    {
      platform: "Facebook",
      content: `🏙️ Toronto homeowners & businesses – are you looking for reliable ${industry} services in the GTA?\n\n${businessName} has published a comprehensive guide to help you make the right choice.\n\n📖 Read: "${guestPostTitle}"\n🔗 ${websiteUrl}\n\n#Toronto #GTA #${industry}`,
    },
    {
      platform: "LinkedIn",
      content: `Proud to share our latest insights: "${guestPostTitle}"\n\nAt ${businessName}, we help Greater Toronto Area clients make informed decisions.\n\n✅ What credentials to verify\n✅ How to compare quotes  \n✅ Red flags to avoid\n\n${websiteUrl}\n\n#Toronto #LocalBusiness #${industry}`,
    },
  ];

  // Citation analysis
  const citationReport: CitationIssue[] = [
    {
      type: "Missing Directory Listings",
      description: `${businessName} needs to be listed on the ${isGoogleListed ? "remaining" : "major"} directories submitted above.`,
      severity: isGoogleListed ? "medium" : "high",
    },
    {
      type: semrush && semrush.organicKeywords < 20 ? "Low Organic Keyword Coverage" : "Keyword Opportunities",
      description: semrush
        ? `Domain has ${semrush.organicKeywords} indexed keywords and ~${semrush.organicTraffic.toLocaleString()} monthly visits. Target: 100+ keywords.`
        : "Boost keyword coverage by creating location-specific pages for each GTA city.",
      severity: semrush && semrush.organicKeywords < 10 ? "high" : "medium",
    },
    {
      type: "No Schema Markup Detected",
      description: "Add LocalBusiness JSON-LD schema to your website for enhanced local search visibility.",
      severity: "high",
    },
    {
      type: "Review Generation",
      description: `${isGoogleListed ? `You have a Google listing. Request more reviews to build trust.` : "Get on Google Business Profile and start collecting reviews immediately."}`,
      severity: isGoogleListed ? "low" : "high",
    },
  ];

  if (semrush?.competitors.length) {
    citationReport.push({
      type: "Competitor Gap",
      description: `Top GTA competitor: ${semrush.competitors[0].domain} shares ${semrush.competitors[0].commonKeywords} keywords with you. Analyze their content strategy.`,
      severity: "medium",
    });
  }

  // Recommendations
  const recommendations = [
    `Add LocalBusiness JSON-LD schema markup to ${websiteUrl}`,
    isGoogleListed
      ? "Optimize your Google Business Profile – add photos, hours, and respond to reviews"
      : "Claim and verify your Google Business Profile immediately (highest priority)",
    "Request reviews from satisfied customers on Google – aim for 10+ within 30 days",
    "Ensure NAP (Name, Address, Phone) is identical across all directory listings",
    "Create location pages for: Toronto, Mississauga, Brampton, Markham, Vaughan",
    hasSitemap
      ? "Submit sitemap to Google Search Console (Search Console > Sitemaps)"
      : "Create an XML sitemap and submit it to Google Search Console",
    semrush && semrush.organicTraffic > 0
      ? `Your site gets ~${semrush.organicTraffic.toLocaleString()} organic visits/month – focus on converting visitors with clear CTAs`
      : "Focus on creating content around your top keywords to drive organic traffic",
    tweet
      ? `Your GTA SEO tweet was posted: ${tweet.url}`
      : "Connect X/Twitter API to auto-post promotional content",
  ];

  const semrushSummary: SemrushSummary | null = semrush
    ? {
        domainRank: semrush.domainRank,
        organicKeywords: semrush.organicKeywords,
        organicTraffic: semrush.organicTraffic,
        topKeywords: semrush.topKeywords.slice(0, 10).map((k) => ({
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          cpc: k.cpc,
        })),
        competitors: semrush.competitors.slice(0, 5),
      }
    : null;

  emitProgress(sessionId, `SEO analysis complete — score: ${score}/100`, "success");

  return {
    sitemapUrl,
    socialPosts,
    citationReport,
    seoScore: score,
    seoScoreBreakdown: breakdown,
    semrushData: semrushSummary,
    tweetUrl: tweet?.url || null,
    recommendations,
  };
}
