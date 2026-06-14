import { emitProgress } from "../progress";

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
}

export interface DomainAnalysis {
  organicKeywords: number;
  organicTraffic: number;
  backlinks: number;
  domainRank: number;
  topKeywords: KeywordData[];
  competitors: CompetitorData[];
}

export interface CompetitorData {
  domain: string;
  commonKeywords: number;
}

const BASE = "https://api.semrush.com/";
const DB = "ca"; // Canadian database for GTA

function parseSemrushCsv(raw: string): Record<string, string>[] {
  const lines = raw.trim().split("\r\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (values[i] || "").trim()));
    return row;
  });
}

async function semrushFetch(params: Record<string, string>): Promise<string> {
  const key = process.env.SEMRUSH_API_KEY;
  if (!key) throw new Error("SEMRUSH_API_KEY not configured");

  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${BASE}?${qs.toString()}`);
  if (!res.ok) throw new Error(`SemRush HTTP ${res.status}`);
  return res.text();
}

export async function getDomainAnalysis(
  domain: string,
  sessionId: string
): Promise<DomainAnalysis | null> {
  if (!process.env.SEMRUSH_API_KEY) {
    emitProgress(sessionId, "SemRush: API key not configured, skipping domain analysis", "warning");
    return null;
  }

  try {
    emitProgress(sessionId, `SemRush: Analyzing domain ${domain}...`, "info");

    // Domain overview
    const overviewRaw = await semrushFetch({
      type: "domain_ranks",
      domain,
      database: DB,
      export_columns: "Dn,Rk,Or,Ot,Oc,Ad",
    });
    const overview = parseSemrushCsv(overviewRaw)[0] || {};

    // Top organic keywords for this domain
    const keywordsRaw = await semrushFetch({
      type: "domain_organic",
      domain,
      database: DB,
      export_columns: "Ph,Po,Nq,Cp,Co",
      display_limit: "20",
    });
    const keywordRows = parseSemrushCsv(keywordsRaw);
    const topKeywords: KeywordData[] = keywordRows.map((r) => ({
      keyword: r["Keyword"] || r["Ph"] || "",
      searchVolume: parseInt(r["Search Volume"] || r["Nq"] || "0", 10) || 0,
      cpc: parseFloat(r["CPC"] || r["Cp"] || "0") || 0,
      competition: parseFloat(r["Competition"] || r["Co"] || "0") || 0,
    })).filter((k) => k.keyword);

    // Competitors
    let competitors: CompetitorData[] = [];
    try {
      const compRaw = await semrushFetch({
        type: "domain_organic_organic",
        domain,
        database: DB,
        export_columns: "Dn,Cr,Np",
        display_limit: "5",
      });
      competitors = parseSemrushCsv(compRaw).map((r) => ({
        domain: r["Domain"] || r["Dn"] || "",
        commonKeywords: parseInt(r["Common Keywords"] || r["Np"] || "0", 10) || 0,
      })).filter((c) => c.domain);
    } catch {
      // competitors are optional
    }

    const result: DomainAnalysis = {
      organicKeywords: parseInt(overview["Organic Keywords"] || overview["Or"] || "0", 10) || 0,
      organicTraffic: parseInt(overview["Organic Traffic"] || overview["Ot"] || "0", 10) || 0,
      backlinks: 0,
      domainRank: parseInt(overview["Rank"] || overview["Rk"] || "0", 10) || 0,
      topKeywords,
      competitors,
    };

    emitProgress(
      sessionId,
      `SemRush: Domain rank #${result.domainRank}, ${result.organicKeywords} organic keywords, ~${result.organicTraffic.toLocaleString()} monthly visits`,
      "success"
    );

    return result;
  } catch (err) {
    emitProgress(sessionId, `SemRush: ${err instanceof Error ? err.message : "error"}`, "warning");
    return null;
  }
}

export async function getKeywordVolumes(
  keywords: string[],
  sessionId: string
): Promise<KeywordData[]> {
  if (!process.env.SEMRUSH_API_KEY || keywords.length === 0) return [];

  try {
    emitProgress(sessionId, `SemRush: Getting search volumes for ${Math.min(keywords.length, 10)} keywords...`, "info");

    // SemRush allows pipe-separated batch keyword lookup (max 100)
    const batch = keywords.slice(0, 10).join("|");
    const raw = await semrushFetch({
      type: "phrase_these",
      phrase: batch,
      database: DB,
      export_columns: "Ph,Nq,Cp,Co",
    });

    const rows = parseSemrushCsv(raw);
    const result: KeywordData[] = rows.map((r) => ({
      keyword: r["Keyword"] || r["Ph"] || "",
      searchVolume: parseInt(r["Search Volume"] || r["Nq"] || "0", 10) || 0,
      cpc: parseFloat(r["CPC"] || r["Cp"] || "0") || 0,
      competition: parseFloat(r["Competition"] || r["Co"] || "0") || 0,
    })).filter((k) => k.keyword && k.searchVolume > 0);

    emitProgress(
      sessionId,
      `SemRush: Found ${result.length} keywords with search volume data`,
      "success"
    );

    return result;
  } catch (err) {
    emitProgress(sessionId, `SemRush keyword lookup: ${err instanceof Error ? err.message : "error"}`, "warning");
    return [];
  }
}

export function calculateSeoScoreFromSemrush(
  analysis: DomainAnalysis | null,
  hasSitemap: boolean,
  isGoogleListed: boolean,
  keywordCount: number
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;

  if (analysis) {
    // Domain rank (lower = better; SemRush rank 1 = best)
    const rankScore = analysis.domainRank > 0 && analysis.domainRank < 100000 ? 15 : 5;
    breakdown["Domain Authority"] = rankScore;
    score += rankScore;

    // Organic traffic
    const trafficScore = analysis.organicTraffic > 1000 ? 15 : analysis.organicTraffic > 100 ? 10 : 5;
    breakdown["Organic Traffic"] = trafficScore;
    score += trafficScore;

    // Organic keywords
    const kwScore = analysis.organicKeywords > 50 ? 15 : analysis.organicKeywords > 10 ? 10 : 5;
    breakdown["Indexed Keywords"] = kwScore;
    score += kwScore;
  } else {
    score += 15; // base if SemRush not available
    breakdown["Base Score"] = 15;
  }

  if (isGoogleListed) {
    score += 20;
    breakdown["Google Business Profile"] = 20;
  }

  if (hasSitemap) {
    score += 10;
    breakdown["XML Sitemap"] = 10;
  }

  if (keywordCount > 20) {
    score += 10;
    breakdown["Content Keywords"] = 10;
  }

  // Cap at 100
  return { score: Math.min(score, 100), breakdown };
}
