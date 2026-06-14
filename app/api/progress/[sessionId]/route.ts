import { NextRequest } from "next/server";
import { registerProgressHandler, unregisterProgressHandler } from "@/lib/progress";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  // Verify session exists
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (message: string, type = "info") => {
        const data = JSON.stringify({ message, type, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        if (type === "done") {
          try {
            controller.close();
          } catch {}
        }
      };

      registerProgressHandler(sessionId, send);

      // If session already completed, send done immediately
      if (session.status === "completed" || session.status === "failed") {
        send(
          session.status === "completed"
            ? "SEO automation already completed"
            : "Session failed",
          session.status === "completed" ? "success" : "error"
        );
        send("DONE", "done");
        unregisterProgressHandler(sessionId, send);
        return;
      }

      // Cleanup on close
      const cleanup = () => {
        unregisterProgressHandler(sessionId, send);
        try {
          controller.close();
        } catch {}
      };

      // Auto-cleanup after 10 minutes
      const timeout = setTimeout(cleanup, 600000);

      return () => {
        clearTimeout(timeout);
        unregisterProgressHandler(sessionId, send);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
