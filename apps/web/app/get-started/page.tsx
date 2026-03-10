import { Zap, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function GetStartedPage() {
    return (
        <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            {/* Left side: Form */}
            <div className="flex flex-col justify-between px-6 py-10 md:px-12 md:py-16">
                <div>
                    <Link href="/" className="flex items-center gap-2 mb-16 inline-flex">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Winrate</span>
                    </Link>

                    <div className="max-w-md">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                            Start building your sales engine
                        </h1>
                        <p className="text-muted-foreground mb-10">
                            No credit card required. Connect your email and we&apos;ll start finding leads for you in minutes.
                        </p>

                        <form className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="work-email" className="text-sm font-semibold">Work email</label>
                                <div className="relative">
                                    <input
                                        id="work-email"
                                        type="email"
                                        placeholder="you@company.com"
                                        className="w-full px-4 py-3 bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="button" className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 rounded-xl text-base font-semibold group">
                                Continue with Email
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <div className="relative flex items-center py-4">
                                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                                <span className="flex-shrink-0 mx-4 text-sm text-muted-foreground uppercase tracking-wider font-medium">Or</span>
                                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                            </div>

                            <Button type="button" variant="outline" className="w-full py-6 rounded-xl text-foreground bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-medium">
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </Button>

                            <p className="text-xs text-center text-muted-foreground mt-8">
                                By continuing, you agree to our <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                            </p>
                        </form>
                    </div>
                </div>

                <div className="mt-16 sm:mt-0 text-sm text-muted-foreground">
                    © 2026 Winrate. All rights reserved.
                </div>
            </div>

            {/* Right side: Testimonial & Value prop (hidden on mobile) */}
            <div className="hidden lg:flex relative bg-zinc-950 p-12 text-zinc-50 flex-col justify-center overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute inset-0 opacity-20 transition-all">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600 blur-[120px]" />
                </div>

                <div className="relative z-10 max-w-lg mx-auto">
                    <div className="mb-12">
                        <span className="text-5xl text-orange-400 font-serif leading-none block mb-4">&ldquo;</span>
                        <blockquote className="text-2xl font-medium leading-snug mb-6">
                            The AI infrastructure found us 40 qualified leads in the first week. We closed 3 of them. It literally paid for itself 10x over before the trial even ended.
                        </blockquote>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                                <span className="text-lg font-bold">AM</span>
                            </div>
                            <div>
                                <div className="font-semibold text-white">Aarav Malhotra</div>
                                <div className="text-sm text-zinc-400">Founder, OrbitOps</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                        {[
                            "1,000 free AI credits to start",
                            "Smart connection to your CRM",
                            "Access to human review panel",
                            "Cancel anytime"
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                <span className="text-zinc-300 font-medium">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
