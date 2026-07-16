import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  ApplicationPackage,
  ApplicationRecord,
  ApplicationStatus,
} from "../types";

/**
 * File-based CRM store (JSON).
 *
 * The brief specifies SQLite, but this repo has no SQLite dependency and a
 * flat JSON store keeps V1 zero-dependency and fully runnable in any
 * environment. The interface below is the seam: swapping in better-sqlite3 or
 * Prisma later means reimplementing this class only.
 */
export class CrmStore {
  private file: string;

  constructor(file = path.join(process.cwd(), "job-agent", "data", "crm.json")) {
    this.file = file;
  }

  private async readAll(): Promise<ApplicationRecord[]> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      return JSON.parse(raw) as ApplicationRecord[];
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  private async writeAll(records: ApplicationRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(records, null, 2), "utf8");
  }

  /** Insert (or update if the job already exists) from a prepared package. */
  async upsertFromPackage(pkg: ApplicationPackage): Promise<ApplicationRecord> {
    const records = await this.readAll();
    const now = new Date().toISOString();
    const existing = records.find((r) => r.jobId === pkg.job.id);

    if (existing) {
      existing.fitScore = pkg.fit.total;
      existing.decision = pkg.decision;
      existing.resumeVariant = pkg.selectedResume?.id ?? null;
      existing.updatedAt = now;
      await this.writeAll(records);
      return existing;
    }

    const record: ApplicationRecord = {
      id: `app_${pkg.job.id}`,
      jobId: pkg.job.id,
      company: pkg.job.company,
      title: pkg.job.title,
      url: pkg.job.url,
      status: "queued",
      fitScore: pkg.fit.total,
      decision: pkg.decision,
      resumeVariant: pkg.selectedResume?.id ?? null,
      followUpsSent: 0,
      notes: [],
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  async setStatus(
    jobId: string,
    status: ApplicationStatus,
    note?: string,
  ): Promise<void> {
    const records = await this.readAll();
    const rec = records.find((r) => r.jobId === jobId);
    if (!rec) throw new Error(`No CRM record for jobId ${jobId}`);
    rec.status = status;
    rec.updatedAt = new Date().toISOString();
    if (status === "applied" && !rec.appliedAt) {
      rec.appliedAt = rec.updatedAt;
    }
    if (note) rec.notes.push(note);
    await this.writeAll(records);
  }

  async all(): Promise<ApplicationRecord[]> {
    return this.readAll();
  }

  /** Funnel counts for the daily/weekly reporter. */
  async funnel(): Promise<Record<ApplicationStatus | "total", number>> {
    const records = await this.readAll();
    const base = {
      total: records.length,
      queued: 0,
      applied: 0,
      interviewing: 0,
      rejected: 0,
      ghosted: 0,
      offer: 0,
    };
    for (const r of records) base[r.status]++;
    return base;
  }
}
