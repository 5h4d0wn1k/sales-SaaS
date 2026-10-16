import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const EXPIRY_DAYS = 180;

function securityTxtExpires() {
  return new Date(Date.now() + EXPIRY_DAYS * ONE_DAY_SECONDS * 1000).toISOString();
}

export function buildSecurityTxt() {
  return [
    "Contact: mailto:hello@salesxgrowth.com",
    `Expires: ${securityTxtExpires()}`,
    `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
    `Policy: ${absoluteUrl("/trust")}`,
    "Preferred-Languages: en",
    "",
  ].join("\n");
}

export function GET() {
  return new Response(buildSecurityTxt(), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
