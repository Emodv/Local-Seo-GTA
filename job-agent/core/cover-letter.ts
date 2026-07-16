import type {
  BragStory,
  CandidateProfile,
  EnrichedJob,
} from "../types";

/**
 * Cover-letter generator.
 *
 * Prefers the Anthropic API when ANTHROPIC_API_KEY is set, but always falls
 * back to a deterministic template so the pipeline is fully runnable (and
 * testable) offline. Output is capped at ~300 words and never invents facts —
 * it only recombines the candidate profile and selected brag stories.
 */

const MAX_WORDS = 300;

function trimToWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  return words.slice(0, max).join(" ") + "…";
}

/** Deterministic, no-network cover letter. */
export function templateCoverLetter(
  job: EnrichedJob,
  profile: CandidateProfile,
  stories: BragStory[],
): string {
  const proof = stories.slice(0, 3).map((s) => s.headline);
  const proofLine =
    proof.length > 0
      ? proof.map((p) => `• ${p}`).join("\n")
      : "• 15+ years leading demand generation and revenue growth.";

  const body = `Dear ${job.company} Hiring Team,

I'm applying for the ${job.title} role. With 15+ years building high-performance demand generation and growth engines, I lead teams that turn marketing into a measurable revenue driver — exactly the mandate this role calls for.

A few results I'd bring to ${job.company}:
${proofLine}

I pair hands-on channel expertise (Google Ads, Meta/LinkedIn, programmatic, SEO/SEM) with a modern MarTech and AI-automation stack (HubSpot, Salesforce, GA4, and OpenAI/Claude/Gemini workflows). I'm a Canadian citizen based in Toronto, open to remote or hybrid, and require no sponsorship.

I'd welcome a short conversation about how I can accelerate ${job.company}'s growth. You can grab time directly at ${profile.calendarLink}.

Best regards,
${profile.name}
${profile.phone} | ${profile.email}`;

  return trimToWords(body, MAX_WORDS);
}

/**
 * Generate a cover letter, using Anthropic when available. `deps` is injectable
 * so tests can run without importing the SDK or hitting the network.
 */
export async function generateCoverLetter(
  job: EnrichedJob,
  profile: CandidateProfile,
  stories: BragStory[],
  deps: {
    apiKey?: string;
    // Injectable client factory; defaults to the real Anthropic SDK.
    createMessage?: (prompt: string, apiKey: string) => Promise<string>;
  } = {},
): Promise<string> {
  const apiKey = deps.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return templateCoverLetter(job, profile, stories);

  const prompt = buildPrompt(job, profile, stories);
  try {
    const send = deps.createMessage ?? defaultAnthropicSend;
    const text = await send(prompt, apiKey);
    return trimToWords(text, MAX_WORDS);
  } catch {
    // Never fail the pipeline on a generation error — fall back to template.
    return templateCoverLetter(job, profile, stories);
  }
}

export function buildPrompt(
  job: EnrichedJob,
  profile: CandidateProfile,
  stories: BragStory[],
): string {
  const proof = stories
    .map((s) => `- ${s.headline} (metrics: ${s.metrics.join(", ")})`)
    .join("\n");
  return [
    `Write a cover letter (max ${MAX_WORDS} words) for ${profile.name} applying to the "${job.title}" role at ${job.company}.`,
    `Rules: no fabrication — use ONLY the facts below. Company-specific, concise, confident, no generic fluff. End with a CTA to book time at ${profile.calendarLink}.`,
    ``,
    `Candidate: ${profile.headline}. ${profile.citizenshipNote}. Based in ${profile.location}.`,
    `Relevant proof points:`,
    proof,
    ``,
    `Job description (excerpt):`,
    job.description.slice(0, 1500),
  ].join("\n");
}

/** Real Anthropic call, isolated so the rest of the module stays SDK-free. */
async function defaultAnthropicSend(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find(
    (b: { type: string }) => b.type === "text",
  ) as { type: string; text?: string } | undefined;
  return block?.text ?? "";
}
