import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
  { href: "/get-started", label: "Onboarding" },
];

type AuthenticatedAppNavProps = {
  currentPath: string;
  userEmail?: string | null;
  emailVerified: boolean;
};

export function AuthenticatedAppNav({
  currentPath,
  userEmail,
  emailVerified,
}: AuthenticatedAppNavProps) {
  return (
    <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white/85 px-5 py-4 shadow-sm shadow-slate-200/60 backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-slate-950 transition hover:text-slate-700"
          >
            Winrate
          </Link>
          <nav aria-label="Authenticated navigation" className="flex flex-wrap gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                currentPath === item.href ||
                (item.href !== "/" && currentPath.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              emailVerified
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {emailVerified ? "Verified account" : "Verification required"}
          </span>
          <p className="text-sm text-slate-600">{userEmail ?? "Signed-in account"}</p>
        </div>
      </div>
    </section>
  );
}
