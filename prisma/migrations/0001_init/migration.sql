CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "businessName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "directory_submissions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "directoryName" TEXT NOT NULL,
    "directoryUrl" TEXT NOT NULL,
    "submittedUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "manualUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "directory_submissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "directory_submissions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "guest_posts" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postUrl" TEXT,
    "title" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guest_posts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "classified_ads" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "adUrl" TEXT,
    "title" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "classified_ads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "classified_ads_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
