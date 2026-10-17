import { now as clockNow } from "@/lib/clock";

const WINDOW_MS = 60_000;

const LIMIT = 60;

const MAX_TRACKED_KEYS = 10_000;

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// The function middleware that rejects a call cannot set response headers, so
// it leaves the computed wait here for the request middleware to send.
const retryAfter = new WeakMap<Request, number>();

export function rememberRetryAfter(request: Request, seconds: number) {
  retryAfter.set(request, seconds);
}

export function retryAfterFor(request: Request) {
  return retryAfter.get(request);
}

function prune(now: number) {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }

  while (windows.size >= MAX_TRACKED_KEYS) {
    const oldest = windows.keys().next().value;

    if (oldest === undefined) break;
    windows.delete(oldest);
  }
}

export type RateLimitVerdict =
  { ok: true } | { ok: false; retryAfterSeconds: number };

export function consumeRateLimit(
  key: string,
  limit = LIMIT,
  windowMs = WINDOW_MS,
): RateLimitVerdict {
  const now = clockNow().getTime();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_KEYS) prune(now);
    windows.set(key, { count: 1, resetAt: now + windowMs });

    return { ok: true };
  }

  current.count += 1;

  if (current.count <= limit) return { ok: true };

  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
  };
}
