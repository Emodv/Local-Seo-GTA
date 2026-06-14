import Anthropic from "@anthropic-ai/sdk";
import { emitProgress } from "../progress";
import type { ScanResult } from "./scanner";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ClassificationResult {
  industry: string;
  services: string[];
  businessName: string;
  targetAudience: string;
  uniqueSellingPoints: string[];
}

export async function classifyBusiness(
  scan: ScanResult,
  sessionId: string
): Promise<ClassificationResult> {
  emitProgress(sessionId, "Classifying business with AI...", "info");

  const prompt = `Analyze this business website content and extract structured information.

Title: ${scan.title}
Description: ${scan.description}
Headings: ${scan.headings.slice(0, 10).join(" | ")}
Navigation: ${scan.navLinks.slice(0, 10).join(" | ")}
Body excerpt: ${scan.bodyText.slice(0, 1500)}

Return a JSON object with:
- industry: specific industry/category (e.g. "Residential Roofing", "HVAC Services", "Personal Injury Law")
- services: array of 5-10 specific services offered
- businessName: the business name
- targetAudience: who their customers are
- uniqueSellingPoints: 3-5 key selling points

Respond ONLY with valid JSON, no explanation.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    emitProgress(sessionId, `Detected industry: ${result.industry}`, "success");
    return result;
  } catch {
    emitProgress(sessionId, "Using fallback classification", "warning");
    return {
      industry: "Local Business",
      services: scan.navLinks.slice(0, 5),
      businessName: scan.title.split("|")[0].trim() || "Local Business",
      targetAudience: "Residents of Greater Toronto Area",
      uniqueSellingPoints: ["Professional service", "Local expertise", "Competitive pricing"],
    };
  }
}

export async function generateAdContent(
  classification: ClassificationResult,
  keywords: string[],
  businessUrl: string,
  platform: string
): Promise<{ title: string; content: string }> {
  const prompt = `Write a classified ad for a ${classification.industry} business in Toronto, GTA for posting on ${platform}.

Business: ${classification.businessName}
Services: ${classification.services.slice(0, 5).join(", ")}
Keywords: ${keywords.slice(0, 10).join(", ")}
Website: ${businessUrl}

Requirements:
- Title: catchy, under 80 chars, mention Toronto/GTA
- Content: 150-200 words, professional, include call to action
- Mention 2-3 specific services
- End with website URL

Return JSON: {"title": "...", "content": "..."}
Respond ONLY with valid JSON.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return {
      title: `${classification.industry} in Toronto – Best ${classification.industry} Experts`,
      content: `Looking for professional ${classification.industry} services in the Greater Toronto Area? ${classification.businessName} offers top-quality services including ${classification.services.slice(0, 3).join(", ")}. We serve Toronto, Mississauga, Brampton, Markham, and surrounding areas. Contact us today for a free quote!\n\nVisit: ${businessUrl}`,
    };
  }
}

export async function generateGuestPostContent(
  classification: ClassificationResult,
  keywords: string[],
  businessUrl: string
): Promise<{ title: string; content: string }> {
  const prompt = `Write a high-quality 900-word blog article about choosing the best ${classification.industry} in Toronto.

Business to naturally mention: ${classification.businessName} (${businessUrl})
Services: ${classification.services.slice(0, 6).join(", ")}
Keywords to incorporate: ${keywords.slice(0, 12).join(", ")}
Target audience: ${classification.targetAudience}

Article requirements:
- Title: "How to Choose the Best ${classification.industry} in Toronto – Expert Tips"
- 900-1000 words
- H2 subheadings throughout
- Mention 3-4 local Toronto neighborhoods
- Include practical tips
- Natural mention of ${classification.businessName} as an example
- Author byline links to ${businessUrl}
- Professional, informative tone

Return JSON: {"title": "...", "content": "..."}
Content should be the full article in Markdown format.
Respond ONLY with valid JSON.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return {
      title: `How to Choose the Best ${classification.industry} in Toronto – Expert Tips`,
      content: `# How to Choose the Best ${classification.industry} in Toronto\n\nFinding a reliable ${classification.industry} in Toronto and the Greater Toronto Area can feel overwhelming with so many options available. This guide will help you make the right choice.\n\n## What to Look For\n\n1. **Experience and Credentials** – Always verify licensing and insurance\n2. **Local Reputation** – Check reviews on Google and HomeStars\n3. **Transparent Pricing** – Get multiple quotes\n4. **Response Time** – Fast communication matters\n\n## Why Local Matters\n\nLocal ${classification.industry} businesses in Toronto understand the city's unique needs, from weather patterns to building codes.\n\n## Our Recommendation\n\n[${classification.businessName}](${businessUrl}) is a trusted ${classification.industry} provider serving Toronto, Mississauga, Brampton, and the GTA. Contact them today for a free consultation.\n\n*Article by ${classification.businessName} – [${businessUrl}](${businessUrl})*`,
    };
  }
}
