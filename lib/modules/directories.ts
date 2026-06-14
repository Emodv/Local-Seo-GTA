import { prisma } from "../db";
import { emitProgress } from "../progress";
import { sleep } from "../utils";
import directoriesConfig from "../config/directories.json";
import type { ClassificationResult } from "./classifier";

interface DirectoryEntry {
  name: string;
  url: string;
  category: string;
  region: string;
  requiresAuth: boolean;
  manualOnly: boolean;
  manualGuide?: string;
}

const directories: DirectoryEntry[] = directoriesConfig as DirectoryEntry[];

export async function submitToDirectories(
  sessionId: string,
  classification: ClassificationResult,
  keywords: string[],
  businessUrl: string,
  businessName?: string,
  address?: string,
  phone?: string
) {
  emitProgress(sessionId, `Starting directory submissions (${directories.length} directories)...`, "info");

  const biz = {
    name: businessName || classification.businessName,
    address: address || "Toronto, ON",
    phone: phone || "",
    website: businessUrl,
    industry: classification.industry,
    services: classification.services.slice(0, 5).join(", "),
    keywords: keywords.slice(0, 10).join(", "),
  };

  let success = 0;
  let manual = 0;
  let failed = 0;

  for (let i = 0; i < directories.length; i++) {
    const dir = directories[i];
    emitProgress(sessionId, `Submitting to ${dir.name} (${i + 1}/${directories.length})...`, "info");

    try {
      if (dir.manualOnly) {
        // Generate pre-filled URL or manual guide
        const manualUrl = buildManualUrl(dir, biz);
        await prisma.directorySubmission.create({
          data: {
            sessionId,
            directoryName: dir.name,
            directoryUrl: dir.url,
            status: "manual_required",
            manualUrl: manualUrl || dir.url,
            error: dir.manualGuide || `Manual submission required at ${dir.url}`,
          },
        });
        manual++;
        emitProgress(sessionId, `${dir.name}: Manual submission required`, "warning");
      } else {
        // Attempt automated form detection
        const result = await attemptAutoSubmit(dir, biz);
        await prisma.directorySubmission.create({
          data: {
            sessionId,
            directoryName: dir.name,
            directoryUrl: dir.url,
            status: result.success ? "submitted" : "manual_required",
            submittedUrl: result.submittedUrl,
            manualUrl: dir.url,
            error: result.error,
          },
        });
        if (result.success) {
          success++;
          emitProgress(sessionId, `${dir.name}: Submitted successfully`, "success");
        } else {
          manual++;
          emitProgress(sessionId, `${dir.name}: Requires manual submission`, "warning");
        }
      }
    } catch (err) {
      failed++;
      await prisma.directorySubmission.create({
        data: {
          sessionId,
          directoryName: dir.name,
          directoryUrl: dir.url,
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          manualUrl: dir.url,
        },
      });
      emitProgress(sessionId, `${dir.name}: Failed - ${err instanceof Error ? err.message : "error"}`, "error");
    }

    // Rate limiting: small delay between submissions
    await sleep(500);
  }

  emitProgress(
    sessionId,
    `Directory submissions complete: ${success} auto-submitted, ${manual} manual required, ${failed} failed`,
    "success"
  );

  return { success, manual, failed };
}

function buildManualUrl(
  dir: DirectoryEntry,
  biz: { name: string; address: string; phone: string; website: string; industry: string }
): string {
  const encoded = {
    name: encodeURIComponent(biz.name),
    address: encodeURIComponent(biz.address),
    phone: encodeURIComponent(biz.phone),
    website: encodeURIComponent(biz.website),
    category: encodeURIComponent(biz.industry),
  };

  // Return the directory URL with pre-filled params where supported
  const url = new URL(dir.url);

  if (dir.name.includes("YellowPages")) {
    url.searchParams.set("name", biz.name);
    url.searchParams.set("address", biz.address);
  } else if (dir.name.includes("Hotfrog")) {
    url.searchParams.set("company", biz.name);
    url.searchParams.set("town", "Toronto");
  }

  return url.toString();
}

async function attemptAutoSubmit(
  dir: DirectoryEntry,
  biz: { name: string; address: string; phone: string; website: string }
): Promise<{ success: boolean; submittedUrl?: string; error?: string }> {
  // For directories that don't require auth, we check if the URL is reachable
  // and provide a pre-filled form URL. True automation requires Puppeteer.
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(dir.url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot/1.0)" },
    });
    clearTimeout(timeout);

    if (res.ok || res.status === 405) {
      // Site is reachable - provide manual URL since true form filling needs browser
      return {
        success: false,
        error: `Site reachable. Open ${dir.url} to submit manually (CAPTCHA/auth may be required)`,
      };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch {
    return { success: false, error: "Site unreachable or timed out" };
  }
}
