"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  Gauge,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  buildBlueprintContactUrl,
  buildBlueprintGetStartedUrl,
  defaultPublicSalesBlueprintInput,
  evaluatePublicSalesBlueprint,
  publicBlueprintOutreachOptions,
  publicBlueprintSegments,
  publicBlueprintSourceOptions,
  type PublicSalesBlueprintInput,
} from "@/lib/public-sales-blueprint";
import { formatCurrency, formatNumber } from "@/lib/revenue-impact-calculator";

const constraintOptions = [
  "suppression checks",
  "human approval before first outreach",
  "sender reputation limits",
  "regional consent review",
  "no cold SMS without consent",
  "provider readiness required",
];

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function listFromText(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function textFromList(values: string[]) {
  return values.join(", ");
}

function readinessTone(score: number) {
  if (score >= 82) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (score >= 58) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function pressureTone(pressure: "low" | "medium" | "high") {
  if (pressure === "low") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (pressure === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

export function BlueprintPlanner() {
  const [input, setInput] = useState<PublicSalesBlueprintInput>(
    defaultPublicSalesBlueprintInput,
  );
  const result = useMemo(() => evaluatePublicSalesBlueprint(input), [input]);
  const contactHref = useMemo(() => buildBlueprintContactUrl(input, result), [input, result]);
  const getStartedHref = useMemo(
    () => buildBlueprintGetStartedUrl(input, result),
    [input, result],
  );

  const updateInput = <Key extends keyof PublicSalesBlueprintInput>(
    key: Key,
    value: PublicSalesBlueprintInput[Key],
  ) => {
    setInput((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateNumber = (
    key: "monthlyLeadTarget" | "meetingTarget" | "averageContractValue",
    value: string,
  ) => {
    const parsed = Number(value);
    updateInput(key, Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Public Sales Blueprint
            </p>
            <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight text-slate-950">
              Score the sales context before lead sourcing or outreach starts.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Model the ICP, targets, source channels, outreach channels, and guardrails that a
              governed salesxgrowth workspace needs before scaling pipeline work.
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${readinessTone(result.readinessScore)}`}
          >
            <Gauge className="h-3.5 w-3.5" />
            {result.readinessScore}/100
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {publicBlueprintSegments.map((segment) => {
            const active = input.segment === segment.value;

            return (
              <button
                key={segment.value}
                type="button"
                onClick={() => updateInput("segment", segment.value)}
                className={`rounded-md border px-3 py-3 text-left transition ${
                  active
                    ? "border-slate-800 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400"
                }`}
              >
                <span className="text-sm font-semibold">{segment.label}</span>
                <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-300" : "text-slate-600"}`}>
                  {segment.description}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Industry or market</span>
            <input
              value={input.industry}
              onChange={(event) => updateInput("industry", event.target.value)}
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-800">Regions</span>
            <input
              value={textFromList(input.regions)}
              onChange={(event) => updateInput("regions", listFromText(event.target.value))}
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
              placeholder="US, UK, India"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-slate-800">Target audience</span>
          <textarea
            value={input.targetAudience}
            onChange={(event) => updateInput("targetAudience", event.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
          />
        </label>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              key: "monthlyLeadTarget" as const,
              label: "Monthly lead target",
              max: 5000,
              step: 25,
              value: input.monthlyLeadTarget,
              display: formatNumber(input.monthlyLeadTarget, 0),
            },
            {
              key: "meetingTarget" as const,
              label: "Meeting target",
              max: 500,
              step: 1,
              value: input.meetingTarget,
              display: formatNumber(input.meetingTarget, 0),
            },
            {
              key: "averageContractValue" as const,
              label: "Average contract value",
              max: 100000,
              step: 250,
              value: input.averageContractValue,
              display: formatCurrency(input.averageContractValue),
            },
          ].map((field) => (
            <div key={field.key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{field.label}</span>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                  {field.display}
                </span>
              </div>
              <input
                type="range"
                min={field.key === "averageContractValue" ? 0 : 1}
                max={field.max}
                step={field.step}
                value={field.value}
                onChange={(event) => updateNumber(field.key, event.target.value)}
                aria-label={`${field.label} slider`}
                className="mt-3 w-full accent-slate-950"
              />
              <input
                type="number"
                min={field.key === "averageContractValue" ? 0 : 1}
                max={field.max}
                step={field.step}
                value={field.value}
                onChange={(event) => updateNumber(field.key, event.target.value)}
                aria-label={field.label}
                className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-600"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">Source channels</legend>
            <div className="grid gap-2">
              {publicBlueprintSourceOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={input.sourceChannels.includes(option.value)}
                      onChange={() =>
                        updateInput("sourceChannels", toggleValue(input.sourceChannels, option.value))
                      }
                    />
                    {option.label}
                  </span>
                  <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {option.posture}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">Outreach channels</legend>
            <div className="grid gap-2">
              {publicBlueprintOutreachOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={input.outreachChannels.includes(option.value)}
                      onChange={() =>
                        updateInput("outreachChannels", toggleValue(input.outreachChannels, option.value))
                      }
                    />
                    {option.label}
                  </span>
                  <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {option.posture}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-slate-800">Guardrails and constraints</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {constraintOptions.map((constraint) => (
              <label
                key={constraint}
                className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={input.constraints.includes(constraint)}
                  onChange={() => updateInput("constraints", toggleValue(input.constraints, constraint))}
                />
                <span>{constraint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <aside className="space-y-4">
        <section className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Blueprint readiness
              </p>
              <p className="mt-3 text-4xl font-semibold tracking-tight">{result.readinessScore}/100</p>
            </div>
            <ClipboardCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {result.recommendedNextStep}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            {[
              ["Pipeline modeled", formatCurrency(result.monthlyPipelineValue)],
              ["Lead to meeting", `${formatNumber(result.leadToMeetingRate * 100, 1)}%`],
              ["Mode", result.recommendedAutomationMode.replace("_", " ")],
              ["Level", result.readinessLevel.replace("_", " ")],
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
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Commercial fit
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Plan and rollout advisory
              </h2>
            </div>
            <CreditCard className="h-4 w-4 text-slate-500" />
          </div>

          <div className="mt-4 grid gap-2">
            {[
              {
                label: "Recommended SaaS plan",
                value: `${result.commercialFit.planName} / ${result.commercialFit.priceLabel}`,
                detail: result.commercialFit.planReason,
              },
              {
                label: "Reviewed dispatch estimate",
                value: `${formatNumber(result.commercialFit.estimatedReviewedDispatches, 0)}/mo`,
                detail: "Estimated operator-reviewed dispatch posture, not an automatic send quota.",
              },
              {
                label: "Voice posture",
                value: result.commercialFit.estimatedVoiceCalls
                  ? `${formatNumber(result.commercialFit.estimatedVoiceCalls, 0)} calls/mo`
                  : "Not selected",
                detail: "Calls still require provider readiness, eligibility, and approval controls.",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{row.label}</p>
                  <p className="text-right text-sm font-semibold text-slate-950">{row.value}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{row.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">Provider budget pressure</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${pressureTone(
                  result.commercialFit.providerBudgetPressure,
                )}`}
              >
                {result.commercialFit.providerBudgetLabel}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {result.commercialFit.providerBudgetDetail}
            </p>
          </div>

          <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <div>
                <p className="text-sm font-semibold text-teal-950">
                  {result.commercialFit.managedPackageTier}
                </p>
                <p className="mt-1 text-xs leading-5 text-teal-900">
                  {result.commercialFit.managedPackageReason}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Next steps
            </p>
            <ol className="mt-2 space-y-2 text-sm leading-5 text-slate-700">
              {result.commercialFit.nextSteps.map((step, index) => (
                <li key={step} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {result.commercialFit.guardrail}
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Source plan
            </p>
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-4 space-y-2">
            {result.sourcePlan.length ? (
              result.sourcePlan.map((source) => (
                <div key={source.label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{source.label}</p>
                    <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {source.posture}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{source.reason}</p>
                </div>
              ))
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Add at least one source channel to create a source plan.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Approval gates
            </p>
            <LockKeyhole className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.approvalRequiredFor.map((gate) => (
              <span
                key={gate}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                {gate}
              </span>
            ))}
          </div>
          {result.readinessGaps.length ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                Gaps to review
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-900">
                {result.readinessGaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-base font-semibold text-emerald-950">
                Turn this into a governed workspace plan.
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                Attach this score to intake so the first review can focus on ICP, source evidence,
                provider readiness, and a realistic launch sequence.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={contactHref}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Request blueprint review
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={getStartedHref}
                  className="rounded-md border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:border-emerald-500"
                >
                  Start workspace
                </Link>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
