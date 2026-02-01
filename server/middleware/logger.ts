import type { Request, Response, NextFunction } from "express";

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  userId?: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  error?: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const duration = Date.now() - startTime;
      const userId = (req as any).user?.claims?.sub;

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers["user-agent"],
      };

      if (res.statusCode >= 400) {
        console.error(`[ERROR] ${entry.method} ${entry.path} - ${entry.statusCode} (${duration}ms)`);
      } else if (duration > 1000) {
        console.warn(`[SLOW] ${entry.method} ${entry.path} - ${entry.statusCode} (${duration}ms)`);
      }

      logs.push(entry);
      if (logs.length > MAX_LOGS) {
        logs.shift();
      }

      return originalEnd.call(res, chunk, encoding, cb);
    };

    next();
  };
}

export function getRecentLogs(count: number = 100): LogEntry[] {
  return logs.slice(-count);
}

export function getErrorLogs(): LogEntry[] {
  return logs.filter(l => l.statusCode >= 400);
}

export function getSlowRequests(thresholdMs: number = 1000): LogEntry[] {
  return logs.filter(l => l.duration > thresholdMs);
}

export function getMetrics() {
  const totalRequests = logs.length;
  const errorRequests = logs.filter(l => l.statusCode >= 400).length;
  const avgDuration = logs.length > 0 
    ? logs.reduce((sum, l) => sum + l.duration, 0) / logs.length 
    : 0;

  const pathCounts: Record<string, number> = {};
  logs.forEach(l => {
    const basePath = l.path.split("/").slice(0, 4).join("/");
    pathCounts[basePath] = (pathCounts[basePath] || 0) + 1;
  });

  return {
    totalRequests,
    errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
    avgDuration: Math.round(avgDuration),
    topPaths: Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count })),
  };
}
