import * as cheerio from "cheerio";
import { emitProgress } from "../progress";

export interface ScanResult {
  title: string;
  description: string;
  keywords: string[];
  headings: string[];
  bodyText: string;
  navLinks: string[];
  metaKeywords: string[];
  phones: string[];
  emails: string[];
  address: string;
}

export async function scanWebsite(url: string, sessionId: string): Promise<ScanResult> {
  emitProgress(sessionId, `Fetching ${url}...`, "info");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let html: string;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; GTALocalSEOBot/1.0; +https://github.com/emodv/local-seo-gta)",
      },
    });
    html = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const $ = cheerio.load(html);

  // Remove scripts and styles
  $("script, style, noscript").remove();

  const title = $("title").text().trim();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const metaKeywordsRaw = $('meta[name="keywords"]').attr("content") || "";
  const metaKeywords = metaKeywordsRaw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(text);
  });

  const navLinks: string[] = [];
  $("nav a, header a").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 50) navLinks.push(text);
  });

  const bodyText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 5000);

  // Extract phone numbers
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = Array.from(new Set(bodyText.match(phoneRegex) || [])).slice(0, 3);

  // Extract emails
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set(bodyText.match(emailRegex) || [])).slice(0, 3);

  // Try to find address
  const addressRegex =
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl)[,\s]+[A-Za-z\s]+(?:ON|Ontario|Toronto|GTA)/i;
  const addressMatch = bodyText.match(addressRegex);
  const address = addressMatch ? addressMatch[0].trim() : "";

  // Extract keywords from content
  const words = bodyText
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);

  const stopWords = new Set([
    "about", "above", "after", "again", "against", "being", "between", "cannot",
    "could", "during", "every", "first", "found", "great", "group", "have",
    "himself", "hours", "https", "large", "local", "make", "might", "more",
    "most", "much", "need", "never", "number", "often", "only", "other",
    "over", "people", "place", "right", "service", "should", "since", "some",
    "such", "their", "there", "these", "they", "this", "those", "through",
    "time", "under", "very", "website", "were", "what", "when", "where",
    "which", "while", "with", "would", "your",
  ]);

  const wordFreq: Record<string, number> = {};
  for (const word of words) {
    if (!stopWords.has(word) && word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }

  const topKeywords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([word]) => word);

  emitProgress(sessionId, `Extracted ${topKeywords.length} keywords from ${url}`, "success");

  return {
    title,
    description,
    keywords: Array.from(new Set([...topKeywords, ...metaKeywords])).slice(0, 30),
    headings,
    bodyText,
    navLinks,
    metaKeywords,
    phones,
    emails,
    address,
  };
}
