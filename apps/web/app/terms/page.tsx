import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service",
    description:
        "Terms for using the Winrate beta sales operations workspace and related provider-backed features.",
    alternates: {
        canonical: "/terms",
    },
};

export default async function TermsPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 pb-24 min-h-screen">
                <div className="mx-auto max-w-3xl px-6">
                    <div className="mb-16">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Legal
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                            Terms of Service
                        </h1>
                        <p className="text-muted-foreground">Last updated: May 3, 2026</p>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">1. Acceptance of Terms</h2>
                        <p className="mb-6 leading-relaxed">
                            By accessing and using Winrate, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">2. Description of Service</h2>
                        <p className="mb-6 leading-relaxed">
                            Winrate provides a sales operations workspace that may include onboarding flows, lead management, approval-gated campaign workflows, dashboard visibility, billing tools, and provider integrations. Some capabilities may still be in beta, mock mode, limited release, or only available when configured for a specific workspace.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">3. Registration Obligations</h2>
                        <p className="mb-6 leading-relaxed">
                            In consideration of your use of the Service, you agree to: (a) provide true, accurate, current and complete information about yourself as prompted by the Service's registration form, and (b) maintain and promptly update the Registration Data to keep it true, accurate, current and complete.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">4. Account Security</h2>
                        <p className="mb-6 leading-relaxed">
                            You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us promptly if you suspect unauthorized access or misuse.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">5. Disclaimer of Warranties</h2>
                        <p className="mb-6 leading-relaxed">
                            You expressly understand and agree that your use of the service is at your sole risk. The service is provided on an "as is" and "as available" basis, and features may change as the platform evolves.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <MarketingFooter />
        </>
    );
}
