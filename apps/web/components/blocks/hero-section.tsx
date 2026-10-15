"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Menu, ShieldCheck, X, Zap } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

const workflowStats = [
  ["Business context", "Captured", "Offer, ICP, goals"],
  ["Lead plan", "Drafted", "Sources ready for review"],
  ["Outreach queue", "Approval", "First action gated"],
  ["Meeting handoff", "Visible", "Owners, notes, outcomes"],
] as const;

const readinessRows = [
  ["Business profile", 92],
  ["Lead source plan", 78],
  ["Campaign review", 64],
  ["Meeting handoff", 52],
] as const;

const controlGates = [
  "Email verified",
  "Human approval",
  "Provider configured",
  "Audit event recorded",
] as const;

const trustItems = [
  "Approval-gated campaigns",
  "Shared dashboard visibility",
  "Usage-aware billing",
  "Provider-ready foundations",
] as const;

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden bg-background">
        <section className="border-b bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_68%)] pt-28 md:pt-36">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:pb-20">
            <div>
              <div>
                <Link
                  href="/solutions"
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm font-medium text-teal-800 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  <span className="h-2 w-2 rounded-full bg-teal-600" />
                  AI sales workspace for careful operators
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <h1 className="mt-7 max-w-3xl text-5xl font-semibold tracking-normal text-slate-950 md:text-6xl">
                  Winrate turns business context into reviewable sales pipeline.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Capture the customer profile, build lead plans, review outreach, track meetings,
                  and keep billing visible in one governed revenue workspace.
                </p>
                <p className="mt-4 max-w-2xl text-sm font-semibold text-slate-800">
                  Built for momentum with approval gates where trust, spend, and brand risk matter.
                </p>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-lg px-5 text-base">
                  <Link href="/get-started">
                    Launch workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-lg border-slate-300 px-5 text-base"
                >
                  <Link href="/contact?intent=managed_services&utm_source=homepage&utm_medium=hero&utm_campaign=rollout_review">
                    Request rollout review
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  "Claim-safe beta workflows",
                  "Telegram command-center path",
                  "Managed rollout support",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-teal-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">Revenue workspace</p>
                    <p className="text-xs text-slate-500">Illustrative preview</p>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                    Guarded beta
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {workflowStats.map(([label, value, detail]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">{label}</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{value}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.72fr]">
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="text-xs font-medium text-slate-500">Workflow readiness</div>
                    <div className="mt-4 space-y-3">
                      {readinessRows.map(([name, width]) => (
                        <div
                          key={name}
                          className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3"
                        >
                          <span className="text-xs text-slate-600">{name}</span>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-teal-700"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-blue-700" />
                      Control gates
                    </div>
                    <div className="mt-4 space-y-2">
                      {controlGates.map((name) => (
                        <div key={name} className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <span className="text-xs text-slate-600">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-10">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 px-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <div
                key={item}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm font-medium text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: "Solutions", href: "/solutions" },
  { name: "Platform", href: "/ai-sales-automation-platform" },
  { name: "AI SDR", href: "/ai-sdr-software" },
  { name: "Lead Gen", href: "/ai-lead-generation-software" },
  { name: "Outbound", href: "/ai-outbound-sales-automation" },
  { name: "Meetings", href: "/ai-sales-meeting-scheduler" },
  { name: "Telegram", href: "/telegram-sales-command-center" },
  { name: "Compare", href: "/compare-sales-tools" },
  { name: "Integrations", href: "/integrations" },
  { name: "Resources", href: "/resources" },
  { name: "Blueprint", href: "/sales-blueprint" },
  { name: "ROI", href: "/roi-calculator" },
  { name: "Trust", href: "/trust" },
  { name: "Pricing", href: "/pricing" },
] as const;

export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && "active"} className="fixed z-20 w-full px-2 group">
        <div
          className={cn(
            "mx-auto mt-2 max-w-6xl rounded-lg px-4 transition-all duration-300 lg:px-5",
            isScrolled && "border bg-white/88 shadow-sm backdrop-blur-lg",
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-4 py-3">
            <div className="flex w-full justify-between lg:w-auto">
              <Link href="/" aria-label="home" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-normal text-slate-950">Winrate</span>
              </Link>

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState === true ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="hidden lg:block">
              <ul className="flex items-center gap-4 text-sm">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-slate-600 duration-150 hover:text-slate-950"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden items-center gap-3 lg:flex">
              <Button asChild size="sm" variant="outline" className="rounded-lg">
                <Link href="/contact">Contact</Link>
              </Button>
              <Button asChild size="sm" className="rounded-lg">
                <Link href={isAuthenticated ? "/dashboard" : "/get-started"}>
                  {isAuthenticated ? "Dashboard" : "Get started"}
                </Link>
              </Button>
            </div>

            <div className="hidden w-full rounded-lg border bg-white p-5 shadow-xl shadow-slate-900/10 group-data-[state=active]:block lg:hidden">
              <ul className="space-y-4 text-base">
                {menuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block text-slate-600 duration-150 hover:text-slate-950"
                      onClick={() => setMenuState(false)}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/contact"
                    className="block text-slate-600 duration-150 hover:text-slate-950"
                    onClick={() => setMenuState(false)}
                  >
                    Contact
                  </Link>
                </li>
              </ul>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="sm" className="rounded-lg">
                  <Link
                    href={isAuthenticated ? "/dashboard" : "/get-started"}
                    onClick={() => setMenuState(false)}
                  >
                    {isAuthenticated ? "Dashboard" : "Get started"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
