import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Choose a new password for your Winrate account.",
  robots: {
    index: false,
    follow: false,
  },
};

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    email?: string;
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const email = params?.email?.trim() ?? "";
  const token = params?.token?.trim() ?? "";
  const hasRequiredParams = Boolean(email && token);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_22%,#f8fafc_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/50">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Account recovery
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
            This updates your credentials and signs out older sessions issued before the reset.
          </p>

          {!hasRequiredParams ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              This reset link is incomplete. Open the newest password reset email and try again.
            </div>
          ) : null}
          {params?.error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {params.error === "invalid"
                ? "This reset link is invalid or expired. Request a fresh password reset email."
                : "We could not reset the password just now. Please retry in a moment."}
            </div>
          ) : null}

          {hasRequiredParams ? (
            <form action="/api/auth/password-reset/confirm" method="post" className="mt-8 space-y-4">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="token" value={token} />

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Save new password
              </button>
            </form>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/forgot-password" className="font-semibold text-slate-700 underline underline-offset-4">
              Request another reset link
            </Link>
            <Link href="/get-started" className="font-semibold text-slate-700 underline underline-offset-4">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
