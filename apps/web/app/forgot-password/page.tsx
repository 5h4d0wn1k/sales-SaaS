import Link from "next/link";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    sent?: string;
    error?: string;
    email?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const initialEmail = params?.email ?? "";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_22%,#f8fafc_100%)] px-6 py-16 text-slate-950">
      <div className="mx-auto max-w-xl">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/50">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Account recovery
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
            Enter the email tied to your account and we&apos;ll send a password reset link.
          </p>

          {params?.sent === "1" ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              If that account exists, a reset link is on the way.
            </div>
          ) : null}
          {params?.error ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              We could not send a reset email just now. Please retry in a moment.
            </div>
          ) : null}

          <form action="/api/auth/password-reset/request" method="post" className="mt-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={initialEmail}
                placeholder="you@company.com"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-slate-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Send reset link
            </button>
          </form>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/get-started" className="font-semibold text-slate-700 underline underline-offset-4">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
