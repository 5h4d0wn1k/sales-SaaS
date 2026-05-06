import { Hono } from "hono";
import { Context } from "hono";
import { db, users } from "@sales/database";
import { eq } from "drizzle-orm";
import * as bcryptModule from "bcryptjs";
import {
  authLifecycleRequestResponseSchema,
  confirmPasswordResetInputSchema,
  confirmEmailVerificationInputSchema,
  emailVerificationConfirmResponseSchema,
  passwordResetConfirmResponseSchema,
  requestEmailVerificationInputSchema,
  requestPasswordResetInputSchema,
} from "@sales/shared";
import { z } from "zod";
import {
  consumeEmailVerification,
  consumePasswordReset,
  findLifecycleUserByEmail,
  issueEmailVerification,
  issuePasswordReset,
} from "../auth-lifecycle";

export const authRoutes = new Hono<{ Bindings: any }>();
const bcrypt = "default" in bcryptModule ? bcryptModule.default : bcryptModule;
const { hash } = bcrypt;

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
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashedPassword,
        displayName: name,
        role: "owner",
        emailVerified: null,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        emailVerified: users.emailVerified,
      });
    let delivery: { mode: "email" | "preview" | "unavailable"; previewUrl?: string } | undefined;

    try {
      const issued = await issueEmailVerification({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
      });
      delivery = issued.delivery;
    } catch (deliveryError) {
      console.error("Failed to send verification email after registration:", deliveryError);
      delivery = { mode: "unavailable" };
    }

    return c.json(
      authLifecycleRequestResponseSchema.parse({
        ok: true,
        email,
        requiresEmailVerification: true,
        delivery,
      }),
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

authRoutes.post("/verify-email/request", async (c: Context) => {
  try {
    const payload = requestEmailVerificationInputSchema.parse(await c.req.json().catch(() => ({})));
    if (!payload.email) {
      return c.json({ error: "Email address is required" }, { status: 400 });
    }

    const user = await findLifecycleUserByEmail(payload.email);

    if (!user || user.emailVerified) {
      return c.json(
        authLifecycleRequestResponseSchema.parse({
          ok: true,
          email: payload.email,
          requiresEmailVerification: !user?.emailVerified,
        }),
      );
    }

    let delivery: { mode: "email" | "preview" | "unavailable"; previewUrl?: string } | undefined;

    try {
      const issued = await issueEmailVerification(user);
      delivery = issued.delivery;
    } catch (deliveryError) {
      console.error("Failed to resend verification email:", deliveryError);
      delivery = { mode: "unavailable" };
    }

    return c.json(
      authLifecycleRequestResponseSchema.parse({
        ok: true,
        email: payload.email,
        requiresEmailVerification: true,
        delivery,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return c.json(
        { error: issue?.message ?? "Invalid verification request payload" },
        { status: 400 },
      );
    }

    console.error("Verification request error:", error);
    return c.json({ error: "Failed to process verification request" }, { status: 500 });
  }
});

authRoutes.post("/verify-email/confirm", async (c: Context) => {
  try {
    const payload = confirmEmailVerificationInputSchema.parse(await c.req.json());
    const result = await consumeEmailVerification(payload.email, payload.token);

    if (!result.ok) {
      return c.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    return c.json(
      emailVerificationConfirmResponseSchema.parse({
        ok: true,
        verified: true,
        alreadyVerified: result.alreadyVerified,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return c.json(
        { error: issue?.message ?? "Invalid verification confirmation payload" },
        { status: 400 },
      );
    }

    console.error("Verification confirm error:", error);
    return c.json({ error: "Failed to verify email" }, { status: 500 });
  }
});

authRoutes.post("/password-reset/request", async (c: Context) => {
  try {
    const payload = requestPasswordResetInputSchema.parse(await c.req.json());
    const user = await findLifecycleUserByEmail(payload.email);
    let delivery: { mode: "email" | "preview" | "unavailable"; previewUrl?: string } | undefined;

    if (user) {
      try {
        const issued = await issuePasswordReset(user);
        delivery = issued.delivery;
      } catch (deliveryError) {
        console.error("Failed to send password reset email:", deliveryError);
        delivery = { mode: "unavailable" };
      }
    }

    return c.json(
      authLifecycleRequestResponseSchema.parse({
        ok: true,
        email: payload.email,
        delivery,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return c.json(
        { error: issue?.message ?? "Invalid password reset request payload" },
        { status: 400 },
      );
    }

    console.error("Password reset request error:", error);
    return c.json({ error: "Failed to process password reset request" }, { status: 500 });
  }
});

authRoutes.post("/password-reset/confirm", async (c: Context) => {
  try {
    const payload = confirmPasswordResetInputSchema.parse(await c.req.json());
    const passwordHash = await hash(payload.password, 12);
    const result = await consumePasswordReset({
      email: payload.email,
      token: payload.token,
      passwordHash,
    });

    if (!result.ok) {
      return c.json({ error: "Invalid or expired password reset link" }, { status: 400 });
    }

    return c.json(
      passwordResetConfirmResponseSchema.parse({
        ok: true,
        reset: true,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      return c.json(
        { error: issue?.message ?? "Invalid password reset confirmation payload" },
        { status: 400 },
      );
    }

    console.error("Password reset confirm error:", error);
    return c.json({ error: "Failed to reset password" }, { status: 500 });
  }
});

// Health check for auth routes
authRoutes.get("/health", (c) => {
  return c.json({ status: "ok", service: "auth" });
});
