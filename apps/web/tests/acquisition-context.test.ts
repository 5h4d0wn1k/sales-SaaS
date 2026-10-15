import { describe, expect, it } from "vitest";
import {
  buildSettingsBlueprintHandoffUrl,
  buildSettingsBlueprintPrefill,
  parseGetStartedAcquisitionContext,
} from "../lib/acquisition-context";

describe("get-started acquisition context", () => {
  it("summarizes Sales Blueprint context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "sales_blueprint_tool",
      monthlyLeadGoal: "250",
      blueprintSegment: "founder",
      blueprintIndustry: "B2B SaaS",
      blueprintAudience: "Founder-led software teams",
      blueprintMeetings: "20",
      blueprintAcv: "8000",
      blueprintReadiness: "90",
      blueprintLevel: "rollout_ready",
      blueprintSources: "website,search,directory",
      blueprintOutreach: "email,linkedin_review",
      blueprintRegions: "US,UK",
      blueprintConstraints: "suppression checks,human approval",
    });

    expect(context).toMatchObject({
      source: "sales_blueprint",
      label: "Sales Blueprint Builder",
      title: "Sales Blueprint context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Readiness", value: "90/100" },
        { label: "Lead target", value: "250/mo" },
      ]),
    );
    expect(context?.reassurance).toContain("No lead sourcing or outreach starts automatically");
  });

  it("summarizes ROI calculator context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "roi_calculator",
      monthlyLeadGoal: "400",
      budgetRange: "under_500",
      roiQualifiedRate: "18",
      roiMeetingRate: "16",
      roiCloseRate: "24",
      roiAcv: "3500",
      roiBudget: "249",
      roiHoursSaved: "18",
      roiAnnualNet: "127174",
    });

    expect(context).toMatchObject({
      source: "roi_calculator",
      label: "ROI Calculator",
      title: "ROI calculator context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Lead goal", value: "400/mo" },
        { label: "Annual net", value: "$127,174" },
      ]),
    );
    expect(context?.reassurance).toContain("not a guarantee");
  });

  it("summarizes solution segment context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "solution_segment",
      utm_medium: "seo",
      utm_campaign: "agencies_running_client_pipeline",
      solutionSegment: "agencies-running-client-pipeline",
      segment: "agency",
    });

    expect(context).toMatchObject({
      source: "solution_segment",
      label: "Solution segment",
      title: "Solution segment context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Segment", value: "Agencies" },
        { label: "Mode", value: "Approval-gated" },
      ]),
    );
    expect(context?.reassurance).toContain("No lead sourcing");
  });

  it("summarizes pricing plan context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      plan: "pro",
      utm_source: "pricing",
      utm_medium: "pricing_page",
      utm_campaign: "plan_selection",
      pricingIntent: "plan_card",
    });

    expect(context).toMatchObject({
      source: "pricing_plan",
      label: "Pricing",
      title: "Professional plan selected",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Lead volume", value: "5,000 leads/mo" },
        { label: "Provider budget", value: "$50/mo" },
        { label: "Channels", value: "Email, Call" },
      ]),
    );
    expect(context?.reassurance).toContain("does not run lead sourcing");
  });

  it("summarizes pricing plan-fit advisor context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      plan: "pro",
      utm_source: "pricing",
      utm_medium: "pricing_page",
      utm_campaign: "plan_selection",
      pricingIntent: "fit_active_team",
    });

    expect(context).toMatchObject({
      source: "pricing_plan",
      label: "Pricing fit",
      title: "Active campaign team fit attached",
    });
    expect(context?.detail).toContain("Professional");
    expect(context?.detail).toContain("higher lead capacity");
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Plan", value: "Professional" },
        { label: "Lead volume", value: "5,000 leads/mo" },
        { label: "Provider budget", value: "$50/mo" },
      ]),
    );
    expect(context?.reassurance).toContain("not an automatic upgrade");
    expect(context?.reassurance).toContain("approval gates");
  });

  it("summarizes AI sales automation platform context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "ai_sales_automation_platform",
      utm_medium: "seo_landing",
      utm_campaign: "ai_sales_automation_platform",
      platformIntent: "full_workflow_review",
    });

    expect(context).toMatchObject({
      source: "ai_sales_automation_platform",
      label: "AI sales automation platform",
      title: "Platform workflow context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Full workflow review" },
        { label: "Lead target", value: "1,000/mo" },
        { label: "Mode", value: "Governed workflow" },
        { label: "Path", value: "Full platform" },
      ]),
    );
    expect(context?.detail).toContain("source evidence review");
    expect(context?.detail).toContain("Telegram command visibility");
    expect(context?.reassurance).toContain("No broad live source expansion");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes AI SDR software context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "ai_sdr_software",
      utm_medium: "seo_landing",
      utm_campaign: "workspace_start",
      aiSdrIntent: "workspace_start",
    });

    expect(context).toMatchObject({
      source: "ai_sdr_software",
      label: "AI SDR software",
      title: "AI SDR evaluation context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Workspace start" },
        { label: "Lead target", value: "500/mo" },
        { label: "Mode", value: "Approval-gated" },
      ]),
    );
    expect(context?.detail).toContain("source evidence review");
    expect(context?.reassurance).toContain("No lead sourcing");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes AI lead generation software context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "ai_lead_generation_software",
      utm_medium: "seo_landing",
      utm_campaign: "lead_generation_software",
      leadGenIntent: "source_plan",
    });

    expect(context).toMatchObject({
      source: "ai_lead_generation_software",
      label: "AI lead generation software",
      title: "Lead generation context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Source plan" },
        { label: "Lead target", value: "750/mo" },
        { label: "Mode", value: "Evidence-first" },
      ]),
    );
    expect(context?.detail).toContain("source-channel planning");
    expect(context?.reassurance).toContain("No live scraping");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes AI outbound sales automation context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "ai_outbound_sales_automation",
      utm_medium: "seo_landing",
      utm_campaign: "outbound_sales_automation",
      outboundIntent: "sequence_review",
    });

    expect(context).toMatchObject({
      source: "ai_outbound_sales_automation",
      label: "AI outbound sales automation",
      title: "Outbound automation context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Sequence review" },
        { label: "Lead target", value: "600/mo" },
        { label: "Mode", value: "Approval-gated" },
      ]),
    );
    expect(context?.detail).toContain("sequence planning");
    expect(context?.reassurance).toContain("No live sends");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes AI sales meeting scheduler context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "ai_sales_meeting_scheduler",
      utm_medium: "seo_landing",
      utm_campaign: "meeting_conversion",
      meetingIntent: "calendar_handoff",
    });

    expect(context).toMatchObject({
      source: "ai_sales_meeting_scheduler",
      label: "AI sales meeting scheduler",
      title: "Meeting conversion context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Calendar handoff" },
        { label: "Lead target", value: "400/mo" },
        { label: "Meetings", value: "40/mo" },
        { label: "Mode", value: "Manual handoff" },
      ]),
    );
    expect(context?.detail).toContain("manual calendar handoff");
    expect(context?.reassurance).toContain("No autonomous scheduling");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes Telegram sales command center context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "telegram_sales_command_center",
      utm_medium: "seo_landing",
      utm_campaign: "telegram_command_center",
      telegramIntent: "policy_review",
    });

    expect(context).toMatchObject({
      source: "telegram_sales_command_center",
      label: "Telegram sales command center",
      title: "Telegram command context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Policy review" },
        { label: "Lead target", value: "500/mo" },
        { label: "Mode", value: "Read-only + proposals" },
        { label: "Path", value: "Telegram setup" },
      ]),
    );
    expect(context?.detail).toContain("workspace chat binding");
    expect(context?.reassurance).toContain("No campaign approval");
    expect(context?.reassurance).toContain("Telegram-controlled outreach mutation");
  });

  it("summarizes sales tool comparison context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "sales_tool_comparison",
      utm_medium: "seo_comparison",
      utm_campaign: "sales_tool_comparison",
      comparisonIntent: "workspace_start",
    });

    expect(context).toMatchObject({
      source: "sales_tool_comparison",
      label: "Sales tool comparison",
      title: "Sales tool comparison context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Intent", value: "Workspace start" },
        { label: "Lead target", value: "600/mo" },
        { label: "Path", value: "Stack review" },
      ]),
    );
    expect(context?.detail).toContain("CRM-only tools");
    expect(context?.reassurance).toContain("No lead sourcing");
    expect(context?.reassurance).toContain("Telegram-controlled mutation");
  });

  it("summarizes resource article context for onboarding", () => {
    const context = parseGetStartedAcquisitionContext({
      utm_source: "resources",
      utm_medium: "seo_article",
      utm_campaign: "telegram-sales-command-center",
      resource: "telegram-sales-command-center",
      resourceIntent: "article_sidebar",
    });

    expect(context).toMatchObject({
      source: "resource_article",
      label: "Resource guide",
      title: "Guide context attached",
    });
    expect(context?.metrics).toEqual(
      expect.arrayContaining([
        { label: "Guide", value: "Sales command center" },
        { label: "Stage", value: "Consideration" },
        { label: "Mode", value: "Review-first" },
      ]),
    );
    expect(context?.reassurance).toContain("does not run lead sourcing");
    expect(context?.reassurance).toContain("Telegram mutations");
  });

  it("ignores acquisition-looking values without a supported source", () => {
    expect(
      parseGetStartedAcquisitionContext({
        monthlyLeadGoal: "400",
        blueprintReadiness: "90",
      }),
    ).toBeNull();
  });

  it("builds a safe settings handoff URL for blueprint review", () => {
    expect(
      buildSettingsBlueprintHandoffUrl({
        plan: "pro",
        utm_source: "sales_blueprint_tool",
        utm_medium: "owned_tool",
        utm_campaign: "blueprint_readiness",
        monthlyLeadGoal: "250",
        blueprintIndustry: "B2B SaaS",
        blueprintAudience: "Founder-led software teams",
        blueprintSources: "website,search,directory",
        unsafeReturn: "https://evil.example.com",
      }),
    ).toBe(
      "/settings?plan=pro&utm_source=sales_blueprint_tool&utm_medium=owned_tool&utm_campaign=blueprint_readiness&monthlyLeadGoal=250&blueprintIndustry=B2B+SaaS&blueprintAudience=Founder-led+software+teams&blueprintSources=website%2Csearch%2Cdirectory#blueprint-business-name",
    );
  });

  it("prefills settings blueprint fields from public Sales Blueprint context", () => {
    const prefill = buildSettingsBlueprintPrefill({
      utm_source: "sales_blueprint_tool",
      monthlyLeadGoal: "250",
      blueprintSegment: "founder",
      blueprintIndustry: "B2B SaaS",
      blueprintAudience: "Founder-led software teams",
      blueprintMeetings: "20",
      blueprintAcv: "8000",
      blueprintReadiness: "90",
      blueprintLevel: "rollout_ready",
      blueprintSources: "website,search,directory",
      blueprintOutreach: "email,linkedin_review",
      blueprintRegions: "US,UK",
      blueprintConstraints: "suppression checks,human approval",
      blueprintPlan: "pro",
    });

    expect(prefill).toMatchObject({
      sourceLabel: "Sales Blueprint Builder",
      title: "Public Sales Blueprint ready to save",
      fields: {
        industry: "B2B SaaS",
        targetAudience: "Founder-led software teams",
        regions: "US, UK",
        sourceChannels: "website, search, directory",
        outreachChannels: "email, linkedin_review",
        monthlyLeadTarget: 250,
        meetingTarget: 20,
        averageContractValue: 8000,
        automationMode: "approval_gated",
      },
    });
    expect(prefill?.fields.goals).toContain("250 qualified leads per month");
    expect(prefill?.fields.complianceNotes).toContain("human approval");
    expect(prefill?.detail).toContain("Review the missing offer and voice details");
  });

  it("prefills directional settings fields from commercial acquisition pages", () => {
    const prefill = buildSettingsBlueprintPrefill({
      utm_source: "ai_sales_automation_platform",
      platformIntent: "full_workflow_review",
    });

    expect(prefill).toMatchObject({
      sourceLabel: "AI sales automation platform",
      fields: {
        goals:
          "Build a Sales Blueprint, Generate qualified leads, Launch approval-gated outreach, Improve meetings and conversion, Connect Telegram command center, Add managed rollout support",
        channels: "website, directory, email, call, linkedin review, telegram",
        sourceChannels: "website, directory",
        outreachChannels: "email, call, linkedin review, telegram",
        monthlyLeadTarget: 1000,
        automationMode: "approval_gated",
      },
    });
    expect(prefill?.fields.summary).toContain("full workflow review context");
    expect(prefill?.fields.complianceNotes).toContain("approval policy");
  });
});
