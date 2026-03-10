import { HeroHeader } from "../../components/blocks/hero-section";
import { Zap, Mail, Twitter, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "../../components/ui/button";

export default function ContactPage() {
    return (
        <>
            <HeroHeader />
            <main className="pt-32 pb-24 min-h-screen">
                <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
                    <div className="mb-16 md:mb-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                            Contact Us
                        </span>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">
                            Let&apos;s build your sales engine
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto md:mx-0 mb-10">
                            Have questions about our platform? Need a custom enterprise plan? Or just want to say hi? We&apos;d love to hear from you.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Email us</h3>
                                    <p className="text-sm text-muted-foreground">Our friendly team is here to help.</p>
                                    <a href="mailto:hello@winrate.ai" className="text-sm font-medium text-foreground hover:underline mt-1 inline-block">hello@winrate.ai</a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Visit us</h3>
                                    <p className="text-sm text-muted-foreground">Come say hello at our office HQ.</p>
                                    <address className="text-sm font-medium text-foreground mt-1 not-italic">100 Market St.<br />San Francisco, CA 94105</address>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0">
                                    <Twitter className="w-5 h-5 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground mb-1">Social</h3>
                                    <p className="text-sm text-muted-foreground">Follow our journey on X.</p>
                                    <a href="#" className="text-sm font-medium text-foreground hover:underline mt-1 inline-block">@winrate_ai</a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background border rounded-2xl p-8 shadow-sm">
                        <h3 className="text-xl font-bold mb-6">Send us a message</h3>
                        <form className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="first-name" className="text-sm font-medium">First name</label>
                                    <input id="first-name" type="text" className="w-full px-3 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="last-name" className="text-sm font-medium">Last name</label>
                                    <input id="last-name" type="text" className="w-full px-3 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="Doe" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <input id="email" type="email" className="w-full px-3 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm" placeholder="john@company.com" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="message" className="text-sm font-medium">Message</label>
                                <textarea id="message" rows={4} className="w-full px-3 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm resize-none" placeholder="How can we help you?"></textarea>
                            </div>
                            <Button type="button" className="w-full bg-foreground text-background hover:bg-foreground/90 py-6 rounded-xl mt-4">
                                Send Message
                            </Button>
                        </form>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 border-t mt-auto">
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
