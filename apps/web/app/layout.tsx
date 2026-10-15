import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AnimatedBackground } from "../components/ui/animated-background";
import { AppSessionProvider } from "../components/session-provider";
import {
  getDefaultOpenGraphImage,
  getDefaultTwitterImage,
  getSiteUrl,
  siteConfig,
} from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  title: {
    default: "Winrate | AI-assisted sales workspace",
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Winrate | AI-assisted sales workspace",
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    type: "website",
    images: [getDefaultOpenGraphImage()],
  },
  twitter: {
    card: "summary_large_image",
    title: "Winrate | AI-assisted sales workspace",
    description: siteConfig.description,
    images: [getDefaultTwitterImage()],
  },
  robots: {
    index: true,
    follow: true,
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
