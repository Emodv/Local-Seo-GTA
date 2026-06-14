import { emitProgress } from "../progress";

interface ScrapedData {
  businessName?: string;
  industry?: string;
  services?: string[];
  phone?: string;
  address?: string;
  email?: string;
  keywords?: string[];
  description?: string;
}

export async function smartScrape(url: string, sessionId: string): Promise<ScrapedData | null> {
  const key = process.env.SCRAPEGRAPHAI_API_KEY || process.env.SGAI_API_KEY;
  if (!key) {
    emitProgress(sessionId, "ScrapeGraphAI: Key not configured, using Cheerio fallback", "info");
    return null;
  }

  try {
    emitProgress(sessionId, `ScrapeGraphAI: AI-powered scraping of ${url}...`, "info");

    const res = await fetch("https://api.scrapegraphai.com/v1/smartscraper", {
      method: "POST",
      headers: {
        "SGAI-APIKEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        website_url: url,
        user_prompt:
          "Extract the following from this business website: business name, industry/category (be specific, e.g. 'Residential Plumbing', 'Personal Injury Law'), list of 8-10 main services offered, phone number, physical address (full with city and province), email address, and 15-20 SEO keywords related to their business and services.",
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`ScrapeGraphAI HTTP ${res.status}`);
    }

    const data = await res.json() as {
      result?: ScrapedData;
      data?: ScrapedData;
      business_name?: string;
      industry?: string;
    };

    const result: ScrapedData = data.result || data.data || data;

    emitProgress(
      sessionId,
      `ScrapeGraphAI: Extracted structured data — ${result.businessName || "business"}, ${result.services?.length || 0} services`,
      "success"
    );

    return result;
  } catch (err) {
    emitProgress(
      sessionId,
      `ScrapeGraphAI: ${err instanceof Error ? err.message : "failed"} — falling back to Cheerio`,
      "warning"
    );
    return null;
  }
}
