'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X, Zap } from 'lucide-react'
import { Button } from '../ui/button'
import { AnimatedGroup } from '../ui/animated-group'
import { cn } from '../../lib/utils'
import { useSession } from "next-auth/react";

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: 'spring' as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
}

export function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main className="overflow-hidden">
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                    <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                    <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
                </div>
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                                <AnimatedGroup variants={transitionVariants}>
                                    <Link
                                        href="/#features"
                                        className="hover:bg-background bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300">
                                        <span className="text-foreground text-sm">Winrate: Reviewable outbound ops</span>
                                        <span className="block h-4 w-0.5 border-l bg-zinc-300"></span>
                                        <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                                            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    <h1 className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-bold tracking-tighter">
                                        Build a repeatable sales system without losing <span className="bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">control</span>.
                                    </h1>
                                    <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                                        Winrate brings onboarding, lead planning, approval-gated outreach, activity tracking, and billing into one workspace for teams building a modern outbound motion.
                                    </p>
                                    <p className="mx-auto mt-4 max-w-2xl text-balance text-sm font-semibold text-foreground">
                                        Human review stays in the loop where trust matters most.
                                    </p>
                                </AnimatedGroup>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        ...transitionVariants,
                                    }}
                                    className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                                    <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="rounded-xl px-5 text-base">
                                            <Link href="/get-started">
                                                <span className="text-nowrap">Launch Your Workspace</span>
                                                <ArrowRight className="ml-2 size-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="h-10.5 rounded-xl px-5">
                                        <Link href="/#how-it-works">
                                            <span className="text-nowrap">See The Workflow</span>
                                        </Link>
                                    </Button>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                ...transitionVariants,
                            }}>
                            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                                <div
                                    aria-hidden
                                    className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                                />
                                <div className="bg-background relative mx-auto max-w-6xl overflow-hidden rounded-2xl border p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background">
                                    {/* Dashboard preview mockup */}
                                    <div className="aspect-[15/8] relative rounded-2xl border bg-gradient-to-br from-zinc-50 to-zinc-100 p-8 overflow-hidden">
                                        <div className="absolute right-4 top-4 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                            Illustrative preview
                                        </div>
                                        {/* Simulated dashboard UI */}
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                            </div>
                                            <div className="flex-1 h-7 rounded-lg bg-zinc-200/60 max-w-md" />
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 mb-6">
                                            <div className="rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm">
                                                <div className="text-xs text-zinc-400 mb-1">Leads Found</div>
                                                <div className="text-2xl font-bold text-zinc-900">2,847</div>
                                                <div className="text-xs text-emerald-500 mt-1">↑ 24% this week</div>
                                            </div>
                                            <div className="rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm">
                                                <div className="text-xs text-zinc-400 mb-1">Emails Sent</div>
                                                <div className="text-2xl font-bold text-zinc-900">12,394</div>
                                                <div className="text-xs text-emerald-500 mt-1">↑ 18% this week</div>
                                            </div>
                                            <div className="rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm">
                                                <div className="text-xs text-zinc-400 mb-1">Meetings Booked</div>
                                                <div className="text-2xl font-bold text-zinc-900">89</div>
                                                <div className="text-xs text-emerald-500 mt-1">↑ 42% this week</div>
                                            </div>
                                            <div className="rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm">
                                                <div className="text-xs text-zinc-400 mb-1">Revenue Pipeline</div>
                                                <div className="text-2xl font-bold text-zinc-900">$284K</div>
                                                <div className="text-xs text-emerald-500 mt-1">↑ 31% this week</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2 rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm h-40">
                                                <div className="text-xs text-zinc-400 mb-3">Pipeline Activity</div>
                                                <div className="flex items-end gap-1.5 h-24">
                                                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                                                        <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-orange-400 to-purple-500 opacity-80" style={{ height: `${h}%` }} />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-xl bg-white border border-zinc-200/60 p-4 shadow-sm h-40">
                                                <div className="text-xs text-zinc-400 mb-3">Active Campaigns</div>
                                                <div className="space-y-2">
                                                    {['SaaS Founders', 'E-commerce', 'Agency Owners', 'Startups'].map((name, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-purple-500" />
                                                            <span className="text-xs text-zinc-600">{name}</span>
                                                            <div className="flex-1 h-1.5 rounded-full bg-zinc-100">
                                                                <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-purple-500" style={{ width: `${70 - i * 12}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </AnimatedGroup>
                    </div>
                </section>

                {/* Trust Strip */}
                <section className="bg-background pb-16 pt-16 md:pb-32">
                    <div className="m-auto max-w-5xl px-6">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                Built for careful operators
                            </p>
                        </div>
                        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                "Approval-gated campaigns",
                                "Shared dashboard visibility",
                                "Usage-aware billing",
                                "Provider-ready foundations",
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border bg-muted/30 px-4 py-4 text-center text-sm font-medium text-foreground"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}

const menuItems = [
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Features', href: '/#features' },
    { name: 'For You', href: '/#audience' },
    { name: 'Pricing', href: '/pricing' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const { status } = useSession()
    const isAuthenticated = status === "authenticated"

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2 group">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-lg font-bold tracking-tight">Winrate</span>
                                </div>
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState === true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                {isAuthenticated ? (
                                    <>
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className={cn(isScrolled && 'lg:hidden')}>
                                            <Link href="/dashboard">
                                                <span>Dashboard</span>
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            size="sm"
                                            className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                                            <Link href="/dashboard">
                                                <span>Dashboard</span>
                                            </Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        asChild
                                        size="sm"
                                        className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                                        <Link href="/get-started">
                                            <span>Get Started</span>
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn(isScrolled && 'lg:hidden')}>
                                    <Link href={isAuthenticated ? "/dashboard" : "/get-started"}>
                                        <span>{isAuthenticated ? "Dashboard" : "Get Started"}</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}
