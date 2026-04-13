// In-memory sliding window rate limiter.
// Resets on cold-start; suitable for Vercel serverless (per-instance).
// For multi-region production, swap the store for Upstash Redis.

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()

interface RateLimitOptions {
  windowMs: number
  max: number
}

export function rateLimit(key: string, options: RateLimitOptions): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const existing = store.get(key)

  if (!existing || now > existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    return { allowed: true, remaining: options.max - 1 }
  }

  if (existing.count >= options.max) {
    return { allowed: false, remaining: 0 }
  }

  existing.count++
  return { allowed: true, remaining: options.max - existing.count }
}

// Clean up expired entries periodically to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    store.forEach((win, key) => {
      if (now > win.resetAt) store.delete(key)
    })
  }, 60_000)
}
