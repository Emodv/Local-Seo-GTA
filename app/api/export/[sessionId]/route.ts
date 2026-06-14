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
      directorySubmissions: true,
      guestPosts: true,
      classifiedAds: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const rows: string[] = [
    "Type,Name/Platform,URL,Status,Notes",
  ];

  for (const d of session.directorySubmissions) {
    rows.push(
      `Directory,"${d.directoryName}","${d.submittedUrl || d.manualUrl || d.directoryUrl}","${d.status}","${(d.error || "").replace(/"/g, "'")}"`
    );
  }
  for (const g of session.guestPosts) {
    rows.push(
      `Guest Post,"${g.platform}","${g.postUrl || ""}","${g.status}","${(g.error || "").replace(/"/g, "'").slice(0, 100)}"`
    );
  }
  for (const a of session.classifiedAds) {
    rows.push(
      `Classified Ad,"${a.platform}","${a.adUrl || ""}","${a.status}","${(a.error || "").replace(/"/g, "'").slice(0, 100)}"`
    );
  }

  const csv = rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="seo-results-${sessionId}.csv"`,
    },
  });
}
