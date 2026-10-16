"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator, ShieldCheck, TrendingUp } from "lucide-react";
import {
  calculateRevenueImpact,
  defaultRevenueImpactInput,
  formatCurrency,
  formatNumber,
  type RevenueImpactInput,
} from "@/lib/revenue-impact-calculator";
import { buildRoiContactUrl, buildRoiGetStartedUrl } from "@/lib/roi-contact-context";

type NumericField = {
  key: keyof RevenueImpactInput;
  label: string;
  suffix?: string;
  min: number;
  max: number;
  step: number;
};

const fields: NumericField[] = [
  {
    key: "monthlyLeads",
    label: "Monthly lead volume",
    min: 0,
    max: 10000,
    step: 25,
  },
  {
    key: "qualifiedRate",
    label: "Qualified lead rate",
    suffix: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "meetingRate",
    label: "Qualified-to-meeting rate",
    suffix: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "closeRate",
    label: "Meeting-to-customer rate",
    suffix: "%",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: "averageContractValue",
    label: "Average contract value",
    min: 0,
    max: 100000,
    step: 100,
  },
  {
    key: "monthlyPlatformCost",
    label: "Monthly software and support budget",
    min: 0,
    max: 25000,
    step: 25,
  },
  {
    key: "hoursSaved",
    label: "Operator hours saved per month",
    min: 0,
    max: 400,
    step: 1,
  },
  {
    key: "hourlyCost",
    label: "Loaded hourly operator cost",
    min: 0,
    max: 500,
    step: 5,
  },
];

const presets: Array<{ label: string; values: RevenueImpactInput }> = [
  {
    label: "Founder-led SaaS",
    values: defaultRevenueImpactInput,
  },
  {
    label: "Local service team",
    values: {
      monthlyLeads: 180,
      qualifiedRate: 22,
      meetingRate: 20,
      closeRate: 32,
      averageContractValue: 1800,
      monthlyPlatformCost: 99,
      hoursSaved: 12,
      hourlyCost: 45,
    },
  },
  {
    label: "Agency pipeline desk",
    values: {
      monthlyLeads: 1200,
      qualifiedRate: 14,
      meetingRate: 12,
      closeRate: 18,
      averageContractValue: 5200,
      monthlyPlatformCost: 249,
      hoursSaved: 36,
      hourlyCost: 75,
    },
  },
];

function fieldDisplayValue(input: RevenueImpactInput, key: keyof RevenueImpactInput) {
  const value = input[key];

  if (key === "averageContractValue" || key === "monthlyPlatformCost" || key === "hourlyCost") {
    return `$${value}`;
  }

  return String(value);
}

export function RevenueImpactCalculator() {
  const [input, setInput] = useState<RevenueImpactInput>(defaultRevenueImpactInput);
  const result = useMemo(() => calculateRevenueImpact(input), [input]);
  const contactHref = useMemo(() => buildRoiContactUrl(input, result), [input, result]);
  const getStartedHref = useMemo(() => buildRoiGetStartedUrl(input, result), [input, result]);

  const updateField = (key: keyof RevenueImpactInput, rawValue: string) => {
    const parsed = Number(rawValue);
    setInput((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Revenue scenario model
            </p>
            <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-slate-950">
              Estimate the value of better lead planning, reviewable outreach, and meeting handoff.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Model a conservative sales workflow scenario before choosing software, managed
              rollout support, or provider setup work.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Not a guarantee
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setInput(preset.values)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.key}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div
                id={`${field.key}-label`}
                className="flex items-center justify-between gap-3 text-sm font-medium text-slate-800"
              >
                {field.label}
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {fieldDisplayValue(input, field.key)}
                  {field.suffix ?? ""}
                </span>
              </div>
              <input
                type="range"
                aria-label={`${field.label} slider`}
                min={field.min}
                max={field.max}
                step={field.step}
                value={input[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="mt-3 w-full accent-slate-950"
              />
              <input
                type="number"
                aria-labelledby={`${field.key}-label`}
                min={field.min}
                max={field.max}
                step={field.step}
                value={input[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-600"
              />
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Modeled annual net impact
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {formatCurrency(result.annualNetImpact)}
              </p>
            </div>
            <Calculator className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Net impact combines modeled won revenue and operator time savings, then subtracts the
            monthly budget you entered.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Monthly net", formatCurrency(result.netMonthlyImpact)],
              ["Monthly revenue", formatCurrency(result.monthlyRevenue)],
              ["Efficiency value", formatCurrency(result.monthlyEfficiencyValue)],
              [
                "ROI multiple",
                result.roiMultiple === null ? "n/a" : `${formatNumber(result.roiMultiple, 1)}x`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Funnel output
          </p>
          <div className="mt-4 space-y-3">
            {[
              ["Qualified leads", formatNumber(result.qualifiedLeads)],
              ["Meetings", formatNumber(result.meetings)],
              ["New customers", formatNumber(result.customers)],
              [
                "Payback",
                result.paybackDays === null
                  ? "n/a"
                  : `${formatNumber(result.paybackDays, 1)} days`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-600">{label}</span>
                <span className="font-semibold text-slate-950">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-semibold text-emerald-950">
                Turn the model into a reviewed rollout plan.
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                salesxgrowth can map this scenario to a Sales Blueprint, source evidence, approval
                gates, provider readiness, and managed launch support without promising automatic
                outcomes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Request rollout review
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={getStartedHref}
                  className="rounded-md border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:border-emerald-500"
                >
                  Start workspace
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-md border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:border-emerald-500"
                >
                  Compare plans
                </Link>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
