-- CreateTable
CREATE TABLE "progress_events" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_events_sessionId_id_idx" ON "progress_events"("sessionId", "id");
