export function applyRateLimitHeaders(
  headers: Headers,
  input: {
    limit: number;
    remaining: number;
    resetAt: number;
    now?: number;
  },
) {
  const now = input.now ?? Date.now();
  const retryAfterSeconds = Math.max(1, Math.ceil((input.resetAt - now) / 1000));
  const resetEpochSeconds = Math.ceil(input.resetAt / 1000);

  headers.set("RateLimit-Limit", String(input.limit));
  headers.set("RateLimit-Remaining", String(input.remaining));
  headers.set("RateLimit-Reset", String(retryAfterSeconds));
  headers.set("X-RateLimit-Limit", String(input.limit));
  headers.set("X-RateLimit-Remaining", String(input.remaining));
  headers.set("X-RateLimit-Reset", String(resetEpochSeconds));

  return retryAfterSeconds;
}
