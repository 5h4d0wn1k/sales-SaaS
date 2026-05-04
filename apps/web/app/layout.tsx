import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AnimatedBackground } from "../components/ui/animated-background";
import { AppSessionProvider } from "../components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winrate — A reviewable workspace for modern outbound operations.",
  description:
    "Winrate brings onboarding, lead planning, approval-gated outreach, activity tracking, and billing into one workspace.",
  keywords: [
    "sales automation",
    "AI sales",
    "automated outreach",
    "lead generation",
    "sales platform",
    "startup sales",
    "sales as a service",
  ],
  openGraph: {
    title: "Winrate — Reviewable outbound operations.",
    description:
      "A workspace for onboarding, lead planning, campaign review, activity tracking, and billing.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <AppSessionProvider>
          <AnimatedBackground />
          {children}
        </AppSessionProvider>
      </body>
    </html>
  );
}
