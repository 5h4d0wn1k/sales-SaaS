import { test, expect } from '@playwright/test';

test.describe('User Registration and Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate to get-started and show auth options', async ({ page }) => {
    await page.goto('/get-started');
    await expect(page).toHaveURL('/get-started');
    await expect(page.getByRole('heading', { name: 'Confirm the sales motion before choosing capacity.' })).toBeVisible();
    await expect(page.getByRole('link', { name: /open builder/i })).toHaveAttribute(
      'href',
      /\/sales-blueprint\?/,
    );
    await expect(page.getByRole('link', { name: /request review/i })).toHaveAttribute(
      'href',
      /managedIntent=blueprint_checkpoint_review/,
    );
    await expect(page.getByRole('heading', { name: "Let's get you started" })).toBeVisible();
  });

  test('should let a visitor progress through the email signup UI', async ({ page }) => {
    await page.goto('/get-started');
    await page.getByRole('button', { name: 'Sign up with email' }).click();

    await expect(page.getByRole('heading', { name: "What's your work email?" })).toBeVisible();
    await page.locator('#email').fill('test@example.com');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Nice to meet you' })).toBeVisible();
  });

  test('should have billing link in dashboard', async ({ page }) => {
    // Register first (or mock session)
    // This would need a real backend - in CI we'd seed the DB

    // For now, just verify the billing page exists
    await page.goto('/billing');
    // Should redirect to /get-started if not authenticated
    await expect(page).toHaveURL('/get-started');
  });
});

test.describe('Pricing Page', () => {
  test('should display the shared pricing tiers', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'Straightforward pricing for the current public beta' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Professional', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Elite', exact: true })).toBeVisible();
  });

  test('should show the canonical shared pricing values', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByText('$49', { exact: true })).toBeVisible();
    await expect(page.getByText('$99', { exact: true })).toBeVisible();
    await expect(page.getByText('$249', { exact: true })).toBeVisible();
  });

  test('should show plan-fit advisor recommendations from pricing', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'Pick the plan by rollout stage, not by guesswork.' })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: 'Validate the workspace' })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: 'Founder-led launch' })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: 'Active campaign team' })).toBeVisible();
    await expect(page.locator('article').filter({ hasText: 'Scale governed operations' })).toBeVisible();

    const activeTeam = page.locator('article').filter({ hasText: 'Active campaign team' });

    await expect(activeTeam.getByRole('heading', { name: 'Professional plan' })).toBeVisible();
    await expect(activeTeam.getByText('5,000 leads/mo')).toBeVisible();
    await expect(activeTeam.getByText('$50/mo')).toBeVisible();
    await expect(activeTeam.getByRole('link', { name: /choose professional/i })).toHaveAttribute(
      'href',
      /plan=pro/,
    );
    await expect(activeTeam.getByRole('link', { name: /choose professional/i })).toHaveAttribute(
      'href',
      /pricingIntent=fit_active_team/,
    );
    await expect(activeTeam.getByRole('link', { name: /request rollout review/i })).toHaveAttribute(
      'href',
      /managedPackage=operator-assist/,
    );

    await activeTeam.getByRole('link', { name: /choose professional/i }).click();

    await expect(page).toHaveURL(/\/get-started\?/);
    await expect(page).toHaveURL(/pricingIntent=fit_active_team/);
    await expect(page.getByText('Active campaign team fit attached')).toBeVisible();
    await expect(page.getByText('Professional', { exact: true })).toBeVisible();
    await expect(page.getByText('5,000 leads/mo')).toBeVisible();
    await expect(page.getByText('not an automatic upgrade')).toBeVisible();
  });

  test('should route pricing managed-support interest into contact intake context', async ({ page }) => {
    await page.goto('/pricing');

    const setupReviewLink = page.getByRole('link', { name: /request setup review/i });

    await expect(setupReviewLink).toHaveAttribute('href', /\/contact\?/);
    await expect(setupReviewLink).toHaveAttribute('href', /utm_source=pricing/);
    await expect(setupReviewLink).toHaveAttribute('href', /managedPackage=setup-sprint/);
    await setupReviewLink.click();

    await expect(page).toHaveURL(/\/contact\?/);
    await expect(page.getByText('Managed services context attached')).toBeVisible();
    await expect(page.getByText('Setup Sprint', { exact: true })).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('500_1500');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/managed-services#setup-sprint');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('pricing');
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Managed services fit-call context attached for review: Setup Sprint/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/software subscription, provider costs, and managed-service scope should stay separate/);
  });
});

