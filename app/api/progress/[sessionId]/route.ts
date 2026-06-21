import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const POLL_INTERVAL_MS = 1000;
const MAX_STREAM_MS = 280_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: string, type: string) => {
        const data = JSON.stringify({ message, type, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      let lastId = 0;
      let done = false;

      while (!done) {
        const events = await prisma.progressEvent.findMany({
          where: { sessionId, id: { gt: lastId } },
          orderBy: { id: "asc" },
        });

        for (const ev of events) {
          send(ev.message, ev.type);
          lastId = ev.id;
          if (ev.type === "done") {
            done = true;
            break;
          }
        }

        if (done) break;

        if (Date.now() - startedAt > MAX_STREAM_MS) {
          send("Timed out waiting for completion", "error");
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      try {
        controller.close();
      } catch {}
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
