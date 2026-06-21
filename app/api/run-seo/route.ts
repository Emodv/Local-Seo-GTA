import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scanWebsite } from "@/lib/modules/scanner";
import { classifyBusiness } from "@/lib/modules/classifier";
import { submitToDirectories } from "@/lib/modules/directories";
import { postClassifiedAds } from "@/lib/modules/classified-ads";
import { publishGuestPosts } from "@/lib/modules/guest-posts";
import { runSeoActions } from "@/lib/modules/seo-actions";
import { findBusinessOnGoogle } from "@/lib/modules/google-places";
import { emitProgress } from "@/lib/progress";

export const maxDuration = 300;

const schema = z.object({
  websiteUrl: z.string().url(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Rate limiting: in-memory per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded (10/hour)" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { websiteUrl, businessName, address, phone } = parsed.data;

  const session = await prisma.session.create({
    data: {
      websiteUrl,
      businessName: businessName || null,
      address: address || null,
      phone: phone || null,
      status: "running",
    },
  });

  // Run automation in background — waitUntil keeps the serverless function
  // alive after the response is sent (fire-and-forget alone gets killed on Vercel)
  waitUntil(
    runAutomation(session.id, websiteUrl, businessName, address, phone).catch(async (err) => {
      console.error("Automation error:", err);
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "failed" },
      });
      emitProgress(session.id, `Fatal error: ${err instanceof Error ? err.message : "unknown"}`, "error");
      emitProgress(session.id, "DONE", "done");
    })
  );

  return NextResponse.json({ sessionId: session.id });
}

async function runAutomation(
  sessionId: string,
  websiteUrl: string,
  businessName?: string,
  address?: string,
  phone?: string
) {
  emitProgress(sessionId, "Starting GTA Local SEO Bot...", "info");

  // ── Module A: Scan (Cheerio + ScrapeGraphAI enhancement) ──────────────
  emitProgress(sessionId, "Scanning website...", "info");
  const scan = await scanWebsite(websiteUrl, sessionId);
  emitProgress(sessionId, `Extracted ${scan.keywords.length} keywords${scan.sgaiEnhanced ? " (AI-enhanced)" : ""}`, "success");

  // ── Module A: AI classify business ────────────────────────────────────
  const classification = await classifyBusiness(scan, sessionId);
  if (businessName) classification.businessName = businessName;
  if (!scan.phones.length && phone) scan.phones = [phone];
  if (!scan.address && address) scan.address = address;

  // ── Google Places: Find & validate business ───────────────────────────
  emitProgress(sessionId, "Checking Google Business Profile status...", "info");
  const placesData = await findBusinessOnGoogle(
    businessName || classification.businessName,
    address || scan.address || "Toronto Ontario",
    sessionId
  );

  const isGoogleListed = placesData?.isListed ?? false;

  // Enrich NAP from Google Places if not provided
  const enrichedPhone = phone || placesData?.phone || scan.phones[0] || "";
  const enrichedAddress = address || placesData?.address || scan.address || "Toronto, ON";
  const enrichedBusinessName = businessName || placesData?.name || classification.businessName;

  if (placesData?.isListed) {
    emitProgress(
      sessionId,
      `Google Maps: Listed ✓ — ⭐ ${placesData.rating} (${placesData.reviewCount} reviews)`,
      "success"
    );
  } else {
    emitProgress(sessionId, "Google Maps: Not listed yet — submitting to directories will help", "warning");
  }

  // Save initial session data
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      industry: classification.industry,
      keywords: scan.keywords,
      services: classification.services,
      businessName: enrichedBusinessName,
      address: enrichedAddress,
      phone: enrichedPhone,
      googlePlacesData: placesData ? (placesData as object) : undefined,
    },
  });

  // ── Module C: Directory submissions ───────────────────────────────────
  emitProgress(sessionId, "Starting directory submissions...", "info");
  await submitToDirectories(
    sessionId,
    classification,
    scan.keywords,
    websiteUrl,
    enrichedBusinessName,
    enrichedAddress,
    enrichedPhone
  );

  // ── Module B: Classified ads ───────────────────────────────────────────
  emitProgress(sessionId, "Generating classified ads...", "info");
  await postClassifiedAds(sessionId, classification, scan.keywords, websiteUrl);

  // ── Module D: Guest posts ─────────────────────────────────────────────
  emitProgress(sessionId, "Generating guest post content...", "info");
  await publishGuestPosts(sessionId, classification, scan.keywords, websiteUrl);

  // ── Module E: SemRush + Twitter + SEO report ──────────────────────────
  const seoReport = await runSeoActions(
    sessionId,
    websiteUrl,
    enrichedBusinessName,
    classification.industry,
    scan.keywords,
    isGoogleListed
  );

  // Save final data
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      seoScore: seoReport.seoScore,
      semrushData: seoReport.semrushData ? (seoReport.semrushData as object) : undefined,
      tweetUrl: seoReport.tweetUrl || null,
    },
  });

  emitProgress(sessionId, `All SEO tasks completed! Final score: ${seoReport.seoScore}/100`, "success");
  emitProgress(sessionId, "DONE", "done");
}
