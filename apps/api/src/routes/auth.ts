import { Hono } from "hono";
import { Context } from "hono";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";

export const authRoutes = new Hono<{ Bindings: any }>();

const registrationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120),
});

// Public registration endpoint
authRoutes.post("/register", async (c: Context) => {
  try {
    const payload = await c.req.json();
    const { email, password, name } = registrationSchema.parse(payload);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json(
        { error: "User already exists with this email" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user
    await db
      .insert(users)
      .values({
        email,
        passwordHash: hashedPassword,
        displayName: name,
        role: "owner",
      });

    return c.json(
      { message: "User created successfully", email },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return c.json(
        { error: issue?.message ?? "Invalid registration payload" },
        { status: 400 }
      );
    }

    console.error("Registration error:", error);
    return c.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
});

// Health check for auth routes
authRoutes.get("/health", (c) => {
  return c.json({ status: "ok", service: "auth" });
});
