import type { Metadata } from "next";
import Link from "next/link";
import { HeroHeader } from "../../components/blocks/hero-section";
import { MarketingFooter } from "../../components/blocks/marketing-footer";
import {
  getDefaultOpenGraphImage,
  getDefaultTwitterCard,
  jsonLd,
  siteConfig,
} from "@/lib/seo";
import { RevenueImpactCalculator } from "./revenue-impact-calculator";

export const metadata: Metadata = {
  title: "AI Sales ROI Calculator",
  description:
    "Model the revenue impact of better lead planning, approval-gated outreach, meetings, and operator time savings before choosing an AI sales workspace.",
  alternates: {
    canonical: "/roi-calculator",
  },
  openGraph: {
    title: "AI Sales ROI Calculator",
    description:
      "Model a claim-safe revenue scenario for lead planning, approval-gated outreach, meetings, and operator time savings.",
    url: "/roi-calculator",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
  twitter: getDefaultTwitterCard(
    "AI Sales ROI Calculator",
    "Model a claim-safe revenue scenario for lead planning, outreach review, meetings, and operator time savings.",
  ),
};

export default function RoiCalculatorPage() {
  const calculatorJsonLd = jsonLd({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "salesxgrowth AI Sales ROI Calculator",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A claim-safe sales ROI calculator for modeling lead planning, outreach review, meeting conversion, and operator efficiency scenarios.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  });

  return (
    <>
      <HeroHeader />
      <main className="min-h-screen bg-[#faf9f7] px-6 pb-16 pt-28 text-slate-950">
        <div className="mx-auto max-w-6xl">
          <RevenueImpactCalculator />

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "What this measures",
                "A scenario using lead volume, qualification, meetings, close rate, contract value, and operator time.",
              ],
              [
                "What it does not claim",
                "Booked-meeting promises, every-source scraping, hands-off outreach, or jurisdiction-wide compliance coverage.",
              ],
              [
                "Where salesxgrowth helps",
                "Sales Blueprint planning, source evidence, approval gates, provider readiness, billing controls, and managed rollout support.",
              ],
            ].map(([title, detail]) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-base font-semibold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Revenue path
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  Use the model as the starting point for a real workspace.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  The next useful step is capturing your actual business context: ICP, regions,
                  source channels, outreach rules, provider posture, and approval requirements.
                </p>
              </div>
              <Link
                href="/get-started"
                className="inline-flex justify-center rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
              >
                Start workspace
              </Link>
            </div>
          </section>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: calculatorJsonLd }}
        />
      </main>
      <MarketingFooter />
    </>
  );
}
