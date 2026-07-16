import type {
  BragStory,
  EnrichedJob,
  ResumeVariant,
} from "../types";
import { countMatches, normalize } from "./text";

/**
 * Pick the best resume variant for a job by scoring keyword + title overlap
 * against the JD. Returns the winner plus a 0-100 confidence (keyword-overlap
 * ratio of the chosen variant), used by the autonomous-mode gate.
 */
export function selectResume(
  job: EnrichedJob,
  variants: ResumeVariant[],
): { variant: ResumeVariant | null; confidence: number } {
  const haystack = `${job.title} ${job.description} ${(job.requirements ?? []).join(" ")}`;
  const title = normalize(job.title);

  let best: ResumeVariant | null = null;
  let bestScore = -1;
  let bestConfidence = 0;

  for (const v of variants) {
    const kwHits = countMatches(haystack, v.keywords).length;
    const titleHits = v.titles.filter((t) => title.includes(normalize(t))).length;
    const score = kwHits + titleHits * 2; // title match weighted heavier
    const confidence = Math.min(
      100,
      Math.round((kwHits / Math.max(1, v.keywords.length)) * 100) + titleHits * 15,
    );
    if (score > bestScore) {
      best = v;
      bestScore = score;
      bestConfidence = confidence;
    }
  }

  // If nothing matched at all, fall back to the executive variant if present.
  if (bestScore <= 0) {
    const exec = variants.find((v) => v.id === "executive") ?? variants[0] ?? null;
    return { variant: exec, confidence: exec ? 40 : 0 };
  }
  return { variant: best, confidence: bestConfidence };
}

/**
 * Select the most relevant brag stories for a job. Ranks by technology +
 * industry overlap with the JD and returns the top `limit`.
 */
export function selectBragStories(
  job: EnrichedJob,
  bank: BragStory[],
  limit = 3,
): BragStory[] {
  const haystack = `${job.title} ${job.description} ${(job.requirements ?? []).join(" ")}`;
  const industry = normalize(job.company_intel?.industry ?? "");

  const ranked = bank
    .map((story) => {
      const techHits = countMatches(haystack, story.technologies).length;
      const industryHits =
        countMatches(`${haystack} ${industry}`, story.industries).length;
      return { story, score: techHits * 2 + industryHits };
    })
    .sort((a, b) => b.score - a.score);

  // Always return `limit` stories; if scores tie at 0 we still surface the
  // strongest headline achievements (ARR, ROAS) which lead the bank.
  return ranked.slice(0, limit).map((r) => r.story);
}
