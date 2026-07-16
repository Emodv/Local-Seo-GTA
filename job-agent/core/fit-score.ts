import type {
  CandidateProfile,
  EnrichedJob,
  FitScore,
} from "../types";
import { clamp, countMatches, normalize } from "./text";

/**
 * Fit score out of 100. Weights (from the brief):
 *   Role title 25 | Industry 15 | Salary 20 | Experience 15 |
 *   Tech stack 10 | Company quality 10 | Location 5
 *
 * Weights are passed in so the Weekly Learning agent can tune them over time
 * without touching this function.
 */
export const DEFAULT_WEIGHTS = {
  roleTitle: 25,
  industry: 15,
  salary: 20,
  experience: 15,
  techStack: 10,
  companyQuality: 10,
  location: 5,
} as const;

export type FitWeights = Record<keyof typeof DEFAULT_WEIGHTS, number>;

export function scoreFit(
  job: EnrichedJob,
  profile: CandidateProfile,
  weights: FitWeights = DEFAULT_WEIGHTS,
): FitScore {
  const notes: string[] = [];
  const title = normalize(job.title);
  const haystack = `${job.title} ${job.description} ${(job.requirements ?? []).join(" ")}`;

  // --- Role title (/25): exact target-title hit = full; marketing+leadership = partial.
  let roleTitle = 0;
  if (profile.targetTitles.some((t) => title.includes(t))) {
    roleTitle = weights.roleTitle;
  } else if (/marketing|growth|demand|brand/.test(title)) {
    roleTitle = Math.round(weights.roleTitle * 0.5);
    notes.push("Title related but not an exact target match");
  }

  // --- Industry (/15): preferred-industry keyword present in company/JD.
  const industryHits = countMatches(
    `${job.company_intel?.industry ?? ""} ${haystack}`,
    profile.preferredIndustries,
  );
  const industry =
    industryHits.length > 0 ? weights.industry : Math.round(weights.industry * 0.3);
  if (industryHits.length === 0) notes.push("No preferred-industry signal");

  // --- Salary (/20): >= target full, scaled down below target, 0 if unknown-and-low.
  let salary = 0;
  const sal = job.effectiveSalaryCad;
  if (sal == null) {
    salary = Math.round(weights.salary * 0.5);
    notes.push("Salary unknown — neutral half score");
  } else if (sal >= profile.targetSalaryCad) {
    salary = weights.salary;
  } else {
    salary = Math.round(weights.salary * clamp(sal / profile.targetSalaryCad, 0, 1));
  }

  // --- Experience (/15): candidate meets/exceeds any stated "X+ years" requirement.
  let experience = weights.experience;
  const yearsReq = /([0-9]{1,2})\s*\+?\s*years/.exec(normalize(haystack));
  if (yearsReq) {
    const required = Number(yearsReq[1]);
    experience =
      profile.yearsExperience >= required
        ? weights.experience
        : Math.round(weights.experience * clamp(profile.yearsExperience / required, 0, 1));
    if (profile.yearsExperience < required) {
      notes.push(`Requires ${required}y, candidate has ${profile.yearsExperience}y`);
    }
  }

  // --- Tech stack (/10): proportion of candidate skills that appear in the JD.
  const matchedSkills = countMatches(haystack, profile.skills);
  const techStack = Math.round(
    weights.techStack * clamp(matchedSkills.length / 6, 0, 1),
  );

  // --- Company quality (/10): Glassdoor + funding signals; neutral when unknown.
  let companyQuality = Math.round(weights.companyQuality * 0.6);
  const intel = job.company_intel;
  if (intel?.glassdoorRating != null) {
    companyQuality = Math.round(
      weights.companyQuality * clamp(intel.glassdoorRating / 5, 0, 1),
    );
  }

  // --- Location (/5): remote or in-region = full.
  const loc = normalize(job.location);
  const location =
    job.remote || /canada|ontario|toronto|\bon\b|remote|gta/.test(loc)
      ? weights.location
      : 0;

  const breakdown = {
    roleTitle,
    industry,
    salary,
    experience,
    techStack,
    companyQuality,
    location,
  };
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  return { total, breakdown, matchedSkills, notes };
}
