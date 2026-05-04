type EmailVerificationBannerProps = {
  email?: string | null;
  returnTo: string;
  title?: string;
  body?: string;
};

export function EmailVerificationBanner({
  email,
  returnTo,
  title = "Verify your email before using paid billing or live outreach actions.",
  body = "We sent a verification link when your account was created. Resend it here if you need a fresh link.",
}: EmailVerificationBannerProps) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 shadow-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 leading-6 text-amber-900">{body}</p>
      <form action="/api/auth/verify-email/request" method="post" className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="returnTo" value={returnTo} />
        {email ? <input type="hidden" name="email" value={email} /> : null}
        <button
          type="submit"
          className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
        >
          Resend verification email
        </button>
      </form>
    </div>
  );
}
