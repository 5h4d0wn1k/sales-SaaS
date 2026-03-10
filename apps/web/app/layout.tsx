import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { AnimatedBackground } from "../components/ui/animated-background";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Winrate — The world's most ambitious businesses don't chase sales. They engineer them.",
  description:
    "Winrate handles your entire sales operation — from first contact to closed deal — powered by AI, built for your specific business.",
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
    title: "Winrate — Engineer your sales.",
    description:
      "Winrate handles your entire sales operation — from first contact to closed deal.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <AnimatedBackground />
        {children}
      </body>
    </html>
  );
}