test.describe('Navigation', () => {
  test('should serve branded social preview images', async ({ request }) => {
    for (const path of ['/opengraph-image', '/twitter-image']) {
      const response = await request.get(path);

      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('image/png');
      expect((await response.body()).length).toBeGreaterThan(5000);
    }
  });

  test('should show the trust security contact path and serve security metadata', async ({ page, request }) => {
    const securityResponse = await request.get('/.well-known/security.txt');
    const securityText = await securityResponse.text();

    expect(securityResponse.ok()).toBeTruthy();
    expect(securityResponse.headers()['content-type']).toContain('text/plain');
    expect(securityText).toContain('Contact: mailto:hello@winrate.ai');
    expect(securityText).toContain('Policy: https://winrate.ai/trust');
    expect(securityText.toLowerCase()).not.toContain('bug bounty');
    expect(securityText.toLowerCase()).not.toContain('safe harbor');

    await page.goto('/trust');

    await expect(
      page.getByRole('heading', {
        name: 'A clear contact path for security reports.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /view security\.txt/i })).toHaveAttribute(
      'href',
      '/.well-known/security.txt',
    );
    await expect(page.getByRole('link', { name: /email security contact/i })).toHaveAttribute(
      'href',
      'mailto:hello@winrate.ai',
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('bug bounty');
    expect(body).not.toContain('safe harbor');
  });

  test('should show the homepage growth funnel with claim-safe solution links', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: 'Winrate turns business context into reviewable sales pipeline.',
      }),
    ).toBeVisible();
    await expect(page.getByText('No live scraping or outreach starts from a public page.')).toBeVisible();
    await expect(page.getByRole('link', { name: /founders/i })).toHaveAttribute(
      'href',
      '/solutions/founders-validating-outbound',
    );
    await expect(page.getByRole('link', { name: /local services/i })).toHaveAttribute(
      'href',
      '/solutions/local-service-businesses-booking-jobs',
    );

    const heroReviewLink = page.getByRole('link', { name: /request rollout review/i }).first();

    await expect(heroReviewLink).toHaveAttribute('href', /\/contact\?/);
    await expect(heroReviewLink).toHaveAttribute('href', /utm_source=homepage/);
    await expect(heroReviewLink).toHaveAttribute('href', /utm_campaign=rollout_review/);

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
  });

  test('should have functional navigation links', async ({ page }) => {
    await page.goto('/');

    // Check key links exist
    await expect(page.locator('a[href="/pricing"]').first()).toBeVisible();
    await expect(page.locator('a[href="/contact"]').first()).toBeVisible();
    await expect(page.locator('a[href="/ai-sales-automation-platform"]').first()).toBeVisible();
    await expect(page.locator('a[href="/ai-sdr-software"]').first()).toBeVisible();
    await expect(page.locator('a[href="/ai-lead-generation-software"]').first()).toBeVisible();
    await expect(page.locator('a[href="/ai-outbound-sales-automation"]').first()).toBeVisible();
    await expect(page.locator('a[href="/ai-sales-meeting-scheduler"]').first()).toBeVisible();
    await expect(page.locator('a[href="/telegram-sales-command-center"]').first()).toBeVisible();
    await expect(page.locator('a[href="/compare-sales-tools"]').first()).toBeVisible();
    await expect(page.locator('a[href="/integrations"]').first()).toBeVisible();
    await expect(page.locator('a[href="/sales-blueprint"]').first()).toBeVisible();
    await expect(page.locator('a[href="/roi-calculator"]').first()).toBeVisible();
  });

  test('should show the sales tool comparison page with guarded buyer claims', async ({ page }) => {
    await page.goto('/compare-sales-tools');

    await expect(
      page.getByRole('heading', {
        name: 'Compare sales tools before you stitch together another fragile stack.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Comparison matrix')).toBeVisible();
    await expect(page.getByText('CRM-only workflow')).toBeVisible();
    await expect(page.getByText('Outreach sequencer')).toBeVisible();
    await expect(page.getByText('Generic AI agent builder')).toBeVisible();

    await expect(page.getByRole('link', { name: /start comparison workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start comparison workspace/i })).toHaveAttribute(
      'href',
      /comparisonIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request stack review/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request stack review/i })).toHaveAttribute(
      'href',
      /comparisonIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /read crm comparison guide/i })).toHaveAttribute(
      'href',
      '/resources/ai-sales-crm-vs-outbound-workspace',
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from sales tool comparison context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=sales_tool_comparison&utm_medium=seo_comparison&utm_campaign=sales_tool_comparison&comparisonIntent=rollout_review');

    await expect(page.getByText('Sales tool comparison context attached', { exact: true })).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('600');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/compare-sales-tools');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('sales_tool_comparison');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Add managed rollout support"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Sales tool comparison context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No lead sourcing, live outreach, provider work, billing change, or Telegram-controlled mutation/);
  });

  test('should preserve sales tool comparison context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=sales_tool_comparison&utm_medium=seo_comparison&utm_campaign=sales_tool_comparison&comparisonIntent=workspace_start');

    await expect(page.getByText('Sales tool comparison context attached')).toBeVisible();
    await expect(page.getByText('Workspace start')).toBeVisible();
    await expect(page.getByText('600/mo')).toBeVisible();
    await expect(page.getByText(/No lead sourcing, outreach, provider work, billing changes, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the AI sales automation platform commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/ai-sales-automation-platform');

    await expect(
      page.getByRole('heading', {
        name: 'Run the full sales workflow without turning AI into a black box.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Operating system map')).toBeVisible();
    await expect(page.getByText('From business context to reviewed leads to approved work to revenue evidence')).toBeVisible();
    await expect(
      page.getByText(
        'No broad live source expansion, enrichment spend, or sourcing-channel expansion from a public page',
      ),
    ).toBeVisible();

    await expect(page.getByRole('link', { name: /start sales workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start sales workspace/i })).toHaveAttribute(
      'href',
      /platformIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request platform rollout/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request platform rollout/i })).toHaveAttribute(
      'href',
      /platformIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /compare platform plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from AI sales automation platform context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=ai_sales_automation_platform&utm_medium=seo_landing&utm_campaign=ai_sales_automation_platform&platformIntent=full_workflow_review');

    await expect(page.getByText('Platform workflow context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('1000');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/ai-sales-automation-platform');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('ai_sales_automation_platform');
    await expect(page.locator('input[name="channels"][value="website"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="directory"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Generate qualified leads"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/AI sales automation platform context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No broad live source expansion, hidden sends, hidden calls, social automation, SMS, autonomous scheduling, direct Telegram mutation/);
  });

  test('should preserve AI sales automation platform context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=ai_sales_automation_platform&utm_medium=seo_landing&utm_campaign=ai_sales_automation_platform&platformIntent=full_workflow_review');

    await expect(page.getByText('Platform workflow context attached')).toBeVisible();
    await expect(page.getByText('Full workflow review')).toBeVisible();
    await expect(page.getByText('1,000/mo')).toBeVisible();
    await expect(page.getByText('Governed workflow')).toBeVisible();
    await expect(page.getByText(/No broad live source expansion, hidden outreach, provider work, autonomous scheduling, billing changes, AI-worker execution, external tool execution, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the AI SDR software commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/ai-sdr-software');

    await expect(
      page.getByRole('heading', {
        name: 'AI sales agents need a control plane before they need more volume.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Current AI SDR workflow truth')).toBeVisible();
    await expect(page.getByText(/Sales Blueprint captures ICP/i)).toBeVisible();
    await expect(
      page.getByText('No public promise of universal scraping or browser automation'),
    ).toBeVisible();

    await expect(page.getByRole('link', { name: /build ai sdr workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /build ai sdr workspace/i })).toHaveAttribute(
      'href',
      /aiSdrIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request rollout review/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request rollout review/i })).toHaveAttribute(
      'href',
      /aiSdrIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /read evaluation guide/i })).toHaveAttribute(
      'href',
      '/resources/ai-sdr-software-evaluation-checklist',
    );
    await expect(page.getByRole('link', { name: /compare plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from AI SDR software context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=ai_sdr_software&utm_medium=seo_landing&utm_campaign=ai_sdr_evaluation&aiSdrIntent=rollout_review');

    await expect(page.getByText('AI SDR evaluation context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('500');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/ai-sdr-software');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/AI SDR software evaluation context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No lead sourcing, live outreach, provider work, billing change, or Telegram-controlled mutation/);
  });

  test('should preserve AI SDR software context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=ai_sdr_software&utm_medium=seo_landing&utm_campaign=workspace_start&aiSdrIntent=workspace_start');

    await expect(page.getByText('AI SDR evaluation context attached')).toBeVisible();
    await expect(page.getByText('Workspace start')).toBeVisible();
    await expect(page.getByText('500/mo')).toBeVisible();
    await expect(page.getByText(/No lead sourcing, outreach, provider work, billing changes, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the AI lead generation software commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/ai-lead-generation-software');

    await expect(
      page.getByRole('heading', {
        name: 'Generate better pipeline by proving the source plan first.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Source evidence board')).toBeVisible();
    await expect(page.getByText('From business context to reviewed leads to meetings')).toBeVisible();
    await expect(page.getByText('No claim that every source can be scraped live')).toBeVisible();

    await expect(page.getByRole('link', { name: /start lead workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start lead workspace/i })).toHaveAttribute(
      'href',
      /leadGenIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request source-plan review/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request source-plan review/i })).toHaveAttribute(
      'href',
      /leadGenIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /compare lead-generation plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from AI lead generation software context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=ai_lead_generation_software&utm_medium=seo_landing&utm_campaign=lead_generation_software&leadGenIntent=rollout_review');

    await expect(page.getByText('AI lead generation context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('750');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/ai-lead-generation-software');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('ai_lead_generation_software');
    await expect(page.locator('input[name="channels"][value="website"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="directory"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Generate qualified leads"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Improve meetings and conversion"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/AI lead generation software context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No live scraping, lead sourcing, enrichment purchase, outreach, provider work, billing change, or Telegram-controlled mutation/);
  });

  test('should preserve AI lead generation software context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=ai_lead_generation_software&utm_medium=seo_landing&utm_campaign=lead_generation_software&leadGenIntent=source_plan');

    await expect(page.getByText('Lead generation context attached')).toBeVisible();
    await expect(page.getByText('Source plan').first()).toBeVisible();
    await expect(page.getByText('750/mo')).toBeVisible();
    await expect(page.getByText(/No live scraping, lead sourcing, enrichment purchase, outreach, provider work, billing changes, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the AI outbound sales automation commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/ai-outbound-sales-automation');

    await expect(
      page.getByRole('heading', {
        name: 'Automate outbound only after the sequence is reviewable.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Channel readiness')).toBeVisible();
    await expect(page.getByText('From sequence planning to approved activity to meetings')).toBeVisible();
    await expect(page.getByText('No hidden sends, calls, social actions, or SMS dispatch')).toBeVisible();

    await expect(page.getByRole('link', { name: /start outbound workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start outbound workspace/i })).toHaveAttribute(
      'href',
      /outboundIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request sequence review/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request sequence review/i })).toHaveAttribute(
      'href',
      /outboundIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /compare outbound plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from AI outbound sales automation context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=ai_outbound_sales_automation&utm_medium=seo_landing&utm_campaign=outbound_sales_automation&outboundIntent=rollout_review');

    await expect(page.getByText('AI outbound automation context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('600');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/ai-outbound-sales-automation');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('ai_outbound_sales_automation');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="call"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Improve meetings and conversion"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/AI outbound sales automation context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No live sends, calls, social actions, SMS, provider work, billing change, or Telegram-controlled mutation/);
  });

  test('should preserve AI outbound sales automation context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=ai_outbound_sales_automation&utm_medium=seo_landing&utm_campaign=outbound_sales_automation&outboundIntent=sequence_review');

    await expect(page.getByText('Outbound automation context attached')).toBeVisible();
    await expect(page.getByText('Sequence review')).toBeVisible();
    await expect(page.getByText('600/mo')).toBeVisible();
    await expect(page.getByText(/No live sends, calls, social actions, SMS, provider work, billing changes, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the AI sales meeting scheduler commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/ai-sales-meeting-scheduler');

    await expect(
      page.getByRole('heading', {
        name: 'Turn reviewed pipeline into meetings without hiding the handoff.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Meeting handoff board')).toBeVisible();
    await expect(page.getByText('From handoff candidate to calendar link to closed-value review')).toBeVisible();
    await expect(page.getByText('No hidden calendar-provider sync or stored calendar credentials')).toBeVisible();

    await expect(page.getByRole('link', { name: /start meeting workflow/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start meeting workflow/i })).toHaveAttribute(
      'href',
      /meetingIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request conversion review/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request conversion review/i })).toHaveAttribute(
      'href',
      /meetingIntent=conversion_review/,
    );
    await expect(page.getByRole('link', { name: /compare conversion-ready plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from AI sales meeting scheduler context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=ai_sales_meeting_scheduler&utm_medium=seo_landing&utm_campaign=meeting_conversion&meetingIntent=calendar_handoff');

    await expect(page.getByText('Meeting conversion context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('400');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/ai-sales-meeting-scheduler');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('ai_sales_meeting_scheduler');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="call"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Improve meetings and conversion"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/AI sales meeting scheduler context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No autonomous scheduling, live calendar sync, reminder automation, provider work, billing change, accounting mutation, or Telegram-controlled mutation/);
  });

  test('should preserve AI sales meeting scheduler context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=ai_sales_meeting_scheduler&utm_medium=seo_landing&utm_campaign=meeting_conversion&meetingIntent=calendar_handoff');

    await expect(page.getByText('Meeting conversion context attached')).toBeVisible();
    await expect(page.getByText('Calendar handoff', { exact: true })).toBeVisible();
    await expect(page.getByText('400/mo')).toBeVisible();
    await expect(page.getByText('40/mo')).toBeVisible();
    await expect(page.getByText(/No autonomous scheduling, live calendar sync, reminder automation, provider work, billing changes, accounting mutation, or Telegram-controlled mutation/i)).toBeVisible();
  });

  test('should show the Telegram sales command center commercial page with guarded buyer claims', async ({ page }) => {
    await page.goto('/telegram-sales-command-center');

    await expect(
      page.getByRole('heading', {
        name: 'Control sales from Telegram without bypassing approval.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Command posture', { exact: true })).toBeVisible();
    await expect(page.getByText('From chat binding to policy preview to proposal review')).toBeVisible();
    await expect(page.getByText('No campaign, call, billing, provider, or AI-worker mutation directly from Telegram')).toBeVisible();

    await expect(page.getByRole('link', { name: /start command workspace/i })).toHaveAttribute(
      'href',
      /\/get-started\?/,
    );
    await expect(page.getByRole('link', { name: /start command workspace/i })).toHaveAttribute(
      'href',
      /telegramIntent=workspace_start/,
    );
    await expect(page.getByRole('link', { name: /request telegram rollout/i })).toHaveAttribute(
      'href',
      /\/contact\?/,
    );
    await expect(page.getByRole('link', { name: /request telegram rollout/i })).toHaveAttribute(
      'href',
      /telegramIntent=rollout_review/,
    );
    await expect(page.getByRole('link', { name: /compare command-center plans/i })).toHaveAttribute(
      'href',
      /\/pricing\?/,
    );

    const body = (await page.locator('body').innerText()).toLowerCase();

    expect(body).not.toContain('guaranteed meetings');
    expect(body).not.toContain('guaranteed revenue');
    expect(body).not.toContain('fully autonomous');
    expect(body).not.toContain('universal live scraping');
    expect(body).not.toContain('approve campaigns from telegram');
  });

  test('should prefill contact intake from Telegram sales command center context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=telegram_sales_command_center&utm_medium=seo_landing&utm_campaign=telegram_command_center&telegramIntent=bot_setup');

    await expect(page.getByText('Telegram command context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('500');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/telegram-sales-command-center');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('telegram_sales_command_center');
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="call"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Add managed rollout support"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Telegram sales command center context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No campaign approval, call dispatch, billing change, provider mutation, AI-worker execution, external tool execution, or Telegram-controlled outreach mutation/);
  });

  test('should preserve Telegram sales command center context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=telegram_sales_command_center&utm_medium=seo_landing&utm_campaign=telegram_command_center&telegramIntent=policy_review');

    await expect(page.getByText('Telegram command context attached')).toBeVisible();
    await expect(page.getByText('Policy review')).toBeVisible();
    await expect(page.getByText('500/mo')).toBeVisible();
    await expect(page.getByText('Read-only + proposals')).toBeVisible();
    await expect(page.getByText(/No campaign approval, call dispatch, billing change, provider mutation, AI-worker execution, external tool execution, or Telegram-controlled outreach mutation/i)).toBeVisible();
  });

  test('should show the public integrations catalog', async ({ page }) => {
    await page.goto('/integrations');

    await expect(
      page.getByRole('heading', {
        name: 'AI sales channels with the setup status and guardrails visible.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Channel and provider matrix' })).toBeVisible();
    await expect(page.getByText('Telegram command center')).toBeVisible();
  });

  test('should route Telegram integration interest into contact intake context', async ({ page }) => {
    await page.goto('/integrations');

    const telegramRow = page.locator('#telegram-command-center');
    const rolloutLink = telegramRow.getByRole('link', { name: /request beta rollout/i });

    await expect(rolloutLink).toHaveAttribute('href', /\/contact\?/);
    await expect(rolloutLink).toHaveAttribute('href', /utm_source=integration_catalog/);
    await expect(rolloutLink).toHaveAttribute('href', /integration=telegram-command-center/);
    await expect(rolloutLink).toHaveAttribute('href', /integrationIntent=beta_rollout/);
    await rolloutLink.click();

    await expect(page).toHaveURL(/\/contact\?/);
    await expect(page.getByText('Integration context attached')).toBeVisible();
    await expect(page.getByText('Telegram command center', { exact: true })).toBeVisible();
    await expect(page.getByText('Pilot with review gates', { exact: true })).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('input[name="integration"]')).toHaveValue('telegram-command-center');
    await expect(page.locator('input[name="integrationIntent"]')).toHaveValue('beta_rollout');
    await expect(page.locator('input[name="integrationCommercialPath"]')).toHaveValue('Pilot with review gates');
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Integration rollout context attached for review: Telegram command center/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Requested intent: beta_rollout/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/before any live provider work starts/);
  });

  test('should show the Telegram resource guide with guarded onboarding attribution', async ({ page }) => {
    await page.goto('/resources/telegram-sales-command-center');

    await expect(
      page.getByRole('heading', {
        name: 'Telegram sales command center: operate AI sales without losing approval control',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Blocked today: approving campaigns, changing billing, configuring providers, or mutating outreach from Telegram',
      ),
    ).toBeVisible();

    const startLink = page.getByRole('link', { name: /^start free$/i }).first();
    await expect(startLink).toHaveAttribute('href', /\/get-started\?/);
    await expect(startLink).toHaveAttribute('href', /utm_source=resources/);
    await expect(startLink).toHaveAttribute('href', /resource=telegram-sales-command-center/);

    const reviewLink = page.getByRole('link', { name: /^request rollout review$/i }).first();
    await expect(reviewLink).toHaveAttribute('href', /\/contact\?/);
    await expect(reviewLink).toHaveAttribute('href', /utm_source=resources/);
    await expect(reviewLink).toHaveAttribute('href', /resource=telegram-sales-command-center/);
  });

  test('should show the multi-channel lead generation guide with source-plan guardrails', async ({ page }) => {
    await page.goto('/resources/ai-lead-generation-channels-source-plan');

    await expect(
      page.getByRole('heading', {
        name: 'AI lead generation channels: build a source plan before outreach',
      }),
    ).toBeVisible();
    await expect(page.getByText('Make source evidence visible')).toBeVisible();
    await expect(page.getByText('Deduplication and rejection reason')).toBeVisible();
    await expect(page.getByText(/provider-cost posture/i)).toBeVisible();

    const startLink = page.getByRole('link', { name: /^start free$/i }).first();
    await expect(startLink).toHaveAttribute('href', /\/get-started\?/);
    await expect(startLink).toHaveAttribute('href', /utm_source=resources/);
    await expect(startLink).toHaveAttribute(
      'href',
      /resource=ai-lead-generation-channels-source-plan/,
    );
  });

  test('should route managed-services package interest into contact intake context', async ({ page }) => {
    await page.goto('/managed-services');

    const operatorAssistRow = page.locator('#operator-assist');
    const packageLink = operatorAssistRow.getByRole('link', { name: /scope package/i });

    await expect(packageLink).toHaveAttribute('href', /\/contact\?/);
    await expect(packageLink).toHaveAttribute('href', /utm_source=managed_services/);
    await expect(packageLink).toHaveAttribute('href', /managedPackage=operator-assist/);
    await packageLink.click();

    await expect(page).toHaveURL(/\/contact\?/);
    await expect(page.getByText('Managed services context attached')).toBeVisible();
    await expect(page.getByText('Operator Assist', { exact: true })).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/managed-services#operator-assist');
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Add managed rollout support"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Managed services fit-call context attached for review: Operator Assist/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/managed support does not bypass approval gates/);
  });

  test('should preserve resource article context into get-started', async ({ page }) => {
    await page.goto('/get-started?utm_source=resources&utm_medium=seo_article&utm_campaign=telegram-sales-command-center&resource=telegram-sales-command-center&resourceIntent=article_sidebar');

    await expect(page.getByText('Guide context attached')).toBeVisible();
    await expect(page.getByText('Sales command center')).toBeVisible();
    await expect(page.getByText('Reading a resource does not run lead sourcing')).toBeVisible();
    await expect(page.getByText(/Telegram mutations without the normal workspace gates/i)).toBeVisible();
  });

  test('should preserve resource article context into contact intake', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=resources&utm_medium=seo_article&utm_campaign=telegram-sales-command-center&resource=telegram-sales-command-center&resourceIntent=telegram_rollout_review');

    await expect(page.getByText('Resource guide context attached', { exact: true })).toBeVisible();
    await expect(page.locator('p').filter({ hasText: 'Sales command center' }).first()).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('1500_5000');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/resources/telegram-sales-command-center');
    await expect(page.locator('input[name="utmSource"]')).toHaveValue('resources');
    await expect(page.locator('input[name="utmCampaign"]')).toHaveValue('telegram-sales-command-center');
    await expect(page.locator('input[name="channels"][value="telegram"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Connect Telegram command center"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Resource guide context attached for review: Telegram sales command center/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/No lead sourcing, outreach, provider work, billing change, AI-worker execution/);
  });

  test('should show a segment-specific public solution page', async ({ page }) => {
    await page.goto('/solutions/founders-validating-outbound');

    await expect(
      page.getByRole('heading', {
        name: 'AI sales workspace for founders validating outbound',
      }),
    ).toBeVisible();
    await expect(page.getByText('Approval-gated beta')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What this page does not claim' })).toBeVisible();

    const rolloutLink = page.getByRole('link', { name: /request rollout review/i }).first();
    await expect(rolloutLink).toHaveAttribute('href', /\/contact\?/);
    await expect(rolloutLink).toHaveAttribute('href', /utm_source=solution_segment/);

    const startLink = page.getByRole('link', { name: /^start workspace$/i }).first();
    await expect(startLink).toHaveAttribute('href', /\/get-started\?/);
    await expect(startLink).toHaveAttribute('href', /utm_source=solution_segment/);
  });

  test('should show the local service solution page with claim-safe guardrails', async ({ page }) => {
    await page.goto('/solutions/local-service-businesses-booking-jobs');

    await expect(
      page.getByRole('heading', {
        name: 'AI sales workspace for local service businesses booking more jobs',
      }),
    ).toBeVisible();
    await expect(page.getByText('Local services')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What this page does not claim' })).toBeVisible();
    await expect(page.getByText(/does not mutate outreach or billing directly/i)).toBeVisible();

    const rolloutLink = page.getByRole('link', { name: /request rollout review/i }).first();
    await expect(rolloutLink).toHaveAttribute('href', /solutionSegment=local-service-businesses-booking-jobs/);
    await expect(rolloutLink).toHaveAttribute('href', /segment=local_services/);
  });

  test('should prefill contact intake from solution segment context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=solution_segment&utm_medium=seo&utm_campaign=founders_validating_outbound&solutionSegment=founders-validating-outbound&segment=founder');

    await expect(page.getByText('Solution segment context attached', { exact: true })).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('500_1500');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/solutions/founders-validating-outbound');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="linkedin review"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="website"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Generate qualified leads"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Solution segment context attached for review/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Segment: Founders/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/before any lead sourcing or outreach starts/);
  });

  test('should preserve solution segment context into get-started', async ({ page }) => {
    await page.goto('/get-started?plan=free&utm_source=solution_segment&utm_medium=seo&utm_campaign=founders_validating_outbound&solutionSegment=founders-validating-outbound&segment=founder');

    await expect(page.getByText('Solution segment context attached')).toBeVisible();
    await expect(page.getByText('Founders')).toBeVisible();
    await expect(page.getByText('No lead sourcing, outreach, provider work, or Telegram-controlled mutation starts automatically from this context.')).toBeVisible();
  });

  test('should show the public contact intake form', async ({ page }) => {
    await page.goto('/contact');

    await expect(
      page.getByRole('heading', {
        name: 'Tell us what sales system you want Winrate to help launch.',
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Work email')).toBeVisible();
    await expect(page.getByRole('button', { name: /submit request/i })).toBeVisible();
  });

  test('should show the public ROI calculator', async ({ page }) => {
    await page.goto('/roi-calculator');

    await expect(
      page.getByRole('heading', {
        name: 'Estimate the value of better lead planning, reviewable outreach, and meeting handoff.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Monthly lead volume' })).toBeVisible();
    await expect(page.getByText('Modeled annual net impact')).toBeVisible();
    const rolloutLink = page.getByRole('link', { name: /request rollout review/i });

    await expect(rolloutLink).toBeVisible();
    await expect(rolloutLink).toHaveAttribute('href', /\/contact\?/);
    await expect(rolloutLink).toHaveAttribute('href', /utm_source=roi_calculator/);
    await expect(rolloutLink).toHaveAttribute('href', /monthlyLeadGoal=400/);
  });

  test('should show the public Sales Blueprint builder', async ({ page }) => {
    await page.goto('/sales-blueprint');

    await expect(
      page.getByRole('heading', {
        name: 'Score the sales context before lead sourcing or outreach starts.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Blueprint readiness')).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: 'Monthly lead target' })).toBeVisible();
    const blueprintLink = page.getByRole('link', { name: /request blueprint review/i });

    await expect(blueprintLink).toBeVisible();
    await expect(blueprintLink).toHaveAttribute('href', /\/contact\?/);
    await expect(blueprintLink).toHaveAttribute('href', /utm_source=sales_blueprint_tool/);
    await expect(blueprintLink).toHaveAttribute('href', /monthlyLeadGoal=250/);
    const startLink = page.getByRole('link', { name: /^start workspace$/i }).first();

    await expect(startLink).toHaveAttribute('href', /\/get-started\?/);
    await expect(startLink).toHaveAttribute('href', /utm_source=sales_blueprint_tool/);
  });

  test('should prefill contact intake from Sales Blueprint context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=sales_blueprint_tool&utm_medium=owned_tool&utm_campaign=blueprint_readiness&monthlyLeadGoal=250&budgetRange=500_1500&blueprintSegment=founder&blueprintIndustry=B2B%20SaaS&blueprintAudience=Founder-led%20software%20teams&blueprintMeetings=20&blueprintAcv=8000&blueprintReadiness=90&blueprintLevel=rollout_ready&blueprintSources=website,search,directory&blueprintOutreach=email,linkedin_review&blueprintRegions=US,UK&blueprintConstraints=suppression%20checks,human%20approval&blueprintPlan=starter&managedPackage=operator-assist&managedIntent=blueprint_commercial_fit');

    await expect(page.getByText('Sales Blueprint context attached')).toBeVisible();
    await expect(page.getByText('Managed services context attached')).toBeVisible();
    await expect(page.getByText('Starter', { exact: true })).toBeVisible();
    await expect(
      page.locator('dd').filter({ hasText: 'Operator Assist' }).first(),
    ).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('250');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('500_1500');
    await expect(page.locator('input[name="sourcePath"]')).toHaveValue('/sales-blueprint');
    await expect(page.locator('input[name="pricingPlan"]')).toHaveValue('starter');
    await expect(page.locator('input[name="pricingIntent"]')).toHaveValue('blueprint_commercial_fit');
    await expect(page.locator('input[name="managedPackage"]')).toHaveValue('operator-assist');
    await expect(page.locator('input[name="managedIntent"]')).toHaveValue('blueprint_commercial_fit');
    await expect(page.locator('input[name="channels"][value="email"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="website"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="directory"]')).toBeChecked();
    await expect(page.locator('input[name="channels"][value="linkedin review"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Build a Sales Blueprint"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Generate qualified leads"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Launch approval-gated outreach"]')).toBeChecked();
    await expect(page.locator('input[name="goals"][value="Add managed rollout support"]')).toBeChecked();
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Sales Blueprint readiness context attached/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Recommended SaaS plan: Starter/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/Managed rollout fit: Operator Assist/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/governed Sales Blueprint/);
  });

  test('should preserve Sales Blueprint context into get-started', async ({ page }) => {
    await page.goto('/get-started?plan=free&utm_source=sales_blueprint_tool&utm_medium=owned_tool&utm_campaign=blueprint_readiness&monthlyLeadGoal=250&budgetRange=500_1500&blueprintSegment=founder&blueprintIndustry=B2B%20SaaS&blueprintAudience=Founder-led%20software%20teams&blueprintMeetings=20&blueprintAcv=8000&blueprintReadiness=90&blueprintLevel=rollout_ready&blueprintSources=website,search,directory&blueprintOutreach=email,linkedin_review&blueprintRegions=US,UK&blueprintConstraints=suppression%20checks,human%20approval');

    await expect(page.getByText('Sales Blueprint context attached')).toBeVisible();
    await expect(page.getByText('90/100')).toBeVisible();
    await expect(page.getByText('No lead sourcing or outreach starts automatically')).toBeVisible();
  });

  test('should prefill contact intake from ROI calculator context', async ({ page }) => {
    await page.goto('/contact?intent=managed_services&utm_source=roi_calculator&utm_medium=owned_tool&utm_campaign=roi_model&monthlyLeadGoal=400&budgetRange=under_500&roiQualifiedRate=18&roiMeetingRate=16&roiCloseRate=24&roiAcv=3500&roiBudget=249&roiHoursSaved=18&roiAnnualNet=127174');

    await expect(page.getByText('ROI calculator context attached')).toBeVisible();
    await expect(page.locator('select[name="intent"]')).toHaveValue('managed_services');
    await expect(page.locator('input[name="monthlyLeadGoal"]')).toHaveValue('400');
    await expect(page.locator('select[name="budgetRange"]')).toHaveValue('under_500');
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/ROI calculator scenario attached/);
    await expect(page.locator('textarea[name="message"]')).toHaveValue(/not a guarantee/);
  });

  test('should preserve ROI calculator context into get-started', async ({ page }) => {
    await page.goto('/get-started?plan=free&utm_source=roi_calculator&utm_medium=owned_tool&utm_campaign=roi_model&monthlyLeadGoal=400&budgetRange=under_500&roiQualifiedRate=18&roiMeetingRate=16&roiCloseRate=24&roiAcv=3500&roiBudget=249&roiHoursSaved=18&roiAnnualNet=127174');

    await expect(page.getByText('ROI calculator context attached')).toBeVisible();
    await expect(page.getByText('$127,174')).toBeVisible();
    await expect(page.getByText(/not a guarantee/i)).toBeVisible();
  });
});
