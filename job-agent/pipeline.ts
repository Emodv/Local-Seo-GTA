import { BRAG_BANK } from "./candidate/brag-bank";
import { EMOD_VAFA } from "./candidate/profile";
import { RESUME_VARIANTS } from "./candidate/resume-variants";
import { generateCoverLetter } from "./core/cover-letter";
import { decide } from "./core/decision";
import { enrichJob } from "./core/enrich";
import { applyHardFilters } from "./core/filters";
import { DEFAULT_WEIGHTS, scoreFit, type FitWeights } from "./core/fit-score";
import { tailorResume } from "./core/resume-tailor";
import { selectBragStories, selectResume } from "./core/selectors";
import type {
  ApplicationPackage,
  ApprovalMode,
  BragStory,
  CandidateProfile,
  CompanyIntel,
  JobPosting,
  ResumeVariant,
} from "./types";

export interface PipelineConfig {
  profile?: CandidateProfile;
  variants?: ResumeVariant[];
  bragBank?: BragStory[];
  weights?: FitWeights;
  mode?: ApprovalMode;
  maxAgeDays?: number;
  intelLookup?: (company: string) => CompanyIntel | undefined;
  /** Force template cover letters (skip API) — handy for tests/demos. */
  offlineCoverLetter?: boolean;
}

/**
 * Run one job end-to-end: enrich -> filter -> score -> decide -> select ->
 * generate. Returns a full ApplicationPackage a human can review. Nothing is
 * ever submitted here.
 */
export async function processJob(
  raw: JobPosting,
  config: PipelineConfig = {},
): Promise<ApplicationPackage> {
  const profile = config.profile ?? EMOD_VAFA;
  const variants = config.variants ?? RESUME_VARIANTS;
  const bank = config.bragBank ?? BRAG_BANK;
  const weights = config.weights ?? DEFAULT_WEIGHTS;
  const mode = config.mode ?? "assisted"; // brief default

  const job = enrichJob(raw, config.intelLookup);
  const filter = applyHardFilters(job, profile, { maxAgeDays: config.maxAgeDays });
  const fit = scoreFit(job, profile, weights);
  const { variant, confidence } = selectResume(job, variants);
  const stories = selectBragStories(job, bank, 3);

  const decision = decide(fit, filter, job, profile, {
    mode,
    resumeConfidence: confidence,
    openQuestions: false,
  });

  // Only spend generation effort on jobs we'd actually pursue.
  let coverLetter: string | null = null;
  let tailoredResume = null;
  if (decision !== "reject") {
    coverLetter = await generateCoverLetter(job, profile, stories, {
      apiKey: config.offlineCoverLetter ? undefined : process.env.ANTHROPIC_API_KEY,
    });
    tailoredResume = tailorResume(job);
  }

  return {
    job,
    filter,
    fit,
    decision,
    selectedResume: decision === "reject" ? null : variant,
    selectedBragStories: decision === "reject" ? [] : stories,
    coverLetter,
    resumeConfidence: confidence,
    tailoredResume,
    createdAt: new Date().toISOString(),
  };
}

/** Process a batch, preserving input order. */
export async function processJobs(
  jobs: JobPosting[],
  config: PipelineConfig = {},
): Promise<ApplicationPackage[]> {
  const out: ApplicationPackage[] = [];
  for (const job of jobs) out.push(await processJob(job, config));
  return out;
}
