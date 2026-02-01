import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function rateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipPaths?: string[];
}) {
  const { windowMs, maxRequests, keyGenerator, skipPaths = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const key = keyGenerator 
      ? keyGenerator(req) 
      : (req as any).user?.claims?.sub || req.ip || "anonymous";
    
    const now = Date.now();
    
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > maxRequests) {
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", store[key].resetTime);
      res.setHeader("Retry-After", Math.ceil((store[key].resetTime - now) / 1000));
      
      return res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      });
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", maxRequests - store[key].count);
    res.setHeader("X-RateLimit-Reset", store[key].resetTime);

    next();
  };
}

export function aiRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    skipPaths: ["/api/email-tracking"],
  });
}

export function generalRateLimiter() {
  return rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    skipPaths: ["/api/email-tracking/open", "/api/email-tracking/click"],
  });
}

setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60 * 1000);
