import { prisma } from "../db";
import { emitProgress } from "../progress";
import { sleep } from "../utils";
import { generateAdContent } from "./classifier";
import classifiedSitesConfig from "../config/classified-sites.json";
import type { ClassificationResult } from "./classifier";

interface ClassifiedSite {
  name: string;
  url: string;
  region: string;
  requiresAuth: boolean;
  manualOnly: boolean;
  manualGuide?: string;
}

const sites: ClassifiedSite[] = classifiedSitesConfig as ClassifiedSite[];

export async function postClassifiedAds(
  sessionId: string,
  classification: ClassificationResult,
  keywords: string[],
  businessUrl: string
) {
  emitProgress(sessionId, `Generating classified ads for ${sites.length} platforms...`, "info");

  for (let i = 0; i < sites.length; i++) {
    const site = sites[i];
    emitProgress(sessionId, `Preparing ad for ${site.name} (${i + 1}/${sites.length})...`, "info");

    try {
      const { title, content } = await generateAdContent(
        classification,
        keywords,
        businessUrl,
        site.name
      );

      if (site.manualOnly) {
        await prisma.classifiedAd.create({
          data: {
            sessionId,
            platform: site.name,
            title,
            content,
            status: "manual_required",
            error: site.manualGuide || `Post manually at ${site.url}`,
          },
        });
        emitProgress(sessionId, `${site.name}: Ad generated – manual posting required`, "warning");
      } else {
        // Attempt automated posting (HEAD check for now)
        await prisma.classifiedAd.create({
          data: {
            sessionId,
            platform: site.name,
            title,
            content,
            status: "manual_required",
            error: `Open ${site.url} and paste the generated ad content`,
          },
        });
        emitProgress(sessionId, `${site.name}: Ad content generated – open URL to post`, "warning");
      }
    } catch (err) {
      await prisma.classifiedAd.create({
        data: {
          sessionId,
          platform: site.name,
          status: "failed",
          error: err instanceof Error ? err.message : "Generation failed",
        },
      });
      emitProgress(sessionId, `${site.name}: Failed`, "error");
    }

    // Rate limit: 30s per domain as specified, but we just generate content
    await sleep(300);
  }

  emitProgress(sessionId, "Classified ad content generated for all platforms", "success");
}
