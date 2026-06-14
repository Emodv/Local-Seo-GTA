type ProgressHandler = (message: string, type?: string) => void;

const handlers = new Map<string, ProgressHandler[]>();

export function registerProgressHandler(sessionId: string, handler: ProgressHandler) {
  if (!handlers.has(sessionId)) {
    handlers.set(sessionId, []);
  }
  handlers.get(sessionId)!.push(handler);
}

export function unregisterProgressHandler(sessionId: string, handler: ProgressHandler) {
  const existing = handlers.get(sessionId);
  if (existing) {
    const filtered = existing.filter((h) => h !== handler);
    if (filtered.length === 0) {
      handlers.delete(sessionId);
    } else {
      handlers.set(sessionId, filtered);
    }
  }
}

export function emitProgress(sessionId: string, message: string, type = "info") {
  const existing = handlers.get(sessionId);
  if (existing) {
    for (const handler of existing) {
      handler(message, type);
    }
  }
}
