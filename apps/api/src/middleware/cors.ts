import { Context, Next } from "hono";
import { getAllowedFrontendOrigins } from "../frontend-origin";

export async function corsMiddleware(c: Context, next: Next): Promise<Response | void> {
  const origin = c.req.header("Origin");
  const allowedOrigins = getAllowedFrontendOrigins();
  
  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    if (origin && allowedOrigins.has(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Vary", "Origin");
      c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }
    return c.text("", 200);
  }

  // For actual requests, set CORS headers if origin is allowed
  if (origin && allowedOrigins.has(origin)) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Vary", "Origin");
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
    c.res.headers.set("Access-Control-Expose-Headers", "Content-Length, X-Content-Type-Options");
  }

  // Pass through to next middleware/route
  return next();
}
