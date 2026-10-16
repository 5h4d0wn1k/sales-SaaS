import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description:
        "How salesxgrowth handles account, workspace, billing, and sales workflow data during the beta.",
    alternates: {
        canonical: "/privacy",
    },
};

export default async function PrivacyPage() {
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
                            Privacy Policy
                        </h1>
                        <p className="text-muted-foreground">Last updated: May 3, 2026</p>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">1. Information We Collect</h2>
                        <p className="mb-6 leading-relaxed">
                            We collect information you provide directly, such as account details, organization and workspace details, onboarding inputs, support requests, and billing-related identifiers. We also store workflow data generated inside the product, including leads, campaign records, meeting records, and approval activity.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">2. How We Use Your Information</h2>
                        <p className="mb-6 leading-relaxed">
                            We use the information we collect to operate the service, create and secure user accounts, process billing events, provide customer support, improve product quality, investigate abuse, and understand how the platform is being used.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">3. Data Protection</h2>
                        <p className="mb-6 leading-relaxed">
                            We use reasonable administrative, technical, and organizational safeguards designed to reduce unauthorized access, misuse, alteration, and loss. No system is perfectly secure, so we cannot guarantee absolute security.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">4. Sharing of Information</h2>
                        <p className="mb-6 leading-relaxed">
                            We share information with service providers that help us run the platform, such as infrastructure providers, authentication services, analytics tools, and payment processors. We may also disclose information when required by law, to protect our users, or to enforce our terms.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">5. Contact Us</h2>
                        <p className="mb-6 leading-relaxed">
                            If you have privacy-related questions, please contact us at <a href="mailto:hello@salesxgrowth.com?subject=salesxgrowth%20privacy%20request" className="text-foreground font-medium underline">hello@salesxgrowth.com</a>.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <MarketingFooter />
        </>
    );
}
