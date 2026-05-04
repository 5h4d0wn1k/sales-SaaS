import { Context, Next } from "hono";

const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [process.env.FRONTEND_URL].filter(Boolean)
  : ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"];

export async function corsMiddleware(c: Context, next: Next): Promise<Response | void> {
  const origin = c.req.header("Origin");
  
  // Handle preflight requests
  if (c.req.method === "OPTIONS") {
    if (origin && allowedOrigins.includes(origin)) {
      c.res.headers.set("Access-Control-Allow-Origin", origin);
      c.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      c.res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      c.res.headers.set("Access-Control-Allow-Credentials", "true");
      c.res.headers.set("Access-Control-Max-Age", "86400");
    }
    return c.text("", 200);
  }

  // For actual requests, set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
    c.res.headers.set("Access-Control-Expose-Headers", "Content-Length, X-Content-Type-Options");
  }

  // Pass through to next middleware/route
  return next();
}
