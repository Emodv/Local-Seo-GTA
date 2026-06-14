import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scanWebsite } from "@/lib/modules/scanner";
import { classifyBusiness } from "@/lib/modules/classifier";
import { submitToDirectories } from "@/lib/modules/directories";
import { postClassifiedAds } from "@/lib/modules/classified-ads";
import { publishGuestPosts } from "@/lib/modules/guest-posts";
import { runSeoActions } from "@/lib/modules/seo-actions";
import { emitProgress } from "@/lib/progress";

const schema = z.object({
  websiteUrl: z.string().url(),
  businessName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Rate limiting: simple in-memory store
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

  // Create session
  const session = await prisma.session.create({
    data: {
      websiteUrl,
      businessName: businessName || null,
      address: address || null,
      phone: phone || null,
      status: "running",
    },
  });

  // Run automation in background (don't await)
  runAutomation(session.id, websiteUrl, businessName, address, phone).catch(async (err) => {
    console.error("Automation error:", err);
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "failed" },
    });
    emitProgress(session.id, `Error: ${err.message}`, "error");
    emitProgress(session.id, "DONE", "done");
  });

  return NextResponse.json({ sessionId: session.id });
}

async function runAutomation(
  sessionId: string,
  websiteUrl: string,
  businessName?: string,
  address?: string,
  phone?: string
) {
  try {
    emitProgress(sessionId, "Starting GTA Local SEO Bot...", "info");

    // Module A: Scan
    emitProgress(sessionId, "Scanning website...", "info");
    const scan = await scanWebsite(websiteUrl, sessionId);

    // Module A: Classify
    const classification = await classifyBusiness(scan, sessionId);

    // Merge extracted data with user-provided data
    if (businessName) classification.businessName = businessName;
    if (!scan.phones.length && phone) scan.phones = [phone];
    if (!scan.address && address) scan.address = address;

    emitProgress(sessionId, `Extracted ${scan.keywords.length} keywords`, "success");

    // Update session with findings
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        industry: classification.industry,
        keywords: scan.keywords,
        services: classification.services,
        businessName: classification.businessName,
        address: scan.address || address || null,
        phone: scan.phones[0] || phone || null,
      },
    });

    // Module C: Directory submissions
    emitProgress(sessionId, "Starting directory submissions...", "info");
    await submitToDirectories(
      sessionId,
      classification,
      scan.keywords,
      websiteUrl,
      businessName || classification.businessName,
      address || scan.address,
      phone || scan.phones[0]
    );

    // Module B: Classified ads
    emitProgress(sessionId, "Generating classified ads...", "info");
    await postClassifiedAds(sessionId, classification, scan.keywords, websiteUrl);

    // Module D: Guest posts
    emitProgress(sessionId, "Generating guest post content...", "info");
    await publishGuestPosts(sessionId, classification, scan.keywords, websiteUrl);

    // Module E: Additional SEO
    await runSeoActions(
      sessionId,
      websiteUrl,
      classification.businessName,
      classification.industry,
      scan.keywords
    );

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    emitProgress(sessionId, "All SEO tasks completed successfully!", "success");
    emitProgress(sessionId, "DONE", "done");
  } catch (err) {
    throw err;
  }
}
