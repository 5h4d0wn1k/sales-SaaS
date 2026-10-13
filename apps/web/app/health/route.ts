import { NextResponse } from "next/server";
import { buildWebReleaseMetadata } from "@/lib/release";
import webPackage from "../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "sales-web",
      version: webPackage.version,
      release: buildWebReleaseMetadata(),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
