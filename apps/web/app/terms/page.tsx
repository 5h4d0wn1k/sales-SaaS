import { HeroHeader } from "../../components/blocks/hero-section";
import { Zap } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
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
                        <p className="text-muted-foreground">Last updated: March 10, 2026</p>
                    </div>

                    <div className="prose prose-zinc dark:prose-invert max-w-none text-muted-foreground">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">1. Acceptance of Terms</h2>
                        <p className="mb-6 leading-relaxed">
                            By accessing and using Winrate, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">2. Description of Service</h2>
                        <p className="mb-6 leading-relaxed">
                            Winrate provides users with access to a rich collection of resources, including various communications tools, personalized content and branded programming through its network of properties. You understand and agree that the Service is provided "AS-IS".
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">3. Registration Obligations</h2>
                        <p className="mb-6 leading-relaxed">
                            In consideration of your use of the Service, you agree to: (a) provide true, accurate, current and complete information about yourself as prompted by the Service's registration form, and (b) maintain and promptly update the Registration Data to keep it true, accurate, current and complete.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">4. Account Security</h2>
                        <p className="mb-6 leading-relaxed">
                            You will receive a password and account designation upon completing the Service's registration process. You are responsible for maintaining the confidentiality of the password and account, and are fully responsible for all activities that occur under your password or account.
                        </p>

                        <h2 className="text-2xl font-bold tracking-tight text-foreground mt-10 mb-4">5. Disclaimer of Warranties</h2>
                        <p className="mb-6 leading-relaxed">
                            You expressly understand and agree that your use of the service is at your sole risk. The service is provided on an "as is" and "as available" basis.
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
