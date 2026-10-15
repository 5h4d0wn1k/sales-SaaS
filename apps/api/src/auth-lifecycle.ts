import crypto from "crypto";
import { Resend } from "resend";
import { and, eq } from "drizzle-orm";
import { db, sessions, users, verificationTokens } from "@sales/database";

type LifecycleTokenKind = "verify-email" | "password-reset";

type LifecycleUser = {
  id: string;
  email: string;
  displayName?: string | null;
  emailVerified?: Date | null;
  passwordHash?: string | null;
};

export type LifecycleEmailDelivery = {
  mode: "email" | "preview" | "unavailable";
  previewUrl?: string;
};

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildLifecycleIdentifier(kind: LifecycleTokenKind, userId: string) {
  return `${kind}:${userId}`;
}

function hashLifecycleToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateLifecycleToken() {
  return crypto.randomBytes(24).toString("hex");
}

function buildFrontendUrl(pathname: string, params: Record<string, string>) {
  const baseUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const url = new URL(pathname, baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function isLifecycleEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL &&
      (process.env.NODE_ENV !== "production" || process.env.FRONTEND_URL),
  );
}

function safeHeaderText(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

async function deliverLifecycleEmail({
  to,
  subject,
  previewUrl,
  html,
  text,
}: {
  to: string;
  subject: string;
  previewUrl: string;
  html: string;
  text: string;
}): Promise<LifecycleEmailDelivery> {
  if (!isLifecycleEmailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Lifecycle email delivery is unavailable: missing Resend or FRONTEND_URL configuration.",
      );
      return { mode: "unavailable" };
    }

    return { mode: "preview", previewUrl };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: safeHeaderText(subject),
    html,
    text,
  });

  return { mode: "email" };
}

async function createLifecycleToken({
  userId,
  kind,
  ttlMs,
}: {
  userId: string;
  kind: LifecycleTokenKind;
  ttlMs: number;
}) {
  const rawToken = generateLifecycleToken();
  const hashedToken = hashLifecycleToken(rawToken);
  const identifier = buildLifecycleIdentifier(kind, userId);
  const expiresAt = new Date(Date.now() + ttlMs);

  await db.transaction(async (tx) => {
    await tx
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, identifier));

    await tx.insert(verificationTokens).values({
      identifier,
      token: hashedToken,
      expires: expiresAt,
    });
  });

  return {
    rawToken,
    expiresAt,
  };
}

async function consumeLifecycleToken({
  userId,
  kind,
  token,
}: {
  userId: string;
  kind: LifecycleTokenKind;
  token: string;
}) {
  const identifier = buildLifecycleIdentifier(kind, userId);
  const hashedToken = hashLifecycleToken(token);
  const [record] = await db
    .select({
      identifier: verificationTokens.identifier,
      token: verificationTokens.token,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, hashedToken),
      ),
    )
    .limit(1);

  if (!record) {
    return { ok: false as const, reason: "invalid" as const };
  }

  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, hashedToken),
      ),
    );

  if (record.expires.getTime() < Date.now()) {
    return { ok: false as const, reason: "expired" as const };
  }

  return { ok: true as const };
}

export async function findLifecycleUserByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      emailVerified: users.emailVerified,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return user ?? null;
}

export async function issueEmailVerification(user: LifecycleUser) {
  const normalizedEmail = normalizeEmail(user.email);
  const { rawToken } = await createLifecycleToken({
    userId: user.id,
    kind: "verify-email",
    ttlMs: EMAIL_VERIFICATION_TTL_MS,
  });
  const previewUrl = buildFrontendUrl("/verify-email", {
    email: normalizedEmail,
    token: rawToken,
  });

  const subject = "Verify your Winrate account";
  const text =
    `Verify your email to unlock billing and live outbound actions.\n\n` +
    `Open this link: ${previewUrl}\n\n` +
    `If you did not create this account, you can ignore this email.`;
  const html =
    `<p>Verify your email to unlock billing and live outbound actions.</p>` +
    `<p><a href="${previewUrl}">Verify your email</a></p>` +
    `<p>If you did not create this account, you can ignore this email.</p>`;

  const delivery = await deliverLifecycleEmail({
    to: normalizedEmail,
    subject,
    previewUrl,
    text,
    html,
  });

  return {
    email: normalizedEmail,
    delivery,
  };
}

export async function issuePasswordReset(user: LifecycleUser) {
  const normalizedEmail = normalizeEmail(user.email);
  const { rawToken } = await createLifecycleToken({
    userId: user.id,
    kind: "password-reset",
    ttlMs: PASSWORD_RESET_TTL_MS,
  });
  const previewUrl = buildFrontendUrl("/reset-password", {
    email: normalizedEmail,
    token: rawToken,
  });

  const subject = "Reset your Winrate password";
  const text =
    `Reset the password for your Winrate account.\n\n` +
    `Open this link: ${previewUrl}\n\n` +
    `If you did not request this reset, you can ignore this email.`;
  const html =
    `<p>Reset the password for your Winrate account.</p>` +
    `<p><a href="${previewUrl}">Reset password</a></p>` +
    `<p>If you did not request this reset, you can ignore this email.</p>`;

  const delivery = await deliverLifecycleEmail({
    to: normalizedEmail,
    subject,
    previewUrl,
    text,
    html,
  });

  return {
    email: normalizedEmail,
    delivery,
  };
}

export async function consumeEmailVerification(email: string, token: string) {
  const user = await findLifecycleUserByEmail(email);
  if (!user) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (user.emailVerified) {
    return {
      ok: true as const,
      verified: true,
      alreadyVerified: true,
    };
  }

  const tokenResult = await consumeLifecycleToken({
    userId: user.id,
    kind: "verify-email",
    token,
  });

  if (!tokenResult.ok) {
    return tokenResult;
  }

  await db
    .update(users)
    .set({
      emailVerified: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    ok: true as const,
    verified: true,
    alreadyVerified: false,
  };
}

export async function consumePasswordReset({
  email,
  token,
  passwordHash,
}: {
  email: string;
  token: string;
  passwordHash: string;
}) {
  const user = await findLifecycleUserByEmail(email);
  if (!user) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const tokenResult = await consumeLifecycleToken({
    userId: user.id,
    kind: "password-reset",
    token,
  });

  if (!tokenResult.ok) {
    return tokenResult;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        emailVerified: user.emailVerified ?? now,
        sessionInvalidBefore: now,
      })
      .where(eq(users.id, user.id));

    await tx.delete(sessions).where(eq(sessions.userId, user.id));
  });

  return {
    ok: true as const,
    reset: true,
  };
}
