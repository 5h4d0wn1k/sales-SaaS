import Link from "next/link";
import { Zap } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="py-10 border-t">
      <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-700">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-normal">Winrate</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/solutions" className="hover:text-foreground transition-colors">
            Solutions
          </Link>
          <Link href="/ai-sales-automation-platform" className="hover:text-foreground transition-colors">
            Platform
          </Link>
          <Link href="/ai-sdr-software" className="hover:text-foreground transition-colors">
            AI SDR
          </Link>
          <Link href="/ai-lead-generation-software" className="hover:text-foreground transition-colors">
            Lead Gen
          </Link>
          <Link href="/ai-outbound-sales-automation" className="hover:text-foreground transition-colors">
            Outbound
          </Link>
          <Link href="/ai-sales-meeting-scheduler" className="hover:text-foreground transition-colors">
            Meetings
          </Link>
          <Link href="/telegram-sales-command-center" className="hover:text-foreground transition-colors">
            Telegram
          </Link>
          <Link href="/compare-sales-tools" className="hover:text-foreground transition-colors">
            Compare
          </Link>
          <Link href="/integrations" className="hover:text-foreground transition-colors">
            Integrations
          </Link>
          <Link href="/trust" className="hover:text-foreground transition-colors">
            Trust
          </Link>
          <Link href="/resources" className="hover:text-foreground transition-colors">
            Resources
          </Link>
          <Link href="/sales-blueprint" className="hover:text-foreground transition-colors">
            Blueprint
          </Link>
          <Link href="/roi-calculator" className="hover:text-foreground transition-colors">
            ROI
          </Link>
          <Link href="/managed-services" className="hover:text-foreground transition-colors">
            Managed
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
          <Link href="/get-started" className="hover:text-foreground transition-colors">
            Get started
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Winrate. Built for builders.</p>
      </div>
    </footer>
  );
}
