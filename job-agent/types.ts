/**
 * Core domain types for the Autonomous Job Application Agent (V1).
 *
 * Design notes:
 * - Everything here is pure data. No I/O, no side effects.
 * - The pipeline (search -> parse -> score -> select -> generate -> track)
 *   is expressed as functions over these types so each stage is unit-testable.
 */

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "fractional";

export type SeniorityLevel =
  | "ic" // individual contributor / non-leadership -> auto-reject
  | "manager"
  | "senior"
  | "director"
  | "head"
  | "vp"
  | "cmo";

/** Raw-ish job as ingested from a source, before enrichment. */
export interface JobPosting {
  id: string;
  source: string; // "greenhouse" | "lever" | "ashby" | "remoteok" | "manual" | ...
  url: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  description: string;
  employmentType?: EmploymentType;
  /** Posted date as ISO string, if known. */
  postedAt?: string;
  /** Salary as posted, if present (annual CAD unless otherwise noted in text). */
  salaryMinCad?: number;
  salaryMaxCad?: number;
  /** Free-form requirements bullets, if the source separates them. */
  requirements?: string[];
}

/** A job after enrichment (salary estimate, seniority classification, company intel). */
export interface EnrichedJob extends JobPosting {
  seniority: SeniorityLevel;
  /** Estimated salary when not posted; null if we couldn't estimate. */
  estimatedSalaryCad: number | null;
  /** The salary figure used for scoring (posted min, else estimate). */
  effectiveSalaryCad: number | null;
  company_intel?: CompanyIntel;
}

export interface CompanyIntel {
  name: string;
  glassdoorRating?: number; // 0-5
  employeeCount?: number;
  fundingStage?: string;
  recentLayoffs?: boolean;
  isMlmOrSuspect?: boolean;
  industry?: string;
  notes?: string;
}

export interface CandidateProfile {
  name: string;
  headline: string;
  location: string;
  yearsExperience: number;
  targetSalaryCad: number; // hard floor
  stretchSalaryCad: number;
  openTo: EmploymentType[];
  citizenshipNote: string;
  linkedin: string;
  calendarLink: string;
  phone: string;
  email: string;
  /** Skills / tech stack the candidate can claim. Lowercased for matching. */
  skills: string[];
  preferredIndustries: string[]; // lowercased
  targetTitles: string[]; // lowercased fragments used for title matching
}

/** A single achievement in the Brag Bank (STAR + metadata). */
export interface BragStory {
  id: string;
  situation: string;
  action: string;
  result: string;
  /** Short, punchy line usable directly in a cover letter / resume bullet. */
  headline: string;
  metrics: string[];
  technologies: string[]; // lowercased
  industries: string[]; // lowercased
}

/** A pre-built resume variant tuned to a vertical / role focus. */
export interface ResumeVariant {
  id: string; // e.g. "growth", "executive"
  file: string; // e.g. "resume-growth.pdf"
  label: string;
  /** Keywords that make this variant a strong match. Lowercased. */
  keywords: string[];
  /** Titles this variant is aimed at. Lowercased fragments. */
  titles: string[];
}

/** Result of running hard filters. */
export interface FilterResult {
  passed: boolean;
  rejections: string[]; // human-readable reasons; empty when passed
}

/** Breakdown of the 0-100 fit score. */
export interface FitScore {
  total: number;
  breakdown: {
    roleTitle: number; // /25
    industry: number; // /15
    salary: number; // /20
    experience: number; // /15
    techStack: number; // /10
    companyQuality: number; // /10
    location: number; // /5
  };
  matchedSkills: string[];
  notes: string[];
}

export type ApplyDecision =
  | "auto-apply"
  | "approval-required"
  | "reject";

export type ApprovalMode = "manual" | "assisted" | "autonomous";

/** Full output of the pipeline for one job: everything a human needs to review. */
export interface ApplicationPackage {
  job: EnrichedJob;
  filter: FilterResult;
  fit: FitScore;
  decision: ApplyDecision;
  selectedResume: ResumeVariant | null;
  selectedBragStories: BragStory[];
  coverLetter: string | null;
  /** Resume confidence 0-100 (keyword overlap of chosen variant vs JD). */
  resumeConfidence: number;
  createdAt: string;
}

export type ApplicationStatus =
  | "queued" // package prepared, awaiting human action
  | "applied"
  | "interviewing"
  | "rejected"
  | "ghosted"
  | "offer";

/** CRM record persisted by the tracker. */
export interface ApplicationRecord {
  id: string;
  jobId: string;
  company: string;
  title: string;
  url: string;
  status: ApplicationStatus;
  fitScore: number;
  decision: ApplyDecision;
  resumeVariant: string | null;
  recruiter?: string;
  hiringManager?: string;
  appliedAt?: string;
  followUpsSent: number;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}
