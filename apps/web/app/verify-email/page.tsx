import Link from "next/link";
import type { Metadata } from "next";
import { getServerApiBaseUrl } from "@/lib/server-api-auth";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify the email address connected to your Winrate account.",
  robots: {
    index: false,
    follow: false,
  },
};

type VerifyEmailPageProps = {
  searchParams?: Promise<{
    email?: string;
    token?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const email = params?.email?.trim() ?? "";
  const token = params?.token?.trim() ?? "";

  let state: "idle" | "success" | "already" | "error" = "idle";
  let message =
    "Open the verification link from your inbox to confirm the email on this account.";

  if (email && token) {
    try {
      const response = await fetch(`${getServerApiBaseUrl()}/v1/auth/verify-email/confirm`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, token }),
        cache: "no-store",
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          alreadyVerified?: boolean;
        };
        state = payload.alreadyVerified ? "already" : "success";
        message = payload.alreadyVerified
          ? "This email was already verified. You can continue into the app."
          : "Your email is now verified. Billing and live outbound actions are unlocked.";
      } else {
        state = "error";
        message =
          "This verification link is invalid or expired. Request a fresh verification email from the app.";
      }
    } catch (error) {
      console.error("Verify email page error:", error);
      state = "error";
      message =
        "We could not verify this email right now. Please retry in a moment or request a fresh link.";
    }
  }

  const toneClassName =
    state === "success" || state === "already"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : state === "error"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-white/90 text-slate-950";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_22%,#f8fafc_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-2xl">
        <div className={`rounded-[2rem] border p-8 shadow-xl shadow-slate-200/50 ${toneClassName}`}>
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Account verification
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {state === "success"
              ? "Email verified"
              : state === "already"
                ? "Already verified"
                : state === "error"
                  ? "Verification link expired"
                  : "Verify your email"}
          </h1>
          <p className="mt-4 text-sm leading-7 md:text-base">{message}</p>

          {email ? (
            <p className="mt-4 text-sm font-medium text-slate-700">
              Account email: <span className="text-slate-950">{email}</span>
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/get-started"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue to sign in
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Open dashboard
            </Link>
          </div>

          {email ? (
            <form action="/api/auth/verify-email/request" method="post" className="mt-6">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="returnTo" value={`/verify-email?email=${encodeURIComponent(email)}`} />
              <button
                type="submit"
                className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-950"
              >
                Send a fresh verification email
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  );
}
