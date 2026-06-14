import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      directorySubmissions: { orderBy: { createdAt: "asc" } },
      guestPosts: { orderBy: { createdAt: "asc" } },
      classifiedAds: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...session,
    semrushData: session.semrushData ?? null,
    googlePlacesData: session.googlePlacesData ?? null,
  });
}
