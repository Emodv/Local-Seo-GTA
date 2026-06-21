import { prisma } from "@/lib/db";

export function emitProgress(sessionId: string, message: string, type = "info") {
  prisma.progressEvent
    .create({ data: { sessionId, message, type } })
    .catch((err) => console.error("emitProgress failed:", err));
}
