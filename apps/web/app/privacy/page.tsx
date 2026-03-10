import { HeroHeader } from "../../components/blocks/hero-section";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
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
                        <p className="text-muted-foreground">Last updated: March 10, 2026</p>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">1. Information We Collect</h2>
                        <p className="mb-6 leading-relaxed">
                            We collect information that you provide directly to us, such as when you create an account, update your profile, or communicate with us. The types of data we may collect include your name, email address, postal address, phone number, and any other information you choose to provide.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">2. How We Use Your Information</h2>
                        <p className="mb-6 leading-relaxed">
                            We use the information we collect to operate and improve our platform, respond to your comments and questions, and provide customer service. We also use it to monitor and analyze trends, usage, and activities in connection with our services.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">3. Data Protection</h2>
                        <p className="mb-6 leading-relaxed">
                            We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. We use industry-standard encryption protocols to safeguard your data.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">4. Sharing of Information</h2>
                        <p className="mb-6 leading-relaxed">
                            We do not share your personal information with third parties except as described in this policy, such as with vendors, consultants, and other service providers who need access to such information to carry out work on our behalf.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">5. Contact Us</h2>
                        <p className="mb-6 leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@winrate.ai" className="text-foreground font-medium underline">privacy@winrate.ai</a>.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 border-t">
                <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">Winrate</span>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                        <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                        <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
                    </div>
                    <p className="text-xs text-muted-foreground">© 2026 Winrate. Built for builders.</p>
                </div>
            </footer>
        </>
    );
}
